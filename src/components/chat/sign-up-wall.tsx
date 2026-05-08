"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { ArrowRightIcon } from "lucide-react";
import { track } from "@/lib/posthog/events";

/**
 * Tier 5 — sign-up wall. Replaces the bare `<RedirectToSignIn />` with a
 * Codex-styled gate so anonymous visitors see a deliberate hand-off
 * instead of an instant Clerk redirect. Chat is gated to logged-in
 * users (see implementation-plan.md top), so this is a wall, not a cap.
 *
 * The `chat_signup_wall_shown` event is fired by the parent (`/chat`
 * page) on the same useEffect that previously triggered the bare
 * redirect — keep the firing logic in one place to avoid a doubled
 * row.
 */
export function SignUpWall() {
  const handleCtaClick = (kind: "sign_up" | "sign_in") => {
    // cta_clicked: true distinguishes the deliberate click from the
    // involuntary mount-time row already fired by /chat/page.tsx.
    void track("chat_signup_wall_shown", {
      source_page: kind === "sign_up" ? "/chat#cta-signup" : "/chat#cta-signin",
      cta_clicked: true,
    });
  };

  return (
    <div className="codex-page min-h-screen flex items-center justify-center px-4 py-12">
      <div className="codex-wall-card relative w-full max-w-md overflow-hidden rounded-[14px] p-6 sm:p-8">
        {/* Decorative rust glow — mirrors jump-back-in-card */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-12 -right-12 size-32 rounded-full codex-wall-glow blur-2xl"
        />

        <div className="relative">
          <div className="flex items-center gap-2 text-[9.5px] uppercase tracking-[0.3em] text-muted-foreground">
            <span>&sect;</span>
            <span className="codex-wall-section-label">Sign in required</span>
            <span className="h-px flex-1 codex-wall-rule" />
          </div>

          <h1 className="codex-wall-title mt-4 text-[26px] leading-[1.1] sm:text-[30px]">
            The labour-law assistant is for signed-in users.
          </h1>

          <p className="codex-wall-body mt-3 text-[13.5px] leading-relaxed">
            Sign up free for 20 searches per day, with full citations
            from the Bangladesh Labour Act, Rules, and amendments. Higher
            daily limits will arrive when paid tiers launch.
          </p>

          <div className="mt-6 flex flex-col gap-2.5">
            <SignUpButton mode="modal">
              <button
                type="button"
                onClick={() => handleCtaClick("sign_up")}
                className="codex-wall-primary group/btn inline-flex items-center justify-between gap-2 rounded-[10px] px-3.5 py-2 text-[12px] font-semibold uppercase tracking-[0.16em]"
              >
                <span>Sign up free</span>
                <ArrowRightIcon className="size-3.5 transition-transform group-hover/btn:translate-x-0.5" />
              </button>
            </SignUpButton>

            <SignInButton mode="modal">
              <button
                type="button"
                onClick={() => handleCtaClick("sign_in")}
                className="codex-wall-secondary inline-flex items-center justify-center gap-2 rounded-[10px] px-3.5 py-2 text-[12px] uppercase tracking-[0.16em]"
              >
                <span>I already have an account</span>
              </button>
            </SignInButton>
          </div>
        </div>

        <style>{`
          .codex-wall-card {
            background:
              linear-gradient(180deg,
                color-mix(in oklab, var(--sb-ink, #1d1410) 3%, transparent) 0%,
                color-mix(in oklab, var(--sb-rust, #b25c22) 5%, transparent) 100%);
            border: 1px solid var(--sb-rule, rgba(29, 20, 16, 0.13));
            box-shadow:
              inset 0 1px 0 color-mix(in oklab, white 12%, transparent),
              0 24px 60px -28px rgba(29, 20, 16, 0.25);
          }
          .dark .codex-wall-card {
            background:
              linear-gradient(180deg,
                color-mix(in oklab, var(--sb-ink, #ede6d8) 2%, transparent) 0%,
                color-mix(in oklab, var(--sb-rust, #d38044) 6%, transparent) 100%);
            box-shadow:
              inset 0 1px 0 color-mix(in oklab, white 4%, transparent),
              0 32px 80px -28px rgba(0, 0, 0, 0.6);
          }
          .codex-wall-glow {
            background: radial-gradient(
              closest-side,
              color-mix(in oklab, var(--sb-rust, #b25c22) 65%, transparent),
              transparent 70%
            );
          }
          .codex-wall-section-label {
            font-family: var(--font-jetbrains), ui-monospace, monospace;
            color: var(--sb-ink-muted, rgba(29, 20, 16, 0.62));
          }
          .codex-wall-rule {
            background: color-mix(in oklab, hsl(var(--foreground)) 18%, transparent);
          }
          .codex-wall-title {
            font-family: var(--font-fraunces), var(--font-lora), serif;
            font-weight: 500;
            letter-spacing: -0.01em;
            color: hsl(var(--foreground));
          }
          .codex-wall-body {
            color: var(--sb-ink-muted, rgba(29, 20, 16, 0.7));
          }
          .dark .codex-wall-body {
            color: rgba(237, 230, 216, 0.78);
          }
          /* Primary — same rust pill as jb-primary */
          .codex-wall-primary {
            font-family: var(--font-jetbrains), ui-monospace, monospace;
            color: #1d1410;
            background: linear-gradient(180deg,
              color-mix(in oklab, var(--sb-rust, #b25c22) 92%, white) 0%,
              color-mix(in oklab, var(--sb-rust, #b25c22) 100%, black 14%) 100%);
            border: 1px solid var(--sb-rust, #b25c22);
            box-shadow:
              inset 0 1px 0 color-mix(in oklab, white 40%, transparent),
              0 6px 18px -8px color-mix(in oklab, var(--sb-rust, #b25c22) 50%, transparent);
            cursor: pointer;
            transition: filter 160ms ease, box-shadow 180ms ease,
                        transform 140ms cubic-bezier(0.23, 1, 0.32, 1);
          }
          .dark .codex-wall-primary { color: #140c06; }
          .codex-wall-primary:hover {
            filter: brightness(1.05);
            box-shadow:
              inset 0 1px 0 color-mix(in oklab, white 50%, transparent),
              0 10px 22px -8px color-mix(in oklab, var(--sb-rust, #b25c22) 60%, transparent);
          }
          .codex-wall-primary:active { transform: scale(0.98); }
          /* Secondary — outline pill */
          .codex-wall-secondary {
            font-family: var(--font-jetbrains), ui-monospace, monospace;
            color: var(--sb-ink-muted, rgba(29, 20, 16, 0.7));
            background: transparent;
            border: 1px solid color-mix(in oklab, hsl(var(--foreground)) 16%, transparent);
            cursor: pointer;
            transition: color 180ms ease, border-color 180ms ease,
                        background 180ms ease;
          }
          .codex-wall-secondary:hover {
            color: hsl(var(--foreground));
            border-color: color-mix(in oklab, var(--sb-rust, #b25c22) 45%, transparent);
            background: color-mix(in oklab, var(--sb-rust, #b25c22) 6%, transparent);
          }
        `}</style>
      </div>
    </div>
  );
}
