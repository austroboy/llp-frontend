"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { fireNotification } from "@/lib/notify";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  pending: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  reviewed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  connected: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  cancelled: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
};

const allStatuses = ["pending", "reviewed", "connected", "completed", "cancelled"] as const;

interface ConsultationDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: Doc<"consultationRequests">;
}

export function ConsultationDetailDialog({
  open,
  onOpenChange,
  request,
}: ConsultationDetailDialogProps) {
  const { t } = useLanguage();
  const updateStatus = useMutation(api.consultationRequests.updateStatus);
  const assignExpert = useMutation(api.consultationRequests.assignExpert);

  const [status, setStatus] = useState(request.status);
  const [adminNotes, setAdminNotes] = useState(request.adminNotes ?? "");
  const [expertName, setExpertName] = useState(request.assignedExpert ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (expertName && expertName !== request.assignedExpert) {
        await assignExpert({ id: request._id, assignedExpert: expertName });
        // Notify requester that expert was assigned
        fireNotification("consultation_connected", {
          requesterName: request.requesterName,
          requesterEmail: request.requesterEmail,
          expertName,
          expertArea: request.expertArea,
        });
      }
      if (status !== request.status || adminNotes !== (request.adminNotes ?? "")) {
        await updateStatus({
          id: request._id,
          status,
          adminNotes: adminNotes || undefined,
        });
        // Notify on status change
        if (status !== request.status) {
          if (status === "completed") {
            fireNotification("consultation_completed", {
              requesterName: request.requesterName,
              requesterEmail: request.requesterEmail,
              expertArea: request.expertArea,
            });
          } else if (status !== "pending") {
            fireNotification("consultation_status_updated", {
              requesterName: request.requesterName,
              requesterEmail: request.requesterEmail,
              expertArea: request.expertArea,
              newStatus: status,
              adminNotes: adminNotes || undefined,
            });
          }
        }
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("admin.consultations.detail")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Requester info */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{request.requesterName}</span>
              <Badge variant="secondary" className={cn("text-[11px]", statusColors[request.status])}>
                {request.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{request.requesterEmail}</p>
            {request.requesterPhone && (
              <p className="text-sm text-muted-foreground">{request.requesterPhone}</p>
            )}
            <div className="flex gap-2 text-xs">
              <Badge variant="outline">{request.expertArea}</Badge>
              <Badge variant="outline">{request.urgency}</Badge>
              <Badge variant="outline">{request.preferredLanguage.toUpperCase()}</Badge>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs text-muted-foreground">{t("admin.consultations.description")}</Label>
            <p className="text-sm mt-1 leading-relaxed">{request.description}</p>
          </div>

          {/* Status */}
          <div>
            <Label>{t("admin.consultations.updateStatus")}</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
            >
              {allStatuses.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Assign expert */}
          <div>
            <Label>{t("admin.consultations.assignExpert")}</Label>
            <Input
              value={expertName}
              onChange={(e) => setExpertName(e.target.value)}
              placeholder="Expert name..."
              className="mt-1"
            />
          </div>

          {/* Admin notes */}
          <div>
            <Label>{t("admin.consultations.adminNotes")}</Label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Internal notes..."
              rows={3}
              className="mt-1"
            />
          </div>

          {/* Timestamps */}
          {request.respondedAt && (
            <p className="text-xs text-muted-foreground">
              Responded: {new Date(request.respondedAt).toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("admin.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t("admin.saving") : t("admin.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
