"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  ArrowLeft,
  Building2,
  Globe,
  Mail,
  Phone,
  Plus,
  Users,
} from "lucide-react";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useLanguage } from "@/hooks/use-language";
import { toast } from "sonner";
import { fireNotification } from "@/lib/notify";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
const heroStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
};
const inViewOnce = { once: true, margin: "-72px 0px" } as const;

const statusToTone: Record<string, "live" | "busy" | "off"> = {
  prospect: "busy",
  active: "live",
  paused: "busy",
  terminated: "off",
};

export default function CollabsPage() {
  const { t } = useLanguage();
  const partners = useQuery(api.headhunting.collab.listPartners, {});
  const createPartner = useMutation(api.headhunting.collab.createPartner);
  const updatePartner = useMutation(api.headhunting.collab.updatePartner);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    revenueSharePct: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  if (!partners) {
    return (
      <div
        style={{
          padding: "var(--s-7) var(--s-4)",
          textAlign: "center",
          fontFamily: "var(--lf-mono)",
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ink-4)",
        }}
      >
        {t("admin.loading")}
      </div>
    );
  }

  const handleCreate = async () => {
    if (!form.companyName.trim() || !form.contactName.trim() || !form.contactEmail.trim()) {
      toast.error("Company name, contact name and email are required");
      return;
    }
    setSaving(true);
    try {
      await createPartner({
        companyName: form.companyName,
        contactName: form.contactName,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone || undefined,
        website: form.website || undefined,
        revenueSharePct: form.revenueSharePct ? Number(form.revenueSharePct) : undefined,
        notes: form.notes || undefined,
      });
      toast.success("Partner created");
      setForm({ companyName: "", contactName: "", contactEmail: "", contactPhone: "", website: "", revenueSharePct: "", notes: "" });
      setShowForm(false);
    } catch (e) {
      toast.error("Failed to create partner");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const partner = partners?.find((p) => p._id === id);
      await updatePartner({
        id: id as Id<"collabPartners">,
        status: status as "active",
      });
      fireNotification("mandate_status_changed", {
        mandateTitle: `Partner: ${partner?.companyName ?? "Unknown"}`,
        clientName: partner?.companyName ?? "Unknown",
        oldStatus: partner?.status ?? "unknown",
        newStatus: status,
        recipientEmail: partner?.contactEmail || "support@laborlawpartner.com",
        recipientName: partner?.contactName || partner?.companyName || "Partner",
        mandateId: "",
      });
      toast.success("Status updated");
    } catch {
      toast.error("Failed");
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      {/* -- Hero ------------------------------------------------ */}
      <motion.section
        variants={heroStagger}
        initial="hidden"
        animate="show"
        style={{ paddingBottom: "var(--s-6)" }}
      >
        <motion.div variants={fadeUp}>
          <Link
            href="/admin/headhunting"
            className="lf-meta"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--ink-4)",
              textDecoration: "none",
              marginBottom: "var(--s-3)",
            }}
          >
            <ArrowLeft className="size-3.5" /> Headhunting
          </Link>
        </motion.div>

        <motion.div variants={fadeUp} className="lf-kicker">
          <span className="lf-kicker-mark">§ 2.2</span>
          Admin · Headhunting · Collabs
        </motion.div>

        <motion.div
          variants={fadeUp}
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "var(--s-4)",
            flexWrap: "wrap",
            marginTop: "var(--s-3)",
          }}
        >
          <div style={{ flex: 1, minWidth: 280 }}>
            <h1
              style={{
                fontFamily: "var(--lf-display)",
                fontSize: "clamp(34px, 4.4vw, 48px)",
                fontWeight: 400,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                color: "var(--ink)",
                margin: "0 0 var(--s-3)",
                display: "flex",
                alignItems: "center",
                gap: "var(--s-2)",
              }}
            >
              <Users
                className="size-7"
                style={{ color: "var(--accent-blue)" }}
              />
              Collab{" "}
              <em
                style={{
                  fontStyle: "italic",
                  color: "var(--accent-blue)",
                }}
              >
                Partners.
              </em>
            </h1>
            <p
              className="lf-section-deck"
              style={{ maxWidth: 640, margin: 0 }}
            >
              External partners who source and co-deliver on mandates. Status,
              contact, and contribution logged per clause.
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="lf-cta lf-cta--primary"
          >
            <Plus className="size-3.5" /> Add Partner
          </button>
        </motion.div>
      </motion.section>

      {/* -- Body ------------------------------------------------ */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-4)",
        }}
      >
        {/* New Partner Form */}
        {showForm && (
          <motion.div
            variants={fadeUp}
            style={{
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
              borderRadius: "var(--r-lg)",
              padding: "var(--s-4)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--s-3)",
            }}
          >
            <h3
              style={{
                fontFamily: "var(--lf-display)",
                fontSize: 16,
                fontWeight: 500,
                color: "var(--ink)",
                margin: 0,
              }}
            >
              New Collab Partner
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Company Name *</Label>
                <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className="text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Contact Name *</Label>
                <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className="text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Contact Email *</Label>
                <Input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} className="text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} className="text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Website</Label>
                <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Revenue Share %</Label>
                <Input type="number" value={form.revenueSharePct} onChange={(e) => setForm({ ...form, revenueSharePct: e.target.value })} className="text-xs" placeholder="e.g. 30" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="text-xs" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={saving} className="text-xs">
                {saving ? "Creating..." : "Create Partner"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)} className="text-xs">Cancel</Button>
            </div>
          </motion.div>
        )}

        {/* Partners list */}
        {partners.length === 0 ? (
          <motion.div
            variants={fadeUp}
            style={{
              background: "var(--glass-bg)",
              border: "1px dashed var(--glass-border)",
              borderRadius: "var(--r-lg)",
              padding: "var(--s-7) var(--s-4)",
              textAlign: "center",
            }}
          >
            <Users
              className="size-8"
              style={{
                color: "var(--ink-5)",
                margin: "0 auto var(--s-2)",
              }}
            />
            <p
              style={{
                fontFamily: "var(--lf-display)",
                fontSize: 16,
                color: "var(--ink-2)",
                margin: 0,
              }}
            >
              No collab partners yet
            </p>
            <p
              className="lf-meta"
              style={{
                marginTop: 6,
                color: "var(--ink-4)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Add your first partner to start the collab network.
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={stagger}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--s-2)",
            }}
          >
            {partners.map((p) => (
              <motion.div
                key={p._id}
                variants={fadeUp}
                style={{
                  background: "var(--glass-bg)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: "var(--r-lg)",
                  padding: "var(--s-4)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "var(--s-3)",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <h3
                      style={{
                        fontFamily: "var(--lf-display)",
                        fontSize: 16,
                        fontWeight: 500,
                        color: "var(--ink)",
                        margin: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Building2
                        className="size-4"
                        style={{ color: "var(--ink-4)" }}
                      />
                      {p.companyName}
                    </h3>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--s-3)",
                        marginTop: 6,
                        flexWrap: "wrap",
                        fontSize: 12,
                        color: "var(--ink-4)",
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Mail className="size-3" /> {p.contactEmail}
                      </span>
                      {p.contactPhone && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Phone className="size-3" /> {p.contactPhone}
                        </span>
                      )}
                      {p.website && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Globe className="size-3" /> {p.website}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {p.revenueSharePct && (
                      <Badge variant="outline" className="text-[10px]">
                        {p.revenueSharePct}% share
                      </Badge>
                    )}
                    <span
                      className={`lf-status lf-status--${statusToTone[p.status] ?? "off"}`}
                    >
                      <span className="lf-status-dot" />
                      {p.status}
                    </span>
                    <Select value={p.status} onValueChange={(v) => handleStatusChange(p._id, v)}>
                      <SelectTrigger className="h-7 text-[10px] w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prospect" className="text-xs">Prospect</SelectItem>
                        <SelectItem value="active" className="text-xs">Active</SelectItem>
                        <SelectItem value="paused" className="text-xs">Paused</SelectItem>
                        <SelectItem value="terminated" className="text-xs">Terminated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {p.notes && (
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--ink-3)",
                      marginTop: "var(--s-2)",
                      paddingTop: "var(--s-2)",
                      borderTop: "1px solid var(--line-1)",
                      margin: "var(--s-2) 0 0",
                    }}
                  >
                    {p.notes}
                  </p>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.section>
    </MotionConfig>
  );
}
