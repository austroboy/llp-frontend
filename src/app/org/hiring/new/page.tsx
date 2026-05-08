"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { toast } from "sonner";
import { Send, ArrowLeft } from "lucide-react";
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

const fieldGroup: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--s-2)",
};

const cardStack: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--s-4)",
};

const textareaStyle: CSSProperties = {
  width: "100%",
  borderRadius: "var(--r-md)",
  padding: "12px 16px",
  minHeight: 120,
  background: "var(--paper-inner)",
  border: "1px solid var(--line-2)",
  color: "var(--ink)",
  fontFamily: "var(--lf-body)",
  fontSize: 14,
  lineHeight: 1.6,
  resize: "vertical",
  outline: "none",
};

export default function NewHiringRequestPage() {
  const router = useRouter();
  const { user } = useUser();
  const clerkId = user?.id;

  const client = useQuery(
    api.headhunting.clients.getByClerkId,
    clerkId ? { clerkId } : "skip"
  );

  const createAssignment = useMutation(api.headhunting.hiringAssignments.create);
  const submitAssignment = useMutation(api.headhunting.hiringAssignments.submit);
  const createClientWithClerkId = useMutation(
    api.headhunting.clients.createWithClerkId
  );

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ assignmentName?: string }>({});
  const [form, setForm] = useState({
    assignmentName: "",
    department: "",
    hiringScopeSummary: "",
    urgencyLevel: "standard",
  });

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "assignmentName" && errors.assignmentName) {
      setErrors((prev) => ({ ...prev, assignmentName: undefined }));
    }
  };

  const handleSubmit = async () => {
    if (!form.assignmentName.trim()) {
      setErrors({ assignmentName: "Role title is required." });
      toast.error("Please enter a role title.");
      return;
    }
    setSubmitting(true);
    try {
      let clientId = client?._id;
      if (!clientId) {
        const orgName =
          (user?.publicMetadata as { orgName?: string })?.orgName ||
          user?.fullName ||
          "Organization";
        clientId = await createClientWithClerkId({
          companyName: orgName,
          contactName: user?.fullName || user?.firstName || "",
          contactEmail: user?.primaryEmailAddress?.emailAddress || "",
          clerkId: clerkId!,
        });
      }

      const id = await createAssignment({
        clientId,
        clerkId: clerkId,
        assignmentName: form.assignmentName.trim(),
        hiringSupportType: "full_search",
        hiringScopeSummary: form.hiringScopeSummary.trim() || undefined,
        totalOpenings: 1,
        hiringEntity: form.department.trim() || undefined,
        urgencyLevel: form.urgencyLevel,
      });
      await submitAssignment({ id });
      toast.success("Hiring request filed.");

      fetch("/api/headhunting/hiring-ack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: user?.primaryEmailAddress?.emailAddress,
          recipientName: user?.fullName || user?.firstName || "there",
          assignmentName: form.assignmentName.trim(),
          department: form.department.trim() || undefined,
          urgency: form.urgencyLevel,
          description: form.hiringScopeSummary.trim() || undefined,
        }),
      }).catch(() => {});

      router.push("/org/hiring");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit.");
    } finally {
      setSubmitting(false);
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
        <motion.div variants={fadeUp} className="lf-kicker">
          <span className="lf-kicker-mark">§ I</span>
          New Hiring Request
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
          Brief us on{" "}
          <em
            style={{
              fontStyle: "italic",
              color: "var(--accent-blue)",
            }}
          >
            the role.
          </em>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="lf-section-deck"
          style={{ maxWidth: 640 }}
        >
          One mandate per request. On submit, a lead recruiter is assigned and
          an acknowledgement is filed to your primary contact. Sourcing begins
          once the mandate thread opens.
        </motion.p>

        <motion.div
          variants={fadeUp}
          style={{
            display: "flex",
            gap: "var(--s-2)",
            marginTop: "var(--s-4)",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => router.push("/org/hiring")}
            className="lf-cta lf-cta--ghost"
            style={{ border: "none", background: "transparent" }}
          >
            <ArrowLeft size={14} style={{ marginRight: 8 }} />
            Back to Hiring Requests
          </button>
        </motion.div>
      </motion.section>

      {/* -- Form sections --------------------------------------- */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        style={{ marginBottom: "var(--s-7)" }}
      >
        <div style={cardStack}>
          {/* The role */}
          <motion.div
            variants={fadeUp}
            className="lf-card"
            style={{ padding: "var(--s-5)" }}
          >
            <div style={{ marginBottom: "var(--s-4)" }}>
              <span
                className="lf-meta lf-meta--accent"
                style={{ textTransform: "uppercase" }}
              >
                § II · The role
              </span>
              <h3
                className="lf-h3"
                style={{ margin: "var(--s-2) 0 var(--s-2)" }}
              >
                What is being filled?
              </h3>
              <p
                className="lf-body"
                style={{ color: "var(--ink-3)", margin: 0, fontSize: 14 }}
              >
                Title and home department. Keep the title close to how it
                appears on your org chart.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "var(--s-3)",
              }}
            >
              <div style={fieldGroup}>
                <label
                  className="lf-field-label"
                  htmlFor="hr-role-title"
                >
                  Role title
                </label>
                <input
                  id="hr-role-title"
                  type="text"
                  className="lf-input"
                  placeholder="e.g., Senior HR Manager"
                  value={form.assignmentName}
                  onChange={(e) =>
                    handleChange("assignmentName", e.target.value)
                  }
                  aria-invalid={!!errors.assignmentName}
                  aria-describedby={
                    errors.assignmentName ? "hr-role-title-error" : undefined
                  }
                  style={
                    errors.assignmentName
                      ? { borderColor: "var(--rust)" }
                      : undefined
                  }
                />
                {errors.assignmentName && (
                  <span
                    id="hr-role-title-error"
                    className="lf-meta"
                    style={{ color: "var(--rust)" }}
                  >
                    {errors.assignmentName}
                  </span>
                )}
              </div>

              <div style={fieldGroup}>
                <label
                  className="lf-field-label"
                  htmlFor="hr-department"
                >
                  Department
                </label>
                <input
                  id="hr-department"
                  type="text"
                  className="lf-input"
                  placeholder="e.g., Human Resources"
                  value={form.department}
                  onChange={(e) =>
                    handleChange("department", e.target.value)
                  }
                />
              </div>
            </div>
          </motion.div>

          {/* Logistics */}
          <motion.div
            variants={fadeUp}
            className="lf-card"
            style={{ padding: "var(--s-5)" }}
          >
            <div style={{ marginBottom: "var(--s-4)" }}>
              <span
                className="lf-meta lf-meta--accent"
                style={{ textTransform: "uppercase" }}
              >
                § III · Logistics
              </span>
              <h3
                className="lf-h3"
                style={{ margin: "var(--s-2) 0 var(--s-2)" }}
              >
                How urgent?
              </h3>
              <p
                className="lf-body"
                style={{ color: "var(--ink-3)", margin: 0, fontSize: 14 }}
              >
                Urgency drives queue position with the LLP desk. Critical
                surfaces immediately to the lead recruiter.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "var(--s-3)",
              }}
            >
              <div style={fieldGroup}>
                <label
                  className="lf-field-label"
                  htmlFor="hr-urgency"
                >
                  Urgency
                </label>
                <select
                  id="hr-urgency"
                  className="lf-select-trigger"
                  value={form.urgencyLevel}
                  onChange={(e) =>
                    handleChange("urgencyLevel", e.target.value)
                  }
                >
                  <option value="standard">Standard</option>
                  <option value="urgent">Urgent</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
          </motion.div>

          {/* Notes */}
          <motion.div
            variants={fadeUp}
            className="lf-card"
            style={{ padding: "var(--s-5)" }}
          >
            <div style={{ marginBottom: "var(--s-4)" }}>
              <span
                className="lf-meta lf-meta--accent"
                style={{ textTransform: "uppercase" }}
              >
                § IV · Notes
              </span>
              <h3
                className="lf-h3"
                style={{ margin: "var(--s-2) 0 var(--s-2)" }}
              >
                Anything else?
              </h3>
              <p
                className="lf-body"
                style={{ color: "var(--ink-3)", margin: 0, fontSize: 14 }}
              >
                Responsibilities, key requirements, must-have skills, and any
                context the recruiter should hold while sourcing.
              </p>
            </div>

            <div style={fieldGroup}>
              <label
                className="lf-field-label"
                htmlFor="hr-scope"
              >
                Brief description
              </label>
              <textarea
                id="hr-scope"
                placeholder="Role responsibilities, key requirements, context…"
                value={form.hiringScopeSummary}
                onChange={(e) =>
                  handleChange("hiringScopeSummary", e.target.value)
                }
                style={textareaStyle}
              />
            </div>
          </motion.div>

          {/* Submit row */}
          <motion.div
            variants={fadeUp}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "var(--s-3)",
              flexWrap: "wrap",
              paddingTop: "var(--s-3)",
              borderTop: "1px solid var(--line-1)",
            }}
          >
            <button
              type="button"
              onClick={() => router.push("/org/hiring")}
              className="lf-cta lf-cta--ghost"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="lf-cta lf-cta--primary"
              style={{
                opacity: submitting ? 0.7 : 1,
                cursor: submitting ? "wait" : "pointer",
              }}
            >
              <Send size={14} style={{ marginRight: 8 }} />
              {submitting ? "Filing…" : "Submit hiring request"}
            </button>
          </motion.div>
        </div>
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
          One request opens one mandate. Acknowledgement is filed to{" "}
          {user?.primaryEmailAddress?.emailAddress
            ? user.primaryEmailAddress.emailAddress
            : "your primary contact"}
          .
        </span>
        <div style={{ display: "flex", gap: "var(--s-3)" }}>
          <span className="lf-meta">Foundation v1.9</span>
          <span className="lf-meta">Universe v2.0</span>
        </div>
      </motion.div>
    </MotionConfig>
  );
}
