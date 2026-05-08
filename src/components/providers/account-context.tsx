"use client";

import { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import { useUser } from "@clerk/nextjs";

type AccountType = "personal" | "organization";

interface AccountContextValue {
  accountType: AccountType;
  isOrgUser: boolean;
  isLoaded: boolean;
  orgId?: string;
}

const AccountContext = createContext<AccountContextValue>({
  accountType: "personal",
  isOrgUser: false,
  isLoaded: false,
});

export function useAccountType() {
  return useContext(AccountContext);
}

export function AccountContextProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
  const finalizeAttempted = useRef(false);

  const publicMeta = user?.publicMetadata as {
    accountType?: string;
    orgId?: string;
  } | undefined;
  const unsafeMeta = user?.unsafeMetadata as {
    accountType?: string;
  } | undefined;

  // Self-heal: if the user was created via the org sign-up flow (unsafeMetadata
  // marker present) but Phase B never finalized publicMetadata, call the
  // server-side finalize endpoint. Idempotent and runs at most once per session.
  useEffect(() => {
    if (!isLoaded || !user || finalizeAttempted.current) return;
    if (unsafeMeta?.accountType !== "organization") return;
    if (publicMeta?.accountType === "organization" && publicMeta?.orgId) return;

    finalizeAttempted.current = true;
    fetch("/api/auth/finalize-org", { method: "POST" })
      .then(async (res) => {
        if (res.ok) {
          // Reload the Clerk user so the new publicMetadata is reflected in
          // useUser() and downstream guards (OrgGuard, sidebar filters, etc.).
          await user.reload();
        } else {
          const data = await res.json().catch(() => ({}));
          console.error("[finalize-org] non-ok response:", res.status, data);
        }
      })
      .catch((err) => {
        console.error("[finalize-org] fetch failed:", err);
      });
  }, [isLoaded, user, publicMeta?.accountType, publicMeta?.orgId, unsafeMeta?.accountType]);

  const isOrgUser = isLoaded && publicMeta?.accountType === "organization";
  const accountType: AccountType = isOrgUser ? "organization" : "personal";
  const orgId = publicMeta?.orgId;

  return (
    <AccountContext.Provider value={{ accountType, isOrgUser, isLoaded, orgId }}>
      {children}
    </AccountContext.Provider>
  );
}
