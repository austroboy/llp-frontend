"use client";

import { useState, useEffect } from "react";
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
import { Clock, Banknote, Eye, Trash2 } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  reviewed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  completed: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  cancelled: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
};

const allStatuses = ["pending", "reviewed", "in_progress", "completed", "cancelled"] as const;

const categoryLabels: Record<string, string> = {
  expatriate: "Expatriate & Visa",
  hr: "HR Services",
  licensing: "Licensing & Regulatory",
};

interface ServiceRequestDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: Doc<"serviceRequests">;
}

export function ServiceRequestDetailDialog({
  open,
  onOpenChange,
  request,
}: ServiceRequestDetailDialogProps) {
  const { t } = useLanguage();
  const updateStatus = useMutation(api.serviceRequests.updateStatus);
  const assignTo = useMutation(api.serviceRequests.assignTo);
  const addPublicNote = useMutation(api.serviceRequests.addPublicNote);
  const removePublicNote = useMutation(api.serviceRequests.removePublicNote);

  const [status, setStatus] = useState(request.status);
  const [adminNotes, setAdminNotes] = useState(request.adminNotes ?? "");
  const [assignedTo, setAssignedTo] = useState(request.assignedTo ?? "");
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Sync local state when Convex reactivity delivers fresh request data
  useEffect(() => {
    setStatus(request.status);
    setAdminNotes(request.adminNotes ?? "");
    setAssignedTo(request.assignedTo ?? "");
  }, [request._id, request.status, request.adminNotes, request.assignedTo]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (assignedTo && assignedTo !== request.assignedTo) {
        await assignTo({ id: request._id, assignedTo });
      }
      if (status !== request.status || adminNotes !== (request.adminNotes ?? "")) {
        await updateStatus({
          id: request._id,
          status,
          adminNotes: adminNotes || undefined,
        });
        // Notify requester on status change
        if (status !== request.status && status !== "pending") {
          fireNotification("service_status_updated", {
            requesterName: request.requesterName,
            requesterEmail: request.requesterEmail,
            serviceTitle: request.serviceTitle,
            orderNumber: request.orderNumber || undefined,
            newStatus: status,
            adminNotes: adminNotes || undefined,
          });
        }
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Service Request Detail</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {request.orderNumber && (
            <div className="font-mono text-lg font-extrabold">{request.orderNumber}</div>
          )}

          {/* Service info card */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold">{request.serviceTitle}</h4>
              <Badge variant="outline" className="text-[10px]">
                {categoryLabels[request.serviceCategory] ?? request.serviceCategory}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {request.serviceTimeline && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" />
                  {request.serviceTimeline}
                </span>
              )}
              {request.servicePrice && (
                <span className="inline-flex items-center gap-1">
                  <Banknote className="size-3" />
                  ৳{request.servicePrice}
                </span>
              )}
            </div>
            {request.serviceWorkflow && (
              <p className="text-[11px] text-muted-foreground/80">
                <span className="font-medium">Workflow:</span> {request.serviceWorkflow}
              </p>
            )}
          </div>

          {/* Requester info */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{request.requesterName}</span>
              <Badge variant="secondary" className={cn("text-[11px]", statusColors[request.status])}>
                {request.status.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{request.requesterEmail}</p>
            {request.requesterPhone && (
              <p className="text-sm text-muted-foreground">{request.requesterPhone}</p>
            )}
            {request.requesterCompany && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Company:</span> {request.requesterCompany}
              </p>
            )}
            <div className="flex gap-2 text-xs">
              <Badge variant="outline">{request.urgency}</Badge>
              <Badge variant="outline">{request.preferredLanguage.toUpperCase()}</Badge>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs text-muted-foreground">Requirements / Details</Label>
            <p className="text-sm mt-1 leading-relaxed">{request.description}</p>
          </div>

          {/* Status */}
          <div>
            <Label>Update Status</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
            >
              {allStatuses.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Assign to */}
          <div>
            <Label>Assigned To</Label>
            <Input
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="Team member name..."
              className="mt-1"
            />
          </div>

          {/* Admin notes */}
          <div>
            <Label>Admin Notes</Label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Internal notes..."
              rows={3}
              className="mt-1"
            />
          </div>

          {/* Client-Visible Updates */}
          <div className="border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4 bg-blue-50/50 dark:bg-blue-950/20">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
                {t("admin.services.publicNotes")}
              </span>
            </div>

            {/* Existing notes */}
            {(request.publicNotes && request.publicNotes.length > 0) && (
              <div className="space-y-2 mb-3">
                {[...request.publicNotes].reverse().map((note: { message: string; createdAt: number; createdBy: string }) => (
                  <div
                    key={note.createdAt}
                    className="p-2.5 bg-white dark:bg-background rounded-r-lg border-l-3 border-blue-300 dark:border-blue-700 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <span className="font-semibold">{note.message}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => removePublicNote({ id: request._id, createdAt: note.createdAt })}
                          className="text-muted-foreground/50 hover:text-red-500 transition-colors p-0.5"
                          title="Delete note"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add new note */}
            <div className="flex gap-2">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder={t("admin.services.addUpdatePlaceholder")}
                className="flex-1 min-h-[60px] bg-white dark:bg-background text-sm"
              />
              <Button
                size="sm"
                disabled={!newNote.trim() || addingNote}
                onClick={async () => {
                  setAddingNote(true);
                  try {
                    await addPublicNote({ id: request._id, message: newNote.trim() });
                    setNewNote("");
                  } finally {
                    setAddingNote(false);
                  }
                }}
              >
                {addingNote ? t("admin.saving") : t("admin.services.addUpdate")}
              </Button>
            </div>
          </div>

          {/* Timestamps */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Submitted: {new Date(request._creationTime).toLocaleString()}</p>
            {request.respondedAt && (
              <p>Responded: {new Date(request.respondedAt).toLocaleString()}</p>
            )}
          </div>
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
