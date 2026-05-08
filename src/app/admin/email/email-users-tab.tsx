"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  RefreshCw,
  Trash2,
  RotateCcw,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  KeyRound,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmailUser {
  iamUser: string;
  email: string | null;
  accessKeyId: string | null;
  createdAt: string | null;
}

interface SmtpCredentials {
  iamUser: string;
  email: string | null;
  smtpUsername: string;
  smtpPassword: string;
  smtpServer: string;
  smtpPort: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmailUsersTab() {
  const [users, setUsers] = useState<EmailUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [creating, setCreating] = useState(false);

  // Credentials dialog (shown after create or rotate)
  const [credentials, setCredentials] = useState<SmtpCredentials | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Rotate dialog
  const [rotateTarget, setRotateTarget] = useState<EmailUser | null>(null);
  const [rotating, setRotating] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<EmailUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchUsers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch("/api/admin/email-users");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setUsers(data.users || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load users";
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleCreate = async () => {
    if (!createName || !createEmail) {
      toast.error("Name and email are required");
      return;
    }
    const email = createEmail.includes("@")
      ? createEmail
      : `${createEmail}@laborlawpartner.com`;

    setCreating(true);
    try {
      const res = await fetch("/api/admin/email-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName, email }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCredentials(data);
      setCreateOpen(false);
      setCreateName("");
      setCreateEmail("");
      fetchUsers(true);
      toast.success("Email user created");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create user";
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleRotate = async () => {
    if (!rotateTarget) return;
    setRotating(true);
    try {
      const res = await fetch("/api/admin/email-users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iamUser: rotateTarget.iamUser }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCredentials(data);
      setRotateTarget(null);
      fetchUsers(true);
      toast.success("Credentials rotated");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to rotate credentials";
      toast.error(msg);
    } finally {
      setRotating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/email-users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iamUser: deleteTarget.iamUser }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDeleteTarget(null);
      fetchUsers(true);
      toast.success("Email user deleted");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to delete user";
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const extractName = (iamUser: string): string => {
    const name = iamUser.replace("llp-smtp-", "");
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Manage SES SMTP users for @laborlawpartner.com
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchUsers(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 size-4" />
            Create User
          </Button>
        </div>
      </div>

      {/* Users table */}
      <div className="rounded-xl border border-border bg-card">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users className="mb-3 size-10 opacity-20" />
            <p className="text-sm">No SMTP users configured</p>
            <p className="text-xs mt-1">Create one to start sending email</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email Address</TableHead>
                <TableHead>SMTP Username</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-36">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.iamUser}>
                  <TableCell className="font-medium text-sm">
                    {extractName(user.iamUser)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {user.email || (
                      <span className="text-muted-foreground italic">No policy</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.accessKeyId ? (
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                        {user.accessKeyId}
                      </code>
                    ) : (
                      <span className="text-xs text-muted-foreground">No key</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="bg-emerald-500/10 text-emerald-600 text-[10px]"
                    >
                      Active
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        title="Copy SMTP settings"
                        onClick={() => {
                          const settings = [
                            `Server: email-smtp.us-east-1.amazonaws.com`,
                            `Port: 587`,
                            `Username: ${user.accessKeyId || "N/A"}`,
                            `From: ${user.email || "N/A"}`,
                          ].join("\n");
                          copyToClipboard(settings, `smtp-${user.iamUser}`);
                          toast.success("SMTP settings copied");
                        }}
                      >
                        {copiedField === `smtp-${user.iamUser}` ? (
                          <Check className="size-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        title="Rotate credentials"
                        onClick={() => setRotateTarget(user)}
                      >
                        <RotateCcw className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-destructive"
                        title="Delete user"
                        onClick={() => setDeleteTarget(user)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* === Create User Dialog === */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5" />
              Create Email User
            </DialogTitle>
            <DialogDescription>
              Create a new SMTP user locked to a specific @laborlawpartner.com address.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Name</label>
              <Input
                placeholder="e.g. rasel"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Alphanumeric and hyphens only. Used as IAM username suffix.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email Address</label>
              <div className="flex items-center gap-0">
                <Input
                  placeholder="info"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value.replace(/@/g, ""))}
                  className="rounded-r-none"
                />
                <span className="flex h-9 items-center rounded-r-md border border-l-0 border-border bg-muted px-3 text-sm text-muted-foreground whitespace-nowrap">
                  @laborlawpartner.com
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                {creating ? "Creating..." : "Create User"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* === Credentials Dialog (shown after create or rotate) === */}
      <Dialog open={!!credentials} onOpenChange={() => setCredentials(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5" />
              SMTP Credentials
            </DialogTitle>
            <DialogDescription className="flex items-start gap-2 pt-1">
              <AlertTriangle className="size-4 shrink-0 text-amber-500 mt-0.5" />
              <span>
                Save these credentials now. The SMTP password cannot be retrieved later.
              </span>
            </DialogDescription>
          </DialogHeader>
          {credentials && (
            <div className="space-y-3 pt-2">
              <CredentialRow
                label="IAM User"
                value={credentials.iamUser}
                copied={copiedField}
                onCopy={copyToClipboard}
              />
              <CredentialRow
                label="Email"
                value={credentials.email || ""}
                copied={copiedField}
                onCopy={copyToClipboard}
              />
              <CredentialRow
                label="SMTP Server"
                value={credentials.smtpServer}
                copied={copiedField}
                onCopy={copyToClipboard}
              />
              <CredentialRow
                label="SMTP Port"
                value={String(credentials.smtpPort)}
                copied={copiedField}
                onCopy={copyToClipboard}
              />
              <CredentialRow
                label="SMTP Username"
                value={credentials.smtpUsername}
                copied={copiedField}
                onCopy={copyToClipboard}
              />
              <CredentialRow
                label="SMTP Password"
                value={credentials.smtpPassword}
                copied={copiedField}
                onCopy={copyToClipboard}
                sensitive
              />
              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const all = [
                      `SMTP Server: ${credentials.smtpServer}`,
                      `SMTP Port: ${credentials.smtpPort}`,
                      `SMTP Username: ${credentials.smtpUsername}`,
                      `SMTP Password: ${credentials.smtpPassword}`,
                      `From: ${credentials.email}`,
                    ].join("\n");
                    copyToClipboard(all, "all");
                    toast.success("All credentials copied");
                  }}
                >
                  <Copy className="mr-1.5 size-4" />
                  Copy All
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* === Rotate Confirmation Dialog === */}
      <Dialog open={!!rotateTarget} onOpenChange={() => setRotateTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rotate Credentials</DialogTitle>
            <DialogDescription>
              This will invalidate the current SMTP credentials for{" "}
              <strong>{rotateTarget?.iamUser}</strong> and generate new ones.
              Any services using the old credentials will stop working.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setRotateTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleRotate} disabled={rotating}>
              {rotating && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              {rotating ? "Rotating..." : "Rotate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* === Delete Confirmation Dialog === */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Email User</DialogTitle>
            <DialogDescription>
              This will permanently delete the IAM user{" "}
              <strong>{deleteTarget?.iamUser}</strong>, its access keys, and
              SES sending policy. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Credential row helper
// ---------------------------------------------------------------------------

function CredentialRow({
  label,
  value,
  copied,
  onCopy,
  sensitive,
}: {
  label: string;
  value: string;
  copied: string | null;
  onCopy: (text: string, field: string) => void;
  sensitive?: boolean;
}) {
  const [revealed, setRevealed] = useState(!sensitive);
  const fieldKey = label.toLowerCase().replace(/\s/g, "-");

  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-sm text-muted-foreground">{label}</span>
      <div className="flex-1 min-w-0">
        <code className="block rounded bg-muted px-2.5 py-1.5 text-xs font-mono truncate">
          {sensitive && !revealed ? "••••••••••••••••••••" : value}
        </code>
      </div>
      {sensitive && (
        <Button
          size="sm"
          variant="ghost"
          className="shrink-0 h-7 px-2 text-xs"
          onClick={() => setRevealed(!revealed)}
        >
          {revealed ? "Hide" : "Show"}
        </Button>
      )}
      <Button
        size="icon"
        variant="ghost"
        className="size-7 shrink-0"
        onClick={() => onCopy(value, fieldKey)}
      >
        {copied === fieldKey ? (
          <Check className="size-3.5 text-emerald-500" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </Button>
    </div>
  );
}
