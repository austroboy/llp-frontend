"use client";

import {
  EngagementPanelShell,
  useEngagementPanel,
} from "@/components/admin/analytics/engagement-panel-shared";

export function AtRiskFreeUsersPanel() {
  const state = useEngagementPanel("at_risk");
  return (
    <EngagementPanelShell
      folio="§ Engagement / At-risk"
      title="At-risk Free Users"
      blurb="Score ≥ 4. List for re-engagement when email automation arrives."
      state={state}
      emptyHint="No free users above the at-risk threshold."
    />
  );
}
