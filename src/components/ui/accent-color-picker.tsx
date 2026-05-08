"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { RotateCcw } from "lucide-react";

const PRESET_COLORS = [
  { hex: "#1e293b", labelKey: "cv.color.navy" },
  { hex: "#2563eb", labelKey: "cv.color.blue" },
  { hex: "#0284c7", labelKey: "cv.color.sky" },
  { hex: "#0d9488", labelKey: "cv.color.teal" },
  { hex: "#059669", labelKey: "cv.color.emerald" },
  { hex: "#7c3aed", labelKey: "cv.color.violet" },
  { hex: "#e11d48", labelKey: "cv.color.rose" },
  { hex: "#dc2626", labelKey: "cv.color.red" },
  { hex: "#d97706", labelKey: "cv.color.amber" },
  { hex: "#92400e", labelKey: "cv.color.brown" },
  { hex: "#475569", labelKey: "cv.color.slate" },
  { hex: "#111827", labelKey: "cv.color.black" },
];

interface AccentColorPickerProps {
  value: string;
  defaultColor: string;
  onChange: (color: string) => void;
  t: (key: string) => string;
}

function isValidHex(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return Math.round(h);
}

export function AccentColorPicker({
  value,
  defaultColor,
  onChange,
  t,
}: AccentColorPickerProps) {
  const [customHex, setCustomHex] = useState("");
  const [hue, setHue] = useState(() => hexToHue(value));

  const handlePreset = useCallback(
    (hex: string) => {
      onChange(hex);
      setCustomHex("");
    },
    [onChange]
  );

  const handleCustomInput = useCallback(
    (input: string) => {
      let hex = input;
      if (hex && !hex.startsWith("#")) hex = "#" + hex;
      setCustomHex(hex);
      if (isValidHex(hex)) {
        onChange(hex);
      }
    },
    [onChange]
  );

  const handleHueChange = useCallback(
    (h: number) => {
      setHue(h);
      const hex = hslToHex(h, 70, 45);
      onChange(hex);
      setCustomHex("");
    },
    [onChange]
  );

  const handleReset = useCallback(() => {
    onChange(defaultColor);
    setCustomHex("");
    setHue(hexToHue(defaultColor));
  }, [onChange, defaultColor]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {t("cv.generator.accentColor")}
        </span>
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          {t("cv.generator.resetColor")}
        </button>
      </div>

      {/* Preset swatches */}
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color.hex}
            type="button"
            onClick={() => handlePreset(color.hex)}
            title={t(color.labelKey)}
            className={cn(
              "w-7 h-7 rounded-full border-2 transition-all hover:scale-110",
              value === color.hex
                ? "border-foreground ring-2 ring-foreground/20 scale-110"
                : "border-transparent"
            )}
            style={{ backgroundColor: color.hex }}
          />
        ))}
      </div>

      {/* Hue slider + custom hex */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <input
            type="range"
            min={0}
            max={360}
            value={hue}
            onChange={(e) => handleHueChange(parseInt(e.target.value))}
            className="w-full h-3 rounded-full appearance-none cursor-pointer"
            style={{
              background:
                "linear-gradient(to right, hsl(0,70%,45%), hsl(60,70%,45%), hsl(120,70%,45%), hsl(180,70%,45%), hsl(240,70%,45%), hsl(300,70%,45%), hsl(360,70%,45%))",
            }}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-6 h-6 rounded border border-border shrink-0"
            style={{ backgroundColor: value }}
          />
          <input
            type="text"
            placeholder="#hex"
            value={customHex}
            onChange={(e) => handleCustomInput(e.target.value)}
            className={cn(
              "w-20 h-7 text-xs px-2 rounded border bg-background text-foreground",
              customHex && !isValidHex(customHex)
                ? "border-destructive"
                : "border-border"
            )}
            maxLength={7}
          />
        </div>
      </div>
    </div>
  );
}
