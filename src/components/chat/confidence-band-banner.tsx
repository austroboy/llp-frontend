"use client";

import { motion, AnimatePresence } from "motion/react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert, ShieldX } from "lucide-react";
import type { ConfidenceBand } from "@/app/api/chat/confidence-band";

const STYLE = {
  partial: { icon: ShieldAlert, ring: "ring-amber-500/30", bg: "bg-amber-500/5" },
  disagree: { icon: ShieldX, ring: "ring-red-500/30", bg: "bg-red-500/5" },
} as const;

export function ConfidenceBandBanner({ band }: { band: ConfidenceBand | null | undefined }) {
  if (!band) return null;
  const { icon: Icon, ring, bg } = STYLE[band.severity];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
      >
        <Alert className={`mb-3 ring-1 ${ring} ${bg}`}>
          <Icon className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <span className="font-medium">{band.message}</span>
            {band.unverified_sections.length > 0 && (
              <span className="block mt-1 text-xs text-muted-foreground">
                Unverified:{" "}
                {band.unverified_sections
                  .map((s) => `§${s.section} (${s.document_id})`)
                  .join(", ")}
              </span>
            )}
          </AlertDescription>
        </Alert>
      </motion.div>
    </AnimatePresence>
  );
}
