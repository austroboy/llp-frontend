"use client";

import { useSearchParams } from "next/navigation";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLanguage } from "@/hooks/use-language";
import { ExpertsTab } from "@/components/admin/experts/experts-tab";
import { ApplicationsTab } from "@/components/admin/experts/applications-tab";
import { BadgesTab } from "@/components/admin/experts/badges-tab";
import { QuestionsTab } from "@/components/admin/experts/questions-tab";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};
const heroStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
};

export default function AdminExpertsPage() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "experts";

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto max-w-5xl space-y-4 sm:space-y-6">
        {/* -- Hero ------------------------------------------------ */}
        <motion.section
          variants={heroStagger}
          initial="hidden"
          animate="show"
          style={{ paddingBottom: "var(--s-4)" }}
        >
          <motion.div variants={fadeUp} className="lf-kicker">
            <span className="lf-kicker-mark">§ 1</span>
            Admin · Expert Registry
          </motion.div>
          <motion.h1
            variants={fadeUp}
            style={{
              fontFamily: "var(--lf-display)",
              fontSize: "clamp(32px, 4.5vw, 48px)",
              fontWeight: 400,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
              margin: "var(--s-3) 0 var(--s-3)",
            }}
          >
            Curate the{" "}
            <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>
              expert bench.
            </em>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="lf-section-deck"
            style={{ maxWidth: 640, fontStyle: "italic" }}
          >
            Vet applications, manage active experts, badges, and the public
            question queue from a single console.
          </motion.p>
        </motion.section>

        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <Tabs defaultValue={tab}>
            <div className="-mx-4 px-4 overflow-x-auto no-scrollbar sm:mx-0 sm:px-0 sm:overflow-visible">
              <TabsList>
                <TabsTrigger value="experts">{t("admin.experts.tab.experts")}</TabsTrigger>
                <TabsTrigger value="applications">{t("admin.experts.tab.applications")}</TabsTrigger>
                <TabsTrigger value="questions">{t("admin.experts.tab.questions")}</TabsTrigger>
                <TabsTrigger value="badges">{t("admin.experts.tab.badges")}</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="experts"><ExpertsTab /></TabsContent>
            <TabsContent value="applications"><ApplicationsTab /></TabsContent>
            <TabsContent value="questions"><QuestionsTab /></TabsContent>
            <TabsContent value="badges"><BadgesTab /></TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </MotionConfig>
  );
}
