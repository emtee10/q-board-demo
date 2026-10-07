import { resolveEvent, resolveText, type EventConfig } from "./event";

function escapeHtml(value: string): string {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return value.replace(/[&<>"']/g, (character) => entities[character]);
}

// Resolve metadata at build time, before JavaScript or a database connection.
export function renderEventHtml(html: string, config: EventConfig): string {
  const event = resolveEvent(config);
  const text = resolveText(config.text);
  const values = {
    QBOARD_TITLE: `${event.name} · ${text.brandPrefix}${text.brandSuffix}`,
    QBOARD_DESCRIPTION: event.description ?? "",
  };
  return html.replace(/%QBOARD_(TITLE|DESCRIPTION)%/g, (_, key: string) =>
    escapeHtml(values[`QBOARD_${key}` as keyof typeof values]),
  );
}
