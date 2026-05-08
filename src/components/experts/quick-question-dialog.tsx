"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useFormPrefill } from "@/hooks/use-form-prefill";
import { api } from "@convex/_generated/api";
import { useLanguage } from "@/hooks/use-language";
import { Id } from "@convex/_generated/dataModel";
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
import { CheckCircle } from "lucide-react";

interface QuickQuestionDialogProps {
  expertId: Id<"experts">;
  expertName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickQuestionDialog({
  expertId,
  expertName,
  open,
  onOpenChange,
}: QuickQuestionDialogProps) {
  const { t } = useLanguage();
  const { user } = useUser();
  const { prefill, isLoaded: prefillLoaded } = useFormPrefill();
  const createQuestion = useMutation(api.quickQuestions.create);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!prefillLoaded) return;
    setName(prev => prev || prefill.fullName);
    setEmail(prev => prev || prefill.email);
  }, [prefillLoaded, prefill.fullName, prefill.email]);
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!name || !email || !question) return;
    setSubmitting(true);
    setError("");
    try {
      await createQuestion({
        expertId,
        askerName: name,
        askerEmail: email,
        askerClerkId: user?.id,
        question,
      });
      setSubmitted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send question");
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
      setQuestion("");
      setError("");
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
              {t("experts.quickQuestion.sent")}
            </h3>
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("experts.quickQuestion.title")} — {expertName}
          </DialogTitle>
          <DialogDescription>
            {t("experts.quickQuestion.desc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>{t("experts.quickQuestion.name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label>{t("experts.quickQuestion.email")}</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label>{t("experts.quickQuestion.question")}</Label>
            <Textarea
              value={question}
              onChange={(e) =>
                setQuestion(e.target.value.slice(0, 200))
              }
              rows={4}
              className="mt-1"
              maxLength={200}
            />
            <p className="mt-1 text-xs text-muted-foreground text-right">
              {question.length}/200
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">
              {error.includes("Rate limit") || error.includes("maximum 3")
                ? t("experts.quickQuestion.limit")
                : error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("admin.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !name || !email || !question}
          >
            {submitting ? t("admin.saving") : t("experts.quickQuestion.send")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
