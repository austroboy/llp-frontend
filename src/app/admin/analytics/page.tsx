"use client";

import { DateRangeProvider } from "@/components/admin/analytics/date-range-context";
import { AnalyticsShell } from "@/components/admin/analytics/analytics-shell";
import { motion, MotionConfig, type Variants } from "framer-motion";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};

export default function AnalyticsPage() {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div initial="hidden" animate="show" variants={fadeUp}>
        <DateRangeProvider>
          <AnalyticsShell />
        </DateRangeProvider>
      </motion.div>
    </MotionConfig>
  );
}
