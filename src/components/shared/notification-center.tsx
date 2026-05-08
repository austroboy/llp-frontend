"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";
import { Check, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotificationCenterProps {
  userId: string;
  accountType: "personal" | "organization";
  onClose: () => void;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function NotificationCenter({ userId, accountType, onClose }: NotificationCenterProps) {
  const { t } = useLanguage();
  const router = useRouter();

  const notifications = useQuery(api.notifications.getByUser, {
    userId,
    accountType,
    limit: 20,
  });

  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);

  const handleClick = async (notificationId: string, targetUrl: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await markRead({ notificationId: notificationId as any });
    onClose();
    router.push(targetUrl);
  };

  const handleMarkAllRead = async () => {
    await markAllRead({ userId, accountType });
  };

  const hasUnread = notifications?.some((n) => !n.read);

  return (
    <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-hidden rounded-xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl ring-1 ring-black/5 z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">
          {t("notifications.title")}
        </h3>
        {hasUnread && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 gap-1"
            onClick={handleMarkAllRead}
          >
            <Check className="size-3" />
            {t("notifications.markAllRead")}
          </Button>
        )}
      </div>

      {/* List */}
      <div className="overflow-y-auto max-h-72">
        {!notifications || notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <BellOff className="size-8 mb-2 opacity-40" />
            <p className="text-sm">{t("notifications.empty")}</p>
          </div>
        ) : (
          notifications.map((n) => (
            <button
              key={n._id}
              onClick={() => handleClick(n._id, n.targetUrl)}
              className={`w-full text-left px-4 py-3 border-b border-border/50 last:border-0 hover:bg-muted/50 transition-colors ${
                !n.read ? "bg-primary/5" : ""
              }`}
            >
              <div className="flex items-start gap-2">
                {!n.read && (
                  <span className="mt-1.5 size-2 rounded-full bg-primary shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {n.summary}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {timeAgo(n.createdAt)}
                  </p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
