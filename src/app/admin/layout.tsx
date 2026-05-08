import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AdminLayoutClient } from "./admin-layout-client";

export const dynamic = "force-dynamic";

async function loadUserWithRetry(retries = 2) {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await currentUser();
    } catch (err) {
      lastErr = err;
      if (i < retries) {
        await new Promise((r) => setTimeout(r, 250 * (i + 1)));
      }
    }
  }
  throw lastErr;
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await loadUserWithRetry();
  } catch (err) {
    console.error("[AdminLayout] Clerk currentUser failed:", err);
    redirect("/sign-in?error=auth_unavailable");
  }

  if (!user) {
    redirect("/sign-in");
  }

  const role = (user.publicMetadata as { role?: string })?.role;
  if (role !== "admin") {
    redirect("/");
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
