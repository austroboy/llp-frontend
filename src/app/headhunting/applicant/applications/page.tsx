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
import { ArrowRight, Briefcase, Send } from "lucide-react";

export default function ApplicationsListPage() {
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
        <h1 className="text-xl font-bold">My Applications</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to view your applications.
        </p>
        <Link href="/sign-in">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Briefcase className="size-5 text-primary" /> My Applications
        </h1>
      </div>

      {/* Nav tabs */}
      <div className="flex gap-2">
        <Link href="/headhunting/applicant">
          <Badge
            variant="outline"
            className="px-3 py-1 cursor-pointer hover:bg-muted"
          >
            Dashboard
          </Badge>
        </Link>
        <Badge variant="default" className="px-3 py-1">
          All Applications
        </Badge>
      </div>

      {applications === undefined ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Loading...
        </div>
      ) : applications.length === 0 ? (
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
        <div className="space-y-3">
          {applications.map((app) => (
            <Link
              key={app._id}
              href={`/headhunting/applicant/applications/${app._id}`}
              className="block rounded-lg border border-border bg-card p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold">{app.roleTitle}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                    <span>
                      Applied{" "}
                      {new Date(app.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span>
                      Updated{" "}
                      {new Date(app.updatedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    {app.entryMethod && (
                      <Badge variant="outline" className="text-[10px]">
                        {app.entryMethod === "direct_apply"
                          ? "Direct"
                          : app.entryMethod === "scout_code_apply"
                            ? "Referral"
                            : "Scout Assisted"}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={getStatusBadgeClasses(app.status)}>
                    {getSubmissionApplicantLabel(app.status)}
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
