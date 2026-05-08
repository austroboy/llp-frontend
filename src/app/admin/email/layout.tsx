import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isMasterAdmin } from "@/lib/auth";

export default async function EmailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user || !isMasterAdmin(user)) {
    redirect("/admin");
  }
  return <>{children}</>;
}
