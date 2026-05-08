"use client";

import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { cn } from "@/lib/utils";
import { NotificationCenter } from "./notification-center";

export function NotificationBell() {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = useQuery(
    api.notifications.getUnreadCount,
    user?.id
      ? { userId: user.id, accountType: "personal" as const }
      : "skip"
  );

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "relative flex items-center justify-center size-8 rounded-full text-muted-foreground transition-colors",
          open ? "bg-muted text-foreground" : "hover:bg-muted hover:text-foreground"
        )}
        aria-label="Notifications"
      >
        <Bell className="size-4" />
        {(unreadCount ?? 0) > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center size-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
            {unreadCount! > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationCenter
          userId={user.id}
          accountType="personal"
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
