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

export function CLTerminalTemplate({
  content,
  profile,
  jobTitle,
  companyName,
  accentColor,
  signatureUrl,
}: CoverLetterTemplateProps) {
  const theme = deriveTheme(accentColor || "#22c55e");
  const today = formatToday();
  const contactParts = buildContactParts(profile);

  const styles = StyleSheet.create({
    page: {
      padding: 36,
      fontSize: 9,
      fontFamily: "Courier",
      color: "#c9d1d9",
      backgroundColor: "#0d1117",
    },
    header: {
      marginBottom: 18,
      paddingBottom: 12,
      borderBottom: "1px solid #30363d",
    },
    prompt: {
      fontSize: 8,
      fontFamily: "Courier",
      color: "#8b949e",
      marginBottom: 2,
    },
    name: {
      fontSize: 20,
      fontFamily: "Courier-Bold",
      color: theme.accent,
      marginBottom: 2,
    },
    headline: {
      fontSize: 9,
      fontFamily: "Courier",
      color: "#8b949e",
      marginBottom: 8,
    },
    contactRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    contactItem: {
      fontSize: 8,
      fontFamily: "Courier",
      color: "#58a6ff",
    },
    commentLine: {
      fontSize: 8,
      fontFamily: "Courier",
      color: "#484f58",
      marginBottom: 4,
    },
    metaBlock: {
      marginBottom: 14,
    },
    metaLabel: {
      fontSize: 8,
      fontFamily: "Courier",
      color: "#8b949e",
    },
    metaValue: {
      fontSize: 9,
      fontFamily: "Courier",
      color: theme.accent,
    },
    recipientBlock: {
      marginBottom: 14,
      paddingLeft: 10,
      borderLeft: "2px solid #30363d",
    },
    recipientText: {
      fontSize: 9,
      fontFamily: "Courier",
      color: "#c9d1d9",
      lineHeight: 1.4,
    },
    paragraph: {
      fontSize: 9,
      fontFamily: "Courier",
      lineHeight: 1.6,
      color: "#c9d1d9",
      marginBottom: 12,
    },
    signoff: {
      fontSize: 9,
      fontFamily: "Courier",
      color: "#c9d1d9",
      marginTop: 10,
      marginBottom: 4,
    },
    signatureName: {
      fontSize: 10,
      fontFamily: "Courier-Bold",
      color: theme.accent,
      marginTop: 16,
    },
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.prompt}>$ whoami</Text>
          <Text style={styles.name}>{profile.fullName}</Text>
          <Text style={styles.headline}>{`> ${profile.headline}`}</Text>
          <View style={styles.contactRow}>
            {contactParts.map((c, i) => (
              <Text key={i} style={styles.contactItem}>{c}</Text>
            ))}
          </View>
        </View>

        {/* Metadata */}
        <View style={styles.metaBlock}>
          <Text style={styles.commentLine}>{`// cover-letter.md — ${today}`}</Text>
          <Text style={styles.commentLine}>{`// target: ${jobTitle} @ ${companyName}`}</Text>
        </View>

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
