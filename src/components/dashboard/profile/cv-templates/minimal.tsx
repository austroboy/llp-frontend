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
    header: {
      marginBottom: 24,
      paddingBottom: 16,
      borderBottom: `0.5px solid ${theme.borderColor}`,
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    headerPhoto: {
      width: 50,
      height: 50,
      borderRadius: 25,
      objectFit: "cover",
    },
    headerText: {
      flex: 1,
    },
    name: {
      fontSize: 24,
      fontFamily: "Helvetica-Bold",
      color: theme.accent,
      marginBottom: 4,
      letterSpacing: 0.5,
    },
    headline: {
      fontSize: 10,
      color: "#6b7280",
      marginBottom: 8,
    },
    contactRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    contactItem: {
      fontSize: 8.5,
      color: "#6b7280",
    },
    contactSep: {
      fontSize: 8.5,
      color: "#d1d5db",
    },
    section: {
      marginBottom: 18,
    },
    sectionTitle: {
      fontSize: 10,
      fontFamily: "Helvetica-Bold",
      color: theme.accent,
      marginBottom: 8,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    summaryText: {
      fontSize: 9.5,
      lineHeight: 1.6,
      color: "#374151",
    },
    expBlock: {
      marginBottom: 12,
    },
    expTitleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 1,
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
      marginBottom: 4,
    },
    expDesc: {
      fontSize: 9,
      lineHeight: 1.5,
      color: "#374151",
    },
    eduBlock: {
      marginBottom: 8,
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
    skillsText: {
      fontSize: 9,
      lineHeight: 1.5,
      color: "#374151",
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
      lineHeight: 1.5,
    },
  });
}

export function MinimalTemplate({
  profile,
  experiences,
  education,
  skills,
  certifications,
  languages,
  accentColor,
}: CvTemplateProps) {
  const theme = deriveTheme(accentColor || "#111827");
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
                <View key={i} style={{ flexDirection: "row" }}>
                  {i > 0 && <Text style={styles.contactSep}>  |  </Text>}
                  <Text style={styles.contactItem}>{c}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {profile.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.summaryText}>{profile.summary}</Text>
          </View>
        )}

        {experiences.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience</Text>
            {experiences.map((exp, i) => (
              <View key={i} style={styles.expBlock} wrap={false}>
                <View style={styles.expTitleRow}>
                  <Text style={styles.expTitle}>{exp.title}</Text>
                  <Text style={styles.expDate}>
                    {formatDate(exp.startDate)}
                    {(exp.startDate || exp.endDate) && " — "}
                    {exp.isCurrent ? "Present" : formatDate(exp.endDate)}
                  </Text>
                </View>
                <Text style={styles.expCompany}>
                  {exp.company}
                  {exp.location ? `, ${exp.location}` : ""}
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
                  {edu.degree}
                  {edu.year ? `, ${edu.year}` : ""}
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
            <Text style={styles.skillsText}>
              {skills
                .map(
                  (s) =>
                    s.name +
                    (s.yearsOfExperience ? ` (${s.yearsOfExperience}y)` : "")
                )
                .join("  ·  ")}
            </Text>
          </View>
        )}

        {certifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Certifications</Text>
            {certifications.map((c, i) => (
              <View key={i} style={styles.certRow}>
                <Text style={styles.certName}>
                  {c.name}
                  {c.org ? ` — ${c.org}` : ""}
                  {c.year ? ` (${c.year})` : ""}
                </Text>
              </View>
            ))}
          </View>
        )}

        {languages && languages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Languages</Text>
            <Text style={styles.langText}>
              {languages
                .map((l) => l.name + (l.proficiency ? ` (${l.proficiency})` : ""))
                .join("  ·  ")}
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
