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
      marginBottom: 16,
      paddingBottom: 12,
      borderBottom: `2px solid ${theme.accent}`,
    },
    headerTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginBottom: 6,
    },
    headerPhoto: {
      width: 45,
      height: 45,
      borderRadius: 23,
      objectFit: "cover",
    },
    name: {
      fontSize: 20,
      fontFamily: "Times-Bold",
      color: theme.accent,
    },
    headline: {
      fontSize: 10,
      color: "#4b5563",
      marginBottom: 6,
    },
    contactRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    contactItem: {
      fontSize: 8,
      color: "#6b7280",
    },
    section: {
      marginBottom: 12,
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
      lineHeight: 1.5,
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
      fontSize: 8.5,
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
      fontSize: 8.5,
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

export function ScholarTemplate({
  profile,
  experiences,
  education,
  skills,
  certifications,
  languages,
  accentColor,
}: CvTemplateProps) {
  const theme = deriveTheme(accentColor || "#7c2d12");
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
            <Text style={styles.name}>{profile.fullName}</Text>
          </View>
          <Text style={styles.headline}>{profile.headline}</Text>
          <View style={styles.contactRow}>
            {contactParts.map((c, i) => (
              <Text key={i} style={styles.contactItem}>{c}</Text>
            ))}
          </View>
        </View>

        {profile.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Research Interests / Summary</Text>
            <Text style={styles.summaryText}>{profile.summary}</Text>
          </View>
        )}

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

        {experiences.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Experience</Text>
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

        {skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills & Expertise</Text>
            <Text style={styles.skillsText}>
              {skills
                .map((s) => s.name + (s.yearsOfExperience ? ` (${s.yearsOfExperience}y)` : ""))
                .join("; ")}
            </Text>
          </View>
        )}

        {certifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Certifications & Awards</Text>
            {certifications.map((c, i) => (
              <View key={i} style={styles.certBlock}>
                <Text style={styles.certText}>
                  {c.name}{c.org ? `, ${c.org}` : ""}{c.year ? ` (${c.year})` : ""}
                </Text>
              </View>
            ))}
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
      </Page>
    </Document>
  );
}
