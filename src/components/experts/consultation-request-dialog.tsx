"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useFormPrefill } from "@/hooks/use-form-prefill";
import { api } from "@convex/_generated/api";
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
import { useLanguage } from "@/hooks/use-language";
import { CheckCircle } from "lucide-react";
import { Id } from "@convex/_generated/dataModel";
import { track } from "@/lib/posthog/events";

interface ConsultationRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expertId?: Id<"experts">;
  expertName?: string;
}

export function ConsultationRequestDialog({
  open,
  onOpenChange,
  expertId,
  expertName,
}: ConsultationRequestDialogProps) {
  const { t, language } = useLanguage();
  const { user } = useUser();
  const { prefill, isLoaded: prefillLoaded } = useFormPrefill();
  const createRequest = useMutation(api.consultationRequests.create);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!prefillLoaded) return;
    setName(prev => prev || prefill.fullName);
    setEmail(prev => prev || prefill.email);
    setPhone(prev => prev || prefill.phone);
  }, [prefillLoaded, prefill.fullName, prefill.email, prefill.phone]);
  const [expertArea, setExpertArea] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<"normal" | "urgent">("normal");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!name || !email || !expertArea || !description) return;
    setSubmitting(true);
    try {
      await createRequest({
        requesterName: name,
        requesterEmail: email,
        requesterPhone: phone || undefined,
        requesterClerkId: user?.id,
        expertArea,
        description,
        urgency,
        preferredLanguage: language as "en" | "bn",
        expertId,
      });
      // PostHog: booking-form submit. expert_id is optional — the
      // dialog also opens from the marketplace landing CTA where no
      // specific expert is chosen, so we emit an empty string.
      void track("expert_application_submitted", {
        expert_id: typeof expertId === "string" ? expertId : "",
      });
      setSubmitted(true);
      // Fire email notifications (non-blocking)
      fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "consultation_created",
          requesterName: name,
          requesterEmail: email,
          expertArea,
          urgency,
          description,
        }),
      }).catch(() => {});
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form after close animation
    setTimeout(() => {
      setSubmitted(false);
      setName(prefill.fullName);
      setEmail(prefill.email);
      setPhone("");
      setExpertArea("");
      setDescription("");
      setUrgency("normal");
    }, 200);
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md text-center">
          <div className="py-6">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary mx-auto mb-4">
              <CheckCircle className="size-8" />
            </div>
            <h3 className="text-lg font-semibold">
              {t("experts.consultation.successTitle")}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("experts.consultation.successDesc")}
            </p>
            <Button onClick={handleClose} className="rounded-full mt-6">
              {t("experts.consultation.close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("experts.consultation.title")}</DialogTitle>
          <DialogDescription>
            {expertName
              ? `${t("experts.consultation.subtitle")} — ${expertName}`
              : t("experts.consultation.subtitle")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>{t("experts.consultation.name")}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>{t("experts.consultation.email")}</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>{t("experts.consultation.phone")}</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+880..."
                className="mt-1"
              />
            </div>
            <div>
              <Label>{t("experts.consultation.area")}</Label>
              <select
                value={expertArea}
                onChange={(e) => setExpertArea(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
              >
                <option value="">{t("experts.consultation.selectArea")}</option>
                <option value="PF & Gratuity">PF & Gratuity</option>
                <option value="Compliance">Compliance</option>
                <option value="HR Policy">HR Policy</option>
                <option value="Labour Law">Labour Law</option>
                <option value="Settlement">Settlement</option>
                <option value="OSH & Safety">OSH & Safety</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <Label>{t("experts.consultation.description")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("experts.consultation.descPlaceholder")}
              rows={4}
              className="mt-1"
            />
          </div>

          <div>
            <Label>{t("experts.consultation.urgency")}</Label>
            <div className="flex gap-3 mt-1">
              {(["normal", "urgent"] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setUrgency(u)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
                    urgency === u
                      ? u === "urgent"
                        ? "border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t(`experts.consultation.${u}`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("admin.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !name || !email || !expertArea || !description}
          >
            {submitting ? t("admin.saving") : t("experts.consultation.submit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
