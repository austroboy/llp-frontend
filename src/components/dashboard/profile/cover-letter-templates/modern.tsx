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

export function CLModernTemplate({
  content,
  profile,
  jobTitle,
  companyName,
  accentColor,
  signatureUrl,
}: CoverLetterTemplateProps) {
  const theme = deriveTheme(accentColor || "#2563eb");
  const today = formatToday();
  const contactParts = buildContactParts(profile);

  const styles = StyleSheet.create({
    page: {
      fontSize: 10,
      fontFamily: "Helvetica",
      color: "#334155",
      backgroundColor: "#ffffff",
    },
    headerBar: {
      backgroundColor: theme.accent,
      padding: 28,
      paddingBottom: 20,
      marginBottom: 24,
    },
    headerName: {
      fontSize: 22,
      fontFamily: "Helvetica-Bold",
      color: "#ffffff",
      marginBottom: 4,
    },
    headerHeadline: {
      fontSize: 10,
      color: "#ffffffcc",
      marginBottom: 8,
    },
    contactRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    contactItem: {
      fontSize: 8.5,
      color: "#ffffffaa",
    },
    body: {
      paddingHorizontal: 50,
      paddingBottom: 50,
    },
    date: {
      fontSize: 10,
      color: "#64748b",
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
      marginTop: 8,
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
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <Text style={styles.headerName}>{profile.fullName}</Text>
          <Text style={styles.headerHeadline}>{profile.headline}</Text>
          <View style={styles.contactRow}>
            {contactParts.map((c, i) => (
              <Text key={i} style={styles.contactItem}>{c}</Text>
            ))}
          </View>
        </View>

        <View style={styles.body}>
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
        </View>
      </Page>
    </Document>
  );
}
