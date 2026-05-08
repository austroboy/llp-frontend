"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { fireNotification } from "@/lib/notify";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Award, Trash2, Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import {
  BADGE_CONFIG,
  BADGE_ICON_MAP,
  BADGE_ICON_NAMES,
  getBadgeDisplay,
  getBadgeIcon,
} from "@/lib/badge-utils";

const BADGE_OPTIONS = [
  { value: "top_rated", labelKey: "admin.badges.top_rated" },
  { value: "quick_responder", labelKey: "admin.badges.quick_responder" },
  { value: "ten_sessions", labelKey: "admin.badges.ten_sessions" },
  { value: "repeat_clients", labelKey: "admin.badges.repeat_clients" },
  { value: "custom", labelKey: "Custom" },
];

export function BadgesTab() {
  const { t } = useLanguage();
  const { user } = useUser();

  const [selectedExpertId, setSelectedExpertId] = useState<string>("");
  const [selectedBadge, setSelectedBadge] = useState<string>("");
  const [customLabel, setCustomLabel] = useState("");
  const [selectedIcon, setSelectedIcon] = useState<string>("");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [awarding, setAwarding] = useState(false);
  const [editingIconId, setEditingIconId] = useState<string | null>(null);

  const experts = useQuery(api.experts.list, {});
  const allBadges = useQuery(api.expertBadges.listAll);
  const awardBadge = useMutation(api.expertBadges.award);
  const updateBadgeIcon = useMutation(api.expertBadges.updateIcon);
  const revokeBadge = useMutation(api.expertBadges.revoke);

  // Build expert name lookup
  const expertMap = new Map<string, { name: string; designation: string }>();
  if (experts) {
    for (const e of experts) {
      expertMap.set(e._id, { name: e.name, designation: e.designation });
    }
  }

  // When selecting a predefined badge, auto-set its default icon
  const handleBadgeChange = (value: string) => {
    setSelectedBadge(value);
    if (value !== "custom" && BADGE_CONFIG[value]?.defaultIcon) {
      setSelectedIcon(BADGE_CONFIG[value].defaultIcon);
    } else if (value === "custom") {
      // Keep current icon selection or clear
      if (!selectedIcon) setSelectedIcon("");
    }
  };

  const canAward =
    selectedExpertId &&
    selectedBadge &&
    (selectedBadge !== "custom" || customLabel.trim().length > 0);

  const handleAward = async () => {
    if (!canAward || !user) return;
    setAwarding(true);
    try {
      const badgeValue =
        selectedBadge === "custom" ? customLabel.trim() : selectedBadge;
      const awardedBy = user.fullName || user.primaryEmailAddress?.emailAddress || user.id;
      await awardBadge({
        expertId: selectedExpertId as Id<"experts">,
        badge: badgeValue,
        icon: selectedIcon || undefined,
        awardedBy,
      });
      // Notify expert about badge
      const expert = experts?.find((e) => e._id === selectedExpertId);
      if (expert?.email) {
        fireNotification("expert_badge_awarded", {
          expertName: expert.name,
          expertEmail: expert.email,
          badge: badgeValue,
          awardedBy,
        });
      }
      // Reset form
      setSelectedBadge("");
      setCustomLabel("");
      setSelectedIcon("");
    } finally {
      setAwarding(false);
    }
  };

  const handleRevoke = async (id: Id<"expertBadges">) => {
    await revokeBadge({ id });
  };

  const SelectedIconComponent = selectedIcon ? BADGE_ICON_MAP[selectedIcon]?.icon : null;

  return (
    <div className="space-y-3 sm:space-y-6 mt-3 sm:mt-4">
      {/* Award section */}
      <div className="rounded-xl sm:rounded-2xl border border-border bg-card p-3.5 sm:p-6">
        <h3 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <Award className="size-3.5 sm:size-4" />
          {t("admin.badges.title")}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 items-end">
          {/* Expert dropdown */}
          <div className="space-y-1.5">
            <Label className="text-sm">{t("admin.badges.selectExpert")}</Label>
            <Select value={selectedExpertId} onValueChange={setSelectedExpertId}>
              <SelectTrigger>
                <SelectValue placeholder={t("admin.badges.selectExpert")} />
              </SelectTrigger>
              <SelectContent>
                {experts?.map((expert) => (
                  <SelectItem key={expert._id} value={expert._id}>
                    <span className="font-medium">{expert.name}</span>
                    <span className="text-muted-foreground ml-1.5 text-xs">
                      {expert.designation}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Badge select */}
          <div className="space-y-1.5">
            <Label className="text-sm">{t("admin.badges.selectBadge")}</Label>
            <Select value={selectedBadge} onValueChange={handleBadgeChange}>
              <SelectTrigger>
                <SelectValue placeholder={t("admin.badges.selectBadge")} />
              </SelectTrigger>
              <SelectContent>
                {BADGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.value === "custom" ? opt.labelKey : t(opt.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom badge label (conditional) */}
          {selectedBadge === "custom" && (
            <div className="space-y-1.5">
              <Label className="text-sm">{t("admin.badges.customLabel")}</Label>
              <Input
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder={t("admin.badges.customLabel")}
              />
            </div>
          )}

          {/* Icon picker */}
          <div className="space-y-1.5">
            <Label className="text-sm">Icon</Label>
            <Popover open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 font-normal"
                >
                  {SelectedIconComponent ? (
                    <>
                      <SelectedIconComponent className="size-4" />
                      <span className="text-sm">{BADGE_ICON_MAP[selectedIcon]?.label}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground text-sm">Choose icon...</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3" align="start">
                <div className="grid grid-cols-6 gap-1.5">
                  {BADGE_ICON_NAMES.map((name) => {
                    const IconComp = BADGE_ICON_MAP[name].icon;
                    const isSelected = selectedIcon === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        title={BADGE_ICON_MAP[name].label}
                        className={cn(
                          "relative flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-accent",
                          isSelected && "bg-primary/10 ring-2 ring-primary"
                        )}
                        onClick={() => {
                          setSelectedIcon(name);
                          setIconPickerOpen(false);
                        }}
                      >
                        <IconComp className="size-5" />
                        {isSelected && (
                          <Check className="absolute -top-0.5 -right-0.5 size-3 text-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
                {selectedIcon && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 w-full text-xs text-muted-foreground"
                    onClick={() => {
                      setSelectedIcon("");
                      setIconPickerOpen(false);
                    }}
                  >
                    Clear icon
                  </Button>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Award button */}
          <div>
            <Button
              onClick={handleAward}
              disabled={!canAward || awarding}
              className="rounded-full w-full sm:w-auto"
            >
              <Award className="size-4 mr-1.5" />
              {t("admin.badges.award")}
            </Button>
          </div>
        </div>
      </div>

      {/* Active badges */}
      <div className="rounded-xl sm:rounded-2xl border border-border bg-card">
        {!allBadges ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {t("admin.loading")}
          </div>
        ) : allBadges.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No badges awarded yet.
          </div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="divide-y divide-border/50 sm:hidden p-3.5">
              {allBadges.map((b) => {
                const display = getBadgeDisplay(b.badge);
                const IconComp = getBadgeIcon(b.badge, b.icon);
                const expert = expertMap.get(b.expertId);
                const isEditingIcon = editingIconId === b._id;
                return (
                  <div key={b._id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium leading-snug">
                          {expert?.name ?? "Unknown"}
                        </p>
                        {expert?.designation && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">{expert.designation}</p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <Badge
                            variant="secondary"
                            className={cn("text-[10px] px-1.5 py-0 gap-1", display.color)}
                          >
                            {IconComp && <IconComp className="size-2.5" />}
                            {display.label}
                          </Badge>
                          <Popover
                            open={isEditingIcon}
                            onOpenChange={(open) => setEditingIconId(open ? b._id : null)}
                          >
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                              >
                                <Pencil className="size-2.5" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-3" align="start">
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                Choose icon for &quot;{display.label}&quot;
                              </p>
                              <div className="grid grid-cols-6 gap-1.5">
                                {BADGE_ICON_NAMES.map((name) => {
                                  const Ic = BADGE_ICON_MAP[name].icon;
                                  const currentIcon = b.icon || BADGE_CONFIG[b.badge]?.defaultIcon;
                                  const isCurrent = currentIcon === name;
                                  return (
                                    <button
                                      key={name}
                                      type="button"
                                      title={BADGE_ICON_MAP[name].label}
                                      className={cn(
                                        "relative flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-accent",
                                        isCurrent && "bg-primary/10 ring-2 ring-primary"
                                      )}
                                      onClick={async () => {
                                        await updateBadgeIcon({ id: b._id, icon: name });
                                        setEditingIconId(null);
                                      }}
                                    >
                                      <Ic className="size-5" />
                                      {isCurrent && (
                                        <Check className="absolute -top-0.5 -right-0.5 size-3 text-primary" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                              {(b.icon || BADGE_CONFIG[b.badge]?.defaultIcon) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mt-2 w-full text-xs text-muted-foreground"
                                  onClick={async () => {
                                    await updateBadgeIcon({ id: b._id, icon: undefined });
                                    setEditingIconId(null);
                                  }}
                                >
                                  Remove icon
                                </Button>
                              )}
                            </PopoverContent>
                          </Popover>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(b.awardedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-red-600 shrink-0"
                        onClick={() => handleRevoke(b._id)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Desktop: table */}
            <Table className="hidden sm:table">
              <TableHeader>
                <TableRow>
                  <TableHead>Expert</TableHead>
                  <TableHead>Badge</TableHead>
                  <TableHead>Awarded</TableHead>
                  <TableHead>Awarded By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allBadges.map((b) => {
                  const display = getBadgeDisplay(b.badge);
                  const IconComp = getBadgeIcon(b.badge, b.icon);
                  const expert = expertMap.get(b.expertId);
                  const isEditingIcon = editingIconId === b._id;
                  return (
                    <TableRow key={b._id}>
                      <TableCell>
                        <span className="font-medium">
                          {expert?.name ?? "Unknown"}
                        </span>
                        {expert?.designation && (
                          <span className="text-xs text-muted-foreground ml-1.5">
                            {expert.designation}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="secondary"
                            className={cn("text-[11px] gap-1", display.color)}
                          >
                            {IconComp && <IconComp className="size-3" />}
                            {display.label}
                          </Badge>
                          <Popover
                            open={isEditingIcon}
                            onOpenChange={(open) => setEditingIconId(open ? b._id : null)}
                          >
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                title="Change icon"
                                className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                              >
                                <Pencil className="size-3" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-3" align="start">
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                Choose icon for &quot;{display.label}&quot;
                              </p>
                              <div className="grid grid-cols-6 gap-1.5">
                                {BADGE_ICON_NAMES.map((name) => {
                                  const Ic = BADGE_ICON_MAP[name].icon;
                                  const currentIcon = b.icon || BADGE_CONFIG[b.badge]?.defaultIcon;
                                  const isCurrent = currentIcon === name;
                                  return (
                                    <button
                                      key={name}
                                      type="button"
                                      title={BADGE_ICON_MAP[name].label}
                                      className={cn(
                                        "relative flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-accent",
                                        isCurrent && "bg-primary/10 ring-2 ring-primary"
                                      )}
                                      onClick={async () => {
                                        await updateBadgeIcon({ id: b._id, icon: name });
                                        setEditingIconId(null);
                                      }}
                                    >
                                      <Ic className="size-5" />
                                      {isCurrent && (
                                        <Check className="absolute -top-0.5 -right-0.5 size-3 text-primary" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                              {(b.icon || BADGE_CONFIG[b.badge]?.defaultIcon) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mt-2 w-full text-xs text-muted-foreground"
                                  onClick={async () => {
                                    await updateBadgeIcon({ id: b._id, icon: undefined });
                                    setEditingIconId(null);
                                  }}
                                >
                                  Remove icon
                                </Button>
                              )}
                            </PopoverContent>
                          </Popover>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(b.awardedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {b.awardedBy}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => handleRevoke(b._id)}
                        >
                          <Trash2 className="size-3.5 mr-1" />
                          {t("admin.badges.revoke")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}
      </div>
    </div>
  );
}
