"use client";

import { useEffect, useState } from "react";

export type HealthStatus = "checking" | "ok" | "degraded" | "down";

const POLL_MS = 60_000;

export function useChatServiceHealth(enabled: boolean = true): HealthStatus {
  const [status, setStatus] = useState<HealthStatus>("checking");

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const res = await fetch("/api/health/chat-service", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setStatus("down");
        } else {
          const data = (await res.json()) as { status?: HealthStatus };
          if (!cancelled && (data.status === "ok" || data.status === "degraded" || data.status === "down")) {
            setStatus(data.status);
          }
        }
      } catch {
        if (!cancelled) setStatus("down");
      } finally {
        if (!cancelled) timer = setTimeout(tick, POLL_MS);
      }
    };

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled]);

  return status;
}
