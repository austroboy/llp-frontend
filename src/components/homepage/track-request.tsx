"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardCheck, Hash, ArrowRight } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { usePreLaunchLock } from "@/lib/pre-launch";

export function TrackRequest() {
  const { t } = useLanguage();
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState("");
  const locked = usePreLaunchLock();

  function handleTrack() {
    if (locked) {
      toast.info("Request tracking opens May 1, 2026.");
      return;
    }
    const num = orderNumber.trim();
    if (num) {
      router.push(`/track/${encodeURIComponent(num)}`);
    }
  }

  return (
    <section id="track" className="relative scroll-mt-24">
      <div className="mx-auto max-w-6xl px-4 py-16 lg:px-6 lg:py-20">
        <div className="hp-marker mb-6 hp-reveal">
          <span className="hp-marker-rule" />
          <span className="hp-marker-section">§ 09</span>
          <span className="hp-marker-label">— Dossier Lookup</span>
          <span className="hp-marker-tail" />
        </div>

        <div className="hp-panel hp-reveal hp-reveal-1">
          <div className="hp-panel-head">
            <span className="hp-panel-num">N° 09</span>
            <span className="hp-panel-title">{t("home.track.badge")}</span>
          </div>

          <div className="grid lg:grid-cols-[1.1fr_1fr]">
            {/* Left — info */}
            <div className="px-7 py-7 lg:border-r" style={{ borderColor: "var(--hp-rule)" }}>
              <div className="flex size-10 items-center justify-center border mb-4" style={{
                borderColor: "var(--hp-rule-strong)",
                background: "var(--hp-green-soft)"
              }}>
                <ClipboardCheck className="size-5" style={{ color: "var(--hp-green)" }} />
              </div>
              <h2 className="hp-h3 mb-2">{t("home.track.title")}</h2>
              <p className="hp-body">{t("home.track.subtitle")}</p>
            </div>

            {/* Right — input form */}
            <div className="px-7 py-7 flex flex-col justify-center">
              <form
                onSubmit={(e) => { e.preventDefault(); handleTrack(); }}
                className={`space-y-3 ${locked ? "opacity-60" : ""}`}
              >
                <div>
                  <label className="hp-field-label">Request Number</label>
                  <div className="relative">
                    <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4" style={{ color: "var(--hp-ink-faint)" }} />
                    <input
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      placeholder={t("home.track.placeholder")}
                      className="hp-input pl-10"
                      disabled={locked}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="hp-btn hp-btn--primary w-full justify-center group"
                  aria-disabled={locked || undefined}
                >
                  <span>{t("home.track.button")}</span>
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </form>
              {locked && (
                <p className="mt-3 text-center hp-micro" style={{ fontSize: 9.5 }}>
                  Available May 1, 2026
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
