-- Apply as the database owner. Explicit grants keep private columns off the Data API.
create table public.events (
 id uuid primary key default gen_random_uuid(), name text not null, slug text unique not null,
 description text, starts_at timestamptz, ends_at timestamptz, is_active boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.moderator_users (user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz not null default now());
create table public.questions (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id),
 submitter_id uuid not null references auth.users(id), question_text text not null check (length(btrim(question_text)) between 1 and 500),
 status text not null default 'pending' check (status in ('pending','approved','shortlisted','answered','hidden')),
 moderator_note text check (length(moderator_note) <= 5000), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 approved_at timestamptz, shortlisted_at timestamptz, answered_at timestamptz,
 unique (id, event_id)
);
create table public.votes (
 id uuid primary key default gen_random_uuid(), question_id uuid not null, event_id uuid not null references public.events(id),
 voter_id uuid not null references auth.users(id), created_at timestamptz not null default now(),
 foreign key (question_id, event_id) references public.questions(id, event_id) on delete cascade,
 unique (question_id, voter_id)
);
create index questions_event_status on public.questions(event_id,status);
create index questions_event_created on public.questions(event_id,created_at);
create index questions_submitter on public.questions(event_id,submitter_id);
create index votes_question on public.votes(question_id);
create index votes_event on public.votes(event_id);

alter table public.events enable row level security;
alter table public.questions enable row level security;
alter table public.votes enable row level security;
alter table public.moderator_users enable row level security;

create function public.is_moderator() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.moderator_users where user_id = (select auth.uid()));
$$;
revoke all on function public.is_moderator() from public, anon;
grant execute on function public.is_moderator() to authenticated;

create policy events_read on public.events for select to authenticated using (is_active or public.is_moderator());
create policy questions_read on public.questions for select to authenticated using (
 public.is_moderator() or (exists(select 1 from public.events e where e.id = event_id and e.is_active) and (status in ('approved','shortlisted','answered') or submitter_id = (select auth.uid())))
);
create policy questions_insert on public.questions for insert to authenticated with check (
 submitter_id = (select auth.uid()) and status = 'pending' and moderator_note is null
 and approved_at is null and shortlisted_at is null and answered_at is null
 and exists(select 1 from public.events e where e.id = event_id and e.is_active)
);
create policy questions_update on public.questions for update to authenticated using (public.is_moderator()) with check (public.is_moderator());
create policy votes_read on public.votes for select to authenticated using (voter_id = (select auth.uid()) or public.is_moderator());
create policy votes_insert on public.votes for insert to authenticated with check (
 voter_id = (select auth.uid()) and exists(select 1 from public.questions q join public.events e on e.id=q.event_id
 where q.id=question_id and q.event_id=votes.event_id and q.status in ('approved','shortlisted','answered') and e.is_active)
);
create policy votes_delete on public.votes for delete to authenticated using (voter_id = (select auth.uid()));
create policy moderators_read on public.moderator_users for select to authenticated using (public.is_moderator());

revoke all on public.events, public.questions, public.votes, public.moderator_users from anon, authenticated;
grant select on public.events to authenticated;
-- No attendee can SELECT moderator_note, even on an approved question.
grant select (id,event_id,question_text,status,created_at,updated_at,approved_at,shortlisted_at,answered_at) on public.questions to authenticated;
grant insert (event_id,submitter_id,question_text) on public.questions to authenticated;
grant select on public.votes to authenticated;
grant insert (question_id,event_id,voter_id) on public.votes to authenticated;
grant delete on public.votes to authenticated;
grant select on public.moderator_users to authenticated;

create function public.guard_question_insert() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 -- A per-user/event transaction lock prevents concurrent inserts bypassing the limit.
 perform pg_advisory_xact_lock(hashtextextended(new.event_id::text || new.submitter_id::text, 0));
 if (select count(*) from public.questions where event_id=new.event_id and submitter_id=new.submitter_id) >= 5 then
  raise exception 'You have reached the limit of 5 questions for this event.' using errcode='P0001';
 end if;
 new.question_text := btrim(new.question_text);
 return new;
end;
$$;
revoke all on function public.guard_question_insert() from public, anon, authenticated;
create trigger limit_submissions before insert on public.questions for each row execute function public.guard_question_insert();

-- Return only safe fields. Private notes are included only after a database role check.
create function public.list_questions(p_event_id uuid, p_moderator boolean default false)
returns table(id uuid,event_id uuid,question_text text,status text,created_at timestamptz,vote_count bigint,has_voted boolean,moderator_note text)
language plpgsql stable security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_moderator and not public.is_moderator() then raise exception 'Moderator access required' using errcode='42501'; end if;
 return query select q.id,q.event_id,q.question_text,q.status,q.created_at,
 (select count(*) from public.votes v where v.question_id=q.id),
 exists(select 1 from public.votes v where v.question_id=q.id and v.voter_id=auth.uid()),
 case when p_moderator then q.moderator_note else null::text end
 from public.questions q join public.events e on e.id=q.event_id
 where q.event_id=p_event_id and (p_moderator or (e.is_active and q.status in ('approved','shortlisted','answered')));
end;
$$;
revoke all on function public.list_questions(uuid,boolean) from public, anon;
grant execute on function public.list_questions(uuid,boolean) to authenticated;

create function public.moderate_question(p_id uuid, p_status text, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_moderator() then raise exception 'Moderator access required' using errcode='42501'; end if;
 update public.questions set status=p_status, moderator_note=nullif(btrim(p_note),''), updated_at=now(),
 approved_at=case when p_status in ('approved','shortlisted','answered') then coalesce(approved_at,now()) else approved_at end,
 shortlisted_at=case when p_status='shortlisted' then coalesce(shortlisted_at,now()) else shortlisted_at end,
 answered_at=case when p_status='answered' then coalesce(answered_at,now()) else answered_at end
 where id=p_id;
 if not found then raise exception 'Question no longer exists'; end if;
end;
$$;
revoke all on function public.moderate_question(uuid,text,text) from public, anon;
grant execute on function public.moderate_question(uuid,text,text) to authenticated;
