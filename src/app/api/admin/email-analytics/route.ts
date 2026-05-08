import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { isMasterAdmin } from "@/lib/auth";
import {
  SESClient,
  GetSendQuotaCommand,
  GetSendStatisticsCommand,
  GetAccountSendingEnabledCommand,
} from "@aws-sdk/client-ses";
import {
  SESv2Client,
  GetAccountCommand as GetAccountV2Command,
} from "@aws-sdk/client-sesv2";
import {
  S3Client,
  ListObjectsV2Command,
  type _Object as S3Object,
  type ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";
import { createServerClient } from "@/lib/supabase";
import {
  CF_BASE,
  CF_GRAPHQL,
  CF_ZONE_ID,
  CF_ACCOUNT_ID,
  CF_HEADERS,
  type CfResponse,
} from "@/lib/cloudflare";

// ---------------------------------------------------------------------------
// Phase A — AWS SES outbound analytics
// Phase B — Cloudflare Email Routing inbound analytics
//
// This endpoint backs the admin email analytics tab
// (`src/app/admin/email/analytics-tab.tsx`). It returns the SES 24h send
// quota plus aggregated bounce / complaint / delivery rates computed from
// the 14-day `GetSendStatistics` data points.
//
// Phase B adds Cloudflare inbound routing data: configuration summary,
// per-action summary counts, and an hourly time series — all queried from
// the Cloudflare GraphQL Analytics API (`emailRoutingAdaptiveGroups`).
//
// Each Cloudflare call is independent: if any one fails (commonly because
// the API token lacks Zone Analytics scope), the others still populate.
// If GraphQL itself fails, `inbound.summary` and `inbound.timeseries` are
// returned as zeros and the frontend renders the "Cloudflare analytics
// unavailable" empty state.
//
// Phase C (LLP value-adds) was migrated from S3+mailparser to Supabase on
// 2026-04-07. Inbound mail now lives in the `inbound_emails` table (written
// by the Cloudflare Email Worker). Reputation + storage still use SES/S3.
// Phase D will populate the `events` array from an event log. For now,
// `events` is always an empty array — the UI already handles that.
// ---------------------------------------------------------------------------

const SES_REGION = "us-east-1";

// Phase C storage section still reads the S3 bucket for bytes/counts. The
// inbox/sent reads moved to Supabase but we keep the S3 constants so the
// storage card (unchanged) keeps working.
const S3_REGION = "us-east-1";
const BUCKET = "llp-email-inbox";
const FOLDERS = {
  inbox: "incoming/",
  sent: "sent/",
  spam: "spam/",
  deleted: "deleted/",
} as const;
type FolderKey = keyof typeof FOLDERS;

interface PublicMetadata {
  role?: string;
  [key: string]: unknown;
}

// Singleton client, lazily constructed (mirrors getSES() in /api/email/route.ts)
let _ses: SESClient | null = null;
function getSES(): SESClient {
  if (!_ses) {
    _ses = new SESClient({ region: process.env.AWS_REGION || SES_REGION });
  }
  return _ses;
}

let _sesv2: SESv2Client | null = null;
function getSESv2(): SESv2Client {
  if (!_sesv2) {
    _sesv2 = new SESv2Client({ region: process.env.AWS_REGION || SES_REGION });
  }
  return _sesv2;
}

let _s3: S3Client | null = null;
function getS3(): S3Client {
  if (!_s3) {
    _s3 = new S3Client({ region: process.env.AWS_REGION || S3_REGION });
  }
  return _s3;
}

/**
 * Master-admin gate — structurally identical to `requireMasterAdmin` in
 * `src/app/api/admin/email-users/route.ts`. Analytics expose send quota and
 * reputation data for the whole SES account, so regular admins are not
 * sufficient.
 */
async function requireMasterAdmin(): Promise<NextResponse | null> {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = (user.publicMetadata as PublicMetadata)?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!isMasterAdmin(user)) {
    return NextResponse.json(
      { error: "Master admin privileges required" },
      { status: 403 }
    );
  }
  return null; // authorised
}

// ---------------------------------------------------------------------------
// Phase B — Cloudflare inbound types + helpers
// ---------------------------------------------------------------------------

type RangeKey = "24h" | "7d" | "30d";

interface InboundConfig {
  customAddressCount: number;
  destinationCount: number;
  domainCount: number;
  routingEnabled: boolean;
  dnsConfigured: boolean;
}

interface InboundSummary {
  totalReceived: number;
  forwarded: number;
  dropped: number;
  deliveryFailed: number;
  rejected: number;
  other: number;
}

interface InboundBucket {
  timestamp: string;
  forwarded: number;
  dropped: number;
  deliveryFailed: number;
  rejected: number;
  other: number;
}

interface InboundPayload {
  config: InboundConfig;
  summary: InboundSummary;
  timeseries: InboundBucket[];
  range: { start: string; end: string; label: RangeKey };
}

/**
 * Map a Cloudflare GraphQL row (action + status) into the five UI buckets.
 *
 * Verified against live data on 2026-04-07. The `action` dimension alone is
 * not enough — `action=forward` covers three real outcomes:
 *   - forward + delivered            → Forwarded
 *   - forward + deliveryFailed       → Delivery Failed
 *   - forward + unauthenticatedForward (or any other status) → Other
 *
 * For drop/reject, action takes precedence because they don't carry
 * meaningful delivery status.
 */
function bucketForRow(
  action: string,
  status: string
): "forwarded" | "dropped" | "deliveryFailed" | "rejected" | "other" {
  const a = (action || "").toLowerCase();
  const s = (status || "").toLowerCase();

  if (a.includes("drop")) return "dropped";
  if (a.includes("reject")) return "rejected";

  if (a.includes("forward")) {
    if (s === "delivered") return "forwarded";
    if (s.includes("fail")) return "deliveryFailed";
    return "other"; // unauthenticatedForward, etc.
  }

  return "other";
}

/**
 * Resolve `?range=24h|7d|30d` into ISO start/end strings, hour-aligned.
 * Defaults to 7d.
 */
function resolveRange(rangeParam: string | null): {
  start: Date;
  end: Date;
  label: RangeKey;
} {
  const label: RangeKey =
    rangeParam === "24h" || rangeParam === "30d" ? rangeParam : "7d";

  const end = new Date();
  end.setUTCMinutes(0, 0, 0);

  const start = new Date(end);
  if (label === "24h") start.setUTCHours(start.getUTCHours() - 24);
  else if (label === "30d") start.setUTCDate(start.getUTCDate() - 30);
  else start.setUTCDate(start.getUTCDate() - 7);

  return { start, end, label };
}

/**
 * Fetch the configuration summary cards in parallel. Each sub-call is
 * wrapped so a single failure (commonly: missing scope on the Cloudflare
 * token) does not poison the others — the count falls back to zero / false
 * and the UI shows a placeholder.
 *
 * NOTE on routing/DNS detection:
 * The `/zones/{id}/email/routing` (settings) and `/zones/{id}/email/routing/dns`
 * endpoints require a separate "Email Routing Read" permission that
 * Cloudflare's token UI doesn't always expose cleanly. Instead we infer
 * both signals from the actual DNS records using the `Zone → DNS` permission
 * the token already has:
 *   - routingEnabled = at least one routing rule exists AND the bare zone
 *     has at least one `routeN.mx.cloudflare.net` MX record
 *   - dnsConfigured  = all 3 routing MX records (route1/2/3.mx.cloudflare.net)
 *     are present AND the bare-domain SPF includes `_spf.mx.cloudflare.net`
 *
 * This is more reliable than the settings endpoint because it verifies the
 * actual deliverability state, not just Cloudflare's internal config flag.
 */
async function fetchInboundConfig(): Promise<InboundConfig> {
  const [rulesRes, destsRes, mxRes, txtRes] = await Promise.allSettled([
    fetch(`${CF_BASE}/zones/${CF_ZONE_ID}/email/routing/rules`, {
      headers: CF_HEADERS,
      cache: "no-store",
    }).then(
      (r) =>
        r.json() as Promise<
          CfResponse<Array<{ matchers?: Array<{ type?: string }> }>>
        >
    ),
    fetch(`${CF_BASE}/accounts/${CF_ACCOUNT_ID}/email/routing/addresses`, {
      headers: CF_HEADERS,
      cache: "no-store",
    }).then((r) => r.json() as Promise<CfResponse<unknown[]>>),
    fetch(
      `${CF_BASE}/zones/${CF_ZONE_ID}/dns_records?type=MX&per_page=100`,
      { headers: CF_HEADERS, cache: "no-store" }
    ).then(
      (r) =>
        r.json() as Promise<
          CfResponse<Array<{ name?: string; content?: string }>>
        >
    ),
    fetch(
      `${CF_BASE}/zones/${CF_ZONE_ID}/dns_records?type=TXT&per_page=100`,
      { headers: CF_HEADERS, cache: "no-store" }
    ).then(
      (r) =>
        r.json() as Promise<
          CfResponse<Array<{ name?: string; content?: string }>>
        >
    ),
  ]);

  // Cloudflare's UI counts only "literal" custom addresses — the catch-all
  // rule (matchers[0].type === "all") is excluded. We mirror that here so
  // our number matches the Cloudflare dashboard exactly.
  const customAddressCount =
    rulesRes.status === "fulfilled" && rulesRes.value.success
      ? (rulesRes.value.result ?? []).filter(
          (r) => r?.matchers?.[0]?.type !== "all"
        ).length
      : 0;

  const totalRulesCount =
    rulesRes.status === "fulfilled" && rulesRes.value.success
      ? (rulesRes.value.result ?? []).length
      : 0;

  const destinationCount =
    destsRes.status === "fulfilled" && destsRes.value.success
      ? (destsRes.value.result ?? []).length
      : 0;

  // Inspect MX records: collect every Cloudflare email routing target on
  // the bare zone (route1/2/3.mx.cloudflare.net).
  const cloudflareMxTargets = new Set<string>();
  if (mxRes.status === "fulfilled" && mxRes.value.success) {
    for (const rec of mxRes.value.result ?? []) {
      const target = (rec.content ?? "").toLowerCase();
      if (/^route[123]\.mx\.cloudflare\.net\.?$/.test(target)) {
        cloudflareMxTargets.add(target.replace(/\.$/, ""));
      }
    }
  }

  // Inspect TXT records: SPF on the bare zone must include the Cloudflare
  // routing SPF macro for outbound deliverability of forwarded mail.
  let spfHasCloudflare = false;
  if (txtRes.status === "fulfilled" && txtRes.value.success) {
    for (const rec of txtRes.value.result ?? []) {
      const content = (rec.content ?? "").toLowerCase();
      if (
        content.startsWith("v=spf1") &&
        content.includes("_spf.mx.cloudflare.net")
      ) {
        spfHasCloudflare = true;
        break;
      }
    }
  }

  // Routing is "enabled" when there are rules AND the MX points to Cloudflare.
  const routingEnabled = totalRulesCount > 0 && cloudflareMxTargets.size > 0;

  // DNS is "configured" when all 3 routing MX records exist AND SPF is set.
  const dnsConfigured = cloudflareMxTargets.size >= 3 && spfHasCloudflare;

  if (mxRes.status === "fulfilled" && !mxRes.value.success) {
    console.warn(
      "[email-analytics] Cloudflare DNS MX call failed:",
      mxRes.value.errors
    );
  }
  if (txtRes.status === "fulfilled" && !txtRes.value.success) {
    console.warn(
      "[email-analytics] Cloudflare DNS TXT call failed:",
      txtRes.value.errors
    );
  }

  return {
    customAddressCount,
    destinationCount,
    domainCount: 1, // hardcoded laborlawpartner.com — single zone
    routingEnabled,
    dnsConfigured,
  };
}

/**
 * Query the Cloudflare GraphQL Analytics API for the per-hour
 * `emailRoutingAdaptiveGroups` dataset and roll it up into both the
 * summary card values and the line-chart buckets.
 *
 * Schema verified via `__type(name: "ZoneEmailRoutingAdaptiveGroupsDimensions")`
 * introspection (2026-04). Available dimensions include `action`, `status`,
 * `eventType`, `datetimeHour`, etc. We group by `action` + `datetimeHour` and
 * map each `action` value into the five UI buckets via `bucketForAction`.
 *
 * Returns null on any failure (network error, GraphQL `errors` array, or
 * the token lacking `com.cloudflare.api.account.zone.analytics.read` scope)
 * so the UI can degrade gracefully.
 */
async function fetchInboundFromGraphQL(
  start: Date,
  end: Date
): Promise<{ summary: InboundSummary; timeseries: InboundBucket[] } | null> {
  const query = `
    query EmailRoutingAnalytics($zoneTag: String!, $start: Time!, $end: Time!) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          emailRoutingAdaptiveGroups(
            filter: { datetime_geq: $start, datetime_leq: $end }
            orderBy: [datetimeHour_ASC]
            limit: 10000
          ) {
            count
            dimensions {
              datetimeHour
              action
              status
            }
          }
        }
      }
    }
  `;

  let json: {
    data?: {
      viewer?: {
        zones?: Array<{
          emailRoutingAdaptiveGroups?: Array<{
            count: number;
            dimensions: {
              datetimeHour: string;
              action: string;
              status: string;
            };
          }>;
        }>;
      };
    };
    errors?: Array<{ message: string }>;
  };

  try {
    const res = await fetch(CF_GRAPHQL, {
      method: "POST",
      headers: CF_HEADERS,
      cache: "no-store",
      body: JSON.stringify({
        query,
        variables: {
          zoneTag: CF_ZONE_ID,
          start: start.toISOString(),
          end: end.toISOString(),
        },
      }),
    });
    json = await res.json();
  } catch (err) {
    console.error("[email-analytics] Cloudflare GraphQL fetch failed:", err);
    return null;
  }

  if (json.errors && json.errors.length > 0) {
    console.warn(
      "[email-analytics] Cloudflare GraphQL returned errors:",
      json.errors.map((e) => e.message).join(" | ")
    );
    return null;
  }

  const rows =
    json.data?.viewer?.zones?.[0]?.emailRoutingAdaptiveGroups ?? [];

  // Roll up: total per bucket + per-hour buckets keyed by ISO timestamp.
  const summary: InboundSummary = {
    totalReceived: 0,
    forwarded: 0,
    dropped: 0,
    deliveryFailed: 0,
    rejected: 0,
    other: 0,
  };

  const byHour = new Map<string, InboundBucket>();

  for (const row of rows) {
    const bucket = bucketForRow(row.dimensions.action, row.dimensions.status);
    summary[bucket] += row.count;
    summary.totalReceived += row.count;

    const ts = row.dimensions.datetimeHour;
    let hourBucket = byHour.get(ts);
    if (!hourBucket) {
      hourBucket = {
        timestamp: ts,
        forwarded: 0,
        dropped: 0,
        deliveryFailed: 0,
        rejected: 0,
        other: 0,
      };
      byHour.set(ts, hourBucket);
    }
    hourBucket[bucket] += row.count;
  }

  const timeseries = Array.from(byHour.values()).sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp)
  );

  return { summary, timeseries };
}

/** Empty inbound payload — used when GraphQL fails but config still loaded. */
function emptyInboundData(start: Date, end: Date) {
  return {
    summary: {
      totalReceived: 0,
      forwarded: 0,
      dropped: 0,
      deliveryFailed: 0,
      rejected: 0,
      other: 0,
    },
    timeseries: [] as InboundBucket[],
    range: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
  };
}

// ---------------------------------------------------------------------------
// Phase C — LLP value-adds: reputation, mailboxes, correspondents, storage
// ---------------------------------------------------------------------------

// Human-friendly label fallback for a mailbox address. The old hardcoded
// MAILBOXES list was replaced with a dynamic union of:
//   - every distinct `delivered_to` seen in `inbound_emails`
//   - every routing rule address configured in Cloudflare
// So unused mailboxes still appear (with 0 counts) whenever they exist as
// Cloudflare rules, and brand-new addresses receive a label derived from
// the local part automatically.
function labelForAddress(address: string): string {
  const local = address.split("@")[0] || address;
  if (!local) return address;
  // Title-case the local part; convert common separators to spaces.
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ""))
    .join(" ");
}

/**
 * Fetch the list of literal (non-catch-all) destination addresses from
 * Cloudflare Email Routing rules. These are added to the mailbox breakdown
 * union so a brand-new rule still shows up before the first mail arrives.
 *
 * Returns an empty array on any failure — the caller falls back to the
 * distinct `delivered_to` values from Supabase, which is already enough.
 */
async function fetchCloudflareRuleAddresses(): Promise<string[]> {
  try {
    const res = await fetch(
      `${CF_BASE}/zones/${CF_ZONE_ID}/email/routing/rules`,
      { headers: CF_HEADERS, cache: "no-store" }
    );
    const json = (await res.json()) as CfResponse<
      Array<{ matchers?: Array<{ type?: string; value?: string }> }>
    >;
    if (!json.success || !Array.isArray(json.result)) return [];
    const out = new Set<string>();
    for (const rule of json.result) {
      for (const m of rule.matchers ?? []) {
        if (m?.type && m.type !== "all" && typeof m.value === "string") {
          const v = m.value.trim();
          if (v.includes("@")) out.add(v.toLowerCase());
        }
      }
    }
    return Array.from(out);
  } catch (err) {
    console.warn(
      "[email-analytics] fetchCloudflareRuleAddresses failed:",
      err instanceof Error ? err.message : err
    );
    return [];
  }
}

interface MailboxRow {
  address: string;
  label: string;
  inboundCount: number;
  outboundCount: number;
  lastActivity: string | null;
}

interface CorrespondentRow {
  email: string;
  count: number;
}

interface StorageFolder {
  count: number;
  bytes: number;
}

interface StoragePayload {
  folders: Record<FolderKey, StorageFolder>;
  totalCount: number;
  totalBytes: number;
}

interface ReputationPayload {
  sendingEnabled: boolean;
  reputationStatus: "HEALTHY" | "AT_RISK" | "SHUTDOWN" | "UNKNOWN";
  bounceRate: number;
  complaintRate: number;
  warning: null | {
    level: "warning" | "critical";
    message: string;
    action: string;
  };
}

interface MailboxAndCorrespondentResult {
  mailboxes: MailboxRow[];
  correspondents: {
    topSenders: CorrespondentRow[];
    topRecipients: CorrespondentRow[];
  };
  meta: { sampledInbox: boolean; sampledSent: boolean };
}

// --- S3 listing helpers (storage section only) -----------------------------

/**
 * Stream a paginated `ListObjectsV2` for the given prefix and return every
 * object. Used for storage totals (no date filter, no parsing).
 */
async function listAllObjects(prefix: string): Promise<S3Object[]> {
  const s3 = getS3();
  const all: S3Object[] = [];
  let continuationToken: string | undefined = undefined;
  // Hard cap at 50 pages (50 * 1000 = 50k objects) to avoid runaway loops.
  for (let i = 0; i < 50; i++) {
    const res: ListObjectsV2CommandOutput = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );
    if (res.Contents) all.push(...res.Contents);
    if (!res.IsTruncated) break;
    continuationToken = res.NextContinuationToken;
    if (!continuationToken) break;
  }
  return all;
}

// --- Section: Reputation ---------------------------------------------------

async function fetchReputation(
  bounceRate: number,
  complaintRate: number
): Promise<ReputationPayload> {
  let sendingEnabled = true;
  let reputationStatus: ReputationPayload["reputationStatus"] = "UNKNOWN";

  // Each call is wrapped independently — SES sometimes returns AccessDenied
  // for one and not the other depending on IAM policy granularity.
  try {
    const res = await getSES().send(new GetAccountSendingEnabledCommand({}));
    sendingEnabled = res.Enabled !== false; // default to true if undefined
  } catch (err) {
    console.error(
      "[email-analytics] GetAccountSendingEnabled failed:",
      err instanceof Error ? err.message : err
    );
  }

  try {
    const res = await getSESv2().send(new GetAccountV2Command({}));
    // SESv2 also exposes its own SendingEnabled — prefer it if both succeed.
    if (typeof res.SendingEnabled === "boolean") {
      sendingEnabled = res.SendingEnabled;
    }
    const enf = (res.EnforcementStatus || "").toUpperCase();
    if (enf === "HEALTHY") reputationStatus = "HEALTHY";
    else if (enf === "PROBATION") reputationStatus = "AT_RISK";
    else if (enf === "PROHIBITED" || enf === "SHUTDOWN")
      reputationStatus = "SHUTDOWN";
    else reputationStatus = "UNKNOWN";
  } catch (err) {
    console.error(
      "[email-analytics] SESv2 GetAccount failed:",
      err instanceof Error ? err.message : err
    );
  }

  // Build the warning. Critical takes precedence over warning. Banner is
  // hidden when both `level === null`. Thresholds match AWS SES guidance:
  // https://docs.aws.amazon.com/ses/latest/dg/reputationdashboardmessages.html
  let warning: ReputationPayload["warning"] = null;

  const isCritical =
    !sendingEnabled ||
    reputationStatus === "SHUTDOWN" ||
    bounceRate > 5 ||
    complaintRate > 0.1;

  const isWarning =
    reputationStatus === "AT_RISK" ||
    bounceRate > 3 ||
    complaintRate > 0.05;

  if (isCritical) {
    let message: string;
    let action: string;
    if (!sendingEnabled) {
      message = "SES sending is currently disabled for this account";
      action =
        "Re-enable sending in the SES console once you've identified the cause, or contact AWS support if your account was suspended.";
    } else if (reputationStatus === "SHUTDOWN") {
      message = "SES has paused sending due to reputation issues";
      action =
        "Open an AWS support case immediately — your account is in SHUTDOWN status and cannot send mail until the issue is resolved.";
    } else if (bounceRate > 5) {
      message = `Bounce rate at ${bounceRate.toFixed(2)}% — AWS will suspend sending if it stays above 5%`;
      action =
        "Investigate recent failed sends in the Recent Events table below and clean any stale addresses from your distribution lists.";
    } else {
      message = `Complaint rate at ${complaintRate.toFixed(3)}% — AWS suspends accounts above 0.1%`;
      action =
        "Review the content and frequency of your most recent campaigns. Suppress any recipients who marked recent mail as spam.";
    }
    warning = { level: "critical", message, action };
  } else if (isWarning) {
    let message: string;
    let action: string;
    if (reputationStatus === "AT_RISK") {
      message = "SES account is under PROBATION";
      action =
        "Review your recent sending patterns and reduce volume to high-risk recipients. Contact AWS support if your account stays in PROBATION for more than a few days.";
    } else if (bounceRate > 3) {
      message = `Bounce rate at ${bounceRate.toFixed(2)}% — approaching the 5% suspension threshold`;
      action =
        "Investigate recent failed sends in the Recent Events table below before the rate climbs further.";
    } else {
      message = `Complaint rate at ${complaintRate.toFixed(3)}% — approaching the 0.1% suspension threshold`;
      action =
        "Review the content of recent campaigns and confirm recipients have opted in.";
    }
    warning = { level: "warning", message, action };
  }

  return {
    sendingEnabled,
    reputationStatus,
    bounceRate,
    complaintRate,
    warning,
  };
}

// --- Section: Mailboxes + Correspondents (Supabase) ------------------------

/**
 * Derive the mailbox breakdown + top-senders list directly from the
 * `inbound_emails` Supabase table.
 *
 * Queries:
 *   1. 7d inbound per-mailbox count   — groups by `delivered_to`
 *   2. Last activity per mailbox      — MAX(received_at) by `delivered_to`
 *   3. Top senders (30d)              — groups by `from_address`, excludes
 *                                       our own domain
 *   4. Distinct `delivered_to` values — to build the mailbox list union
 *
 * Since PostgREST has no native `GROUP BY`, we approximate by selecting the
 * needed columns and aggregating in JS. For the current volume (<10k rows),
 * this is well under 100 ms and avoids a database function.
 *
 * Top recipients of outbound mail — we don't track outbound correspondents
 * yet (no `sent_emails` table), so we return an empty list. The UI already
 * renders an empty state for this.
 *
 * The Cloudflare routing rule addresses (gathered from the rules API) are
 * passed in here so the mailbox list is a union of:
 *   - every distinct `delivered_to` seen in the table, AND
 *   - every specific routing rule address
 * This means a brand-new rule shows up even before the first mail arrives.
 */
async function fetchMailboxAndCorrespondentData(
  cloudflareRuleAddresses: string[]
): Promise<MailboxAndCorrespondentResult> {
  const supabase = createServerClient();
  const now = Date.now();
  const cutoff7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const cutoff30d = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Pull the raw data we need in parallel.
  const [inbox7dRes, lastActivityRes, senders30dRes, allDeliveredRes] =
    await Promise.all([
      supabase
        .from("inbound_emails")
        .select("delivered_to")
        .gte("received_at", cutoff7d)
        .not("delivered_to", "is", null),

      // Separate query ordered DESC + dedupe in JS beats a per-address RPC.
      // We only keep the first `received_at` per `delivered_to`.
      supabase
        .from("inbound_emails")
        .select("delivered_to,received_at")
        .not("delivered_to", "is", null)
        .order("received_at", { ascending: false })
        .limit(5000),

      supabase
        .from("inbound_emails")
        .select("from_address")
        .gte("received_at", cutoff30d)
        .not("from_address", "ilike", "%@laborlawpartner.com")
        .not("from_address", "is", null),

      supabase
        .from("inbound_emails")
        .select("delivered_to")
        .not("delivered_to", "is", null),
    ]);

  // ---- Per-mailbox inbound 7d counts ----
  const inbound7d = new Map<string, number>();
  if (!inbox7dRes.error && inbox7dRes.data) {
    for (const row of inbox7dRes.data as Array<{ delivered_to: string | null }>) {
      const addr = row.delivered_to?.toLowerCase();
      if (!addr) continue;
      inbound7d.set(addr, (inbound7d.get(addr) ?? 0) + 1);
    }
  } else if (inbox7dRes.error) {
    console.warn(
      "[email-analytics] inbound-7d query failed:",
      inbox7dRes.error.message
    );
  }

  // ---- Last activity per mailbox (first occurrence wins, ordered DESC) ----
  const lastActivity = new Map<string, string>();
  if (!lastActivityRes.error && lastActivityRes.data) {
    for (const row of lastActivityRes.data as Array<{
      delivered_to: string | null;
      received_at: string;
    }>) {
      const addr = row.delivered_to?.toLowerCase();
      if (!addr) continue;
      if (!lastActivity.has(addr)) lastActivity.set(addr, row.received_at);
    }
  } else if (lastActivityRes.error) {
    console.warn(
      "[email-analytics] last-activity query failed:",
      lastActivityRes.error.message
    );
  }

  // ---- Top senders (30d) ----
  const senderCounts = new Map<string, number>();
  if (!senders30dRes.error && senders30dRes.data) {
    for (const row of senders30dRes.data as Array<{
      from_address: string | null;
    }>) {
      const addr = row.from_address?.toLowerCase();
      if (!addr) continue;
      senderCounts.set(addr, (senderCounts.get(addr) ?? 0) + 1);
    }
  } else if (senders30dRes.error) {
    console.warn(
      "[email-analytics] top-senders query failed:",
      senders30dRes.error.message
    );
  }

  // ---- Build the mailbox list (distinct delivered_to ∪ CF rule addresses) ----
  const addressSet = new Set<string>();
  if (!allDeliveredRes.error && allDeliveredRes.data) {
    for (const row of allDeliveredRes.data as Array<{
      delivered_to: string | null;
    }>) {
      const addr = row.delivered_to?.toLowerCase();
      if (addr) addressSet.add(addr);
    }
  } else if (allDeliveredRes.error) {
    console.warn(
      "[email-analytics] distinct-mailboxes query failed:",
      allDeliveredRes.error.message
    );
  }
  for (const addr of cloudflareRuleAddresses) {
    const normalized = addr.toLowerCase().trim();
    if (normalized) addressSet.add(normalized);
  }

  const mailboxes: MailboxRow[] = Array.from(addressSet).map((address) => ({
    address,
    label: labelForAddress(address),
    inboundCount: inbound7d.get(address) ?? 0,
    // Outbound tracking needs a `sent_emails` table that doesn't exist yet.
    // The UI already handles zero/empty values.
    outboundCount: 0,
    lastActivity: lastActivity.get(address) ?? null,
  }));

  const topSenders: CorrespondentRow[] = Array.from(senderCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([email, count]) => ({ email, count }));

  // No outbound tracking yet — return an empty list for top recipients.
  const topRecipients: CorrespondentRow[] = [];

  return {
    mailboxes,
    correspondents: { topSenders, topRecipients },
    // Supabase queries always read the full result set (no sampling).
    meta: { sampledInbox: false, sampledSent: false },
  };
}

// --- Section: Storage ------------------------------------------------------

async function fetchStorage(): Promise<StoragePayload> {
  const folders: Record<FolderKey, StorageFolder> = {
    inbox: { count: 0, bytes: 0 },
    sent: { count: 0, bytes: 0 },
    spam: { count: 0, bytes: 0 },
    deleted: { count: 0, bytes: 0 },
  };

  // Each folder is independent — parallelize and isolate failures.
  const folderKeys = Object.keys(FOLDERS) as FolderKey[];
  await Promise.all(
    folderKeys.map(async (key) => {
      try {
        const objs = await listAllObjects(FOLDERS[key]);
        let count = 0;
        let bytes = 0;
        for (const o of objs) {
          count += 1;
          bytes += o.Size ?? 0;
        }
        folders[key] = { count, bytes };
      } catch (err) {
        console.error(
          `[email-analytics] storage listing failed for ${key}:`,
          err instanceof Error ? err.message : err
        );
        folders[key] = { count: 0, bytes: 0 };
      }
    })
  );

  let totalCount = 0;
  let totalBytes = 0;
  for (const k of folderKeys) {
    totalCount += folders[k].count;
    totalBytes += folders[k].bytes;
  }

  return { folders, totalCount, totalBytes };
}

// ---------------------------------------------------------------------------
// GET — return SES stats + (Phase B) Cloudflare inbound + empty events array
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const authErr = await requireMasterAdmin();
  if (authErr) return authErr;

  // Phase B query string: ?range=24h|7d|30d (default 7d)
  const url = new URL(request.url);
  const { start, end, label } = resolveRange(url.searchParams.get("range"));

  // --- Phase A: SES outbound (kept exactly as in the original handler) ---
  let stats: {
    sendQuota: {
      max24HourSend: number;
      maxSendRate: number;
      sentLast24Hours: number;
    };
    rates: { bounceRate: number; complaintRate: number; deliveryRate: number };
  } | null = null;
  let outboundError: string | null = null;

  try {
    const client = getSES();

    const [quotaRes, statsRes] = await Promise.all([
      client.send(new GetSendQuotaCommand({})),
      client.send(new GetSendStatisticsCommand({})),
    ]);

    // SES returns floats; the UI treats these as numbers. If SES is in
    // sandbox mode or the quota fetch returns nothing, we still emit zeros
    // so the UI renders a valid empty state (no NaN, no crashes).
    const sendQuota = {
      max24HourSend: quotaRes.Max24HourSend ?? 0,
      maxSendRate: quotaRes.MaxSendRate ?? 0,
      sentLast24Hours: quotaRes.SentLast24Hours ?? 0,
    };

    // GetSendStatistics returns 15-minute buckets over the last 14 days.
    // We sum across every bucket and derive the three rates the UI shows.
    const dataPoints = statsRes.SendDataPoints ?? [];

    let totalAttempts = 0;
    let totalBounces = 0;
    let totalComplaints = 0;
    let totalRejects = 0;

    for (const dp of dataPoints) {
      totalAttempts += dp.DeliveryAttempts ?? 0;
      totalBounces += dp.Bounces ?? 0;
      totalComplaints += dp.Complaints ?? 0;
      totalRejects += dp.Rejects ?? 0;
    }

    // Guard against divide-by-zero — the frontend calls `.toFixed()` on
    // every rate, so NaN would crash the render.
    const rates =
      totalAttempts > 0
        ? {
            bounceRate: (totalBounces / totalAttempts) * 100,
            complaintRate: (totalComplaints / totalAttempts) * 100,
            deliveryRate:
              ((totalAttempts - totalBounces - totalRejects) /
                totalAttempts) *
              100,
          }
        : { bounceRate: 0, complaintRate: 0, deliveryRate: 0 };

    stats = { sendQuota, rates };
  } catch (error: unknown) {
    outboundError =
      error instanceof Error ? error.message : "Failed to load SES analytics";
    console.error("[email-analytics] Failed to fetch SES stats:", error);
  }

  // --- Phase B + Phase C: run all the heavy I/O in parallel ---------------
  // The four sections are independent — Cloudflare GraphQL, S3 listing for
  // mailboxes/correspondents, S3 listing for storage, and the SES reputation
  // calls. Each is wrapped in its own try/catch so a single slow or failing
  // call cannot poison the response.

  const inboundPromise: Promise<InboundPayload | null> = (async () => {
    try {
      const [config, gql] = await Promise.all([
        fetchInboundConfig(),
        fetchInboundFromGraphQL(start, end),
      ]);
      const data = gql ?? emptyInboundData(start, end);
      return {
        config,
        summary: data.summary,
        timeseries: data.timeseries,
        range: {
          start: start.toISOString(),
          end: end.toISOString(),
          label,
        },
      };
    } catch (err) {
      console.error("[email-analytics] Cloudflare inbound block failed:", err);
      return null;
    }
  })();

  // Reputation depends on the SES rates we already computed in stats. If
  // SES failed and stats is null, we still call it (the SDK calls themselves
  // handle their own errors); we just feed in 0/0 for the rate-based checks.
  const reputationBounce = stats?.rates.bounceRate ?? 0;
  const reputationComplaint = stats?.rates.complaintRate ?? 0;

  const reputationPromise: Promise<ReputationPayload> = (async () => {
    try {
      return await fetchReputation(reputationBounce, reputationComplaint);
    } catch (err) {
      console.error("[email-analytics] reputation block failed:", err);
      return {
        sendingEnabled: true,
        reputationStatus: "UNKNOWN",
        bounceRate: reputationBounce,
        complaintRate: reputationComplaint,
        warning: null,
      };
    }
  })();

  const mailboxesPromise: Promise<MailboxAndCorrespondentResult> = (async () => {
    try {
      // Grab the Cloudflare routing rule addresses alongside the Supabase
      // query so a newly-added rule shows up even before any mail arrives.
      const cfAddresses = await fetchCloudflareRuleAddresses();
      return await fetchMailboxAndCorrespondentData(cfAddresses);
    } catch (err) {
      console.error("[email-analytics] mailboxes block failed:", err);
      return {
        mailboxes: [],
        correspondents: { topSenders: [], topRecipients: [] },
        meta: { sampledInbox: false, sampledSent: false },
      };
    }
  })();

  const storagePromise: Promise<StoragePayload> = (async () => {
    try {
      return await fetchStorage();
    } catch (err) {
      console.error("[email-analytics] storage block failed:", err);
      return {
        folders: {
          inbox: { count: 0, bytes: 0 },
          sent: { count: 0, bytes: 0 },
          spam: { count: 0, bytes: 0 },
          deleted: { count: 0, bytes: 0 },
        },
        totalCount: 0,
        totalBytes: 0,
      };
    }
  })();

  const [inbound, reputation, mailboxData, storage] = await Promise.all([
    inboundPromise,
    reputationPromise,
    mailboxesPromise,
    storagePromise,
  ]);

  // If both halves failed there is genuinely nothing to show — bubble up.
  if (!stats && !inbound) {
    return NextResponse.json(
      { error: outboundError || "Analytics unavailable" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    stats,
    // Phase A: no event log yet. Phase D will backfill this from an
    // SNS/SES event stream persisted in S3 or the database.
    events: [],
    inbound,
    // --- Phase C additions -------------------------------------------------
    reputation,
    mailboxes: mailboxData.mailboxes,
    correspondents: mailboxData.correspondents,
    storage,
    meta: mailboxData.meta,
  });
}
