"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  RefreshCw,
  Trash2,
  Pencil,
  Loader2,
  GitBranch,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Power,
  PowerOff,
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

interface RoutingRule {
  id: string;
  name: string | null;
  customAddress: string | null;
  destination: string | null;
  enabled: boolean;
}

interface DestinationAddress {
  id: string;
  email: string;
  verified: boolean;
  verifiedAt: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmailRoutingTab() {
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [destinations, setDestinations] = useState<DestinationAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create rule dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createPrefix, setCreatePrefix] = useState("");
  const [createDestination, setCreateDestination] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit rule dialog
  const [editTarget, setEditTarget] = useState<RoutingRule | null>(null);
  const [editDestination, setEditDestination] = useState("");
  const [editing, setEditing] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<RoutingRule | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toggle enable/disable
  const [toggling, setToggling] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch("/api/admin/email-routing");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRules(data.rules || []);
      setDestinations(data.destinations || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load routing data";
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleCreate = async () => {
    if (!createPrefix || !createDestination) {
      toast.error("Custom address and destination are required");
      return;
    }
    const customAddress = createPrefix.includes("@")
      ? createPrefix
      : `${createPrefix}@laborlawpartner.com`;

    setCreating(true);
    try {
      const res = await fetch("/api/admin/email-routing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customAddress, destination: createDestination }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (!data.destinationVerified) {
        toast.success("Rule created. A verification email was sent to the destination.");
      } else {
        toast.success("Routing rule created");
      }

      setCreateOpen(false);
      setCreatePrefix("");
      setCreateDestination("");
      fetchData(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create rule";
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async () => {
    if (!editTarget || !editDestination) return;
    setEditing(true);
    try {
      const res = await fetch("/api/admin/email-routing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ruleId: editTarget.id,
          destination: editDestination,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEditTarget(null);
      fetchData(true);
      toast.success("Routing rule updated");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to update rule";
      toast.error(msg);
    } finally {
      setEditing(false);
    }
  };

  const handleToggle = async (rule: RoutingRule) => {
    setToggling(rule.id);
    try {
      const res = await fetch("/api/admin/email-routing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleId: rule.id, enabled: !rule.enabled }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      fetchData(true);
      toast.success(rule.enabled ? "Rule disabled" : "Rule enabled");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to toggle rule";
      toast.error(msg);
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/email-routing", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleId: deleteTarget.id }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDeleteTarget(null);
      fetchData(true);
      toast.success("Routing rule deleted");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to delete rule";
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* === Routing Rules Section === */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Routing Rules</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Forward @laborlawpartner.com addresses to external mailboxes via Cloudflare
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fetchData(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 size-4" />
              Add Rule
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card">
          {rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <GitBranch className="mb-3 size-10 opacity-20" />
              <p className="text-sm">No routing rules configured</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Custom Address</TableHead>
                  <TableHead className="w-8" />
                  <TableHead>Destination</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium text-sm">
                      {rule.customAddress === "*catch-all*" ? (
                        <Badge variant="secondary" className="text-xs">
                          Catch-all (*)
                        </Badge>
                      ) : (
                        <code className="text-xs">{rule.customAddress}</code>
                      )}
                    </TableCell>
                    <TableCell>
                      <ArrowRight className="size-3.5 text-muted-foreground" />
                    </TableCell>
                    <TableCell className="text-sm">{rule.destination}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          rule.enabled
                            ? "bg-emerald-500/10 text-emerald-600 text-[10px]"
                            : "bg-gray-100 text-gray-500 text-[10px] dark:bg-gray-800 dark:text-gray-400"
                        }
                      >
                        {rule.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          title={rule.enabled ? "Disable" : "Enable"}
                          disabled={toggling === rule.id}
                          onClick={() => handleToggle(rule)}
                        >
                          {toggling === rule.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : rule.enabled ? (
                            <PowerOff className="size-3.5" />
                          ) : (
                            <Power className="size-3.5" />
                          )}
                        </Button>
                        {rule.customAddress !== "*catch-all*" && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              title="Edit destination"
                              onClick={() => {
                                setEditTarget(rule);
                                setEditDestination(rule.destination || "");
                              }}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 text-destructive"
                              title="Delete rule"
                              onClick={() => setDeleteTarget(rule)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>

      {/* === Destination Addresses Section === */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Destination Addresses</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            External addresses that have been registered as routing destinations
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card">
          {destinations.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No destination addresses registered
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Verification Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {destinations.map((dest) => (
                  <TableRow key={dest.id}>
                    <TableCell className="text-sm">{dest.email}</TableCell>
                    <TableCell>
                      {dest.verified ? (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-500/10 text-emerald-600 text-[10px]"
                        >
                          <CheckCircle2 className="mr-1 size-3" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-amber-500/10 text-amber-600 text-[10px]"
                        >
                          <Clock className="mr-1 size-3" />
                          Pending verification
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>

      {/* === Create Rule Dialog === */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5" />
              Add Routing Rule
            </DialogTitle>
            <DialogDescription>
              Forward emails sent to a @laborlawpartner.com address to an external mailbox.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Custom Address</label>
              <div className="flex items-center gap-0">
                <Input
                  placeholder="support"
                  value={createPrefix}
                  onChange={(e) => setCreatePrefix(e.target.value.replace(/@/g, ""))}
                  className="rounded-r-none"
                />
                <span className="flex h-9 items-center rounded-r-md border border-l-0 border-border bg-muted px-3 text-sm text-muted-foreground whitespace-nowrap">
                  @laborlawpartner.com
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Destination Email</label>
              <Input
                placeholder="user@gmail.com"
                value={createDestination}
                onChange={(e) => setCreateDestination(e.target.value)}
              />
              {createDestination &&
                !destinations.some(
                  (d) => d.email === createDestination && d.verified
                ) && (
                  <div className="flex items-start gap-2 mt-2 p-2 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                    <p className="text-xs">
                      This destination is not yet verified. A verification email will
                      be sent when the rule is created.
                    </p>
                  </div>
                )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                {creating ? "Creating..." : "Create Rule"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* === Edit Rule Dialog === */}
      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Routing Rule</DialogTitle>
            <DialogDescription>
              Change the destination for{" "}
              <strong>{editTarget?.customAddress}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Destination Email</label>
              <Input
                placeholder="user@gmail.com"
                value={editDestination}
                onChange={(e) => setEditDestination(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditTarget(null)}>
                Cancel
              </Button>
              <Button onClick={handleEdit} disabled={editing}>
                {editing && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                {editing ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* === Delete Confirmation Dialog === */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Routing Rule</DialogTitle>
            <DialogDescription>
              Delete the routing rule for{" "}
              <strong>{deleteTarget?.customAddress}</strong>? Emails to this
              address will no longer be forwarded.
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
