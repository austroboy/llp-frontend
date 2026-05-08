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
      padding: 50,
      fontSize: 9.5,
      fontFamily: "Helvetica",
      color: "#374151",
    },
    topBorder: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 4,
      backgroundColor: theme.accent,
    },
    header: {
      alignItems: "center",
      marginBottom: 24,
      paddingBottom: 16,
      borderBottom: `0.5px solid ${theme.borderColor}`,
    },
    headerPhoto: {
      width: 60,
      height: 60,
      borderRadius: 30,
      objectFit: "cover",
      marginBottom: 10,
    },
    name: {
      fontSize: 24,
      fontFamily: "Helvetica-Bold",
      color: theme.accent,
      marginBottom: 4,
      letterSpacing: 2,
      textTransform: "uppercase",
    },
    headline: {
      fontSize: 10,
      color: "#6b7280",
      marginBottom: 10,
      letterSpacing: 0.5,
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
    section: {
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 9,
      fontFamily: "Helvetica-Bold",
      color: theme.accent,
      marginBottom: 8,
      letterSpacing: 1.5,
      textTransform: "uppercase",
    },
    summaryText: {
      fontSize: 9.5,
      lineHeight: 1.6,
      color: "#374151",
      textAlign: "center",
    },
    expBlock: {
      marginBottom: 10,
    },
    expHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 2,
    },
    expTitle: {
      fontSize: 10,
      fontFamily: "Helvetica-Bold",
      color: theme.accent,
    },
    expDate: {
      fontSize: 8.5,
      color: "#6b7280",
    },
    expCompany: {
      fontSize: 9,
      color: "#6b7280",
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
      fontSize: 9.5,
      fontFamily: "Helvetica-Bold",
      color: theme.accent,
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
      fontSize: 8,
      color: theme.chipText,
      backgroundColor: theme.chipBg,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 2,
    },
    certRow: {
      marginBottom: 4,
    },
    certName: {
      fontSize: 9,
      color: "#374151",
    },
    langText: {
      fontSize: 9,
      color: "#374151",
    },
  });
}

export function BoardroomTemplate({
  profile,
  experiences,
  education,
  skills,
  certifications,
  languages,
  accentColor,
}: CvTemplateProps) {
  const theme = deriveTheme(accentColor || "#1a1a2e");
  const styles = createStyles(theme);
  const contactParts = buildContactParts(profile);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.topBorder} fixed />

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

        {profile.summary && (
          <View style={styles.section}>
            <Text style={styles.summaryText}>{profile.summary}</Text>
          </View>
        )}

        {experiences.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience</Text>
            {experiences.map((exp, i) => (
              <View key={i} style={styles.expBlock} wrap={false}>
                <View style={styles.expHeader}>
                  <Text style={styles.expTitle}>{exp.title}</Text>
                  <Text style={styles.expDate}>
                    {formatDate(exp.startDate)}
                    {(exp.startDate || exp.endDate) && " — "}
                    {exp.isCurrent ? "Present" : formatDate(exp.endDate)}
                  </Text>
                </View>
                <Text style={styles.expCompany}>
                  {exp.company}
                  {exp.location ? ` | ${exp.location}` : ""}
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
                  {c.name}{c.org ? ` — ${c.org}` : ""}{c.year ? ` (${c.year})` : ""}
                </Text>
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
      </Page>
    </Document>
  );
}
