import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";

const BUCKET = "resource-pdfs";

async function isAdmin() {
  const user = await currentUser();
  return user?.publicMetadata?.role === "admin";
}

// GET — list all files
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("resource_files")
    .select("*, resource_categories(name, slug)")
    .order("sort_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ files: data });
}

// POST — upload a new PDF file
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const title = formData.get("title") as string;
  const categoryId = formData.get("category_id") as string;
  const language = (formData.get("language") as string) || "en";
  const categorySlug = formData.get("category_slug") as string;

  if (!file || !title || !categoryId) {
    return NextResponse.json(
      { error: "file, title, and category_id required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._\-() ]/g, "_");
  const storagePath = `${categorySlug || "uploads"}/${sanitizedName}`;

  // Upload to storage
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `Upload failed: ${uploadError.message}` },
      { status: 500 }
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  // Insert DB row
  const { data, error: dbError } = await supabase
    .from("resource_files")
    .insert({
      category_id: parseInt(categoryId),
      title,
      file_name: file.name,
      storage_path: storagePath,
      public_url: publicUrl,
      language,
      file_size_bytes: file.size,
      file_size_display: formatFileSize(file.size),
      is_active: true,
    })
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  // Notify about new resource (non-blocking)
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const notificationSecret = process.env.NOTIFICATION_SECRET;
  if (notificationSecret) {
    headers["x-notification-secret"] = notificationSecret;
  }
  // SSRF guard — derive base from VERCEL_URL/NEXT_PUBLIC_BASE_URL,
  // never from req.url (Host header is request-controlled).
  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3001";
  fetch(new URL("/api/notifications", base).toString(), {
    method: "POST",
    headers,
    body: JSON.stringify({
      type: "resource_published",
      resourceTitle: title,
      fileName: file.name,
      language,
    }),
  }).catch(() => {});

  return NextResponse.json({ file: data }, { status: 201 });
}

// DELETE — remove a file
export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Get the file to delete from storage
  const { data: file } = await supabase
    .from("resource_files")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (file?.storage_path) {
    await supabase.storage.from(BUCKET).remove([file.storage_path]);
  }

  const { error } = await supabase
    .from("resource_files")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}
