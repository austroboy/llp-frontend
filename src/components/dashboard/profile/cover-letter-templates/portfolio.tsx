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

export function CLPortfolioTemplate({
  content,
  profile,
  jobTitle,
  companyName,
  accentColor,
  signatureUrl,
}: CoverLetterTemplateProps) {
  const theme = deriveTheme(accentColor || "#059669");
  const today = formatToday();
  const contactParts = buildContactParts(profile);

  const styles = StyleSheet.create({
    page: {
      flexDirection: "row",
      fontSize: 10,
      fontFamily: "Helvetica",
      color: "#334155",
      backgroundColor: "#ffffff",
    },
    sidebar: {
      width: 180,
      backgroundColor: theme.accent,
      padding: 24,
      paddingTop: 40,
    },
    sidebarName: {
      fontSize: 18,
      fontFamily: "Helvetica-Bold",
      color: "#ffffff",
      marginBottom: 4,
    },
    sidebarHeadline: {
      fontSize: 9,
      color: "#ffffffcc",
      marginBottom: 18,
    },
    sidebarLabel: {
      fontSize: 7,
      fontFamily: "Helvetica-Bold",
      color: "#ffffffaa",
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 4,
      marginTop: 12,
    },
    sidebarItem: {
      fontSize: 8,
      color: "#ffffffdd",
      marginBottom: 3,
      lineHeight: 1.4,
    },
    sidebarDate: {
      fontSize: 8,
      color: "#ffffffcc",
      marginTop: 14,
    },
    main: {
      flex: 1,
      padding: 40,
      paddingTop: 40,
    },
    recipientBlock: {
      marginBottom: 20,
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
        {/* Sidebar */}
        <View style={styles.sidebar}>
          <Text style={styles.sidebarName}>{profile.fullName}</Text>
          <Text style={styles.sidebarHeadline}>{profile.headline}</Text>

          <Text style={styles.sidebarLabel}>Contact</Text>
          {contactParts.map((c, i) => (
            <Text key={i} style={styles.sidebarItem}>{c}</Text>
          ))}

          <Text style={styles.sidebarLabel}>Applying for</Text>
          <Text style={styles.sidebarItem}>{jobTitle}</Text>
          <Text style={styles.sidebarItem}>{companyName}</Text>

          <Text style={styles.sidebarDate}>{today}</Text>
        </View>

        {/* Main content */}
        <View style={styles.main}>
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
