"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronLeft, ChevronRight, Mail, Loader2, Trash2 } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import { motion, MotionConfig, type Variants } from "framer-motion";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
const heroStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
};
const inViewOnce = { once: true, margin: "-72px 0px" } as const;

const ROLES = ["user", "admin", "expert", "employer", "scout"] as const;
const PLATFORM_TIERS = ["free_guest", "free_subscribed", "mini", "max"] as const;
const SCOUT_TIERS = ["none", "standard", "verified", "premium"] as const;
const ACCOUNT_TYPES = ["personal", "organization"] as const;

const ROLE_LABELS: Record<string, string> = {
  user: "User",
  admin: "Admin",
  expert: "Expert",
  employer: "Employer",
  scout: "Scout",
};

const ROLE_STYLES: Record<string, string> = {
  admin: "bg-primary/10 text-primary border-primary/20",
  expert: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  employer: "bg-teal-500/10 text-teal-600 border-teal-500/20 dark:text-teal-400",
  scout: "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400",
  user: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
};

const TIER_STYLES: Record<string, string> = {
  free_guest: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
  free_subscribed: "bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400",
  mini: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  max: "bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400",
};

const TIER_LABELS: Record<string, string> = {
  free_guest: "Guest",
  free_subscribed: "Free",
  mini: "Mini",
  max: "Max",
};

const SCOUT_TIER_STYLES: Record<string, string> = {
  none: "bg-gray-100 text-gray-400 border-gray-200 dark:bg-gray-800 dark:text-gray-600 dark:border-gray-700",
  standard: "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400",
  verified: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  premium: "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400",
};

const SCOUT_TIER_LABELS: Record<string, string> = {
  none: "None",
  standard: "Standard",
  verified: "Verified",
  premium: "Premium",
};

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="#0A66C2">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const GitHubIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

function ProviderIcon({ provider }: { provider: string }) {
  const normalized = provider.toLowerCase();
  const iconClass = "size-4";

  if (normalized.includes("google"))
    return <GoogleIcon className={iconClass} />;
  if (normalized.includes("linkedin"))
    return <LinkedInIcon className={iconClass} />;
  if (normalized.includes("github"))
    return <GitHubIcon className={iconClass} />;
  if (normalized.includes("facebook"))
    return <FacebookIcon className={iconClass} />;
  if (normalized.includes("email"))
    return <Mail className={cn(iconClass, "text-muted-foreground")} />;

  return <Mail className={cn(iconClass, "text-muted-foreground")} />;
}

const ACCOUNT_TYPE_STYLES: Record<string, string> = {
  personal: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
  organization: "bg-teal-500/10 text-teal-600 border-teal-500/20 dark:text-teal-400",
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  personal: "Personal",
  organization: "Organization",
};

interface UserItem {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  imageUrl: string;
  role: string;
  tier: string;
  scoutTier: string | null;
  accountType: string;
  orgName: string | null;
  provider: string;
  createdAt: number;
  lastSignInAt: number | null;
}

export default function AdminUsersPage() {
  const { t } = useLanguage();
  const { user: adminUser } = useUser();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const limit = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (query) params.set("query", query);

      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setTotalCount(data.totalCount);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateUser = async (userId: string, field: "role" | "tier" | "scoutTier" | "accountType", value: string) => {
    setUpdating(`${userId}-${field}`);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, [field]: value }),
      });
      if (res.ok) {
        const data = await res.json();
        setUsers((prev) =>
          prev.map((u) => u.id === userId ? {
            ...u,
            role: data.role ?? u.role,
            tier: data.tier ?? u.tier,
            scoutTier: data.scoutTier ?? u.scoutTier,
            accountType: data.accountType ?? u.accountType,
            orgName: data.orgName ?? u.orgName,
          } : u)
        );
      }
    } catch (err) {
      console.error(`Failed to update ${field}:`, err);
    } finally {
      setUpdating(null);
    }
  };

  const removeUser = async (userId: string) => {
    setDeletingId(userId);
    setDeleteError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        setTotalCount((c) => Math.max(0, c - 1));
      } else {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.error ?? "Failed to delete user");
      }
    } catch (err) {
      console.error("Failed to delete user:", err);
      setDeleteError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <MotionConfig reducedMotion="user">
      {/* -- Hero ------------------------------------------------ */}
      <motion.section
        variants={heroStagger}
        initial="hidden"
        animate="show"
        style={{ paddingBottom: "var(--s-5)" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: "var(--s-4)",
            flexWrap: "wrap",
          }}
        >
          <div>
            <motion.div variants={fadeUp} className="lf-kicker">
              <span className="lf-kicker-mark">§ 1.3</span>
              Admin · Users
            </motion.div>
            <motion.h1
              variants={fadeUp}
              style={{
                fontFamily: "var(--lf-display)",
                fontSize: "clamp(32px, 4.4vw, 48px)",
                fontWeight: 400,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                color: "var(--ink)",
                margin: "var(--s-3) 0 var(--s-3)",
              }}
            >
              Identity <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>dossiers.</em>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="lf-section-deck"
              style={{ maxWidth: "60ch" }}
            >
              Roles, tiers, and account types for every enrolled subject. Dossiers managed by Clerk, filed here.
            </motion.p>
          </div>
          <motion.span
            variants={fadeUp}
            className="lf-status lf-status--live"
            style={{ alignSelf: "center" }}
          >
            <span className="lf-status-dot" />
            Total · <strong style={{ marginLeft: 4 }}>{totalCount}</strong>
          </motion.span>
        </div>
      </motion.section>

      {/* Search — full width on mobile */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        className="relative"
        style={{ marginBottom: "var(--s-4)" }}
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder={t("admin.users.searchPlaceholder")}
          className="pl-9 sm:max-w-sm"
        />
      </motion.div>

      {deleteError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {deleteError}
        </div>
      )}

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        className="lf-card"
        style={{ padding: 0, overflow: "hidden", marginBottom: "var(--s-4)" }}
      >
        {loading ? (
          <div className="p-3.5 sm:p-5 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5">
                <Skeleton className="size-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="h-2.5 w-2/3" />
                </div>
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {t("admin.users.noUsers")}
          </div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="divide-y divide-border/50 sm:hidden p-3.5">
              {users.map((user) => (
                <div key={user.id} className="py-3 first:pt-0 last:pb-0">
                  {/* Row 1: avatar + name + provider */}
                  <div className="flex items-center gap-2.5">
                    {user.imageUrl && (
                      <img
                        src={user.imageUrl}
                        alt=""
                        className="size-8 rounded-full shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] font-medium leading-snug">
                          {user.firstName} {user.lastName}
                        </p>
                        <ProviderIcon provider={user.provider} />
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <DeleteUserButton
                      user={user}
                      isSelf={user.id === adminUser?.id}
                      isDeleting={deletingId === user.id}
                      onConfirm={() => removeUser(user.id)}
                    />
                  </div>
                  {/* Row 2: role + tier selects + dates */}
                  <div className="flex items-center gap-2 mt-2 ml-[42px]">
                    <Select
                      value={user.role}
                      onValueChange={(v) => updateUser(user.id, "role", v)}
                      disabled={updating === `${user.id}-role`}
                    >
                      <SelectTrigger
                        size="sm"
                        className={cn(
                          "h-6 min-w-[80px] border text-[10px] font-medium gap-1 px-1.5",
                          ROLE_STYLES[user.role] ?? ROLE_STYLES.user
                        )}
                      >
                        {updating === `${user.id}-role` ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <SelectValue />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r} className="text-xs">
                            {ROLE_LABELS[r] ?? r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={user.tier}
                      onValueChange={(v) => updateUser(user.id, "tier", v)}
                      disabled={updating === `${user.id}-tier`}
                    >
                      <SelectTrigger
                        size="sm"
                        className={cn(
                          "h-6 min-w-[65px] border text-[10px] font-medium gap-1 px-1.5",
                          TIER_STYLES[user.tier] ?? TIER_STYLES.free_guest
                        )}
                      >
                        {updating === `${user.id}-tier` ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <SelectValue />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {PLATFORM_TIERS.map((tier) => (
                          <SelectItem key={tier} value={tier} className="text-xs">
                            {TIER_LABELS[tier]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={user.scoutTier ?? "none"}
                      onValueChange={(v) => updateUser(user.id, "scoutTier", v)}
                      disabled={updating === `${user.id}-scoutTier`}
                    >
                      <SelectTrigger
                        size="sm"
                        className={cn(
                          "h-6 min-w-[65px] border text-[10px] font-medium gap-1 px-1.5",
                          SCOUT_TIER_STYLES[user.scoutTier ?? "none"]
                        )}
                      >
                        {updating === `${user.id}-scoutTier` ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <SelectValue />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {SCOUT_TIERS.map((st) => (
                          <SelectItem key={st} value={st} className="text-xs capitalize">
                            {SCOUT_TIER_LABELS[st]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop: table */}
            <Table className="hidden sm:table">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.table.name")}</TableHead>
                  <TableHead>{t("admin.table.email")}</TableHead>
                  <TableHead>{t("admin.users.role")}</TableHead>
                  <TableHead>Search Tier</TableHead>
                  <TableHead>Scout Tier</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="w-12 text-center">{t("admin.users.provider")}</TableHead>
                  <TableHead>{t("admin.users.joined")}</TableHead>
                  <TableHead>{t("admin.users.lastSignIn")}</TableHead>
                  <TableHead className="w-12 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-sm">
                      <div className="flex items-center gap-2.5">
                        {user.imageUrl && (
                          <img
                            src={user.imageUrl}
                            alt=""
                            className="size-7 rounded-full"
                          />
                        )}
                        <span>
                          {user.firstName} {user.lastName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(v) => updateUser(user.id, "role", v)}
                        disabled={updating === `${user.id}-role`}
                      >
                        <SelectTrigger
                          size="sm"
                          className={cn(
                            "h-7 min-w-[100px] border text-[11px] font-medium gap-1 px-2",
                            ROLE_STYLES[user.role] ?? ROLE_STYLES.user
                          )}
                        >
                          {updating === `${user.id}-role` ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r} className="text-xs capitalize">
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.tier}
                        onValueChange={(v) => updateUser(user.id, "tier", v)}
                        disabled={updating === `${user.id}-tier`}
                      >
                        <SelectTrigger
                          size="sm"
                          className={cn(
                            "h-7 min-w-[80px] border text-[11px] font-medium gap-1 px-2",
                            TIER_STYLES[user.tier] ?? TIER_STYLES.free_guest
                          )}
                        >
                          {updating === `${user.id}-tier` ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {PLATFORM_TIERS.map((tier) => (
                            <SelectItem key={tier} value={tier} className="text-xs">
                              {TIER_LABELS[tier]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.scoutTier ?? "none"}
                        onValueChange={(v) => updateUser(user.id, "scoutTier", v)}
                        disabled={updating === `${user.id}-scoutTier`}
                      >
                        <SelectTrigger
                          size="sm"
                          className={cn(
                            "h-7 min-w-[80px] border text-[11px] font-medium gap-1 px-2",
                            SCOUT_TIER_STYLES[user.scoutTier ?? "none"]
                          )}
                        >
                          {updating === `${user.id}-scoutTier` ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {SCOUT_TIERS.map((st) => (
                            <SelectItem key={st} value={st} className="text-xs capitalize">
                              {SCOUT_TIER_LABELS[st]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.accountType}
                        onValueChange={(v) => updateUser(user.id, "accountType", v)}
                        disabled={updating === `${user.id}-accountType`}
                      >
                        <SelectTrigger
                          size="sm"
                          className={cn(
                            "h-7 min-w-[100px] border text-[11px] font-medium gap-1 px-2",
                            ACCOUNT_TYPE_STYLES[user.accountType] ?? ACCOUNT_TYPE_STYLES.personal
                          )}
                        >
                          {updating === `${user.id}-accountType` ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {ACCOUNT_TYPES.map((at) => (
                            <SelectItem key={at} value={at} className="text-xs">
                              {ACCOUNT_TYPE_LABELS[at]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center" title={user.provider}>
                        <ProviderIcon provider={user.provider} />
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.lastSignInAt
                        ? new Date(user.lastSignInAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <DeleteUserButton
                        user={user}
                        isSelf={user.id === adminUser?.id}
                        isDeleting={deletingId === user.id}
                        onConfirm={() => removeUser(user.id)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={inViewOnce}
          className="flex items-center justify-between"
        >
          <p className="text-xs sm:text-sm text-muted-foreground">
            {(page - 1) * limit + 1}–{Math.min(page * limit, totalCount)} / {totalCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </MotionConfig>
  );
}

function DeleteUserButton({
  user,
  isSelf,
  isDeleting,
  onConfirm,
}: {
  user: UserItem;
  isSelf: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
}) {
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          disabled={isSelf || isDeleting}
          title={isSelf ? "You cannot delete your own account" : "Delete user"}
        >
          {isDeleting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Trash2 className="size-3.5" />
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this user?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes{" "}
            <span className="font-medium text-foreground">{displayName}</span>{" "}
            ({user.email}) from Clerk. They will be able to register again with the
            same email. Convex records keyed by their old Clerk ID will be orphaned
            but harmless.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
