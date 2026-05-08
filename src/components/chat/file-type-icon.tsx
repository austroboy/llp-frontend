"use client";

import { cn } from "@/lib/utils";

type IconFormat = "docx" | "pdf" | "pptx" | "xlsx" | "jpg" | "png";

const ICON_SRC: Record<IconFormat, string> = {
  docx: "/icons/file-types/docx.svg",
  pdf: "/icons/file-types/pdf.svg",
  pptx: "/icons/file-types/pptx.svg",
  xlsx: "/icons/file-types/xlsx.svg",
  jpg: "/icons/file-types/jpg.svg",
  png: "/icons/file-types/png.svg",
};

interface FileTypeIconProps {
  format: string;
  /** Applied to the inner <img>. Defaults to size-6. */
  className?: string;
  /** Alt text override — defaults to "<FORMAT> file". */
  alt?: string;
}

/**
 * Full-color brand-style SVG per file format (Word blue, PDF red,
 * Excel green, etc). Uses `/public/icons/file-types/*.svg` so Next
 * serves them as static assets — no bundle cost.
 *
 * Returns `null` when the format isn't in our icon set. Callers
 * should fall back to a Lucide glyph in that case (e.g. txt).
 * Use `hasFileTypeIcon(format)` to check before rendering.
 */
export function FileTypeIcon({
  format,
  className,
  alt,
}: FileTypeIconProps) {
  const key = format.toLowerCase() as IconFormat;
  const src = ICON_SRC[key];
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? `${format.toUpperCase()} file`}
      draggable={false}
      className={cn("inline-block select-none", className ?? "size-6")}
    />
  );
}

export function hasFileTypeIcon(format: string): boolean {
  return format.toLowerCase() in ICON_SRC;
}
