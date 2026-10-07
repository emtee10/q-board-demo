import { uiText } from "../lib/event";
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
      setError(uiText.questionRequired);
      return;
    }
    if (text.length > 500) {
      setError(uiText.questionTooLong);
      return;
    }
    setBusy(true);
    try {
      await onSubmit(text.trim());
      setText("");
      setMessage(uiText.questionSubmitted);
    } catch (e) {
      setError(e instanceof Error ? e.message : uiText.submitFailed);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="submit-panel">
      <div className="eyebrow">{uiText.questionEyebrow}</div>
      <h2>{uiText.questionHeading}</h2>
      <p>{uiText.questionIntro}</p>
      <form onSubmit={submit}>
        <label className="sr-only" htmlFor="question">
          {uiText.questionLabel}
        </label>
        <div className="textarea-wrap">
          <textarea
            id="question"
            placeholder={uiText.questionPlaceholder}
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
          {uiText.questionPrivacy}
        </p>
        <button
          className="button primary submit-button"
          disabled={busy || disabled}
        >
          {busy ? uiText.submitting : uiText.submitQuestion}
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
        <span>{uiText.questionReviewNotice}</span>
      </div>
    </section>
  );
}
