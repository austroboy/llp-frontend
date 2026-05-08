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
import { deriveTheme, darken, lighten } from "./theme";
import { formatDate, buildContactParts } from "./helpers";

function createStyles(theme: DerivedTheme) {
  const sidebarBorderColor = lighten(theme.sidebarBg, 0.25);
  return StyleSheet.create({
    page: {
      flexDirection: "row",
      fontSize: 9,
      fontFamily: "Helvetica",
      color: "#334155",
    },
    sidebar: {
      width: 200,
      backgroundColor: theme.sidebarBg,
      padding: 24,
      paddingTop: 36,
      color: theme.sidebarText,
    },
    sidebarPhoto: {
      width: 70,
      height: 70,
      borderRadius: 35,
      objectFit: "cover",
      marginBottom: 12,
      alignSelf: "center",
      border: `2px solid ${sidebarBorderColor}`,
    },
    sidebarName: {
      fontSize: 18,
      fontFamily: "Helvetica-Bold",
      color: "#ffffff",
      marginBottom: 4,
    },
    sidebarHeadline: {
      fontSize: 9,
      color: theme.accentLight,
      marginBottom: 18,
    },
    sidebarSection: {
      marginBottom: 16,
    },
    sidebarSectionTitle: {
      fontSize: 9,
      fontFamily: "Helvetica-Bold",
      color: "#ffffff",
      textTransform: "uppercase",
      letterSpacing: 1.2,
      marginBottom: 6,
      paddingBottom: 3,
      borderBottom: `1px solid ${sidebarBorderColor}`,
    },
    sidebarItem: {
      fontSize: 8,
      color: theme.sidebarText,
      marginBottom: 3,
      lineHeight: 1.4,
    },
    sidebarSkill: {
      fontSize: 8,
      color: theme.sidebarText,
      marginBottom: 4,
    },
    skillBar: {
      height: 3,
      backgroundColor: sidebarBorderColor,
      borderRadius: 2,
      marginTop: 2,
      marginBottom: 6,
    },
    skillBarFill: {
      height: 3,
      backgroundColor: theme.accentLight,
      borderRadius: 2,
    },
    main: {
      flex: 1,
      padding: 30,
      paddingTop: 36,
    },
    mainSection: {
      marginBottom: 16,
    },
    mainSectionTitle: {
      fontSize: 12,
      fontFamily: "Helvetica-Bold",
      color: theme.accent,
      marginBottom: 8,
      paddingBottom: 3,
      borderBottom: `1.5px solid ${theme.accent}`,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    summaryText: {
      fontSize: 9,
      lineHeight: 1.5,
      color: "#334155",
    },
    expBlock: {
      marginBottom: 10,
    },
    expHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
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
      color: "#64748b",
      marginBottom: 3,
    },
    expDesc: {
      fontSize: 8.5,
      lineHeight: 1.4,
      color: "#334155",
    },
    eduBlock: {
      marginBottom: 8,
    },
    eduDegree: {
      fontSize: 10,
      fontFamily: "Helvetica-Bold",
      color: "#1e293b",
    },
    eduInstitution: {
      fontSize: 9,
      color: "#64748b",
    },
    eduField: {
      fontSize: 8,
      color: "#334155",
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
      color: "#64748b",
    },
  });
}

export function ModernTemplate({
  profile,
  experiences,
  education,
  skills,
  certifications,
  languages,
  accentColor,
}: CvTemplateProps) {
  const theme = deriveTheme(accentColor || "#2563eb");
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
              <Text style={styles.sidebarSectionTitle}>Skills</Text>
              {skills.map((s, i) => (
                <View key={i}>
                  <Text style={styles.sidebarSkill}>
                    {s.name}
                    {s.yearsOfExperience ? ` · ${s.yearsOfExperience}y` : ""}
                  </Text>
                  <View style={styles.skillBar}>
                    <View
                      style={[
                        styles.skillBarFill,
                        {
                          width: `${Math.min(
                            100,
                            (s.yearsOfExperience || 3) * 10
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          {languages && languages.length > 0 && (
            <View style={styles.sidebarSection}>
              <Text style={styles.sidebarSectionTitle}>Languages</Text>
              {languages.map((l, i) => (
                <Text key={i} style={styles.sidebarItem}>
                  {l.name}
                  {l.proficiency ? ` — ${l.proficiency}` : ""}
                </Text>
              ))}
            </View>
          )}

          {certifications.length > 0 && (
            <View style={styles.sidebarSection}>
              <Text style={styles.sidebarSectionTitle}>Certifications</Text>
              {certifications.map((c, i) => (
                <Text key={i} style={styles.sidebarItem}>
                  {c.name}
                  {c.year ? ` (${c.year})` : ""}
                </Text>
              ))}
            </View>
          )}
        </View>

        <View style={styles.main}>
          {profile.summary && (
            <View style={styles.mainSection}>
              <Text style={styles.mainSectionTitle}>Profile</Text>
              <Text style={styles.summaryText}>{profile.summary}</Text>
            </View>
          )}

          {experiences.length > 0 && (
            <View style={styles.mainSection}>
              <Text style={styles.mainSectionTitle}>Experience</Text>
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
            <View style={styles.mainSection}>
              <Text style={styles.mainSectionTitle}>Education</Text>
              {education.map((edu, i) => (
                <View key={i} style={styles.eduBlock}>
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

          {certifications.length > 0 && (
            <View style={styles.mainSection}>
              <Text style={styles.mainSectionTitle}>Certifications</Text>
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
        </View>
      </Page>
    </Document>
  );
}
