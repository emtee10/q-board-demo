import { useState } from "react";
import { Check, EyeOff, Star } from "lucide-react";
import { StatusBadge } from "./QuestionCard";
import type { Question, Status } from "../types";
export function ModeratorCard({
  question: q,
  onUpdate,
}: {
  question: Question;
  onUpdate: (id: string, status: Status, note: string) => Promise<void>;
}) {
  const [note, setNote] = useState(q.moderator_note || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  async function update(status: Status) {
    setBusy(true);
    setError("");
    setSaved("");
    try {
      await onUpdate(q.id, status, note);
      setSaved("Saved.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="moderator-card">
      <div className="moderator-card-top">
        <StatusBadge status={q.status} />
        <span>
          {q.vote_count} votes ·{" "}
          {new Date(q.created_at).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
      </div>
      <h3>{q.question_text}</h3>
      <label htmlFor={`note-${q.id}`}>Internal moderator note</label>
      <textarea
        id={`note-${q.id}`}
        value={note}
        maxLength={5000}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add context for the panel…"
        rows={2}
      />
      <div className="moderation-actions">
        {q.status !== "approved" && (
          <button
            disabled={busy}
            className="button primary small"
            onClick={() => update("approved")}
          >
            <Check size={15} />
            Approve
          </button>
        )}
        {q.status !== "shortlisted" && (
          <button
            disabled={busy}
            className="button secondary small"
            onClick={() => update("shortlisted")}
          >
            <Star size={15} />
            Shortlist
          </button>
        )}
        {q.status !== "answered" && (
          <button
            disabled={busy}
            className="button secondary small"
            onClick={() => update("answered")}
          >
            <Check size={15} />
            Mark answered
          </button>
        )}
        {q.status !== "hidden" && (
          <button
            disabled={busy}
            className="button subtle small"
            onClick={() => update("hidden")}
          >
            <EyeOff size={15} />
            Hide
          </button>
        )}
        <button
          disabled={busy}
          className="button subtle small"
          onClick={() => update(q.status)}
        >
          Save note
        </button>
      </div>
      <div className="error" role="alert">
        {error}
      </div>
      <div className="success" role="status">
        {saved}
      </div>
    </article>
  );
}
