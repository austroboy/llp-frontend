import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getPdfBuffer } from "@/lib/pdf-files";

interface PublicMetadata {
  role?: string;
}

async function requireAdmin() {
  const user = await currentUser();
  if (!user) return { error: "Unauthorized", status: 401 };
  const role = (user.publicMetadata as PublicMetadata)?.role;
  if (role !== "admin") return { error: "Forbidden", status: 403 };
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdmin();
  if (authErr)
    return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  const { id } = await params;
  const lang = (request.nextUrl.searchParams.get("lang") || "en") as "en" | "bn";

  const buffer = await getPdfBuffer(id, lang);
  if (!buffer) {
    return NextResponse.json({ error: "PDF not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${id}_${lang}.pdf"`,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
