import type { Event, Question } from "../types";
export const demoEvent: Event = {
  id: "demo",
  name: "Public Health AI Symposium",
  slug: "public-health-ai-symposium",
  description:
    "Bringing public health and artificial intelligence into conversation.",
  starts_at: "2026-11-20T09:00:00Z",
  ends_at: "2026-11-20T17:00:00Z",
  is_active: true,
};
const samples: [string, Question["status"], number][] = [
  [
    "How do we make sure AI tools reduce health inequalities, rather than reinforce them?",
    "shortlisted",
    24,
  ],
  [
    "What does meaningful community involvement look like when developing AI for public health?",
    "approved",
    18,
  ],
  [
    "How should we measure whether AI is actually improving outcomes, beyond saving time?",
    "approved",
    16,
  ],
  [
    "Where should we draw the line between automation and human judgment?",
    "shortlisted",
    12,
  ],
  [
    "What is one practical step a small public health team can take to get started responsibly?",
    "approved",
    9,
  ],
  [
    "How can we build public trust when the decisions made by an AI system are difficult to explain?",
    "answered",
    7,
  ],
  [
    "What skills will the next generation of public health professionals need?",
    "approved",
    5,
  ],
  [
    "How can local teams evaluate the quality of the data used to train these tools?",
    "pending",
    0,
  ],
  [
    "What governance should be in place before a pilot becomes a permanent service?",
    "pending",
    0,
  ],
  ["Can the panel share a specific vendor recommendation?", "hidden", 0],
];
export function initialDemo(): Question[] {
  return samples.map(([question_text, status, vote_count], i) => ({
    id: `demo-${i}`,
    event_id: "demo",
    question_text,
    status,
    vote_count,
    has_voted: false,
    created_at: new Date(Date.UTC(2026, 10, 20, 10, i * 4)).toISOString(),
    moderator_note:
      status === "shortlisted"
        ? "Invite perspectives from both research and practice."
        : null,
  }));
}
const storageKey = "q-board-preview-v1";
export function readDemo(): Question[] {
  try {
    return (
      JSON.parse(localStorage.getItem(storageKey) || "null") || initialDemo()
    );
  } catch {
    return initialDemo();
  }
}
export function saveDemo(questions: Question[]) {
  localStorage.setItem(storageKey, JSON.stringify(questions));
}
