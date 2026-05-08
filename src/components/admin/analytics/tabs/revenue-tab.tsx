"use client";

import { IntegrationPendingCard } from "@/components/admin/analytics/integration-pending";
import {
  MotionItem,
  MotionStagger,
} from "@/components/admin/analytics/_motion";

const UNLOCKED_BY = "Payment provider webhook (Stripe / SSLCommerz / bKash)";
const TIMELINE = "Phase 2 — after payments";

interface RevenueMetric {
  title: string;
  body: string;
  target?: string;
}

const REVENUE_METRICS: RevenueMetric[] = [
  {
    title: "Monthly Recurring Revenue",
    body: "Sum of normalised monthly subscription value across all active paid customers.",
    target: "≥ ৳50K / month",
  },
  {
    title: "New MRR",
    body: "MRR added by net-new paid customers in the selected window.",
  },
  {
    title: "Churned MRR",
    body: "MRR lost from cancellations and downgrades in the selected window.",
  },
  {
    title: "Expansion MRR",
    body: "MRR gained from existing customers upgrading or adding seats.",
  },
  {
    title: "Net New MRR",
    body: "New MRR + Expansion MRR − Churned MRR — the headline growth signal.",
    target: "Positive every month",
  },
  {
    title: "ARPU",
    body: "Average revenue per paying user across the active paid base.",
  },
  {
    title: "LTV",
    body: "Estimated lifetime value of a paying user, based on ARPU and observed churn.",
  },
  {
    title: "CAC",
    body: "Blended customer acquisition cost — paid spend divided by net-new paid customers.",
  },
  {
    title: "LTV : CAC ratio",
    body: "Headline efficiency ratio. Healthy SaaS sits at or above 3:1.",
    target: "≥ 3 : 1",
  },
  {
    title: "Revenue Run Rate",
    body: "MRR × 12 — the annualised view used for trajectory tracking.",
  },
];

export function RevenueTab() {
  return (
    <MotionStagger className="grid grid-cols-12 gap-4 sm:gap-6">
      <div className="col-span-12 flex flex-col gap-1 pt-2">
        <span className="font-jetbrains uppercase text-[10px] tracking-[0.18em] text-muted-foreground">
          Phase 2 · Revenue
        </span>
        <h2 className="font-fraunces font-light text-2xl tracking-tight">
          Subscription metrics
        </h2>
        <p className="text-sm text-muted-foreground">
          Pending payment-provider integration. Targets defined; data wiring
          comes online with Stripe / SSLCommerz / bKash webhooks.
        </p>
      </div>
      {REVENUE_METRICS.map((metric) => (
        <MotionItem
          key={metric.title}
          className="col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-3"
        >
          <IntegrationPendingCard
            title={metric.title}
            body={metric.body}
            unlockedBy={UNLOCKED_BY}
            status="not-connected"
            pillLabel="Pending payment integration"
            estimatedTimeline={TIMELINE}
            targetValue={metric.target}
          />
        </MotionItem>
      ))}
    </MotionStagger>
  );
}
