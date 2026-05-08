"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  ArrowRight,
  Briefcase,
  Clock,
  FileText,
  Handshake,
  Package,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getMandateClientLabel, getStatusBadgeClasses } from "@/lib/headhunting/status-labels";

export default function CollabDashboardPage() {
  const { user } = useUser();
  const clerkId = user?.id || "";

  const partner = useQuery(
    api.headhunting.collab.getPartnerByClerkId,
    clerkId ? { clerkId } : "skip"
  );

  const mandates = useQuery(
    api.headhunting.collab.getMandatesByPartner,
    partner?._id ? { partnerId: partner._id } : "skip"
  );

  const pendingShortlists = useQuery(
    api.headhunting.collab.getPendingShortlists,
    partner?._id ? { partnerId: partner._id } : "skip"
  );

  // Not signed in
  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center space-y-4">
        <Handshake className="size-10 mx-auto text-muted-foreground/50" />
        <h1 className="text-xl font-bold">Collaborator Dashboard</h1>
        <p className="text-sm text-muted-foreground">Sign in to access your collaborator dashboard.</p>
        <Link href="/sign-in"><Button>Sign In</Button></Link>
      </div>
    );
  }

  // Loading
  if (partner === undefined) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // No partner found
  if (partner === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center space-y-4">
        <Handshake className="size-12 mx-auto text-muted-foreground/50" />
        <h1 className="text-xl font-bold">No Partner Profile Found</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Your account is not linked to a collaborator partner. If you believe this is an error, contact the LLP team.
        </p>
        <Link href="/headhunting/collab">
          <Button variant="outline" className="mt-2">Learn About Collaboration</Button>
        </Link>
      </div>
    );
  }

  const activeMandates = (mandates ?? []).filter(
    (m) => !["filled", "closed", "cancelled_by_client", "role_filled_internally"].includes(m.status)
  );
  const totalCandidates = (mandates ?? []).reduce((sum, m) => sum + m.totalCandidates, 0);
  const pendingCount = pendingShortlists?.length ?? 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Handshake className="size-5 text-primary" /> Collaborator Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {partner.companyName} — {partner.contactName}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{activeMandates.length}</p>
          <p className="text-xs text-muted-foreground">Active Mandates</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{totalCandidates}</p>
          <p className="text-xs text-muted-foreground">Total Candidates</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-center relative">
          <p className="text-2xl font-bold">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">Pending Shortlists</p>
          {pendingCount > 0 && (
            <span className="absolute top-2 right-2 size-2.5 rounded-full bg-primary animate-pulse" />
          )}
        </div>
      </div>

      {/* Pending Shortlists Alert */}
      {pendingCount > 0 && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="size-5 text-primary shrink-0" />
            <div>
              <h3 className="text-sm font-semibold">
                {pendingCount} shortlist{pendingCount !== 1 ? "s" : ""} pending your review
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Review and release candidates to your client
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {pendingShortlists!.slice(0, 2).map((pack) => (
              <Link
                key={pack._id}
                href={`/headhunting/collab/dashboard/shortlists/${pack._id}`}
              >
                <Button size="sm" variant="outline" className="text-xs gap-1">
                  v{pack.version} <ArrowRight className="size-3" />
                </Button>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Mandate List */}
      {activeMandates.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Briefcase className="size-4 text-primary" /> Active Mandates
          </h2>
          <div className="space-y-2">
            {activeMandates.map((m) => (
              <div
                key={m._id}
                className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
              >
                <FileText className="size-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{m.title}</span>
                    <span className={getStatusBadgeClasses(m.status)}>
                      {getMandateClientLabel(m.status)}
                    </span>
                    {m.urgency !== "standard" && (
                      <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-300">
                        {m.urgency}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <Users className="size-3" /> {m.totalCandidates} candidates
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" /> {new Date(m.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <ArrowRight className="size-4 text-muted-foreground shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {activeMandates.length === 0 && mandates !== undefined && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center space-y-3">
          <Briefcase className="size-8 mx-auto text-muted-foreground/50" />
          <h3 className="text-sm font-semibold">No Active Mandates</h3>
          <p className="text-xs text-muted-foreground">
            When LLP assigns mandates to your partnership, they will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
