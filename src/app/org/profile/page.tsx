"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  ArrowLeft,
  Building2,
  Check,
  CreditCard,
  Activity,
  UserCircle2,
  Pencil,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { motion, MotionConfig, type Variants } from "framer-motion";

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

const hairlineGrid = (cols: number): CSSProperties => ({
  display: "grid",
  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
  gap: "1px",
  background: "var(--glass-border)",
  border: "1px solid var(--glass-border)",
  borderRadius: "var(--r-lg)",
  overflow: "hidden",
});

const hairlineCell: CSSProperties = {
  background: "var(--glass-bg)",
  padding: "var(--s-4)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--s-2)",
};

const fieldGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "var(--s-4)",
};

export default function OrgProfilePage() {
  const { user } = useUser();
  const orgData = useQuery(api.organizations.getByCreator, {
    clerkId: user?.id ?? "",
  });
  const updateOrg = useMutation(api.organizations.update);
  const orgName =
    (user?.publicMetadata as { orgName?: string })?.orgName ||
    orgData?.name ||
    "";

  const [editingCompany, setEditingCompany] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [saving, setSaving] = useState(false);

  const [companyForm, setCompanyForm] = useState({
    name: "",
    industry: "",
    size: "",
    website: "",
    address: "",
  });
  const [contactForm, setContactForm] = useState({
    primaryContactName: "",
    primaryContactDesignation: "",
    primaryContactEmail: "",
    primaryContactPhone: "",
  });

  const startEditCompany = () => {
    setCompanyForm({
      name: orgData?.name || orgName || "",
      industry: orgData?.industry || "",
      size: orgData?.size || "",
      website: orgData?.website || "",
      address: orgData?.address || "",
    });
    setEditingCompany(true);
  };

  const startEditContact = () => {
    setContactForm({
      primaryContactName: orgData?.primaryContactName || "",
      primaryContactDesignation: orgData?.primaryContactDesignation || "",
      primaryContactEmail:
        orgData?.primaryContactEmail ||
        user?.emailAddresses?.[0]?.emailAddress ||
        "",
      primaryContactPhone: orgData?.primaryContactPhone || "",
    });
    setEditingContact(true);
  };

  const saveCompany = async () => {
    if (!orgData?._id) return;
    setSaving(true);
    try {
      await updateOrg({
        orgId: orgData._id as Id<"organizations">,
        name: companyForm.name || undefined,
        industry: companyForm.industry || undefined,
        size: companyForm.size || undefined,
        website: companyForm.website || undefined,
        address: companyForm.address || undefined,
      });
      toast.success("Company information updated");
      setEditingCompany(false);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const saveContact = async () => {
    if (!orgData?._id) return;
    setSaving(true);
    try {
      await updateOrg({
        orgId: orgData._id as Id<"organizations">,
        ...contactForm,
      });
      toast.success("Contact information updated");
      setEditingContact(false);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const usageStats = [
    { label: "Active Mandates", value: "0", unit: "open" },
    { label: "Services Used", value: "0", unit: "total" },
    { label: "Account Age", value: "New", unit: "on LLP" },
  ];

  return (
    <MotionConfig reducedMotion="user">
      {/* -- Back nav ------------------------------------------ */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
        style={{ marginBottom: "var(--s-3)" }}
      >
        <Link
          href="/org"
          className="lf-meta"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={12} />
          Organization Desk
        </Link>
      </motion.div>

      {/* -- Hero ----------------------------------------------- */}
      <motion.section
        variants={heroStagger}
        initial="hidden"
        animate="show"
        style={{ paddingBottom: "var(--s-6)" }}
      >
        <motion.div variants={fadeUp} className="lf-kicker">
          <span className="lf-kicker-mark">§ I</span>
          Organization Desk · Profile
        </motion.div>

        <motion.h1
          variants={fadeUp}
          style={{
            fontFamily: "var(--lf-display)",
            fontSize: "clamp(40px, 5.6vw, 64px)",
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
            margin: "var(--s-3) 0 var(--s-3)",
          }}
        >
          Your{" "}
          <em
            style={{
              fontStyle: "italic",
              color: "var(--accent-blue)",
            }}
          >
            {orgName || "organization"} profile.
          </em>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="lf-section-deck"
          style={{ maxWidth: 640 }}
        >
          Company particulars, primary contact, billing, and activity — filed
          under the organization for LLP coordination.
        </motion.p>
      </motion.section>

      {/* -- Company Information ------------------------------- */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        style={{ marginBottom: "var(--s-6)" }}
      >
        <motion.div
          variants={fadeUp}
          className="lf-section-header"
          style={{
            marginBottom: "var(--s-4)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: "var(--s-3)",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div className="lf-kicker">
              <span className="lf-kicker-mark">§ II</span>
              Company information
            </div>
            <h2 className="lf-h2" style={{ marginTop: "var(--s-2)", fontSize: 32 }}>
              Particulars <em>on file.</em>
            </h2>
          </div>
          {!editingCompany && (
            <button
              type="button"
              onClick={startEditCompany}
              className="lf-cta lf-cta--ghost"
            >
              <Pencil size={12} style={{ marginRight: 6 }} />
              Edit
            </button>
          )}
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="lf-card"
          style={{ padding: "var(--s-5)" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--s-2)",
              marginBottom: "var(--s-4)",
              paddingBottom: "var(--s-3)",
              borderBottom: "1px solid var(--line-1)",
            }}
          >
            <Building2 size={14} style={{ color: "var(--accent-blue)" }} />
            <span className="lf-meta" style={{ textTransform: "uppercase" }}>
              Organization details
            </span>
          </div>

          {editingCompany ? (
            <>
              <div style={fieldGrid}>
                <EditField
                  label="Company Name"
                  value={companyForm.name}
                  onChange={(v) => setCompanyForm((f) => ({ ...f, name: v }))}
                />
                <EditField
                  label="Industry"
                  value={companyForm.industry}
                  onChange={(v) =>
                    setCompanyForm((f) => ({ ...f, industry: v }))
                  }
                />
                <EditField
                  label="Company Size"
                  value={companyForm.size}
                  onChange={(v) => setCompanyForm((f) => ({ ...f, size: v }))}
                />
                <EditField
                  label="Website"
                  value={companyForm.website}
                  onChange={(v) =>
                    setCompanyForm((f) => ({ ...f, website: v }))
                  }
                />
                <div style={{ gridColumn: "span 2" }}>
                  <EditField
                    label="Address"
                    value={companyForm.address}
                    onChange={(v) =>
                      setCompanyForm((f) => ({ ...f, address: v }))
                    }
                    multiline
                  />
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "var(--s-2)",
                  justifyContent: "flex-end",
                  marginTop: "var(--s-4)",
                  paddingTop: "var(--s-3)",
                  borderTop: "1px solid var(--line-1)",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() => setEditingCompany(false)}
                  disabled={saving}
                  className="lf-cta lf-cta--ghost"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveCompany}
                  disabled={saving}
                  className="lf-cta lf-cta--primary"
                >
                  <Check size={12} style={{ marginRight: 6 }} />
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </>
          ) : (
            <div style={fieldGrid}>
              <ReadField label="Company Name" value={orgName || "—"} />
              <ReadField label="Industry" value={orgData?.industry || "—"} />
              <ReadField label="Company Size" value={orgData?.size || "—"} />
              <ReadField label="Website" value={orgData?.website || "—"} />
              <div style={{ gridColumn: "span 2" }}>
                <ReadField label="Address" value={orgData?.address || "—"} />
              </div>
            </div>
          )}
        </motion.div>
      </motion.section>

      {/* -- Primary Contact ------------------------------------ */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        style={{ marginBottom: "var(--s-6)" }}
      >
        <motion.div
          variants={fadeUp}
          className="lf-section-header"
          style={{
            marginBottom: "var(--s-4)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: "var(--s-3)",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div className="lf-kicker">
              <span className="lf-kicker-mark">§ III</span>
              Primary contact
            </div>
            <h2 className="lf-h2" style={{ marginTop: "var(--s-2)", fontSize: 32 }}>
              The <em>main thread.</em>
            </h2>
          </div>
          {!editingContact && (
            <button
              type="button"
              onClick={startEditContact}
              className="lf-cta lf-cta--ghost"
            >
              <Pencil size={12} style={{ marginRight: 6 }} />
              Edit
            </button>
          )}
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="lf-card"
          style={{ padding: "var(--s-5)" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--s-2)",
              marginBottom: "var(--s-4)",
              paddingBottom: "var(--s-3)",
              borderBottom: "1px solid var(--line-1)",
            }}
          >
            <UserCircle2 size={14} style={{ color: "var(--accent-blue)" }} />
            <span className="lf-meta" style={{ textTransform: "uppercase" }}>
              Lead point of contact
            </span>
          </div>

          {editingContact ? (
            <>
              <div style={fieldGrid}>
                <EditField
                  label="Name"
                  value={contactForm.primaryContactName}
                  onChange={(v) =>
                    setContactForm((f) => ({ ...f, primaryContactName: v }))
                  }
                />
                <EditField
                  label="Designation"
                  value={contactForm.primaryContactDesignation}
                  onChange={(v) =>
                    setContactForm((f) => ({
                      ...f,
                      primaryContactDesignation: v,
                    }))
                  }
                />
                <EditField
                  label="Email"
                  value={contactForm.primaryContactEmail}
                  onChange={(v) =>
                    setContactForm((f) => ({ ...f, primaryContactEmail: v }))
                  }
                />
                <EditField
                  label="Phone"
                  value={contactForm.primaryContactPhone}
                  onChange={(v) =>
                    setContactForm((f) => ({ ...f, primaryContactPhone: v }))
                  }
                />
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "var(--s-2)",
                  justifyContent: "flex-end",
                  marginTop: "var(--s-4)",
                  paddingTop: "var(--s-3)",
                  borderTop: "1px solid var(--line-1)",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() => setEditingContact(false)}
                  disabled={saving}
                  className="lf-cta lf-cta--ghost"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveContact}
                  disabled={saving}
                  className="lf-cta lf-cta--primary"
                >
                  <Check size={12} style={{ marginRight: 6 }} />
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </>
          ) : (
            <div style={fieldGrid}>
              <ReadField
                label="Name"
                value={orgData?.primaryContactName || "—"}
              />
              <ReadField
                label="Designation"
                value={orgData?.primaryContactDesignation || "—"}
              />
              <ReadField
                label="Email"
                value={
                  orgData?.primaryContactEmail ||
                  user?.emailAddresses?.[0]?.emailAddress ||
                  "—"
                }
              />
              <ReadField
                label="Phone"
                value={orgData?.primaryContactPhone || "—"}
              />
            </div>
          )}
        </motion.div>
      </motion.section>

      {/* -- LLP Usage (3-up hairline) -------------------------- */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        style={{ marginBottom: "var(--s-6)" }}
      >
        <motion.div
          variants={fadeUp}
          className="lf-section-header"
          style={{ marginBottom: "var(--s-4)" }}
        >
          <div className="lf-kicker">
            <span className="lf-kicker-mark">§ IV</span>
            LLP usage
          </div>
          <h2 className="lf-h2" style={{ marginTop: "var(--s-2)", fontSize: 32 }}>
            Your <em>activity ledger.</em>
          </h2>
        </motion.div>

        <motion.div variants={fadeUp} style={hairlineGrid(3)}>
          {usageStats.map((s) => (
            <div key={s.label} style={{ ...hairlineCell, padding: "var(--s-5)" }}>
              <span className="lf-meta" style={{ textTransform: "uppercase" }}>
                <Activity
                  size={11}
                  style={{ marginRight: 4, color: "var(--bronze)" }}
                />
                {s.label}
              </span>
              <span
                style={{
                  fontFamily: "var(--lf-display)",
                  fontSize: 32,
                  fontWeight: 400,
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                  color: "var(--ink)",
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                }}
              >
                {s.value}
                <span
                  style={{
                    fontFamily: "var(--lf-mono)",
                    fontSize: 11,
                    color: "var(--ink-4)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {s.unit}
                </span>
              </span>
            </div>
          ))}
        </motion.div>
      </motion.section>

      {/* -- Billing Details ------------------------------------ */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        style={{ marginBottom: "var(--s-7)" }}
      >
        <motion.div
          variants={fadeUp}
          className="lf-section-header"
          style={{ marginBottom: "var(--s-4)" }}
        >
          <div className="lf-kicker">
            <span className="lf-kicker-mark">§ V</span>
            Billing details
          </div>
          <h2 className="lf-h2" style={{ marginTop: "var(--s-2)", fontSize: 32 }}>
            How LLP <em>invoices you.</em>
          </h2>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="lf-card"
          style={{ padding: "var(--s-5)" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--s-2)",
              marginBottom: "var(--s-4)",
              paddingBottom: "var(--s-3)",
              borderBottom: "1px solid var(--line-1)",
            }}
          >
            <CreditCard size={14} style={{ color: "var(--accent-blue)" }} />
            <span className="lf-meta" style={{ textTransform: "uppercase" }}>
              Settlement preferences
            </span>
          </div>
          <div style={fieldGrid}>
            <ReadField
              label="Payment Method"
              value={orgData?.paymentMethod || "bKash (Manual)"}
            />
            <ReadField
              label="Billing Contact"
              value={orgData?.billingContactEmail || "—"}
            />
          </div>
        </motion.div>
      </motion.section>

      {/* -- Stamp ----------------------------------------------- */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        viewport={inViewOnce}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--s-3)",
          paddingTop: "var(--s-4)",
          borderTop: "1px solid var(--line-1)",
        }}
      >
        <span className="lf-meta" style={{ fontStyle: "italic" }}>
          Profile is filed under <strong>{orgName || "your organization"}</strong>
          . Updates here propagate to all LLP coordinators on your account.
        </span>
        <div style={{ display: "flex", gap: "var(--s-3)" }}>
          <span className="lf-meta">Foundation v1.9</span>
          <span className="lf-meta">Universe v2.0</span>
        </div>
      </motion.div>

      {/* -- Floating Ask LLP FAB -------------------------------- */}
      <Link
        href="/chat"
        className="lf-cta lf-cta--primary"
        aria-label="Open Ask LLP"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 999,
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 40,
        }}
      >
        <MessageSquare size={20} />
      </Link>
    </MotionConfig>
  );
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "var(--s-1)" }}
    >
      <span className="lf-field-label">{label}</span>
      <span
        className="lf-body"
        style={{
          fontFamily: "var(--lf-display)",
          fontSize: 16,
          color: "var(--ink)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "var(--s-2)" }}
    >
      <label className="lf-field-label">{label}</label>
      {multiline ? (
        <textarea
          className="lf-input"
          value={value}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
          style={{
            borderRadius: "var(--r-md)",
            resize: "vertical",
            minHeight: 72,
            fontFamily: "var(--lf-body)",
          }}
        />
      ) : (
        <input
          className="lf-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
