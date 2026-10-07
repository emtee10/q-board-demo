import template from "../index.html?raw";
import { describe, expect, it } from "vitest";
import { demoEvent, demoText } from "../src/lib/demo";
import { renderEventHtml } from "../src/lib/html";

describe("event HTML metadata", () => {
  it("uses the same demo defaults as the app", () => {
    const html = renderEventHtml(template, {});
    const page = new DOMParser().parseFromString(html, "text/html");
    expect(page.title).toBe(
      `${demoEvent.name} · ${demoText.brandPrefix}${demoText.brandSuffix}`,
    );
    expect(
      page.querySelector('meta[name="description"]')?.getAttribute("content"),
    ).toBe(demoEvent.description);
    expect(html).not.toContain("%QBOARD_");
  });

  it("uses event and brand overrides and safely escapes HTML", () => {
    const name = 'Event & <speakers> "2026"';
    const description = '\"><script>alert("hello")</script> & questions';
    const html = renderEventHtml(template, {
      name,
      description,
      text: { brandPrefix: "Ask", brandSuffix: "Together" },
    });
    const page = new DOMParser().parseFromString(html, "text/html");
    expect(page.title).toBe(`${name} · AskTogether`);
    expect(
      page.querySelector('meta[name="description"]')?.getAttribute("content"),
    ).toBe(description);
    expect(page.querySelectorAll("script")).toHaveLength(1);
    expect(page.querySelector("script")?.getAttribute("src")).toBe(
      "/src/main.tsx",
    );
  });

  it.each([null, ""])(
    "keeps an intentionally empty description (%s)",
    (description) => {
      const page = new DOMParser().parseFromString(
        renderEventHtml(template, {
          description,
          text: { brandPrefix: undefined },
        }),
        "text/html",
      );
      expect(
        page.querySelector('meta[name="description"]')?.getAttribute("content"),
      ).toBe("");
      expect(page.title).toBe(
        `${demoEvent.name} · ${demoText.brandPrefix}${demoText.brandSuffix}`,
      );
    },
  );
});
