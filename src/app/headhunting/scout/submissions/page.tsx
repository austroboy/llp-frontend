"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Send, Crosshair } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  screening: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  shortlisted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  interview: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  selected: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  offer: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  joined: "bg-green-200 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  rejected: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  withdrawn: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
};

export default function ScoutSubmissionsPage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const userId = user?.id;

  const submissions = useQuery(
    api.headhunting.scouts.getMySubmissions,
    userId ? { scoutId: userId } : "skip"
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Send className="size-6 text-primary" />
          {t("scout.submissions.title")}
        </h1>
      </div>

      {/* Nav */}
      <div className="flex gap-2">
        <Link href="/headhunting/scout">
          <Badge variant="outline" className="px-3 py-1 cursor-pointer hover:bg-muted">{t("scout.nav.dashboard")}</Badge>
        </Link>
        <Link href="/headhunting/scout/briefs">
          <Badge variant="outline" className="px-3 py-1 cursor-pointer hover:bg-muted">{t("scout.nav.briefs")}</Badge>
        </Link>
        <Badge variant="default" className="px-3 py-1">{t("scout.nav.submissions")}</Badge>
        <Link href="/headhunting/scout/earnings">
          <Badge variant="outline" className="px-3 py-1 cursor-pointer hover:bg-muted">Earnings</Badge>
        </Link>
      </div>

      {!submissions ? (
        <div className="py-12 text-center text-sm text-muted-foreground">{t("admin.loading")}</div>
      ) : submissions.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">{t("scout.submissions.empty")}</div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Mandate</TableHead>
                <TableHead>{t("scout.submissions.status")}</TableHead>
                <TableHead className="text-right">{t("admin.table.date")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((sub) => (
                <TableRow key={sub._id}>
                  <TableCell className="font-medium text-sm">{sub.candidateName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{sub.mandateTitle}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-[11px]", statusColors[sub.status])}>
                      {sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {new Date(sub.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
