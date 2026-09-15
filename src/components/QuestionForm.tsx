import { useState } from "react";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
export function QuestionForm({
  onSubmit,
  disabled = false,
}: {
  onSubmit: (text: string) => Promise<void>;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!text.trim()) {
      setError("Please enter a question.");
      return;
    }
    if (text.length > 500) {
      setError("Please keep your question to 500 characters.");
      return;
    }
    setBusy(true);
    try {
      await onSubmit(text.trim());
      setText("");
      setMessage("Your question has been submitted for review.");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "We couldn't submit your question. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="submit-panel">
      <div className="eyebrow">MAKE ROOM FOR YOUR QUESTION</div>
      <h2>What’s on your mind?</h2>
      <p>Your perspective belongs in the conversation.</p>
      <form onSubmit={submit}>
        <label className="sr-only" htmlFor="question">
          Your question
        </label>
        <div className="textarea-wrap">
          <textarea
            id="question"
            placeholder="What would you like our panel to discuss?"
            value={text}
            maxLength={500}
            onChange={(e) => setText(e.target.value)}
            disabled={busy || disabled}
            rows={5}
            aria-describedby="question-privacy character-count"
          />
          <span id="character-count" className="character-count">
            {text.length} / 500
          </span>
        </div>
        <p id="question-privacy" className="privacy">
          Please don’t include personal or confidential information.
        </p>
        <button
          className="button primary submit-button"
          disabled={busy || disabled}
        >
          {busy ? "Submitting…" : "Submit question"}
          <ArrowUpRight size={18} />
        </button>
        <div role="alert" className="error">
          {error}
        </div>
        <div role="status" className="success">
          {message}
        </div>
      </form>
      <div className="review-note">
        <ShieldCheck size={20} />
        <span>
          Questions are reviewed before appearing on the board. Submissions are
          anonymous.
        </span>
      </div>
    </section>
  );
}
