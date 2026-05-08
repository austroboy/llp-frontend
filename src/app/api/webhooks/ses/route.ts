import { createVerify, X509Certificate } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

type SnsMessageType =
  | "Notification"
  | "SubscriptionConfirmation"
  | "UnsubscribeConfirmation";

interface SnsEnvelope {
  Type?: string;
  Message?: string;
  MessageId?: string;
  Subject?: string;
  Timestamp?: string;
  TopicArn?: string;
  SignatureVersion?: string;
  Signature?: string;
  SigningCertURL?: string;
  SubscribeURL?: string;
  Token?: string;
}

const CERT_CACHE_TTL_MS = 15 * 60 * 1000;
const certCache = new Map<string, { pem: string; expiresAt: number }>();

function isTrustedSnsHostname(hostname: string): boolean {
  return /^sns\.[a-z0-9-]+\.amazonaws\.com(\.cn)?$/i.test(hostname);
}

function isTrustedSnsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && isTrustedSnsHostname(parsed.hostname);
  } catch {
    return false;
  }
}

function getCanonicalFields(type: SnsMessageType, subject?: string): string[] {
  if (type === "Notification") {
    const fields = ["Message", "MessageId"];
    if (typeof subject === "string") fields.push("Subject");
    fields.push("Timestamp", "TopicArn", "Type");
    return fields;
  }

  return [
    "Message",
    "MessageId",
    "SubscribeURL",
    "Timestamp",
    "Token",
    "TopicArn",
    "Type",
  ];
}

function buildStringToSign(message: SnsEnvelope, type: SnsMessageType): string {
  const fields = getCanonicalFields(type, message.Subject);

  return fields
    .map((field) => `${field}\n${String(message[field as keyof SnsEnvelope] ?? "")}`)
    .join("\n");
}

function getVerificationAlgorithm(signatureVersion: string): string | null {
  if (signatureVersion === "1") return "RSA-SHA1";
  if (signatureVersion === "2") return "RSA-SHA256";
  return null;
}

async function getSigningCertificatePem(url: string): Promise<string> {
  const cached = certCache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.pem;
  }

  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) {
    throw new Error(`Failed to fetch signing certificate: ${res.status}`);
  }

  const pem = await res.text();
  const cert = new X509Certificate(pem);
  const expiresAt = Date.parse(cert.validTo);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    throw new Error("Signing certificate is expired");
  }

  certCache.set(url, {
    pem,
    expiresAt: Math.min(expiresAt, Date.now() + CERT_CACHE_TTL_MS),
  });

  return pem;
}

async function verifySnsSignature(message: SnsEnvelope): Promise<boolean> {
  const type = message.Type;
  if (
    type !== "Notification" &&
    type !== "SubscriptionConfirmation" &&
    type !== "UnsubscribeConfirmation"
  ) {
    return false;
  }

  if (
    !message.Message ||
    !message.MessageId ||
    !message.Timestamp ||
    !message.TopicArn ||
    !message.SignatureVersion ||
    !message.Signature ||
    !message.SigningCertURL
  ) {
    return false;
  }

  if (
    (type === "SubscriptionConfirmation" || type === "UnsubscribeConfirmation") &&
    (!message.SubscribeURL || !message.Token)
  ) {
    return false;
  }

  if (!isTrustedSnsUrl(message.SigningCertURL)) {
    return false;
  }

  const algorithm = getVerificationAlgorithm(message.SignatureVersion);
  if (!algorithm) {
    return false;
  }

  const pem = await getSigningCertificatePem(message.SigningCertURL);
  const verifier = createVerify(algorithm);
  verifier.update(buildStringToSign(message, type));
  verifier.end();

  return verifier.verify(pem, message.Signature, "base64");
}

function assertEnvelopeShape(body: unknown): body is SnsEnvelope {
  return !!body && typeof body === "object";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!assertEnvelopeShape(body)) {
      return NextResponse.json({ error: "Invalid SNS payload" }, { status: 400 });
    }

    const messageTypeHeader = req.headers.get("x-amz-sns-message-type");
    if (!messageTypeHeader) {
      return NextResponse.json({ error: "Missing SNS message type" }, { status: 400 });
    }

    if (body.Type !== messageTypeHeader) {
      return NextResponse.json({ error: "SNS type mismatch" }, { status: 400 });
    }

    const expectedTopicArn = process.env.SES_SNS_TOPIC_ARN;
    if (expectedTopicArn && body.TopicArn !== expectedTopicArn) {
      return NextResponse.json({ error: "Unexpected SNS topic" }, { status: 401 });
    }

    const verified = await verifySnsSignature(body);
    if (!verified) {
      return NextResponse.json({ error: "Invalid SNS signature" }, { status: 401 });
    }

    if (body.Type === "SubscriptionConfirmation") {
      const subscribeUrl = body.SubscribeURL;
      if (!subscribeUrl || !isTrustedSnsUrl(subscribeUrl)) {
        return NextResponse.json({ error: "Invalid SubscribeURL" }, { status: 400 });
      }

      await fetch(subscribeUrl, { signal: AbortSignal.timeout(5000) });
      console.log("[SES Webhook] Subscription confirmed:", body.TopicArn);
      return NextResponse.json({ confirmed: true });
    }

    if (body.Type === "Notification") {
      if (typeof body.Message !== "string") {
        return NextResponse.json({ error: "Invalid SNS message payload" }, { status: 400 });
      }

      const message = JSON.parse(body.Message);
      const notificationType = message.notificationType || message.eventType;

      if (notificationType === "Bounce") {
        const bounce = message.bounce;
        console.error(
          "[SES Bounce]",
          bounce.bounceType,
          bounce.bouncedRecipients?.map((r: { emailAddress?: string }) => r.emailAddress)
        );
      }

      if (notificationType === "Complaint") {
        const complaint = message.complaint;
        console.error(
          "[SES Complaint]",
          complaint.complainedRecipients?.map((r: { emailAddress?: string }) => r.emailAddress)
        );
      }

      if (notificationType === "Delivery") {
        // Optional: log successful deliveries
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[SES Webhook] Error:", err);
    return NextResponse.json({ error: "Failed to process" }, { status: 500 });
  }
}
