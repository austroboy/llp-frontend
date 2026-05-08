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
      padding: 40,
      fontSize: 10,
      fontFamily: "Times-Roman",
      color: "#334155",
      backgroundColor: "#ffffff",
    },
    header: {
      backgroundColor: theme.accent,
      margin: -40,
      marginBottom: 20,
      padding: 30,
      paddingBottom: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    headerPhoto: {
      width: 60,
      height: 60,
      borderRadius: 30,
      objectFit: "cover",
      border: "2px solid #ffffff40",
    },
    headerText: {
      flex: 1,
    },
    name: {
      fontSize: 22,
      fontFamily: "Times-Bold",
      color: "#ffffff",
      marginBottom: 4,
    },
    headline: {
      fontSize: 11,
      color: "#94a3b8",
      marginBottom: 10,
    },
    contactRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    contactItem: {
      fontSize: 9,
      color: "#cbd5e1",
    },
    section: {
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 12,
      fontFamily: "Times-Bold",
      color: theme.accent,
      marginBottom: 6,
      paddingBottom: 3,
      borderBottom: `1.5px solid ${theme.accent}`,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    summaryText: {
      fontSize: 10,
      lineHeight: 1.5,
      color: "#334155",
    },
    expHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 2,
    },
    expTitle: {
      fontSize: 10,
      fontFamily: "Times-Bold",
      color: theme.accent,
    },
    expDate: {
      fontSize: 9,
      color: "#64748b",
    },
    expCompany: {
      fontSize: 9,
      color: "#64748b",
      marginBottom: 3,
    },
    expDesc: {
      fontSize: 9,
      lineHeight: 1.4,
      color: "#334155",
      marginBottom: 8,
    },
    eduRow: {
      marginBottom: 6,
    },
    eduDegree: {
      fontSize: 10,
      fontFamily: "Times-Bold",
      color: theme.accent,
    },
    eduInstitution: {
      fontSize: 9,
      color: "#64748b",
    },
    eduField: {
      fontSize: 9,
      color: "#334155",
    },
    skillsWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    skillChip: {
      fontSize: 9,
      backgroundColor: theme.chipBg,
      color: theme.chipText,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 3,
    },
    certRow: {
      marginBottom: 4,
    },
    certName: {
      fontSize: 9,
      fontFamily: "Times-Bold",
      color: "#334155",
    },
    certOrg: {
      fontSize: 8,
      color: "#64748b",
    },
    langRow: {
      flexDirection: "row",
      gap: 16,
      flexWrap: "wrap",
    },
    langItem: {
      fontSize: 9,
      color: "#334155",
    },
    langProf: {
      fontSize: 8,
      color: "#64748b",
    },
  });
}

export function ProfessionalTemplate({
  profile,
  experiences,
  education,
  skills,
  certifications,
  languages,
  accentColor,
}: CvTemplateProps) {
  const theme = deriveTheme(accentColor || "#1e293b");
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
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Summary</Text>
            <Text style={styles.summaryText}>{profile.summary}</Text>
          </View>
        )}

        {experiences.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience</Text>
            {experiences.map((exp, i) => (
              <View key={i} wrap={false}>
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
              <View key={i} style={styles.eduRow}>
                <Text style={styles.eduDegree}>
                  {edu.degree}
                  {edu.year ? ` (${edu.year})` : ""}
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
                  {s.name}
                  {s.yearsOfExperience ? ` (${s.yearsOfExperience}y)` : ""}
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
                  {c.name}
                  {c.year ? ` (${c.year})` : ""}
                </Text>
                {c.org && <Text style={styles.certOrg}>{c.org}</Text>}
              </View>
            ))}
          </View>
        )}

        {languages && languages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Languages</Text>
            <View style={styles.langRow}>
              {languages.map((l, i) => (
                <View key={i}>
                  <Text style={styles.langItem}>
                    {l.name}
                    {l.proficiency && (
                      <Text style={styles.langProf}> — {l.proficiency}</Text>
                    )}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
}
