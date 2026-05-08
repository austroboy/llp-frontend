import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 10;
export const dynamic = "force-dynamic";

type Dot = "ok" | "degraded" | "down";
const SLOW_MS = 2000;
const TIMEOUT_MS = 4000;

export async function GET() {
  const base = process.env.CHAT_PROXY_URL;
  if (!base) {
    return NextResponse.json(
      { status: "down" as Dot, reason: "missing-env", ts: Date.now() },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  const url = base.replace(/\/+$/, "") + "/health";
  const apiKey = process.env.CHAT_PROXY_API_KEY;
  const headers: Record<string, string> = {};
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    const dur = Date.now() - started;
    // Any response = proxy reachable. Slow → degraded. No response → caught below.
    const status: Dot = dur > SLOW_MS ? "degraded" : "ok";
    return NextResponse.json(
      { status, httpStatus: res.status, latencyMs: dur, ts: Date.now() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { status: "down" as Dot, latencyMs: Date.now() - started, ts: Date.now() },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
