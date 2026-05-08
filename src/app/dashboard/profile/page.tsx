import { Metadata } from "next";
import { ProfilePageContent } from "@/components/dashboard/profile/profile-page-content";
import { DashboardBackNav } from "@/components/shared/dashboard-back-nav";

export const metadata: Metadata = {
  title: "My Profile | Labor Law Partner",
  description: "Manage your professional profile",
};

export default function ProfilePage() {
  return (
    <>
      <DashboardBackNav />
      <ProfilePageContent />
    </>
  );
}
