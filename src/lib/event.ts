import eventConfig from "../../event.config";
import type { Event } from "../types";
import { demoEvent } from "./demo";

export type EventConfig = Partial<Omit<Event, "id">>;

export function resolveEvent(
  config: EventConfig,
  defaults: Event = demoEvent,
): Event {
  return {
    id: defaults.id,
    name: config.name ?? defaults.name,
    slug: config.slug ?? defaults.slug,
    description:
      config.description === undefined
        ? defaults.description
        : config.description,
    starts_at:
      config.starts_at === undefined ? defaults.starts_at : config.starts_at,
    ends_at: config.ends_at === undefined ? defaults.ends_at : config.ends_at,
    is_active: config.is_active ?? defaults.is_active,
  };
}

export const configuredEvent = resolveEvent(eventConfig);

// Explicit links to other database events keep their own event details.
export function configureDatabaseEvent(event: Event): Event {
  return event.slug === configuredEvent.slug
    ? resolveEvent(eventConfig, event)
    : event;
}
