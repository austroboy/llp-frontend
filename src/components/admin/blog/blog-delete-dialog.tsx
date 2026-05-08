"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";

interface BlogDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: Id<"blogPosts">;
  postTitle: string;
}

export function BlogDeleteDialog({
  open,
  onOpenChange,
  postId,
  postTitle,
}: BlogDeleteDialogProps) {
  const { t } = useLanguage();
  const removeMutation = useMutation(api.blogPosts.remove);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await removeMutation({ id: postId });
      onOpenChange(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("admin.blog.deleteTitle")}</DialogTitle>
          <DialogDescription>
            {t("admin.blog.deleteConfirm")} <strong>&quot;{postTitle}&quot;</strong>?
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("admin.cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? t("admin.deleting") : t("admin.delete")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
