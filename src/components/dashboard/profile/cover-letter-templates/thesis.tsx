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

export function CLThesisTemplate({
  content,
  profile,
  jobTitle,
  companyName,
  accentColor,
  signatureUrl,
}: CoverLetterTemplateProps) {
  const theme = deriveTheme(accentColor || "#1e40af");
  const today = formatToday();
  const contactParts = buildContactParts(profile);

  const styles = StyleSheet.create({
    page: {
      padding: 52,
      fontSize: 10,
      fontFamily: "Times-Roman",
      color: "#334155",
      backgroundColor: "#ffffff",
    },
    headerBar: {
      backgroundColor: lighten(theme.accent, 0.92),
      margin: -52,
      marginBottom: 24,
      padding: 28,
      paddingBottom: 18,
      borderBottom: `3px solid ${theme.accent}`,
    },
    headerName: {
      fontSize: 22,
      fontFamily: "Helvetica-Bold",
      color: theme.accent,
      marginBottom: 3,
    },
    headerHeadline: {
      fontSize: 10,
      fontFamily: "Times-Roman",
      color: "#475569",
      marginBottom: 8,
    },
    contactRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    contactItem: {
      fontSize: 8.5,
      color: "#64748b",
    },
    date: {
      fontSize: 10,
      color: "#64748b",
      marginBottom: 18,
    },
    recipientBlock: {
      marginBottom: 18,
    },
    recipientLabel: {
      fontSize: 8,
      fontFamily: "Helvetica-Bold",
      color: theme.accent,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 4,
    },
    recipientText: {
      fontSize: 10,
      color: "#334155",
      lineHeight: 1.5,
    },
    paragraph: {
      fontSize: 10,
      lineHeight: 1.7,
      color: "#334155",
      marginBottom: 12,
      textAlign: "justify",
    },
    signoff: {
      fontSize: 10,
      color: "#334155",
      marginTop: 12,
      marginBottom: 4,
    },
    signatureName: {
      fontSize: 11,
      fontFamily: "Helvetica-Bold",
      color: theme.accent,
      marginTop: 22,
    },
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with tinted bar */}
        <View style={styles.headerBar}>
          <Text style={styles.headerName}>{profile.fullName}</Text>
          <Text style={styles.headerHeadline}>{profile.headline}</Text>
          <View style={styles.contactRow}>
            {contactParts.map((c, i) => (
              <Text key={i} style={styles.contactItem}>{c}</Text>
            ))}
          </View>
        </View>

        {/* Date */}
        <Text style={styles.date}>{today}</Text>

        {/* Recipient */}
        {(content.recipientName || companyName) && (
          <View style={styles.recipientBlock}>
            <Text style={styles.recipientLabel}>To</Text>
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
