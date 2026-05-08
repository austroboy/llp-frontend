"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { CoverLetterTemplateProps } from "./types";
import { deriveTheme, lighten } from "../cv-templates/theme";
import { formatToday, buildContactParts } from "./helpers";

export function CLBlueprintTemplate({
  content,
  profile,
  jobTitle,
  companyName,
  accentColor,
  signatureUrl,
}: CoverLetterTemplateProps) {
  const theme = deriveTheme(accentColor || "#0284c7");
  const today = formatToday();
  const contactParts = buildContactParts(profile);
  const gridColor = lighten(theme.accent, 0.85);

  const styles = StyleSheet.create({
    page: {
      padding: 44,
      fontSize: 10,
      fontFamily: "Helvetica",
      color: "#334155",
      backgroundColor: "#ffffff",
    },
    gridBorder: {
      position: "absolute",
      top: 30,
      left: 30,
      right: 30,
      bottom: 30,
      border: `1px solid ${gridColor}`,
    },
    header: {
      borderBottom: `2px solid ${theme.accent}`,
      paddingBottom: 14,
      marginBottom: 20,
    },
    headerTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 6,
    },
    headerName: {
      fontSize: 20,
      fontFamily: "Helvetica-Bold",
      color: theme.accent,
    },
    headerDate: {
      fontSize: 9,
      color: "#64748b",
      textAlign: "right",
    },
    headerHeadline: {
      fontSize: 10,
      color: "#64748b",
      marginBottom: 6,
    },
    contactRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    contactItem: {
      fontSize: 8.5,
      color: theme.accent,
    },
    sectionLabel: {
      fontSize: 8,
      fontFamily: "Helvetica-Bold",
      color: theme.accent,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 6,
    },
    recipientBlock: {
      marginBottom: 18,
      paddingLeft: 12,
      borderLeft: `3px solid ${gridColor}`,
    },
    recipientText: {
      fontSize: 10,
      color: "#334155",
      lineHeight: 1.5,
    },
    paragraph: {
      fontSize: 10,
      lineHeight: 1.65,
      color: "#334155",
      marginBottom: 12,
    },
    signoff: {
      fontSize: 10,
      color: "#334155",
      marginTop: 10,
      marginBottom: 4,
    },
    signatureName: {
      fontSize: 11,
      fontFamily: "Helvetica-Bold",
      color: theme.accent,
      marginTop: 20,
    },
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.gridBorder} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerName}>{profile.fullName}</Text>
            <Text style={styles.headerDate}>{today}</Text>
          </View>
          <Text style={styles.headerHeadline}>{profile.headline}</Text>
          <View style={styles.contactRow}>
            {contactParts.map((c, i) => (
              <Text key={i} style={styles.contactItem}>{c}</Text>
            ))}
          </View>
        </View>

        {/* Recipient */}
        {(content.recipientName || companyName) && (
          <View style={styles.recipientBlock}>
            <Text style={styles.sectionLabel}>Recipient</Text>
            {content.recipientName && (
              <Text style={styles.recipientText}>{content.recipientName}</Text>
            )}
            <Text style={styles.recipientText}>{companyName}</Text>
            {content.companyAddress && (
              <Text style={styles.recipientText}>{content.companyAddress}</Text>
            )}
          </View>
        )}

        {/* Body */}
        <Text style={styles.paragraph}>{content.opening}</Text>
        <Text style={styles.paragraph}>{content.body}</Text>
        <Text style={styles.paragraph}>{content.closing}</Text>

        {/* Sign-off */}
        <Text style={styles.signoff}>{content.signoff}</Text>
        {signatureUrl && (
          <Image src={signatureUrl} style={{ width: 180, height: 70, objectFit: "contain", marginTop: 8, marginBottom: 4 }} />
        )}
        <Text style={styles.signatureName}>{profile.fullName}</Text>
      </Page>
    </Document>
  );
}
