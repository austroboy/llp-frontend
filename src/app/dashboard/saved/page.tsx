"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useLanguage } from "@/hooks/use-language";
import { Trash2, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DashboardBackNav } from "@/components/shared/dashboard-back-nav";

type ItemType = "all" | "search_result" | "ai_draft";

export default function SavedItemsPage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const [filter, setFilter] = useState<ItemType>("all");

  const items = useQuery(
    api.savedItems.listByUser,
    user?.id
      ? {
          userId: user.id,
          ...(filter !== "all" ? { itemType: filter } : {}),
        }
      : "skip"
  );

  const unsave = useMutation(api.savedItems.unsave);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleUnsave = async (itemId: string) => {
    if (!user?.id) return;
    await unsave({ userId: user.id, itemId });
  };

  const tabs: { key: ItemType; label: string }[] = [
    { key: "all", label: t("saved.tabs.all") },
    { key: "search_result", label: t("saved.tabs.searchResults") },
    { key: "ai_draft", label: t("saved.tabs.aiDrafts") },
  ];

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const totalCount = items?.length ?? 0;

  return (
    <>
      <DashboardBackNav />

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="dash-header">
        <div>
          <div className="dash-hello-kicker">
            Personal Desk · {today} · <strong>Saved Items</strong>
          </div>
          <h1 className="dash-hello-title">
            {t("dashboard.nav.savedItems")} <em>library.</em>
          </h1>
          <p className="dash-hello-sub">
            Quick access to your saved AI search results and drafts.
          </p>
        </div>
      </div>

      {/* ── Filter tabs ─────────────────────────────────────── */}
      <div
        className="lf-tabs"
        style={{ marginBottom: "var(--s-4)" }}
        role="tablist"
      >
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={filter === key}
            onClick={() => setFilter(key)}
            className={cn("lf-tab", filter === key && "lf-tab--active")}
          >
            {label}
            {filter === key && totalCount > 0 && (
              <span className="lf-tab-count">{totalCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Items ───────────────────────────────────────────── */}
      {!items || items.length === 0 ? (
        <div className="dash-empty">
          <div className="dash-empty-title">No saved items</div>
          <p className="dash-empty-body">{t("saved.empty")}</p>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--s-2)",
          }}
        >
          {items.map((item) => {
            const isExpanded = expandedId === item._id;
            const body = item.content || item.preview || "";
            const canExpand =
              !!item.content &&
              item.content.length > (item.preview?.length ?? 0);
            const deepLink = item.conversationId
              ? `/chat?conv=${item.conversationId}&msg=${item.itemId}`
              : `/chat?ref=${item.itemId}`;
            return (
              <div key={item._id} className="lf-card lf-card--hover">
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : item._id)
                    }
                    aria-expanded={isExpanded}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      textAlign: "left",
                      background: "transparent",
                      border: 0,
                      cursor: "pointer",
                      color: "inherit",
                      font: "inherit",
                      padding: 0,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span className="lf-tag lf-tag--more">
                        {item.itemType === "search_result"
                          ? "Search"
                          : "Draft"}
                      </span>
                      <p
                        className="lf-h3"
                        style={{
                          fontSize: 15,
                          margin: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        {item.title}
                      </p>
                      {canExpand && (
                        <span style={{ color: "var(--ink-4)" }}>
                          {isExpanded ? (
                            <ChevronUp className="size-3.5" />
                          ) : (
                            <ChevronDown className="size-3.5" />
                          )}
                        </span>
                      )}
                    </div>
                    {body && !isExpanded && (
                      <p
                        className="lf-body"
                        style={{
                          fontSize: 13,
                          marginTop: 6,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {item.preview || body.slice(0, 200)}
                      </p>
                    )}
                    <p
                      className="lf-meta"
                      style={{
                        fontSize: 10,
                        marginTop: 8,
                        letterSpacing: "0.14em",
                      }}
                    >
                      Saved {new Date(item.savedAt).toLocaleDateString()}
                    </p>
                  </button>
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexShrink: 0,
                      alignItems: "center",
                    }}
                  >
                    <Link
                      href={deepLink}
                      title="Open in chat"
                      className="lf-icon-btn"
                    >
                      <ExternalLink className="size-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleUnsave(item.itemId)}
                      title="Remove"
                      className="lf-icon-btn"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
                {isExpanded && body && (
                  <div
                    style={{
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: "0.5px solid var(--line-1)",
                    }}
                  >
                    <div
                      className="lf-body"
                      style={{
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        color: "var(--ink-2)",
                      }}
                    >
                      {body}
                    </div>
                    {!item.content && (
                      <p
                        className="lf-body"
                        style={{
                          marginTop: 8,
                          fontSize: 11,
                          fontStyle: "italic",
                          color: "var(--ink-4)",
                        }}
                      >
                        This item was saved before full-text storage was
                        enabled — re-save it from the conversation to capture
                        the full reply.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
