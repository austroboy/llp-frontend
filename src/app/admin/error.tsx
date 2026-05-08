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

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AdminError]", error);
  }, [error]);

  const digestId = useMemo(() => {
    const seed = error.digest || error.message || "unknown";
    return folioHash(seed);
  }, [error]);

  const incidentSerial = `INCIDENT № LLP-${folioDate()} / ADMIN-${digestId}`;
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div
      className="lf-page dash-page"
      data-theme="light"
      suppressHydrationWarning
    >
      <main
        className="dash-content"
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          className="lf-card lf-card--feature"
          style={{ maxWidth: 640, width: "100%" }}
        >
          <span
            className="lf-meta lf-meta--accent"
            style={{ textTransform: "uppercase" }}
          >
            {incidentSerial}
          </span>
          <h1
            className="lf-h2"
            style={{ margin: "var(--s-3) 0 var(--s-4)" }}
          >
            An incident has been <em>filed.</em>
          </h1>
          <p
            className="lf-body"
            style={{ color: "var(--ink-3)", marginBottom: "var(--s-5)" }}
          >
            The cabinet returned an error while serving this page. The incident
            is logged against your session and flagged for engineering review.
            Retry — transient faults often clear on a second pass — or close
            the folio and return to the admin cabinet.
          </p>
          {error.message && (
            <div
              style={{
                background: "var(--paper-inner)",
                border: "1px solid var(--line-2)",
                borderRadius: "var(--r-md)",
                padding: "var(--s-3) var(--s-4)",
                marginBottom: "var(--s-5)",
              }}
            >
              <p
                className="lf-meta"
                style={{
                  fontFamily: "var(--lf-mono)",
                  color: "var(--rust)",
                  margin: 0,
                  wordBreak: "break-word",
                }}
              >
                {error.message}
              </p>
            </div>
          )}
          <div style={{ display: "flex", gap: "var(--s-3)", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={reset}
              className="lf-cta lf-cta--primary"
            >
              Retry request
            </button>
            <Link href="/admin" className="lf-cta lf-cta--ghost">
              Return to admin cabinet
            </Link>
          </div>
          {isDev && error.digest && (
            <div
              style={{
                marginTop: "var(--s-4)",
                fontFamily: "var(--lf-mono)",
                fontSize: 10.5,
                color: "var(--ink-4)",
                letterSpacing: "0.04em",
              }}
            >
              <span style={{ marginRight: 6 }}>digest</span>
              <span style={{ color: "var(--ink)" }}>{error.digest}</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
