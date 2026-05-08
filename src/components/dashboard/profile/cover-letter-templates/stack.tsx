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

export function CLStackTemplate({
  content,
  profile,
  jobTitle,
  companyName,
  accentColor,
  signatureUrl,
}: CoverLetterTemplateProps) {
  const theme = deriveTheme(accentColor || "#6366f1");
  const today = formatToday();
  const contactParts = buildContactParts(profile);

  const styles = StyleSheet.create({
    page: {
      padding: 44,
      fontSize: 10,
      fontFamily: "Helvetica",
      color: "#334155",
      backgroundColor: "#ffffff",
    },
    headerStrip: {
      backgroundColor: theme.accent,
      height: 4,
      margin: -44,
      marginBottom: 24,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 4,
    },
    headerName: {
      fontSize: 22,
      fontFamily: "Helvetica-Bold",
      color: "#1e293b",
    },
    headerTag: {
      fontSize: 8,
      fontFamily: "Helvetica-Bold",
      color: theme.accent,
      backgroundColor: lighten(theme.accent, 0.9),
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
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
      marginBottom: 20,
    },
    contactItem: {
      fontSize: 8.5,
      color: theme.accent,
    },
    divider: {
      height: 1,
      backgroundColor: lighten(theme.accent, 0.7),
      marginBottom: 18,
    },
    date: {
      fontSize: 10,
      color: "#64748b",
      marginBottom: 16,
    },
    recipientBlock: {
      marginBottom: 16,
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
        {/* Top accent strip */}
        <View style={styles.headerStrip} />

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerName}>{profile.fullName}</Text>
          <Text style={styles.headerTag}>{jobTitle}</Text>
        </View>
        <Text style={styles.headerHeadline}>{profile.headline}</Text>
        <View style={styles.contactRow}>
          {contactParts.map((c, i) => (
            <Text key={i} style={styles.contactItem}>{c}</Text>
          ))}
        </View>

        <View style={styles.divider} />

        {/* Date */}
        <Text style={styles.date}>{today}</Text>

        {/* Recipient */}
        {(content.recipientName || companyName) && (
          <View style={styles.recipientBlock}>
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
