"use client";

import { IntegrationPendingCard } from "@/components/admin/analytics/integration-pending";
import { PanelCard } from "@/components/admin/analytics/_panel-card";
import {
  MotionItem,
  MotionStagger,
} from "@/components/admin/analytics/_motion";

const UNLOCKED_BY = "Payment provider webhook (Stripe / SSLCommerz / bKash)";
const TIMELINE = "Phase 2 — after payments";

export function ChurnRiskTab() {
  return (
    <MotionStagger className="grid grid-cols-12 gap-4 sm:gap-6">
      <div className="col-span-12 flex flex-col gap-1 pt-2">
        <span className="font-jetbrains uppercase text-[10px] tracking-[0.18em] text-muted-foreground">
          Phase 2 · Retention
        </span>
        <h2 className="font-fraunces font-light text-2xl tracking-tight">
          Churn risk surface
        </h2>
        <p className="text-sm text-muted-foreground">
          Pending payment integration. Targets visible; scoring activates once
          billing events flow.
        </p>
      </div>

      <MotionItem className="col-span-12 md:col-span-6 lg:col-span-4">
        <IntegrationPendingCard
          title="At-risk paid users"
          body="Paid customers with a Churn Risk Score ≥ 5, derived from usage decay, support pings, and payment-event signals."
          unlockedBy={UNLOCKED_BY}
          status="not-connected"
          pillLabel="Pending payment integration"
          estimatedTimeline={TIMELINE}
          targetValue="< 10% of paid base"
        />
      </MotionItem>

      <MotionItem className="col-span-12 md:col-span-6 lg:col-span-4">
        <IntegrationPendingCard
          title="High-CRS new subscribers"
          body="Customers in their first 30 days who already score ≥ 5 — the population most likely to churn before activation."
          unlockedBy={UNLOCKED_BY}
          status="not-connected"
          pillLabel="Pending payment integration"
          estimatedTimeline={TIMELINE}
        />
      </MotionItem>

      <MotionItem className="col-span-12 md:col-span-12 lg:col-span-4">
        <IntegrationPendingCard
          title="Churn-reasons word cloud"
          body="Aggregated free-text reasons captured from cancellation surveys, ranked by frequency."
          unlockedBy="cancellation_survey_submitted event + payment webhook"
          status="not-connected"
          pillLabel="Pending payment integration"
          estimatedTimeline={TIMELINE}
        />
      </MotionItem>

      <MotionItem className="col-span-12">
        <PanelCard
          title="At-risk paid users list"
          description="Will populate once payment events start flowing"
          variant="ambient"
        >
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center">
            <span className="font-fraunces text-3xl font-light leading-none text-muted-foreground/70">
              0 paid users
            </span>
            <span className="text-xs text-muted-foreground">
              Churn Risk Score activates once billing webhook is wired.
            </span>
          </div>
        </PanelCard>
      </MotionItem>
    </MotionStagger>
  );
}
