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

export function CLDiplomatTemplate({
  content,
  profile,
  jobTitle,
  companyName,
  accentColor,
  signatureUrl,
}: CoverLetterTemplateProps) {
  const theme = deriveTheme(accentColor || "#2d3748");
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
      fontSize: 24,
      fontFamily: "Times-Bold",
      color: theme.accent,
      textAlign: "center",
      marginBottom: 2,
      letterSpacing: 2,
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
      gap: 10,
      marginBottom: 6,
    },
    contactItem: {
      fontSize: 8.5,
      color: "#64748b",
    },
    ornamentRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 8,
      marginTop: 10,
      marginBottom: 24,
    },
    ornamentLine: {
      height: 1,
      width: 80,
      backgroundColor: lighten(theme.accent, 0.5),
    },
    ornamentDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.accent,
    },
    date: {
      fontSize: 10,
      color: "#64748b",
      textAlign: "right",
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
      fontFamily: "Times-Bold",
      color: theme.accent,
      marginTop: 22,
    },
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Centered Header */}
        <Text style={styles.headerName}>{profile.fullName}</Text>
        <Text style={styles.headerHeadline}>{profile.headline}</Text>
        <View style={styles.contactRow}>
          {contactParts.map((c, i) => (
            <Text key={i} style={styles.contactItem}>{c}</Text>
          ))}
        </View>
        <View style={styles.ornamentRow}>
          <View style={styles.ornamentLine} />
          <View style={styles.ornamentDot} />
          <View style={styles.ornamentLine} />
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
