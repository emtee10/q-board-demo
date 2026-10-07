export const statuses = [
  "pending",
  "approved",
  "shortlisted",
  "answered",
  "hidden",
] as const;
export type Status = (typeof statuses)[number];
export type Event = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
};
export type Question = {
  id: string;
  event_id: string;
  question_text: string;
  status: Status;
  created_at: string;
  vote_count: number;
  has_voted: boolean;
  moderator_note: string | null;
};
