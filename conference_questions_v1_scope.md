# Conference Questions Web App — Version 1 Scoping Document

## 1. Project Summary

Build a mobile-first web application for an in-person conference that allows participants to submit questions throughout the day for consideration during a closing panel.

The application should provide:

- A simple attendee-facing interface for submitting questions.
- A public/attendee-facing list of approved questions.
- Optional upvoting of approved questions.
- A moderator dashboard for reviewing, approving, shortlisting, hiding, and marking questions as answered.
- Persistent storage of all submissions.
- Secure separation between attendee and moderator capabilities.
- A simple export of submitted questions for post-event review.

The application should be intentionally lightweight, easy to deploy, and easy to reuse for future events.

---

## 2. Version 1 Goals

Version 1 should be production-usable for a single in-person conference.

The application should optimize for:

1. **Very low attendee friction**
   - No email/password registration.
   - Participants should be able to scan a QR code, open the site, and submit a question immediately.

2. **Reliable persistence**
   - Submitted questions must persist in a managed database.
   - Refreshing or reopening the app must not lose submitted content.

3. **Moderation**
   - Questions should not become public automatically.
   - Moderators should explicitly approve questions before they appear on the public board.

4. **Simple panel preparation**
   - Moderators should be able to mark questions as shortlisted and answered.
   - The shortlist should be easy to use during the closing panel.

5. **Reasonable abuse protection**
   - Character limits.
   - Submission limits/rate limiting where practical.
   - Anonymous attendee identity.
   - Database permissions that prevent participants from changing moderation fields.

6. **Reuse**
   - The data model should support multiple events even though Version 1 may initially be used for only one conference.

---

## 3. Non-Goals for Version 1

Do not build the following unless they are trivial extensions of the chosen implementation:

- Native mobile applications.
- Complex attendee profiles.
- Email/password attendee accounts.
- Social login.
- Comments or threaded discussion.
- Direct messaging.
- Real-time chat.
- AI-generated question summaries.
- AI moderation.
- Advanced analytics dashboards.
- Session scheduling or conference agenda management.
- Push notifications.
- Multi-language support.
- Rich-text question formatting.
- File/image uploads.
- Complex role hierarchies beyond attendee and moderator/admin.
- Integration with conference registration systems.

Version 1 should remain a focused question-submission and moderation tool.

---

## 4. Recommended Technology Stack

### Frontend

Use:

- React
- TypeScript
- Vite
- Mobile-first responsive CSS

A lightweight component library may be used if helpful, but avoid unnecessary dependencies.

### Hosting

Preferred options:

- Vercel
- Cloudflare Pages
- GitHub Pages, if routing/authentication requirements remain compatible

Vercel is likely the simplest default.

### Backend / Database

Use Supabase for:

- PostgreSQL database
- Anonymous authentication for attendees
- Email/password or magic-link authentication for moderators
- Row Level Security (RLS)
- Client API access
- Optional realtime updates

The frontend should interact with Supabase using the official JavaScript client.

### Repository

Use a standard Git repository with:

- Clear README
- `.env.example`
- Database migration or SQL setup files
- Seed script or seed SQL for a development event

---

## 5. High-Level Architecture

```text
Participant phone
      |
      v
React / TypeScript web app
      |
      v
Supabase client
      |
      +--> Supabase Auth
      |
      +--> PostgreSQL database
      |
      +--> Row Level Security
      |
      +--> Optional realtime updates
      |
      v
Moderator dashboard
```

No custom application server should be required for Version 1 unless needed for rate limiting or secure administrative operations.

---

## 6. User Roles

### 6.1 Attendee

An attendee should be able to:

- Open the app.
- Receive an anonymous authenticated session automatically.
- Submit a question.
- View approved questions.
- Upvote an approved question once.
- See whether their own submission was received.

An attendee should **not** be able to:

- View pending or hidden questions submitted by others.
- View moderator notes.
- Approve, shortlist, hide, or mark questions as answered.
- Modify another participant's question.
- Change vote totals directly.
- Escalate their own permissions.

### 6.2 Moderator

A moderator should be authenticated.

A moderator should be able to:

- View all questions for the active event.
- Filter by question status.
- Approve a question.
- Hide a question.
- Shortlist a question.
- Mark a question as answered.
- Add or edit an internal moderator note.
- View vote counts.
- Sort questions by vote count and submission time.
- Export the question list as CSV.

Moderators should have access to all moderation fields.

---

## 7. Authentication

### 7.1 Attendees

Use Supabase anonymous authentication.

Expected behavior:

1. User opens the application.
2. If no Supabase session exists, the app creates an anonymous session.
3. The resulting user UUID is used as the participant identifier.
4. No email, name, or password is required.

The attendee should never need to know that an authentication step occurred.

### 7.2 Moderators

For Version 1, use one of:

- Supabase email/password authentication, or
- Supabase magic-link authentication.

Prefer the simplest secure implementation.

Moderator status should not be inferred from frontend code alone.

Use a dedicated database table such as `moderator_users` or a role claim that is enforceable through database policy.

---

## 8. Data Model

Use UUID primary keys unless there is a strong reason not to.

### 8.1 `events`

Fields:

```text
id                  uuid primary key
name                text not null
slug                text unique not null
description         text nullable
starts_at           timestamptz nullable
ends_at             timestamptz nullable
is_active           boolean default false
created_at          timestamptz default now()
```

Notes:

- Version 1 may initially contain only one event.
- Attendee routes should resolve the event by slug or use the single active event.
- The schema must support future events without redesign.

---

### 8.2 `questions`

Fields:

```text
id                  uuid primary key
event_id            uuid not null references events(id)
submitter_id        uuid not null
question_text       text not null
status              text not null default 'pending'
moderator_note      text nullable
created_at          timestamptz default now()
updated_at          timestamptz default now()
approved_at         timestamptz nullable
shortlisted_at      timestamptz nullable
answered_at         timestamptz nullable
```

Allowed `status` values:

```text
pending
approved
shortlisted
answered
hidden
```

A PostgreSQL enum is acceptable but not required.

Constraints:

- `question_text` must not be blank.
- Maximum length: 500 characters.
- `submitter_id` should correspond to `auth.uid()` for attendee submissions.

---

### 8.3 `votes`

Fields:

```text
id                  uuid primary key
question_id         uuid not null references questions(id) on delete cascade
event_id            uuid not null references events(id)
voter_id            uuid not null
created_at          timestamptz default now()
```

Required uniqueness constraint:

```text
unique(question_id, voter_id)
```

This prevents duplicate votes from the same anonymous user.

Do **not** store a mutable vote count as the source of truth unless there is a clear performance reason.

Vote totals should preferably be derived from the votes table.

---

### 8.4 `moderator_users`

Possible schema:

```text
user_id             uuid primary key
created_at          timestamptz default now()
```

A user appearing in this table is considered a moderator.

This is preferable to hard-coding moderator email addresses in the frontend.

---

## 9. Row Level Security Requirements

RLS must be enabled on all public-facing tables.

The frontend must not rely on hidden client configuration for security.

### 9.1 `events`

Attendees:

- Can read active events.

Moderators:

- Can read all events.

Version 1 does not require moderators to create/edit events through the UI.

---

### 9.2 `questions`

Attendees may:

- Insert a question where `submitter_id = auth.uid()`.
- Read questions only when their status is one of:
  - `approved`
  - `shortlisted`
  - `answered`
- Optionally read their own pending question if useful for a "My submissions" experience.

Attendees may not:

- Update status.
- Update moderator notes.
- View hidden questions from others.
- Delete other users' questions.

For Version 1, attendee editing of submitted questions is optional and may be omitted.

Moderators may:

- Read all questions.
- Update all moderation fields.
- Update question text if necessary for typo correction, although this capability can be omitted from the UI.

---

### 9.3 `votes`

Attendees may:

- Insert a vote where `voter_id = auth.uid()`.
- Delete their own vote if implementing vote toggling.
- Read votes or vote totals for public questions.

Attendees may not:

- Insert a vote for another user.
- Manipulate multiple votes for the same question.

Moderators may:

- Read all votes.

---

### 9.4 `moderator_users`

Regular attendees must not be able to list moderator users.

Only authenticated moderators or appropriate server-side operations should be able to query moderator status.

---

## 10. Core User Flows

## 10.1 Attendee: First Visit

1. User opens conference URL.
2. App checks for Supabase session.
3. If none exists, create anonymous session.
4. Load active event.
5. Show attendee home screen.

Failure state:

If authentication or event loading fails, show a clear retry message.

---

## 10.2 Attendee: Submit Question

1. User enters question.
2. Character counter shows remaining characters.
3. User taps **Submit question**.
4. Client validates:
   - Not empty.
   - Not over 500 characters.
5. App inserts row into `questions` with:
   - current event ID
   - current `auth.uid()`
   - question text
   - status `pending`
6. On success:
   - Clear input.
   - Show confirmation message.
7. Question does not immediately appear on public board unless a moderator approves it.

Suggested confirmation:

> Your question has been submitted for review.

---

## 10.3 Attendee: Browse Questions

The attendee question board should display questions with status:

- approved
- shortlisted
- answered

Each card should show:

- Question text
- Vote count
- Upvote button
- Optional status badge for shortlisted/answered

Default sorting:

1. Vote count descending
2. Submission time ascending as tie-breaker

Provide an optional toggle:

- Top
- Newest

---

## 10.4 Attendee: Upvote

1. User taps vote button.
2. If they have not voted:
   - Insert row in `votes`.
3. If they have already voted:
   - Either do nothing or remove vote.

Preferred behavior:

Use toggle voting.

The UI should visibly indicate questions already voted for.

---

## 10.5 Moderator: Review New Questions

Moderator opens `/moderator`.

Default view:

- `pending` questions first.
- Newest submissions first.

Each question card should display:

- Question text
- Submission time
- Current vote count if already public
- Moderator note, if present
- Status

Actions:

- Approve
- Shortlist
- Hide
- Mark answered
- Add/edit note

For pending questions, the most prominent actions should be:

- Approve
- Hide

---

## 10.6 Moderator: Shortlist for Closing Panel

Moderators should be able to convert:

```text
approved -> shortlisted
```

The dashboard should have a dedicated **Shortlist** tab/view.

The shortlist should be designed for use during the closing panel.

Within shortlist view:

- Show question prominently.
- Show vote count.
- Show moderator note.
- Show time submitted.
- Allow **Mark answered**.

Default ordering:

- Vote count descending

Manual drag-and-drop ordering is out of scope for Version 1 unless trivial to implement.

---

## 10.7 Moderator: Mark Answered

When a question is addressed during the panel:

```text
shortlisted -> answered
```

Answered questions should remain visible in the moderator dashboard.

Public display of answered questions is acceptable.

Optionally display a small **Answered** badge.

---

## 10.8 Moderator: Export CSV

Provide an **Export CSV** button.

CSV should contain at minimum:

```text
question_id
event_name
question_text
status
vote_count
created_at
moderator_note
```

Prefer generating the CSV in the browser using already-authorized data.

Filename example:

```text
conference-questions-2026-11-20.csv
```

---

## 11. Application Screens

## 11.1 Attendee Home / Question Board

Mobile-first layout.

Sections:

1. Event title
2. Short explanatory text
3. Question submission form
4. Public question board

Example:

```text
--------------------------------
Conference Name

Questions for the Closing Panel

What would you like our panel
to discuss?

[                         ]
[                         ]

412 / 500

[ Submit question ]

Your question will be reviewed
before appearing publicly.

--------------------------------
Questions from participants

[ Top ] [ Newest ]

▲ 18
How should public health
organizations measure whether
AI is actually improving
productivity?

▲ 12
Where should we draw the line
between automation and human
judgment?
--------------------------------
```

---

## 11.2 Moderator Login

Simple screen.

Inputs depend on chosen authentication mechanism.

Example:

```text
Moderator access

Email
[                     ]

Password
[                     ]

[ Sign in ]
```

---

## 11.3 Moderator Dashboard

Prefer desktop/tablet-friendly layout but ensure it remains usable on mobile.

Header:

```text
Conference Name
Moderator Dashboard
```

Summary counts:

```text
Pending: 14
Approved: 28
Shortlisted: 6
Answered: 9
Hidden: 3
```

Tabs:

```text
Pending
Approved
Shortlist
Answered
Hidden
All
```

Question card example:

```text
--------------------------------

How should public health
organizations measure whether
AI is actually improving
productivity?

18 votes
Submitted 2:14 PM

Moderator note:
Good governance question.

[ Approve ] [ Shortlist ]
[ Answered ] [ Hide ]

--------------------------------
```

---

## 12. UX Requirements

### Mobile First

The attendee interface is expected to be used primarily from phones.

Target:

- Comfortable at 360px width.
- No horizontal scrolling.
- Large tap targets.
- Minimum 16px form font size to avoid mobile browser zoom issues.

### Accessibility

Aim for WCAG 2.1 AA where practical.

At minimum:

- Semantic HTML.
- Keyboard-accessible controls.
- Visible focus states.
- Adequate contrast.
- Buttons labelled with text or accessible labels.
- Status changes announced appropriately.
- Do not communicate meaning through color alone.

### Tone

Professional, simple, neutral.

Avoid gamification.

Do not make vote counts visually dominant enough to discourage new questions.

---

## 13. Realtime Behavior

Realtime updates are desirable but not required for Version 1.

Preferred approach:

- Use Supabase Realtime for approved questions and moderator dashboard updates if straightforward.

Acceptable fallback:

- Poll every 15–30 seconds.

The system should remain functional if realtime fails.

Do not make core application behavior dependent on websocket connectivity.

---

## 14. Error Handling

Handle at minimum:

### Submission failure

Show:

> We couldn't submit your question. Please try again.

Do not clear the form on failure.

### Vote failure

Show a lightweight inline error and restore the prior vote state.

### Authentication failure

Attendee:

Attempt anonymous sign-in again and show retry option.

Moderator:

Show a clear login error.

### Network disruption

The app should fail gracefully.

Offline submission queuing is not required for Version 1.

---

## 15. Abuse and Safety Controls

Version 1 should implement:

- 500-character question limit.
- Anonymous user identity.
- One vote per user per question.
- Moderation before public display.
- Database-level permission enforcement.
- Basic submission throttling if feasible.

Suggested submission limit:

- Maximum 5 submitted questions per anonymous user per event.

This should ideally be enforced server-side or through a database function rather than only in the UI.

If server-side enforcement substantially complicates Version 1, implement UI enforcement and document the limitation.

Optional:

- Cloudflare Turnstile
- hCaptcha

CAPTCHA should not be part of the initial participant flow unless necessary.

---

## 16. Privacy Considerations

Version 1 should intentionally minimize personal information.

Do not collect by default:

- Name
- Email
- Phone
- Employer
- IP address in application tables
- Device fingerprint

Supabase authentication will create anonymous user identifiers.

Question text may contain voluntarily submitted personal information, so organizers should be able to hide inappropriate submissions.

Include a short notice under the submission field such as:

> Please do not include personal or confidential information in your question.

---

## 17. Environment Variables

Expected frontend variables:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Do not place Supabase service-role keys in frontend code.

A `.env.example` must be committed.

Actual `.env` files must be gitignored.

---

## 18. Suggested Project Structure

```text
/
├── src/
│   ├── components/
│   │   ├── QuestionCard.tsx
│   │   ├── QuestionForm.tsx
│   │   ├── VoteButton.tsx
│   │   ├── StatusBadge.tsx
│   │   └── ModeratorQuestionCard.tsx
│   │
│   ├── pages/
│   │   ├── AttendeePage.tsx
│   │   ├── ModeratorLoginPage.tsx
│   │   └── ModeratorDashboardPage.tsx
│   │
│   ├── hooks/
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── csv.ts
│   │
│   ├── types/
│   ├── App.tsx
│   └── main.tsx
│
├── supabase/
│   ├── migrations/
│   └── seed.sql
│
├── public/
├── .env.example
├── README.md
├── package.json
└── vite.config.ts
```

Exact structure may vary.

---

## 19. Database Setup Deliverables

Codex should create repeatable SQL migrations for:

- `events`
- `questions`
- `votes`
- `moderator_users`
- indexes
- constraints
- RLS policies
- helper views/functions if needed

Suggested indexes:

```text
questions(event_id, status)
questions(event_id, created_at)
votes(question_id)
votes(event_id)
```

If vote totals are commonly queried, consider a SQL view such as:

```text
question_vote_counts
```

Do not prematurely optimize.

---

## 20. Development Seed Data

Include seed data for one development event:

```text
Name:
Public Health AI Symposium

Slug:
public-health-ai-symposium

is_active:
true
```

Include approximately 10 sample questions across statuses:

- pending
- approved
- shortlisted
- answered
- hidden

Include sample votes.

---

## 21. Testing Requirements

### Unit / Component Tests

At minimum test:

- Character-limit behavior.
- Empty-question rejection.
- Vote toggle behavior.
- Status badge rendering.
- CSV generation.

### Integration Testing

Test:

1. Anonymous user can submit a question.
2. Anonymous user cannot set `status = approved`.
3. Anonymous user cannot view pending questions belonging to another user.
4. Anonymous user cannot view moderator notes.
5. Anonymous user cannot vote twice for the same question.
6. Moderator can view pending questions.
7. Moderator can approve a question.
8. Approved question becomes visible to attendee.
9. Moderator can shortlist a question.
10. Moderator can mark a question answered.

Security tests should exercise the actual Supabase RLS policies.

---

## 22. Version 1 Acceptance Criteria

Version 1 is complete when all of the following are true.

### Attendee

- [ ] Opening the app automatically creates/restores an anonymous session.
- [ ] The active event loads successfully.
- [ ] A participant can submit a valid question.
- [ ] Submissions persist after page refresh.
- [ ] Pending submissions do not immediately appear publicly.
- [ ] Approved questions are displayed publicly.
- [ ] Public questions show vote totals.
- [ ] A participant can vote for a question.
- [ ] A participant cannot vote twice for the same question.
- [ ] The application is comfortable to use on a smartphone.

### Moderator

- [ ] Moderator authentication works.
- [ ] Moderators can view all questions.
- [ ] Moderators can filter by status.
- [ ] Moderators can approve questions.
- [ ] Moderators can shortlist questions.
- [ ] Moderators can hide questions.
- [ ] Moderators can mark questions answered.
- [ ] Moderators can add moderator notes.
- [ ] Moderator notes are never visible to attendees.
- [ ] Moderator can export questions to CSV.

### Security

- [ ] RLS is enabled on all relevant Supabase tables.
- [ ] Attendees cannot modify moderation fields.
- [ ] Attendees cannot view hidden/pending questions from others.
- [ ] Attendees cannot view moderator notes.
- [ ] Service-role credentials are never present in frontend code.
- [ ] Duplicate voting is prevented at the database level.

### Deployment

- [ ] Application can be deployed to a public HTTPS URL.
- [ ] Environment setup is documented.
- [ ] Database migration/setup steps are documented.
- [ ] Moderator setup is documented.
- [ ] README contains local development instructions.

---

## 23. Suggested Build Order

Codex should build in this order.

### Phase 1 — Foundation

1. Initialize React + TypeScript + Vite project.
2. Add routing.
3. Configure Supabase client.
4. Create SQL migrations.
5. Add seed data.
6. Implement anonymous authentication.

### Phase 2 — Attendee Submission

1. Load active event.
2. Build submission form.
3. Add validation.
4. Insert pending questions.
5. Add confirmation/error states.

At this point, confirm persistence works before proceeding.

### Phase 3 — Public Question Board

1. Query approved/public questions.
2. Render question cards.
3. Add vote totals.
4. Add voting.
5. Add Top/Newest sorting.

### Phase 4 — Moderator Authentication

1. Build moderator login.
2. Implement moderator authorization.
3. Protect moderator routes.

### Phase 5 — Moderator Dashboard

1. Query all questions.
2. Add status tabs.
3. Add moderation actions.
4. Add moderator notes.
5. Add shortlist view.
6. Add answered workflow.

### Phase 6 — Export and Polish

1. Add CSV export.
2. Improve loading states.
3. Improve error states.
4. Improve mobile styling.
5. Accessibility pass.
6. Add tests.
7. Add deployment documentation.

---

## 24. Implementation Principles for Codex

When making implementation decisions:

1. Prefer the simplest secure solution.
2. Keep participant friction extremely low.
3. Enforce permissions in Supabase, not only in React.
4. Avoid unnecessary abstractions.
5. Avoid introducing a custom backend unless required.
6. Use TypeScript types for database records.
7. Keep components small and understandable.
8. Document any deviation from this scope.
9. Do not add major features without first recording them as future enhancements.
10. Keep Version 1 deployable at all times after the core foundation is established.

---

## 25. Future Enhancements

Do not implement these yet, but keep the architecture compatible where reasonable.

Potential Version 2 features:

- Multiple concurrent sessions.
- Session-specific question boards.
- Optional attendee display names.
- QR-code generation.
- Full-screen panel display mode.
- Manual moderator ordering of shortlisted questions.
- Pinned questions.
- Duplicate-question merging.
- Moderator tags/categories.
- Question search.
- Event analytics.
- Time-series submission charts.
- Post-event reporting.
- Audience polls.
- Speaker-specific questions.
- Multiple moderator roles.
- Organization branding/theme settings.
- Event creation UI.
- Scheduled opening/closing of submissions.
- CAPTCHA when abuse thresholds are triggered.
- AI-assisted clustering of similar questions.
- AI-generated panel briefing summaries.

---

## 26. README Requirements

The repository README should explain:

### Local Setup

```bash
npm install
cp .env.example .env
npm run dev
```

### Supabase Setup

Document:

1. Create Supabase project.
2. Enable anonymous authentication.
3. Run migrations.
4. Run seed data.
5. Create first moderator authentication account.
6. Add that account's user UUID to `moderator_users`.
7. Populate frontend environment variables.

### Deployment

Document deployment to the selected host.

Include instructions for:

- Environment variables.
- Production Supabase project configuration.
- Custom domain, if desired.

### Event Setup

Explain how to create a new event through SQL until a future administrative UI exists.

---

## 27. Definition of Done

The application is ready for conference use when:

- It is deployed to HTTPS.
- A QR code can point attendees directly to the attendee interface.
- At least two moderators can authenticate successfully.
- A test attendee can submit a question from a phone.
- The question appears in the moderator dashboard.
- A moderator can approve it.
- The question then appears on the attendee question board.
- A second attendee can upvote it.
- The moderator can shortlist it.
- The moderator can mark it answered.
- The moderator can export the resulting dataset.
- All critical security tests pass.
- The workflow has been tested on at least:
  - iPhone Safari
  - Android Chrome
  - Desktop Chrome/Edge
- Refreshing either attendee or moderator screens does not lose persisted data.

---

# Codex Starting Instruction

Use this document as the product and technical scope for Version 1.

Begin by:

1. Reviewing the scope and identifying any genuine implementation blockers.
2. Creating the React + TypeScript + Vite project structure.
3. Creating the Supabase database migrations and RLS policies.
4. Implementing anonymous attendee authentication.
5. Building the attendee submission flow first.
6. Keeping the project runnable after each phase.

Do not expand scope without recording the proposed change separately.

Where this document leaves a minor implementation detail unspecified, choose the simplest secure and maintainable approach.
