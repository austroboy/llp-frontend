import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 10;
export const dynamic = "force-dynamic";

type Dot = "ok" | "degraded" | "down";
interface StatusPayload {
  chat: Dot;
  data: Dot;
  workspace: Dot;
  ts: number;
}

const SLOW_MS = 2000;
const TIMEOUT_MS = 4000;

async function pingUrl(url: string | undefined, opts?: { headers?: Record<string, string>; acceptAnyStatus?: boolean }): Promise<Dot> {
  if (!url) return "down";
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: opts?.headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    const dur = Date.now() - started;
    const ok = opts?.acceptAnyStatus ? true : res.ok;
    if (!ok) return "degraded";
    return dur > SLOW_MS ? "degraded" : "ok";
  } catch {
    return "down";
  }
}

async function checkChat(): Promise<Dot> {
  const base = process.env.CHAT_PROXY_URL;
  if (!base) return "down";
  // Hit root or /health if present; any HTTP response counts as reachable.
  return pingUrl(base.replace(/\/+$/, "") + "/health", { acceptAnyStatus: true });
}

async function checkData(): Promise<Dot> {
  const started = Date.now();
  try {
    const sb = createServerClient();
    // Lightweight ping — HEAD against a tiny table. conversations exists per existing schema.
    const p = sb.from("conversations").select("id", { count: "exact", head: true }).limit(1);
    const res = await Promise.race([
      p,
      new Promise((_, rj) => setTimeout(() => rj(new Error("timeout")), TIMEOUT_MS)),
    ]) as Awaited<typeof p>;
    const dur = Date.now() - started;
    if (res.error) return "degraded";
    return dur > SLOW_MS ? "degraded" : "ok";
  } catch {
    return "down";
  }
}

async function checkWorkspace(): Promise<Dot> {
  // status check uses default URL during migration window
  const base = process.env.GOCLAW_URL;
  if (!base) return "down";
  return pingUrl(base.replace(/\/+$/, "") + "/healthz", { acceptAnyStatus: true });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const [chat, data, workspace] = await Promise.all([
    checkChat(),
    checkData(),
    checkWorkspace(),
  ]);
  const payload: StatusPayload = { chat, data, workspace, ts: Date.now() };
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
