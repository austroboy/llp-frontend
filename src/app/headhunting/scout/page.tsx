"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  Crosshair,
  FileText,
  Network,
  Send,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { icon: typeof Clock; color: string; label: string; description: string }> = {
  submitted: {
    icon: Clock,
    color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800",
    label: "Application Submitted",
    description: "Your scout profile is pending LLP review. We'll notify you once it's reviewed.",
  },
  under_review: {
    icon: Target,
    color: "text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800",
    label: "Under Review",
    description: "Your application is being reviewed by the LLP team. This usually takes 1-2 business days.",
  },
  approved: {
    icon: CheckCircle2,
    color: "text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800",
    label: "Approved — You're a Scout!",
    description: "Your profile is active. You'll receive briefs matched to your specialization.",
  },
  rejected: {
    icon: XCircle,
    color: "text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800",
    label: "Application Not Approved",
    description: "Unfortunately your application wasn't approved at this time. You can reapply.",
  },
};

export default function ScoutDashboardPage() {
  const { user } = useUser();
  const clerkId = user?.id || "";

  const scoutProfile = useQuery(
    api.headhunting.scoutProfiles.getByUser,
    clerkId ? { clerkId } : "skip"
  );
  const stats = useQuery(
    api.headhunting.scouts.getScoutStats,
    clerkId ? { scoutId: clerkId } : "skip"
  );
  const pendingCount = useQuery(
    api.headhunting.scoutQueue.getPendingQueueCount,
    clerkId ? { scoutId: clerkId } : "skip"
  );

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center space-y-4">
        <Network className="size-10 mx-auto text-muted-foreground/50" />
        <h1 className="text-xl font-bold">Scout Dashboard</h1>
        <p className="text-sm text-muted-foreground">Sign in to access your scout dashboard.</p>
        <Link href="/sign-in"><Button>Sign In</Button></Link>
      </div>
    );
  }

  const status = scoutProfile?.status;
  const config = status ? statusConfig[status] : null;
  const { t } = useLanguage();
  const isApproved = status === "approved";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Crosshair className="size-5 text-primary" /> Scout Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {user.fullName || "Scout"} — {scoutProfile?.profileId || "No profile yet"}
        </p>
      </div>

      {/* Nav tabs */}
      <div className="flex gap-2">
        <Badge variant="default" className="px-3 py-1">{t("scout.nav.dashboard")}</Badge>
        <Link href="/headhunting/scout/briefs">
          <Badge variant="outline" className="px-3 py-1 cursor-pointer hover:bg-muted">{t("scout.nav.briefs")}</Badge>
        </Link>
        <Link href="/headhunting/scout/submissions">
          <Badge variant="outline" className="px-3 py-1 cursor-pointer hover:bg-muted">{t("scout.nav.submissions")}</Badge>
        </Link>
        <Link href="/headhunting/scout/queue">
          <Badge variant="outline" className="px-3 py-1 cursor-pointer hover:bg-muted flex items-center gap-1">
            Queue
            {typeof pendingCount === "number" && pendingCount > 0 && (
              <span className="inline-flex items-center justify-center size-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold">{pendingCount}</span>
            )}
          </Badge>
        </Link>
        <Link href="/headhunting/scout/earnings">
          <Badge variant="outline" className="px-3 py-1 cursor-pointer hover:bg-muted">Earnings</Badge>
        </Link>
      </div>

      {/* Application status banner */}
      {config && status !== "approved" && (
        <div className={cn("rounded-lg border p-4 flex items-start gap-3", config.color)}>
          <config.icon className="size-5 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold">{config.label}</h3>
            <p className="text-xs mt-1 opacity-80">{config.description}</p>
            {scoutProfile?.profileId && (
              <Badge variant="outline" className="mt-2 text-[10px]">
                Profile ID: {scoutProfile.profileId}
              </Badge>
            )}
            {status === "rejected" && scoutProfile?.reviewNotes && (
              <p className="text-xs mt-2 opacity-70">Notes: {scoutProfile.reviewNotes}</p>
            )}
          </div>
        </div>
      )}

      {/* No profile yet */}
      {!scoutProfile && scoutProfile !== undefined && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center space-y-3">
          <Send className="size-8 mx-auto text-muted-foreground/50" />
          <h3 className="text-sm font-semibold">No Scout Profile Yet</h3>
          <p className="text-xs text-muted-foreground">Join the LLP scout network to start receiving hiring mandates.</p>
          <Link href="/headhunting/scout/join">
            <Button size="sm" className="mt-2">Apply as a Scout</Button>
          </Link>
        </div>
      )}

      {/* Approved — show stats + nav */}
      {isApproved && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold">{stats?.totalBriefs ?? 0}</p>
              <p className="text-xs text-muted-foreground">Briefs</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold">{stats?.totalSubmissions ?? 0}</p>
              <p className="text-xs text-muted-foreground">Submissions</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold">{stats?.shortlisted ?? 0}</p>
              <p className="text-xs text-muted-foreground">Shortlisted</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold">{stats?.placed ?? 0}</p>
              <p className="text-xs text-muted-foreground">Placed</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Link href="/headhunting/scout/briefs" className="rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors">
              <FileText className="size-5 text-primary mb-2" />
              <h3 className="text-sm font-semibold">Active Briefs</h3>
              <p className="text-xs text-muted-foreground mt-1">View mandates matched to your specialization</p>
            </Link>
            <Link href="/headhunting/scout/queue" className="rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors relative">
              <ClipboardList className="size-5 text-primary mb-2" />
              <h3 className="text-sm font-semibold">Pending Queue</h3>
              <p className="text-xs text-muted-foreground mt-1">Candidates awaiting your review</p>
              {typeof pendingCount === "number" && pendingCount > 0 && (
                <span className="absolute top-3 right-3 inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5">
                  {pendingCount}
                </span>
              )}
            </Link>
            <Link href="/headhunting/scout/submissions" className="rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors">
              <Send className="size-5 text-primary mb-2" />
              <h3 className="text-sm font-semibold">My Submissions</h3>
              <p className="text-xs text-muted-foreground mt-1">Track candidates you've submitted</p>
            </Link>
            <Link href="/headhunting/scout/earnings" className="rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors">
              <TrendingUp className="size-5 text-primary mb-2" />
              <h3 className="text-sm font-semibold">Earnings</h3>
              <p className="text-xs text-muted-foreground mt-1">View payouts and pending rewards</p>
            </Link>
          </div>
        </>
      )}

      {/* Pending — show what to expect */}
      {status && status !== "approved" && status !== "rejected" && (
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold">What happens next?</h3>
          <div className="space-y-3 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <div className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
              <p>LLP reviews your profile — function expertise, industry reach, talent access, network strength</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
              <p>Once approved, you'll receive hiring briefs matched to your specialization</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">3</div>
              <p>Submit candidates for mandates → earn a share of the placement fee on successful hires</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
