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

export function CLBoardroomTemplate({
  content,
  profile,
  jobTitle,
  companyName,
  accentColor,
  signatureUrl,
}: CoverLetterTemplateProps) {
  const theme = deriveTheme(accentColor || "#1a1a2e");
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
    headerBox: {
      border: `2px solid ${theme.accent}`,
      padding: 20,
      marginBottom: 24,
    },
    headerName: {
      fontSize: 20,
      fontFamily: "Times-Bold",
      color: theme.accent,
      marginBottom: 4,
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
      height: 1,
      backgroundColor: theme.accent,
      opacity: 0.3,
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
      marginTop: 10,
      marginBottom: 4,
    },
    signatureName: {
      fontSize: 11,
      fontFamily: "Times-Bold",
      color: theme.accent,
      marginTop: 22,
    },
    footerLine: {
      position: "absolute",
      bottom: 40,
      left: 50,
      right: 50,
      height: 1,
      backgroundColor: theme.accent,
      opacity: 0.2,
    },
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header in bordered box */}
        <View style={styles.headerBox}>
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
            {content.recipientName && (
              <Text style={styles.recipientText}>{content.recipientName}</Text>
            )}
            <Text style={styles.recipientText}>{companyName}</Text>
            {content.companyAddress && (
              <Text style={styles.recipientText}>{content.companyAddress}</Text>
            )}
          </View>
        )}

        <View style={styles.divider} />

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

        <View style={styles.footerLine} />
      </Page>
    </Document>
  );
}
