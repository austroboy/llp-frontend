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
import { formatToday, buildContactParts } from "./helpers";

export function CLMinimalTemplate({
  content,
  profile,
  jobTitle,
  companyName,
  accentColor,
  signatureUrl,
}: CoverLetterTemplateProps) {
  const today = formatToday();
  const contactParts = buildContactParts(profile);

  const styles = StyleSheet.create({
    page: {
      padding: 60,
      fontSize: 10,
      fontFamily: "Helvetica",
      color: "#111827",
      backgroundColor: "#ffffff",
    },
    headerName: {
      fontSize: 18,
      fontFamily: "Helvetica-Bold",
      color: "#111827",
      marginBottom: 6,
    },
    contactRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 30,
    },
    contactItem: {
      fontSize: 9,
      color: "#6b7280",
    },
    contactSep: {
      fontSize: 9,
      color: "#d1d5db",
    },
    date: {
      fontSize: 10,
      color: "#6b7280",
      marginBottom: 20,
    },
    recipientBlock: {
      marginBottom: 20,
    },
    recipientText: {
      fontSize: 10,
      color: "#111827",
      lineHeight: 1.5,
    },
    paragraph: {
      fontSize: 10,
      lineHeight: 1.7,
      color: "#111827",
      marginBottom: 14,
    },
    signoff: {
      fontSize: 10,
      color: "#111827",
      marginTop: 10,
      marginBottom: 4,
    },
    signatureName: {
      fontSize: 10,
      fontFamily: "Helvetica-Bold",
      color: "#111827",
      marginTop: 24,
    },
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <Text style={styles.headerName}>{profile.fullName}</Text>
        <View style={styles.contactRow}>
          {contactParts.map((c, i) => (
            <View key={i} style={{ flexDirection: "row" }}>
              {i > 0 && <Text style={styles.contactSep}>{" | "}</Text>}
              <Text style={styles.contactItem}>{c}</Text>
            </View>
          ))}
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
