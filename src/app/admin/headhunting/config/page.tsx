"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { ArrowLeft, Settings, Save, Sprout } from "lucide-react";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";
import { toast } from "sonner";

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

const CATEGORIES = [
  { key: "fees", label: "Fee Configuration" },
  { key: "protection", label: "Protection Windows" },
  { key: "matching", label: "Candidate Matching" },
  { key: "briefs", label: "Brief Settings" },
];

export default function ConfigPage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const rules = useQuery(api.headhunting.config.listAll);
  const upsert = useMutation(api.headhunting.config.upsert);

  const seedDefaults = useMutation(api.headhunting.config.seedQuotaDefaults);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  if (!rules) {
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

  const handleSave = async (key: string) => {
    if (!user || !edits[key]) return;
    setSaving(key);
    try {
      await upsert({
        key,
        value: edits[key],
        updatedBy: user.fullName || user.id,
      });
      setEdits((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      toast.success("Rule updated");
    } catch (e) {
      toast.error("Failed to save");
    } finally {
      setSaving(null);
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
          Admin · Headhunting · Config
        </motion.div>

        <motion.h1
          variants={fadeUp}
          style={{
            fontFamily: "var(--lf-display)",
            fontSize: "clamp(34px, 4.4vw, 48px)",
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
            margin: "var(--s-3) 0 var(--s-3)",
            display: "flex",
            alignItems: "center",
            gap: "var(--s-2)",
          }}
        >
          <Settings
            className="size-7"
            style={{ color: "var(--accent-blue)" }}
          />
          Business{" "}
          <em
            style={{
              fontStyle: "italic",
              color: "var(--accent-blue)",
            }}
          >
            Rules.
          </em>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="lf-section-deck"
          style={{ maxWidth: 640 }}
        >
          Fee schedules, protection windows, matching thresholds, and brief
          quotas. Edits take effect on save.
        </motion.p>
      </motion.section>

      {/* -- Categories ------------------------------------------ */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-4)",
          maxWidth: 880,
        }}
      >
        {CATEGORIES.map((cat) => {
          const catRules = rules.filter((r) => r.category === cat.key);
          if (catRules.length === 0) return null;

          // Check if all quota keys in "briefs" category are still defaults
          const quotaKeys = ["quota_tier_S", "quota_tier_P", "quota_tier_E", "quota_tier_N"];
          const showSeedButton =
            cat.key === "briefs" &&
            catRules.filter((r) => quotaKeys.includes(r.key) && r.isDefault).length === quotaKeys.length;

          return (
            <motion.div
              key={cat.key}
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "var(--s-2)",
                }}
              >
                <h2
                  style={{
                    fontFamily: "var(--lf-display)",
                    fontSize: 18,
                    fontWeight: 500,
                    color: "var(--ink)",
                    margin: 0,
                  }}
                >
                  {cat.label}
                </h2>
                {showSeedButton && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={seeding}
                    onClick={async () => {
                      setSeeding(true);
                      try {
                        await seedDefaults();
                        toast.success("Quota defaults seeded to database");
                      } catch {
                        toast.error("Failed to seed defaults");
                      } finally {
                        setSeeding(false);
                      }
                    }}
                    className="h-7 text-xs gap-1"
                  >
                    <Sprout className="size-3" />
                    {seeding ? "Seeding..." : "Seed Quota Defaults"}
                  </Button>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--s-2)",
                }}
              >
                {catRules.map((rule) => {
                  const editValue = edits[rule.key];
                  const hasEdit = editValue !== undefined && editValue !== rule.value;

                  return (
                    <div
                      key={rule.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--s-2)",
                        paddingTop: "var(--s-2)",
                        borderTop: "1px solid var(--line-1)",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <p
                          style={{
                            fontFamily: "var(--lf-display)",
                            fontSize: 14,
                            color: "var(--ink)",
                            margin: 0,
                          }}
                        >
                          {rule.label}
                        </p>
                        {rule.isDefault && (
                          <Badge
                            variant="outline"
                            className="text-[8px] mt-0.5"
                          >
                            default
                          </Badge>
                        )}
                      </div>
                      <Input
                        value={editValue ?? rule.value}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [rule.key]: e.target.value,
                          }))
                        }
                        className="w-40 text-xs h-8"
                      />
                      {hasEdit && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSave(rule.key)}
                          disabled={saving === rule.key}
                          className="h-8 text-xs gap-1"
                        >
                          <Save className="size-3" />
                          {saving === rule.key ? "..." : "Save"}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </motion.section>
    </MotionConfig>
  );
}
