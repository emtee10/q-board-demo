import type { Event } from "./src/types";

// Customize this deployment's event here. Uncomment only the fields you need.
// Omitted (or undefined) fields use the defaults in src/lib/demo.ts in preview.
// With Supabase, omitted details use the selected database event's values.
// This file is bundled into the public app: do not put secrets here.
export default {
  // name: "My Conference",
  // slug: "my-conference", // Used by /, /moderator, and /e/my-conference.
  // description: "A place for attendees to ask questions and share ideas.",
  // starts_at: "2026-11-20T09:00:00Z", // ISO 8601; displayed in UTC.
  // ends_at: "2026-11-20T17:00:00Z",
  // is_active: true, // false disables the attendee submission form.
  // Use null for description or dates to hide them; false is not a fallback.
  // In Supabase, create an event with the same slug and close it in the DB too.
} satisfies Partial<Omit<Event, "id">>;
