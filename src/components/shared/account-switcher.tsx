"use client";

import { useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { Building2, UserCircle, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function AccountSwitcher() {
  const { user } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  const metadata = user?.publicMetadata as {
    accountType?: string;
    orgName?: string;
  } | undefined;

  // Only show if user has both account types
  const accountType = metadata?.accountType;
  if (accountType !== "both") return null;

  const isOrg = pathname.startsWith("/org");
  const orgName = metadata?.orgName ?? "Organization";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
          {isOrg ? (
            <>
              <Building2 className="size-3.5" />
              <span className="max-w-[120px] truncate">{orgName}</span>
            </>
          ) : (
            <>
              <UserCircle className="size-3.5" />
              Personal
            </>
          )}
          <ChevronDown className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => router.push("/dashboard")}
          className="cursor-pointer gap-2"
        >
          <UserCircle className="size-4" />
          Personal Account
          {!isOrg && <span className="ml-auto text-[10px] text-primary">Active</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push("/org")}
          className="cursor-pointer gap-2"
        >
          <Building2 className="size-4" />
          <span className="truncate">{orgName}</span>
          {isOrg && <span className="ml-auto text-[10px] text-primary">Active</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
