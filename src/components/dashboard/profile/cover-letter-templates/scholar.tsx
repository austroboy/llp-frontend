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

export function CLScholarTemplate({
  content,
  profile,
  jobTitle,
  companyName,
  accentColor,
  signatureUrl,
}: CoverLetterTemplateProps) {
  const theme = deriveTheme(accentColor || "#7c2d12");
  const today = formatToday();
  const contactParts = buildContactParts(profile);

  const styles = StyleSheet.create({
    page: {
      padding: 56,
      fontSize: 10,
      fontFamily: "Times-Roman",
      color: "#334155",
      backgroundColor: "#ffffff",
    },
    headerName: {
      fontSize: 20,
      fontFamily: "Times-Bold",
      color: "#1a1a1a",
      marginBottom: 3,
    },
    headerHeadline: {
      fontSize: 10,
      fontFamily: "Times-Roman",
      color: "#64748b",
      marginBottom: 6,
    },
    contactRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    contactItem: {
      fontSize: 9,
      color: "#64748b",
    },
    doubleLine: {
      marginTop: 10,
      marginBottom: 22,
    },
    lineTop: {
      height: 1.5,
      backgroundColor: theme.accent,
      marginBottom: 2,
    },
    lineBottom: {
      height: 0.5,
      backgroundColor: theme.accent,
    },
    date: {
      fontSize: 10,
      color: "#334155",
      marginBottom: 18,
    },
    recipientBlock: {
      marginBottom: 18,
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
      fontFamily: "Times-Bold",
      color: "#1a1a1a",
      marginTop: 24,
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
        <View style={styles.doubleLine}>
          <View style={styles.lineTop} />
          <View style={styles.lineBottom} />
        </View>

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
