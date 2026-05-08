import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time comparison of two secret strings (e.g., bearer tokens).
 * Returns false on any null/undef/length-mismatch *before* invoking the
 * crypto primitive (which would throw on length mismatch).
 *
 * Use this in place of `if (a !== b)` whenever comparing user-provided
 * authentication material against a server-side secret.
 */
export function safeEqual(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a || !b) return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}
