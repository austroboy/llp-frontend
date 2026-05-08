import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardLayoutClient } from "./dashboard-layout-client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
