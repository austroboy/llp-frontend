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
      padding: 36,
      fontSize: 9.5,
      fontFamily: "Helvetica",
      color: "#374151",
      backgroundColor: "#fafafa",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      marginBottom: 20,
    },
    headerPhoto: {
      width: 55,
      height: 55,
      borderRadius: 10,
      objectFit: "cover",
    },
    headerText: {
      flex: 1,
    },
    name: {
      fontSize: 22,
      fontFamily: "Helvetica-Bold",
      color: theme.accent,
      marginBottom: 3,
    },
    headline: {
      fontSize: 10,
      color: "#6b7280",
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
    card: {
      backgroundColor: "#ffffff",
      borderRadius: 8,
      border: `1px solid ${theme.borderColor}`,
      padding: 16,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 10,
      fontFamily: "Helvetica-Bold",
      color: theme.accent,
      marginBottom: 10,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    summaryText: {
      fontSize: 9.5,
      lineHeight: 1.6,
      color: "#374151",
    },
    expBlock: {
      marginBottom: 10,
      paddingBottom: 8,
      borderBottom: `0.5px solid ${theme.borderColor}`,
    },
    expBlockLast: {
      marginBottom: 0,
      paddingBottom: 0,
      borderBottom: "none",
    },
    expHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 2,
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
      borderRadius: 14,
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

export function PortfolioTemplate({
  profile,
  experiences,
  education,
  skills,
  certifications,
  languages,
  accentColor,
}: CvTemplateProps) {
  const theme = deriveTheme(accentColor || "#059669");
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

        {profile.summary && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.summaryText}>{profile.summary}</Text>
          </View>
        )}

        {experiences.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Experience</Text>
            {experiences.map((exp, i) => (
              <View
                key={i}
                style={i === experiences.length - 1 ? [styles.expBlock, styles.expBlockLast] : styles.expBlock}
                wrap={false}
              >
                <View style={styles.expHeader}>
                  <Text style={styles.expTitle}>{exp.title}</Text>
                  <Text style={styles.expDate}>
                    {formatDate(exp.startDate)}
                    {(exp.startDate || exp.endDate) && " — "}
                    {exp.isCurrent ? "Present" : formatDate(exp.endDate)}
                  </Text>
                </View>
                <Text style={styles.expCompany}>
                  {exp.company}{exp.location ? ` | ${exp.location}` : ""}
                </Text>
                {exp.description && (
                  <Text style={styles.expDesc}>{exp.description}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {education.length > 0 && (
          <View style={styles.card}>
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
          <View style={styles.card}>
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
          <View style={styles.card}>
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
          <View style={styles.card}>
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
