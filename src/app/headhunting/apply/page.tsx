"use client";

import { useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  ArrowLeft,
} from "lucide-react";

function ApplyFormContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");

  const briefData = useQuery(
    api.headhunting.briefRelease.getByReferralCode,
    ref ? { code: ref } : "skip"
  );
  const openMandates = useQuery(
    api.headhunting.candidateApply.getOpenMandates,
    ref ? "skip" : {}
  );

  const generateUploadUrl = useMutation(api.headhunting.candidateApply.generateUploadUrl);
  const submitApplication = useMutation(api.headhunting.candidateApply.submitApplication);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    currentOrg: "",
    linkedIn: "",
    mandateId: "",
    consent: false,
  });

  const u = (field: keyof typeof form, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a PDF or DOCX file.");
      e.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB.");
      e.target.value = "";
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmit = async () => {
    setTriedSubmit(true);
    const missing: string[] = [];
    if (!form.fullName.trim()) missing.push("Full Name");
    if (!form.email.trim()) missing.push("Email");
    if (!selectedFile) missing.push("CV Upload");
    if (!ref && !form.mandateId) missing.push("Position");
    if (!form.consent) missing.push("Consent");
    if (missing.length > 0) {
      toast.error(`Please complete: ${missing.join(", ")}`);
      return;
    }

    setSubmitting(true);
    try {
      // Upload CV
      const uploadUrl = await generateUploadUrl();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile!.type },
        body: selectedFile,
      });
      if (!uploadResponse.ok) throw new Error("CV upload failed");
      const { storageId } = await uploadResponse.json();

      // Submit application
      await submitApplication({
        candidateName: form.fullName.trim(),
        candidateEmail: form.email.trim(),
        candidatePhone: form.phone.trim() || undefined,
        candidateCurrentOrg: form.currentOrg.trim() || undefined,
        candidateLinkedin: form.linkedIn.trim() || undefined,
        cvFileId: storageId,
        referralCode: ref || undefined,
        mandateId: (ref ? briefData?.mandate?._id : form.mandateId) as any,
        consentCapturedAt: Date.now(),
      });

      setSubmitted(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Submission failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center space-y-4">
        <CheckCircle2 className="size-12 mx-auto text-green-600" />
        <h1 className="text-xl font-bold">Application Submitted</h1>
        <p className="text-sm text-muted-foreground">
          Your application has been submitted successfully. We will review your
          profile and reach out if there is a match.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link href="/headhunting">
            <Button variant="outline">Back to Headhunting</Button>
          </Link>
        </div>
      </div>
    );
  }

  const blueprint = briefData?.blueprint;

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-12">
      <Link
        href="/headhunting"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Headhunting
      </Link>

      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium">
          <Briefcase className="size-3.5 text-primary" />
          Candidate Application
        </div>
        <h1 className="text-xl font-bold">Apply for a Position</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Submit your profile and CV to be considered for open roles through the
          LLP headhunting network.
        </p>
      </div>

      {/* Referral brief info */}
      {ref && blueprint && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-1">
          <p className="text-xs font-medium text-primary">Applying for:</p>
          <h3 className="text-sm font-semibold">{blueprint.title}</h3>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {blueprint.function && <span>{blueprint.function}</span>}
            {blueprint.seniority && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                {blueprint.seniority}
              </span>
            )}
            {blueprint.location && <span>{blueprint.location}</span>}
          </div>
        </div>
      )}

      {ref && !briefData && briefData !== null && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Loading brief details...
        </div>
      )}

      {ref && briefData === null && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 flex items-start gap-2">
          <AlertCircle className="size-4 text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">
            Invalid or expired referral code. You can still apply below by
            selecting an open position.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Full Name *</Label>
            <Input
              value={form.fullName}
              onChange={(e) => u("fullName", e.target.value)}
              placeholder="Your full name"
              className={cn(
                "text-sm",
                triedSubmit &&
                  !form.fullName.trim() &&
                  "border-red-500 ring-1 ring-red-500"
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email *</Label>
            <Input
              value={form.email}
              onChange={(e) => u("email", e.target.value)}
              type="email"
              placeholder="your@email.com"
              className={cn(
                "text-sm",
                triedSubmit &&
                  !form.email.trim() &&
                  "border-red-500 ring-1 ring-red-500"
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) => u("phone", e.target.value)}
              type="tel"
              placeholder="+880..."
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Current Company / Organization</Label>
            <Input
              value={form.currentOrg}
              onChange={(e) => u("currentOrg", e.target.value)}
              placeholder="Your current employer"
              className="text-sm"
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs">LinkedIn Profile</Label>
            <Input
              value={form.linkedIn}
              onChange={(e) => u("linkedIn", e.target.value)}
              type="url"
              placeholder="https://linkedin.com/in/..."
              className="text-sm"
            />
          </div>
        </div>

        {/* Mandate selector — only when no referral code */}
        {(!ref || briefData === null) && (
          <div className="space-y-1.5">
            <Label className="text-xs">Position *</Label>
            {!openMandates ? (
              <p className="text-xs text-muted-foreground">
                Loading available positions...
              </p>
            ) : openMandates.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No open positions at the moment. Check back soon.
              </p>
            ) : (
              <Select
                value={form.mandateId}
                onValueChange={(v) => u("mandateId", v)}
              >
                <SelectTrigger
                  className={cn(
                    "text-sm h-9",
                    triedSubmit &&
                      !form.mandateId &&
                      "border-red-500 ring-1 ring-red-500"
                  )}
                >
                  <SelectValue placeholder="Select a position" />
                </SelectTrigger>
                <SelectContent>
                  {openMandates.map((m) => (
                    <SelectItem key={m.mandateId} value={m.mandateId} className="text-sm">
                      {m.title}
                      {m.location ? ` — ${m.location}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* CV Upload */}
        <div className="space-y-1.5">
          <Label className="text-xs">CV Upload * (PDF or DOCX, max 10MB)</Label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex items-center gap-3 rounded-lg border border-dashed border-border p-4 cursor-pointer hover:border-primary/40 transition-colors",
              triedSubmit &&
                !selectedFile &&
                "border-red-500 ring-1 ring-red-500",
              selectedFile && "border-green-500 bg-green-50/50 dark:bg-green-900/10"
            )}
          >
            {selectedFile ? (
              <>
                <FileText className="size-5 text-green-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <CheckCircle2 className="size-4 text-green-600 shrink-0" />
              </>
            ) : (
              <>
                <Upload className="size-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Click to upload your CV
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    PDF or DOCX, max 10MB
                  </p>
                </div>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Consent */}
        <label
          className={cn(
            "flex items-start gap-2 cursor-pointer rounded-lg border border-border p-3",
            triedSubmit &&
              !form.consent &&
              "border-red-500 ring-1 ring-red-500"
          )}
        >
          <input
            type="checkbox"
            checked={form.consent}
            onChange={(e) => u("consent", e.target.checked)}
            className="mt-0.5 accent-primary"
          />
          <span className="text-xs text-muted-foreground leading-relaxed">
            I consent to my information being processed for this recruitment
            opportunity. My data will be handled in accordance with applicable
            privacy regulations.
          </span>
        </label>

        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full gap-1.5"
        >
          <FileText className="size-3.5" />
          {submitting ? "Submitting..." : "Submit Application"}
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-primary hover:underline">
          Sign in
        </Link>{" "}
        to manage your applications.
      </p>
    </div>
  );
}

export default function ApplyPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteTopNav />
      <Suspense
        fallback={
          <div className="py-24 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        }
      >
        <ApplyFormContent />
      </Suspense>
      <HomepageFooter />
    </div>
  );
}
