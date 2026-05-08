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

export function CLVibrantTemplate({
  content,
  profile,
  jobTitle,
  companyName,
  accentColor,
  signatureUrl,
}: CoverLetterTemplateProps) {
  const theme = deriveTheme(accentColor || "#dc2626");
  const today = formatToday();
  const contactParts = buildContactParts(profile);

  const styles = StyleSheet.create({
    page: {
      padding: 50,
      fontSize: 10,
      fontFamily: "Helvetica",
      color: "#334155",
      backgroundColor: "#ffffff",
    },
    accentStrip: {
      position: "absolute",
      top: 0,
      left: 0,
      width: 6,
      height: "100%",
      backgroundColor: theme.accent,
    },
    header: {
      marginBottom: 20,
      paddingLeft: 10,
    },
    headerName: {
      fontSize: 24,
      fontFamily: "Helvetica-Bold",
      color: theme.accent,
      marginBottom: 3,
    },
    headerHeadline: {
      fontSize: 10,
      color: "#64748b",
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
    divider: {
      height: 2,
      backgroundColor: lighten(theme.accent, 0.7),
      marginBottom: 20,
    },
    date: {
      fontSize: 10,
      color: theme.accent,
      fontFamily: "Helvetica-Bold",
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
      fontSize: 12,
      fontFamily: "Helvetica-Bold",
      color: theme.accent,
      marginTop: 20,
    },
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Accent strip along left edge */}
        <View style={styles.accentStrip} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerName}>{profile.fullName}</Text>
          <Text style={styles.headerHeadline}>{profile.headline}</Text>
          <View style={styles.contactRow}>
            {contactParts.map((c, i) => (
              <Text key={i} style={styles.contactItem}>{c}</Text>
            ))}
          </View>
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
