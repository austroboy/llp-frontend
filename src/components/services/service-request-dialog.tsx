"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useFormPrefill } from "@/hooks/use-form-prefill";
import { useAccountType } from "@/components/providers/account-context";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/hooks/use-language";
import { CheckCircle, Building2, ShieldAlert } from "lucide-react";

interface ServiceInfo {
  _id: Id<"serviceProducts">;
  title: string;
  titleBn?: string;
  category: string;
  price?: string;
  deliveryTimeline?: string;
  workflow?: string;
  paymentTerms?: string;
  notes?: string;
}

interface ServiceRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceInfo | null;
}

export function ServiceRequestDialog({
  open,
  onOpenChange,
  service,
}: ServiceRequestDialogProps) {
  const { t, language } = useLanguage();
  const { user, isLoaded: userLoaded } = useUser();
  const { isOrgUser, isLoaded: accountLoaded } = useAccountType();
  const { prefill, isLoaded: prefillLoaded } = useFormPrefill();
  const createRequest = useMutation(api.serviceRequests.create);

  // Org-only access. Once Clerk + account-context have loaded, decide which
  // gate (if any) the user hits before they can see the form.
  const authReady = userLoaded && accountLoaded;
  const isGuest = authReady && !user;
  const isIndividual = authReady && !!user && !isOrgUser;
  const isBlocked = authReady && !isOrgUser;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");

  useEffect(() => {
    if (!prefillLoaded) return;
    setName(prev => prev || prefill.fullName);
    setEmail(prev => prev || prefill.email);
    setPhone(prev => prev || prefill.phone);
    setCompany(prev => prev || prefill.company);
  }, [prefillLoaded, prefill.fullName, prefill.email, prefill.phone, prefill.company]);
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<"normal" | "urgent">("normal");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orderNum, setOrderNum] = useState("");
  const [copied, setCopied] = useState<"number" | "link" | null>(null);

  const handleSubmit = async () => {
    if (!name || !email || !description || !service) return;
    setSubmitting(true);
    try {
      const result = await createRequest({
        serviceProductId: service._id,
        serviceTitle: service.title,
        serviceCategory: service.category,
        servicePrice: service.price,
        serviceTimeline: service.deliveryTimeline,
        serviceWorkflow: service.workflow,
        requesterName: name,
        requesterEmail: email,
        requesterPhone: phone || undefined,
        requesterCompany: company || undefined,
        requesterClerkId: user?.id,
        description,
        urgency,
        preferredLanguage: language as "en" | "bn",
      });
      setSubmitted(true);
      setOrderNum(result.orderNumber);
      // Fire email notifications (non-blocking)
      fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "service_request_created",
          requesterName: name,
          requesterEmail: email,
          serviceTitle: service.title,
          serviceCategory: service.category,
          orderNumber: result.orderNumber,
          description,
        }),
      }).catch(() => {});
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setSubmitted(false);
      setName(prefill.fullName);
      setEmail(prefill.email);
      setPhone(prefill.phone);
      setCompany(prefill.company);
      setDescription("");
      setUrgency("normal");
    }, 200);
  };

  // Org-only gate — render BEFORE the success screen so guests/individuals
  // never see the form. Tracking flow (orderNumber, /track) is unchanged.
  if (open && isBlocked) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md text-center px-6 py-8">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
              {isGuest ? (
                <Building2 className="size-7 text-primary" />
              ) : (
                <ShieldAlert className="size-7 text-primary" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {isGuest ? "Organization sign-in required" : "Organization account required"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
                {isGuest
                  ? "LLP Services Desk requests are available to organization users only. Sign in with your organization account, or create one to continue."
                  : "Your account is registered as an Individual. LLP Services Desk requests are available to organization accounts only. Please sign in with an organization account, or create one to continue."}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              {isGuest ? (
                <>
                  <Button asChild className="rounded-full flex-1">
                    <Link href="/sign-up">Create Org Account</Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-full flex-1">
                    <Link href="/sign-in?redirect_url=%2Fservices%23services-list">Sign in</Link>
                  </Button>
                </>
              ) : (
                <Button asChild className="rounded-full w-full">
                  <Link href="/sign-up">Create Org Account</Link>
                </Button>
              )}
            </div>
            {isIndividual && (
              <p className="text-[11px] text-muted-foreground">
                Need help switching account types? Email{" "}
                <a href="mailto:support@laborlawpartner.com" className="text-primary hover:underline">
                  support@laborlawpartner.com
                </a>
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md text-center px-8">
          <div className="flex flex-col items-center text-center py-6 px-4">
            <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center mb-4">
              <CheckCircle className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-lg font-bold">{t("track.requestSubmitted")}</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-5">{t("track.teamWillReview")}</p>

            {/* Order Number Card */}
            <div className="w-full max-w-xs border-2 rounded-xl p-5 text-center mb-4">
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
                {t("track.yourOrderNumber")}
              </div>
              <div className="font-mono text-2xl font-extrabold tracking-wider">{orderNum}</div>
              <div className="flex gap-2 mt-3 justify-center">
                <Button
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(orderNum);
                    setCopied("number");
                    setTimeout(() => setCopied(null), 2000);
                  }}
                >
                  {copied === "number" ? t("track.copied") : t("track.copyOrderNumber")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/track/${orderNum}`);
                    setCopied("link");
                    setTimeout(() => setCopied(null), 2000);
                  }}
                >
                  {copied === "link" ? t("track.copied") : t("track.copyTrackingLink")}
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground max-w-xs">
              {t("track.saveOrderNumber")} <span className="text-primary font-medium">/track</span>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md sm:max-w-lg max-h-[80vh] flex flex-col !p-3 sm:!p-4 gap-2">
        <DialogHeader className="pb-0 space-y-0.5">
          <DialogTitle className="text-base">Request Service</DialogTitle>
          <DialogDescription className="text-xs">
            {service?.title ?? "Service request"}
            {service?.deliveryTimeline && <span className="ml-2 text-muted-foreground">· {service.deliveryTimeline}</span>}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-1">
          <div className="space-y-2.5 pb-1 px-1">

            {/* Client info */}
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label className="text-[11px]">Full Name <span className="text-destructive">*</span></Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-0.5 h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-[11px]">Email <span className="text-destructive">*</span></Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-0.5 h-8 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label className="text-[11px]">Phone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+880..."
                  className="mt-0.5 h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-[11px]">Company / Organization</Label>
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Company name"
                  className="mt-0.5 h-8 text-sm"
                />
              </div>
            </div>

            {/* Requirements */}
            <div>
              <Label className="text-[11px]">Requirements / Details <span className="text-destructive">*</span></Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you need — e.g., number of employees, type of entity, specific requirements, deadlines..."
                rows={2}
                className="mt-0.5 text-sm"
              />
            </div>

            {/* Urgency */}
            <div>
              <Label className="text-[11px]">Urgency</Label>
              <div className="flex gap-2 mt-0.5">
                {(["normal", "urgent"] as const).map((u) => (
                  <button
                    key={u}
                    onClick={() => setUrgency(u)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                      urgency === u
                        ? u === "urgent"
                          ? "border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {u === "normal" ? "Normal" : "Urgent"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-3 pt-2 border-t border-border shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !name || !email || !description}
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
