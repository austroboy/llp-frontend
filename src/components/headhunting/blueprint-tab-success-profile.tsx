"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  FieldStateIndicator,
  AdminClue,
  getConfidenceInputClass,
  type FieldState,
  type AiFieldStates,
} from "@/components/headhunting/field-state-indicator";

// ─── Constants ──────────────────────────────────────────────────

const MATURITY_OPTIONS = [
  { value: "basic_supervision", label: "Basic supervision-dependent" },
  { value: "moderate_independent", label: "Moderate independent" },
  { value: "strong_professional", label: "Strong professional" },
  { value: "high_strategic", label: "High strategic" },
  { value: "executive_board", label: "Executive / board-level" },
] as const;

const CULTURE_OPTIONS = [
  { value: "structured", label: "Structured / Process-led" },
  { value: "entrepreneurial", label: "Entrepreneurial / Build-as-you-go" },
  { value: "diplomatic", label: "Diplomatic / Stakeholder-sensitive" },
  { value: "hands_on", label: "Hands-on / Execution-heavy" },
  { value: "analytical", label: "Analytical / Evidence-led" },
  { value: "commercial", label: "Commercial / Opportunity-led" },
  { value: "compliance", label: "Compliance-driven / Controlled" },
  { value: "adaptive", label: "Adaptive / Ambiguity-tolerant" },
  { value: "collaborative", label: "Collaborative / Matrix-heavy" },
  { value: "command", label: "Command-led / Hierarchy-sensitive" },
] as const;

// ─── Types ──────────────────────────────────────────────────────

interface SuccessProfileTabProps {
  getField: (field: string) => unknown;
  setField: (field: string, value: unknown) => void;
  isEditable: boolean;
  aiFieldStates?: AiFieldStates;
  onConfirmField?: (field: string) => void;
  roleBand?: string;
}

// ─── Component ──────────────────────────────────────────────────

export function SuccessProfileTab({
  getField,
  setField,
  isEditable,
  aiFieldStates,
  onConfirmField,
  roleBand,
}: SuccessProfileTabProps) {
  const getAiState = (field: string): FieldState | undefined =>
    aiFieldStates?.[field];

  const isRecommended =
    roleBand === "management_functional" || roleBand === "executive_clevel";
  const isRequired = roleBand === "executive_clevel";

  return (
    <div className="rounded-lg border border-border bg-card p-6 mt-4">
      {/* Priority indicator */}
      {isRequired && (
        <div className="mb-4 rounded-md border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 px-3 py-2 text-xs text-red-700 dark:text-red-400 font-medium">
          Executive mandate — all Success Profile fields are required.
        </div>
      )}
      {!isRequired && isRecommended && (
        <div className="mb-4 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 px-3 py-2 text-xs text-blue-700 dark:text-blue-400 font-medium">
          Recommended for management-level roles.
        </div>
      )}

      <div className="space-y-4">
        {/* 6 Month Expectation */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-sm">
              6-Month Expectation
              {isRequired && <span className="text-red-500 ml-0.5">*</span>}
            </Label>
            <FieldStateIndicator
              fieldState={getAiState("sixMonthExpectation")}
              onConfirm={
                onConfirmField
                  ? () => onConfirmField("sixMonthExpectation")
                  : undefined
              }
            />
          </div>
          <Textarea
            value={(getField("sixMonthExpectation") as string) ?? ""}
            onChange={(e) => setField("sixMonthExpectation", e.target.value)}
            disabled={!isEditable}
            placeholder="What should this person achieve in 6 months?"
            rows={3}
            className={cn(
              "text-sm",
              getConfidenceInputClass(getAiState("sixMonthExpectation"))
            )}
          />
        </div>

        {/* 12 Month Outcomes */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-sm">
              12-Month Outcomes
              {isRequired && <span className="text-red-500 ml-0.5">*</span>}
            </Label>
            <FieldStateIndicator
              fieldState={getAiState("twelveMonthOutcomes")}
              onConfirm={
                onConfirmField
                  ? () => onConfirmField("twelveMonthOutcomes")
                  : undefined
              }
            />
          </div>
          <Textarea
            value={(getField("twelveMonthOutcomes") as string) ?? ""}
            onChange={(e) => setField("twelveMonthOutcomes", e.target.value)}
            disabled={!isEditable}
            placeholder="What should they have delivered in 12 months?"
            rows={3}
            className={cn(
              "text-sm",
              getConfidenceInputClass(getAiState("twelveMonthOutcomes"))
            )}
          />
        </div>

        {/* Challenge Profile */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Challenge Profile</Label>
            <FieldStateIndicator
              fieldState={getAiState("challengeProfile")}
              onConfirm={
                onConfirmField
                  ? () => onConfirmField("challengeProfile")
                  : undefined
              }
            />
          </div>
          <Textarea
            value={(getField("challengeProfile") as string) ?? ""}
            onChange={(e) => setField("challengeProfile", e.target.value)}
            disabled={!isEditable}
            placeholder="What makes this role difficult? What has frustrated previous hires?"
            rows={3}
            className={cn(
              "text-sm",
              getConfidenceInputClass(getAiState("challengeProfile"))
            )}
          />
          <AdminClue text="What has frustrated previous hires in this role? What makes it harder than the title suggests?" />
        </div>

        {/* Maturity Needed */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-sm">
              Maturity Needed
              {isRequired && <span className="text-red-500 ml-0.5">*</span>}
            </Label>
            <FieldStateIndicator
              fieldState={getAiState("maturityNeeded")}
              onConfirm={
                onConfirmField
                  ? () => onConfirmField("maturityNeeded")
                  : undefined
              }
            />
          </div>
          <Select
            value={(getField("maturityNeeded") as string) ?? ""}
            onValueChange={(v) => setField("maturityNeeded", v)}
            disabled={!isEditable}
          >
            <SelectTrigger
              className={cn(
                getConfidenceInputClass(getAiState("maturityNeeded"))
              )}
            >
              <SelectValue placeholder="Select maturity level..." />
            </SelectTrigger>
            <SelectContent>
              {MATURITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AdminClue text="Would a technically strong but emotionally narrow person survive this environment?" />
        </div>

        {/* Leadership Style Needed */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Leadership Style Needed</Label>
            <FieldStateIndicator
              fieldState={getAiState("leadershipStyleNeeded")}
              onConfirm={
                onConfirmField
                  ? () => onConfirmField("leadershipStyleNeeded")
                  : undefined
              }
            />
          </div>
          <Textarea
            value={(getField("leadershipStyleNeeded") as string) ?? ""}
            onChange={(e) => setField("leadershipStyleNeeded", e.target.value)}
            disabled={!isEditable}
            placeholder="Builder? Hands-on operator? Strategic leader?"
            rows={2}
            className={cn(
              "text-sm",
              getConfidenceInputClass(getAiState("leadershipStyleNeeded"))
            )}
          />
        </div>

        {/* Motivation Fit */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Motivation Fit</Label>
            <FieldStateIndicator
              fieldState={getAiState("motivationFit")}
              onConfirm={
                onConfirmField
                  ? () => onConfirmField("motivationFit")
                  : undefined
              }
            />
          </div>
          <Textarea
            value={(getField("motivationFit") as string) ?? ""}
            onChange={(e) => setField("motivationFit", e.target.value)}
            disabled={!isEditable}
            placeholder="What motivates the right person for this role?"
            rows={2}
            className={cn(
              "text-sm",
              getConfidenceInputClass(getAiState("motivationFit"))
            )}
          />
        </div>

        {/* Culture / Operating Style (multi-select checkboxes) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-sm">
              Culture / Operating Style
              {isRequired && <span className="text-red-500 ml-0.5">*</span>}
            </Label>
            <FieldStateIndicator
              fieldState={getAiState("cultureOperatingStyle")}
              onConfirm={
                onConfirmField
                  ? () => onConfirmField("cultureOperatingStyle")
                  : undefined
              }
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CULTURE_OPTIONS.map((option) => {
              const current =
                (getField("cultureOperatingStyle") as string[]) ?? [];
              const isChecked = current.includes(option.value);
              return (
                <label
                  key={option.value}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors",
                    isChecked
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border hover:bg-muted/50 text-muted-foreground",
                    !isEditable && "cursor-not-allowed opacity-60"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={!isEditable}
                    onChange={() => {
                      if (!isEditable) return;
                      const next = isChecked
                        ? current.filter((v) => v !== option.value)
                        : [...current, option.value];
                      setField("cultureOperatingStyle", next);
                    }}
                    className="rounded border-border"
                  />
                  {option.label}
                </label>
              );
            })}
          </div>
          <AdminClue text="Does success depend more on structure, speed, diplomacy, resilience, evidence, or hustle?" />
        </div>
      </div>
    </div>
  );
}
