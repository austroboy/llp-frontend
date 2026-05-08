import "server-only";

import { lookup as dnsLookup } from "node:dns";
import { Agent, fetch as undiciFetch } from "undici";
import { PostHog } from "posthog-node";

const ipv4Agent = new Agent({
  connect: {
    lookup: (hostname, _opts, cb) =>
      dnsLookup(hostname, { family: 4, all: true }, cb),
  },
});

let _client: PostHog | null = null;

export function getPostHogServer(): PostHog | null {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return null;
  if (_client) return _client;
  _client = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });
  return _client;
}

/**
 * Server-only PostHog capture helper. Untyped sibling of `trackServer()` —
 * use this from webhook handlers and other server contexts where the event
 * name is dynamic (e.g. mapping Clerk event types) and the ≤60-char
 * sanitization needs to apply uniformly to string properties.
 *
 * Mirrors the privacy contract of the client `track()` wrapper.
 */
export async function captureServer(
  distinctId: string,
  event: string,
  props: Record<string, unknown>,
): Promise<void> {
  try {
    const server = getPostHogServer();
    if (!server) return;
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(props)) {
      clean[k] = typeof v === "string" && v.length > 60 ? v.slice(0, 60) : v;
    }
    server.capture({ distinctId, event, properties: clean });
    await server.flush();
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[posthog.captureServer] failed for "${event}":`, (err as Error).message);
    }
  }
}

export interface HogQLResult {
  columns: string[];
  results: unknown[][];
  types?: unknown[];
}

export async function runHogQL(query: string): Promise<HogQLResult> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const host = process.env.POSTHOG_HOST_API ?? "https://us.posthog.com";

  if (!apiKey) throw new Error("POSTHOG_PERSONAL_API_KEY missing");
  if (!projectId) throw new Error("POSTHOG_PROJECT_ID missing");

  const url = `${host}/api/projects/${projectId}/query/`;
  let res: Awaited<ReturnType<typeof undiciFetch>>;
  try {
    res = await undiciFetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
      dispatcher: ipv4Agent,
    });
  } catch (err) {
    const cause = (err as { cause?: { code?: string } }).cause?.code;
    throw new Error(
      `PostHog query transport error: ${(err as Error).message}${cause ? ` (${cause})` : ""}`,
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const sanitized = text.replace(/phx_[A-Za-z0-9]+/g, "phx_***");
    throw new Error(`PostHog query failed (${res.status}): ${sanitized.slice(0, 500)}`);
  }

  const json = (await res.json()) as Partial<HogQLResult>;
  return {
    columns: json.columns ?? [],
    results: json.results ?? [],
    types: json.types,
  };
}

export function injectTimeRange(query: string, from: string, to: string): string {
  const safeFrom = from.replace(/'/g, "");
  const safeTo = to.replace(/'/g, "");
  return query
    .replace(/\{\{from\}\}/g, `'${safeFrom}'`)
    .replace(/\{\{to\}\}/g, `'${safeTo}'`);
}
