"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";

function folioHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36).toUpperCase().slice(0, 6).padStart(6, "0");
}

function folioDate(): string {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}.${mm}.${dd}`;
}

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[DashboardError]", error);
  }, [error]);

  const serial = useMemo(() => {
    const seed = error.digest || error.message || "runtime";
    return `RUN-${folioHash(seed)}`;
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div style={{ maxWidth: 720, marginInline: "auto" }}>
      <div className="dash-header">
        <div>
          <div className="dash-hello-kicker">
            Personal Desk · Runtime · LLP-{folioDate()} / {serial}
          </div>
          <h1 className="dash-hello-title">
            A clause <em>failed to execute.</em>
          </h1>
          <p className="dash-hello-sub">
            The procedure stopped mid-step. Your dashboard data is intact —
            this only affects the current view.
          </p>
        </div>
      </div>

      <div className="dash-from-llp">
        <span className="dash-from-llp-label">Trace</span>
        <p className="dash-from-llp-text">
          Retry the step, or step back to the dashboard home and take a
          different route.
        </p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <button
          type="button"
          onClick={reset}
          className="lf-cta lf-cta--primary"
          aria-label="Retry the failed clause"
        >
          Retry Clause
        </button>
        <Link href="/dashboard" className="lf-cta lf-cta--ghost">
          Dashboard Home
        </Link>
      </div>

      {isDev && (error.message || error.digest) && (
        <div className="dash-module" style={{ marginTop: 32 }}>
          <div className="dash-module-head">
            <h3 className="dash-module-title">Trace</h3>
            {error.digest && (
              <span className="dash-module-tip">digest {error.digest}</span>
            )}
          </div>
          {error.message && (
            <pre
              style={{
                fontFamily: "var(--lf-mono)",
                fontSize: 12,
                lineHeight: 1.55,
                color: "var(--ink-2)",
                margin: 0,
                whiteSpace: "pre-wrap",
              }}
            >
              {error.message}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
