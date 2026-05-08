"use client";

import { useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useLanguage } from "@/hooks/use-language";
import { track } from "@/lib/posthog/events";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  DIVISIONS,
  DISTRICTS,
  EXPERIENCE_LEVELS,
  getLabel,
} from "@/lib/profile/constants";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Globe,
  Loader2,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProfileFormData {
  fullName: string;
  email: string;
  phone: string;
  headline: string;
  bio: string;
  city: string;
  division: string;
  district: string;
  willingToRelocate: boolean;
  preferredLocations: string[];
  openToRemote: boolean;
  currentDesignation: string;
  currentOrganization: string;
  totalExperienceYears: number | undefined;
  experienceLevel: string;
  skills: Array<{ name: string; yearsOfExperience?: number }>;
  education: Array<{
    degree: string;
    institution: string;
    fieldOfStudy?: string;
    year?: string;
  }>;
  certifications: Array<{ name: string; org?: string; year?: string }>;
  experiences: Array<{
    title: string;
    company: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    isCurrent: boolean;
    description?: string;
  }>;
  languages: Array<{ name: string; proficiency?: string }>;
  linkedin: string;
  portfolio: string;
  socialProfiles: Array<{ platform: string; url: string }>;
  isPublic: boolean;
  isOpenToOpportunities: boolean;
  emailNotifications: boolean;
}

type StepErrors = Record<string, string>;

const STEPS = [
  "profile.wizard.step1",
  "profile.wizard.step2",
  "profile.wizard.step3",
  "profile.wizard.step5",
] as const;

const PROFICIENCY_OPTIONS = [
  { value: "native", key: "profile.languages.native" },
  { value: "fluent", key: "profile.languages.fluent" },
  { value: "advanced", key: "profile.languages.advanced" },
  { value: "intermediate", key: "profile.languages.intermediate" },
  { value: "basic", key: "profile.languages.basic" },
];

// ---------------------------------------------------------------------------
// Helper: Toggle Switch
// ---------------------------------------------------------------------------

function ToggleSwitch({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
        value ? "bg-primary" : "bg-muted"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
          value ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Step Indicator
// ---------------------------------------------------------------------------

function StepIndicator({
  currentStep,
  completedSteps,
  t,
}: {
  currentStep: number;
  completedSteps: Set<number>;
  t: (key: string) => string;
}) {
  return (
    <div className="flex items-center justify-between mb-8">
      {STEPS.map((stepKey, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = completedSteps.has(stepNum);

        return (
          <div key={stepKey} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex items-center justify-center w-9 h-9 rounded-full text-sm font-medium border-2 transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : isCompleted
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : stepNum}
              </div>
              <span
                className={cn(
                  "text-xs mt-1.5 text-center hidden sm:block whitespace-nowrap",
                  isActive
                    ? "text-primary font-medium"
                    : "text-muted-foreground"
                )}
              >
                {t(stepKey)}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 mt-[-1.25rem] sm:mt-0",
                  isCompleted ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Wizard Component
// ---------------------------------------------------------------------------

export function ProfileWizard() {
  const { user } = useUser();
  const { t, language } = useLanguage();
  const createProfile = useMutation(api.professionalProfiles.create);
  const fireNotify = (type: string, data: Record<string, unknown>) => {
    fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, ...data }),
    }).catch(() => {});
  };

  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [errors, setErrors] = useState<StepErrors>({});
  const [saving, setSaving] = useState(false);
  const [expandedExp, setExpandedExp] = useState<Set<number>>(new Set([0]));

  // --- CV / URL auto-fill ---
  const [cvParsing, setCvParsing] = useState(false);
  const [cvParsed, setCvParsed] = useState(false);
  const [profileUrl, setProfileUrl] = useState("");
  const [urlParsing, setUrlParsing] = useState(false);
  const [urlParsed, setUrlParsed] = useState(false);
  const [cvDragging, setCvDragging] = useState(false);

  const [formData, setFormData] = useState<ProfileFormData>({
    fullName: user?.fullName ?? "",
    email: user?.primaryEmailAddress?.emailAddress ?? "",
    phone: "",
    headline: "",
    bio: "",
    city: "",
    division: "",
    district: "",
    willingToRelocate: false,
    preferredLocations: [],
    openToRemote: false,
    currentDesignation: "",
    currentOrganization: "",
    totalExperienceYears: undefined,
    experienceLevel: "",
    skills: [{ name: "", yearsOfExperience: undefined }],
    education: [],
    certifications: [],
    experiences: [],
    languages: [],
    linkedin: "",
    portfolio: "",
    socialProfiles: [],
    isPublic: true,
    isOpenToOpportunities: true,
    emailNotifications: true,
  });

  // ------ Field updaters ------

  const updateField = useCallback(
    <K extends keyof ProfileFormData>(field: K, value: ProfileFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Clear error for the field if present
      setErrors((prev) => {
        if (prev[field as string]) {
          const next = { ...prev };
          delete next[field as string];
          return next;
        }
        return prev;
      });
    },
    []
  );

  // ------ Validation ------

  const validateStep = useCallback(
    (step: number): boolean => {
      const errs: StepErrors = {};

      if (step === 1) {
        if (!formData.fullName.trim()) errs.fullName = "Required";
        if (!formData.email.trim()) errs.email = "Required";
        if (!formData.headline.trim()) errs.headline = "Required";
        if (!formData.city.trim()) errs.city = "Required";
      }

      if (step === 2) {
        const validSkills = formData.skills.filter((s) => s.name.trim());
        if (validSkills.length === 0) errs.skills = "At least 1 skill required";
      }

      setErrors(errs);
      return Object.keys(errs).length === 0;
    },
    [formData]
  );

  // ------ Navigation ------

  const goNext = useCallback(() => {
    if (!validateStep(currentStep)) return;
    setCompletedSteps((prev) => new Set(prev).add(currentStep));
    setCurrentStep((s) => Math.min(s + 1, 4));
  }, [currentStep, validateStep]);

  const goBack = useCallback(() => {
    setErrors({});
    setCurrentStep((s) => Math.max(s - 1, 1));
  }, []);

  // ------ Save ------

  const handleSave = useCallback(async () => {
    if (!validateStep(4)) return;
    if (!user?.id) return;

    setSaving(true);
    try {
      // Clean up skills — remove empty entries
      const cleanSkills = formData.skills
        .filter((s) => s.name.trim())
        .map((s) => ({
          name: s.name.trim(),
          ...(s.yearsOfExperience !== undefined
            ? { yearsOfExperience: s.yearsOfExperience }
            : {}),
        }));

      // Clean up experiences — remove entries with no title
      const cleanExperiences = formData.experiences
        .filter((e) => e.title.trim() || e.company.trim())
        .map((e) => ({
          title: e.title.trim(),
          company: e.company.trim(),
          isCurrent: e.isCurrent,
          ...(e.location?.trim() ? { location: e.location.trim() } : {}),
          ...(e.startDate?.trim() ? { startDate: e.startDate.trim() } : {}),
          ...(e.endDate?.trim() ? { endDate: e.endDate.trim() } : {}),
          ...(e.description?.trim()
            ? { description: e.description.trim() }
            : {}),
        }));

      // Clean up education
      const cleanEducation = formData.education
        .filter((ed) => ed.degree.trim() || ed.institution.trim())
        .map((ed) => ({
          degree: ed.degree.trim(),
          institution: ed.institution.trim(),
          ...(ed.fieldOfStudy?.trim()
            ? { fieldOfStudy: ed.fieldOfStudy.trim() }
            : {}),
          ...(ed.year?.trim() ? { year: ed.year.trim() } : {}),
        }));

      // Clean up certifications
      const cleanCerts = formData.certifications
        .filter((c) => c.name.trim())
        .map((c) => ({
          name: c.name.trim(),
          ...(c.org?.trim() ? { org: c.org.trim() } : {}),
          ...(c.year?.trim() ? { year: c.year.trim() } : {}),
        }));

      // Clean up languages
      const cleanLangs = formData.languages
        .filter((l) => l.name.trim())
        .map((l) => ({
          name: l.name.trim(),
          ...(l.proficiency ? { proficiency: l.proficiency } : {}),
        }));

      // Clean up social profiles
      const cleanSocials = formData.socialProfiles
        .filter((s) => s.platform.trim() && s.url.trim())
        .map((s) => ({
          platform: s.platform.trim(),
          url: s.url.trim(),
        }));

      // Determine status based on completion
      const hasBasics =
        formData.fullName && formData.email && formData.city && formData.headline;
      const hasSkills = cleanSkills.length > 0;
      const status =
        hasBasics && hasSkills ? "complete" : "draft";

      await createProfile({
        userId: user.id,
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        ...(formData.phone.trim() ? { phone: formData.phone.trim() } : {}),
        ...(user.imageUrl ? { photoUrl: user.imageUrl } : {}),
        headline: formData.headline.trim(),
        ...(formData.bio.trim() ? { bio: formData.bio.trim() } : {}),
        city: formData.city.trim(),
        ...(formData.division ? { division: formData.division } : {}),
        ...(formData.district ? { district: formData.district } : {}),
        willingToRelocate: formData.willingToRelocate,
        ...(formData.preferredLocations.length > 0
          ? { preferredLocations: formData.preferredLocations }
          : {}),
        openToRemote: formData.openToRemote,
        ...(formData.currentDesignation.trim()
          ? { currentDesignation: formData.currentDesignation.trim() }
          : {}),
        ...(formData.currentOrganization.trim()
          ? { currentOrganization: formData.currentOrganization.trim() }
          : {}),
        ...(formData.totalExperienceYears !== undefined
          ? { totalExperienceYears: formData.totalExperienceYears }
          : {}),
        ...(formData.experienceLevel
          ? { experienceLevel: formData.experienceLevel }
          : {}),
        skills: cleanSkills,
        education: cleanEducation,
        certifications: cleanCerts,
        experiences: cleanExperiences,
        ...(cleanLangs.length > 0 ? { languages: cleanLangs } : {}),
        ...(formData.linkedin.trim()
          ? { linkedin: formData.linkedin.trim() }
          : {}),
        ...(formData.portfolio.trim()
          ? { portfolio: formData.portfolio.trim() }
          : {}),
        ...(cleanSocials.length > 0
          ? { socialProfiles: cleanSocials }
          : {}),
        isPublic: formData.isPublic,
        isOpenToOpportunities: formData.isOpenToOpportunities,
        emailNotifications: formData.emailNotifications,
        status,
      });
      // Notify on profile completion
      if (status === "complete") {
        fireNotify("profile_completed", {
          userName: formData.fullName.trim(),
          userEmail: formData.email.trim(),
        });
        // PostHog: post-signup wizard finish. role_selected pulls from
        // the user's current designation when present. industry_selected
        // and company_size_band are not modelled in the wizard yet —
        // left undefined so they don't ship a fake value.
        void track("profile_completed", {
          role_selected: formData.currentDesignation.trim() || undefined,
        });
      }
    } catch (err) {
      console.error("Failed to create profile:", err);
      setErrors({ _save: "Failed to save profile. Please try again." });
    } finally {
      setSaving(false);
    }
  }, [formData, user, createProfile, validateStep]);

  // ------ Array helpers ------

  const addSkill = () =>
    updateField("skills", [
      ...formData.skills,
      { name: "", yearsOfExperience: undefined },
    ]);

  const removeSkill = (index: number) =>
    updateField(
      "skills",
      formData.skills.filter((_, i) => i !== index)
    );

  const updateSkill = (
    index: number,
    field: "name" | "yearsOfExperience",
    value: string | number | undefined
  ) => {
    const updated = [...formData.skills];
    updated[index] = { ...updated[index], [field]: value };
    updateField("skills", updated);
  };

  const addExperience = () => {
    const newIdx = formData.experiences.length;
    updateField("experiences", [
      ...formData.experiences,
      {
        title: "",
        company: "",
        location: "",
        startDate: "",
        endDate: "",
        isCurrent: false,
        description: "",
      },
    ]);
    setExpandedExp((prev) => new Set(prev).add(newIdx));
  };

  const removeExperience = (index: number) => {
    updateField(
      "experiences",
      formData.experiences.filter((_, i) => i !== index)
    );
    setExpandedExp((prev) => {
      const next = new Set<number>();
      prev.forEach((v) => {
        if (v < index) next.add(v);
        else if (v > index) next.add(v - 1);
      });
      return next;
    });
  };

  const updateExperience = (
    index: number,
    field: string,
    value: string | boolean
  ) => {
    const updated = [...formData.experiences];
    updated[index] = { ...updated[index], [field]: value };
    updateField("experiences", updated);
  };

  const toggleExpanded = (index: number) => {
    setExpandedExp((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const addEducation = () =>
    updateField("education", [
      ...formData.education,
      { degree: "", institution: "", fieldOfStudy: "", year: "" },
    ]);

  const removeEducation = (index: number) =>
    updateField(
      "education",
      formData.education.filter((_, i) => i !== index)
    );

  const updateEducation = (index: number, field: string, value: string) => {
    const updated = [...formData.education];
    updated[index] = { ...updated[index], [field]: value };
    updateField("education", updated);
  };

  const addCertification = () =>
    updateField("certifications", [
      ...formData.certifications,
      { name: "", org: "", year: "" },
    ]);

  const removeCertification = (index: number) =>
    updateField(
      "certifications",
      formData.certifications.filter((_, i) => i !== index)
    );

  const updateCertification = (
    index: number,
    field: string,
    value: string
  ) => {
    const updated = [...formData.certifications];
    updated[index] = { ...updated[index], [field]: value };
    updateField("certifications", updated);
  };

  const addLanguage = () =>
    updateField("languages", [
      ...formData.languages,
      { name: "", proficiency: "" },
    ]);

  const removeLanguage = (index: number) =>
    updateField(
      "languages",
      formData.languages.filter((_, i) => i !== index)
    );

  const updateLanguageField = (
    index: number,
    field: string,
    value: string
  ) => {
    const updated = [...formData.languages];
    updated[index] = { ...updated[index], [field]: value };
    updateField("languages", updated);
  };

  const togglePreferredLocation = (division: string) => {
    const current = formData.preferredLocations;
    if (current.includes(division)) {
      updateField(
        "preferredLocations",
        current.filter((d) => d !== division)
      );
    } else {
      updateField("preferredLocations", [...current, division]);
    }
  };

  // ------ CV / URL auto-fill helpers ------

  const applyParsedData = useCallback((data: any) => {
    if (data.name && !formData.fullName) updateField("fullName", data.name);
    if (data.designation && !formData.currentDesignation) updateField("currentDesignation", data.designation);
    if (data.organization && !formData.currentOrganization) updateField("currentOrganization", data.organization);
    if (data.city && !formData.city) updateField("city", data.city);
    if (data.linkedin && !formData.linkedin) updateField("linkedin", data.linkedin);
    if (data.portfolio && !formData.portfolio) updateField("portfolio", data.portfolio);
    if (data.bio && !formData.bio) updateField("bio", data.bio);
    if (data.designation && !formData.headline) updateField("headline", data.designation);

    if (data.skills?.length) {
      const existingNames = new Set(formData.skills.map(s => s.name.toLowerCase()).filter(Boolean));
      const newSkills = data.skills
        .filter((s: any) => s.name && !existingNames.has(s.name.toLowerCase()))
        .map((s: any) => ({ name: s.name, yearsOfExperience: undefined }));
      if (newSkills.length > 0) {
        // Remove empty placeholder skills first
        const existing = formData.skills.filter(s => s.name.trim());
        updateField("skills", [...existing, ...newSkills]);
      }
    }

    if (data.education?.length) {
      const existingKeys = new Set(formData.education.map(e => `${e.degree}|${e.institution}`));
      const newEdus = data.education
        .filter((e: any) => e.degree && e.institution && !existingKeys.has(`${e.degree}|${e.institution}`))
        .map((e: any) => ({
          degree: e.degree,
          institution: e.institution,
          fieldOfStudy: e.fieldOfStudy || undefined,
          year: e.year != null ? String(e.year) : undefined,
        }));
      if (newEdus.length > 0) updateField("education", [...formData.education, ...newEdus]);
    }

    if (data.certifications?.length) {
      const existingNames = new Set(formData.certifications.map(c => c.name));
      const newCerts = data.certifications
        .filter((c: any) => c.name && !existingNames.has(c.name))
        .map((c: any) => ({
          name: c.name,
          org: c.org || undefined,
          year: c.year != null ? String(c.year) : undefined,
        }));
      if (newCerts.length > 0) updateField("certifications", [...formData.certifications, ...newCerts]);
    }

    if (data.experiences?.length) {
      const newExps = data.experiences.map((e: any) => ({
        title: e.title || "",
        company: e.company || "",
        location: e.location || undefined,
        startDate: undefined,
        endDate: undefined,
        isCurrent: false,
        description: [e.role, e.scope].filter(Boolean).join(". ") || undefined,
      }));
      updateField("experiences", [...formData.experiences, ...newExps]);
    }

    if (data.languages?.length) {
      const existingNames = new Set(formData.languages.map(l => l.name.toLowerCase()));
      const validProf = new Set(["native", "fluent", "advanced", "intermediate", "basic"]);
      const newLangs = data.languages
        .filter((l: any) => l.name && !existingNames.has(l.name.toLowerCase()))
        .map((l: any) => ({
          name: l.name,
          proficiency: validProf.has(l.proficiency || "") ? l.proficiency : undefined,
        }));
      if (newLangs.length > 0) updateField("languages", [...formData.languages, ...newLangs]);
    }
  }, [formData, updateField]);

  const handleCvUpload = useCallback(async (file: File) => {
    setCvParsing(true);
    setCvParsed(false);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/experts/parse-cv", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to parse CV");
      }
      const { data } = await res.json();
      applyParsedData(data);
      setCvParsed(true);
      toast.success(t("apply.cv.success") || "CV analyzed! Fields have been auto-filled.");
    } catch (err) {
      console.error("CV parse error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to analyze CV");
    } finally {
      setCvParsing(false);
    }
  }, [applyParsedData, t]);

  const handleUrlParse = useCallback(async () => {
    if (!profileUrl.trim()) return;
    setUrlParsing(true);
    setUrlParsed(false);
    try {
      const res = await fetch("/api/experts/parse-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: profileUrl.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to analyze profile");
      }
      const { data } = await res.json();
      applyParsedData(data);
      setUrlParsed(true);
      toast.success(t("apply.url.success") || "Profile analyzed! Fields have been auto-filled.");
    } catch (err) {
      console.error("URL parse error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to analyze profile");
    } finally {
      setUrlParsing(false);
    }
  }, [profileUrl, applyParsedData, t]);

  // ------ Render helpers ------

  const fieldError = (field: string) =>
    errors[field] ? (
      <p className="text-xs text-red-500 mt-1">{errors[field]}</p>
    ) : null;

  // ===================================================================
  // STEP 1: Basic Info
  // ===================================================================

  const renderStep1 = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">
            {t("profile.section.basicInfo")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="fullName">{t("profile.field.fullName")} *</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => updateField("fullName", e.target.value)}
              className={errors.fullName ? "border-red-500" : ""}
            />
            {fieldError("fullName")}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("profile.field.email")} *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
              className={errors.email ? "border-red-500" : ""}
            />
            {fieldError("email")}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="phone">{t("profile.field.phone")}</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => updateField("phone", e.target.value)}
            />
          </div>

          {/* Headline */}
          <div className="space-y-1.5">
            <Label htmlFor="headline">
              {t("profile.field.headline")} *
            </Label>
            <Input
              id="headline"
              value={formData.headline}
              onChange={(e) => updateField("headline", e.target.value)}
              placeholder={t("profile.field.headlinePlaceholder")}
              className={errors.headline ? "border-red-500" : ""}
            />
            {fieldError("headline")}
          </div>

          <Separator />

          {/* City */}
          <div className="space-y-1.5">
            <Label htmlFor="city">{t("profile.field.city")} *</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => updateField("city", e.target.value)}
              className={errors.city ? "border-red-500" : ""}
            />
            {fieldError("city")}
          </div>

          {/* Division */}
          <div className="space-y-1.5">
            <Label>{t("profile.field.division")}</Label>
            <Select
              value={formData.division}
              onValueChange={(value) => {
                updateField("division", value);
                updateField("district", "");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("profile.field.division")} />
              </SelectTrigger>
              <SelectContent>
                {DIVISIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {language === "bn" ? d.bn : d.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* District */}
          <div className="space-y-1.5">
            <Label>{t("profile.field.district")}</Label>
            <Select
              value={formData.district}
              onValueChange={(value) => updateField("district", value)}
              disabled={!formData.division}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("profile.field.district")} />
              </SelectTrigger>
              <SelectContent>
                {(DISTRICTS[formData.division] ?? []).map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {language === "bn" ? d.bn : d.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Open to Remote */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <Label className="text-sm font-medium">
              {t("profile.prefs.remote")}
            </Label>
            <ToggleSwitch
              value={formData.openToRemote}
              onChange={(v) => updateField("openToRemote", v)}
            />
          </div>

          {/* Willing to Relocate */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <Label className="text-sm font-medium">
              {t("profile.prefs.relocate")}
            </Label>
            <ToggleSwitch
              value={formData.willingToRelocate}
              onChange={(v) => updateField("willingToRelocate", v)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ===================================================================
  // STEP 2: Experience & Skills
  // ===================================================================

  const renderStep2 = () => (
    <div className="space-y-6">
      {/* Current Position */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">
            {t("profile.section.experience")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("profile.field.currentDesignation")}</Label>
              <Input
                value={formData.currentDesignation}
                onChange={(e) =>
                  updateField("currentDesignation", e.target.value)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("profile.field.currentOrganization")}</Label>
              <Input
                value={formData.currentOrganization}
                onChange={(e) =>
                  updateField("currentOrganization", e.target.value)
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("profile.field.totalExperience")}</Label>
              <Input
                type="number"
                min={0}
                value={formData.totalExperienceYears ?? ""}
                onChange={(e) =>
                  updateField(
                    "totalExperienceYears",
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("profile.field.experienceLevel")}</Label>
              <Select
                value={formData.experienceLevel}
                onValueChange={(v) => updateField("experienceLevel", v)}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("profile.field.experienceLevel")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_LEVELS.map((lvl) => (
                    <SelectItem key={lvl.value} value={lvl.value}>
                      {language === "bn" ? lvl.bn : lvl.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">
            {t("profile.section.skills")} *
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {formData.skills.map((skill, i) => (
              <div key={i} className="flex gap-2 items-start">
                <Input
                  value={skill.name}
                  onChange={(e) => updateSkill(i, "name", e.target.value)}
                  placeholder={t("profile.skills.name")}
                  className={cn("flex-1 min-w-0", errors.skills && !skill.name.trim() ? "border-red-500" : "")}
                />
                <Input
                  type="number"
                  min={0}
                  value={skill.yearsOfExperience ?? ""}
                  onChange={(e) =>
                    updateSkill(
                      i,
                      "yearsOfExperience",
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  placeholder={t("profile.skills.years")}
                  className="w-20"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSkill(i)}
                  disabled={formData.skills.length === 1}
                  className="shrink-0 h-9 w-9"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
          {fieldError("skills")}
          <Button variant="outline" size="sm" onClick={addSkill}>
            <Plus className="h-4 w-4 mr-1" />
            {t("profile.skills.add")}
          </Button>
        </CardContent>
      </Card>

      {/* Experiences */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">
            {t("profile.section.experience")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {formData.experiences.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("profile.experience.add")}
            </p>
          )}
          {formData.experiences.map((exp, i) => {
            const isExpanded = expandedExp.has(i);
            return (
              <div
                key={i}
                className="border border-border rounded-lg overflow-hidden"
              >
                <div
                  role="button"
                  tabIndex={0}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm text-left hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => toggleExpanded(i)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleExpanded(i); } }}
                >
                  <span className="font-medium">
                    {exp.title || exp.company
                      ? `${exp.title}${exp.company ? ` — ${exp.company}` : ""}`
                      : `${t("profile.experience.title")} ${i + 1}`}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeExperience(i);
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>{t("profile.experience.title")}</Label>
                        <Input
                          value={exp.title}
                          onChange={(e) =>
                            updateExperience(i, "title", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("profile.experience.company")}</Label>
                        <Input
                          value={exp.company}
                          onChange={(e) =>
                            updateExperience(i, "company", e.target.value)
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("profile.experience.location")}</Label>
                      <Input
                        value={exp.location ?? ""}
                        onChange={(e) =>
                          updateExperience(i, "location", e.target.value)
                        }
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>{t("profile.experience.startDate")}</Label>
                        <Input
                          type="date"
                          value={exp.startDate ?? ""}
                          onChange={(e) =>
                            updateExperience(i, "startDate", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("profile.experience.endDate")}</Label>
                        <Input
                          type="date"
                          value={exp.endDate ?? ""}
                          onChange={(e) =>
                            updateExperience(i, "endDate", e.target.value)
                          }
                          disabled={exp.isCurrent}
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={exp.isCurrent}
                        onChange={(e) =>
                          updateExperience(i, "isCurrent", e.target.checked)
                        }
                        className="h-4 w-4 rounded border-input text-primary"
                      />
                      {t("profile.experience.current")}
                    </label>
                    <div className="space-y-1.5">
                      <Label>{t("profile.experience.description")}</Label>
                      <Textarea
                        value={exp.description ?? ""}
                        onChange={(e) =>
                          updateExperience(i, "description", e.target.value)
                        }
                        rows={3}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <Button variant="outline" size="sm" onClick={addExperience}>
            <Plus className="h-4 w-4 mr-1" />
            {t("profile.experience.add")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  // ===================================================================
  // STEP 3: Education & Certifications
  // ===================================================================

  const renderStep3 = () => (
    <div className="space-y-6">
      {/* Education */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{t("profile.education")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {formData.education.map((edu, i) => (
            <div
              key={i}
              className="border border-border rounded-lg p-4 space-y-3"
            >
              <div className="flex justify-between items-start">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
                  <div className="space-y-1.5">
                    <Label>{t("profile.education.degree")}</Label>
                    <Input
                      value={edu.degree}
                      onChange={(e) =>
                        updateEducation(i, "degree", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("profile.education.institution")}</Label>
                    <Input
                      value={edu.institution}
                      onChange={(e) =>
                        updateEducation(i, "institution", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("profile.education.field")}</Label>
                    <Input
                      value={edu.fieldOfStudy ?? ""}
                      onChange={(e) =>
                        updateEducation(i, "fieldOfStudy", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("profile.education.year")}</Label>
                    <Input
                      value={edu.year ?? ""}
                      onChange={(e) =>
                        updateEducation(i, "year", e.target.value)
                      }
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeEducation(i)}
                  className="shrink-0 ml-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addEducation}>
            <Plus className="h-4 w-4 mr-1" />
            {t("profile.education.add")}
          </Button>
        </CardContent>
      </Card>

      {/* Certifications */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">
            {t("profile.section.education")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {formData.certifications.map((cert, i) => (
            <div key={i} className="flex gap-2 items-start">
              <Input
                value={cert.name}
                onChange={(e) =>
                  updateCertification(i, "name", e.target.value)
                }
                placeholder={t("profile.cert.name")}
                className="flex-1"
              />
              <Input
                value={cert.org ?? ""}
                onChange={(e) =>
                  updateCertification(i, "org", e.target.value)
                }
                placeholder={t("profile.cert.org")}
                className="flex-1"
              />
              <Input
                value={cert.year ?? ""}
                onChange={(e) =>
                  updateCertification(i, "year", e.target.value)
                }
                placeholder={t("profile.cert.year")}
                className="w-24"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeCertification(i)}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addCertification}>
            <Plus className="h-4 w-4 mr-1" />
            {t("profile.cert.add")}
          </Button>
        </CardContent>
      </Card>

      {/* Languages */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{t("profile.languages")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {formData.languages.map((lang, i) => (
            <div key={i} className="flex gap-2 items-start">
              <Input
                value={lang.name}
                onChange={(e) =>
                  updateLanguageField(i, "name", e.target.value)
                }
                placeholder={t("profile.languages.name")}
                className="flex-1"
              />
              <Select
                value={lang.proficiency ?? ""}
                onValueChange={(v) =>
                  updateLanguageField(i, "proficiency", v)
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue
                    placeholder={t("profile.languages.proficiency")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {PROFICIENCY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {t(opt.key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeLanguage(i)}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addLanguage}>
            <Plus className="h-4 w-4 mr-1" />
            {t("profile.languages.add")}
          </Button>
        </CardContent>
      </Card>

      {/* Links */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">
            {t("profile.section.languages")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("profile.links.linkedin")}</Label>
            <Input
              value={formData.linkedin}
              onChange={(e) => updateField("linkedin", e.target.value)}
              placeholder="https://linkedin.com/in/..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("profile.links.portfolio")}</Label>
            <Input
              value={formData.portfolio}
              onChange={(e) => updateField("portfolio", e.target.value)}
              placeholder="https://..."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ===================================================================
  // STEP 4: Review & Save
  // ===================================================================

  const renderStep4 = () => {
    const validSkills = formData.skills.filter((s) => s.name.trim());
    const validExperiences = formData.experiences.filter(
      (e) => e.title.trim() || e.company.trim()
    );
    const validEducation = formData.education.filter(
      (ed) => ed.degree.trim() || ed.institution.trim()
    );
    const validCerts = formData.certifications.filter((c) => c.name.trim());
    const validLangs = formData.languages.filter((l) => l.name.trim());

    return (
      <div className="space-y-6">
        {/* Summary Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              {t("profile.section.basicInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span className="text-muted-foreground">
                {t("profile.field.fullName")}
              </span>
              <span>{formData.fullName}</span>
              <span className="text-muted-foreground">
                {t("profile.field.email")}
              </span>
              <span>{formData.email}</span>
              {formData.phone && (
                <>
                  <span className="text-muted-foreground">
                    {t("profile.field.phone")}
                  </span>
                  <span>{formData.phone}</span>
                </>
              )}
              <span className="text-muted-foreground">
                {t("profile.field.headline")}
              </span>
              <span>{formData.headline}</span>
              <span className="text-muted-foreground">
                {t("profile.field.city")}
              </span>
              <span>
                {formData.city}
                {formData.division
                  ? `, ${getLabel(DIVISIONS, formData.division, language)}`
                  : ""}
              </span>
            </div>
            <div className="flex gap-2 pt-2">
              {formData.openToRemote && (
                <Badge variant="secondary">{t("profile.prefs.remote")}</Badge>
              )}
              {formData.willingToRelocate && (
                <Badge variant="secondary">
                  {t("profile.prefs.relocate")}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Skills */}
        {validSkills.length > 0 && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">
                {t("profile.section.skills")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {validSkills.map((s, i) => (
                  <Badge key={i} variant="outline">
                    {s.name}
                    {s.yearsOfExperience !== undefined
                      ? ` (${s.yearsOfExperience}y)`
                      : ""}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Experience */}
        {validExperiences.length > 0 && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">
                {t("profile.section.experience")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {validExperiences.map((exp, i) => (
                <div key={i} className="text-sm">
                  <div className="font-medium">
                    {exp.title}
                    {exp.company ? ` — ${exp.company}` : ""}
                  </div>
                  {(exp.startDate || exp.location) && (
                    <div className="text-muted-foreground text-xs">
                      {exp.startDate && (
                        <span>
                          {exp.startDate}
                          {exp.isCurrent
                            ? ` — ${t("profile.public.present")}`
                            : exp.endDate
                              ? ` — ${exp.endDate}`
                              : ""}
                        </span>
                      )}
                      {exp.location && (
                        <span>
                          {exp.startDate ? " | " : ""}
                          {exp.location}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Education */}
        {validEducation.length > 0 && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">
                {t("profile.education")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {validEducation.map((edu, i) => (
                <div key={i} className="text-sm">
                  <span className="font-medium">{edu.degree}</span>
                  {edu.institution && (
                    <span className="text-muted-foreground">
                      {" "}
                      — {edu.institution}
                    </span>
                  )}
                  {edu.year && (
                    <span className="text-muted-foreground">
                      {" "}
                      ({edu.year})
                    </span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Certifications */}
        {validCerts.length > 0 && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">
                {t("profile.public.certifications")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {validCerts.map((c, i) => (
                  <Badge key={i} variant="outline">
                    {c.name}
                    {c.org ? ` (${c.org})` : ""}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Languages */}
        {validLangs.length > 0 && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">
                {t("profile.languages")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {validLangs.map((l, i) => (
                  <Badge key={i} variant="outline">
                    {l.name}
                    {l.proficiency
                      ? ` — ${t(`profile.languages.${l.proficiency}`)}`
                      : ""}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Settings */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              {t("profile.section.settings")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Bio */}
            <div className="space-y-1.5">
              <Label>{t("profile.field.bio")}</Label>
              <Textarea
                value={formData.bio}
                onChange={(e) => updateField("bio", e.target.value)}
                placeholder={t("profile.field.bioPlaceholder")}
                rows={4}
              />
            </div>

            <Separator />

            {/* Public toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <Label className="text-sm font-medium">
                  {t("profile.settings.public")}
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("profile.settings.publicDesc")}
                </p>
              </div>
              <ToggleSwitch
                value={formData.isPublic}
                onChange={(v) => updateField("isPublic", v)}
              />
            </div>

            {/* Open to opportunities */}
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <Label className="text-sm font-medium">
                  {t("profile.settings.openToWork")}
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("profile.settings.openToWorkDesc")}
                </p>
              </div>
              <ToggleSwitch
                value={formData.isOpenToOpportunities}
                onChange={(v) => updateField("isOpenToOpportunities", v)}
              />
            </div>

            {/* Email notifications */}
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <Label className="text-sm font-medium">
                  {t("profile.settings.notifications")}
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("profile.settings.notificationsDesc")}
                </p>
              </div>
              <ToggleSwitch
                value={formData.emailNotifications}
                onChange={(v) => updateField("emailNotifications", v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Error */}
        {errors._save && (
          <p className="text-sm text-red-500 text-center">{errors._save}</p>
        )}
      </div>
    );
  };

  // ===================================================================
  // Main Render
  // ===================================================================

  return (
    <div>
      <StepIndicator
        currentStep={currentStep}
        completedSteps={completedSteps}
        t={t}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div>
          {/* Step Content */}
          <div className="mb-8">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={goBack}
              disabled={currentStep === 1}
            >
              {t("profile.wizard.back")}
            </Button>

            {currentStep < 4 ? (
              <Button onClick={goNext}>{t("profile.wizard.next")}</Button>
            ) : (
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {saving ? t("profile.wizard.saving") : t("profile.wizard.save")}
              </Button>
            )}
          </div>
        </div>

        {/* Auto-fill sidebar */}
        <div className="hidden lg:block space-y-4 sticky top-20 self-start">
          {/* CV Auto-fill */}
          <div className={cn(
            "rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/5 to-transparent p-4 transition-opacity",
            (urlParsed || urlParsing) && "opacity-50 pointer-events-none"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                <Upload className="size-4 text-primary" />
              </div>
              <h4 className="text-sm font-semibold">{t("apply.cv.title")}</h4>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {t("apply.cv.desc")}
            </p>

            {cvParsed ? (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 mb-3">
                <div className="flex items-center gap-2 text-primary">
                  <Check className="size-4" />
                  <span className="text-xs font-medium">{t("apply.cv.done")}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {t("apply.cv.reviewHint")}
                </p>
              </div>
            ) : cvParsing ? (
              <div className="rounded-lg border border-border bg-muted/30 p-3 mb-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  <span className="text-xs font-medium">{t("apply.cv.analyzing")}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {t("apply.cv.analyzingHint")}
                </p>
              </div>
            ) : null}

            <label
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 cursor-pointer transition-colors",
                cvParsing || urlParsed || urlParsing
                  ? "border-muted pointer-events-none opacity-50"
                  : cvDragging
                    ? "border-primary bg-primary/10 scale-[1.02]"
                    : "border-primary/30 hover:border-primary/60 hover:bg-primary/5"
              )}
              onDragOver={(e) => { e.preventDefault(); if (!cvParsing && !urlParsed && !urlParsing) setCvDragging(true); }}
              onDragEnter={(e) => { e.preventDefault(); if (!cvParsing && !urlParsed && !urlParsing) setCvDragging(true); }}
              onDragLeave={() => setCvDragging(false)}
              onDrop={(e) => {
                e.preventDefault(); setCvDragging(false);
                if (cvParsing || urlParsed || urlParsing) return;
                const f = e.dataTransfer.files?.[0];
                if (f) handleCvUpload(f);
              }}
            >
              <Upload className={cn("size-5", cvDragging ? "text-primary" : "text-muted-foreground")} />
              <span className="text-xs font-medium text-center">
                {cvDragging ? t("apply.cv.dropHere") : cvParsed ? t("apply.cv.uploadAnother") : t("apply.cv.uploadBtn")}
              </span>
              <span className="text-[10px] text-muted-foreground">PDF, DOC, DOCX, JPG, PNG</span>
              <span className="text-[10px] text-primary/70 font-medium">{t("apply.cv.pdfHint")}</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="hidden"
                disabled={cvParsing || urlParsed || urlParsing}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCvUpload(f); e.target.value = ""; }}
              />
            </label>
          </div>

          {/* URL Auto-fill */}
          <div className={cn(
            "rounded-2xl border border-border bg-card p-4 transition-opacity",
            (cvParsed || cvParsing) && "opacity-50 pointer-events-none"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10">
                <Globe className="size-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="text-sm font-semibold">{t("apply.url.title")}</h4>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {t("apply.url.desc")}
            </p>

            {urlParsed ? (
              <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3 mb-3">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Check className="size-4" />
                  <span className="text-xs font-medium">{t("apply.url.done")}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {t("apply.cv.reviewHint")}
                </p>
              </div>
            ) : urlParsing ? (
              <div className="rounded-lg border border-border bg-muted/30 p-3 mb-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin text-blue-600" />
                  <span className="text-xs font-medium">{t("apply.url.analyzing")}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {t("apply.url.analyzingHint")}
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              <input
                type="url"
                value={profileUrl}
                onChange={(e) => setProfileUrl(e.target.value)}
                placeholder={t("apply.url.placeholder")}
                disabled={urlParsing || cvParsed || cvParsing}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/50 focus:outline-none placeholder:text-muted-foreground/60"
              />
              {profileUrl.includes("linkedin.com") && (
                <p className="text-[11px] text-muted-foreground">
                  {t("apply.url.linkedinHint")}
                </p>
              )}
              <Button
                size="sm"
                variant="outline"
                className="w-full rounded-full text-xs"
                disabled={urlParsing || !profileUrl.trim() || cvParsed || cvParsing}
                onClick={handleUrlParse}
              >
                {urlParsing ? (
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Globe className="size-3.5 mr-1.5" />
                )}
                {t("apply.url.analyzeBtn")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
