"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Send,
  Eye,
  ArrowLeft,
  Loader2,
  FileText,
  Clock,
  CheckCircle2,
  Users,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { sanitize, emailSchema } from "@/lib/sanitize-html";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Campaign {
  id: string;
  subject: string;
  status: "draft" | "sending" | "sent" | "failed";
  from_address: string;
  recipient_segment: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  sent_at: string | null;
  html_content: string;
}

interface SubscriberStats {
  total: number;
  active: number;
  bySource: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CampaignsTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SubscriberStats | null>(null);

  // Compose view
  const [composing, setComposing] = useState(false);
  const [fromAddress, setFromAddress] = useState("info@laborlawpartner.com");
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [recipientSegment, setRecipientSegment] = useState("all_active");
  const [sending, setSending] = useState(false);

  // Detail view
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // Confirm send dialog
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch campaigns list and subscriber stats in parallel
      const [campaignsRes, subscribersRes] = await Promise.all([
        fetch("/api/admin/campaigns"),
        fetch("/api/admin/subscribers?limit=1"),
      ]);

      const campaignsData = await campaignsRes.json();
      const subscribersData = await subscribersRes.json();

      // campaigns endpoint may not exist yet — gracefully handle
      if (campaignsRes.ok && !campaignsData.error) {
        setCampaigns(campaignsData.campaigns || []);
      }

      if (subscribersRes.ok && subscribersData.stats) {
        setStats(subscribersData.stats);
      }
    } catch {
      // Silently fail — the campaigns endpoint might not be built yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleSend = async () => {
    if (!subject || !htmlContent) {
      toast.error("Subject and content are required");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/campaigns/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: fromAddress,
          subject,
          htmlContent,
          recipientSegment,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(
        `Campaign queued: sending to ${data.recipientCount || "?"} subscribers`
      );
      setConfirmOpen(false);
      setComposing(false);
      resetCompose();
      fetchCampaigns();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to send campaign";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const resetCompose = () => {
    setSubject("");
    setHtmlContent("");
    setFromAddress("info@laborlawpartner.com");
    setRecipientSegment("all_active");
    setPreviewMode(false);
  };

  const getEstimatedRecipients = (): number => {
    if (!stats) return 0;
    if (recipientSegment === "all_active") return stats.active;
    // For source-based segments, look up count
    if (recipientSegment.startsWith("source:")) {
      const source = recipientSegment.replace("source:", "");
      return stats.bySource[source] || 0;
    }
    return stats.active;
  };

  const statusConfig: Record<string, { icon: typeof Clock; color: string; label: string }> = {
    draft: { icon: FileText, color: "bg-gray-500/10 text-gray-600", label: "Draft" },
    sending: { icon: Loader2, color: "bg-blue-500/10 text-blue-600", label: "Sending" },
    sent: { icon: CheckCircle2, color: "bg-emerald-500/10 text-emerald-600", label: "Sent" },
    failed: { icon: AlertCircle, color: "bg-red-500/10 text-red-600", label: "Failed" },
  };

  // ---------------------------------------------------------------------------
  // Detail View
  // ---------------------------------------------------------------------------

  if (selectedCampaign) {
    const cfg = statusConfig[selectedCampaign.status] || statusConfig.draft;
    const StatusIcon = cfg.icon;

    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedCampaign(null)}
        >
          <ArrowLeft className="mr-1.5 size-4" />
          Back to Campaigns
        </Button>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold">{selectedCampaign.subject}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                From: {selectedCampaign.from_address}
              </p>
            </div>
            <Badge variant="secondary" className={`${cfg.color} text-[10px]`}>
              <StatusIcon className="mr-1 size-3" />
              {cfg.label}
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border p-3">
              <p className="text-[11px] text-muted-foreground">Recipients</p>
              <p className="text-lg font-semibold">{selectedCampaign.recipient_count}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-[11px] text-muted-foreground">Sent</p>
              <p className="text-lg font-semibold text-emerald-600">{selectedCampaign.sent_count}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-[11px] text-muted-foreground">Failed</p>
              <p className="text-lg font-semibold text-red-600">{selectedCampaign.failed_count}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-[11px] text-muted-foreground">Sent At</p>
              <p className="text-sm font-medium">
                {selectedCampaign.sent_at
                  ? new Date(selectedCampaign.sent_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "—"}
              </p>
            </div>
          </div>

          {selectedCampaign.html_content && (
            <div>
              <p className="text-sm font-medium mb-2">Content Preview</p>
              <div
                className="rounded-lg border border-border bg-white dark:bg-zinc-950 p-4 prose prose-sm dark:prose-invert max-w-none"
                // H-2: campaign HTML sanitized via sanitize-html.
                dangerouslySetInnerHTML={{ __html: sanitize(selectedCampaign.html_content, emailSchema) }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Compose View
  // ---------------------------------------------------------------------------

  if (composing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setComposing(false);
              resetCompose();
            }}
          >
            <ArrowLeft className="mr-1.5 size-4" />
            Back
          </Button>
          <h3 className="text-sm font-semibold">New Campaign</h3>
          <div />
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="grid grid-cols-[100px_1fr] items-center gap-3">
            <label className="text-sm text-muted-foreground">From:</label>
            <Select value={fromAddress} onValueChange={setFromAddress}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info@laborlawpartner.com">
                  info@laborlawpartner.com
                </SelectItem>
                <SelectItem value="noreply@laborlawpartner.com">
                  noreply@laborlawpartner.com
                </SelectItem>
                <SelectItem value="newsletter@laborlawpartner.com">
                  newsletter@laborlawpartner.com
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-[100px_1fr] items-center gap-3">
            <label className="text-sm text-muted-foreground">Subject:</label>
            <Input
              placeholder="Campaign subject line"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-[100px_1fr] items-center gap-3">
            <label className="text-sm text-muted-foreground">Recipients:</label>
            <div className="flex items-center gap-3">
              <Select value={recipientSegment} onValueChange={setRecipientSegment}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_active">All active subscribers</SelectItem>
                  {stats?.bySource &&
                    Object.keys(stats.bySource).map((source) => (
                      <SelectItem key={source} value={`source:${source}`}>
                        Source: {source.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Badge variant="secondary" className="shrink-0 text-xs">
                <Users className="mr-1 size-3" />
                ~{getEstimatedRecipients()} recipients
              </Badge>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-muted-foreground">
                Content (HTML)
              </label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPreviewMode(!previewMode)}
              >
                <Eye className="mr-1.5 size-4" />
                {previewMode ? "Edit" : "Preview"}
              </Button>
            </div>
            {previewMode ? (
              <div
                className="min-h-[300px] rounded-lg border border-border bg-white dark:bg-zinc-950 p-4 prose prose-sm dark:prose-invert max-w-none"
                // H-2: campaign HTML sanitized via sanitize-html.
                dangerouslySetInnerHTML={{
                  __html: sanitize(htmlContent || "<p>No content yet</p>", emailSchema),
                }}
              />
            ) : (
              <Textarea
                placeholder="<h1>Hello!</h1><p>Your email content here...</p>"
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                rows={16}
                className="font-mono text-sm"
              />
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setComposing(false);
                resetCompose();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!subject || !htmlContent}
            >
              <Send className="mr-1.5 size-4" />
              Send Now
            </Button>
          </div>
        </div>

        {/* Confirm send dialog */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Confirm Send</DialogTitle>
              <DialogDescription>
                This will send &ldquo;{subject}&rdquo; to approximately{" "}
                <strong>{getEstimatedRecipients()}</strong> subscribers. This
                action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSend} disabled={sending}>
                {sending ? (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <Send className="mr-1.5 size-4" />
                )}
                {sending ? "Sending..." : "Send"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Campaign List View
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={() => setComposing(true)}>
          <Plus className="mr-1.5 size-4" />
          New Campaign
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Send className="mb-3 size-10 opacity-20" />
            <p className="text-sm">No campaigns yet</p>
            <p className="text-xs mt-1">
              Create a campaign to send bulk emails to your subscribers
            </p>
            <Button
              size="sm"
              className="mt-4"
              onClick={() => setComposing(true)}
            >
              <Plus className="mr-1.5 size-4" />
              Create First Campaign
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Recipients</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => {
                const cfg = statusConfig[campaign.status] || statusConfig.draft;
                const StatusIcon = cfg.icon;
                return (
                  <TableRow
                    key={campaign.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedCampaign(campaign)}
                  >
                    <TableCell className="font-medium text-sm">
                      {campaign.subject}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`${cfg.color} text-[10px]`}
                      >
                        <StatusIcon
                          className={`mr-1 size-3 ${campaign.status === "sending" ? "animate-spin" : ""}`}
                        />
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {campaign.recipient_count}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {campaign.sent_count}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(campaign.sent_at || campaign.created_at).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
