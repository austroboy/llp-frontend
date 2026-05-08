import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { classifyIntent } from "@/lib/ai/intent-classifier";
import { buildSystemPrompt, buildTierBlock } from "@/lib/ai/system-prompt";
import { checkIntentAccessAsync } from "@/lib/ai/tier-middleware";
import type { Tier } from "@/lib/ai/framework-types";

const CHAT_PROXY_URL = process.env.CHAT_PROXY_URL;
const CHAT_PROXY_API_KEY = process.env.CHAT_PROXY_API_KEY || "";
if (!CHAT_PROXY_URL && process.env.NODE_ENV === "production") {
  throw new Error("CHAT_PROXY_URL env required");
}

export const maxDuration = 60;

async function isAdmin(): Promise<{ admin: boolean; userId: string }> {
  const { userId } = await auth();
  if (!userId) return { admin: false, userId: "" };
  try {
    const user = await currentUser();
    const metadata = user?.publicMetadata as Record<string, unknown> | undefined;
    const admin = metadata?.role === "admin";
    return { admin, userId };
  } catch {
    return { admin: false, userId: userId || "" };
  }
}

/** Extract citation references from response text */
function extractCitations(text: string): Array<{ section: string; document: string }> {
  const citations: Array<{ section: string; document: string }> = [];
  const seen = new Set<string>();
  const patterns = [
    /Section\s+(\d+[A-Za-z]?)(?:\((\d+)\))?(?:,?\s*(?:Bangladesh\s+)?(?:Labour\s+)?(?:Act|Rules|Amendment|Ordinance)[^,\n)]*(?:,?\s*(\d{4}))?)?/gi,
    /ধারা\s+([০-৯\d]+[ক-হ]?)(?:\s*\((?:Section\s+)?(\d+[A-Za-z]?)\))?/gi,
    /Rule\s+(\d+[A-Za-z]?)(?:\((\d+)\))?/gi,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const section = match[0].trim();
      const key = section.toLowerCase().replace(/\s+/g, " ");
      if (!seen.has(key)) {
        seen.add(key);
        const isRule = /^Rule\s/i.test(section);
        const defaultDoc = isRule ? "Bangladesh Labour Rules, 2015" : "Bangladesh Labour Act, 2006";
        citations.push({ section, document: match[3] ? `Bangladesh Labour ${isRule ? "Rules" : "Act"}, ${match[3]}` : defaultDoc });
      }
    }
  }
  return citations;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { admin } = await isAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { message, history, tier_override, system_prompt_override } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const tier = (tier_override || "free_guest") as Tier;
    const debug: Record<string, unknown> = {
      provider: "Chat Proxy",
      startTime: new Date().toISOString(),
      tier,
      system_prompt_override_active: !!system_prompt_override,
    };

    // ── Intent classification via Gemini Flash (same as /api/chat) ──
    const classifyStart = Date.now();
    let classification;
    try {
      classification = await classifyIntent(message);
    } catch {
      classification = {
        intents: ["FACTUAL" as const],
        primary_intent: "FACTUAL" as const,
        domain: "other",
        cross_domains: [],
        urgency: "general" as const,
        language: /[\u0980-\u09FF]/.test(message) ? "bangla" as const : "english" as const,
        requires_file: false,
        perspective: "neutral" as const,
      };
    }
    debug.classificationMs = Date.now() - classifyStart;
    debug.classification = classification;

    // ── Build system prompt (same as /api/chat) ──
    const { blockedIntents } = await checkIntentAccessAsync(tier, classification);
    let systemPrompt: string;
    if (system_prompt_override) {
      const tierBlock = buildTierBlock(tier, blockedIntents);
      systemPrompt = system_prompt_override + "\n" + tierBlock;
    } else {
      systemPrompt = buildSystemPrompt(tier, classification, blockedIntents);
    }

    // ── Call inference proxy (tree reasoning + RAG + race mode) ──
    const proxyStart = Date.now();
    const proxyHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (CHAT_PROXY_API_KEY) proxyHeaders["Authorization"] = `Bearer ${CHAT_PROXY_API_KEY}`;

    const resolvedHistory = Array.isArray(history)
      ? history.filter((h: { role?: string; content?: string }) => h.role && h.content).slice(-8)
      : [];

    let proxyRes;
    try {
      proxyRes = await fetch(`${CHAT_PROXY_URL}/chat`, {
        method: "POST",
        headers: proxyHeaders,
        body: JSON.stringify({
          query: message,
          history: resolvedHistory,
          max_tokens: 4096,
          skip_audit: true,
          system_prompt: systemPrompt,
          domain: classification.domain,
          tier,
        }),
        signal: AbortSignal.timeout(55000),
      });
    } catch (err) {
      console.error("[admin-chat-test] proxy unreachable:", err);
      return NextResponse.json(
        { error: "upstream_unreachable" },
        { status: 502 }
      );
    }

    if (!proxyRes.ok || !proxyRes.body) {
      const errText = await proxyRes.text().catch(() => "");
      console.error("[admin-chat-test] proxy error:", proxyRes.status, errText.slice(0, 500));
      return NextResponse.json(
        { error: "upstream_error" },
        { status: 502 }
      );
    }

    // ── Stream proxy NDJSON → frontend NDJSON with debug wrapper ──
    const encoder = new TextEncoder();
    const reader = proxyRes.body.getReader();
    const decoder = new TextDecoder();

    const readable = new ReadableStream({
      async start(controller) {
        // Send debug metadata
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: "debug",
              data: debug,
              systemPrompt: system_prompt_override
                ? "[Custom override + tier block]"
                : `[Production buildSystemPrompt for ${tier}]`,
            }) + "\n"
          )
        );

        // Send initial meta
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: "meta",
              citations: [],
              conversation_id: null,
              tier,
              classification: {
                primary_intent: classification.primary_intent || "FACTUAL",
                domain: classification.domain || "other",
                urgency: classification.urgency || "general",
                language: classification.language || "english",
                perspective: classification.perspective || "neutral",
              },
              blockedIntents,
            }) + "\n"
          )
        );

        let buffer = "";
        let fullAnswer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const event = JSON.parse(line);
                if (event.type === "text") {
                  fullAnswer += event.content;
                  controller.enqueue(encoder.encode(JSON.stringify({ type: "text", content: event.content }) + "\n"));
                } else if (event.type === "meta") {
                  const metaUpdate: Record<string, unknown> = { type: "meta_update" };
                  if (event.model) metaUpdate.model = event.model;
                  if (event.nodesUsed !== undefined) metaUpdate.nodesUsed = event.nodesUsed;
                  if (event.ragChunks !== undefined) metaUpdate.ragChunks = event.ragChunks;
                  if (event.contextLength !== undefined) metaUpdate.contextLength = event.contextLength;
                  if (event.raceWinner) metaUpdate.raceWinner = event.raceWinner;
                  if (event.raceCandidates) metaUpdate.raceCandidates = event.raceCandidates;
                  if (Object.keys(metaUpdate).length > 1) {
                    controller.enqueue(encoder.encode(JSON.stringify(metaUpdate) + "\n"));
                  }
                  if (event.citations?.length > 0) {
                    controller.enqueue(encoder.encode(JSON.stringify({ type: "meta_update", citations: event.citations }) + "\n"));
                  }
                } else if (event.type === "citations") {
                  controller.enqueue(encoder.encode(JSON.stringify({ type: "meta_update", citations: event.citations }) + "\n"));
                } else if (event.type === "citations_audit") {
                  controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
                }
              } catch {
                /* skip malformed */
              }
            }
          }

          // Post-stream: extract citations from full text
          if (fullAnswer) {
            const citations = extractCitations(fullAnswer);
            if (citations.length > 0) {
              controller.enqueue(encoder.encode(JSON.stringify({ type: "meta_update", citations }) + "\n"));
            }
          }

          debug.proxyMs = Date.now() - proxyStart;
          debug.totalMs = Date.now() - startTime;
          debug.answerLength = fullAnswer.length;

          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "debug_final",
                timing: {
                  classificationMs: debug.classificationMs,
                  proxyMs: debug.proxyMs,
                  totalMs: debug.totalMs,
                },
                answerLength: debug.answerLength,
                estimatedTokens: {
                  input: Math.ceil(message.length / 4),
                  output: Math.ceil(fullAnswer.length / 4),
                },
              }) + "\n"
            )
          );
        } catch (err) {
          console.error("[admin-chat] Stream error:", err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("[admin-chat] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
