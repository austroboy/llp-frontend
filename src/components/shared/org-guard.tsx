"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccountType } from "@/components/providers/account-context";
import { ShieldAlert } from "lucide-react";

/**
 * Blocks org users from accessing scout/expert application routes.
 * Shows a brief "access denied" message, then redirects.
 */
export function OrgGuard({ children, redirectTo = "/headhunting" }: { children: React.ReactNode; redirectTo?: string }) {
  const { isOrgUser, isLoaded } = useAccountType();
  const router = useRouter();
  const [redirected, setRedirected] = useState(false);

  useEffect(() => {
    if (isLoaded && isOrgUser && !redirected) {
      setRedirected(true);
      const timer = setTimeout(() => router.replace(redirectTo), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOrgUser, isLoaded, router, redirectTo, redirected]);

  if (!isLoaded) return null;

  if (isOrgUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4 p-8">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted">
          <ShieldAlert className="size-7 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold">Access Restricted</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          This section is for individual professionals only. Organization accounts use a different workflow.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
