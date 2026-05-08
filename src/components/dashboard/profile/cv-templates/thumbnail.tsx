"use client";

import { memo } from "react";
import type { CvTemplateName } from "./types";
import { deriveTheme } from "./theme";

interface CvTemplateThumbnailProps {
  templateId: CvTemplateName;
  accentColor: string;
}

// A4 ratio: 1:1.414. At 80px wide → 113px tall
const W = 80;
const H = 113;

type Archetype =
  | "header-banner"
  | "header-banner-dark"
  | "top-border"
  | "left-bar"
  | "minimal-centered"
  | "sidebar-dark"
  | "sidebar-accent"
  | "sidebar-light"
  | "card-sections"
  | "terminal"
  | "scholar"
  | "hybrid";

const ARCHETYPE_MAP: Record<CvTemplateName, Archetype> = {
  professional: "header-banner",
  executive: "header-banner-dark",
  vibrant: "header-banner",
  modern: "sidebar-dark",
  canvas: "sidebar-accent",
  blueprint: "sidebar-light",
  stack: "sidebar-dark",
  minimal: "minimal-centered",
  boardroom: "top-border",
  diplomat: "left-bar",
  portfolio: "card-sections",
  terminal: "terminal",
  scholar: "scholar",
  thesis: "hybrid",
};

function BodyLines({ color, accent }: { color: string; accent: string }) {
  return (
    <>
      <div style={{ height: 2, width: 24, background: accent, borderRadius: 1, marginBottom: 3, opacity: 0.9 }} />
      {[30, 26, 28, 18].map((w, i) => (
        <div key={i} style={{ height: 1.5, width: w, background: color, borderRadius: 1, marginBottom: 2 }} />
      ))}
      <div style={{ height: 2, width: 20, background: accent, borderRadius: 1, marginTop: 3, marginBottom: 3, opacity: 0.9 }} />
      {[28, 22, 26].map((w, i) => (
        <div key={`b${i}`} style={{ height: 1.5, width: w, background: color, borderRadius: 1, marginBottom: 2 }} />
      ))}
    </>
  );
}

function SidebarBodyLines({ color, accent }: { color: string; accent: string }) {
  return (
    <>
      <div style={{ height: 2, width: 20, background: accent, borderRadius: 1, marginBottom: 3, opacity: 0.9 }} />
      {[35, 30, 32, 25].map((w, i) => (
        <div key={i} style={{ height: 1.5, width: Math.min(w, 42), background: color, borderRadius: 1, marginBottom: 2 }} />
      ))}
      <div style={{ height: 2, width: 16, background: accent, borderRadius: 1, marginTop: 3, marginBottom: 3, opacity: 0.9 }} />
      {[32, 28].map((w, i) => (
        <div key={`b${i}`} style={{ height: 1.5, width: Math.min(w, 42), background: color, borderRadius: 1, marginBottom: 2 }} />
      ))}
    </>
  );
}

function SidebarLines({ color }: { color: string }) {
  return (
    <>
      {[20, 16, 18, 14, 16].map((w, i) => (
        <div key={i} style={{ height: 1.5, width: w, background: color, borderRadius: 1, marginBottom: 2 }} />
      ))}
    </>
  );
}

function renderArchetype(archetype: Archetype, accent: string) {
  const theme = deriveTheme(accent);
  const lineColor = "#cbd5e1";

  switch (archetype) {
    case "header-banner":
      return (
        <div style={{ width: W, height: H, position: "relative", background: "#fff", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ background: accent, height: "24%", padding: "5px 6px", display: "flex", alignItems: "center", gap: 3 }}>
            <div style={{ width: 12, height: 12, borderRadius: 6, background: "rgba(255,255,255,0.35)", flexShrink: 0 }} />
            <div>
              <div style={{ height: 3, width: 28, background: "rgba(255,255,255,0.9)", borderRadius: 1, marginBottom: 2 }} />
              <div style={{ height: 2, width: 18, background: "rgba(255,255,255,0.5)", borderRadius: 1 }} />
            </div>
          </div>
          <div style={{ padding: "5px 6px" }}>
            <BodyLines color={lineColor} accent={accent} />
          </div>
        </div>
      );

    case "header-banner-dark":
      return (
        <div style={{ width: W, height: H, position: "relative", background: "#fff", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ background: "#1a1a1a", height: "24%", padding: "5px 6px", display: "flex", alignItems: "center", gap: 3 }}>
            <div style={{ width: 12, height: 12, borderRadius: 6, background: accent, opacity: 0.7, flexShrink: 0 }} />
            <div>
              <div style={{ height: 3, width: 28, background: accent, borderRadius: 1, marginBottom: 2 }} />
              <div style={{ height: 2, width: 18, background: "rgba(255,255,255,0.4)", borderRadius: 1 }} />
            </div>
          </div>
          <div style={{ height: 2, background: accent, width: "100%" }} />
          <div style={{ padding: "5px 6px" }}>
            <BodyLines color={lineColor} accent={accent} />
          </div>
        </div>
      );

    case "top-border":
      return (
        <div style={{ width: W, height: H, position: "relative", background: "#fff", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: 4, background: accent, width: "100%" }} />
          <div style={{ padding: "8px 6px", textAlign: "center" }}>
            <div style={{ height: 3.5, width: 32, background: accent, borderRadius: 1, margin: "0 auto 3px" }} />
            <div style={{ height: 2, width: 22, background: lineColor, borderRadius: 1, margin: "0 auto 6px" }} />
            <div style={{ borderBottom: `0.5px solid ${lineColor}`, marginBottom: 5 }} />
            <div style={{ textAlign: "left" }}>
              <BodyLines color={lineColor} accent={accent} />
            </div>
          </div>
        </div>
      );

    case "left-bar":
      return (
        <div style={{ width: W, height: H, position: "relative", background: "#fff", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 5, background: accent }} />
          <div style={{ padding: "8px 6px 6px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 5 }}>
              <div style={{ width: 11, height: 11, borderRadius: 6, border: `1.5px solid ${accent}`, flexShrink: 0 }} />
              <div>
                <div style={{ height: 3, width: 26, background: accent, borderRadius: 1, marginBottom: 2 }} />
                <div style={{ height: 2, width: 18, background: lineColor, borderRadius: 1 }} />
              </div>
            </div>
            <div style={{ borderBottom: `0.5px solid ${theme.borderColor}`, marginBottom: 5 }} />
            <BodyLines color={lineColor} accent={accent} />
          </div>
        </div>
      );

    case "minimal-centered":
      return (
        <div style={{ width: W, height: H, position: "relative", background: "#fff", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ padding: "10px 6px 6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, background: lineColor, flexShrink: 0 }} />
              <div>
                <div style={{ height: 3.5, width: 30, background: accent, borderRadius: 1, marginBottom: 2 }} />
                <div style={{ height: 2, width: 20, background: lineColor, borderRadius: 1 }} />
              </div>
            </div>
            <div style={{ borderBottom: `0.5px solid ${lineColor}`, marginBottom: 6 }} />
            <BodyLines color={lineColor} accent={accent} />
          </div>
        </div>
      );

    case "sidebar-dark":
      return (
        <div style={{ width: W, height: H, position: "relative", background: "#fff", borderRadius: 3, overflow: "hidden", display: "flex" }}>
          <div style={{ width: "35%", background: theme.sidebarBg, padding: "7px 4px" }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, background: "rgba(255,255,255,0.25)", margin: "0 auto 4px" }} />
            <div style={{ height: 2.5, width: 20, background: "rgba(255,255,255,0.8)", borderRadius: 1, marginBottom: 3 }} />
            <SidebarLines color="rgba(255,255,255,0.35)" />
          </div>
          <div style={{ flex: 1, padding: "7px 5px" }}>
            <SidebarBodyLines color={lineColor} accent={accent} />
          </div>
        </div>
      );

    case "sidebar-accent":
      return (
        <div style={{ width: W, height: H, position: "relative", background: "#fff", borderRadius: 3, overflow: "hidden", display: "flex" }}>
          <div style={{ width: "35%", background: accent, padding: "7px 4px" }}>
            <div style={{ width: 16, height: 16, borderRadius: 8, background: "rgba(255,255,255,0.3)", margin: "0 auto 4px" }} />
            <div style={{ height: 2.5, width: 20, background: "rgba(255,255,255,0.85)", borderRadius: 1, marginBottom: 3 }} />
            <SidebarLines color="rgba(255,255,255,0.4)" />
          </div>
          <div style={{ flex: 1, padding: "7px 5px" }}>
            <SidebarBodyLines color={lineColor} accent={accent} />
          </div>
        </div>
      );

    case "sidebar-light":
      return (
        <div style={{ width: W, height: H, position: "relative", background: "#fff", borderRadius: 3, overflow: "hidden", display: "flex" }}>
          <div style={{ width: "35%", background: theme.accentLight, padding: "7px 4px" }}>
            <div style={{ width: 13, height: 13, borderRadius: 3, background: accent, opacity: 0.3, margin: "0 auto 4px" }} />
            <div style={{ height: 2.5, width: 20, background: accent, borderRadius: 1, marginBottom: 3, opacity: 0.7 }} />
            <SidebarLines color={theme.borderColor} />
          </div>
          <div style={{ flex: 1, padding: "7px 5px" }}>
            <SidebarBodyLines color={lineColor} accent={accent} />
          </div>
        </div>
      );

    case "card-sections":
      return (
        <div style={{ width: W, height: H, position: "relative", background: "#f5f5f5", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ padding: "6px 5px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: lineColor, flexShrink: 0 }} />
              <div style={{ height: 3, width: 26, background: accent, borderRadius: 1 }} />
            </div>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 3, border: `0.5px solid ${theme.borderColor}`, padding: "4px 5px", marginBottom: 3 }}>
                <div style={{ height: 2, width: 16, background: accent, borderRadius: 1, marginBottom: 2, opacity: 0.8 }} />
                {[24, 20, 22].map((w, j) => (
                  <div key={j} style={{ height: 1.5, width: w, background: lineColor, borderRadius: 1, marginBottom: 1.5 }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      );

    case "terminal":
      return (
        <div style={{ width: W, height: H, position: "relative", background: "#0d1117", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ padding: "7px 6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, border: `1px solid ${accent}`, flexShrink: 0 }} />
              <div>
                <div style={{ height: 2, width: 12, background: "#484f58", borderRadius: 1, marginBottom: 2 }} />
                <div style={{ height: 3, width: 26, background: accent, borderRadius: 1 }} />
              </div>
            </div>
            <div style={{ borderBottom: "0.5px solid #30363d", marginBottom: 5 }} />
            <div style={{ height: 2, width: 18, background: accent, borderRadius: 1, marginBottom: 3, opacity: 0.9 }} />
            {[28, 24, 26, 18].map((w, i) => (
              <div key={i} style={{ height: 1.5, width: w, background: "#30363d", borderRadius: 1, marginBottom: 2 }} />
            ))}
            <div style={{ height: 2, width: 16, background: accent, borderRadius: 1, marginTop: 3, marginBottom: 3, opacity: 0.9 }} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              {[14, 12, 16, 10].map((w, i) => (
                <div key={i} style={{ height: 5, width: w, background: "#21262d", borderRadius: 2, border: "0.5px solid #30363d" }} />
              ))}
            </div>
          </div>
        </div>
      );

    case "scholar":
      return (
        <div style={{ width: W, height: H, position: "relative", background: "#fff", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ padding: "8px 6px 6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 3 }}>
              <div style={{ width: 9, height: 9, borderRadius: 5, background: lineColor, flexShrink: 0 }} />
              <div style={{ height: 3, width: 28, background: accent, borderRadius: 1 }} />
            </div>
            <div style={{ height: 2, width: 22, background: lineColor, borderRadius: 1, marginBottom: 4 }} />
            <div style={{ borderBottom: `1.5px solid ${accent}`, marginBottom: 5 }} />
            {/* Dense body */}
            {[30, 26, 28, 22, 24, 28, 20, 26, 22, 18].map((w, i) => (
              <div key={i} style={{ height: 1.5, width: w, background: i % 5 === 0 ? accent : lineColor, borderRadius: 1, marginBottom: 1.5, opacity: i % 5 === 0 ? 0.8 : 1 }} />
            ))}
          </div>
        </div>
      );

    case "hybrid":
      return (
        <div style={{ width: W, height: H, position: "relative", background: "#fff", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ padding: "7px 6px 4px", textAlign: "center" }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, background: lineColor, margin: "0 auto 3px" }} />
            <div style={{ height: 3, width: 30, background: accent, borderRadius: 1, margin: "0 auto 2px" }} />
            <div style={{ height: 2, width: 18, background: lineColor, borderRadius: 1, margin: "0 auto 3px" }} />
            <div style={{ borderBottom: `1.5px solid ${accent}`, marginBottom: 4 }} />
          </div>
          <div style={{ display: "flex", gap: 3, padding: "0 6px 6px" }}>
            <div style={{ flex: 1 }}>
              {[24, 20, 22, 18, 22, 20].map((w, i) => (
                <div key={i} style={{ height: 1.5, width: Math.min(w, 30), background: i === 0 ? accent : lineColor, borderRadius: 1, marginBottom: 1.5, opacity: i === 0 ? 0.8 : 1 }} />
              ))}
            </div>
            <div style={{ flex: 1 }}>
              {[22, 18, 20, 16, 20, 18].map((w, i) => (
                <div key={i} style={{ height: 1.5, width: Math.min(w, 30), background: i === 0 ? accent : lineColor, borderRadius: 1, marginBottom: 1.5, opacity: i === 0 ? 0.8 : 1 }} />
              ))}
            </div>
          </div>
        </div>
      );
  }
}

export const CvTemplateThumbnail = memo(function CvTemplateThumbnail({
  templateId,
  accentColor,
}: CvTemplateThumbnailProps) {
  const archetype = ARCHETYPE_MAP[templateId];
  return (
    <div
      className="shrink-0 border border-border rounded shadow-sm"
      style={{ width: W, height: H }}
    >
      {renderArchetype(archetype, accentColor)}
    </div>
  );
});
