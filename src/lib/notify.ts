/**
 * Client-side notification helper.
 * Fires a non-blocking POST to /api/notifications after Convex mutations succeed.
 */

export function fireNotification(type: string, data: Record<string, unknown>) {
  fetch("/api/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, ...data }),
  }).catch((err) => {
    console.error(`[notify] Failed to send ${type}:`, err);
  });
}
