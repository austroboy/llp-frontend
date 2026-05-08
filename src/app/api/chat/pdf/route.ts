import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { rateGuard } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

function shouldRenderLocally(): boolean {
  if (process.env.PDF_LOCAL_RENDER === "1") return true;
  if (process.env.PDF_LOCAL_RENDER === "0") return false;
  if (!process.env.CHAT_PROXY_URL) return true;
  return process.env.NODE_ENV !== "production";
}

export async function POST(request: NextRequest) {
  const blocked = await rateGuard(request, 10);
  if (blocked) return blocked;

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    public_id?: string;
    include_english?: boolean;
    include_summary?: boolean;
    include_verify?: boolean;
  } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { public_id } = body;
  if (!public_id || typeof public_id !== "string") {
    return NextResponse.json({ error: "public_id required" }, { status: 400 });
  }

  const options = {
    en: !!body.include_english,
    summary: !!body.include_summary,
    verify: !!body.include_verify,
  };
  const qs = new URLSearchParams();
  if (options.en) qs.set("en", "1");
  if (options.summary) qs.set("summary", "1");
  if (options.verify) qs.set("verify", "1");
  const shareIdWithQuery = qs.toString()
    ? `${public_id}?${qs.toString()}`
    : public_id;

  const supabase = createServerClient();
  const { data: share } = await supabase
    .from("shared_conversations")
    .select("public_id, user_id, is_active, expires_at")
    .eq("public_id", public_id)
    .eq("is_active", true)
    .single();

  if (!share) {
    return NextResponse.json({ error: "Share not found" }, { status: 404 });
  }
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return NextResponse.json({ error: "Share expired" }, { status: 410 });
  }

  const host = request.headers.get("host");
  const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (host
      ? `${host.includes("localhost") ? "http" : "https"}://${host}`
      : "https://laborlawpartner.com");

  // Dev / local — skip chat-proxy, render directly on this Node process
  if (shouldRenderLocally()) {
    console.log(
      `[api/chat/pdf] local render start  shareId=${public_id}  siteUrl=${SITE_URL}  options=${JSON.stringify(options)}`
    );
    const started = Date.now();
    try {
      const { renderSharePdfLocal } = await import("@/lib/pdf-renderer");
      const pdfBytes = await renderSharePdfLocal({ shareId: shareIdWithQuery, siteUrl: SITE_URL });
      console.log(
        `[api/chat/pdf] local render ok  shareId=${public_id}  bytes=${pdfBytes.byteLength}  took=${Date.now() - started}ms`
      );
      return new NextResponse(pdfBytes as unknown as ArrayBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="LLP-Universe-${public_id}.pdf"`,
          "Content-Length": String(pdfBytes.byteLength),
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Local render failed";
      const stack = err instanceof Error ? err.stack : undefined;
      console.error(`[api/chat/pdf] local render FAILED  shareId=${public_id}  error=${msg}\n${stack ?? ""}`);
      return NextResponse.json(
        { error: "PDF render failed", detail: msg },
        { status: 500 }
      );
    }
  }

  // Prod — proxy to inference chat-proxy
  const CHAT_PROXY_URL = process.env.CHAT_PROXY_URL!;
  const CHAT_PROXY_API_KEY = process.env.CHAT_PROXY_API_KEY || "";

  try {
    const proxyRes = await fetch(`${CHAT_PROXY_URL}/pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(CHAT_PROXY_API_KEY
          ? { Authorization: `Bearer ${CHAT_PROXY_API_KEY}` }
          : {}),
      },
      body: JSON.stringify({ shareId: shareIdWithQuery, siteUrl: SITE_URL }),
    });

    if (!proxyRes.ok) {
      const detail = await proxyRes.text().catch(() => "");
      console.error("[chat/pdf] proxy error:", proxyRes.status, detail.slice(0, 500));
      return NextResponse.json(
        { error: "PDF render failed" },
        { status: 502 }
      );
    }

    const pdfBytes = await proxyRes.arrayBuffer();
    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="LLP-Universe-${public_id}.pdf"`,
        "Content-Length": String(pdfBytes.byteLength),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Proxy unreachable";
    return NextResponse.json({ error: "PDF service unreachable", detail: msg }, { status: 503 });
  }
}
