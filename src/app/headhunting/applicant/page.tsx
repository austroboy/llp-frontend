"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  getSubmissionApplicantLabel,
  getStatusBadgeClasses,
} from "@/lib/headhunting/status-labels";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Briefcase,
  Send,
} from "lucide-react";

const TERMINAL_STATUSES = [
  "joined",
  "rejected",
  "withdrawn",
  "verification_expired",
];
const SHORTLIST_PLUS = [
  "shortlist_shared",
  "interview",
  "offer_stage",
  "offer_extended",
  "offer_accepted",
  "joined",
];
const NOT_PROGRESSED = ["rejected", "withdrawn", "verification_expired"];

export default function ApplicantDashboardPage() {
  const { user } = useUser();
  const clerkId = user?.id || "";

  const applications = useQuery(
    api.headhunting.applicant.getMyApplications,
    clerkId ? { clerkId } : "skip"
  );

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center space-y-4">
        <Briefcase className="size-10 mx-auto text-muted-foreground/50" />
        <h1 className="text-xl font-bold">Applicant Portal</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to view your applications.
        </p>
        <Link href="/sign-in">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  const total = applications?.length ?? 0;
  const active =
    applications?.filter((a) => !TERMINAL_STATUSES.includes(a.status)).length ??
    0;
  const shortlisted =
    applications?.filter((a) => SHORTLIST_PLUS.includes(a.status)).length ?? 0;
  const notProgressed =
    applications?.filter((a) => NOT_PROGRESSED.includes(a.status)).length ?? 0;
  const recent = applications?.slice(0, 5) ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Briefcase className="size-5 text-primary" /> Applicant Portal
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back, {user.fullName || "Applicant"}
        </p>
      </div>

      {/* Nav tabs */}
      <div className="flex gap-2">
        <Badge variant="default" className="px-3 py-1">
          Dashboard
        </Badge>
        <Link href="/headhunting/applicant/applications">
          <Badge
            variant="outline"
            className="px-3 py-1 cursor-pointer hover:bg-muted"
          >
            All Applications
          </Badge>
        </Link>
      </div>

      {applications === undefined ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Loading...
        </div>
      ) : total === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center space-y-3">
          <Send className="size-8 mx-auto text-muted-foreground/50" />
          <h3 className="text-sm font-semibold">No Applications Yet</h3>
          <p className="text-xs text-muted-foreground">
            Browse open positions and submit your application to get started.
          </p>
          <Link href="/headhunting/apply">
            <Button size="sm" className="mt-2">
              Apply Now
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <FileText className="size-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <Clock className="size-5 mx-auto text-blue-500 mb-1" />
              <p className="text-2xl font-bold">{active}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <CheckCircle2 className="size-5 mx-auto text-green-500 mb-1" />
              <p className="text-2xl font-bold">{shortlisted}</p>
              <p className="text-xs text-muted-foreground">Shortlisted+</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <XCircle className="size-5 mx-auto text-red-500 mb-1" />
              <p className="text-2xl font-bold">{notProgressed}</p>
              <p className="text-xs text-muted-foreground">Not Progressed</p>
            </div>
          </div>

          {/* Recent applications */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Recent Applications</h2>
              {total > 5 && (
                <Link
                  href="/headhunting/applicant/applications"
                  className="text-xs text-primary hover:underline"
                >
                  View all ({total})
                </Link>
              )}
            </div>
            {recent.map((app) => (
              <Link
                key={app._id}
                href={`/headhunting/applicant/applications/${app._id}`}
                className="block rounded-lg border border-border bg-card p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold truncate">
                      {app.roleTitle}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Applied{" "}
                      {new Date(app.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {app.entryMethod && (
                        <span className="ml-2 opacity-60">
                          via{" "}
                          {app.entryMethod === "direct_apply"
                            ? "Direct"
                            : app.entryMethod === "scout_code_apply"
                              ? "Referral"
                              : "Scout"}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className={getStatusBadgeClasses(app.status)}>
                    {getSubmissionApplicantLabel(app.status)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
