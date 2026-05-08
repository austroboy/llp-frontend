"use client";

// DB-07c canvas surface — this route now redirects to /chat and opens
// the canvas as a modal overlay via workspace-store.openCanvas().
// Kept as a deep-link target so shared links / mid-run reloads still
// land on the canvas. The actual UI is rendered by
// <DocumentCanvasDialog/> mounted inside /chat/page.tsx.

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser, RedirectToSignIn } from "@clerk/nextjs";
import { Loader2Icon } from "lucide-react";
import { useWorkspaceStore } from "@/store/workspace-store";

export const dynamic = "force-dynamic";

export default function CanvasRedirectPage() {
  const { user, isLoaded } = useUser();
  if (isLoaded && !user) return <RedirectToSignIn />;
  return (
    <Suspense fallback={<OpeningSkeleton />}>
      <RedirectInner />
    </Suspense>
  );
}

function RedirectInner() {
  const router = useRouter();
  const params = useSearchParams();
  const jobId = params.get("jobId");
  const openCanvas = useWorkspaceStore((s) => s.openCanvas);

  useEffect(() => {
    if (jobId) openCanvas(jobId);
    router.replace("/chat");
  }, [jobId, openCanvas, router]);

  return <OpeningSkeleton />;
}

function OpeningSkeleton() {
  return (
    <div
      className="flex h-screen flex-col items-center justify-center gap-3 bg-background"
      aria-busy="true"
    >
      <Loader2Icon className="size-6 animate-spin text-amber-500" />
      <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        Opening canvas…
      </div>
    </div>
  );
}
