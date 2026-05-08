"use client";

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { CvTemplateProps } from "./types";
import type { DerivedTheme } from "./theme";
import { deriveTheme } from "./theme";
import { formatDate, buildContactParts } from "./helpers";

function createStyles(theme: DerivedTheme) {
  // Terminal always uses dark background regardless of accent
  return StyleSheet.create({
    page: {
      padding: 36,
      fontSize: 9,
      fontFamily: "Courier",
      color: "#c9d1d9",
      backgroundColor: "#0d1117",
    },
    header: {
      marginBottom: 18,
      paddingBottom: 12,
      borderBottom: `1px solid #30363d`,
    },
    headerTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginBottom: 6,
    },
    headerPhoto: {
      width: 50,
      height: 50,
      borderRadius: 6,
      objectFit: "cover",
      border: `2px solid ${theme.accent}`,
    },
    prompt: {
      fontSize: 8,
      fontFamily: "Courier",
      color: "#8b949e",
    },
    name: {
      fontSize: 20,
      fontFamily: "Courier-Bold",
      color: theme.accent,
      marginBottom: 2,
    },
    headline: {
      fontSize: 9,
      fontFamily: "Courier",
      color: "#8b949e",
      marginBottom: 8,
    },
    contactRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    contactItem: {
      fontSize: 8,
      fontFamily: "Courier",
      color: "#58a6ff",
    },
    section: {
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 10,
      fontFamily: "Courier-Bold",
      color: theme.accent,
      marginBottom: 6,
    },
    commentLine: {
      fontSize: 8,
      fontFamily: "Courier",
      color: "#484f58",
      marginBottom: 4,
    },
    summaryText: {
      fontSize: 9,
      lineHeight: 1.5,
      color: "#c9d1d9",
    },
    expBlock: {
      marginBottom: 10,
      paddingLeft: 10,
      borderLeft: `2px solid #30363d`,
    },
    expTitle: {
      fontSize: 9.5,
      fontFamily: "Courier-Bold",
      color: "#f0f6fc",
    },
    expMeta: {
      fontSize: 8,
      fontFamily: "Courier",
      color: theme.accent,
      marginBottom: 2,
    },
    expDesc: {
      fontSize: 8.5,
      lineHeight: 1.4,
      color: "#c9d1d9",
    },
    eduBlock: {
      marginBottom: 6,
    },
    eduDegree: {
      fontSize: 9.5,
      fontFamily: "Courier-Bold",
      color: "#f0f6fc",
    },
    eduMeta: {
      fontSize: 8,
      fontFamily: "Courier",
      color: "#8b949e",
    },
    skillsWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    skillChip: {
      fontSize: 8,
      fontFamily: "Courier",
      backgroundColor: "#21262d",
      color: theme.accent,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 3,
      border: `1px solid #30363d`,
    },
    certBlock: {
      marginBottom: 3,
    },
    certText: {
      fontSize: 8.5,
      fontFamily: "Courier",
      color: "#c9d1d9",
    },
    langText: {
      fontSize: 8.5,
      fontFamily: "Courier",
      color: "#c9d1d9",
    },
  });
}

export function TerminalTemplate({
  profile,
  experiences,
  education,
  skills,
  certifications,
  languages,
  accentColor,
}: CvTemplateProps) {
  const theme = deriveTheme(accentColor || "#22c55e");
  const styles = createStyles(theme);
  const contactParts = buildContactParts(profile);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            {profile.photoUrl && (
              <Image src={profile.photoUrl} style={styles.headerPhoto} />
            )}
            <View>
              <Text style={styles.prompt}>$ whoami</Text>
              <Text style={styles.name}>{profile.fullName}</Text>
            </View>
          </View>
          <Text style={styles.headline}>{`> ${profile.headline}`}</Text>
          <View style={styles.contactRow}>
            {contactParts.map((c, i) => (
              <Text key={i} style={styles.contactItem}>{c}</Text>
            ))}
          </View>
        </View>

        {profile.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{"## README.md"}</Text>
            <Text style={styles.summaryText}>{profile.summary}</Text>
          </View>
        )}

        {experiences.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{"## Experience"}</Text>
            {experiences.map((exp, i) => (
              <View key={i} style={styles.expBlock} wrap={false}>
                <Text style={styles.expTitle}>{exp.title}</Text>
                <Text style={styles.expMeta}>
                  {`@ ${exp.company}`}{exp.location ? ` | ${exp.location}` : ""}
                  {"  ·  "}
                  {formatDate(exp.startDate)}
                  {(exp.startDate || exp.endDate) && " — "}
                  {exp.isCurrent ? "Present" : formatDate(exp.endDate)}
                </Text>
                {exp.description && (
                  <Text style={styles.expDesc}>{exp.description}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{"## Education"}</Text>
            {education.map((edu, i) => (
              <View key={i} style={styles.eduBlock}>
                <Text style={styles.eduDegree}>
                  {edu.degree}{edu.fieldOfStudy ? ` — ${edu.fieldOfStudy}` : ""}
                </Text>
                <Text style={styles.eduMeta}>
                  {edu.institution}{edu.year ? `, ${edu.year}` : ""}
                </Text>
              </View>
            ))}
          </View>
        )}

        {skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{"## Tech Stack"}</Text>
            <View style={styles.skillsWrap}>
              {skills.map((s, i) => (
                <Text key={i} style={styles.skillChip}>
                  {s.name}{s.yearsOfExperience ? ` ${s.yearsOfExperience}y` : ""}
                </Text>
              ))}
            </View>
          </View>
        )}

        {certifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{"## Certifications"}</Text>
            {certifications.map((c, i) => (
              <View key={i} style={styles.certBlock}>
                <Text style={styles.certText}>
                  {"- "}{c.name}{c.org ? ` (${c.org})` : ""}{c.year ? ` [${c.year}]` : ""}
                </Text>
              </View>
            ))}
          </View>
        )}

        {languages && languages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{"## Languages"}</Text>
            <Text style={styles.langText}>
              {languages.map((l) => l.name + (l.proficiency ? `: ${l.proficiency}` : "")).join("  |  ")}
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
