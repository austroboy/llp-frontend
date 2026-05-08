"use client";

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";

const LOGO_SRC =
  "data:image/png;base64,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";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: "2px solid #0f172a",
  },
  headerLogo: {
    width: 28,
    height: 28,
    marginRight: 8,
  },
  headerText: {
    flex: 1,
  },
  brandName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  brandTagline: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 2,
  },
  meta: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottom: "1px solid #e2e8f0",
  },
  metaTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 4,
  },
  metaDate: {
    fontSize: 9,
    color: "#64748b",
  },
  messageBlock: {
    marginBottom: 14,
  },
  userLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  aiLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#1e40af",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  messageContent: {
    fontSize: 10,
    lineHeight: 1.5,
    color: "#334155",
  },
  citationBlock: {
    marginTop: 6,
    paddingLeft: 8,
    borderLeft: "2px solid #cbd5e1",
  },
  citationTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    marginBottom: 3,
  },
  citationItem: {
    fontSize: 8,
    color: "#64748b",
    marginBottom: 1,
  },
  separator: {
    borderBottom: "1px solid #e2e8f0",
    marginTop: 10,
    marginBottom: 10,
  },
  disclaimer: {
    marginTop: 24,
    padding: 12,
    backgroundColor: "#fef3c7",
    borderRadius: 4,
  },
  disclaimerTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#92400e",
    marginBottom: 4,
  },
  disclaimerText: {
    fontSize: 8,
    color: "#92400e",
    lineHeight: 1.4,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#94a3b8",
  },
});

interface PdfMessage {
  role: "user" | "assistant";
  content: string;
  citations?: { document?: string; section?: string; text?: string }[] | null;
}

interface ChatPdfProps {
  title: string;
  messages: PdfMessage[];
  date: Date;
}

function ChatPdfDocument({ title, messages, date }: ChatPdfProps) {
  const dateStr = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const capped = messages.slice(0, 100);
  const wasTruncated = messages.length > 100;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={LOGO_SRC} style={styles.headerLogo} />
          <View style={styles.headerText}>
            <Text style={styles.brandName}>Labor Law Partner</Text>
            <Text style={styles.brandTagline}>AI-Powered Legal Research</Text>
          </View>
        </View>

        {/* Meta */}
        <View style={styles.meta}>
          <Text style={styles.metaTitle}>{title}</Text>
          <Text style={styles.metaDate}>{dateStr}</Text>
        </View>

        {/* Messages */}
        {capped.map((msg, i) => (
          <View key={i} style={styles.messageBlock}>
            <Text style={msg.role === "user" ? styles.userLabel : styles.aiLabel}>
              {msg.role === "user" ? "YOU" : "LLP UNIVERSE"}
            </Text>
            <Text style={styles.messageContent}>{msg.content}</Text>

            {msg.citations && msg.citations.length > 0 && (
              <View style={styles.citationBlock}>
                <Text style={styles.citationTitle}>References:</Text>
                {msg.citations.map((c, j) => (
                  <Text key={j} style={styles.citationItem}>
                    • {c.document || "Unknown"} — {c.section || "N/A"}
                  </Text>
                ))}
              </View>
            )}

            {i < capped.length - 1 && <View style={styles.separator} />}
          </View>
        ))}

        {wasTruncated && (
          <View style={styles.messageBlock}>
            <Text style={styles.metaDate}>
              ... {messages.length - 100} more messages truncated
            </Text>
          </View>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimer} wrap={false}>
          <Text style={styles.disclaimerTitle}>DISCLAIMER</Text>
          <Text style={styles.disclaimerText}>
            This document contains AI-generated legal information and does not
            constitute legal advice. Consult a qualified legal professional for
            specific guidance.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Generated by Labor Law Partner</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function generateChatPdf(props: ChatPdfProps): Promise<Blob> {
  const blob = await pdf(<ChatPdfDocument {...props} />).toBlob();
  return blob;
}
