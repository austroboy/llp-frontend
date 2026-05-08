"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Briefcase,
  FileText,
  Users,
  MessageCircle,
  Settings,
  ArrowRight,
  Clock,
  CheckCircle2,
  Building2,
  TrendingUp,
  Layers,
  Package,
} from "lucide-react";

/**
 * Client Workspace Dashboard (v4.0)
 *
 * Shows both new hiring assignments AND legacy mandates.
 */
export default function ClientDashboardPage() {
  const { user } = useUser();

  const myClient = useQuery(
    api.headhunting.clients.getByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const mandates = useQuery(
    api.headhunting.mandates.getByClient,
    myClient?._id ? { clientId: myClient._id } : "skip"
  );

  const assignments = useQuery(
    api.headhunting.hiringAssignments.list,
    myClient?._id ? { clientId: myClient._id } : "skip"
  );

  // Loading
  if (myClient === undefined) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // No client profile — show welcome with CTA
  if (myClient === null) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center py-16">
        <Building2 className="size-12 mx-auto mb-4 text-muted-foreground" />
        <h1 className="text-xl font-bold mb-2">Welcome to LLP Headhunting</h1>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">
          Submit your first hiring request and we&apos;ll find the right candidates for you.
        </p>
        <Link
          href="/headhunting/client/hire/new"
          className="inline-flex items-center gap-2 text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          Get Started <ArrowRight className="size-3.5" />
        </Link>
      </div>
    );
  }

  const activeMandates = (mandates || []).filter((m) =>
    !["filled", "closed", "paused"].includes(m.status)
  );
  const historyMandates = (mandates || []).filter((m) =>
    ["filled", "closed"].includes(m.status)
  );

  const activeAssignments = (assignments || []).filter((a) =>
    !["filled", "closed"].includes(a.status)
  );
  const historyAssignments = (assignments || []).filter((a) =>
    ["filled", "closed"].includes(a.status)
  );

  const hasAny = (mandates?.length ?? 0) + (assignments?.length ?? 0) > 0;
  const isFirstVisit = !hasAny;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">
            {isFirstVisit ? "Welcome to LLP Headhunting" : (myClient as Record<string, unknown>).companyName as string}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isFirstVisit
              ? "Your dedicated workspace for hiring support"
              : `${activeAssignments.length + activeMandates.length} active request${(activeAssignments.length + activeMandates.length) !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link href="/headhunting/client/account">
          <Settings className="size-5 text-muted-foreground hover:text-foreground transition-colors" />
        </Link>
      </div>

      {/* Onboarding — first visit */}
      {isFirstVisit && (
        <div className="rounded-lg border bg-primary/5 border-primary/20 p-6">
          <h2 className="text-base font-semibold mb-4">What you can do here</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: Briefcase, title: "Submit Hiring Requests", desc: "Share your requirements and we'll find the right candidates" },
              { icon: TrendingUp, title: "Track Search Progress", desc: "Real-time updates on mandate status and pipeline" },
              { icon: Users, title: "Review Shortlisted CVs", desc: "Structured candidate profiles with AI-powered summaries" },
              { icon: MessageCircle, title: "Raise Clarifications", desc: "Threaded Q&A per mandate or candidate" },
              { icon: FileText, title: "Review & Confirm Blueprints", desc: "Approve role blueprints before search launches" },
              { icon: Clock, title: "View History", desc: "Access past mandates, shortlists, and placement records" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                  <item.icon className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Link
              href="/headhunting/client/hire/new"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              Submit your first hiring request
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Active Hiring Assignments */}
      {activeAssignments.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Layers className="size-4 text-primary" /> Hiring Assignments
            </h2>
            <Link href="/headhunting/client/hire/new" className="text-xs text-primary hover:underline flex items-center gap-1">
              New request <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {activeAssignments.map((a) => (
              <div
                key={a._id}
                className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
              >
                <Package className="size-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{a.assignmentName}</span>
                    <AssignmentStatusBadge status={a.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {a.hiringSupportType} · {a.totalOpenings} opening{a.totalOpenings !== 1 ? "s" : ""}
                    {" · "}{new Date(a.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Legacy Mandates */}
      {activeMandates.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">Active Mandates</h2>
            <Link href="/dashboard/mandates" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {activeMandates.slice(0, 5).map((m) => (
              <Link
                key={m._id}
                href={`/dashboard/mandates/${m._id}`}
                className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{m.rawTitle}</span>
                    <MandateStatusBadge status={m.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(m.createdAt).toLocaleDateString()}
                    {(m as Record<string, unknown>).submissionCount ? ` · ${(m as Record<string, unknown>).submissionCount} candidates` : ""}
                  </p>
                </div>
                <ArrowRight className="size-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {(historyAssignments.length > 0 || historyMandates.length > 0) && (
        <div>
          <h2 className="text-base font-semibold mb-3">History</h2>
          <div className="space-y-2">
            {historyAssignments.map((a) => (
              <div
                key={a._id}
                className="flex items-center gap-3 rounded-lg border p-3 opacity-70"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{a.assignmentName}</span>
                    <AssignmentStatusBadge status={a.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            {historyMandates.map((m) => (
              <Link
                key={m._id}
                href={`/dashboard/mandates/${m._id}`}
                className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors opacity-70"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{m.rawTitle}</span>
                    <MandateStatusBadge status={m.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(m.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      {!isFirstVisit && (
        <div className="grid sm:grid-cols-3 gap-3">
          <QuickLink href="/headhunting/client/hire/new" icon={Briefcase} label="New Hiring Request" />
          <QuickLink href="/headhunting/client/account" icon={Settings} label="Company Settings" />
          <QuickLink href="/dashboard/mandates" icon={FileText} label="View All Mandates" />
        </div>
      )}
    </div>
  );
}

function AssignmentStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    in_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    paused: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    filled: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
    closed: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };
  return (
    <Badge variant="outline" className={`text-[10px] ${colors[status] || ""}`}>
      {status === "filled" && <CheckCircle2 className="size-2.5 mr-0.5" />}
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

function MandateStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    received: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    clarification: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    architecture: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    internal_review: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    client_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    released: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    paused: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    filled: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    closed: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };
  return (
    <Badge variant="outline" className={`text-[10px] ${colors[status] || ""}`}>
      {status === "filled" && <CheckCircle2 className="size-2.5 mr-0.5" />}
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
    >
      <Icon className="size-4 text-muted-foreground" />
      <span className="text-sm">{label}</span>
    </Link>
  );
}
