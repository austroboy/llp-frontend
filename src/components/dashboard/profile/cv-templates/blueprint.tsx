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
      flexDirection: "row",
      fontSize: 9,
      fontFamily: "Helvetica",
      color: "#334155",
    },
    sidebar: {
      width: 195,
      backgroundColor: theme.accentLight,
      padding: 22,
      paddingTop: 34,
    },
    sidebarPhoto: {
      width: 65,
      height: 65,
      borderRadius: 6,
      objectFit: "cover",
      marginBottom: 12,
      border: `2px solid ${theme.accent}`,
    },
    sidebarName: {
      fontSize: 16,
      fontFamily: "Helvetica-Bold",
      color: theme.accent,
      marginBottom: 4,
    },
    sidebarHeadline: {
      fontSize: 8.5,
      color: "#4b5563",
      marginBottom: 18,
    },
    sidebarSection: {
      marginBottom: 14,
    },
    sidebarSectionTitle: {
      fontSize: 8,
      fontFamily: "Helvetica-Bold",
      color: theme.accent,
      textTransform: "uppercase",
      letterSpacing: 1.2,
      marginBottom: 6,
      paddingBottom: 3,
      borderBottom: `1px solid ${theme.borderColor}`,
    },
    sidebarItem: {
      fontSize: 8,
      color: "#374151",
      marginBottom: 3,
      lineHeight: 1.4,
    },
    skillGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 4,
    },
    skillTag: {
      fontSize: 7.5,
      backgroundColor: theme.accent,
      color: "#ffffff",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 2,
    },
    main: {
      flex: 1,
      padding: 28,
      paddingTop: 34,
    },
    mainSection: {
      marginBottom: 16,
    },
    mainSectionTitle: {
      fontSize: 11,
      fontFamily: "Helvetica-Bold",
      color: theme.accent,
      marginBottom: 8,
      paddingBottom: 3,
      borderBottom: `2px solid ${theme.accent}`,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    summaryText: {
      fontSize: 9,
      lineHeight: 1.5,
      color: "#374151",
    },
    expBlock: {
      marginBottom: 10,
      paddingLeft: 10,
      borderLeft: `2px solid ${theme.borderColor}`,
    },
    expTitle: {
      fontSize: 10,
      fontFamily: "Helvetica-Bold",
      color: "#1e293b",
    },
    expDate: {
      fontSize: 8,
      color: theme.accent,
      fontFamily: "Helvetica-Bold",
    },
    expCompany: {
      fontSize: 9,
      color: "#6b7280",
      marginBottom: 3,
    },
    expDesc: {
      fontSize: 8.5,
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
      fontSize: 8,
      color: "#374151",
    },
    certRow: {
      marginBottom: 4,
    },
    certName: {
      fontSize: 9,
      fontFamily: "Helvetica-Bold",
      color: "#1e293b",
    },
    certOrg: {
      fontSize: 8,
      color: "#6b7280",
    },
  });
}

export function BlueprintTemplate({
  profile,
  experiences,
  education,
  skills,
  certifications,
  languages,
  accentColor,
}: CvTemplateProps) {
  const theme = deriveTheme(accentColor || "#0284c7");
  const styles = createStyles(theme);
  const contactLines = buildContactParts(profile);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.sidebar}>
          {profile.photoUrl && (
            <Image src={profile.photoUrl} style={styles.sidebarPhoto} />
          )}
          <Text style={styles.sidebarName}>{profile.fullName}</Text>
          <Text style={styles.sidebarHeadline}>{profile.headline}</Text>

          <View style={styles.sidebarSection}>
            <Text style={styles.sidebarSectionTitle}>Contact</Text>
            {contactLines.map((c, i) => (
              <Text key={i} style={styles.sidebarItem}>{c}</Text>
            ))}
          </View>

          {skills.length > 0 && (
            <View style={styles.sidebarSection}>
              <Text style={styles.sidebarSectionTitle}>Tech Stack</Text>
              <View style={styles.skillGrid}>
                {skills.map((s, i) => (
                  <Text key={i} style={styles.skillTag}>{s.name}</Text>
                ))}
              </View>
            </View>
          )}

          {languages && languages.length > 0 && (
            <View style={styles.sidebarSection}>
              <Text style={styles.sidebarSectionTitle}>Languages</Text>
              {languages.map((l, i) => (
                <Text key={i} style={styles.sidebarItem}>
                  {l.name}{l.proficiency ? ` — ${l.proficiency}` : ""}
                </Text>
              ))}
            </View>
          )}

          {certifications.length > 0 && (
            <View style={styles.sidebarSection}>
              <Text style={styles.sidebarSectionTitle}>Certifications</Text>
              {certifications.map((c, i) => (
                <Text key={i} style={styles.sidebarItem}>
                  {c.name}{c.year ? ` (${c.year})` : ""}
                </Text>
              ))}
            </View>
          )}
        </View>

        <View style={styles.main}>
          {profile.summary && (
            <View style={styles.mainSection}>
              <Text style={styles.mainSectionTitle}>Summary</Text>
              <Text style={styles.summaryText}>{profile.summary}</Text>
            </View>
          )}

          {experiences.length > 0 && (
            <View style={styles.mainSection}>
              <Text style={styles.mainSectionTitle}>Experience</Text>
              {experiences.map((exp, i) => (
                <View key={i} style={styles.expBlock} wrap={false}>
                  <Text style={styles.expTitle}>{exp.title}</Text>
                  <Text style={styles.expDate}>
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
          )}

          {education.length > 0 && (
            <View style={styles.mainSection}>
              <Text style={styles.mainSectionTitle}>Education</Text>
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

          {certifications.length > 0 && (
            <View style={styles.mainSection}>
              <Text style={styles.mainSectionTitle}>Certifications</Text>
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
        </View>
      </Page>
    </Document>
  );
}
