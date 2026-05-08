import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createHmac } from "crypto";
import { isMasterAdmin } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/admin-csrf";
import { writeAuditLog } from "@/lib/admin-audit";
import { rateGuard } from "@/lib/rate-limit";
import {
  IAMClient,
  ListUsersCommand,
  GetUserPolicyCommand,
  CreateUserCommand,
  PutUserPolicyCommand,
  CreateAccessKeyCommand,
  ListAccessKeysCommand,
  DeleteAccessKeyCommand,
  DeleteUserPolicyCommand,
  DeleteUserCommand,
  type User as IAMUser,
} from "@aws-sdk/client-iam";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const IAM_USER_PREFIX = "llp-smtp-";
const POLICY_NAME = "ses-send-locked";
const DOMAIN = "@laborlawpartner.com";
const SES_REGION = "us-east-1";

interface PublicMetadata {
  role?: string;
  [key: string]: unknown;
}

function iamClient(): IAMClient {
  return new IAMClient({ region: SES_REGION });
}

/**
 * Check Clerk master admin capability — this route manages IAM users and AWS
 * SMTP credentials, so regular admins are not enough. Master admins still
 * carry role: "admin"; the gate is the additional `isMasterAdmin` flag in
 * publicMetadata.
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

/**
 * Convert an IAM secret access key into an SES SMTP password.
 *
 * Algorithm (AWS docs):
 *   key  = HMAC-SHA256("AWS4" + secretKey, "11111111")
 *   key  = HMAC-SHA256(key, region)
 *   key  = HMAC-SHA256(key, "ses")
 *   key  = HMAC-SHA256(key, "aws4_request")
 *   key  = HMAC-SHA256(key, "SendRawEmail")
 *   password = base64( 0x04 || key )
 */
function secretToSmtpPassword(secretAccessKey: string): string {
  const VERSION = 0x04;

  let key: Buffer = createHmac("sha256", "AWS4" + secretAccessKey)
    .update("11111111")
    .digest();
  key = createHmac("sha256", key).update(SES_REGION).digest();
  key = createHmac("sha256", key).update("ses").digest();
  key = createHmac("sha256", key).update("aws4_request").digest();
  key = createHmac("sha256", key).update("SendRawEmail").digest();

  const signatureAndVersion = Buffer.concat([Buffer.from([VERSION]), key]);
  return signatureAndVersion.toString("base64");
}

/**
 * Build the IAM policy document that locks an IAM user to a single
 * ses:FromAddress via ses:SendRawEmail.
 */
function buildAddressPolicy(email: string): string {
  return JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: "ses:SendRawEmail",
        Resource: "*",
        Condition: {
          StringEquals: {
            "ses:FromAddress": email,
          },
        },
      },
    ],
  });
}

/**
 * Extract the locked email from the user's inline policy.
 * Returns null if the policy cannot be read or parsed.
 */
async function getLockedEmail(
  client: IAMClient,
  userName: string
): Promise<string | null> {
  try {
    const res = await client.send(
      new GetUserPolicyCommand({
        UserName: userName,
        PolicyName: POLICY_NAME,
      })
    );
    if (!res.PolicyDocument) return null;
    const doc = JSON.parse(decodeURIComponent(res.PolicyDocument));
    const condition = doc?.Statement?.[0]?.Condition?.StringEquals;
    return condition?.["ses:FromAddress"] ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// GET — List all email users
// ---------------------------------------------------------------------------

export async function GET() {
  const authErr = await requireMasterAdmin();
  if (authErr) return authErr;

  try {
    const client = iamClient();
    const listRes = await client.send(
      new ListUsersCommand({ PathPrefix: "/" })
    );

    const allUsers = (listRes.Users ?? []).filter((u: IAMUser) =>
      u.UserName?.startsWith(IAM_USER_PREFIX)
    );

    const users = await Promise.all(
      allUsers.map(async (u: IAMUser) => {
        const userName = u.UserName!;
        const email = await getLockedEmail(client, userName);

        // Retrieve access key id (first key if exists)
        let accessKeyId: string | null = null;
        try {
          const keysRes = await client.send(
            new ListAccessKeysCommand({ UserName: userName })
          );
          accessKeyId =
            keysRes.AccessKeyMetadata?.[0]?.AccessKeyId ?? null;
        } catch {
          // ignore
        }

        return {
          iamUser: userName,
          email,
          accessKeyId,
          createdAt: u.CreateDate?.toISOString() ?? null,
        };
      })
    );

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Failed to list email users:", error);
    return NextResponse.json(
      { error: "Failed to list email users" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST — Create new email user
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const authErr = await requireMasterAdmin();
  if (authErr) return authErr;

  const csrf = assertSameOrigin(request);
  if (!csrf.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const blocked = await rateGuard(request, 5);
  if (blocked) return blocked;

  const actor = await currentUser();
  const actorClerkId = actor?.id ?? "unknown";

  try {
    const { name, email } = (await request.json()) as {
      name?: string;
      email?: string;
    };

    if (!name || !email) {
      return NextResponse.json(
        { error: "name and email are required" },
        { status: 400 }
      );
    }

    if (!email.endsWith(DOMAIN)) {
      return NextResponse.json(
        { error: `Email must end with ${DOMAIN}` },
        { status: 400 }
      );
    }

    // Sanitise name: lowercase, alphanumeric + hyphens only
    const sanitised = name.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!sanitised) {
      return NextResponse.json(
        { error: "name must contain alphanumeric characters" },
        { status: 400 }
      );
    }

    const iamUser = `${IAM_USER_PREFIX}${sanitised}`;
    const client = iamClient();

    // 1. Create IAM user
    await client.send(new CreateUserCommand({ UserName: iamUser }));

    // 2. Attach address-locked policy
    await client.send(
      new PutUserPolicyCommand({
        UserName: iamUser,
        PolicyName: POLICY_NAME,
        PolicyDocument: buildAddressPolicy(email),
      })
    );

    // 3. Create access key
    const keyRes = await client.send(
      new CreateAccessKeyCommand({ UserName: iamUser })
    );
    const accessKeyId = keyRes.AccessKey!.AccessKeyId!;
    const secretAccessKey = keyRes.AccessKey!.SecretAccessKey!;

    // 4. Derive SMTP password
    const smtpPassword = secretToSmtpPassword(secretAccessKey);

    await writeAuditLog({
      actorClerkId,
      op: "email-users.create",
      targetId: iamUser,
      after: { email, smtpUsername: accessKeyId },
    });

    return NextResponse.json({
      iamUser,
      email,
      smtpUsername: accessKeyId,
      smtpPassword,
      smtpServer: `email-smtp.${SES_REGION}.amazonaws.com`,
      smtpPort: 587,
    });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Failed to create email user";
    console.error("Failed to create email user:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE — Remove email user
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  const authErr = await requireMasterAdmin();
  if (authErr) return authErr;

  const csrf = assertSameOrigin(request);
  if (!csrf.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const blocked = await rateGuard(request, 5);
  if (blocked) return blocked;

  const actor = await currentUser();
  const actorClerkId = actor?.id ?? "unknown";

  try {
    const { iamUser } = (await request.json()) as { iamUser?: string };

    if (!iamUser || !iamUser.startsWith(IAM_USER_PREFIX)) {
      return NextResponse.json(
        { error: "Valid iamUser with llp-smtp- prefix required" },
        { status: 400 }
      );
    }

    const client = iamClient();

    // 1. Delete all access keys
    const keysRes = await client.send(
      new ListAccessKeysCommand({ UserName: iamUser })
    );
    for (const meta of keysRes.AccessKeyMetadata ?? []) {
      await client.send(
        new DeleteAccessKeyCommand({
          UserName: iamUser,
          AccessKeyId: meta.AccessKeyId!,
        })
      );
    }

    // 2. Delete user policy
    try {
      await client.send(
        new DeleteUserPolicyCommand({
          UserName: iamUser,
          PolicyName: POLICY_NAME,
        })
      );
    } catch {
      // Policy may not exist; continue.
    }

    // 3. Delete IAM user
    await client.send(new DeleteUserCommand({ UserName: iamUser }));

    await writeAuditLog({
      actorClerkId,
      op: "email-users.delete",
      targetId: iamUser,
    });

    return NextResponse.json({ deleted: true });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Failed to delete email user";
    console.error("Failed to delete email user:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PUT — Rotate credentials
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest) {
  const authErr = await requireMasterAdmin();
  if (authErr) return authErr;

  const csrf = assertSameOrigin(request);
  if (!csrf.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const blocked = await rateGuard(request, 5);
  if (blocked) return blocked;

  const actor = await currentUser();
  const actorClerkId = actor?.id ?? "unknown";

  try {
    const { iamUser } = (await request.json()) as { iamUser?: string };

    if (!iamUser || !iamUser.startsWith(IAM_USER_PREFIX)) {
      return NextResponse.json(
        { error: "Valid iamUser with llp-smtp- prefix required" },
        { status: 400 }
      );
    }

    const client = iamClient();

    // 1. Delete old access keys
    const keysRes = await client.send(
      new ListAccessKeysCommand({ UserName: iamUser })
    );
    for (const meta of keysRes.AccessKeyMetadata ?? []) {
      await client.send(
        new DeleteAccessKeyCommand({
          UserName: iamUser,
          AccessKeyId: meta.AccessKeyId!,
        })
      );
    }

    // 2. Create new access key
    const keyRes = await client.send(
      new CreateAccessKeyCommand({ UserName: iamUser })
    );
    const accessKeyId = keyRes.AccessKey!.AccessKeyId!;
    const secretAccessKey = keyRes.AccessKey!.SecretAccessKey!;

    // 3. Derive SMTP password
    const smtpPassword = secretToSmtpPassword(secretAccessKey);

    // 4. Look up locked email for convenience
    const email = await getLockedEmail(client, iamUser);

    await writeAuditLog({
      actorClerkId,
      op: "email-users.rotate-credentials",
      targetId: iamUser,
      after: { email, smtpUsername: accessKeyId },
    });

    return NextResponse.json({
      iamUser,
      email,
      smtpUsername: accessKeyId,
      smtpPassword,
      smtpServer: `email-smtp.${SES_REGION}.amazonaws.com`,
      smtpPort: 587,
    });
  } catch (error: unknown) {
    const msg =
      error instanceof Error
        ? error.message
        : "Failed to rotate credentials";
    console.error("Failed to rotate credentials:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
