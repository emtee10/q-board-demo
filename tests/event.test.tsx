import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";
import { demoEvent } from "../src/lib/demo";
import {
  configuredEvent,
  configureDatabaseEvent,
  resolveEvent,
} from "../src/lib/event";

vi.mock("../event.config", () => ({
  default: {
    name: "Community Conference",
    slug: "community-conference",
    description: "Questions from our community.",
    ends_at: null,
    is_active: false,
  },
}));
vi.mock("../src/lib/supabase", () => ({
  preview: true,
  supabase: null,
  configurationError: "",
}));

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, "", "/");
});

describe("event configuration", () => {
  it("falls back to demo values for omitted and undefined fields", () => {
    expect(resolveEvent({})).toEqual(demoEvent);
    expect(resolveEvent({ name: "New event", slug: undefined })).toEqual({
      ...demoEvent,
      name: "New event",
    });
  });

  it("preserves explicit null, empty descriptions, and false", () => {
    expect(
      resolveEvent({
        description: null,
        starts_at: null,
        ends_at: null,
        is_active: false,
      }),
    ).toEqual({
      ...demoEvent,
      description: null,
      starts_at: null,
      ends_at: null,
      is_active: false,
    });
    expect(resolveEvent({ description: "" }).description).toBe("");
  });

  it("keeps database identity and omitted details for the configured event", () => {
    const databaseEvent = {
      ...demoEvent,
      id: "database-id",
      slug: configuredEvent.slug,
      starts_at: "2027-01-01T09:00:00Z",
    };
    expect(configureDatabaseEvent(databaseEvent)).toEqual({
      ...configuredEvent,
      id: databaseEvent.id,
      starts_at: databaseEvent.starts_at,
    });
    expect(configureDatabaseEvent(demoEvent)).toBe(demoEvent);
  });

  it.each(["/", "/e/community-conference"])(
    "uses configured details and activity at %s",
    async (path) => {
      window.history.replaceState({}, "", path);
      render(<App />);
      expect(
        await screen.findByText("Community Conference"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Questions from our community."),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /submit question/i }),
      ).toBeDisabled();
    },
  );

  it("uses the configured slug for the moderator route", async () => {
    window.history.replaceState({}, "", "/moderator/community-conference");
    render(<App />);
    expect(await screen.findByText("Community Conference")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /export csv/i }),
    ).toBeInTheDocument();
  });

  it("rejects the old demo slug when a different slug is configured", async () => {
    window.history.replaceState({}, "", `/e/${demoEvent.slug}`);
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This event could not be found.",
    );
  });
});
