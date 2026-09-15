// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
const db = new PGlite();
const attendee = "00000000-0000-4000-8000-000000000011";
const other = "00000000-0000-4000-8000-000000000012";
const moderator = "00000000-0000-4000-8000-000000000013";
const event = "10000000-0000-4000-8000-000000000011";
let question: string;
async function asUser(id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
beforeAll(async () => {
  await db.exec(
    `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key, aud text, role text, is_anonymous boolean, created_at timestamptz, updated_at timestamptz); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated, anon; grant execute on function auth.uid() to authenticated, anon;`,
  );
  await db.exec(
    readFileSync("supabase/migrations/202609150001_initial.sql", "utf8"),
  );
  await db.query("insert into auth.users(id) values ($1),($2),($3)", [
    attendee,
    other,
    moderator,
  ]);
  await db.query("insert into public.moderator_users(user_id) values($1)", [
    moderator,
  ]);
  await db.query(
    "insert into public.events(id,name,slug,is_active) values($1,'Test event','test',true)",
    [event],
  );
}, 30000);
afterAll(async () => {
  await db.close();
});
describe.sequential(
  "actual migration grants, RLS policies, and database functions",
  () => {
    it("allows an anonymous authenticated attendee to submit and persist a pending question", async () => {
      await asUser(attendee);
      await db.query(
        "insert into public.questions(event_id,submitter_id,question_text) values($1,$2,$3)",
        [event, attendee, "How can we improve public health?"],
      );
      const result = await db.query<{ id: string; status: string }>(
        "select id,status from public.questions",
      );
      question = result.rows[0].id;
      expect(result.rows[0].status).toBe("pending");
    });
    it("denies forged moderation fields and identity", async () => {
      await expect(
        db.query(
          "insert into public.questions(event_id,submitter_id,question_text,status) values($1,$2,'bad','approved')",
          [event, attendee],
        ),
      ).rejects.toThrow(/permission denied/);
      await expect(
        db.query(
          "insert into public.questions(event_id,submitter_id,question_text) values($1,$2,'bad')",
          [event, other],
        ),
      ).rejects.toThrow(/row-level security/);
      await expect(
        db.query("update public.questions set status='approved' where id=$1", [
          question,
        ]),
      ).rejects.toThrow(/permission denied/);
    });
    it("hides other attendees pending questions and denies moderator RPCs", async () => {
      await asUser(other);
      expect(
        (await db.query("select id from public.questions")).rows,
      ).toHaveLength(0);
      await expect(
        db.query("select * from public.list_questions($1,true)", [event]),
      ).rejects.toThrow(/Moderator access/);
      await expect(
        db.query("select public.moderate_question($1,'approved','secret')", [
          question,
        ]),
      ).rejects.toThrow(/Moderator access/);
      expect(
        (await db.query("select * from public.moderator_users")).rows,
      ).toHaveLength(0);
      await expect(
        db.query("insert into public.moderator_users(user_id) values($1)", [
          other,
        ]),
      ).rejects.toThrow(/permission denied/);
    });
    it("allows a moderator to see pending questions and approve with private notes", async () => {
      await asUser(moderator);
      expect(
        (
          await db.query("select * from public.list_questions($1,true)", [
            event,
          ])
        ).rows,
      ).toHaveLength(1);
      await db.query(
        "select public.moderate_question($1,'approved','Private panel note')",
        [question],
      );
    });
    it("shows approved questions without notes and blocks direct note reads", async () => {
      await asUser(other);
      const result = await db.query<{
        moderator_note: string | null;
        status: string;
      }>("select * from public.list_questions($1,false)", [event]);
      expect(result.rows[0].status).toBe("approved");
      expect(result.rows[0].moderator_note).toBeNull();
      await expect(
        db.query("select moderator_note from public.questions"),
      ).rejects.toThrow(/permission denied/);
      await expect(db.query("select * from public.questions")).rejects.toThrow(
        /permission denied/,
      );
    });
    it("permits one vote, rejects duplicates and impersonation, and allows toggling", async () => {
      await db.query(
        "insert into public.votes(question_id,event_id,voter_id) values($1,$2,$3)",
        [question, event, other],
      );
      await expect(
        db.query(
          "insert into public.votes(question_id,event_id,voter_id) values($1,$2,$3)",
          [question, event, other],
        ),
      ).rejects.toThrow(/unique constraint/);
      await expect(
        db.query(
          "insert into public.votes(question_id,event_id,voter_id) values($1,$2,$3)",
          [question, event, attendee],
        ),
      ).rejects.toThrow(/row-level security/);
      const result = await db.query<{ vote_count: number; has_voted: boolean }>(
        "select * from public.list_questions($1,false)",
        [event],
      );
      expect(Number(result.rows[0].vote_count)).toBe(1);
      expect(result.rows[0].has_voted).toBe(true);
      await db.query("delete from public.votes where question_id=$1", [
        question,
      ]);
      expect((await db.query("select * from public.votes")).rows).toHaveLength(
        0,
      );
    });
    it("supports shortlist and answered workflows with timestamps", async () => {
      await asUser(moderator);
      await db.query(
        "select public.moderate_question($1,'shortlisted','Panel first')",
        [question],
      );
      expect(
        (
          await db.query<{ status: string }>(
            "select status from public.questions",
          )
        ).rows[0].status,
      ).toBe("shortlisted");
      await db.query("select public.moderate_question($1,'answered','Done')", [
        question,
      ]);
      const result = await db.query<{ status: string; answered_at: string }>(
        "select status,answered_at from public.questions",
      );
      expect(result.rows[0].status).toBe("answered");
      expect(result.rows[0].answered_at).toBeTruthy();
    });
    it("hides moderated questions and prevents voting on them", async () => {
      await db.query("select public.moderate_question($1,'hidden','Private')", [
        question,
      ]);
      await asUser(other);
      expect(
        (await db.query("select id from public.questions")).rows,
      ).toHaveLength(0);
      await expect(
        db.query(
          "insert into public.votes(question_id,event_id,voter_id) values($1,$2,$3)",
          [question, event, other],
        ),
      ).rejects.toThrow(/row-level security/);
    });
    it("enforces text validation and five submissions server-side", async () => {
      await asUser(attendee);
      for (const text of [" ", "x".repeat(501)])
        await expect(
          db.query(
            "insert into public.questions(event_id,submitter_id,question_text) values($1,$2,$3)",
            [event, attendee, text],
          ),
        ).rejects.toThrow(/check constraint/);
      for (let i = 0; i < 4; i++)
        await db.query(
          "insert into public.questions(event_id,submitter_id,question_text) values($1,$2,'Another question')",
          [event, attendee],
        );
      await expect(
        db.query(
          "insert into public.questions(event_id,submitter_id,question_text) values($1,$2,'Too many')",
          [event, attendee],
        ),
      ).rejects.toThrow(/limit of 5/);
    });
    it("rejects unauthenticated reads and RPC calls", async () => {
      await db.exec("reset role; set role anon;");
      await expect(db.query("select * from public.events")).rejects.toThrow(
        /permission denied/,
      );
      await expect(
        db.query("select * from public.list_questions($1,false)", [event]),
      ).rejects.toThrow(/permission denied/);
    });
    it("seed data can be applied twice without duplicate submissions", async () => {
      await db.exec("reset role");
      const seed = readFileSync("supabase/seed.sql", "utf8");
      await db.exec(seed);
      await db.exec(seed);
      expect(
        (
          await db.query(
            "select id from public.questions where event_id='10000000-0000-4000-8000-000000000001'",
          )
        ).rows,
      ).toHaveLength(10);
    });
  },
);
