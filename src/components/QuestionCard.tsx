import { useState } from "react";
import { ChevronUp, Check, Star } from "lucide-react";
import { statusLabels, type Question, type Status } from "../types";
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`badge ${status}`}>
      {status === "shortlisted" && <Star size={12} />}
      {status === "answered" && <Check size={12} />}
      {statusLabels[status]}
    </span>
  );
}
export function VoteButton({
  question,
  onVote,
}: {
  question: Question;
  onVote: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="vote-wrap">
      <button
        className={`vote-button ${question.has_voted ? "voted" : ""}`}
        aria-label={`${question.has_voted ? "Remove vote" : "Upvote"}: ${question.question_text}`}
        aria-pressed={question.has_voted}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await onVote();
          } catch {
            setError("Vote failed. Please retry.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <ChevronUp size={19} />
        <span>{question.vote_count}</span>
      </button>
      {error && (
        <span className="error vote-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
export function QuestionCard({
  question: q,
  onVote,
}: {
  question: Question;
  onVote: () => Promise<void>;
}) {
  return (
    <article
      className={`question-card ${q.status === "answered" ? "is-answered" : ""}`}
    >
      <VoteButton question={q} onVote={onVote} />
      <div className="question-content">
        <p>{q.question_text}</p>
        <div className="question-meta">
          <span>Anonymous attendee</span>
          {["shortlisted", "answered"].includes(q.status) && (
            <StatusBadge status={q.status} />
          )}
        </div>
      </div>
    </article>
  );
}
