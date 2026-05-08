"use client";

import { memo } from "react";
import type { CoverLetterTemplateName } from "./types";
import { deriveTheme } from "../cv-templates/theme";

interface ClTemplateThumbnailProps {
  templateId: CoverLetterTemplateName;
  accentColor: string;
}

// A4 ratio: 1:1.414. At 80px wide → 113px tall
const W = 80;
const H = 113;

type Archetype =
  | "letter-classic"
  | "letter-modern"
  | "letter-minimal"
  | "letter-executive"
  | "letter-boardroom"
  | "letter-left-bar"
  | "letter-bold-header"
  | "letter-vibrant"
  | "letter-sidebar"
  | "letter-terminal"
  | "letter-blueprint"
  | "letter-stack"
  | "letter-scholar"
  | "letter-thesis";

const ARCHETYPE_MAP: Record<CoverLetterTemplateName, Archetype> = {
  "cl-professional": "letter-classic",
  "cl-modern": "letter-modern",
  "cl-minimal": "letter-minimal",
  "cl-executive": "letter-executive",
  "cl-boardroom": "letter-boardroom",
  "cl-diplomat": "letter-left-bar",
  "cl-canvas": "letter-bold-header",
  "cl-vibrant": "letter-vibrant",
  "cl-portfolio": "letter-sidebar",
  "cl-terminal": "letter-terminal",
  "cl-blueprint": "letter-blueprint",
  "cl-stack": "letter-stack",
  "cl-scholar": "letter-scholar",
  "cl-thesis": "letter-thesis",
};

/** Generic body text lines for letter content */
function LetterLines({ color, count = 6 }: { color: string; count?: number }) {
  const widths = [30, 28, 32, 26, 24, 30, 28, 22];
  return (
    <>
      {widths.slice(0, count).map((w, i) => (
        <div key={i} style={{ height: 1.5, width: w, background: color, borderRadius: 1, marginBottom: 2 }} />
      ))}
    </>
  );
}

/** Sender header: name line + contact line */
function SenderBlock({ nameColor, contactColor, nameW = 26, contactW = 34 }: { nameColor: string; contactColor: string; nameW?: number; contactW?: number }) {
  return (
    <>
      <div style={{ height: 3, width: nameW, background: nameColor, borderRadius: 1, marginBottom: 2 }} />
      <div style={{ height: 1.5, width: contactW, background: contactColor, borderRadius: 1, marginBottom: 1.5 }} />
      <div style={{ height: 1.5, width: contactW - 8, background: contactColor, borderRadius: 1 }} />
    </>
  );
}

/** Recipient block: To line + company line */
function RecipientBlock({ color, accent }: { color: string; accent: string }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ height: 1.5, width: 12, background: accent, borderRadius: 1, marginBottom: 2, opacity: 0.7 }} />
      <div style={{ height: 1.5, width: 22, background: color, borderRadius: 1, marginBottom: 1.5 }} />
      <div style={{ height: 1.5, width: 18, background: color, borderRadius: 1 }} />
    </div>
  );
}

function renderArchetype(archetype: Archetype, accent: string) {
  const theme = deriveTheme(accent);
  const line = "#cbd5e1";

  switch (archetype) {
    // Classic: Professional — accent underline under name, traditional layout
    case "letter-classic":
      return (
        <div style={{ width: W, height: H, background: "#fff", borderRadius: 3, overflow: "hidden", padding: "7px 6px" }}>
          <SenderBlock nameColor={accent} contactColor={line} />
          <div style={{ height: 1, width: 30, background: accent, marginTop: 3, marginBottom: 5, opacity: 0.6 }} />
          <RecipientBlock color={line} accent={accent} />
          <LetterLines color={line} count={6} />
          <div style={{ marginTop: 4 }}>
            <div style={{ height: 1.5, width: 14, background: line, borderRadius: 1, marginBottom: 2 }} />
            <div style={{ height: 2, width: 20, background: accent, borderRadius: 1, opacity: 0.7 }} />
          </div>
        </div>
      );

    // Classic: Modern — full-width accent header bar
    case "letter-modern":
      return (
        <div style={{ width: W, height: H, background: "#fff", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ background: accent, height: 20, padding: "4px 6px", display: "flex", alignItems: "center" }}>
            <div>
              <div style={{ height: 3, width: 28, background: "rgba(255,255,255,0.9)", borderRadius: 1, marginBottom: 2 }} />
              <div style={{ height: 1.5, width: 34, background: "rgba(255,255,255,0.5)", borderRadius: 1 }} />
            </div>
          </div>
          <div style={{ padding: "5px 6px" }}>
            <RecipientBlock color={line} accent={accent} />
            <LetterLines color={line} count={6} />
            <div style={{ marginTop: 3 }}>
              <div style={{ height: 2, width: 18, background: accent, borderRadius: 1, opacity: 0.7 }} />
            </div>
          </div>
        </div>
      );

    // Classic: Minimal — very sparse, pipe-separated contacts
    case "letter-minimal":
      return (
        <div style={{ width: W, height: H, background: "#fff", borderRadius: 3, overflow: "hidden", padding: "9px 6px" }}>
          <div style={{ height: 3.5, width: 30, background: accent, borderRadius: 1, marginBottom: 2 }} />
          <div style={{ height: 1.5, width: 40, background: line, borderRadius: 1, marginBottom: 6 }} />
          <div style={{ borderBottom: `0.5px solid ${line}`, marginBottom: 5 }} />
          <LetterLines color={line} count={7} />
          <div style={{ marginTop: 4 }}>
            <div style={{ height: 2, width: 18, background: accent, borderRadius: 1, opacity: 0.6 }} />
          </div>
        </div>
      );

    // Corporate: Executive — centered letterhead, gold-rule divider
    case "letter-executive":
      return (
        <div style={{ width: W, height: H, background: "#fff", borderRadius: 3, overflow: "hidden", padding: "7px 6px", textAlign: "center" }}>
          <div style={{ height: 3.5, width: 32, background: accent, borderRadius: 1, margin: "0 auto 2px" }} />
          <div style={{ height: 1.5, width: 36, background: line, borderRadius: 1, margin: "0 auto 4px" }} />
          <div style={{ height: 1.5, background: accent, opacity: 0.4, marginBottom: 5 }} />
          <div style={{ textAlign: "left" }}>
            <RecipientBlock color={line} accent={accent} />
            <LetterLines color={line} count={5} />
          </div>
          <div style={{ textAlign: "left", marginTop: 3 }}>
            <div style={{ height: 2, width: 20, background: accent, borderRadius: 1, opacity: 0.7 }} />
          </div>
        </div>
      );

    // Corporate: Boardroom — bordered header box
    case "letter-boardroom":
      return (
        <div style={{ width: W, height: H, background: "#fff", borderRadius: 3, overflow: "hidden", padding: "6px 5px" }}>
          <div style={{ border: `1px solid ${theme.borderColor}`, borderRadius: 2, padding: "4px 5px", marginBottom: 5 }}>
            <div style={{ height: 3, width: 26, background: accent, borderRadius: 1, marginBottom: 2 }} />
            <div style={{ height: 1.5, width: 32, background: line, borderRadius: 1, marginBottom: 1 }} />
            <div style={{ height: 1.5, width: 28, background: line, borderRadius: 1 }} />
          </div>
          <RecipientBlock color={line} accent={accent} />
          <LetterLines color={line} count={5} />
          <div style={{ borderTop: `0.5px solid ${line}`, marginTop: 4, paddingTop: 3 }}>
            <div style={{ height: 2, width: 18, background: accent, borderRadius: 1, opacity: 0.7 }} />
          </div>
        </div>
      );

    // Corporate: Diplomat — left accent bar
    case "letter-left-bar":
      return (
        <div style={{ width: W, height: H, background: "#fff", borderRadius: 3, overflow: "hidden", position: "relative" }}>
          <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 4, background: accent }} />
          <div style={{ padding: "7px 6px 6px 11px" }}>
            <SenderBlock nameColor={accent} contactColor={line} />
            <div style={{ height: 0.5, background: theme.borderColor, marginTop: 4, marginBottom: 4 }} />
            <RecipientBlock color={line} accent={accent} />
            <LetterLines color={line} count={5} />
            <div style={{ marginTop: 3 }}>
              <div style={{ height: 2, width: 18, background: accent, borderRadius: 1, opacity: 0.7 }} />
            </div>
          </div>
        </div>
      );

    // Creative: Canvas — bold accent header block
    case "letter-bold-header":
      return (
        <div style={{ width: W, height: H, background: "#fff", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ background: accent, height: 24, padding: "5px 6px", display: "flex", alignItems: "flex-end" }}>
            <div>
              <div style={{ height: 3.5, width: 30, background: "rgba(255,255,255,0.95)", borderRadius: 1, marginBottom: 2 }} />
              <div style={{ height: 1.5, width: 20, background: "rgba(255,255,255,0.5)", borderRadius: 1 }} />
            </div>
          </div>
          <div style={{ padding: "5px 6px" }}>
            <div style={{ display: "inline-block", background: theme.accentLight, borderRadius: 2, padding: "1px 4px", marginBottom: 4 }}>
              <div style={{ height: 1.5, width: 20, background: accent, borderRadius: 1, opacity: 0.7 }} />
            </div>
            <LetterLines color={line} count={6} />
          </div>
        </div>
      );

    // Creative: Vibrant — left accent strip + colorful divider
    case "letter-vibrant":
      return (
        <div style={{ width: W, height: H, background: "#fff", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: 3, background: accent }} />
          <div style={{ padding: "5px 6px" }}>
            <SenderBlock nameColor={accent} contactColor={line} />
            <div style={{ height: 2, background: `linear-gradient(90deg, ${accent}, ${theme.accentLight})`, marginTop: 4, marginBottom: 4, borderRadius: 1 }} />
            <LetterLines color={line} count={6} />
            <div style={{ marginTop: 3 }}>
              <div style={{ height: 2, width: 18, background: accent, borderRadius: 1, opacity: 0.7 }} />
            </div>
          </div>
        </div>
      );

    // Creative: Portfolio — sidebar layout
    case "letter-sidebar":
      return (
        <div style={{ width: W, height: H, background: "#fff", borderRadius: 3, overflow: "hidden", display: "flex" }}>
          <div style={{ width: "30%", background: theme.accentLight, padding: "6px 3px" }}>
            <div style={{ height: 2.5, width: 18, background: accent, borderRadius: 1, marginBottom: 3, opacity: 0.8 }} />
            <div style={{ height: 1.5, width: 16, background: theme.borderColor, borderRadius: 1, marginBottom: 1.5 }} />
            <div style={{ height: 1.5, width: 14, background: theme.borderColor, borderRadius: 1, marginBottom: 4 }} />
            <div style={{ height: 2, width: 14, background: accent, borderRadius: 1, marginBottom: 2, opacity: 0.6 }} />
            <div style={{ height: 1.5, width: 16, background: theme.borderColor, borderRadius: 1, marginBottom: 1.5 }} />
            <div style={{ height: 1.5, width: 12, background: theme.borderColor, borderRadius: 1 }} />
          </div>
          <div style={{ flex: 1, padding: "6px 5px" }}>
            <LetterLines color={line} count={7} />
            <div style={{ marginTop: 3 }}>
              <div style={{ height: 2, width: 18, background: accent, borderRadius: 1, opacity: 0.7 }} />
            </div>
          </div>
        </div>
      );

    // Tech: Terminal — dark bg, monospace feel
    case "letter-terminal":
      return (
        <div style={{ width: W, height: H, background: "#0d1117", borderRadius: 3, overflow: "hidden", padding: "7px 6px" }}>
          <div style={{ height: 2, width: 10, background: "#484f58", borderRadius: 1, marginBottom: 2 }} />
          <div style={{ height: 3, width: 28, background: accent, borderRadius: 1, marginBottom: 2 }} />
          <div style={{ height: 1.5, width: 34, background: "#30363d", borderRadius: 1, marginBottom: 5 }} />
          <div style={{ borderBottom: "0.5px solid #30363d", marginBottom: 4 }} />
          {[30, 26, 32, 28, 24, 30, 22].map((w, i) => (
            <div key={i} style={{ height: 1.5, width: w, background: "#30363d", borderRadius: 1, marginBottom: 2 }} />
          ))}
          <div style={{ marginTop: 3 }}>
            <div style={{ height: 2, width: 16, background: accent, borderRadius: 1, opacity: 0.8 }} />
          </div>
        </div>
      );

    // Tech: Blueprint — grid border, technical feel
    case "letter-blueprint":
      return (
        <div style={{ width: W, height: H, background: "#fff", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ border: `1px solid ${theme.borderColor}`, margin: 4, borderRadius: 2, padding: "5px 5px", height: H - 8, boxSizing: "border-box" }}>
            <SenderBlock nameColor={accent} contactColor={line} nameW={24} contactW={30} />
            <div style={{ borderBottom: `1px solid ${theme.borderColor}`, marginTop: 3, marginBottom: 4 }} />
            <LetterLines color={line} count={6} />
            <div style={{ marginTop: 3 }}>
              <div style={{ height: 2, width: 16, background: accent, borderRadius: 1, opacity: 0.7 }} />
            </div>
          </div>
        </div>
      );

    // Tech: Stack — top accent strip, developer aesthetic
    case "letter-stack":
      return (
        <div style={{ width: W, height: H, background: "#fff", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: 3, background: accent }} />
          <div style={{ padding: "5px 6px" }}>
            <div style={{ height: 3, width: 28, background: accent, borderRadius: 1, marginBottom: 2 }} />
            <div style={{ height: 1.5, width: 34, background: line, borderRadius: 1, marginBottom: 4 }} />
            <div style={{ display: "inline-block", background: theme.accentLight, borderRadius: 2, padding: "1px 3px", marginBottom: 4 }}>
              <div style={{ height: 1.5, width: 22, background: accent, borderRadius: 1, opacity: 0.6 }} />
            </div>
            <LetterLines color={line} count={6} />
          </div>
        </div>
      );

    // Academic: Scholar — serif feel, double-line divider
    case "letter-scholar":
      return (
        <div style={{ width: W, height: H, background: "#fff", borderRadius: 3, overflow: "hidden", padding: "7px 6px" }}>
          <SenderBlock nameColor={accent} contactColor={line} />
          <div style={{ borderTop: `1.5px solid ${accent}`, borderBottom: `0.5px solid ${accent}`, height: 3, marginTop: 3, marginBottom: 5 }} />
          <RecipientBlock color={line} accent={accent} />
          <LetterLines color={line} count={5} />
          <div style={{ marginTop: 3 }}>
            <div style={{ height: 2, width: 20, background: accent, borderRadius: 1, opacity: 0.6 }} />
          </div>
        </div>
      );

    // Academic: Thesis — tinted header bar, institutional feel
    case "letter-thesis":
      return (
        <div style={{ width: W, height: H, background: "#fff", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ background: theme.accentLight, padding: "5px 6px", borderBottom: `1px solid ${theme.borderColor}` }}>
            <div style={{ height: 3, width: 28, background: accent, borderRadius: 1, marginBottom: 2 }} />
            <div style={{ height: 1.5, width: 34, background: theme.borderColor, borderRadius: 1 }} />
          </div>
          <div style={{ padding: "5px 6px" }}>
            <RecipientBlock color={line} accent={accent} />
            <LetterLines color={line} count={5} />
            <div style={{ marginTop: 3 }}>
              <div style={{ height: 2, width: 18, background: accent, borderRadius: 1, opacity: 0.7 }} />
            </div>
          </div>
        </div>
      );
  }
}

export const ClTemplateThumbnail = memo(function ClTemplateThumbnail({
  templateId,
  accentColor,
}: ClTemplateThumbnailProps) {
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
