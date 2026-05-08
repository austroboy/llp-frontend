"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type MutableRefObject,
  type ChangeEvent,
} from "react";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useLanguage } from "@/hooks/use-language";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { fireNotification } from "@/lib/notify";
import {
  DIVISIONS,
  DISTRICTS,
  EXPERIENCE_LEVELS,
  getLabel,
} from "@/lib/profile/constants";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Trash2,
  Upload,
  Download,
  Check,
  AlertCircle,
  Sparkles,
  Crosshair,
  Shield,
  Info,
} from "lucide-react";
import { CountrySelector } from "@/components/ui/country-selector";
import { toast } from "sonner";
import type { Id } from "@convex/_generated/dataModel";

// ---------------------------------------------------------------------------
// Types (unchanged)
// ---------------------------------------------------------------------------

interface Skill {
  name: string;
  yearsOfExperience?: number;
}
interface Education {
  degree: string;
  institution: string;
  fieldOfStudy?: string;
  year?: string;
}
interface Certification {
  name: string;
  org?: string;
  year?: string;
}
interface Experience {
  title: string;
  company: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
  description?: string;
}
interface ProfileLanguage {
  name: string;
  proficiency?: string;
}
interface SocialProfile {
  platform: string;
  url: string;
}

interface HeadhuntingPreferences {
  confidentiality: "anonymous" | "scouts_only" | "open";
  targetRoles?: string[];
  targetFunctions?: string[];
  targetSeniority?: string[];
  minimumSalary?: number;
  blacklistedCompanies?: string[];
  availability: "active" | "open" | "not_now";
  consentTimestamp: number;
}

interface Profile {
  _id: string;
  userId: string;
  slug: string;
  fullName: string;
  email: string;
  phone?: string;
  photo?: string;
  photoUrl?: string;
  headline: string;
  bio?: string;
  country?: string;
  city: string;
  division?: string;
  district?: string;
  willingToRelocate: boolean;
  preferredLocations?: string[];
  openToRemote: boolean;
  currentDesignation?: string;
  currentOrganization?: string;
  totalExperienceYears?: number;
  experienceLevel?: string;
  skills: Skill[];
  education: Education[];
  certifications: Certification[];
  experiences: Experience[];
  languages?: ProfileLanguage[];
  linkedin?: string;
  portfolio?: string;
  socialProfiles?: SocialProfile[];
  cvFileId?: string;
  cvFileName?: string;
  isPublic: boolean;
  isOpenToOpportunities: boolean;
  emailNotifications: boolean;
  headhuntingPreferences?: HeadhuntingPreferences;
  completionPercentage: number;
  status: "draft" | "complete";
  createdAt: number;
  updatedAt: number;
}

interface HeadhuntingFormData {
  confidentiality: "anonymous" | "scouts_only" | "open";
  targetRoles: string;
  targetFunctions: string;
  targetSeniority: string[];
  minimumSalary: string;
  blacklistedCompanies: string;
  availability: "active" | "open" | "not_now";
}

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  headline: string;
  bio: string;
  country: string;
  city: string;
  division: string;
  district: string;
  willingToRelocate: boolean;
  preferredLocations: string[];
  openToRemote: boolean;
  currentDesignation: string;
  currentOrganization: string;
  totalExperienceYears: string;
  experienceLevel: string;
  skills: Skill[];
  education: Education[];
  certifications: Certification[];
  experiences: Experience[];
  languages: ProfileLanguage[];
  linkedin: string;
  portfolio: string;
  socialProfiles: SocialProfile[];
  isPublic: boolean;
  isOpenToOpportunities: boolean;
  emailNotifications: boolean;
  headhunting: HeadhuntingFormData;
}

interface ProfileEditorProps {
  profile: Profile;
  sectionRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
  expandSectionRef?: MutableRefObject<((id: string) => void) | null>;
  onGenerateCv?: () => void;
}

// ---------------------------------------------------------------------------
// Section IDs
// ---------------------------------------------------------------------------

const SECTION_IDS = [
  "basicInfo",
  "skills",
  "experience",
  "education",
  "languages",
  "headhunting",
  "settings",
] as const;
type SectionId = (typeof SECTION_IDS)[number];

const SECTION_LABELS: Record<SectionId, string> = {
  basicInfo: "profile.editor.basicInfo",
  skills: "profile.editor.skills",
  experience: "profile.editor.experience",
  education: "profile.editor.education",
  languages: "profile.editor.languages",
  headhunting: "profile.editor.headhunting",
  settings: "profile.editor.settings",
};

const PROFICIENCY_OPTIONS = [
  { value: "native", key: "profile.editor.proficiency.native" },
  { value: "fluent", key: "profile.editor.proficiency.fluent" },
  { value: "advanced", key: "profile.editor.proficiency.advanced" },
  { value: "intermediate", key: "profile.editor.proficiency.intermediate" },
  { value: "basic", key: "profile.editor.proficiency.basic" },
];

const SENIORITY_OPTIONS = [
  { value: "entry", key: "profile.editor.headhunting.seniority.entry" },
  { value: "mid", key: "profile.editor.headhunting.seniority.mid" },
  { value: "senior", key: "profile.editor.headhunting.seniority.senior" },
  { value: "lead", key: "profile.editor.headhunting.seniority.lead" },
  { value: "director", key: "profile.editor.headhunting.seniority.director" },
  { value: "vp", key: "profile.editor.headhunting.seniority.vp" },
  { value: "cxo", key: "profile.editor.headhunting.seniority.cxo" },
];

const DEFAULT_HEADHUNTING: HeadhuntingFormData = {
  confidentiality: "anonymous",
  targetRoles: "",
  targetFunctions: "",
  targetSeniority: [],
  minimumSalary: "",
  blacklistedCompanies: "",
  availability: "open",
};

// ---------------------------------------------------------------------------
// Helpers (unchanged)
// ---------------------------------------------------------------------------

function profileToForm(p: Profile): FormData {
  return {
    fullName: p.fullName,
    email: p.email,
    phone: p.phone ?? "",
    headline: p.headline,
    bio: p.bio ?? "",
    country: p.country ?? "BD",
    city: p.city,
    division: p.division ?? "",
    district: p.district ?? "",
    willingToRelocate: p.willingToRelocate,
    preferredLocations: p.preferredLocations ?? [],
    openToRemote: p.openToRemote,
    currentDesignation: p.currentDesignation ?? "",
    currentOrganization: p.currentOrganization ?? "",
    totalExperienceYears:
      p.totalExperienceYears != null ? String(p.totalExperienceYears) : "",
    experienceLevel: p.experienceLevel ?? "",
    skills: p.skills.length > 0 ? [...p.skills] : [],
    education: p.education.length > 0 ? [...p.education] : [],
    certifications: p.certifications.length > 0 ? [...p.certifications] : [],
    experiences: p.experiences.length > 0 ? [...p.experiences] : [],
    languages: p.languages && p.languages.length > 0 ? [...p.languages] : [],
    linkedin: p.linkedin ?? "",
    portfolio: p.portfolio ?? "",
    socialProfiles:
      p.socialProfiles && p.socialProfiles.length > 0
        ? [...p.socialProfiles]
        : [],
    isPublic: p.isPublic,
    isOpenToOpportunities: p.isOpenToOpportunities,
    emailNotifications: p.emailNotifications,
    headhunting: p.headhuntingPreferences
      ? {
          confidentiality: p.headhuntingPreferences.confidentiality,
          targetRoles: (p.headhuntingPreferences.targetRoles ?? []).join(", "),
          targetFunctions: (p.headhuntingPreferences.targetFunctions ?? []).join(", "),
          targetSeniority: p.headhuntingPreferences.targetSeniority ?? [],
          minimumSalary: p.headhuntingPreferences.minimumSalary != null ? String(p.headhuntingPreferences.minimumSalary) : "",
          blacklistedCompanies: (p.headhuntingPreferences.blacklistedCompanies ?? []).join(", "),
          availability: p.headhuntingPreferences.availability,
        }
      : { ...DEFAULT_HEADHUNTING },
  };
}

function formDataChanged(a: FormData, b: FormData): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}

// ---------------------------------------------------------------------------
// Toggle Switch (lf-toggle)
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
      className={cn("lf-toggle", value && "lf-toggle--on")}
    >
      <span className="lf-toggle-knob" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ProfileEditor({ profile, sectionRefs, expandSectionRef, onGenerateCv }: ProfileEditorProps) {
  const { user } = useUser();
  const { t, language } = useLanguage();

  // Convex mutations
  const updateProfile = useMutation(api.professionalProfiles.update);
  const updatePhoto = useMutation(api.professionalProfiles.updatePhoto);
  const uploadCV = useMutation(api.professionalProfiles.uploadCV);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const togglePublic = useMutation(api.professionalProfiles.togglePublic);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const toggleOpenToWork = useMutation(
    api.professionalProfiles.toggleOpenToWork
  );
  const removeProfile = useMutation(api.professionalProfiles.remove);
  const generateUploadUrl = useMutation(
    api.professionalProfiles.generateUploadUrl
  );

  // Photo URL query
  const photoUrl = useQuery(
    api.professionalProfiles.getPhotoUrl,
    profile.photo ? { photoId: profile.photo as Id<"_storage"> } : "skip"
  );
  // CV URL query
  const cvUrl = useQuery(
    api.professionalProfiles.getCvUrl,
    profile.cvFileId ? { fileId: profile.cvFileId as Id<"_storage"> } : "skip"
  );

  // Form state
  const [formData, setFormData] = useState<FormData>(() =>
    profileToForm(profile)
  );
  const [originalData, setOriginalData] = useState<FormData>(() =>
    profileToForm(profile)
  );
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({ basicInfo: true });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<
    "success" | "error" | null
  >(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cvUploading, setCvUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cvInputRef = useRef<HTMLInputElement>(null);

  // Sync form when profile prop changes (e.g., after photo/CV upload)
  useEffect(() => {
    const newData = profileToForm(profile);
    setFormData(newData);
    setOriginalData(newData);
  }, [profile]);

  const isDirty = formDataChanged(formData, originalData);

  // Section toggle
  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Expand a section programmatically (used when completion card triggers scroll)
  const expandSection = useCallback((id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: true }));
  }, []);

  // Expose expandSection to parent via ref
  useEffect(() => {
    if (expandSectionRef) {
      expandSectionRef.current = expandSection;
    }
  }, [expandSectionRef, expandSection]);

  // Register section ref + handle expand on scroll
  const setSectionRef = useCallback(
    (id: string, el: HTMLDivElement | null) => {
      sectionRefs.current[id] = el;
    },
    [sectionRefs]
  );

  // Generic field updater
  const updateField = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Photo upload
  // ---------------------------------------------------------------------------

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/") || !user) return;
    if (file.size > 5 * 1024 * 1024) return; // 5MB max

    const localUrl = URL.createObjectURL(file);
    setPhotoPreview(localUrl);

    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      await updatePhoto({ userId: user.id, photoId: storageId });
    } catch {
      setPhotoPreview(null);
    }
  };

  // ---------------------------------------------------------------------------
  // CV upload
  // ---------------------------------------------------------------------------

  const handleCvUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setCvUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      await uploadCV({
        userId: user.id,
        fileId: storageId,
        fileName: file.name,
      });
      toast.success(t("profile.editor.cvUploadSuccess"));
    } catch {
      toast.error(t("profile.editor.cvUploadError"));
    } finally {
      setCvUploading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile({
        userId: user.id,
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone || undefined,
        headline: formData.headline,
        bio: formData.bio || undefined,
        country: formData.country || undefined,
        city: formData.city,
        division: formData.country === "BD" ? formData.division || undefined : undefined,
        district: formData.country === "BD" ? formData.district || undefined : undefined,
        willingToRelocate: formData.willingToRelocate,
        preferredLocations:
          formData.preferredLocations.length > 0
            ? formData.preferredLocations
            : undefined,
        openToRemote: formData.openToRemote,
        currentDesignation: formData.currentDesignation || undefined,
        currentOrganization: formData.currentOrganization || undefined,
        totalExperienceYears: formData.totalExperienceYears
          ? Number(formData.totalExperienceYears)
          : undefined,
        experienceLevel: formData.experienceLevel || undefined,
        skills: formData.skills,
        education: formData.education,
        certifications: formData.certifications,
        experiences: formData.experiences,
        languages:
          formData.languages.length > 0 ? formData.languages : undefined,
        linkedin: formData.linkedin || undefined,
        portfolio: formData.portfolio || undefined,
        socialProfiles:
          formData.socialProfiles.length > 0
            ? formData.socialProfiles
            : undefined,
        isPublic: formData.isPublic,
        isOpenToOpportunities: formData.isOpenToOpportunities,
        emailNotifications: formData.emailNotifications,
        headhuntingPreferences: formData.isOpenToOpportunities
          ? {
              confidentiality: formData.headhunting.confidentiality,
              targetRoles: formData.headhunting.targetRoles
                ? formData.headhunting.targetRoles.split(",").map((s) => s.trim()).filter(Boolean)
                : undefined,
              targetFunctions: formData.headhunting.targetFunctions
                ? formData.headhunting.targetFunctions.split(",").map((s) => s.trim()).filter(Boolean)
                : undefined,
              targetSeniority: formData.headhunting.targetSeniority.length > 0
                ? formData.headhunting.targetSeniority
                : undefined,
              minimumSalary: formData.headhunting.minimumSalary
                ? Number(formData.headhunting.minimumSalary)
                : undefined,
              blacklistedCompanies: formData.headhunting.blacklistedCompanies
                ? formData.headhunting.blacklistedCompanies.split(",").map((s) => s.trim()).filter(Boolean)
                : undefined,
              availability: formData.headhunting.availability,
              consentTimestamp: Date.now(),
            }
          : undefined,
      });
      setOriginalData({ ...formData });
      // Check profile completion milestones
      const oldPct = profile.completionPercentage ?? 0;
      // Rough estimation: Convex recomputes on save, so we notify based on old value
      if (oldPct < 50 && user?.primaryEmailAddress?.emailAddress) {
        fireNotification("profile_milestone", {
          userName: formData.fullName,
          userEmail: user.primaryEmailAddress.emailAddress,
          milestone: 50,
        });
      } else if (oldPct < 75 && oldPct >= 50 && user?.primaryEmailAddress?.emailAddress) {
        fireNotification("profile_milestone", {
          userName: formData.fullName,
          userEmail: user.primaryEmailAddress.emailAddress,
          milestone: 75,
        });
      }
      setSaveMessage("success");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      setSaveMessage("error");
      setTimeout(() => setSaveMessage(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Delete profile
  // ---------------------------------------------------------------------------

  const handleDelete = async () => {
    if (!user) return;
    try {
      await removeProfile({ userId: user.id });
    } catch {
      setSaveMessage("error");
      setTimeout(() => setSaveMessage(null), 5000);
    }
  };

  // ---------------------------------------------------------------------------
  // Section Header
  // ---------------------------------------------------------------------------

  function SectionHeader({
    id,
    children,
  }: {
    id: SectionId;
    children?: React.ReactNode;
  }) {
    const isOpen = expandedSections[id] ?? false;
    return (
      <button
        type="button"
        onClick={() => toggleSection(id)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--s-3) var(--s-4)",
          cursor: "pointer",
          background: "transparent",
          border: 0,
          textAlign: "left",
          color: "inherit",
          fontFamily: "inherit",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isOpen ? (
            <ChevronDown className="size-4" style={{ color: "var(--ink-4)" }} />
          ) : (
            <ChevronRight className="size-4" style={{ color: "var(--ink-4)" }} />
          )}
          <span
            style={{
              fontFamily: "var(--lf-display)",
              fontSize: 15,
              fontWeight: 500,
              color: "var(--ink)",
            }}
          >
            {t(SECTION_LABELS[id])}
          </span>
          {children}
        </div>
      </button>
    );
  }

  // ---------------------------------------------------------------------------
  // Array helpers (unchanged)
  // ---------------------------------------------------------------------------

  function addSkill() {
    updateField("skills", [
      ...formData.skills,
      { name: "", yearsOfExperience: undefined },
    ]);
  }
  function removeSkill(idx: number) {
    updateField(
      "skills",
      formData.skills.filter((_, i) => i !== idx)
    );
  }
  function updateSkill(idx: number, field: keyof Skill, value: string | number | undefined) {
    const updated = [...formData.skills];
    updated[idx] = { ...updated[idx], [field]: value };
    updateField("skills", updated);
  }

  function addExperience() {
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
  }
  function removeExperience(idx: number) {
    updateField(
      "experiences",
      formData.experiences.filter((_, i) => i !== idx)
    );
  }
  function updateExperience(
    idx: number,
    field: keyof Experience,
    value: string | boolean
  ) {
    const updated = [...formData.experiences];
    updated[idx] = { ...updated[idx], [field]: value };
    updateField("experiences", updated);
  }

  function addEducation() {
    updateField("education", [
      ...formData.education,
      { degree: "", institution: "", fieldOfStudy: "", year: "" },
    ]);
  }
  function removeEducation(idx: number) {
    updateField(
      "education",
      formData.education.filter((_, i) => i !== idx)
    );
  }
  function updateEducation(
    idx: number,
    field: keyof Education,
    value: string
  ) {
    const updated = [...formData.education];
    updated[idx] = { ...updated[idx], [field]: value };
    updateField("education", updated);
  }

  function addCertification() {
    updateField("certifications", [
      ...formData.certifications,
      { name: "", org: "", year: "" },
    ]);
  }
  function removeCertification(idx: number) {
    updateField(
      "certifications",
      formData.certifications.filter((_, i) => i !== idx)
    );
  }
  function updateCertification(
    idx: number,
    field: keyof Certification,
    value: string
  ) {
    const updated = [...formData.certifications];
    updated[idx] = { ...updated[idx], [field]: value };
    updateField("certifications", updated);
  }

  function addLanguage() {
    updateField("languages", [
      ...formData.languages,
      { name: "", proficiency: "" },
    ]);
  }
  function removeLanguage(idx: number) {
    updateField(
      "languages",
      formData.languages.filter((_, i) => i !== idx)
    );
  }
  function updateLanguageField(
    idx: number,
    field: keyof ProfileLanguage,
    value: string
  ) {
    const updated = [...formData.languages];
    updated[idx] = { ...updated[idx], [field]: value };
    updateField("languages", updated);
  }

  function addSocial() {
    updateField("socialProfiles", [
      ...formData.socialProfiles,
      { platform: "", url: "" },
    ]);
  }
  function removeSocial(idx: number) {
    updateField(
      "socialProfiles",
      formData.socialProfiles.filter((_, i) => i !== idx)
    );
  }
  function updateSocial(
    idx: number,
    field: keyof SocialProfile,
    value: string
  ) {
    const updated = [...formData.socialProfiles];
    updated[idx] = { ...updated[idx], [field]: value };
    updateField("socialProfiles", updated);
  }

  // District options cascade based on selected division
  const districtOptions = formData.division
    ? DISTRICTS[formData.division] ?? []
    : [];

  // Resolve photo display URL: local preview > Convex storage > stored URL (Clerk)
  const displayPhotoUrl = photoPreview ?? photoUrl ?? profile.photoUrl ?? null;

  // ---------------------------------------------------------------------------
  // Render — wrapped in lf-* glass surfaces
  // ---------------------------------------------------------------------------

  // Inline helpers for repeated layout fragments
  const sectionShellStyle: React.CSSProperties = {
    padding: 0,
    overflow: "hidden",
  };
  const sectionBodyStyle: React.CSSProperties = {
    padding: "0 var(--s-4) var(--s-4)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--s-3)",
  };
  const grid2: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "var(--s-3)",
  };
  const grid3: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "var(--s-3)",
  };
  const labeledFieldStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  };

  const countCount = (n: number) => (
    <span
      className="lf-tag"
      style={{ marginLeft: 8, fontFamily: "var(--lf-mono)", fontSize: 10 }}
    >
      {n}
    </span>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
      {/* Save feedback banner */}
      {saveMessage && (
        <div
          className="lf-card"
          style={{
            padding: "var(--s-3)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderColor:
              saveMessage === "success"
                ? "color-mix(in oklab, var(--emerald) 32%, var(--glass-border))"
                : "color-mix(in oklab, var(--rust) 32%, var(--glass-border))",
            background:
              saveMessage === "success"
                ? "color-mix(in oklab, var(--emerald) 10%, var(--glass-bg))"
                : "var(--rust-ghost)",
            color: saveMessage === "success" ? "var(--emerald)" : "var(--rust)",
            fontFamily: "var(--lf-display)",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {saveMessage === "success" ? (
            <Check className="size-4" />
          ) : (
            <AlertCircle className="size-4" />
          )}
          {saveMessage === "success"
            ? t("profile.editor.saved")
            : t("profile.editor.saveError")}
        </div>
      )}

      {/* ==== Section 1: Basic Info ==== */}
      <div
        ref={(el) => setSectionRef("basicInfo", el)}
        className="lf-card lf-card--feature"
        style={sectionShellStyle}
      >
        <SectionHeader id="basicInfo">
          {countCount(formData.fullName ? 1 : 0)}
        </SectionHeader>
        {expandedSections.basicInfo && (
          <div style={sectionBodyStyle}>
            {/* Photo */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--s-3)",
              }}
            >
              <div
                className="lf-avatar"
                style={{ width: 64, height: 64, fontSize: 22 }}
              >
                {displayPhotoUrl ? (
                  <Image
                    src={displayPhotoUrl}
                    alt="Profile"
                    width={64}
                    height={64}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span>
                    {formData.fullName?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                )}
              </div>
              <div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
                  onChange={handlePhotoUpload}
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="lf-cta lf-cta--ghost"
                >
                  <Upload className="size-3.5" />
                  {t("profile.editor.uploadPhoto")}
                </button>
                <p
                  style={{
                    fontFamily: "var(--lf-mono)",
                    fontSize: 10,
                    color: "var(--ink-4)",
                    letterSpacing: "0.06em",
                    marginTop: 6,
                  }}
                >
                  {t("profile.editor.photoHint")}
                </p>
              </div>
            </div>

            {/* Name + Email */}
            <div style={grid2}>
              <div style={labeledFieldStyle}>
                <Label className="lf-field-label">
                  {t("profile.field.fullName")}
                </Label>
                <Input
                  value={formData.fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                  className="lf-input"
                />
              </div>
              <div style={labeledFieldStyle}>
                <Label className="lf-field-label">
                  {t("profile.field.email")}
                </Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="lf-input"
                />
              </div>
            </div>

            {/* Phone + Headline */}
            <div style={grid2}>
              <div style={labeledFieldStyle}>
                <Label className="lf-field-label">
                  {t("profile.field.phone")}
                </Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+880..."
                  className="lf-input"
                />
              </div>
              <div style={labeledFieldStyle}>
                <Label className="lf-field-label">
                  {t("profile.field.headline")}
                </Label>
                <Input
                  value={formData.headline}
                  onChange={(e) => updateField("headline", e.target.value)}
                  placeholder={t("profile.field.headlinePlaceholder")}
                  className="lf-input"
                />
              </div>
            </div>

            {/* Bio */}
            <div style={labeledFieldStyle}>
              <Label className="lf-field-label">{t("profile.field.bio")}</Label>
              <Textarea
                rows={4}
                value={formData.bio}
                onChange={(e) => updateField("bio", e.target.value)}
                placeholder={t("profile.field.bioPlaceholder")}
                className="lf-input"
                style={{ height: "auto", borderRadius: 12, padding: "10px 14px" }}
              />
              <p
                style={{
                  fontFamily: "var(--lf-mono)",
                  fontSize: 10,
                  color: "var(--ink-4)",
                  letterSpacing: "0.06em",
                }}
              >
                {formData.bio.length}/500
              </p>
            </div>

            {/* Current role */}
            <div style={grid2}>
              <div style={labeledFieldStyle}>
                <Label className="lf-field-label">
                  {t("profile.field.currentDesignation")}
                </Label>
                <Input
                  value={formData.currentDesignation}
                  onChange={(e) =>
                    updateField("currentDesignation", e.target.value)
                  }
                  className="lf-input"
                />
              </div>
              <div style={labeledFieldStyle}>
                <Label className="lf-field-label">
                  {t("profile.field.currentOrganization")}
                </Label>
                <Input
                  value={formData.currentOrganization}
                  onChange={(e) =>
                    updateField("currentOrganization", e.target.value)
                  }
                  className="lf-input"
                />
              </div>
            </div>

            {/* Experience level + years */}
            <div style={grid2}>
              <div style={labeledFieldStyle}>
                <Label className="lf-field-label">
                  {t("profile.field.experienceLevel")}
                </Label>
                <Select
                  value={formData.experienceLevel}
                  onValueChange={(v) => updateField("experienceLevel", v)}
                >
                  <SelectTrigger className="lf-select-trigger">
                    <SelectValue
                      placeholder={t("profile.field.experienceLevel")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_LEVELS.map((lvl) => (
                      <SelectItem key={lvl.value} value={lvl.value}>
                        {getLabel(EXPERIENCE_LEVELS, lvl.value, language)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div style={labeledFieldStyle}>
                <Label className="lf-field-label">
                  {t("profile.field.totalExperienceYears")}
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={formData.totalExperienceYears}
                  onChange={(e) =>
                    updateField("totalExperienceYears", e.target.value)
                  }
                  className="lf-input"
                />
              </div>
            </div>

            {/* Location */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  formData.country === "BD" ? "1fr 1fr 1fr 1fr" : "1fr 1fr",
                gap: "var(--s-3)",
              }}
            >
              <div style={labeledFieldStyle}>
                <Label className="lf-field-label">
                  {t("profile.field.country")}
                </Label>
                <CountrySelector
                  value={formData.country}
                  onChange={(v) => {
                    updateField("country", v);
                    if (v !== "BD") {
                      updateField("division", "");
                      updateField("district", "");
                    }
                  }}
                  placeholder={t("profile.field.country")}
                />
              </div>
              <div style={labeledFieldStyle}>
                <Label className="lf-field-label">{t("profile.field.city")}</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  className="lf-input"
                />
              </div>
              {formData.country === "BD" && (
                <>
                  <div style={labeledFieldStyle}>
                    <Label className="lf-field-label">
                      {t("profile.field.division")}
                    </Label>
                    <Select
                      value={formData.division}
                      onValueChange={(v) => {
                        updateField("division", v);
                        updateField("district", "");
                      }}
                    >
                      <SelectTrigger className="lf-select-trigger">
                        <SelectValue
                          placeholder={t("profile.field.division")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {DIVISIONS.map((d) => (
                          <SelectItem key={d.value} value={d.value}>
                            {getLabel(DIVISIONS, d.value, language)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div style={labeledFieldStyle}>
                    <Label className="lf-field-label">
                      {t("profile.field.district")}
                    </Label>
                    <Select
                      value={formData.district}
                      onValueChange={(v) => updateField("district", v)}
                      disabled={districtOptions.length === 0}
                    >
                      <SelectTrigger className="lf-select-trigger">
                        <SelectValue
                          placeholder={t("profile.field.district")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {districtOptions.map((d) => (
                          <SelectItem key={d.value} value={d.value}>
                            {getLabel(districtOptions, d.value, language)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            {/* Remote + Relocate toggles */}
            <div style={grid2}>
              <div
                className="lf-card"
                style={{
                  padding: "var(--s-3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Label
                  style={{
                    fontFamily: "var(--lf-display)",
                    fontSize: 14,
                    color: "var(--ink)",
                    margin: 0,
                  }}
                >
                  {t("profile.field.openToRemote")}
                </Label>
                <ToggleSwitch
                  value={formData.openToRemote}
                  onChange={(v) => updateField("openToRemote", v)}
                />
              </div>
              <div
                className="lf-card"
                style={{
                  padding: "var(--s-3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Label
                  style={{
                    fontFamily: "var(--lf-display)",
                    fontSize: 14,
                    color: "var(--ink)",
                    margin: 0,
                  }}
                >
                  {t("profile.field.willingToRelocate")}
                </Label>
                <ToggleSwitch
                  value={formData.willingToRelocate}
                  onChange={(v) => updateField("willingToRelocate", v)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==== Section 2: Skills ==== */}
      <div
        ref={(el) => setSectionRef("skills", el)}
        className="lf-card lf-card--feature"
        style={sectionShellStyle}
      >
        <SectionHeader id="skills">{countCount(formData.skills.length)}</SectionHeader>
        {expandedSections.skills && (
          <div style={sectionBodyStyle}>
            <div style={grid2}>
              {formData.skills.map((skill, idx) => (
                <div
                  key={idx}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <Input
                    style={{ flex: 1, minWidth: 0 }}
                    placeholder={t("profile.editor.skillName")}
                    value={skill.name}
                    onChange={(e) => updateSkill(idx, "name", e.target.value)}
                    className="lf-input"
                  />
                  <Input
                    type="number"
                    style={{ width: 80 }}
                    placeholder={t("profile.editor.years")}
                    min={0}
                    max={50}
                    value={skill.yearsOfExperience ?? ""}
                    onChange={(e) =>
                      updateSkill(
                        idx,
                        "yearsOfExperience",
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    className="lf-input"
                  />
                  <button
                    type="button"
                    onClick={() => removeSkill(idx)}
                    className="lf-icon-btn"
                    style={{ flexShrink: 0, color: "var(--rust)" }}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addSkill}
              className="lf-cta lf-cta--ghost"
              style={{ alignSelf: "flex-start" }}
            >
              <Plus className="size-3.5" />
              {t("profile.editor.addSkill")}
            </button>
          </div>
        )}
      </div>

      {/* ==== Section 3: Work Experience ==== */}
      <div
        ref={(el) => setSectionRef("experience", el)}
        className="lf-card lf-card--feature"
        style={sectionShellStyle}
      >
        <SectionHeader id="experience">
          {countCount(formData.experiences.length)}
        </SectionHeader>
        {expandedSections.experience && (
          <div style={sectionBodyStyle}>
            {formData.experiences.map((exp, idx) => (
              <div
                key={idx}
                className="lf-card"
                style={{
                  padding: "var(--s-3)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--s-2)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--lf-mono)",
                      fontSize: 10,
                      color: "var(--ink-4)",
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      fontWeight: 500,
                    }}
                  >
                    {t("profile.editor.experience")} #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeExperience(idx)}
                    className="lf-icon-btn"
                    style={{ color: "var(--rust)" }}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <div style={grid2}>
                  <div style={labeledFieldStyle}>
                    <Label className="lf-field-label">
                      {t("profile.editor.jobTitle")}
                    </Label>
                    <Input
                      value={exp.title}
                      onChange={(e) =>
                        updateExperience(idx, "title", e.target.value)
                      }
                      className="lf-input"
                    />
                  </div>
                  <div style={labeledFieldStyle}>
                    <Label className="lf-field-label">
                      {t("profile.editor.company")}
                    </Label>
                    <Input
                      value={exp.company}
                      onChange={(e) =>
                        updateExperience(idx, "company", e.target.value)
                      }
                      className="lf-input"
                    />
                  </div>
                </div>
                <div style={grid3}>
                  <div style={labeledFieldStyle}>
                    <Label className="lf-field-label">
                      {t("profile.editor.location")}
                    </Label>
                    <Input
                      value={exp.location ?? ""}
                      onChange={(e) =>
                        updateExperience(idx, "location", e.target.value)
                      }
                      className="lf-input"
                    />
                  </div>
                  <div style={labeledFieldStyle}>
                    <Label className="lf-field-label">
                      {t("profile.editor.startDate")}
                    </Label>
                    <Input
                      type="month"
                      value={exp.startDate ?? ""}
                      onChange={(e) =>
                        updateExperience(idx, "startDate", e.target.value)
                      }
                      className="lf-input"
                    />
                  </div>
                  <div style={labeledFieldStyle}>
                    <Label className="lf-field-label">
                      {t("profile.editor.endDate")}
                    </Label>
                    <Input
                      type="month"
                      value={exp.endDate ?? ""}
                      disabled={exp.isCurrent}
                      onChange={(e) =>
                        updateExperience(idx, "endDate", e.target.value)
                      }
                      className="lf-input"
                    />
                  </div>
                </div>
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={exp.isCurrent}
                    onChange={(e) =>
                      updateExperience(idx, "isCurrent", e.target.checked)
                    }
                    style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
                  />
                  <span className={cn("lf-check", exp.isCurrent && "lf-check--on")}>
                    {exp.isCurrent && (
                      <svg viewBox="0 0 16 16" fill="none" width="10" height="10">
                        <path
                          d="M3 8l3 3 7-7"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <Label
                    style={{
                      fontFamily: "var(--lf-display)",
                      fontSize: 13,
                      color: "var(--ink-2)",
                      margin: 0,
                    }}
                  >
                    {t("profile.editor.currentlyWorking")}
                  </Label>
                </label>
                <div style={labeledFieldStyle}>
                  <Label className="lf-field-label">
                    {t("profile.editor.description")}
                  </Label>
                  <Textarea
                    rows={2}
                    value={exp.description ?? ""}
                    onChange={(e) =>
                      updateExperience(idx, "description", e.target.value)
                    }
                    className="lf-input"
                    style={{ height: "auto", borderRadius: 12, padding: "10px 14px" }}
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addExperience}
              className="lf-cta lf-cta--ghost"
              style={{ alignSelf: "flex-start" }}
            >
              <Plus className="size-3.5" />
              {t("profile.editor.addExperience")}
            </button>
          </div>
        )}
      </div>

      {/* ==== Section 4: Education & Certifications ==== */}
      <div
        ref={(el) => setSectionRef("education", el)}
        className="lf-card lf-card--feature"
        style={sectionShellStyle}
      >
        <SectionHeader id="education">
          {countCount(formData.education.length + formData.certifications.length)}
        </SectionHeader>
        {expandedSections.education && (
          <div style={sectionBodyStyle}>
            {/* Education subsection */}
            <div className="dash-section-header">
              <h3 className="dash-section-title">
                {t("profile.editor.educationLabel")}
              </h3>
            </div>
            {formData.education.map((edu, idx) => (
              <div
                key={idx}
                className="lf-card"
                style={{
                  padding: "var(--s-3)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--s-2)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--lf-mono)",
                      fontSize: 10,
                      color: "var(--ink-4)",
                      letterSpacing: "0.12em",
                    }}
                  >
                    #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeEducation(idx)}
                    className="lf-icon-btn"
                    style={{ color: "var(--rust)" }}
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div style={grid2}>
                  <div style={labeledFieldStyle}>
                    <Label className="lf-field-label">
                      {t("profile.editor.degree")}
                    </Label>
                    <Input
                      value={edu.degree}
                      onChange={(e) =>
                        updateEducation(idx, "degree", e.target.value)
                      }
                      className="lf-input"
                    />
                  </div>
                  <div style={labeledFieldStyle}>
                    <Label className="lf-field-label">
                      {t("profile.editor.institution")}
                    </Label>
                    <Input
                      value={edu.institution}
                      onChange={(e) =>
                        updateEducation(idx, "institution", e.target.value)
                      }
                      className="lf-input"
                    />
                  </div>
                </div>
                <div style={grid2}>
                  <div style={labeledFieldStyle}>
                    <Label className="lf-field-label">
                      {t("profile.editor.fieldOfStudy")}
                    </Label>
                    <Input
                      value={edu.fieldOfStudy ?? ""}
                      onChange={(e) =>
                        updateEducation(idx, "fieldOfStudy", e.target.value)
                      }
                      className="lf-input"
                    />
                  </div>
                  <div style={labeledFieldStyle}>
                    <Label className="lf-field-label">
                      {t("profile.editor.year")}
                    </Label>
                    <Input
                      value={edu.year ?? ""}
                      onChange={(e) =>
                        updateEducation(idx, "year", e.target.value)
                      }
                      placeholder="2024"
                      className="lf-input"
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addEducation}
              className="lf-cta lf-cta--ghost"
              style={{ alignSelf: "flex-start" }}
            >
              <Plus className="size-3.5" />
              {t("profile.editor.addEducation")}
            </button>

            {/* Certifications subsection */}
            <div className="dash-section-header" style={{ marginTop: "var(--s-3)" }}>
              <h3 className="dash-section-title">
                {t("profile.editor.certificationsLabel")}
              </h3>
            </div>
            {formData.certifications.map((cert, idx) => (
              <div
                key={idx}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <Input
                  style={{ flex: 1 }}
                  placeholder={t("profile.editor.certName")}
                  value={cert.name}
                  onChange={(e) =>
                    updateCertification(idx, "name", e.target.value)
                  }
                  className="lf-input"
                />
                <Input
                  style={{ width: 160 }}
                  placeholder={t("profile.editor.certOrg")}
                  value={cert.org ?? ""}
                  onChange={(e) =>
                    updateCertification(idx, "org", e.target.value)
                  }
                  className="lf-input"
                />
                <Input
                  style={{ width: 80 }}
                  placeholder={t("profile.editor.year")}
                  value={cert.year ?? ""}
                  onChange={(e) =>
                    updateCertification(idx, "year", e.target.value)
                  }
                  className="lf-input"
                />
                <button
                  type="button"
                  onClick={() => removeCertification(idx)}
                  className="lf-icon-btn"
                  style={{ color: "var(--rust)" }}
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addCertification}
              className="lf-cta lf-cta--ghost"
              style={{ alignSelf: "flex-start" }}
            >
              <Plus className="size-3.5" />
              {t("profile.editor.addCertification")}
            </button>
          </div>
        )}
      </div>

      {/* ==== Section 5: Languages & Links ==== */}
      <div
        ref={(el) => setSectionRef("languages", el)}
        className="lf-card lf-card--feature"
        style={sectionShellStyle}
      >
        <SectionHeader id="languages" />
        {expandedSections.languages && (
          <div style={sectionBodyStyle}>
            <div className="dash-section-header">
              <h3 className="dash-section-title">
                {t("profile.editor.languagesLabel")}
              </h3>
            </div>
            {formData.languages.map((lang, idx) => (
              <div
                key={idx}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <Input
                  style={{ flex: 1 }}
                  placeholder={t("profile.editor.langName")}
                  value={lang.name}
                  onChange={(e) =>
                    updateLanguageField(idx, "name", e.target.value)
                  }
                  className="lf-input"
                />
                <Select
                  value={lang.proficiency ?? ""}
                  onValueChange={(v) =>
                    updateLanguageField(idx, "proficiency", v)
                  }
                >
                  <SelectTrigger className="lf-select-trigger" style={{ width: 160 }}>
                    <SelectValue
                      placeholder={t("profile.editor.proficiency")}
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
                <button
                  type="button"
                  onClick={() => removeLanguage(idx)}
                  className="lf-icon-btn"
                  style={{ color: "var(--rust)" }}
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addLanguage}
              className="lf-cta lf-cta--ghost"
              style={{ alignSelf: "flex-start" }}
            >
              <Plus className="size-3.5" />
              {t("profile.editor.addLanguage")}
            </button>

            <div className="dash-section-header" style={{ marginTop: "var(--s-3)" }}>
              <h3 className="dash-section-title">
                {t("profile.editor.linksLabel")}
              </h3>
            </div>
            <div style={grid2}>
              <div style={labeledFieldStyle}>
                <Label className="lf-field-label">LinkedIn</Label>
                <Input
                  value={formData.linkedin}
                  onChange={(e) => updateField("linkedin", e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  className="lf-input"
                />
              </div>
              <div style={labeledFieldStyle}>
                <Label className="lf-field-label">Portfolio</Label>
                <Input
                  value={formData.portfolio}
                  onChange={(e) => updateField("portfolio", e.target.value)}
                  placeholder="https://..."
                  className="lf-input"
                />
              </div>
            </div>

            <div className="dash-section-header" style={{ marginTop: "var(--s-3)" }}>
              <h3 className="dash-section-title">
                {t("profile.editor.socialProfiles")}
              </h3>
            </div>
            {formData.socialProfiles.map((sp, idx) => (
              <div
                key={idx}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <Input
                  style={{ width: 130 }}
                  placeholder={t("profile.editor.platform")}
                  value={sp.platform}
                  onChange={(e) => updateSocial(idx, "platform", e.target.value)}
                  className="lf-input"
                />
                <Input
                  style={{ flex: 1 }}
                  placeholder="https://..."
                  value={sp.url}
                  onChange={(e) => updateSocial(idx, "url", e.target.value)}
                  className="lf-input"
                />
                <button
                  type="button"
                  onClick={() => removeSocial(idx)}
                  className="lf-icon-btn"
                  style={{ color: "var(--rust)" }}
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addSocial}
              className="lf-cta lf-cta--ghost"
              style={{ alignSelf: "flex-start" }}
            >
              <Plus className="size-3.5" />
              {t("profile.editor.addSocial")}
            </button>
          </div>
        )}
      </div>

      {/* ==== Section 6: Headhunting ==== */}
      <div
        ref={(el) => setSectionRef("headhunting", el)}
        className="lf-card lf-card--feature"
        style={sectionShellStyle}
      >
        <SectionHeader id="headhunting">
          <Crosshair
            className="size-3.5"
            style={{ color: "var(--accent-blue)", marginLeft: 6 }}
          />
        </SectionHeader>
        {expandedSections.headhunting && (
          <div style={sectionBodyStyle}>
            {!formData.isOpenToOpportunities ? (
              <div
                className="lf-card"
                style={{
                  padding: "var(--s-3)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  border: "0.5px dashed var(--line-2)",
                }}
              >
                <Info className="size-4" style={{ color: "var(--ink-4)", flexShrink: 0 }} />
                <p
                  style={{
                    fontFamily: "var(--lf-display)",
                    fontStyle: "italic",
                    fontSize: 13,
                    color: "var(--ink-3)",
                    margin: 0,
                  }}
                >
                  {t("profile.editor.headhunting.enableFirst")}
                </p>
              </div>
            ) : (
              <>
                <p
                  style={{
                    fontFamily: "var(--lf-display)",
                    fontStyle: "italic",
                    fontSize: 13,
                    color: "var(--ink-3)",
                    margin: 0,
                  }}
                >
                  {t("profile.editor.headhunting.desc")}
                </p>

                <div style={labeledFieldStyle}>
                  <Label className="lf-field-label">
                    <Shield
                      className="size-3"
                      style={{
                        display: "inline",
                        marginRight: 4,
                        color: "var(--accent-blue)",
                      }}
                    />
                    {t("profile.editor.headhunting.confidentiality")}
                  </Label>
                  <p
                    style={{
                      fontFamily: "var(--lf-display)",
                      fontStyle: "italic",
                      fontSize: 12,
                      color: "var(--ink-3)",
                      margin: 0,
                    }}
                  >
                    {t("profile.editor.headhunting.confidentialityDesc")}
                  </p>
                  <Select
                    value={formData.headhunting.confidentiality}
                    onValueChange={(v) =>
                      updateField("headhunting", {
                        ...formData.headhunting,
                        confidentiality: v as HeadhuntingFormData["confidentiality"],
                      })
                    }
                  >
                    <SelectTrigger className="lf-select-trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anonymous">
                        {t("profile.editor.headhunting.confidentiality.anonymous")}
                      </SelectItem>
                      <SelectItem value="scouts_only">
                        {t("profile.editor.headhunting.confidentiality.scouts_only")}
                      </SelectItem>
                      <SelectItem value="open">
                        {t("profile.editor.headhunting.confidentiality.open")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div style={labeledFieldStyle}>
                  <Label className="lf-field-label">
                    {t("profile.editor.headhunting.availability")}
                  </Label>
                  <Select
                    value={formData.headhunting.availability}
                    onValueChange={(v) =>
                      updateField("headhunting", {
                        ...formData.headhunting,
                        availability: v as HeadhuntingFormData["availability"],
                      })
                    }
                  >
                    <SelectTrigger className="lf-select-trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        {t("profile.editor.headhunting.availability.active")}
                      </SelectItem>
                      <SelectItem value="open">
                        {t("profile.editor.headhunting.availability.open")}
                      </SelectItem>
                      <SelectItem value="not_now">
                        {t("profile.editor.headhunting.availability.not_now")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div style={labeledFieldStyle}>
                  <Label className="lf-field-label">
                    {t("profile.editor.headhunting.targetRoles")}
                  </Label>
                  <Input
                    value={formData.headhunting.targetRoles}
                    onChange={(e) =>
                      updateField("headhunting", {
                        ...formData.headhunting,
                        targetRoles: e.target.value,
                      })
                    }
                    placeholder={t("profile.editor.headhunting.targetRolesPlaceholder")}
                    className="lf-input"
                  />
                </div>

                <div style={labeledFieldStyle}>
                  <Label className="lf-field-label">
                    {t("profile.editor.headhunting.targetFunctions")}
                  </Label>
                  <Input
                    value={formData.headhunting.targetFunctions}
                    onChange={(e) =>
                      updateField("headhunting", {
                        ...formData.headhunting,
                        targetFunctions: e.target.value,
                      })
                    }
                    placeholder={t("profile.editor.headhunting.targetFunctionsPlaceholder")}
                    className="lf-input"
                  />
                </div>

                <div style={labeledFieldStyle}>
                  <Label className="lf-field-label">
                    {t("profile.editor.headhunting.targetSeniority")}
                  </Label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {SENIORITY_OPTIONS.map(({ value, key }) => {
                      const selected = formData.headhunting.targetSeniority.includes(value);
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            const updated = selected
                              ? formData.headhunting.targetSeniority.filter((s) => s !== value)
                              : [...formData.headhunting.targetSeniority, value];
                            updateField("headhunting", {
                              ...formData.headhunting,
                              targetSeniority: updated,
                            });
                          }}
                          className="lf-tag"
                          style={{
                            cursor: "pointer",
                            background: selected
                              ? "var(--accent-blue-ghost)"
                              : "transparent",
                            borderColor: selected
                              ? "color-mix(in oklab, var(--accent-blue) 32%, var(--line-2))"
                              : "var(--line-2)",
                            color: selected ? "var(--ink)" : "var(--ink-3)",
                            fontWeight: selected ? 600 : 500,
                          }}
                        >
                          {t(key)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={labeledFieldStyle}>
                  <Label className="lf-field-label">
                    {t("profile.editor.headhunting.minimumSalary")}
                  </Label>
                  <Input
                    type="number"
                    value={formData.headhunting.minimumSalary}
                    onChange={(e) =>
                      updateField("headhunting", {
                        ...formData.headhunting,
                        minimumSalary: e.target.value,
                      })
                    }
                    placeholder={t("profile.editor.headhunting.minimumSalaryPlaceholder")}
                    className="lf-input"
                  />
                </div>

                <div style={labeledFieldStyle}>
                  <Label className="lf-field-label">
                    {t("profile.editor.headhunting.blacklistedCompanies")}
                  </Label>
                  <p
                    style={{
                      fontFamily: "var(--lf-display)",
                      fontStyle: "italic",
                      fontSize: 12,
                      color: "var(--ink-3)",
                      margin: 0,
                    }}
                  >
                    {t("profile.editor.headhunting.blacklistedCompaniesDesc")}
                  </p>
                  <Input
                    value={formData.headhunting.blacklistedCompanies}
                    onChange={(e) =>
                      updateField("headhunting", {
                        ...formData.headhunting,
                        blacklistedCompanies: e.target.value,
                      })
                    }
                    placeholder={t("profile.editor.headhunting.blacklistedCompaniesPlaceholder")}
                    className="lf-input"
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    padding: "var(--s-3)",
                    background: "var(--accent-blue-ghost)",
                    border: "0.5px solid var(--accent-blue)",
                    borderLeft: "2px solid var(--accent-blue)",
                    borderRadius: "0 var(--r-md) var(--r-md) 0",
                  }}
                >
                  <Shield
                    className="size-4"
                    style={{
                      color: "var(--accent-blue)",
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  />
                  <p
                    style={{
                      fontFamily: "var(--lf-display)",
                      fontStyle: "italic",
                      fontSize: 12.5,
                      color: "var(--ink-2)",
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    {t("profile.editor.headhunting.consentNote")}
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ==== Section 8: Settings ==== */}
      <div
        ref={(el) => setSectionRef("settings", el)}
        className="lf-card lf-card--feature"
        style={sectionShellStyle}
      >
        <SectionHeader id="settings" />
        {expandedSections.settings && (
          <div style={sectionBodyStyle}>
            {/* Public toggle */}
            <div
              className="lf-card"
              style={{
                padding: "var(--s-3) var(--s-4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--s-3)",
              }}
            >
              <div>
                <Label
                  style={{
                    fontFamily: "var(--lf-display)",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--ink)",
                    margin: 0,
                  }}
                >
                  {t("profile.editor.isPublic")}
                </Label>
                <p
                  style={{
                    fontFamily: "var(--lf-display)",
                    fontStyle: "italic",
                    fontSize: 12,
                    color: "var(--ink-3)",
                    margin: 0,
                    marginTop: 2,
                  }}
                >
                  {t("profile.editor.isPublicDesc")}
                </p>
              </div>
              <ToggleSwitch
                value={formData.isPublic}
                onChange={(v) => updateField("isPublic", v)}
              />
            </div>

            {/* Open to opportunities toggle */}
            <div
              className="lf-card"
              style={{
                padding: "var(--s-3) var(--s-4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--s-3)",
              }}
            >
              <div>
                <Label
                  style={{
                    fontFamily: "var(--lf-display)",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--ink)",
                    margin: 0,
                  }}
                >
                  {t("profile.editor.isOpenToOpportunities")}
                </Label>
                <p
                  style={{
                    fontFamily: "var(--lf-display)",
                    fontStyle: "italic",
                    fontSize: 12,
                    color: "var(--ink-3)",
                    margin: 0,
                    marginTop: 2,
                  }}
                >
                  {t("profile.editor.isOpenToOpportunitiesDesc")}
                </p>
              </div>
              <ToggleSwitch
                value={formData.isOpenToOpportunities}
                onChange={(v) => updateField("isOpenToOpportunities", v)}
              />
            </div>

            {/* Email notifications toggle */}
            <div
              className="lf-card"
              style={{
                padding: "var(--s-3) var(--s-4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--s-3)",
              }}
            >
              <div>
                <Label
                  style={{
                    fontFamily: "var(--lf-display)",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--ink)",
                    margin: 0,
                  }}
                >
                  {t("profile.editor.emailNotifications")}
                </Label>
                <p
                  style={{
                    fontFamily: "var(--lf-display)",
                    fontStyle: "italic",
                    fontSize: 12,
                    color: "var(--ink-3)",
                    margin: 0,
                    marginTop: 2,
                  }}
                >
                  {t("profile.editor.emailNotificationsDesc")}
                </p>
              </div>
              <ToggleSwitch
                value={formData.emailNotifications}
                onChange={(v) => updateField("emailNotifications", v)}
              />
            </div>

            {/* CV upload */}
            <div
              className="lf-card"
              style={{
                padding: "var(--s-3) var(--s-4)",
                borderColor: "color-mix(in oklab, var(--accent-blue) 30%, var(--glass-border))",
                background: "var(--accent-blue-ghost)",
              }}
            >
              <Label
                style={{
                  fontFamily: "var(--lf-display)",
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--ink)",
                  margin: 0,
                  marginBottom: "var(--s-2)",
                  display: "block",
                }}
              >
                {t("profile.editor.cv")}
              </Label>
              {profile.cvFileName && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontFamily: "var(--lf-display)",
                    fontSize: 13,
                    color: "var(--ink-3)",
                    marginBottom: "var(--s-2)",
                  }}
                >
                  <span>{profile.cvFileName}</span>
                  {cvUrl && (
                    <a
                      href={cvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        color: "var(--accent-blue)",
                        textDecoration: "none",
                        fontFamily: "var(--lf-mono)",
                        fontSize: 11,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      <Download className="size-3.5" />
                      {t("profile.editor.downloadCv")}
                    </a>
                  )}
                </div>
              )}
              <input
                ref={cvInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
                onChange={handleCvUpload}
              />
              <div
                style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
              >
                <button
                  type="button"
                  className="lf-cta lf-cta--ghost"
                  disabled={cvUploading}
                  onClick={() => cvInputRef.current?.click()}
                >
                  <Upload className="size-3.5" />
                  {cvUploading
                    ? t("profile.editor.uploading")
                    : profile.cvFileId
                      ? t("profile.editor.replaceCv")
                      : t("profile.editor.uploadCv")}
                </button>
                <button
                  type="button"
                  className="lf-cta lf-cta--primary"
                  onClick={onGenerateCv}
                >
                  <Sparkles className="size-3.5" />
                  {t("profile.editor.generateCv")}
                </button>
              </div>
            </div>

            {/* Delete profile */}
            <div
              className="lf-card"
              style={{
                padding: "var(--s-3) var(--s-4)",
                borderColor: "color-mix(in oklab, var(--rust) 30%, var(--glass-border))",
              }}
            >
              <Label
                style={{
                  fontFamily: "var(--lf-display)",
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--rust)",
                  margin: 0,
                  display: "block",
                  marginBottom: 4,
                }}
              >
                {t("profile.editor.dangerZone")}
              </Label>
              <p
                style={{
                  fontFamily: "var(--lf-display)",
                  fontStyle: "italic",
                  fontSize: 12.5,
                  color: "var(--ink-3)",
                  margin: 0,
                  marginBottom: "var(--s-2)",
                }}
              >
                {t("profile.editor.deleteWarning")}
              </p>
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="lf-cta lf-cta--ghost"
                  style={{
                    color: "var(--rust)",
                    borderColor: "color-mix(in oklab, var(--rust) 50%, var(--glass-border))",
                  }}
                >
                  <Trash2 className="size-3.5" />
                  {t("profile.editor.deleteProfile")}
                </button>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "var(--lf-display)",
                      fontSize: 12.5,
                      color: "var(--rust)",
                      fontWeight: 500,
                      margin: 0,
                    }}
                  >
                    {t("profile.editor.deleteConfirm")}
                  </p>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="lf-cta lf-cta--primary"
                    style={{
                      background:
                        "linear-gradient(180deg, color-mix(in oklab, var(--rust) 92%, white) 0%, var(--rust) 100%)",
                      borderColor:
                        "color-mix(in oklab, var(--rust) 60%, white 10%)",
                    }}
                  >
                    {t("profile.editor.deleteYes")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="lf-cta lf-cta--ghost"
                  >
                    {t("profile.editor.deleteCancel")}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Save Button */}
      {isDirty && (
        <div
          style={{
            position: "sticky",
            bottom: "var(--s-3)",
            zIndex: 10,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="lf-cta lf-cta--primary"
          >
            {saving ? (
              <>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    border: "2px solid currentColor",
                    borderTopColor: "transparent",
                    animation: "spin 600ms linear infinite",
                  }}
                />
                {t("profile.editor.saving")}
              </>
            ) : (
              <>
                <Check className="size-4" />
                {t("profile.editor.saveChanges")}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
