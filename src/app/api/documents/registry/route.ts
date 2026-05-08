import { NextResponse } from "next/server";
import { getRegistry, getBilingualFlags } from "@/lib/documents";

export async function GET() {
  try {
    const documents = await getRegistry();
    const translationFlags: Record<string, { enTranslated?: boolean; bnTranslated?: boolean; hasEn?: boolean; hasBn?: boolean }> = {};
    for (const doc of documents) {
      const flags = await getBilingualFlags(doc.id);
      translationFlags[doc.id] = {
        enTranslated: flags.enTranslated,
        bnTranslated: flags.bnTranslated,
        hasEn: flags.hasEn,
        hasBn: flags.hasBn,
      };
    }
    return NextResponse.json({ documents, translationFlags });
  } catch {
    return NextResponse.json(
      { error: "Failed to load registry" },
      { status: 500 }
    );
  }
}
