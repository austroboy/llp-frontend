"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type Dot = "ok" | "degraded" | "down" | "unknown";
interface Status {
  chat: Dot;
  data: Dot;
  workspace: Dot;
}

const DOT_ORDER: Array<{ key: keyof Status; label: string }> = [
  { key: "chat", label: "Chat service" },
  { key: "data", label: "Data service" },
  { key: "workspace", label: "Workspace service" },
];

const COLOR: Record<Dot, string> = {
  ok: "bg-emerald-500 shadow-[0_0_6px_theme(colors.emerald.400)]",
  degraded: "bg-amber-400 shadow-[0_0_6px_theme(colors.amber.300)]",
  down: "bg-red-500 shadow-[0_0_6px_theme(colors.red.400)]",
  unknown: "bg-muted-foreground/40",
};

const POLL_MS = 60_000;

export function StatusDots() {
  const [status, setStatus] = useState<Status>({
    chat: "unknown",
    data: "unknown",
    workspace: "unknown",
  });

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = async () => {
      try {
        const r = await fetch("/api/status", { cache: "no-store" });
        if (!r.ok) return;
        const j = (await r.json()) as Status;
        if (!alive) return;
        setStatus((prev) => ({ ...prev, ...j }));
      } catch {
        /* silent — keep last known */
      }
    };

    tick();
    timer = setInterval(tick, POLL_MS);
    const onVis = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      alive = false;
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div className="sd-wrap pt-1.5 space-y-1.5">
      <div
        role="status"
        aria-label="Service status"
        className="flex items-center justify-center sm:justify-between gap-2"
      >
        <span className="hidden sm:inline sd-label text-[9.5px] uppercase tracking-[0.28em]">
          <span className="sd-section">&sect;</span> Server
        </span>
        <div className="flex items-center gap-1.5">
          {DOT_ORDER.map(({ key, label }) => {
            const s = status[key];
            return (
              <span
                key={key}
                title={label}
                aria-label={label}
                className={cn(
                  "relative inline-block size-[7px] rounded-full transition-colors",
                  COLOR[s],
                  s === "degraded" && "animate-pulse motion-reduce:animate-none",
                  s === "down" && "animate-pulse motion-reduce:animate-none",
                )}
              />
            );
          })}
        </div>
      </div>
      <LiveClock />
      <style>{`
        .sd-label {
          font-family: var(--font-jetbrains), ui-monospace, monospace;
          color: var(--sb-ink-muted, rgba(29, 20, 16, 0.62));
        }
        .sd-section { color: var(--sb-rust, #b25c22); }
      `}</style>
    </div>
  );
}

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const { dateStr, timeStr } = useMemo(() => {
    if (!now) return { dateStr: "", timeStr: "" };
    return {
      dateStr: now.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" }).toUpperCase(),
      timeStr: now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false }),
    };
  }, [now]);

  if (!now) return null;

  return (
    <>
      <div
        aria-live="off"
        className="sd-clock flex items-center justify-center sm:justify-between gap-2 text-[9.5px] tabular-nums"
      >
        <span className="hidden sm:inline sd-date">{dateStr}</span>
        <span className="sm:text-right sd-time">
          <span className="sm:hidden sd-date">{dateStr} &middot; </span>
          {timeStr}
        </span>
      </div>
      <style>{`
        .sd-clock {
          font-family: var(--font-jetbrains), ui-monospace, monospace;
          color: var(--sb-ink-faint, rgba(29, 20, 16, 0.34));
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .sd-time { color: var(--sb-ink-muted, rgba(29, 20, 16, 0.55)); }
      `}</style>
    </>
  );
}
