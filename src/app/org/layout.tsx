import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { OrgLayoutClient } from "./org-layout-client";

export default async function OrgLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return <OrgLayoutClient>{children}</OrgLayoutClient>;
}
