"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  FieldStateIndicator,
  getConfidenceInputClass,
  type FieldState,
  type AiFieldStates,
} from "@/components/headhunting/field-state-indicator";

// ─── Constants ──────────────────────────────────────────────────

const SEARCH_SCOPE_OPTIONS = [
  { value: "local", label: "Local" },
  { value: "regional", label: "Regional" },
  { value: "global", label: "Global" },
] as const;

const SEARCH_SENSITIVITY_OPTIONS = [
  { value: "standard", label: "Standard" },
  { value: "sensitive", label: "Sensitive" },
  { value: "highly_sensitive", label: "Highly Sensitive" },
] as const;

// ─── Types ──────────────────────────────────────────────────────

interface SearchArchitectureTabProps {
  getField: (field: string) => unknown;
  setField: (field: string, value: unknown) => void;
  isEditable: boolean;
  aiFieldStates?: AiFieldStates;
  onConfirmField?: (field: string) => void;
  roleBand?: string;
}

// ─── Tag List (internal) ────────────────────────────────────────

function TagList({
  label,
  field,
  value,
  onChange,
  disabled,
  placeholder,
  aiState,
  onConfirm,
}: {
  label: string;
  field: string;
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  aiState?: FieldState;
  onConfirm?: () => void;
}) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const trimmed = input.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setInput("");
  };

  const removeTag = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-sm">
          {label}
          <span className="text-xs text-muted-foreground ml-2">
            ({value.length})
          </span>
        </Label>
        <FieldStateIndicator fieldState={aiState} onConfirm={onConfirm} />
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
            >
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(idx)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {!disabled && (
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder={placeholder ?? `Add ${label.toLowerCase()}...`}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTag}
            disabled={!input.trim()}
            className="gap-1"
          >
            <Plus className="size-3" />
            Add
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────

export function SearchArchitectureTab({
  getField,
  setField,
  isEditable,
  aiFieldStates,
  onConfirmField,
  roleBand,
}: SearchArchitectureTabProps) {
  const getAiState = (field: string): FieldState | undefined =>
    aiFieldStates?.[field];

  const isExecutive = roleBand === "executive_clevel";
  const isRequired = isExecutive;

  return (
    <div className="rounded-lg border border-border bg-card p-6 mt-4">
      {isRequired && (
        <div className="mb-4 rounded-md border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 px-3 py-2 text-xs text-red-700 dark:text-red-400 font-medium">
          Executive mandate — stricter release controls apply.
        </div>
      )}

      {/* Target Sectors */}
      <TagList
        label="Target Sectors"
        field="targetSectors"
        value={(getField("targetSectors") as string[]) ?? []}
        onChange={(v) => setField("targetSectors", v)}
        disabled={!isEditable}
        placeholder="Add a target sector..."
        aiState={getAiState("targetSectors")}
        onConfirm={
          onConfirmField ? () => onConfirmField("targetSectors") : undefined
        }
      />

      <Separator className="my-6" />

      {/* Target Company Types */}
      <TagList
        label="Target Company Types"
        field="targetCompanyTypes"
        value={(getField("targetCompanyTypes") as string[]) ?? []}
        onChange={(v) => setField("targetCompanyTypes", v)}
        disabled={!isEditable}
        placeholder="Add a company type..."
        aiState={getAiState("targetCompanyTypes")}
        onConfirm={
          onConfirmField
            ? () => onConfirmField("targetCompanyTypes")
            : undefined
        }
      />

      <Separator className="my-6" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Search Scope */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Search Scope</Label>
            <FieldStateIndicator
              fieldState={getAiState("searchScope")}
              onConfirm={
                onConfirmField
                  ? () => onConfirmField("searchScope")
                  : undefined
              }
            />
          </div>
          <Select
            value={(getField("searchScope") as string) ?? ""}
            onValueChange={(v) => setField("searchScope", v)}
            disabled={!isEditable}
          >
            <SelectTrigger
              className={cn(
                getConfidenceInputClass(getAiState("searchScope"))
              )}
            >
              <SelectValue placeholder="Select search scope..." />
            </SelectTrigger>
            <SelectContent>
              {SEARCH_SCOPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search Sensitivity */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Search Sensitivity</Label>
            <FieldStateIndicator
              fieldState={getAiState("searchSensitivity")}
              onConfirm={
                onConfirmField
                  ? () => onConfirmField("searchSensitivity")
                  : undefined
              }
            />
          </div>
          <Select
            value={(getField("searchSensitivity") as string) ?? ""}
            onValueChange={(v) => setField("searchSensitivity", v)}
            disabled={!isEditable}
          >
            <SelectTrigger
              className={cn(
                getConfidenceInputClass(getAiState("searchSensitivity"))
              )}
            >
              <SelectValue placeholder="Select sensitivity level..." />
            </SelectTrigger>
            <SelectContent>
              {SEARCH_SENSITIVITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Competitor Exclusion List */}
      <TagList
        label="Companies to Exclude from Search"
        field="competitorExclusionList"
        value={(getField("competitorExclusionList") as string[]) ?? []}
        onChange={(v) => setField("competitorExclusionList", v)}
        disabled={!isEditable}
        placeholder="Add company name..."
        aiState={getAiState("competitorExclusionList")}
        onConfirm={
          onConfirmField
            ? () => onConfirmField("competitorExclusionList")
            : undefined
        }
      />

      <Separator className="my-6" />

      {/* Market Language Considerations */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Label className="text-sm">Market Language Considerations</Label>
          <FieldStateIndicator
            fieldState={getAiState("marketLanguageConsiderations")}
            onConfirm={
              onConfirmField
                ? () => onConfirmField("marketLanguageConsiderations")
                : undefined
            }
          />
        </div>
        <Textarea
          value={(getField("marketLanguageConsiderations") as string) ?? ""}
          onChange={(e) =>
            setField("marketLanguageConsiderations", e.target.value)
          }
          disabled={!isEditable}
          placeholder="Any market-specific language or cultural considerations..."
          rows={3}
          className={cn(
            "text-sm",
            getConfidenceInputClass(
              getAiState("marketLanguageConsiderations")
            )
          )}
        />
      </div>

      {/* Controlled Release Instruction — only for executive/C-level */}
      {isExecutive && (
        <>
          <Separator className="my-6" />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label className="text-sm">
                Controlled Release Instruction
                <span className="text-red-500 ml-0.5">*</span>
              </Label>
              <FieldStateIndicator
                fieldState={getAiState("controlledReleaseInstruction")}
                onConfirm={
                  onConfirmField
                    ? () => onConfirmField("controlledReleaseInstruction")
                    : undefined
                }
              />
            </div>
            <Textarea
              value={
                (getField("controlledReleaseInstruction") as string) ?? ""
              }
              onChange={(e) =>
                setField("controlledReleaseInstruction", e.target.value)
              }
              disabled={!isEditable}
              placeholder="Specific instructions for controlled release of this executive search..."
              rows={3}
              className={cn(
                "text-sm",
                getConfidenceInputClass(
                  getAiState("controlledReleaseInstruction")
                )
              )}
            />
          </div>
        </>
      )}
    </div>
  );
}
