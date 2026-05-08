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
import { deriveTheme } from "../cv-templates/theme";
import { formatToday, buildContactParts } from "./helpers";

export function CLExecutiveTemplate({
  content,
  profile,
  jobTitle,
  companyName,
  accentColor,
  signatureUrl,
}: CoverLetterTemplateProps) {
  const theme = deriveTheme(accentColor || "#b8860b");
  const today = formatToday();
  const contactParts = buildContactParts(profile);

  const styles = StyleSheet.create({
    page: {
      padding: 50,
      fontSize: 10,
      fontFamily: "Times-Roman",
      color: "#334155",
      backgroundColor: "#ffffff",
    },
    headerName: {
      fontSize: 26,
      fontFamily: "Times-Bold",
      color: "#1a1a1a",
      letterSpacing: 1.5,
      marginBottom: 4,
      textAlign: "center",
    },
    headerHeadline: {
      fontSize: 10,
      color: "#64748b",
      textAlign: "center",
      marginBottom: 8,
    },
    contactRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 12,
      marginBottom: 6,
    },
    contactItem: {
      fontSize: 8.5,
      color: "#64748b",
    },
    goldRule: {
      height: 2,
      backgroundColor: theme.accent,
      marginTop: 8,
      marginBottom: 24,
    },
    date: {
      fontSize: 10,
      color: "#334155",
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
      lineHeight: 1.6,
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
      fontFamily: "Times-Bold",
      color: "#1a1a1a",
      marginTop: 22,
    },
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Letterhead */}
        <Text style={styles.headerName}>{profile.fullName}</Text>
        <Text style={styles.headerHeadline}>{profile.headline}</Text>
        <View style={styles.contactRow}>
          {contactParts.map((c, i) => (
            <Text key={i} style={styles.contactItem}>{c}</Text>
          ))}
        </View>
        <View style={styles.goldRule} />

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
