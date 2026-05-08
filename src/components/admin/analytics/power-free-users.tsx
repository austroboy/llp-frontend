"use client";

import {
  EngagementPanelShell,
  useEngagementPanel,
} from "@/components/admin/analytics/engagement-panel-shared";

export function PowerFreeUsersPanel() {
  const state = useEngagementPanel("power_users");
  return (
    <EngagementPanelShell
      folio="§ Engagement / Power"
      title="Power Free Users"
      blurb="Score ≤ -2. Upsell list when paid tier launches."
      state={state}
      emptyHint="No power-user candidates yet — cron may not have run."
    />
  );
}
