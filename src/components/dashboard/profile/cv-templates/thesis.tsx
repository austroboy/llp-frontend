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
  return StyleSheet.create({
    page: {
      padding: 45,
      fontSize: 9,
      fontFamily: "Times-Roman",
      color: "#1f2937",
    },
    header: {
      marginBottom: 18,
      paddingBottom: 14,
      borderBottom: `2px solid ${theme.accent}`,
      alignItems: "center",
    },
    headerPhoto: {
      width: 50,
      height: 50,
      borderRadius: 25,
      objectFit: "cover",
      marginBottom: 8,
    },
    name: {
      fontSize: 22,
      fontFamily: "Times-Bold",
      color: theme.accent,
      letterSpacing: 1,
      marginBottom: 4,
    },
    headline: {
      fontSize: 10,
      color: "#4b5563",
      marginBottom: 8,
    },
    contactRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      justifyContent: "center",
    },
    contactItem: {
      fontSize: 8,
      color: "#6b7280",
    },
    twoColumn: {
      flexDirection: "row",
      gap: 20,
    },
    columnLeft: {
      flex: 1,
    },
    columnRight: {
      flex: 1,
    },
    section: {
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 10,
      fontFamily: "Times-Bold",
      color: theme.accent,
      marginBottom: 5,
      paddingBottom: 2,
      borderBottom: `1px solid ${theme.borderColor}`,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    summaryText: {
      fontSize: 9,
      lineHeight: 1.6,
      color: "#1f2937",
    },
    expBlock: {
      marginBottom: 8,
    },
    expTitle: {
      fontSize: 9.5,
      fontFamily: "Times-Bold",
      color: "#1f2937",
    },
    expMeta: {
      fontSize: 8,
      color: "#4b5563",
      marginBottom: 2,
    },
    expDesc: {
      fontSize: 8.5,
      lineHeight: 1.4,
      color: "#374151",
    },
    eduBlock: {
      marginBottom: 5,
    },
    eduDegree: {
      fontSize: 9.5,
      fontFamily: "Times-Bold",
      color: "#1f2937",
    },
    eduMeta: {
      fontSize: 8,
      color: "#4b5563",
    },
    skillsText: {
      fontSize: 8.5,
      lineHeight: 1.5,
      color: "#374151",
    },
    certBlock: {
      marginBottom: 3,
    },
    certText: {
      fontSize: 8.5,
      color: "#374151",
    },
    langText: {
      fontSize: 8.5,
      color: "#374151",
    },
  });
}

export function ThesisTemplate({
  profile,
  experiences,
  education,
  skills,
  certifications,
  languages,
  accentColor,
}: CvTemplateProps) {
  const theme = deriveTheme(accentColor || "#1e40af");
  const styles = createStyles(theme);
  const contactParts = buildContactParts(profile);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Centered single-column header */}
        <View style={styles.header}>
          {profile.photoUrl && (
            <Image src={profile.photoUrl} style={styles.headerPhoto} />
          )}
          <Text style={styles.name}>{profile.fullName}</Text>
          <Text style={styles.headline}>{profile.headline}</Text>
          <View style={styles.contactRow}>
            {contactParts.map((c, i) => (
              <Text key={i} style={styles.contactItem}>{c}</Text>
            ))}
          </View>
        </View>

        {/* Summary — full width */}
        {profile.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Research Summary</Text>
            <Text style={styles.summaryText}>{profile.summary}</Text>
          </View>
        )}

        {/* Two-column body */}
        <View style={styles.twoColumn}>
          <View style={styles.columnLeft}>
            {experiences.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Experience</Text>
                {experiences.map((exp, i) => (
                  <View key={i} style={styles.expBlock} wrap={false}>
                    <Text style={styles.expTitle}>{exp.title}</Text>
                    <Text style={styles.expMeta}>
                      {exp.company}{exp.location ? `, ${exp.location}` : ""}
                      {"  |  "}
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

            {certifications.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Awards & Certifications</Text>
                {certifications.map((c, i) => (
                  <View key={i} style={styles.certBlock}>
                    <Text style={styles.certText}>
                      {c.name}{c.org ? `, ${c.org}` : ""}{c.year ? ` (${c.year})` : ""}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.columnRight}>
            {education.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Education</Text>
                {education.map((edu, i) => (
                  <View key={i} style={styles.eduBlock}>
                    <Text style={styles.eduDegree}>
                      {edu.degree}{edu.fieldOfStudy ? `, ${edu.fieldOfStudy}` : ""}
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
                <Text style={styles.sectionTitle}>Skills & Methods</Text>
                <Text style={styles.skillsText}>
                  {skills
                    .map((s) => s.name + (s.yearsOfExperience ? ` (${s.yearsOfExperience}y)` : ""))
                    .join("; ")}
                </Text>
              </View>
            )}

            {languages && languages.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Languages</Text>
                <Text style={styles.langText}>
                  {languages.map((l) => l.name + (l.proficiency ? ` (${l.proficiency})` : "")).join("; ")}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}
