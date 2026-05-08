"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardBackNav } from "@/components/shared/dashboard-back-nav";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/hooks/use-language";
import { toast } from "sonner";

const statusToneMap: Record<string, "active" | "idle" | "not-started"> = {
  received: "idle",
  clarification: "idle",
  architecture: "idle",
  internal_review: "idle",
  client_review: "idle",
  approved: "active",
  released: "active",
  paused: "not-started",
  filled: "active",
  closed: "not-started",
};

export default function DashboardMandatesPage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const userId = user?.id;
  const [showNew, setShowNew] = useState(false);

  const myClient = useQuery(
    api.headhunting.clients.getByClerkId,
    userId ? { clerkId: userId } : "skip"
  );
  const mandates = useQuery(
    api.headhunting.mandates.getByClient,
    myClient?._id ? { clientId: myClient._id } : "skip"
  );

  return (
    <>
      <DashboardBackNav />

      <div className="dash-header">
        <div>
          <div className="dash-hello-kicker">
            Hiring · Mandates
          </div>
          <h1 className="dash-hello-title">
            {t("member.nav.mandates")}<em>.</em>
          </h1>
          <p className="dash-hello-sub">
            Submit hiring briefs and track your mandates through every stage.
          </p>
        </div>
        {myClient && (
          <div className="dash-header-right">
            <button
              type="button"
              className="lf-cta lf-cta--primary"
              onClick={() => setShowNew(true)}
            >
              <Plus className="size-3.5" />
              Submit New Brief
            </button>
          </div>
        )}
      </div>

      {myClient === undefined ? (
        <div className="dash-empty">
          <div className="dash-empty-title">{t("admin.loading")}</div>
        </div>
      ) : myClient === null ? (
        <div className="dash-empty">
          <div className="dash-empty-title">No client profile linked.</div>
          <p className="dash-empty-body">
            Your account is not linked to a client profile yet. Please contact LLP admin.
          </p>
        </div>
      ) : !mandates ? (
        <div className="dash-empty">
          <div className="dash-empty-title">{t("admin.loading")}</div>
        </div>
      ) : mandates.length === 0 ? (
        <div className="dash-empty">
          <div className="dash-empty-title">No mandates yet.</div>
          <p className="dash-empty-body">
            Submit your first hiring brief to begin sourcing.
          </p>
          <button
            type="button"
            className="lf-cta lf-cta--primary"
            onClick={() => setShowNew(true)}
            style={{ marginTop: "var(--s-3)" }}
          >
            <Plus className="size-3.5" />
            Submit New Brief
          </button>
        </div>
      ) : (
        <section className="dash-section">
          <div className="dash-section-header">
            <h2 className="dash-section-title">Active mandates</h2>
            <span className="dash-section-meta">{mandates.length} total</span>
          </div>
          <div className="dash-modules">
            {mandates.map((m) => {
              const tone = statusToneMap[m.status] ?? "idle";
              return (
                <Link
                  key={m._id}
                  href={`/dashboard/mandates/${m._id}`}
                  className="lf-card lf-card--feature lf-card--hover dash-module"
                  style={{ display: "block", textDecoration: "none" }}
                >
                  <div className="dash-module-head">
                    <h3 className="dash-module-title">{m.rawTitle}</h3>
                    <span className={`dash-module-status ${tone}`}>
                      {m.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="lf-meta">
                    {myClient.companyName} · {m.mandateType.replace(/_/g, " ")}
                  </p>
                  <div className="dash-module-foot">
                    <span className="dash-module-cta">Open mandate</span>
                    <span className="dash-module-tip">
                      {new Date(m.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {myClient && (
        <NewMandateDialog
          open={showNew}
          onClose={() => setShowNew(false)}
          clientId={myClient._id as Id<"htClients">}
        />
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// New Mandate Dialog (Employer self-service)
// ═══════════════════════════════════════════════════════════════

function NewMandateDialog({
  open,
  onClose,
  clientId,
}: {
  open: boolean;
  onClose: () => void;
  clientId: Id<"htClients">;
}) {
  const { t } = useLanguage();
  const createMandate = useMutation(api.headhunting.mandates.create);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    rawTitle: "",
    rawDescription: "",
    urgency: "standard" as "standard" | "urgent" | "critical",
    mandateType: "exclusive" as "exclusive" | "non_exclusive" | "retainer",
  });

  const handleSave = async () => {
    if (!form.rawTitle.trim()) return;
    setSaving(true);
    try {
      await createMandate({
        clientId,
        source: "web_form",
        rawTitle: form.rawTitle,
        rawDescription: form.rawDescription || undefined,
        urgency: form.urgency,
        mandateType: form.mandateType,
      });
      toast.success("Brief submitted — LLP will review and start sourcing.");
      setForm({ rawTitle: "", rawDescription: "", urgency: "standard", mandateType: "exclusive" });
      onClose();
    } catch {
      toast.error("Failed to submit brief");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit Hiring Brief</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Role Title *</Label>
            <Input
              value={form.rawTitle}
              onChange={(e) => setForm((f) => ({ ...f, rawTitle: e.target.value }))}
              placeholder="e.g. Head of HR — Dhaka"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={form.rawDescription}
              onChange={(e) => setForm((f) => ({ ...f, rawDescription: e.target.value }))}
              rows={5}
              placeholder="Describe the role, requirements, ideal candidate profile, and any context that would help us source better..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("admin.headhunting.urgency")}</Label>
              <Select value={form.urgency} onValueChange={(v) => setForm((f) => ({ ...f, urgency: v as typeof f.urgency }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">{t("admin.headhunting.urgency.standard")}</SelectItem>
                  <SelectItem value="urgent">{t("admin.headhunting.urgency.urgent")}</SelectItem>
                  <SelectItem value="critical">{t("admin.headhunting.urgency.critical")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("admin.headhunting.mandateType")}</Label>
              <Select value={form.mandateType} onValueChange={(v) => setForm((f) => ({ ...f, mandateType: v as typeof f.mandateType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="exclusive">{t("admin.headhunting.mandateType.exclusive")}</SelectItem>
                  <SelectItem value="non_exclusive">{t("admin.headhunting.mandateType.non_exclusive")}</SelectItem>
                  <SelectItem value="retainer">{t("admin.headhunting.mandateType.retainer")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Your brief will be reviewed by LLP. We&apos;ll contact you if we need clarification before sourcing begins.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="lf-cta lf-cta--ghost" onClick={onClose}>Cancel</button>
            <button
              type="button"
              className="lf-cta lf-cta--primary"
              onClick={handleSave}
              disabled={saving || !form.rawTitle.trim()}
            >
              {saving ? "Submitting..." : "Submit Brief"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
