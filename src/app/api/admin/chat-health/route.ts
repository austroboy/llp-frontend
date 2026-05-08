import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const meta = user?.publicMetadata as Record<string, unknown> | undefined;
  if (meta?.role !== "admin" && meta?.contributor !== true) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const CHAT_PROXY_URL = process.env.CHAT_PROXY_URL;
  const CHAT_PROXY_API_KEY = process.env.CHAT_PROXY_API_KEY || "";
  if (!CHAT_PROXY_URL) {
    return NextResponse.json({ error: "CHAT_PROXY_URL not configured" }, { status: 503 });
  }

  // Run checks in parallel
  const [proxyCheck, ragCheck] = await Promise.all([
    // Chat proxy health
    fetch(`${CHAT_PROXY_URL}/health`, {
      signal: AbortSignal.timeout(5000),
      headers: CHAT_PROXY_API_KEY ? { Authorization: `Bearer ${CHAT_PROXY_API_KEY}` } : {},
    })
      .then(async (r) => {
        if (!r.ok) return { online: true, model: null, treeNodes: 0, provider: null };
        const d = await r.json().catch(() => ({}));
        return { online: true, model: d.model, treeNodes: d.nodes || 0, provider: d.provider, tierConfig: d.tierConfig || {} };
      })
      .catch(() => ({ online: false, model: null, treeNodes: 0, provider: null, tierConfig: {} })),

    // Supabase chunk count
    (async () => {
      try {
        const sb = createServerClient();
        const { count } = await sb.from("chunks").select("*", { count: "exact", head: true });
        return { count: count ?? 0 };
      } catch {
        return { count: 0 };
      }
    })(),
  ]);

  // Build system prompt for the requested tier
  const url = new URL(request.url);
  const tier = url.searchParams.get("tier") || "free_guest";
  let systemPrompt = "";
  try {
    const { buildSystemPrompt } = await import("@/lib/ai/system-prompt");
    systemPrompt = buildSystemPrompt(tier as any, {
      intents: ["FACTUAL"], primary_intent: "FACTUAL", domain: "other",
      cross_domains: [], urgency: "general", language: "english",
      requires_file: false, perspective: "neutral",
    } as any, []);
  } catch {}

  return NextResponse.json({
    proxyOnline: proxyCheck.online,
    proxyModel: proxyCheck.model,
    proxyProvider: proxyCheck.provider,
    treeNodeCount: proxyCheck.treeNodes,
    ragChunkCount: ragCheck.count,
    tierConfig: proxyCheck.tierConfig,
    systemPromptLines: systemPrompt.split("\n").length,
    systemPrompt,
  });
}
