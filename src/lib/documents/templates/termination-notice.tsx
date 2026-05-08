"use client";

// Termination Notice PDF template.
// Renders the AI-generated draft into a formal A4 corporate notice with
// letterhead, metadata, addressee block, body paragraphs, statutory basis,
// signature block, and footer disclaimer. Uses @react-pdf/renderer.

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

export interface TerminationNoticePdfProps {
  userInputs: {
    employeeName: string;
    employeeDesignation?: string;
    employerCompany: string;
    terminationDate: string; // ISO "2026-05-15"
    noticeStartDate: string;
    reason: "retrenchment" | "end-of-contract" | "performance" | "mutual";
    noticePeriodDays: string; // "120" / "60" etc.
    employerAddress?: string;
    employerSignatoryName?: string;
    employerSignatoryTitle?: string;
  };
  draftText: string;
  sectionCitations: string[];
  language: "en" | "bn";
  generatedAt: string; // ISO timestamp
}

const COLORS = {
  primary: "#0f172a",
  accent: "#1e40af",
  muted: "#64748b",
  border: "#e2e8f0",
  body: "#1f2937",
  boxBg: "#f8fafc",
  warn: "#92400e",
  warnBg: "#fef3c7",
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: COLORS.body,
    backgroundColor: "#ffffff",
  },
  langTag: {
    position: "absolute",
    top: 16,
    right: 40,
    fontSize: 8,
    color: COLORS.muted,
  },
  letterhead: {
    borderTop: `3px solid ${COLORS.primary}`,
    borderBottom: `1px solid ${COLORS.border}`,
    paddingTop: 16,
    paddingBottom: 12,
    marginBottom: 18,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    letterSpacing: 2,
    marginBottom: 4,
    textAlign: "center",
  },
  company: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.accent,
    textAlign: "center",
  },
  companyAddr: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 2,
    textAlign: "center",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  metaItem: {
    fontSize: 10,
    color: COLORS.body,
  },
  metaLabel: {
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
  },
  toBox: {
    borderLeft: `3px solid ${COLORS.accent}`,
    backgroundColor: COLORS.boxBg,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 18,
  },
  toLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  toName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
  },
  toDesignation: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 2,
  },
  bodySection: {
    marginBottom: 16,
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.55,
    color: COLORS.body,
    marginBottom: 8,
    textAlign: "justify",
  },
  fallbackPara: {
    fontSize: 10,
    lineHeight: 1.55,
    color: COLORS.warn,
    fontFamily: "Helvetica-Oblique",
    marginBottom: 8,
  },
  statutoryBox: {
    border: `1px solid ${COLORS.border}`,
    borderLeft: `3px solid ${COLORS.primary}`,
    backgroundColor: COLORS.boxBg,
    padding: 10,
    marginTop: 6,
    marginBottom: 20,
  },
  statutoryTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  statutoryItem: {
    fontSize: 9,
    color: COLORS.body,
    lineHeight: 1.4,
    marginBottom: 3,
  },
  signBlock: {
    marginTop: 14,
    marginBottom: 20,
  },
  signFor: {
    fontSize: 10,
    color: COLORS.body,
    marginBottom: 30,
  },
  signLine: {
    borderBottom: `1px solid ${COLORS.primary}`,
    width: 200,
    marginBottom: 4,
  },
  signName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
  },
  signTitle: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 1,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    paddingTop: 8,
    borderTop: `1px solid ${COLORS.border}`,
  },
  footerText: {
    fontSize: 7.5,
    color: COLORS.muted,
    lineHeight: 1.4,
  },
  pageNumber: {
    fontSize: 7.5,
    color: COLORS.muted,
    textAlign: "right",
    marginTop: 2,
  },
});

function formatDate(iso: string, language: "en" | "bn"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const locale = language === "bn" ? "bn-BD" : "en-GB";
  try {
    return d.toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function buildRef(generatedAt: string, employeeName: string): string {
  const d = new Date(generatedAt);
  const iso = Number.isNaN(d.getTime())
    ? new Date().toISOString()
    : d.toISOString();
  const yyyymmdd = iso.slice(0, 10).replace(/-/g, "");
  const initials = (employeeName || "XX")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "X")
    .join("")
    .padEnd(2, "X");
  // Deterministic 4-char suffix: last 4 hex chars of combined hash-ish string.
  const seed = `${yyyymmdd}-${initials}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const suffix = h.toString(16).toUpperCase().padStart(4, "0").slice(-4);
  return `TRM-${yyyymmdd}-${initials}${suffix}`;
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function TerminationNoticePdf({
  userInputs,
  draftText,
  sectionCitations,
  language,
  generatedAt,
}: TerminationNoticePdfProps) {
  const is2026 = /\b2026\b/.test(draftText);
  const actWording = is2026
    ? "Bangladesh Labour Act, 2006 (as amended by the 2026 Ordinance)"
    : "Bangladesh Labour Act, 2006 as amended";
  const ref = buildRef(generatedAt, userInputs.employeeName);
  const paragraphs = splitParagraphs(draftText);
  const hasDraft = paragraphs.length > 0;

  const signatoryName =
    userInputs.employerSignatoryName || "Authorised Signatory";
  const signatoryTitle =
    userInputs.employerSignatoryTitle || "For and on behalf of the Employer";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {language === "bn" && (
          <Text style={styles.langTag} fixed>
            বাংলা (Bengali)
          </Text>
        )}

        {/* Letterhead */}
        <View style={styles.letterhead}>
          <Text style={styles.title}>TERMINATION NOTICE</Text>
          <Text style={styles.company}>{userInputs.employerCompany}</Text>
          {userInputs.employerAddress && (
            <Text style={styles.companyAddr}>{userInputs.employerAddress}</Text>
          )}
        </View>

        {/* Metadata */}
        <View style={styles.metaRow}>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Date: </Text>
            {formatDate(userInputs.noticeStartDate, language)}
          </Text>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Notice Ref: </Text>
            {ref}
          </Text>
        </View>

        {/* To block */}
        <View style={styles.toBox}>
          <Text style={styles.toLabel}>To</Text>
          <Text style={styles.toName}>{userInputs.employeeName}</Text>
          {userInputs.employeeDesignation ? (
            <Text style={styles.toDesignation}>
              {userInputs.employeeDesignation}
            </Text>
          ) : null}
        </View>

        {/* Body */}
        <View style={styles.bodySection}>
          {hasDraft ? (
            paragraphs.map((p, i) => (
              <Text key={i} style={styles.paragraph}>
                {p}
              </Text>
            ))
          ) : (
            <Text style={styles.fallbackPara}>
              Draft text not available. Please regenerate the notice.
            </Text>
          )}
        </View>

        {/* Statutory basis */}
        {sectionCitations.length > 0 && (
          <View style={styles.statutoryBox} wrap={false}>
            <Text style={styles.statutoryTitle}>Statutory Basis</Text>
            {sectionCitations.map((section, i) => (
              <Text key={i} style={styles.statutoryItem}>
                • under {section}, {actWording}
              </Text>
            ))}
          </View>
        )}

        {/* Signature */}
        <View style={styles.signBlock} wrap={false}>
          <Text style={styles.signFor}>
            For {userInputs.employerCompany},
          </Text>
          <View style={styles.signLine} />
          <Text style={styles.signName}>{signatoryName}</Text>
          <Text style={styles.signTitle}>{signatoryTitle}</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            AI-assisted draft. This notice must be reviewed by a qualified
            labour lawyer and the signatory before being served. Generated at{" "}
            {generatedAt}.
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
            fixed
          />
        </View>
      </Page>
    </Document>
  );
}

export default TerminationNoticePdf;
