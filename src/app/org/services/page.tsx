"use client";

import { useState, type CSSProperties } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { motion, MotionConfig, type Variants } from "framer-motion";
import {
  ClipboardCheck,
  Landmark,
  FolderCheck,
  Stamp,
  Users,
  Building2,
  FileText,
  ShieldCheck,
  Headset,
  CheckCircle,
  Lock,
  Eye,
  ListChecks,
  Plane,
  Briefcase,
  ScrollText,
  Clock,
  Banknote,
  ArrowRight,
} from "lucide-react";
import { ServiceRequestDialog } from "@/components/services/service-request-dialog";
import { useLanguage } from "@/hooks/use-language";

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

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  ClipboardCheck,
  Landmark,
  FolderCheck,
  Stamp,
  Users,
  Building2,
  FileText,
  ShieldCheck,
  Headset,
  CheckCircle,
  Lock,
  Eye,
  ListChecks,
  Plane,
  Briefcase,
  ScrollText,
};
function getIcon(name: string) {
  return iconMap[name] ?? ClipboardCheck;
}

const categoryConfig = {
  expatriate: { label: "Expatriate & Visa", icon: Plane, marker: "§ II.a" },
  hr: { label: "HR Services", icon: Briefcase, marker: "§ II.b" },
  licensing: { label: "Licensing & Regulatory", icon: ScrollText, marker: "§ II.c" },
} as const;
type CategoryKey = keyof typeof categoryConfig;

function statusModifier(status: string): "live" | "busy" | "off" {
  const s = status.toLowerCase();
  if (s.includes("complete") || s.includes("delivered") || s.includes("closed")) {
    return "off";
  }
  if (s.includes("await") || s.includes("hold") || s.includes("pending")) {
    return "busy";
  }
  return "live";
}

function ServiceCard({
  service,
  language,
  onRequest,
}: {
  service: any;
  language: string;
  onRequest: () => void;
}) {
  const Icon = getIcon(service.icon);
  const title =
    language === "bn" && service.titleBn ? service.titleBn : service.title;
  const desc =
    language === "bn" && service.descriptionBn
      ? service.descriptionBn
      : service.description;
  const badgeText =
    language === "bn" && service.badgeBn ? service.badgeBn : service.badge;
  const ctaText =
    language === "bn" && service.ctaTextBn
      ? service.ctaTextBn
      : service.ctaText || "Request";

  return (
    <button
      type="button"
      onClick={onRequest}
      className="lf-card lf-card--hover"
      style={{
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: "var(--s-3)",
        height: "100%",
        cursor: "pointer",
        background: "var(--glass-bg)",
        border: "1px solid var(--glass-border)",
        borderRadius: "var(--r-md)",
        padding: "var(--s-5)",
        font: "inherit",
        color: "inherit",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--s-2)",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 999,
            background: "var(--accent-blue-ghost)",
            color: "var(--accent-blue)",
          }}
        >
          <Icon size={14} />
        </span>
        {badgeText && (
          <span
            className="lf-meta lf-meta--accent"
            style={{
              textTransform: "uppercase",
              padding: "2px 8px",
              borderRadius: 999,
              background: "var(--accent-blue-ghost)",
              color: "var(--accent-blue)",
              fontSize: 10,
            }}
          >
            {badgeText}
          </span>
        )}
      </div>
      <h3
        className="lf-h3"
        style={{ margin: 0, fontSize: 18 }}
      >
        {title}
      </h3>
      <p
        className="lf-body"
        style={{
          color: "var(--ink-3)",
          fontSize: 13,
          margin: 0,
          flex: 1,
        }}
      >
        {desc}
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--s-3)",
          paddingTop: "var(--s-2)",
          borderTop: "1px solid var(--line-1)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "var(--s-3)",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {service.deliveryTimeline && (
            <span
              className="lf-meta"
              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <Clock size={11} /> {service.deliveryTimeline}
            </span>
          )}
          <span
            className="lf-meta"
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <Banknote size={11} /> Quote on request
          </span>
        </div>
        <span
          className="lf-cta lf-cta--ghost"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            fontSize: 12,
          }}
        >
          {ctaText}
          <ArrowRight size={12} />
        </span>
      </div>
    </button>
  );
}

export default function OrgServicesPage() {
  const { user } = useUser();
  const clerkId = user?.id;
  const { language } = useLanguage();

  const activeServices = useQuery(api.serviceProducts.getActive, {});
  const myRequests = useQuery(
    api.serviceRequests.listByClerkId,
    clerkId ? { clerkId } : "skip"
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);

  const handleRequest = (service: any) => {
    setSelectedService(service);
    setDialogOpen(true);
  };

  const grouped = (["expatriate", "hr", "licensing"] as CategoryKey[])
    .map((key) => ({
      key,
      ...categoryConfig[key],
      services: activeServices?.filter((s) => s.category === key) ?? [],
    }))
    .filter((g) => g.services.length > 0);

  const loadingServices = activeServices === undefined;
  const loadingRequests = myRequests === undefined;
  const hasRequests = !!myRequests && myRequests.length > 0;

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
          Organization Desk · Services
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
          LLP{" "}
          <em
            style={{
              fontStyle: "italic",
              color: "var(--accent-blue)",
            }}
          >
            service desk.
          </em>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="lf-section-deck"
          style={{ maxWidth: 680 }}
        >
          Engage LLP for advisory work, audits, training, document templates,
          and more — single-mandate engagements with named partners.
        </motion.p>
      </motion.section>

      {/* -- §II Service catalogue ------------------------------- */}
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
          style={{ marginBottom: "var(--s-5)" }}
        >
          <div className="lf-kicker">
            <span className="lf-kicker-mark">§ II</span>
            Service catalogue
          </div>
          <h2 className="lf-h2" style={{ marginTop: "var(--s-2)" }}>
            What LLP <em>can deliver.</em>
          </h2>
          <p className="lf-section-deck">
            Pick a service to brief our team. Each request opens a thread with
            the LLP service desk and is tracked to completion.
          </p>
        </motion.div>

        {loadingServices ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "var(--s-4)",
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="lf-card"
                style={{
                  padding: "var(--s-5)",
                  opacity: 0.55,
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--s-3)",
                }}
              >
                <div
                  style={{
                    height: 32,
                    width: 32,
                    borderRadius: 999,
                    background: "var(--line-2)",
                  }}
                />
                <div
                  style={{
                    height: 16,
                    width: "60%",
                    background: "var(--line-2)",
                    borderRadius: 4,
                  }}
                />
                <div
                  style={{
                    height: 10,
                    width: "95%",
                    background: "var(--line-2)",
                    borderRadius: 4,
                    opacity: 0.65,
                  }}
                />
                <div
                  style={{
                    height: 10,
                    width: "72%",
                    background: "var(--line-2)",
                    borderRadius: 4,
                    opacity: 0.55,
                  }}
                />
              </div>
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <motion.div
            variants={fadeUp}
            className="lf-card"
            style={{
              borderStyle: "dashed",
              padding: "var(--s-6)",
              textAlign: "center",
            }}
          >
            <h3 className="lf-h3" style={{ margin: 0 }}>
              No services available
            </h3>
            <p
              className="lf-body"
              style={{
                color: "var(--ink-3)",
                fontStyle: "italic",
                marginTop: "var(--s-2)",
              }}
            >
              The LLP service catalogue is currently empty. Check back shortly.
            </p>
          </motion.div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--s-6)",
            }}
          >
            {grouped.map((group) => {
              const GroupIcon = group.icon;
              return (
                <motion.div key={group.key} variants={fadeUp}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--s-3)",
                      marginBottom: "var(--s-4)",
                    }}
                  >
                    <span
                      className="lf-meta"
                      style={{
                        fontFamily: "var(--lf-mono)",
                        textTransform: "uppercase",
                        color: "var(--accent-blue)",
                      }}
                    >
                      {group.marker}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        height: 1,
                        background: "var(--line-2)",
                        opacity: 0.6,
                      }}
                    />
                    <span
                      className="lf-meta"
                      style={{
                        textTransform: "uppercase",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <GroupIcon size={12} />
                      {group.label} · {group.services.length}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                      gap: "var(--s-4)",
                    }}
                  >
                    {group.services.map((service) => (
                      <ServiceCard
                        key={service._id}
                        service={service}
                        language={language}
                        onRequest={() => handleRequest(service)}
                      />
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.section>

      {/* -- §III My requests ------------------------------------ */}
      {(loadingRequests || hasRequests) && (
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
              <span className="lf-kicker-mark">§ III</span>
              My requests
            </div>
            <h2 className="lf-h2" style={{ marginTop: "var(--s-2)" }}>
              Threads <em>open with the desk.</em>
            </h2>
          </motion.div>

          {loadingRequests ? (
            <motion.div
              variants={fadeUp}
              className="lf-card"
              style={{
                padding: "var(--s-5)",
                textAlign: "center",
              }}
            >
              <p
                className="lf-body"
                style={{ color: "var(--ink-3)", margin: 0 }}
              >
                Loading requests…
              </p>
            </motion.div>
          ) : (
            <motion.div
              variants={fadeUp}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
                background: "var(--glass-border)",
                border: "1px solid var(--glass-border)",
                borderRadius: "var(--r-lg)",
                overflow: "hidden",
              }}
            >
              {myRequests!.map((r) => {
                const state = statusModifier(r.status);
                const statusClass =
                  state === "live"
                    ? "lf-status--live"
                    : state === "busy"
                    ? "lf-status--busy"
                    : "lf-status--off";
                const rowStyle: CSSProperties = {
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto auto",
                  gap: "var(--s-3)",
                  alignItems: "center",
                  padding: "var(--s-4)",
                  background: "var(--glass-bg)",
                };
                return (
                  <div key={r._id} style={rowStyle}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 999,
                        background: "var(--paper-inner)",
                        border: "1px solid var(--line-2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--accent-blue)",
                      }}
                    >
                      <FileText size={14} />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--lf-display)",
                          fontSize: 15,
                          color: "var(--ink)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.serviceTitle}
                      </span>
                      <span className="lf-meta">
                        {r.orderNumber ? (
                          <>
                            <span
                              style={{
                                fontFamily: "var(--lf-mono)",
                                color: "var(--ink-4)",
                              }}
                            >
                              #{r.orderNumber}
                            </span>
                            {" · "}
                          </>
                        ) : null}
                        {r.urgency === "urgent" && (
                          <span
                            style={{
                              color: "var(--rust)",
                              fontWeight: 600,
                              marginRight: 6,
                            }}
                          >
                            Urgent ·
                          </span>
                        )}
                        {r.description}
                      </span>
                    </div>
                    <span className={`lf-status ${statusClass}`}>
                      <span className="lf-status-dot" />
                      {r.status.replace(/_/g, " ")}
                    </span>
                    <span className="lf-meta">
                      {new Date(r._creationTime).toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
            </motion.div>
          )}
        </motion.section>
      )}

      <ServiceRequestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        service={selectedService}
      />
    </MotionConfig>
  );
}
