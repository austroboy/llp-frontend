"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspace-store";
import { CanvasPreview } from "./canvas-preview";

interface CanvasModalProps {
  language?: "en" | "bn";
}

/**
 * Canvas preview rendered as a modal. Opens automatically when the user
 * activates a file (e.g. by clicking a row in the files sidebar) and
 * closes when the active file is cleared.
 *
 * Open/close animation anchors to the element the user clicked. When a
 * file row is clicked, the sidebar captures the row's viewport rect and
 * stores it as `activeFileOriginRect`. We translate that into a
 * `transform-origin` on the modal so the CSS scale keyframes look like
 * the modal is flying out of (and, on close, retracting back into) the
 * clicked row.
 *
 * The maximize/minimize button in CanvasPreview flips `canvasMaximized`
 * on the workspace store; this component reacts by swapping between the
 * default centered box (96vw × 92vh, rounded) and an edge-to-edge
 * fullscreen surface. Transform-origin is disabled while maximized —
 * scaling a full-viewport surface from a tiny point looks wrong.
 */
export function CanvasModal({ language = "en" }: CanvasModalProps) {
  const activeFileId = useWorkspaceStore((s) => s.activeFileId);
  const clearActive = useWorkspaceStore((s) => s.clearActiveFile);
  const maximized = useWorkspaceStore((s) => s.canvasMaximized);
  const originRect = useWorkspaceStore((s) => s.activeFileOriginRect);

  const open = activeFileId !== null;

  // Track viewport size so the origin re-computes if the user resizes
  // between open and close. No effect when the modal is closed.
  const [viewport, setViewport] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  const originStyle = useMemo<CSSProperties>(() => {
    if (!originRect || maximized || !viewport) return {};
    const { w: vw, h: vh } = viewport;
    // Must match the DialogContent sizing classes below — kept in sync by
    // hand; if you change the w/h clamps on the element, update these too.
    const contentW = Math.min(1080, vw * 0.96);
    const contentH = Math.min(860, vh * 0.92);
    const contentLeft = (vw - contentW) / 2;
    const contentTop = (vh - contentH) / 2;
    const ox = originRect.x + originRect.width / 2 - contentLeft;
    const oy = originRect.y + originRect.height / 2 - contentTop;
    return { transformOrigin: `${ox}px ${oy}px` };
  }, [originRect, maximized, viewport]);

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) clearActive();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/55 will-change-[opacity]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=open]:duration-200 data-[state=closed]:duration-160",
            "data-[state=open]:ease-[cubic-bezier(0.23,1,0.32,1)] data-[state=closed]:ease-[cubic-bezier(0.23,1,0.32,1)]",
            "motion-reduce:animate-none motion-reduce:transition-none",
          )}
        />
        <DialogPrimitive.Content
          style={originStyle}
          className={cn(
            "codex-ledger fixed z-50 flex flex-col overflow-hidden border border-border/60 bg-background shadow-2xl ring-1 ring-black/5",
            "will-change-[transform,opacity] [backface-visibility:hidden]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=open]:duration-[260ms] data-[state=closed]:duration-[200ms]",
            "data-[state=open]:ease-[cubic-bezier(0.23,1,0.32,1)] data-[state=closed]:ease-[cubic-bezier(0.23,1,0.32,1)]",
            "motion-reduce:animate-none motion-reduce:transition-none",
            maximized
              ? "inset-0 w-screen h-screen max-w-none max-h-none rounded-none"
              : "inset-0 m-auto w-[96vw] max-w-[1080px] h-[92vh] max-h-[860px] rounded-2xl",
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            {language === "bn" ? "ফাইল প্রিভিউ" : "File preview"}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            {language === "bn"
              ? "সিলেক্ট করা ফাইলের প্রিভিউ।"
              : "Preview of the selected file."}
          </DialogPrimitive.Description>

          <div className="flex-1 min-h-0">
            <CanvasPreview language={language} />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
