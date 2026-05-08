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
import { deriveTheme, lighten } from "./theme";
import { formatDate, buildContactParts } from "./helpers";

function createStyles(theme: DerivedTheme) {
  return StyleSheet.create({
    page: {
      padding: 0,
      fontSize: 9.5,
      fontFamily: "Helvetica",
      color: "#374151",
    },
    header: {
      backgroundColor: theme.accent,
      padding: 36,
      paddingBottom: 28,
      flexDirection: "row",
      alignItems: "center",
      gap: 18,
    },
    headerPhoto: {
      width: 70,
      height: 70,
      borderRadius: 35,
      objectFit: "cover",
      border: "3px solid #ffffff50",
    },
    headerText: {
      flex: 1,
    },
    name: {
      fontSize: 26,
      fontFamily: "Helvetica-Bold",
      color: "#ffffff",
      marginBottom: 4,
    },
    headline: {
      fontSize: 11,
      color: "#ffffffcc",
      marginBottom: 10,
    },
    contactRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    contactItem: {
      fontSize: 8.5,
      color: "#ffffff99",
    },
    body: {
      padding: 36,
    },
    section: {
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 11,
      fontFamily: "Helvetica-Bold",
      color: theme.accent,
      marginBottom: 8,
      paddingBottom: 4,
      borderBottom: `2px solid ${theme.accent}`,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    summaryText: {
      fontSize: 9.5,
      lineHeight: 1.6,
      color: "#374151",
    },
    timeline: {
      borderLeft: `2px solid ${theme.borderColor}`,
      paddingLeft: 14,
      marginLeft: 4,
    },
    timelineDot: {
      position: "absolute",
      left: -8,
      top: 2,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.accent,
    },
    expBlock: {
      marginBottom: 12,
      position: "relative",
    },
    expTitle: {
      fontSize: 10,
      fontFamily: "Helvetica-Bold",
      color: "#1e293b",
    },
    expDateCompany: {
      fontSize: 8.5,
      color: theme.accent,
      marginBottom: 3,
    },
    expDesc: {
      fontSize: 9,
      lineHeight: 1.4,
      color: "#374151",
    },
    eduBlock: {
      marginBottom: 6,
    },
    eduDegree: {
      fontSize: 10,
      fontFamily: "Helvetica-Bold",
      color: "#1e293b",
    },
    eduInstitution: {
      fontSize: 9,
      color: "#6b7280",
    },
    eduField: {
      fontSize: 8.5,
      color: "#374151",
    },
    skillsWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    skillChip: {
      fontSize: 8.5,
      backgroundColor: theme.chipBg,
      color: theme.chipText,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    certRow: {
      marginBottom: 4,
    },
    certName: {
      fontSize: 9,
      fontFamily: "Helvetica-Bold",
      color: "#374151",
    },
    certOrg: {
      fontSize: 8,
      color: "#6b7280",
    },
    langText: {
      fontSize: 9,
      color: "#374151",
    },
  });
}

export function VibrantTemplate({
  profile,
  experiences,
  education,
  skills,
  certifications,
  languages,
  accentColor,
}: CvTemplateProps) {
  const theme = deriveTheme(accentColor || "#dc2626");
  const styles = createStyles(theme);
  const contactParts = buildContactParts(profile);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {profile.photoUrl && (
            <Image src={profile.photoUrl} style={styles.headerPhoto} />
          )}
          <View style={styles.headerText}>
            <Text style={styles.name}>{profile.fullName}</Text>
            <Text style={styles.headline}>{profile.headline}</Text>
            <View style={styles.contactRow}>
              {contactParts.map((c, i) => (
                <Text key={i} style={styles.contactItem}>{c}</Text>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {profile.summary && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About Me</Text>
              <Text style={styles.summaryText}>{profile.summary}</Text>
            </View>
          )}

          {experiences.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Experience</Text>
              <View style={styles.timeline}>
                {experiences.map((exp, i) => (
                  <View key={i} style={styles.expBlock} wrap={false}>
                    <View style={styles.timelineDot} />
                    <Text style={styles.expTitle}>{exp.title}</Text>
                    <Text style={styles.expDateCompany}>
                      {exp.company}{exp.location ? ` | ${exp.location}` : ""}
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
            </View>
          )}

          {education.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Education</Text>
              {education.map((edu, i) => (
                <View key={i} style={styles.eduBlock}>
                  <Text style={styles.eduDegree}>
                    {edu.degree}{edu.year ? ` (${edu.year})` : ""}
                  </Text>
                  <Text style={styles.eduInstitution}>{edu.institution}</Text>
                  {edu.fieldOfStudy && (
                    <Text style={styles.eduField}>{edu.fieldOfStudy}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {skills.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Skills</Text>
              <View style={styles.skillsWrap}>
                {skills.map((s, i) => (
                  <Text key={i} style={styles.skillChip}>
                    {s.name}{s.yearsOfExperience ? ` (${s.yearsOfExperience}y)` : ""}
                  </Text>
                ))}
              </View>
            </View>
          )}

          {certifications.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Certifications</Text>
              {certifications.map((c, i) => (
                <View key={i} style={styles.certRow}>
                  <Text style={styles.certName}>
                    {c.name}{c.year ? ` (${c.year})` : ""}
                  </Text>
                  {c.org && <Text style={styles.certOrg}>{c.org}</Text>}
                </View>
              ))}
            </View>
          )}

          {languages && languages.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Languages</Text>
              <Text style={styles.langText}>
                {languages.map((l) => l.name + (l.proficiency ? ` (${l.proficiency})` : "")).join("  ·  ")}
              </Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}
