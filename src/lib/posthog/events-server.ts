import "server-only";

import { getPostHogServer } from "./server";
import type { EventName, EventProps } from "./events";

export type { EventName, EventProps };

function sanitize<T extends Record<string, unknown>>(props: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === "string") {
      out[k] = v.length > 60 ? v.slice(0, 60) : v;
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

export async function trackServer<E extends EventName>(
  event: E,
  props: EventProps[E],
): Promise<void> {
  try {
    const server = getPostHogServer();
    if (!server) return;
    const clean = sanitize(props as unknown as Record<string, unknown>);
    const distinctId = (clean as { distinct_id?: string }).distinct_id ?? "system";
    server.capture({ distinctId, event, properties: clean });
    await server.flush();
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[posthog.trackServer] failed for "${event}":`, (err as Error).message);
    }
  }
}
