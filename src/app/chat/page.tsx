"use client";

import { Suspense, useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { SignUpWall } from "@/components/chat/sign-up-wall";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatMain } from "@/components/chat/chat-main";
import { CanvasModal } from "@/components/chat/canvas-modal";
import { DocumentCanvasDialog } from "@/components/chat/canvas/DocumentCanvasDialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { MessagesSquareIcon, FolderOpenIcon } from "lucide-react";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { ReferencePanel } from "@/components/chat/reference-panel";
import { useChatStore } from "@/store/chat-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { FREE_TIER_MODELS, PAID_TIER_MODELS, DEFAULT_FREE_MODEL, DEFAULT_PAID_MODEL } from "@/lib/ai/models";
import { cn } from "@/lib/utils";
import { track } from "@/lib/posthog/events";
import "@/components/landing/landing.css";

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const activeReference = useChatStore((s) => s.activeReference);
  const clearActiveReference = useChatStore((s) => s.clearActiveReference);
  const setUserTier = useChatStore((s) => s.setUserTier);
  const fetchQuota = useChatStore((s) => s.fetchQuota);
  const { resolvedTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);
  useEffect(() => setThemeMounted(true), []);
  const themeAttr = themeMounted
    ? resolvedTheme === "dark"
      ? "dark"
      : "light"
    : "light";
  const [isDesktop, setIsDesktop] = useState(true);
  const mobileDocsOpen = useWorkspaceStore((s) => s.mobileDocsOpen);
  const setMobileDocsOpen = useWorkspaceStore((s) => s.setMobileDocsOpen);

  const { user, isLoaded } = useUser();
  const userTier = (user?.publicMetadata as any)?.tier || (user ? "free_subscribed" : "free_guest");
  const isPaidTier = userTier === "mini" || userTier === "max";

  // Anonymous visitor hit the chat surface — fire signup-wall once
  // before redirecting to sign-in. cta_clicked is false because the
  // redirect is involuntary (the user did not click "sign up");
  // sign-in clicks elsewhere are already covered by `signin_completed`.
  useEffect(() => {
    if (isLoaded && !user) {
      track("chat_signup_wall_shown", {
        source_page: "/chat",
        cta_clicked: false,
      });
    }
  }, [isLoaded, user]);

  // Block unauthenticated access — show the Tier 5 sign-up wall.
  // The track("chat_signup_wall_shown") row above already fired
  // (cta_clicked: false) so the wall + the analytics row are tied to
  // the same anonymous mount.
  if (isLoaded && !user) {
    return (
      <div
        className="lf-page chat-page flex h-screen flex-col overflow-hidden"
        data-theme={themeAttr}
        suppressHydrationWarning
      >
        <SiteTopNav />
        <div className="flex-1 overflow-auto">
          <SignUpWall />
        </div>
      </div>
    );
  }

  // Seed chat-store.userTier from Clerk so premium gates (Generate
  // Document, quota banners) work before the first /api/chat response.
  useEffect(() => {
    if (!isLoaded) return;
    setUserTier(userTier);
    void fetchQuota();
  }, [isLoaded, userTier, setUserTier, fetchQuota]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1020px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Keyboard shortcuts: / or Ctrl+K → focus search, Esc → close reading pane
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      // Esc → close reading pane
      if (e.key === "Escape" && activeReference) {
        clearActiveReference();
        return;
      }

      // / or Ctrl+K → focus search input (only when not already in an input)
      if ((e.key === "/" && !isInput) || (e.key === "k" && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        const input = document.querySelector<HTMLTextAreaElement>("textarea[placeholder]");
        input?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeReference, clearActiveReference]);

  return (
    <div
      className="lf-page chat-page flex h-screen flex-col overflow-hidden"
      data-theme={themeAttr}
      suppressHydrationWarning
    >
      <SiteTopNav />

      <div className="flex flex-1 overflow-hidden min-h-0">
        <div className="hidden min-[1020px]:block w-64 border-r border-border">
          <ChatSidebar />
        </div>

        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent
            side="left"
            className="w-64 p-0 border-none [&>button]:hidden"
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <ChatSidebar />
          </SheetContent>
        </Sheet>

        <div className="flex flex-1 overflow-hidden">
          {/* Chat area */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden relative">
              <div className="relative z-10 h-full">
                <Suspense>
                  <ChatMain
                    models={isPaidTier ? PAID_TIER_MODELS : FREE_TIER_MODELS}
                    defaultModel={isPaidTier ? DEFAULT_PAID_MODEL : DEFAULT_FREE_MODEL}
                  />
                </Suspense>
              </div>
            </div>
          </div>

          {/* Reference panel — large desktop only (1024px+), slide-in animation */}
          <div
            className={cn(
              "codex-ref-pane hidden min-[1020px]:block overflow-hidden h-full",
              activeReference ? "w-[420px]" : "w-0"
            )}
          >
            <div className="w-[420px] h-full overflow-hidden">
              {activeReference && <ReferencePanel />}
            </div>
          </div>
        </div>

        {/* Reference panel — mobile + tablet bottom sheet (below 1024px) */}
        {!isDesktop && (
          <Sheet
            open={!!activeReference}
            onOpenChange={(open) => { if (!open) clearActiveReference(); }}
          >
            <SheetContent side="bottom" className="h-[70vh] p-0 rounded-t-2xl [&>button]:hidden">
              <SheetTitle className="sr-only">Reference Document</SheetTitle>
              <ReferencePanel mobile />
            </SheetContent>
          </Sheet>
        )}
      </div>

      {/* Canvas preview — modal, triggered by active file in workspace store */}
      <CanvasModal />

      {/* DB-07c document-builder canvas — modal over /chat, opens on
          draft_ready from filegen custom path. */}
      <DocumentCanvasDialog />

      {/* MOBILE BOTTOM NAV — Chats + Docs tabs. Canvas disabled on mobile.
          In-flow (not fixed) — sits as the last row of the page flex-col
          so the chat area shrinks naturally and the input footer cannot
          be covered. Own pb-[safe] absorbs the iOS home indicator. */}
      <nav className="chat-mobile-nav min-[1020px]:hidden flex h-14 shrink-0 items-stretch z-40 pb-[env(safe-area-inset-bottom)]" style={{ height: "calc(3.5rem + env(safe-area-inset-bottom))" }}>
        <button
          type="button"
          onClick={() => { setSidebarOpen(true); setMobileDocsOpen(false); }}
          className={cn(
            "chat-nav-tab min-[1020px]:hidden flex flex-1 flex-col items-center justify-center gap-0.5",
            sidebarOpen && "chat-nav-tab--active"
          )}
          aria-label="Conversations"
        >
          <div className="chat-nav-indicator" aria-hidden="true" />
          <MessagesSquareIcon className="size-[18px]" />
          <span className="chat-nav-label">Chats</span>
        </button>

        <button
          type="button"
          onClick={() => { setMobileDocsOpen(!mobileDocsOpen); setSidebarOpen(false); }}
          className={cn(
            "chat-nav-tab flex flex-1 flex-col items-center justify-center gap-0.5",
            mobileDocsOpen && "chat-nav-tab--active"
          )}
          aria-label="Documents"
        >
          <div className="chat-nav-indicator" aria-hidden="true" />
          <FolderOpenIcon className="size-[18px]" />
          <span className="chat-nav-label">Files</span>
        </button>
      </nav>

      <style>{`
        /* Override .lf-page min-height: 100vh so /chat fills its flex
           parent without overflowing. Same trick used by dashboards. */
        .chat-page.lf-page {
          min-height: 0;
          background:
            radial-gradient(ellipse at 80% -10%, var(--hero-glow-1), transparent 55%),
            radial-gradient(ellipse at -10% 110%, var(--hero-glow-2), transparent 50%),
            var(--paper);
        }

        /* Nav uses margin-bottom:-64px on landing so hero scrolls under
           the floating pill. /chat has overflow-hidden flex column —
           sticky/overlap is irrelevant here. Reset it. The dark-mode
           warm coffee bg now lives globally in site-top-nav.css so it
           applies to every lf-page (chat + dashboard + landing); light
           mode keeps the glass-bg-white cream from the same file. */
        .chat-page .lf-topnav {
          position: relative;
          top: 0;
          margin-bottom: 0;
        }

        /* Width-only transition on reference pane. */
        .codex-ref-pane {
          transition: width 260ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          .codex-ref-pane { transition: none; }
        }

        /* Inset chat card — paints the .codex-chat-frame wrapper that
           WorkspaceLayout already provides around the chat column.
           Light theme: lf paper-inner gradient. Dark theme: warm coffee
           matching top-nav + left/right sidebars. */
        .lf-page .codex-chat-frame {
          border-radius: var(--r-lg);
          border: 1px solid var(--line-2);
          background: linear-gradient(180deg, var(--paper-inner) 0%, var(--paper-warm) 100%);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.55),
            0 8px 28px -16px rgba(20, 20, 19, 0.18);
        }
        .lf-page[data-theme="dark"] .codex-chat-frame {
          background: linear-gradient(180deg, #2a241b 0%, #1e1a14 100%);
          border-color: rgba(237, 228, 210, 0.10);
          box-shadow:
            inset 0 1px 0 rgba(237, 228, 210, 0.05),
            0 18px 40px -22px rgba(0, 0, 0, 0.55);
        }

        /* Mobile bottom nav — lf glass */
        .chat-mobile-nav {
          background: var(--glass-bg-strong);
          border-top: 1px solid var(--line-2);
          box-shadow: 0 -8px 28px -16px rgba(20, 20, 19, 0.18);
          backdrop-filter: blur(14px) saturate(140%);
          -webkit-backdrop-filter: blur(14px) saturate(140%);
        }

        .chat-nav-tab {
          position: relative;
          color: var(--ink-3);
          cursor: pointer;
          transition: color 160ms ease, transform 140ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .chat-nav-tab:hover { color: var(--ink-2); }
        .chat-nav-tab:active { transform: scale(0.97); }
        @media (prefers-reduced-motion: reduce) {
          .chat-nav-tab { transition: color 160ms ease; }
          .chat-nav-tab:active { transform: none; }
        }

        .chat-nav-tab--active { color: var(--accent-blue); }

        .chat-nav-indicator {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%) scaleX(0);
          width: 28px;
          height: 2px;
          border-radius: 0 0 3px 3px;
          background: var(--accent-blue);
          transition: transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .chat-nav-tab--active .chat-nav-indicator { transform: translateX(-50%) scaleX(1); }

        .chat-nav-label {
          font-family: var(--lf-mono);
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          line-height: 1;
        }
      `}</style>
    </div>
  );
}
