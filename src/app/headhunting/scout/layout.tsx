import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import { OrgGuard } from "@/components/shared/org-guard";

export default function ScoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <SiteTopNav />
      <OrgGuard redirectTo="/headhunting">
        {children}
      </OrgGuard>
      <HomepageFooter />
    </div>
  );
}
