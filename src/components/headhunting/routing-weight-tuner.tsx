"use client";

import { useState, useCallback, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  RotateCcw,
  Save,
  AlertTriangle,
  CheckCircle,
  Sliders,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Weight Dimensions ─────────────────────────────────────────

interface WeightDimension {
  key: string;
  label: string;
  description: string;
  defaultValue: number;
}

const WEIGHT_DIMENSIONS: WeightDimension[] = [
  {
    key: "functionFit",
    label: "Function Specialization Fit",
    description: "How well the scout's function expertise matches the role",
    defaultValue: 25,
  },
  {
    key: "sectorFit",
    label: "Industry / Sector Fit",
    description: "Overlap between scout's industry coverage and role's sector",
    defaultValue: 20,
  },
  {
    key: "levelFit",
    label: "Role-Level Suitability",
    description: "Whether the scout's reach covers this seniority band",
    defaultValue: 15,
  },
  {
    key: "geographyFit",
    label: "Geography / Market Coverage",
    description: "Scout's coverage of the target geography",
    defaultValue: 10,
  },
  {
    key: "historicalSuccess",
    label: "Historical Success",
    description: "Past placement and shortlist track record",
    defaultValue: 10,
  },
  {
    key: "networkDepth",
    label: "Network Depth",
    description: "Depth of scout's network in relevant sectors",
    defaultValue: 10,
  },
  {
    key: "responseQuality",
    label: "Response Quality",
    description: "Quality metrics from previous submissions",
    defaultValue: 5,
  },
  {
    key: "languageFit",
    label: "Language / Cross-border",
    description: "Language capabilities and cross-border experience",
    defaultValue: 5,
  },
];

const DEFAULT_WEIGHTS: Record<string, number> = {};
for (const dim of WEIGHT_DIMENSIONS) {
  DEFAULT_WEIGHTS[dim.key] = dim.defaultValue;
}

// ─── Types ─────────────────────────────────────────────────────

interface RoutingWeightTunerProps {
  blueprintId: Id<"htRoleBlueprints">;
  initialWeights?: Record<string, number>;
  onWeightsChanged?: (weights: Record<string, number>) => void;
  onClose?: () => void;
}

// ─── Component ─────────────────────────────────────────────────

export function RoutingWeightTuner({
  blueprintId,
  initialWeights,
  onWeightsChanged,
  onClose,
}: RoutingWeightTunerProps) {
  const setRoutingWeights = useMutation(
    api.headhunting.routing.setRoutingWeights
  );

  const [weights, setWeights] = useState<Record<string, number>>(() => {
    if (initialWeights && Object.keys(initialWeights).length > 0) {
      // If weights are stored as decimals (0-1), convert to percentages (0-100)
      const sum = Object.values(initialWeights).reduce((s, v) => s + v, 0);
      if (sum <= 2) {
        // Likely stored as decimals
        const converted: Record<string, number> = {};
        for (const [key, value] of Object.entries(initialWeights)) {
          converted[key] = Math.round(value * 100);
        }
        return { ...DEFAULT_WEIGHTS, ...converted };
      }
      return { ...DEFAULT_WEIGHTS, ...initialWeights };
    }
    return { ...DEFAULT_WEIGHTS };
  });
  const [saving, setSaving] = useState(false);

  const total = useMemo(
    () => Object.values(weights).reduce((sum, v) => sum + v, 0),
    [weights]
  );

  const isBalanced = total === 100;
  const isDefault = useMemo(
    () =>
      WEIGHT_DIMENSIONS.every(
        (dim) => weights[dim.key] === dim.defaultValue
      ),
    [weights]
  );

  const handleSliderChange = useCallback(
    (key: string, value: number) => {
      const newWeights = { ...weights, [key]: value };
      setWeights(newWeights);
      onWeightsChanged?.(newWeights);
    },
    [weights, onWeightsChanged]
  );

  const handleReset = useCallback(() => {
    setWeights({ ...DEFAULT_WEIGHTS });
    onWeightsChanged?.({ ...DEFAULT_WEIGHTS });
  }, [onWeightsChanged]);

  const handleSave = async () => {
    if (!isBalanced) {
      toast.error("Weights must sum to 100%");
      return;
    }
    setSaving(true);
    try {
      // Convert percentages (0-100) to decimals (0-1) for the API
      await setRoutingWeights({
        blueprintId,
        weights: {
          functionFit: (weights.functionFit ?? 25) / 100,
          sectorFit: (weights.sectorFit ?? 20) / 100,
          levelFit: (weights.levelFit ?? 15) / 100,
          geographyFit: (weights.geographyFit ?? 10) / 100,
          historicalSuccess: (weights.historicalSuccess ?? 10) / 100,
          networkDepth: (weights.networkDepth ?? 10) / 100,
          responseQuality: (weights.responseQuality ?? 5) / 100,
          languageFit: (weights.languageFit ?? 5) / 100,
        },
      });
      toast.success("Routing weights applied");
      onClose?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save weights"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="size-5 text-muted-foreground" />
          <h3 className="text-base font-semibold text-foreground">
            Routing Weight Tuning
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={handleReset}
          disabled={isDefault}
        >
          <RotateCcw className="size-3" />
          Reset to Defaults
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Adjust the weight of each scoring dimension to influence scout ranking
        for this blueprint. Weights must total 100%.
      </p>

      {/* Total indicator */}
      <div
        className={cn(
          "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium",
          isBalanced
            ? "bg-green-50 text-green-700 dark:bg-green-900/10 dark:text-green-400"
            : "bg-red-50 text-red-700 dark:bg-red-900/10 dark:text-red-400"
        )}
      >
        <div className="flex items-center gap-1.5">
          {isBalanced ? (
            <CheckCircle className="size-4" />
          ) : (
            <AlertTriangle className="size-4" />
          )}
          <span>
            Total: {total}%
          </span>
        </div>
        {!isBalanced && (
          <span className="text-xs">
            {total > 100
              ? `${total - 100}% over`
              : `${100 - total}% remaining`}
          </span>
        )}
      </div>

      {/* Weight Sliders */}
      <div className="space-y-4">
        {WEIGHT_DIMENSIONS.map((dim) => (
          <WeightSlider
            key={dim.key}
            dimension={dim}
            value={weights[dim.key] ?? dim.defaultValue}
            onChange={(val) => handleSliderChange(dim.key, val)}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        {onClose && (
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
        )}
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || !isBalanced}
          className="gap-1.5"
        >
          {saving ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Save className="size-3.5" />
          )}
          Apply Weights
        </Button>
      </div>
    </div>
  );
}

// ─── Weight Slider ─────────────────────────────────────────────

interface WeightSliderProps {
  dimension: WeightDimension;
  value: number;
  onChange: (value: number) => void;
}

function WeightSlider({ dimension, value, onChange }: WeightSliderProps) {
  const isOverDefault = value > dimension.defaultValue;
  const isUnderDefault = value < dimension.defaultValue;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {dimension.label}
          </span>
          {(isOverDefault || isUnderDefault) && (
            <Badge
              variant="outline"
              className={cn(
                "text-[9px] px-1 py-0",
                isOverDefault
                  ? "border-green-300 text-green-600 dark:border-green-700 dark:text-green-400"
                  : "border-orange-300 text-orange-600 dark:border-orange-700 dark:text-orange-400"
              )}
            >
              {isOverDefault ? "+" : ""}
              {value - dimension.defaultValue}
            </Badge>
          )}
        </div>
        <span
          className={cn(
            "text-sm font-semibold tabular-nums w-10 text-right",
            value === 0
              ? "text-red-500"
              : value > 20
                ? "text-blue-600 dark:text-blue-400"
                : "text-foreground"
          )}
        >
          {value}%
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground">
        {dimension.description}
      </p>
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-muted-foreground w-4 text-right shrink-0">
          0
        </span>
        <input
          type="range"
          min={0}
          max={50}
          step={1}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className={cn(
            "flex-1 h-2 appearance-none rounded-full cursor-pointer",
            "bg-muted",
            "[&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4",
            "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2",
            "[&::-webkit-slider-thumb]:border-blue-500 [&::-webkit-slider-thumb]:bg-white",
            "[&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer",
            "[&::-webkit-slider-thumb]:dark:bg-slate-900",
            "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4",
            "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2",
            "[&::-moz-range-thumb]:border-blue-500 [&::-moz-range-thumb]:bg-white",
            "[&::-moz-range-thumb]:dark:bg-slate-900",
            "[&::-moz-range-thumb]:cursor-pointer"
          )}
          style={{
            background: `linear-gradient(to right, rgb(59, 130, 246) 0%, rgb(59, 130, 246) ${value * 2}%, hsl(var(--muted)) ${value * 2}%, hsl(var(--muted)) 100%)`,
          }}
        />
        <span className="text-[10px] text-muted-foreground w-5 shrink-0">
          50
        </span>
      </div>
    </div>
  );
}

// ─── Exported defaults for other components ────────────────────

export { DEFAULT_WEIGHTS, WEIGHT_DIMENSIONS };
export type { WeightDimension };
