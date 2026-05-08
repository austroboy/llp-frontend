"use client";

import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

export function useImageUpload() {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const uploadImage = async (file: File): Promise<string> => {
    if (!file.type.startsWith("image/")) throw new Error("Not an image");
    if (file.size > 10 * 1024 * 1024) throw new Error("Max 10MB");

    const uploadUrl = await generateUploadUrl();
    const result = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    const { storageId } = await result.json();
    // Use a special URL scheme that the renderer will resolve
    return `convex-storage::${storageId}`;
  };

  return { uploadImage };
}

export function isConvexStorageUrl(url: string): boolean {
  return url.startsWith("convex-storage::");
}

export function extractStorageId(url: string): Id<"_storage"> {
  return url.replace("convex-storage::", "") as Id<"_storage">;
}
