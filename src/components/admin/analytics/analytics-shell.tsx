"use client";

import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import {
  useDateRange,
  type RangeKey,
} from "@/components/admin/analytics/date-range-context";
import { OverviewTab } from "@/components/admin/analytics/tabs/overview-tab";
import { ConversionTab } from "@/components/admin/analytics/tabs/conversion-tab";
import { JourneysTab } from "@/components/admin/analytics/tabs/journeys-tab";
import { ReplayHeatTab } from "@/components/admin/analytics/tabs/replay-heat-tab";
import { ErrorsTab } from "@/components/admin/analytics/tabs/errors-tab";
import { RevenueTab } from "@/components/admin/analytics/tabs/revenue-tab";
import { ChurnRiskTab } from "@/components/admin/analytics/tabs/churn-risk-tab";
import { AutoReportsTab } from "@/components/admin/analytics/tabs/auto-reports-tab";
import { EmailTriggersTab } from "@/components/admin/analytics/tabs/email-triggers-tab";
import { LaunchCampaignsTab } from "@/components/admin/analytics/tabs/launch-campaigns-tab";
import { IntegrationPendingCard } from "@/components/admin/analytics/integration-pending";
import { AnalyticsTab as EmailRoutingAnalytics } from "@/app/admin/email/analytics-tab";
import { AnalyticsTab as AIIntentAnalytics } from "@/components/admin/ai-framework/analytics-tab";
import type { AnalyticsRole } from "@/lib/admin-guard";

const RANGES: RangeKey[] = ["24h", "7d", "30d", "90d"];

interface TabDef {
  value: string;
  label: string;
  pending?: boolean;
  allowedRoles?: ReadonlyArray<AnalyticsRole>;
}

interface GroupDef {
  value: string;
  label: string;
  tabs: ReadonlyArray<TabDef>;
}

const GROUPS: ReadonlyArray<GroupDef> = [
  {
    value: "behavior",
    label: "Behavior",
    tabs: [
      {
        value: "overview",
        label: "Overview",
        allowedRoles: ["super_admin", "growth_admin", "tech_admin", "read_only"],
      },
      {
        value: "conversion",
        label: "Conversion",
        allowedRoles: ["super_admin", "growth_admin", "tech_admin"],
      },
      {
        value: "journeys",
        label: "Journeys",
        allowedRoles: ["super_admin", "growth_admin", "tech_admin"],
      },
      {
        value: "replay-heat",
        label: "Replay & Heat",
        allowedRoles: ["super_admin", "growth_admin", "tech_admin"],
      },
      {
        value: "errors",
        label: "Errors & Flags",
        allowedRoles: ["super_admin", "growth_admin", "tech_admin"],
      },
    ],
  },
  {
    value: "email",
    label: "Email",
    tabs: [
      {
        value: "routing",
        label: "Routing & Delivery",
        allowedRoles: ["super_admin", "growth_admin", "tech_admin"],
      },
      {
        value: "triggers",
        label: "Triggers",
        pending: true,
        allowedRoles: ["super_admin", "growth_admin"],
      },
      {
        value: "campaigns",
        label: "Campaigns",
        pending: true,
        allowedRoles: ["super_admin", "growth_admin"],
      },
    ],
  },
  {
    value: "ai-framework",
    label: "AI Framework",
    tabs: [
      {
        value: "intent",
        label: "Intent & Tier",
        allowedRoles: ["super_admin", "tech_admin"],
      },
    ],
  },
  {
    value: "growth",
    label: "Growth",
    tabs: [
      {
        value: "revenue",
        label: "Revenue",
        pending: true,
        allowedRoles: ["super_admin", "growth_admin"],
      },
      {
        value: "churn-risk",
        label: "Churn Risk",
        pending: true,
        allowedRoles: ["super_admin", "growth_admin"],
      },
      {
        value: "auto-reports",
        label: "Auto-Reports",
        pending: true,
        allowedRoles: ["super_admin", "growth_admin"],
      },
      {
        value: "launch-campaigns",
        label: "Launch Campaigns",
        pending: true,
        allowedRoles: ["super_admin", "growth_admin"],
      },
    ],
  },
];

const TAB_RENDER: Record<string, () => React.ReactNode> = {
  // behavior
  overview: () => <OverviewTab />,
  conversion: () => <ConversionTab />,
  journeys: () => <JourneysTab />,
  "replay-heat": () => <ReplayHeatTab />,
  errors: () => <ErrorsTab />,
  // email
  routing: () => <EmailRoutingAnalytics />,
  triggers: () => <EmailTriggersTab />,
  campaigns: () => (
    <IntegrationPendingCard
      title="Email campaigns analytics"
      body="Send-rate, opens, clicks, and unsubscribes will surface here once the campaign tracker ships."
      unlockedBy="Email campaign tracker"
      status="not-connected"
      estimatedTimeline="Phase 2 — after triggers"
      pillLabel="Pending campaign launch"
    />
  ),
  // ai-framework
  intent: () => <AIIntentAnalytics />,
  // growth
  revenue: () => <RevenueTab />,
  "churn-risk": () => <ChurnRiskTab />,
  "auto-reports": () => <AutoReportsTab />,
  "launch-campaigns": () => <LaunchCampaignsTab />,
};

interface PublicMetadata {
  role?: string;
  analytics_role?: string;
}

function resolveAnalyticsRole(
  meta: PublicMetadata | undefined,
): AnalyticsRole | null {
  const explicit = meta?.analytics_role;
  if (
    explicit === "super_admin" ||
    explicit === "growth_admin" ||
    explicit === "tech_admin" ||
    explicit === "read_only"
  ) {
    return explicit;
  }
  if (meta?.role === "admin") return "super_admin";
  return null;
}

export function AnalyticsShell() {
  const { range, setRange, refresh } = useDateRange();
  const [spinTick, setSpinTick] = useState(0);
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const role = useMemo<AnalyticsRole | null>(() => {
    if (!isLoaded) return null;
    return resolveAnalyticsRole(user?.publicMetadata as PublicMetadata | undefined);
  }, [isLoaded, user]);

  const isTabVisible = useMemo(
    () => (t: TabDef) =>
      !t.allowedRoles || (role !== null && t.allowedRoles.includes(role)),
    [role],
  );

  const visibleGroups = useMemo(() => {
    if (!role) return [] as ReadonlyArray<GroupDef>;
    return GROUPS.map((g) => ({
      ...g,
      tabs: g.tabs.filter(isTabVisible),
    })).filter((g) => g.tabs.length > 0);
  }, [role, isTabVisible]);

  const urlGroup = searchParams.get("d");
  const urlTab = searchParams.get("t");

  const activeGroup = useMemo(() => {
    const found = visibleGroups.find((g) => g.value === urlGroup);
    return found ?? visibleGroups[0] ?? null;
  }, [urlGroup, visibleGroups]);

  const activeTab = useMemo(() => {
    if (!activeGroup) return null;
    const found = activeGroup.tabs.find((t) => t.value === urlTab);
    return found ?? activeGroup.tabs[0] ?? null;
  }, [urlTab, activeGroup]);

  const setActive = (groupValue: string, tabValue: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("d", groupValue);
    next.set("t", tabValue);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const handleGroupChange = (groupValue: string) => {
    const group = visibleGroups.find((g) => g.value === groupValue);
    const firstTab = group?.tabs[0]?.value;
    if (group && firstTab) setActive(group.value, firstTab);
  };

  const handleTabChange = (tabValue: string) => {
    if (activeGroup) setActive(activeGroup.value, tabValue);
  };

  const handleRefresh = () => {
    refresh();
    setSpinTick((n) => n + 1);
  };

  return (
    <div className="relative flex flex-col gap-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(ellipse_at_top,color-mix(in oklab, var(--p-blue) 10%, transparent),transparent_55%)]"
      />

      <header className="flex flex-col gap-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Analytics</BreadcrumbPage>
            </BreadcrumbItem>
            {activeGroup ? (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{activeGroup.label}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : null}
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="relative inline-flex h-2 w-2">
                <span
                  aria-hidden
                  className="absolute inline-flex h-full w-full animate-ping rounded-full"
                  style={{ backgroundColor: "var(--p-blue-hi)", opacity: 0.5 }}
                />
                <span
                  aria-hidden
                  className="relative inline-flex h-2 w-2 rounded-full"
                  style={{ backgroundColor: "var(--p-blue-hi)" }}
                />
              </span>
              <span className="font-jetbrains uppercase text-[10px] tracking-[0.18em] text-muted-foreground">
                Live · range {range.toUpperCase()}
              </span>
            </div>
            <h1 className="font-fraunces font-light text-3xl sm:text-4xl tracking-tight">
              Product analytics
            </h1>
            <p className="text-muted-foreground text-sm max-w-2xl">
              Live telemetry across behavior, email, AI framework, and growth.
              All ranges relative to now.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ToggleGroup
              type="single"
              value={range}
              onValueChange={(v) => {
                if (v) setRange(v as RangeKey);
              }}
              variant="outline"
              size="sm"
              aria-label="Time range"
              className="bg-card/60 backdrop-blur-sm"
            >
              {RANGES.map((r) => (
                <ToggleGroupItem
                  key={r}
                  value={r}
                  className="font-jetbrains uppercase text-[11px] tracking-[0.16em]"
                >
                  {r}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              aria-label="Refresh"
              className="gap-2 bg-card/60 backdrop-blur-sm"
            >
              <RefreshCw
                key={spinTick}
                className={cn(
                  "h-4 w-4",
                  spinTick > 0 && "animate-[spin_600ms_ease-out_1]",
                )}
              />
              <span className="font-jetbrains uppercase text-[11px] tracking-[0.16em]">
                Refresh
              </span>
            </Button>
          </div>
        </div>
      </header>

      {activeGroup && activeTab ? (
        <div className="flex flex-col gap-4">
          {/* Top-level domain switcher */}
          <div className="sticky top-0 z-20 -mx-4 sm:-mx-0 bg-background/85 px-4 sm:px-0 py-2 backdrop-blur-md">
            <Tabs value={activeGroup.value} onValueChange={handleGroupChange}>
              <ScrollArea className="w-full">
                <TabsList className="inline-flex h-auto w-max gap-1 bg-muted/40 p-1">
                  {visibleGroups.map((g) => (
                    <TabsTrigger
                      key={g.value}
                      value={g.value}
                      className={cn(
                        "font-jetbrains uppercase text-[11px] tracking-[0.18em]",
                        "data-[state=active]:bg-card data-[state=active]:shadow-sm",
                        "data-[state=active]:text-foreground",
                        "transition-all duration-200",
                      )}
                    >
                      {g.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <ScrollBar orientation="horizontal" className="h-1.5" />
              </ScrollArea>
            </Tabs>
          </div>

          {/* Sub-tab switcher (per group) */}
          {activeGroup.tabs.length > 1 ? (
            <div className="-mx-4 sm:-mx-0 px-4 sm:px-0">
              <Tabs value={activeTab.value} onValueChange={handleTabChange}>
                <ScrollArea className="w-full">
                  <TabsList className="inline-flex h-auto w-max gap-1 bg-transparent p-0 border-b border-border/60 rounded-none">
                    {activeGroup.tabs.map((t) => (
                      <TabsTrigger
                        key={t.value}
                        value={t.value}
                        className={cn(
                          "font-jetbrains uppercase text-[10px] tracking-[0.14em]",
                          "rounded-none border-b-2 border-transparent",
                          "data-[state=active]:border-foreground",
                          "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                          "transition-all duration-200 px-3",
                        )}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {t.label}
                          {t.pending ? (
                            <span
                              aria-label="Pending integration"
                              className={cn(
                                "rounded-full border px-1.5 py-0.5 text-[9px] tracking-[0.12em]",
                                "border-amber-700/30 bg-amber-50/40 text-amber-800",
                                "dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200/80",
                              )}
                            >
                              Pending
                            </span>
                          ) : null}
                        </span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <ScrollBar orientation="horizontal" className="h-1.5" />
                </ScrollArea>
              </Tabs>
            </div>
          ) : null}

          {/* Active tab content */}
          <div key={`${activeGroup.value}/${activeTab.value}`}>
            {TAB_RENDER[activeTab.value]?.() ?? null}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border/60 px-6 py-16 text-center text-sm text-muted-foreground">
          No analytics surfaces are available for your role.
        </div>
      )}
    </div>
  );
}
