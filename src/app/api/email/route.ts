import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { createServerClient } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Email API — Supabase-backed inbox reader + SES outbound sender
//
// Inbound mail is written directly to the `inbound_emails` Supabase table by
// the Cloudflare Email Worker (deployed separately). This route surfaces that
// table to the admin inbox UI, and continues to send outbound mail via SES.
//
// Listing, reading, counts, and folder moves are all Supabase operations now.
// The S3-backed implementation (mailparser + ListObjectsV2) was removed —
// Supabase has indexed reads that return in <100ms and we no longer need the
// mailparser dependency for the read path.
//
// SES outbound (`action=send`) is unchanged. We also mirror every successful
// send into `inbound_emails` with `folder='sent'` so the Sent folder renders
// alongside inbound mail. This mirror is best-effort — if Supabase rejects the
// insert, the send still succeeds and the client is notified.
// ---------------------------------------------------------------------------

const SES_REGION = "us-east-1";

type Folder = "inbox" | "sent" | "spam" | "deleted";
const FOLDERS: readonly Folder[] = ["inbox", "sent", "spam", "deleted"];
function isFolder(value: string): value is Folder {
  return (FOLDERS as readonly string[]).includes(value);
}

let _ses: SESv2Client | null = null;
function getSES(): SESv2Client {
  if (!_ses) {
    _ses = new SESv2Client({ region: process.env.AWS_REGION || SES_REGION });
  }
  return _ses;
}

const FROM_OPTIONS = [
  { email: "info@laborlawpartner.com", label: "Info" },
  { email: "support@laborlawpartner.com", label: "Support" },
  { email: "noreply@laborlawpartner.com", label: "No Reply" },
];

// ---------------------------------------------------------------------------
// Row → frontend Email shape
// ---------------------------------------------------------------------------

/** Shape of a row returned by `inbound_emails`. Only the columns we read. */
interface InboundEmailRow {
  id: string;
  from_address: string | null;
  from_name: string | null;
  delivered_to: string | null;
  to_addresses: string[] | null;
  cc_addresses: string[] | null;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  attachments: unknown;
  received_at: string;
  folder: Folder;
  message_id_header: string | null;
  in_reply_to: string | null;
  references_ids: string[] | null;
}

interface FrontendEmail {
  id: string;
  key: string;
  folder: Folder;
  from: string;
  to: string;
  cc?: string;
  subject: string;
  date: string;
  hasAttachments: boolean;
  snippet?: string;
  text?: string;
  html?: string | null;
  attachments?: Array<{ filename: string; contentType: string; size: number }>;
  headers?: { messageId?: string; inReplyTo?: string; references?: string };
}

interface AttachmentShape {
  filename: string;
  contentType: string;
  size: number;
}

/** Best-effort normalization of the `attachments` JSONB column. */
function normalizeAttachments(raw: unknown): AttachmentShape[] {
  if (!Array.isArray(raw)) return [];
  const out: AttachmentShape[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const filename = typeof rec.filename === "string" ? rec.filename : "attachment";
    const contentType =
      typeof rec.contentType === "string"
        ? rec.contentType
        : typeof rec.content_type === "string"
        ? (rec.content_type as string)
        : "application/octet-stream";
    const size =
      typeof rec.size === "number"
        ? rec.size
        : typeof rec.size_bytes === "number"
        ? (rec.size_bytes as number)
        : 0;
    out.push({ filename, contentType, size });
  }
  return out;
}

/** Build the `From` display string the frontend renders. */
function formatFrom(row: InboundEmailRow): string {
  const addr = row.from_address?.trim() || "unknown";
  const name = row.from_name?.trim();
  if (name && name !== addr) return `${name} <${addr}>`;
  return addr;
}

/** Build the `To` display string. Prefers `delivered_to`, falls back to array. */
function formatTo(row: InboundEmailRow): string {
  if (row.delivered_to && row.delivered_to.trim()) return row.delivered_to;
  if (row.to_addresses && row.to_addresses.length > 0) {
    return row.to_addresses.join(", ");
  }
  return "";
}

function formatCc(row: InboundEmailRow): string | undefined {
  if (!row.cc_addresses || row.cc_addresses.length === 0) return undefined;
  return row.cc_addresses.join(", ");
}

/** Map a row → the list-view shape (no body, trimmed snippet). */
function rowToListEmail(row: InboundEmailRow): FrontendEmail {
  const attachments = normalizeAttachments(row.attachments);
  const snippetSource = row.body_text || "";
  return {
    id: row.id,
    key: row.id,
    folder: row.folder,
    from: formatFrom(row),
    to: formatTo(row),
    cc: formatCc(row),
    subject: row.subject || "(no subject)",
    date: row.received_at,
    hasAttachments: attachments.length > 0,
    snippet: snippetSource.slice(0, 200).replace(/\s+/g, " ").trim(),
  };
}

/** Map a row → the full read-view shape (body + attachments + headers). */
function rowToFullEmail(row: InboundEmailRow): FrontendEmail {
  const attachments = normalizeAttachments(row.attachments);
  return {
    id: row.id,
    key: row.id,
    folder: row.folder,
    from: formatFrom(row),
    to: formatTo(row),
    cc: formatCc(row),
    subject: row.subject || "(no subject)",
    date: row.received_at,
    hasAttachments: attachments.length > 0,
    text: row.body_text || "",
    html: row.body_html || null,
    attachments,
    headers: {
      messageId: row.message_id_header || undefined,
      inReplyTo: row.in_reply_to || undefined,
      references: row.references_ids?.length
        ? row.references_ids.join(" ")
        : undefined,
    },
  };
}

// ---------------------------------------------------------------------------
// Supabase operations
// ---------------------------------------------------------------------------

const LIST_COLUMNS =
  "id,from_address,from_name,delivered_to,to_addresses,cc_addresses,subject,body_text,attachments,received_at,folder";

const READ_COLUMNS =
  "id,from_address,from_name,delivered_to,to_addresses,cc_addresses,subject,body_text,body_html,attachments,received_at,folder,message_id_header,in_reply_to,references_ids";

async function listFolder(
  folder: Folder,
  limit: number
): Promise<{ emails: FrontendEmail[]; total: number }> {
  const supabase = createServerClient();
  const { data, error, count } = await supabase
    .from("inbound_emails")
    .select(LIST_COLUMNS, { count: "exact" })
    .eq("folder", folder)
    .order("received_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as InboundEmailRow[];
  const emails = rows.map(rowToListEmail);
  return { emails, total: count ?? emails.length };
}

async function readEmail(id: string): Promise<FrontendEmail> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("inbound_emails")
    .select(READ_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Email not found");

  return rowToFullEmail(data as unknown as InboundEmailRow);
}

async function getFolderCounts(): Promise<Record<Folder, number>> {
  const supabase = createServerClient();
  const counts: Record<Folder, number> = {
    inbox: 0,
    sent: 0,
    spam: 0,
    deleted: 0,
  };

  // One HEAD-count query per folder. We can't GROUP BY through PostgREST, but
  // four independent count-only requests run in parallel are cheap and avoid
  // loading any rows.
  await Promise.all(
    FOLDERS.map(async (folder) => {
      const { count, error } = await supabase
        .from("inbound_emails")
        .select("id", { count: "exact", head: true })
        .eq("folder", folder);
      if (!error && typeof count === "number") counts[folder] = count;
    })
  );

  return counts;
}

async function setFolder(id: string, folder: Folder): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("inbound_emails")
    .update({ folder })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

async function hardDeleteEmail(id: string): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase.from("inbound_emails").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// SES send — unchanged behaviour, plus Supabase mirror row for the sent folder
// ---------------------------------------------------------------------------

async function sendViaSES(params: {
  from: string;
  to: string[];
  subject: string;
  body: string;
  cc?: string[];
  replyTo?: string;
}) {
  const fromEntry = FROM_OPTIONS.find((o) => o.email === params.from);
  const fromLabel = fromEntry?.label || "LLP";
  const fromFormatted = `${fromLabel} <${params.from}>`;

  const ses = getSES();
  const command = new SendEmailCommand({
    FromEmailAddress: fromFormatted,
    Destination: {
      ToAddresses: params.to,
      CcAddresses: params.cc || [],
    },
    ReplyToAddresses: params.replyTo ? [params.replyTo] : [],
    Content: {
      Simple: {
        Subject: { Data: params.subject, Charset: "UTF-8" },
        Body: { Text: { Data: params.body, Charset: "UTF-8" } },
      },
    },
    ConfigurationSetName: "llp-production",
  });
  const result = await ses.send(command);
  const messageId = result.MessageId || "unknown";

  // Mirror the sent message into Supabase so the Sent folder renders it. This
  // is best-effort — a Supabase outage must not break the send itself.
  try {
    const supabase = createServerClient();
    await supabase.from("inbound_emails").insert({
      cloudflare_message_id: null,
      message_id_header: `<${messageId}@laborlawpartner.com>`,
      from_address: params.from,
      from_name: fromLabel,
      delivered_to: params.from,
      to_addresses: params.to,
      cc_addresses: params.cc ?? null,
      reply_to: params.replyTo ?? null,
      subject: params.subject,
      body_text: params.body,
      body_html: null,
      attachments: [],
      headers: {},
      folder: "sent",
      received_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn(
      "[email] failed to mirror sent message to Supabase:",
      err instanceof Error ? err.message : err
    );
  }

  return { success: true, messageId };
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

async function requireAdmin() {
  const user = await currentUser();
  if (!user) return null;
  const role = (user.publicMetadata as { role?: string })?.role;
  if (role !== "admin") return null;
  return user;
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "inbox";

  try {
    switch (action) {
      case "list": {
        const folderParam = searchParams.get("folder") || "inbox";
        if (!isFolder(folderParam)) {
          return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
        }
        const limit = Math.max(
          1,
          Math.min(500, parseInt(searchParams.get("limit") || "50", 10) || 50)
        );
        const result = await listFolder(folderParam, limit);
        return NextResponse.json(result);
      }
      case "inbox": {
        // Backwards-compatible alias for `?action=list&folder=inbox`.
        const limit = Math.max(
          1,
          Math.min(500, parseInt(searchParams.get("limit") || "50", 10) || 50)
        );
        const result = await listFolder("inbox", limit);
        return NextResponse.json(result);
      }
      case "read": {
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
        const email = await readEmail(id);
        return NextResponse.json(email);
      }
      case "counts": {
        const counts = await getFolderCounts();
        return NextResponse.json(counts);
      }
      case "from_options": {
        return NextResponse.json({ options: FROM_OPTIONS });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Email API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action, ...params } = body as { action?: string; [key: string]: unknown };

  try {
    switch (action) {
      case "send": {
        const toList = Array.isArray(params.to)
          ? (params.to as string[])
          : typeof params.to === "string"
          ? [params.to]
          : [];
        const ccList = Array.isArray(params.cc) ? (params.cc as string[]) : undefined;

        const result = await sendViaSES({
          from: String(params.from || ""),
          to: toList,
          subject: String(params.subject || ""),
          body: String(params.body || ""),
          cc: ccList,
          replyTo: params.replyTo ? String(params.replyTo) : undefined,
        });
        return NextResponse.json(result);
      }
      case "move": {
        const id = String(params.id || "");
        const toFolder = String(params.toFolder || "");
        if (!id || !isFolder(toFolder)) {
          return NextResponse.json(
            { error: "id and valid toFolder required" },
            { status: 400 }
          );
        }
        await setFolder(id, toFolder);
        return NextResponse.json({ success: true });
      }
      case "delete": {
        const id = String(params.id || "");
        if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
        const folderParam = String(params.folder || "inbox");
        // Permanent delete only when deleting from the Deleted folder; all
        // other folders soft-delete by moving to Deleted.
        if (folderParam === "deleted") {
          await hardDeleteEmail(id);
        } else {
          await setFolder(id, "deleted");
        }
        return NextResponse.json({ success: true });
      }
      case "spam": {
        const id = String(params.id || "");
        if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
        await setFolder(id, "spam");
        return NextResponse.json({ success: true });
      }
      case "unspam": {
        const id = String(params.id || "");
        if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
        await setFolder(id, "inbox");
        return NextResponse.json({ success: true });
      }
      case "restore": {
        const id = String(params.id || "");
        if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
        await setFolder(id, "inbox");
        return NextResponse.json({ success: true });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Email API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
