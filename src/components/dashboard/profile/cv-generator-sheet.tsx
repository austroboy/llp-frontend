"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { pdf } from "@react-pdf/renderer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import { toast } from "sonner";
import { fireNotification } from "@/lib/notify";
import { track } from "@/lib/posthog/events";
import {
  Sparkles,
  SkipForward,
  Loader2,
  Download,
  Save,
  AlertCircle,
  Check,
  X,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  UserCheck,
  FileText,
} from "lucide-react";
import type {
  CvTemplateProps,
  CvTemplateName,
  CvTemplateCategory,
  EnhancedProfile,
} from "./cv-templates/types";
import {
  TEMPLATE_REGISTRY,
  TEMPLATE_CATEGORIES,
  getDefaultAccent,
} from "./cv-templates/registry";
import { AccentColorPicker } from "@/components/ui/accent-color-picker";
import { CvTemplateThumbnail } from "./cv-templates/thumbnail";
import { renderTemplate } from "./cv-templates/render";
import { usePdfPreview } from "@/hooks/use-pdf-preview";
import type { Id } from "@convex/_generated/dataModel";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProfileData {
  fullName: string;
  email: string;
  phone?: string;
  headline: string;
  bio?: string;
  city: string;
  country?: string;
  linkedin?: string;
  portfolio?: string;
  photo?: string;
  photoUrl?: string;
  experiences: Array<{
    title: string;
    company: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    isCurrent: boolean;
    description?: string;
  }>;
  skills: Array<{ name: string; yearsOfExperience?: number }>;
  education: Array<{
    degree: string;
    institution: string;
    fieldOfStudy?: string;
    year?: string;
  }>;
  certifications: Array<{ name: string; org?: string; year?: string }>;
  languages?: Array<{ name: string; proficiency?: string }>;
}

interface CvGeneratorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ProfileData;
}

type Step = 1 | 2 | 3 | 4;

// A diff section represents one reviewable chunk
interface DiffSection {
  id: string;
  label: string;
  originalText: string;
  enhancedText: string;
}

type SectionDecision = "pending" | "accepted" | "rejected";

// Template registry is now in cv-templates/registry.ts

// ---------------------------------------------------------------------------
// Build diff sections from profile + enhanced data
// ---------------------------------------------------------------------------

function buildDiffSections(
  profile: ProfileData,
  enhanced: EnhancedProfile,
  t: (key: string) => string
): DiffSection[] {
  const sections: DiffSection[] = [];

  // Summary / Bio
  sections.push({
    id: "summary",
    label: t("cv.generator.diffSummary"),
    originalText: profile.bio || t("cv.generator.diffNoContent"),
    enhancedText: enhanced.summary || enhanced.enhancedBio || "",
  });

  // Experiences
  enhanced.enhancedExperiences.forEach((exp, i) => {
    const original = profile.experiences[i];
    sections.push({
      id: `exp-${i}`,
      label: `${t("cv.generator.diffExperience")}: ${exp.title} @ ${exp.company}`,
      originalText: original?.description || t("cv.generator.diffNoContent"),
      enhancedText: exp.description || "",
    });
  });

  // Skills
  const originalSkills = profile.skills
    .map((s) => s.name + (s.yearsOfExperience ? ` (${s.yearsOfExperience}y)` : ""))
    .join(", ");
  const enhancedSkills = enhanced.enhancedSkills
    .map((s) => s.name + (s.yearsOfExperience ? ` (${s.yearsOfExperience}y)` : ""))
    .join(", ");

  if (enhancedSkills !== originalSkills) {
    sections.push({
      id: "skills",
      label: t("cv.generator.diffSkills"),
      originalText: originalSkills || t("cv.generator.diffNoContent"),
      enhancedText: enhancedSkills,
    });
  }

  return sections;
}

// ---------------------------------------------------------------------------
// Build final EnhancedProfile from decisions
// ---------------------------------------------------------------------------

function buildApprovedEnhancement(
  profile: ProfileData,
  rawEnhanced: EnhancedProfile,
  decisions: Record<string, SectionDecision>
): EnhancedProfile {
  const summaryAccepted = decisions["summary"] === "accepted";

  const enhancedExperiences = rawEnhanced.enhancedExperiences.map((exp, i) => {
    const accepted = decisions[`exp-${i}`] === "accepted";
    if (accepted) return exp;
    const original = profile.experiences[i];
    return {
      ...exp,
      description: original?.description || "",
    };
  });

  const skillsAccepted = decisions["skills"] === "accepted";

  return {
    summary: summaryAccepted
      ? rawEnhanced.summary
      : profile.bio || "",
    enhancedBio: summaryAccepted
      ? rawEnhanced.enhancedBio
      : profile.bio || "",
    enhancedExperiences,
    enhancedSkills: skillsAccepted
      ? rawEnhanced.enhancedSkills
      : profile.skills,
  };
}

// ---------------------------------------------------------------------------
// Section Diff Card
// ---------------------------------------------------------------------------

function SectionDiffCard({
  section,
  decision,
  onAccept,
  onReject,
  visible,
  index,
  t,
}: {
  section: DiffSection;
  decision: SectionDecision;
  onAccept: () => void;
  onReject: () => void;
  visible: boolean;
  index: number;
  t: (key: string) => string;
}) {
  const borderColor =
    decision === "accepted"
      ? "border-l-emerald-500"
      : decision === "rejected"
        ? "border-l-rose-500"
        : "border-l-primary";

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card overflow-hidden transition-all duration-500 border-l-[3px]",
        borderColor,
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none h-0 !m-0 !p-0 !border-0"
      )}
      style={{
        transitionDelay: visible ? `${index * 150}ms` : "0ms",
      }}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">
            {section.label}
          </span>
        </div>
        {decision !== "pending" && (
          <span
            className={cn(
              "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
              decision === "accepted"
                ? "bg-emerald-500/15 text-emerald-500"
                : "bg-rose-500/15 text-rose-500"
            )}
          >
            {decision === "accepted"
              ? t("cv.generator.diffAccepted")
              : t("cv.generator.diffRejected")}
          </span>
        )}
      </div>

      {/* Diff body */}
      <div className="p-4 space-y-3">
        {/* Original */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="h-2 w-2 rounded-full bg-rose-500/60" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("cv.generator.diffOriginal")}
            </span>
          </div>
          <div className="rounded-md bg-rose-500/5 border border-rose-500/10 px-3 py-2.5">
            <p className="text-xs leading-relaxed text-muted-foreground line-through decoration-rose-500/30">
              {section.originalText}
            </p>
          </div>
        </div>

        {/* Enhanced */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-500/60" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("cv.generator.diffEnhanced")}
            </span>
          </div>
          <div className="rounded-md bg-emerald-500/5 border border-emerald-500/10 px-3 py-2.5">
            <p className="text-xs leading-relaxed text-foreground">
              {section.enhancedText}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t border-border bg-muted/20">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReject}
          disabled={decision !== "pending"}
          className={cn(
            "gap-1.5 text-xs h-7",
            decision === "rejected" &&
              "border-rose-500/50 bg-rose-500/10 text-rose-500"
          )}
        >
          <X className="h-3 w-3" />
          {t("cv.generator.diffReject")}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onAccept}
          disabled={decision !== "pending"}
          className={cn(
            "gap-1.5 text-xs h-7",
            decision === "accepted"
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : ""
          )}
        >
          <Check className="h-3 w-3" />
          {t("cv.generator.diffAccept")}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildTemplateProps(
  profile: ProfileData,
  enhanced: EnhancedProfile | null,
  photoUrl?: string | null,
  accentColor?: string
): CvTemplateProps {
  return {
    profile: {
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      headline: profile.headline,
      city: profile.city,
      country: profile.country,
      linkedin: profile.linkedin,
      portfolio: profile.portfolio,
      summary: enhanced?.summary || enhanced?.enhancedBio || profile.bio || "",
      photoUrl: photoUrl || profile.photoUrl,
    },
    experiences: enhanced
      ? enhanced.enhancedExperiences
      : profile.experiences.map((e) => ({
          ...e,
          description: e.description || "",
        })),
    education: profile.education,
    skills: enhanced ? enhanced.enhancedSkills : profile.skills,
    certifications: profile.certifications,
    languages: profile.languages,
    accentColor,
  };
}

// renderTemplate is imported from ./cv-templates/render

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function CvGeneratorSheet({
  open,
  onOpenChange,
  profile,
}: CvGeneratorSheetProps) {
  const { user } = useUser();
  const { t, language } = useLanguage();

  // Resolve photo URL from Convex storage
  const resolvedPhotoUrl = useQuery(
    api.professionalProfiles.getPhotoUrl,
    profile.photo ? { photoId: profile.photo as Id<"_storage"> } : "skip"
  );
  const photoUrl = resolvedPhotoUrl || profile.photoUrl;

  const [step, setStep] = useState<Step>(1);
  const [template, setTemplate] = useState<CvTemplateName>("professional");
  const [accentColor, setAccentColor] = useState<string>(
    getDefaultAccent("professional")
  );
  const [categoryFilter, setCategoryFilter] =
    useState<CvTemplateCategory>("all");
  const [enhancing, setEnhancing] = useState(false);
  const [progressMessages, setProgressMessages] = useState<string[]>([]);
  const [rawEnhancedData, setRawEnhancedData] =
    useState<EnhancedProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Diff review state
  const [diffSections, setDiffSections] = useState<DiffSection[]>([]);
  const [decisions, setDecisions] = useState<Record<string, SectionDecision>>(
    {}
  );
  const [visibleCount, setVisibleCount] = useState(0);
  const [reviewing, setReviewing] = useState(false);

  const filteredTemplates = useMemo(
    () =>
      categoryFilter === "all"
        ? TEMPLATE_REGISTRY
        : TEMPLATE_REGISTRY.filter((t) => t.category === categoryFilter),
    [categoryFilter]
  );

  const handleTemplateSelect = useCallback(
    (id: CvTemplateName) => {
      setTemplate(id);
      setAccentColor(getDefaultAccent(id));
    },
    []
  );

  // Memoize props for the live preview hook (prevents infinite re-render)
  const previewTemplateProps = useMemo(
    () => buildTemplateProps(profile, null, photoUrl, accentColor),
    [profile, photoUrl, accentColor]
  );

  const { previewUrl: livePreviewUrl, generating: previewGenerating } =
    usePdfPreview({
      template,
      accentColor,
      templateProps: previewTemplateProps,
      enabled: open && step === 1,
      debounceMs: 800,
    });

  const pdfBlobRef = useRef<Blob | null>(null);
  const enhancedRef = useRef<EnhancedProfile | null>(null);
  const reviewAreaRef = useRef<HTMLDivElement>(null);

  const generateUploadUrl = useMutation(
    api.professionalProfiles.generateUploadUrl
  );
  const uploadCV = useMutation(api.professionalProfiles.uploadCV);
  const updateProfile = useMutation(api.professionalProfiles.update);

  // Animate cards appearing one-by-one
  useEffect(() => {
    if (!reviewing || diffSections.length === 0) return;
    if (visibleCount >= diffSections.length) return;

    const timer = setTimeout(() => {
      setVisibleCount((c) => c + 1);
    }, 400);

    return () => clearTimeout(timer);
  }, [reviewing, visibleCount, diffSections.length]);

  // Auto-scroll to latest visible card
  useEffect(() => {
    if (visibleCount > 0 && reviewAreaRef.current) {
      const cards = reviewAreaRef.current.children;
      const lastCard = cards[visibleCount - 1] as HTMLElement | undefined;
      lastCard?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [visibleCount]);

  // Derived: review progress
  const totalSections = diffSections.length;
  const reviewedCount = Object.values(decisions).filter(
    (d) => d !== "pending"
  ).length;
  const allReviewed = totalSections > 0 && reviewedCount === totalSections;

  // Reset state when sheet closes
  const handleOpenChange = useCallback(
    (val: boolean) => {
      if (!val) {
        if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
        setStep(1);
        setTemplate("professional");
        setAccentColor(getDefaultAccent("professional"));
        setCategoryFilter("all");
        setEnhancing(false);
        setProgressMessages([]);
        setRawEnhancedData(null);
        setError(null);
        setPdfBlobUrl(null);
        setGeneratingPdf(false);
        setSaving(false);
        setSaved(false);
        setApplied(false);
        setDiffSections([]);
        setDecisions({});
        setVisibleCount(0);
        setReviewing(false);
        pdfBlobRef.current = null;
        enhancedRef.current = null;
      }
      onOpenChange(val);
    },
    [onOpenChange, pdfBlobUrl]
  );

  // Section decision handlers
  const handleDecision = useCallback(
    (sectionId: string, decision: SectionDecision) => {
      setDecisions((prev) => ({ ...prev, [sectionId]: decision }));
    },
    []
  );

  // Accept all remaining pending sections
  const acceptAll = useCallback(() => {
    setDecisions((prev) => {
      const next = { ...prev };
      for (const section of diffSections) {
        if (next[section.id] === "pending") {
          next[section.id] = "accepted";
        }
      }
      return next;
    });
  }, [diffSections]);

  // Step 2: AI Enhancement
  const runEnhancement = useCallback(async () => {
    setEnhancing(true);
    setError(null);
    setProgressMessages([]);
    setRawEnhancedData(null);
    setDiffSections([]);
    setDecisions({});
    setVisibleCount(0);
    setReviewing(false);

    try {
      const res = await fetch("/api/cv/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            fullName: profile.fullName,
            email: profile.email,
            phone: profile.phone,
            headline: profile.headline,
            bio: profile.bio,
            city: profile.city,
            country: profile.country,
            linkedin: profile.linkedin,
            portfolio: profile.portfolio,
            experiences: profile.experiences,
            skills: profile.skills,
            education: profile.education,
            certifications: profile.certifications,
            languages: profile.languages,
          },
          template,
          language,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop()!;

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.type === "progress") {
              setProgressMessages((prev) => [...prev, event.message]);
            } else if (event.type === "result") {
              enhancedRef.current = event.data;
              setRawEnhancedData(event.data);
            } else if (event.type === "error") {
              throw new Error(event.message);
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }

      // After stream: build diff sections and enter review mode
      if (enhancedRef.current) {
        const sections = buildDiffSections(
          profile,
          enhancedRef.current,
          t
        );
        setDiffSections(sections);
        // Initialize all as pending
        const initialDecisions: Record<string, SectionDecision> = {};
        for (const s of sections) {
          initialDecisions[s.id] = "pending";
        }
        setDecisions(initialDecisions);
        setReviewing(true);
        setVisibleCount(0); // animation will start via useEffect
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Enhancement failed";
      setError(message);
    } finally {
      setEnhancing(false);
    }
  }, [profile, template, language, t]);

  // Skip enhancement — use raw profile
  const handleSkip = useCallback(() => {
    setRawEnhancedData(null);
    enhancedRef.current = null;
    setStep(3);
    setTimeout(async () => {
      setGeneratingPdf(true);
      try {
        const props = buildTemplateProps(profile, null, photoUrl, accentColor);
        const doc = renderTemplate(template, props);
        const blob = await pdf(doc).toBlob();
        pdfBlobRef.current = blob;
        setPdfBlobUrl(URL.createObjectURL(blob));
      } catch {
        setError("PDF generation failed");
      } finally {
        setGeneratingPdf(false);
      }
    }, 50);
  }, [profile, template, photoUrl, accentColor]);

  // Continue to preview with approved sections
  const continueToPreview = useCallback(async () => {
    if (!rawEnhancedData) return;

    const approved = buildApprovedEnhancement(
      profile,
      rawEnhancedData,
      decisions
    );

    setStep(3);
    setGeneratingPdf(true);
    try {
      const props = buildTemplateProps(profile, approved, photoUrl, accentColor);
      const doc = renderTemplate(template, props);
      const blob = await pdf(doc).toBlob();
      pdfBlobRef.current = blob;
      setPdfBlobUrl(URL.createObjectURL(blob));
    } catch {
      setError("PDF generation failed");
    } finally {
      setGeneratingPdf(false);
    }
  }, [rawEnhancedData, profile, decisions, template, photoUrl, accentColor]);

  // Step 3: Generate PDF preview (for re-generation)
  const generatePreview = useCallback(async () => {
    setGeneratingPdf(true);
    setError(null);

    try {
      const approved = rawEnhancedData
        ? buildApprovedEnhancement(profile, rawEnhancedData, decisions)
        : null;
      const props = buildTemplateProps(profile, approved, photoUrl, accentColor);
      const doc = renderTemplate(template, props);
      const blob = await pdf(doc).toBlob();
      pdfBlobRef.current = blob;
      setPdfBlobUrl(URL.createObjectURL(blob));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "PDF generation failed";
      setError(message);
    } finally {
      setGeneratingPdf(false);
    }
  }, [profile, rawEnhancedData, decisions, template, photoUrl, accentColor]);

  // Step 4: Save & Download
  const saveAndDownload = useCallback(async () => {
    if (!pdfBlobRef.current || !user?.id) return;
    setSaving(true);
    setError(null);

    try {
      const blob = pdfBlobRef.current;

      const uploadUrl = await generateUploadUrl();
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "application/pdf" },
        body: blob,
      });

      if (!uploadResult.ok) throw new Error("Failed to upload CV");

      const { storageId } = await uploadResult.json();

      const fileName = `${profile.fullName.replace(/\s+/g, "_")}_CV.pdf`;
      await uploadCV({
        userId: user.id,
        fileId: storageId as Id<"_storage">,
        fileName,
      });

      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);

      void track("cv_pdf_downloaded", { template });
      setSaved(true);
      fireNotification("cv_generated", {
        userName: profile.fullName,
        userEmail: user?.primaryEmailAddress?.emailAddress || "",
      });
      toast.success(t("cv.generator.savedSuccess"));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Save failed";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }, [user?.id, generateUploadUrl, uploadCV, profile.fullName, template, t]);

  const downloadOnly = useCallback(() => {
    if (!pdfBlobRef.current) return;
    const fileName = `${profile.fullName.replace(/\s+/g, "_")}_CV.pdf`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(pdfBlobRef.current);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    void track("cv_pdf_downloaded", { template });
    toast.success(t("cv.generator.downloaded"));
  }, [profile.fullName, template, t]);

  // Apply enhanced data to profile (without downloading)
  const [applied, setApplied] = useState(false);
  const applyToProfile = useCallback(async () => {
    if (!rawEnhancedData || !user?.id) return;
    setSaving(true);
    setError(null);

    try {
      const approved = buildApprovedEnhancement(
        profile,
        rawEnhancedData,
        decisions
      );

      const updates: Record<string, unknown> = {
        userId: user.id,
      };

      // Apply enhanced bio/summary
      if (decisions["summary"] === "accepted" && approved.summary) {
        updates.bio = approved.summary;
      }

      // Apply enhanced experiences
      const hasAcceptedExp = approved.enhancedExperiences.some(
        (_, i) => decisions[`exp-${i}`] === "accepted"
      );
      if (hasAcceptedExp) {
        updates.experiences = approved.enhancedExperiences.map((exp) => ({
          title: exp.title,
          company: exp.company,
          location: exp.location,
          startDate: exp.startDate,
          endDate: exp.endDate,
          isCurrent: exp.isCurrent,
          description: exp.description,
        }));
      }

      // Apply enhanced skills
      if (decisions["skills"] === "accepted") {
        updates.skills = approved.enhancedSkills.map((s) => ({
          name: s.name,
          yearsOfExperience: s.yearsOfExperience,
        }));
      }

      await updateProfile(updates as Parameters<typeof updateProfile>[0]);
      setApplied(true);
      toast.success(t("cv.generator.appliedToProfile"));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to apply changes";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }, [rawEnhancedData, user?.id, profile, decisions, updateProfile, t]);

  const stepLabels = [
    t("cv.generator.stepTemplate"),
    t("cv.generator.stepEnhance"),
    t("cv.generator.stepPreview"),
    t("cv.generator.stepSave"),
  ];

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-[95vw] sm:w-[800px] lg:w-[1200px] !max-w-none flex flex-col overflow-hidden"
      >
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t("cv.generator.title")}
          </SheetTitle>
          <SheetDescription>{t("cv.generator.subtitle")}</SheetDescription>
        </SheetHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-1 mb-6">
          {stepLabels.map((label, i) => {
            const stepNum = (i + 1) as Step;
            const isActive = step === stepNum;
            const isDone = step > stepNum;
            return (
              <div key={i} className="flex items-center gap-1">
                {i > 0 && (
                  <div
                    className={cn(
                      "h-px w-6 sm:w-10",
                      isDone ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                      isActive && "bg-primary text-primary-foreground",
                      isDone && "bg-primary/20 text-primary",
                      !isActive &&
                        !isDone &&
                        "bg-muted text-muted-foreground"
                    )}
                  >
                    {isDone ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      stepNum
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] leading-tight text-center max-w-[60px]",
                      isActive
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ============================================================= */}
        {/* Step 1: Template Selection                                     */}
        {/* ============================================================= */}
        {step === 1 && (
          <div className="flex flex-col lg:flex-row flex-1 min-h-0 gap-4">
            {/* LEFT: Template selector */}
            <div className="flex flex-col lg:w-[480px] lg:shrink-0 min-h-0 gap-3">
              <p className="text-sm text-muted-foreground shrink-0">
                {t("cv.generator.chooseTemplate")}
              </p>

              {/* Category tabs */}
              <div className="flex flex-wrap gap-1.5 shrink-0">
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryFilter(cat.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                      categoryFilter === cat.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {t(cat.labelKey)}
                  </button>
                ))}
              </div>

              {/* Template grid — scrollable */}
              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                <div className="grid gap-2 grid-cols-2">
                  {filteredTemplates.map((tmpl) => {
                    const selected = template === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => handleTemplateSelect(tmpl.id)}
                        className={cn(
                          "flex items-start gap-2.5 rounded-lg border-2 p-2 text-left transition-all cursor-pointer",
                          selected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/40 hover:bg-accent/30"
                        )}
                      >
                        <CvTemplateThumbnail
                          templateId={tmpl.id}
                          accentColor={selected ? accentColor : tmpl.defaultAccent}
                        />
                        <div className="flex-1 min-w-0 pt-0.5">
                          <p className="text-xs font-semibold truncate">
                            {t(tmpl.labelKey)}
                          </p>
                          <p className="text-[10px] text-muted-foreground capitalize">
                            {tmpl.layout === "two-column"
                              ? "2-col"
                              : tmpl.layout === "hybrid"
                                ? "hybrid"
                                : "1-col"}
                          </p>
                          <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2 mt-1">
                            {t(tmpl.descKey)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Accent color picker */}
              <div className="shrink-0 rounded-lg border border-border bg-card p-3">
                <AccentColorPicker
                  value={accentColor}
                  defaultColor={getDefaultAccent(template)}
                  onChange={setAccentColor}
                  t={t}
                />
              </div>

              <div className="flex justify-end shrink-0">
                <Button onClick={() => setStep(2)} className="gap-1.5">
                  {t("cv.generator.next")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* RIGHT: Live PDF preview pane — desktop only */}
            <div className="hidden lg:flex flex-col flex-1 min-h-0 gap-2">
              <div className="flex items-center justify-between shrink-0">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("cv.generator.stepPreview")}
                </span>
                {previewGenerating && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-h-0 rounded-lg border border-border bg-muted/30 overflow-hidden relative">
                {livePreviewUrl && (
                  <iframe
                    src={livePreviewUrl}
                    className="w-full h-full"
                    title="Template Preview"
                  />
                )}
                {previewGenerating && !livePreviewUrl && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground">
                      {t("cv.generator.generatingPdf")}
                    </p>
                  </div>
                )}
                {!previewGenerating && !livePreviewUrl && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                )}
                {previewGenerating && livePreviewUrl && (
                  <div className="absolute top-2 right-2 bg-background/80 rounded-full p-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* Step 2: AI Enhancement + Diff Review                          */}
        {/* ============================================================= */}
        {step === 2 && (
          <div className="flex flex-col flex-1 min-h-0">
            <p className="text-sm text-muted-foreground mb-4 shrink-0">
              {t("cv.generator.enhanceDesc")}
            </p>

            {/* Initial state — not started yet */}
            {!enhancing && !reviewing && !rawEnhancedData && (
              <div className="rounded-lg border border-border bg-card p-6 shrink-0">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-7 w-7 text-primary" />
                  </div>
                  <p className="text-sm text-center max-w-sm text-muted-foreground">
                    {t("cv.generator.enhanceInfo")}
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleSkip}
                      className="gap-1.5"
                    >
                      <SkipForward className="h-4 w-4" />
                      {t("cv.generator.skipEnhance")}
                    </Button>
                    <Button onClick={runEnhancement} className="gap-1.5">
                      <Sparkles className="h-4 w-4" />
                      {t("cv.generator.startEnhance")}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Streaming in progress */}
            {enhancing && (
              <div className="rounded-lg border border-border bg-card p-6 shrink-0">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <div className="space-y-1 text-center">
                    {progressMessages.map((msg, i) => (
                      <p
                        key={i}
                        className={cn(
                          "text-sm transition-opacity",
                          i === progressMessages.length - 1
                            ? "text-foreground font-medium"
                            : "text-muted-foreground/60"
                        )}
                      >
                        {msg}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ---- Review panel (contained, scrollable) ---- */}
            {reviewing && diffSections.length > 0 && (
              <div className="flex flex-col flex-1 min-h-0 gap-2">
                {/* Review header bar — fixed */}
                <div className="flex items-center justify-between rounded-lg bg-muted/50 border border-border px-4 py-2.5 shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-foreground">
                      {t("cv.generator.diffReviewTitle")}
                    </span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {reviewedCount} / {totalSections}{" "}
                      {t("cv.generator.diffReviewed")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={acceptAll}
                      className="gap-1 text-xs h-7"
                      disabled={allReviewed}
                    >
                      <Check className="h-3 w-3" />
                      {t("cv.generator.diffAcceptAll")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={runEnhancement}
                      className="gap-1 text-xs h-7"
                    >
                      <RotateCcw className="h-3 w-3" />
                      {t("cv.generator.diffRerun")}
                    </Button>
                  </div>
                </div>

                {/* Progress bar — fixed */}
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden shrink-0">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{
                      width: `${totalSections > 0 ? (reviewedCount / totalSections) * 100 : 0}%`,
                    }}
                  />
                </div>

                {/* Diff cards — scrollable within container */}
                <div
                  ref={reviewAreaRef}
                  className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1"
                >
                  {diffSections.map((section, i) => (
                    <SectionDiffCard
                      key={section.id}
                      section={section}
                      decision={decisions[section.id] || "pending"}
                      onAccept={() =>
                        handleDecision(section.id, "accepted")
                      }
                      onReject={() =>
                        handleDecision(section.id, "rejected")
                      }
                      visible={i < visibleCount}
                      index={i}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Navigation — fixed at bottom */}
            <div className="flex justify-between pt-4 shrink-0">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="gap-1.5"
                disabled={enhancing}
              >
                <ArrowLeft className="h-4 w-4" />
                {t("cv.generator.back")}
              </Button>
              <div className="flex gap-2">
                {reviewing && (
                  <Button
                    onClick={continueToPreview}
                    className="gap-1.5"
                    disabled={!allReviewed}
                  >
                    {t("cv.generator.diffContinue")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* Step 3: PDF Preview                                            */}
        {/* ============================================================= */}
        {step === 3 && (
          <div className="space-y-4 flex-1 overflow-y-auto">
            <p className="text-sm text-muted-foreground">
              {t("cv.generator.previewDesc")}
            </p>

            {generatingPdf && (
              <div className="flex flex-col items-center gap-4 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  {t("cv.generator.generatingPdf")}
                </p>
              </div>
            )}

            {pdfBlobUrl && !generatingPdf && (
              <div className="rounded-lg border bg-muted/30 overflow-hidden">
                <iframe
                  src={pdfBlobUrl}
                  className="w-full h-[500px] sm:h-[600px]"
                  title="CV Preview"
                />
              </div>
            )}

            {!generatingPdf && !pdfBlobUrl && !error && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Button onClick={generatePreview} className="gap-1.5">
                  <FileText className="h-4 w-4" />
                  {t("cv.generator.generatePreview")}
                </Button>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
                  setPdfBlobUrl(null);
                  setStep(2);
                }}
                className="gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("cv.generator.back")}
              </Button>
              {pdfBlobUrl && (
                <Button onClick={() => setStep(4)} className="gap-1.5">
                  {t("cv.generator.next")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* Step 4: Save & Download                                        */}
        {/* ============================================================= */}
        {step === 4 && (
          <div className="space-y-4 flex-1 overflow-y-auto">
            <p className="text-sm text-muted-foreground">
              {t("cv.generator.saveDesc")}
            </p>

            <div className="flex flex-col items-center gap-4 py-8">
              {saved ? (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                    <Check className="h-8 w-8 text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-emerald-600">
                    {t("cv.generator.savedSuccess")}
                  </p>
                  <Button
                    variant="outline"
                    onClick={downloadOnly}
                    className="gap-1.5"
                  >
                    <Download className="h-4 w-4" />
                    {t("cv.generator.downloadAgain")}
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap justify-center gap-3">
                    {rawEnhancedData && (
                      <Button
                        variant="outline"
                        onClick={applyToProfile}
                        className="gap-1.5"
                        disabled={saving || applied}
                      >
                        {applied ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                        {applied
                          ? t("cv.generator.applied")
                          : t("cv.generator.applyToProfile")}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={downloadOnly}
                      className="gap-1.5"
                      disabled={saving}
                    >
                      <Download className="h-4 w-4" />
                      {t("cv.generator.downloadOnly")}
                    </Button>
                    <Button
                      onClick={saveAndDownload}
                      className="gap-1.5"
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {saving
                        ? t("cv.generator.saving")
                        : t("cv.generator.saveAndDownload")}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center max-w-sm">
                    {t("cv.generator.saveNote")}
                  </p>
                </>
              )}
            </div>

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setStep(3)}
                className="gap-1.5"
                disabled={saving}
              >
                <ArrowLeft className="h-4 w-4" />
                {t("cv.generator.back")}
              </Button>
              {saved && (
                <Button
                  onClick={() => handleOpenChange(false)}
                  className="gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  {t("cv.generator.done")}
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
