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

export function CLProfessionalTemplate({
  content,
  profile,
  jobTitle,
  companyName,
  accentColor,
  signatureUrl,
}: CoverLetterTemplateProps) {
  const theme = deriveTheme(accentColor || "#1e293b");
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
      fontSize: 22,
      fontFamily: "Times-Bold",
      color: theme.accent,
      marginBottom: 4,
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
      marginBottom: 4,
    },
    contactItem: {
      fontSize: 9,
      color: "#64748b",
    },
    accentLine: {
      height: 2,
      backgroundColor: theme.accent,
      marginTop: 8,
      marginBottom: 20,
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
      marginTop: 8,
      marginBottom: 4,
    },
    signatureName: {
      fontSize: 11,
      fontFamily: "Times-Bold",
      color: theme.accent,
      marginTop: 20,
    },
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <Text style={styles.headerName}>{profile.fullName}</Text>
        <Text style={styles.headerHeadline}>{profile.headline}</Text>
        <View style={styles.contactRow}>
          {contactParts.map((c, i) => (
            <Text key={i} style={styles.contactItem}>{c}</Text>
          ))}
        </View>
        <View style={styles.accentLine} />

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
