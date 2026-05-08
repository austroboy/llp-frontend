import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

interface Task {
  number: number;
  description: string;
  status: string;
}

interface PendingItem {
  title: string;
  lines: string[];
  status: string;
}

export interface OpData {
  round1: Task[];
  round2: Task[];
  round3: Task[];
  pending: PendingItem[];
  lastRead: string;
}

function parseTaskTables(content: string): { round1: Task[]; round2: Task[]; round3: Task[] } {
  const sections = content.split(/^## /m);
  const round1: Task[] = [];
  const round2: Task[] = [];
  const round3: Task[] = [];

  for (const section of sections) {
    const isRound1 = section.startsWith("ROUND 1");
    const isRound2 = section.startsWith("ROUND 2");
    const isRound3 = section.startsWith("ROUND 3");
    if (!isRound1 && !isRound2 && !isRound3) continue;

    const target = isRound1 ? round1 : isRound2 ? round2 : round3;
    const lines = section.split("\n");
    let headerFound = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("|")) continue;
      if (trimmed.match(/^\|\s*#/) || trimmed.match(/^\|\s*Task/i)) continue;
      if (trimmed.replace(/[|\-\s]/g, "") === "") {
        headerFound = true;
        continue;
      }
      if (!headerFound) continue;

      const cols = trimmed
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c !== "");
      if (cols.length >= 3) {
        const num = parseInt(cols[0]);
        if (!isNaN(num)) {
          target.push({
            number: num,
            description: cols[1],
            status: cols[2].toLowerCase().trim(),
          });
        }
      }
    }
  }

  return { round1, round2, round3 };
}

function parsePendingTasks(content: string): PendingItem[] {
  const items: PendingItem[] = [];
  const sections = content.split(/^## /m).slice(1);

  for (const section of sections) {
    const lines = section.split("\n");
    const title = lines[0].trim();
    const bodyLines = lines.slice(1).filter((l) => l.trim() !== "");

    const statusLine = bodyLines.find((l) => l.includes("**Status:**"));
    let status = "pending";
    if (statusLine) {
      const match = statusLine.match(/\*\*Status:\*\*\s*(.+)/);
      if (match) status = match[1].trim().toLowerCase();
    }

    const descLines = bodyLines
      .filter((l) => !l.includes("**Status:**"))
      .map((l) => l.replace(/^[-*]\s*/, "").trim())
      .filter((l) => l !== "");

    items.push({ title, lines: descLines, status });
  }

  return items;
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const meta = user?.publicMetadata as { role?: string } | undefined;
    if (meta?.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const plansDir = path.join(
      process.cwd(),
      "shared",
      "knowledge",
      "llp",
      "plans"
    );

    const [execContent, pendingContent] = await Promise.all([
      fs.readFile(path.join(plansDir, "execution-plan-launch.md"), "utf-8"),
      fs.readFile(path.join(plansDir, "pending-tasks.md"), "utf-8"),
    ]);

    const { round1, round2, round3 } = parseTaskTables(execContent);
    const pending = parsePendingTasks(pendingContent);

    const data: OpData = {
      round1,
      round2,
      round3,
      pending,
      lastRead: new Date().toISOString(),
    };

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to read plan files" },
      { status: 500 }
    );
  }
}
