"use client";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { ReplayCard } from "@/components/admin/analytics/replay-card";
import { PanelCard } from "@/components/admin/analytics/_panel-card";
import {
  MotionItem,
  MotionStagger,
} from "@/components/admin/analytics/_motion";

const POSTHOG_BASE = "https://us.posthog.com/project/337565";

export function ReplayHeatTab() {
  return (
    <MotionStagger className="grid grid-cols-12 gap-4 sm:gap-6">
      <div className="col-span-12 flex flex-col gap-1 pt-2">
        <span className="font-jetbrains uppercase text-[10px] tracking-[0.18em] text-muted-foreground">
          PostHog · Sessions
        </span>
        <h2 className="font-fraunces font-light text-2xl tracking-tight">
          Replays & heatmaps
        </h2>
      </div>

      <MotionItem className="col-span-12 sm:col-span-6 lg:col-span-3">
        <ReplayCard
          title="Recent replays"
          description="Session recordings in PostHog."
          href={`${POSTHOG_BASE}/replay`}
          icon="play"
        />
      </MotionItem>
      <MotionItem className="col-span-12 sm:col-span-6 lg:col-span-3">
        <ReplayCard
          title="Heatmaps"
          description="Click & scroll heatmaps."
          href={`${POSTHOG_BASE}/heatmaps`}
          icon="flame"
        />
      </MotionItem>
      <MotionItem className="col-span-12 sm:col-span-6 lg:col-span-3">
        <ReplayCard
          title="Surveys"
          description="In-product survey responses."
          href={`${POSTHOG_BASE}/surveys`}
          icon="survey"
        />
      </MotionItem>
      <MotionItem className="col-span-12 sm:col-span-6 lg:col-span-3">
        <ReplayCard
          title="Cohorts"
          description="User cohorts & segments."
          href={`${POSTHOG_BASE}/cohorts`}
          icon="users"
        />
      </MotionItem>

      <MotionItem className="col-span-12">
        <PanelCard title="Recent sessions" variant="ambient">
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Coming soon</EmptyTitle>
              <EmptyDescription>
                Session list via PostHog Sessions API.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </PanelCard>
      </MotionItem>
    </MotionStagger>
  );
}
