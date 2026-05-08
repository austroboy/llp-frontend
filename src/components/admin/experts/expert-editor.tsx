"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Upload,
  X,
  Clock,
  CheckCircle2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

// --- Constants ---

const SECTORS = [
  "RMG / Apparel",
  "Pharmaceuticals",
  "Manufacturing",
  "Telecom",
  "FMCG",
  "Banking & Finance",
  "Construction",
  "Education",
  "Healthcare",
  "Logistics",
  "Retail",
  "Agriculture",
  "Energy",
  "Hospitality",
  "Other",
];

const SKILL_PRESETS = [
  "PF Fund Setup",
  "GF Compliance",
  "WPPF Administration",
  "Audit Preparation",
  "Termination & Settlement",
  "Work Permits & Immigration",
  "Policy Drafting",
  "Workplace Safety",
  "Other",
];

const SESSION_LENGTHS = [30, 60, 90];

const PLATFORM_PATTERNS: [RegExp, string][] = [
  [/github\.com/i, "GitHub"],
  [/facebook\.com|fb\.com/i, "Facebook"],
  [/twitter\.com|x\.com/i, "X"],
  [/youtube\.com|youtu\.be/i, "YouTube"],
  [/linkedin\.com/i, "LinkedIn"],
  [/instagram\.com/i, "Instagram"],
  [/dribbble\.com/i, "Dribbble"],
  [/behance\.net/i, "Behance"],
  [/tiktok\.com/i, "TikTok"],
  [/medium\.com/i, "Medium"],
  [/reddit\.com/i, "Reddit"],
  [/stackoverflow\.com/i, "StackOverflow"],
  [/discord\.gg|discord\.com/i, "Discord"],
  [/twitch\.tv/i, "Twitch"],
  [/pinterest\.com/i, "Pinterest"],
];

const KNOWN_PLATFORMS = new Set(PLATFORM_PATTERNS.map(([, name]) => name));

function detectPlatform(url: string): string | null {
  for (const [pattern, name] of PLATFORM_PATTERNS) {
    if (pattern.test(url)) return name;
  }
  return null;
}

// --- Types ---

interface Skill {
  name: string;
  level: 1 | 2 | 3 | 4;
  evidence: string;
  verifiedAt?: number;
  verifiedBy?: string;
}

interface Certification {
  name: string;
  org?: string;
  year?: string;
}

type WorkMode = "on-site" | "remote" | "hybrid";

interface Experience {
  title: string;
  company?: string;
  location?: string;
  workMode?: WorkMode;
  duration?: string;
  scope?: string;
  role: string;
}

interface Company {
  name: string;
  initials: string;
  color: string;
}

interface FormData {
  name: string;
  email: string;
  designation: string;
  organization: string;
  city: string;
  linkedin: string;
  portfolio: string;
  socialProfiles: { platform: string; url: string }[];
  bio: string;
  photoId?: Id<"_storage">;
  sectors: string[];
  countriesWorked: string[];
  companiesWorked: Company[];
  skills: Skill[];
  certifications: Certification[];
  education: { degree: string; institution: string; fieldOfStudy?: string; year?: string }[];
  projects: { name: string; client?: string; description?: string; duration?: string; outcome?: string }[];
  languages: { name: string; proficiency?: "native" | "fluent" | "advanced" | "intermediate" | "basic" }[];
  affiliations: { name: string; role?: string; since?: string }[];
  experiences: Experience[];
  sessionLengths: number[];
  availabilityNotes: string;
  headhuntingOptedIn: boolean;
  ctcRange: string;
  preferredLocations: string[];
  noticePeriod: string;
  // Scout fields
  scoutTier: "" | "standard" | "verified" | "premium";
  scoutStatus: "" | "pending" | "active" | "paused" | "suspended";
  scoutFunctions: string;
  scoutIndustries: string;
  scoutGeographies: string;
  scoutRoleLevels: string;
  keywords: string[];
  availabilityStatus: "available" | "busy" | "on_leave";
  isFeatured: boolean;
  displayOrder: number;
  rating: number;
  reviewCount: number;
  sessionCount: number;
}

const defaultForm: FormData = {
  name: "",
  email: "",
  designation: "",
  organization: "",
  city: "",
  linkedin: "",
  portfolio: "",
  socialProfiles: [],
  bio: "",
  sectors: [],
  countriesWorked: [],
  companiesWorked: [],
  skills: [],
  certifications: [],
  education: [],
  projects: [],
  languages: [],
  affiliations: [],
  experiences: [],
  sessionLengths: [30, 60],
  availabilityNotes: "",
  headhuntingOptedIn: false,
  ctcRange: "",
  preferredLocations: [],
  noticePeriod: "",
  scoutTier: "",
  scoutStatus: "",
  scoutFunctions: "",
  scoutIndustries: "",
  scoutGeographies: "",
  scoutRoleLevels: "",
  keywords: [],
  availabilityStatus: "available",
  isFeatured: false,
  displayOrder: 0,
  rating: 0,
  reviewCount: 0,
  sessionCount: 0,
};

// --- Helpers ---

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function generateInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// --- Props ---

interface ExpertEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editId?: Id<"experts">;
}

// --- Component ---

export function ExpertEditor({ open, onOpenChange, editId }: ExpertEditorProps) {
  const { t } = useLanguage();
  const [form, setForm] = useState<FormData>({ ...defaultForm });
  const [openSections, setOpenSections] = useState<Set<number>>(new Set([1]));
  const [saving, setSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [countryInput, setCountryInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [sectorInput, setSectorInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const existing = useQuery(
    api.experts.getById,
    editId ? { id: editId } : "skip"
  );
  const photoUrl = useQuery(
    api.experts.getPhotoUrl,
    existing?.photoId ? { photoId: existing.photoId } : "skip"
  );

  const createMutation = useMutation(api.experts.create);
  const updateMutation = useMutation(api.experts.update);
  const generateUploadUrl = useMutation(api.experts.generateUploadUrl);

  // Pre-fill form when editing
  useEffect(() => {
    if (!open) return;
    if (editId && existing) {
      setForm({
        name: existing.name,
        email: existing.email ?? "",
        designation: existing.designation,
        organization: existing.organization,
        city: existing.city,
        linkedin: existing.linkedin ?? "",
        portfolio: existing.portfolio ?? "",
        socialProfiles: existing.socialProfiles ?? [],
        bio: existing.bio,
        photoId: existing.photoId,
        sectors: existing.sectors,
        countriesWorked: existing.countriesWorked,
        companiesWorked: existing.companiesWorked,
        skills: existing.skills.map((s) => ({
          name: s.name,
          level: s.level as 1 | 2 | 3 | 4,
          evidence: s.evidence,
          verifiedAt: s.verifiedAt,
          verifiedBy: s.verifiedBy,
        })),
        certifications: existing.certifications.map((c) => ({
          name: c.name,
          org: c.org,
          year: c.year,
        })),
        education: existing.education || [],
        projects: existing.projects || [],
        languages: existing.languages || [],
        affiliations: existing.affiliations || [],
        experiences: existing.experiences.map((e) => ({
          title: e.title,
          company: e.company,
          location: e.location,
          workMode: e.workMode as WorkMode | undefined,
          duration: e.duration,
          scope: e.scope,
          role: e.role,
        })),
        sessionLengths: existing.sessionPreferences.lengths,
        availabilityNotes: existing.sessionPreferences.availabilityNotes ?? "",
        headhuntingOptedIn: existing.headhunting.optedIn,
        ctcRange: existing.headhunting.ctcRange ?? "",
        preferredLocations: existing.headhunting.preferredLocations ?? [],
        noticePeriod: existing.headhunting.noticePeriod ?? "",
        scoutTier: existing.scoutTier ?? "",
        scoutStatus: existing.scoutStatus ?? "",
        scoutFunctions: existing.coverageLanes?.functions?.join(", ") ?? "",
        scoutIndustries: existing.coverageLanes?.industries?.join(", ") ?? "",
        scoutGeographies: existing.coverageLanes?.geographies?.join(", ") ?? "",
        scoutRoleLevels: existing.coverageLanes?.roleLevels?.join(", ") ?? "",
        keywords: existing.keywords ?? [],
        availabilityStatus: existing.availabilityStatus,
        isFeatured: existing.isFeatured,
        displayOrder: existing.displayOrder,
        rating: existing.stats.rating,
        reviewCount: existing.stats.reviewCount,
        sessionCount: existing.stats.sessionCount,
      });
      if (photoUrl) {
        setPhotoPreview(photoUrl);
      }
    } else if (!editId) {
      setForm({ ...defaultForm });
      setPhotoPreview(null);
    }
  }, [open, editId, existing, photoUrl]);

  const toggleSection = useCallback((n: number) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }, []);

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await generateUploadUrl();
      const result = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      updateField("photoId", storageId);
      setPhotoPreview(URL.createObjectURL(file));
    } catch (err) {
      console.error("Photo upload failed:", err);
    }
  };

  // Save
  const handleSave = async (status: "draft" | "published" | "archived") => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const slug = generateSlug(form.name);
      const initials = generateInitials(form.name);
      const payload = {
        name: form.name,
        email: form.email || undefined,
        designation: form.designation,
        organization: form.organization,
        city: form.city,
        slug,
        linkedin: form.linkedin || undefined,
        portfolio: form.portfolio || undefined,
        socialProfiles: form.socialProfiles.length > 0 ? form.socialProfiles : undefined,
        bio: form.bio,
        photoId: form.photoId,
        initials,
        sectors: form.sectors,
        countriesWorked: form.countriesWorked,
        companiesWorked: form.companiesWorked,
        skills: form.skills.map((s) => ({
          name: s.name,
          level: s.level,
          evidence: s.evidence,
          verifiedAt: s.verifiedAt,
          verifiedBy: s.verifiedBy,
        })),
        certifications: form.certifications.map((c) => ({
          name: c.name,
          org: c.org,
          year: c.year,
        })),
        education: form.education.filter(e => e.degree && e.institution),
        projects: form.projects.filter(p => p.name),
        languages: form.languages.filter(l => l.name),
        affiliations: form.affiliations.filter(a => a.name),
        experiences: form.experiences.map((e) => ({
          title: e.title,
          company: e.company || undefined,
          location: e.location || undefined,
          workMode: e.workMode || undefined,
          duration: e.duration,
          scope: e.scope,
          role: e.role,
        })),
        sessionPreferences: {
          lengths: form.sessionLengths,
          availabilityNotes: form.availabilityNotes || undefined,
        },
        headhunting: {
          optedIn: form.headhuntingOptedIn,
          ctcRange: form.ctcRange || undefined,
          preferredLocations: form.preferredLocations.length > 0 ? form.preferredLocations : undefined,
          noticePeriod: form.noticePeriod || undefined,
        },
        scoutTier: form.scoutTier || undefined,
        scoutStatus: form.scoutStatus || undefined,
        coverageLanes: form.scoutStatus ? {
          functions: form.scoutFunctions ? form.scoutFunctions.split(",").map(s => s.trim()).filter(Boolean) : [],
          industries: form.scoutIndustries ? form.scoutIndustries.split(",").map(s => s.trim()).filter(Boolean) : [],
          geographies: form.scoutGeographies ? form.scoutGeographies.split(",").map(s => s.trim()).filter(Boolean) : [],
          roleLevels: form.scoutRoleLevels ? form.scoutRoleLevels.split(",").map(s => s.trim()).filter(Boolean) : [],
        } : undefined,
        stats: {
          rating: form.rating,
          reviewCount: form.reviewCount,
          sessionCount: form.sessionCount,
        },
        keywords: form.keywords.length > 0 ? form.keywords : undefined,
        availabilityStatus: form.availabilityStatus,
        isFeatured: form.isFeatured,
        displayOrder: form.displayOrder,
        status,
      };

      if (editId) {
        await updateMutation({ id: editId, ...payload });
      } else {
        await createMutation(payload);
      }
      onOpenChange(false);
    } catch (err) {
      console.error("Save failed:", err);
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // Section header renderer
  const SectionHeader = ({ num, label }: { num: number; label: string }) => (
    <button
      type="button"
      onClick={() => toggleSection(num)}
      className="flex items-center gap-2 w-full py-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
    >
      {openSections.has(num) ? (
        <ChevronDown className="size-4 shrink-0" />
      ) : (
        <ChevronRight className="size-4 shrink-0" />
      )}
      <span>{label}</span>
    </button>
  );

  const slug = generateSlug(form.name);
  const initials = generateInitials(form.name);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[700px] sm:w-[800px] overflow-y-auto !max-w-none p-0"
      >
        <div className="p-6 pb-0">
          <SheetHeader>
            <SheetTitle>
              {editId
                ? t("admin.experts.editor.title.edit")
                : t("admin.experts.editor.title.new")}
            </SheetTitle>
            <SheetDescription>
              {editId ? form.name : t("admin.experts.editor.title.new")}
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="p-6 space-y-1">
          {/* ===== Section 1: Basic Info ===== */}
          <SectionHeader num={1} label={t("admin.experts.editor.section.basic")} />
          {openSections.has(1) && (
            <div className="pl-6 space-y-4 pb-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="e.g. Tahmina Rahman"
                />
                {form.name && (
                  <p className="text-xs text-muted-foreground">
                    URL: /experts/{slug}
                  </p>
                )}
              </div>

              {/* Initials preview */}
              {form.name && (
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                    {initials}
                  </div>
                  <span className="text-xs text-muted-foreground">Auto-generated initials</span>
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="email@example.com"
                />
              </div>

              {/* Designation */}
              <div className="space-y-1.5">
                <Label>Designation *</Label>
                <Input
                  value={form.designation}
                  onChange={(e) => updateField("designation", e.target.value)}
                  placeholder="e.g. Senior HR Consultant"
                />
              </div>

              {/* Organization */}
              <div className="space-y-1.5">
                <Label>Organization *</Label>
                <Input
                  value={form.organization}
                  onChange={(e) => updateField("organization", e.target.value)}
                  placeholder="e.g. LLP Consultants Ltd."
                />
              </div>

              {/* City */}
              <div className="space-y-1.5">
                <Label>City *</Label>
                <Input
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  placeholder="e.g. Dhaka"
                />
              </div>

              {/* LinkedIn */}
              <div className="space-y-1.5">
                <Label>LinkedIn URL</Label>
                <Input
                  value={form.linkedin}
                  onChange={(e) => updateField("linkedin", e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>

              {/* Portfolio */}
              <div className="space-y-1.5">
                <Label>Portfolio / Website</Label>
                <Input
                  value={form.portfolio}
                  onChange={(e) => updateField("portfolio", e.target.value)}
                  placeholder="https://yourportfolio.com"
                />
              </div>

              {/* Social Profiles */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Social Profiles</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      updateField("socialProfiles", [
                        ...form.socialProfiles,
                        { platform: "", url: "" },
                      ])
                    }
                  >
                    <Plus className="size-3.5 mr-1" />
                    Add
                  </Button>
                </div>
                {form.socialProfiles.map((sp, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={sp.platform}
                      onChange={(e) => {
                        const updated = [...form.socialProfiles];
                        updated[i] = { ...updated[i], platform: e.target.value };
                        updateField("socialProfiles", updated);
                      }}
                      placeholder="Auto-detected"
                      className="w-28 shrink-0"
                    />
                    <Input
                      value={sp.url}
                      onChange={(e) => {
                        const url = e.target.value;
                        const updated = [...form.socialProfiles];
                        const detected = detectPlatform(url);
                        updated[i] = {
                          ...updated[i],
                          url,
                          ...(detected && (!sp.platform || KNOWN_PLATFORMS.has(sp.platform)) ? { platform: detected } : {}),
                        };
                        updateField("socialProfiles", updated);
                      }}
                      placeholder="https://..."
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-destructive"
                      onClick={() =>
                        updateField(
                          "socialProfiles",
                          form.socialProfiles.filter((_, j) => j !== i)
                        )
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Bio */}
              <div className="space-y-1.5">
                <Label>Bio *</Label>
                <Textarea
                  value={form.bio}
                  onChange={(e) => updateField("bio", e.target.value)}
                  placeholder="Professional background and expertise..."
                  rows={4}
                />
              </div>

              {/* Keywords */}
              <div className="space-y-2">
                <Label>Keywords</Label>
                <p className="text-xs text-muted-foreground">Shown in the profile ticker. Press Enter to add.</p>
                <div className="flex gap-2">
                  <Input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    placeholder="e.g. Labour Law"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && keywordInput.trim()) {
                        e.preventDefault();
                        if (!form.keywords.includes(keywordInput.trim())) {
                          updateField("keywords", [...form.keywords, keywordInput.trim()]);
                        }
                        setKeywordInput("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (keywordInput.trim() && !form.keywords.includes(keywordInput.trim())) {
                        updateField("keywords", [...form.keywords, keywordInput.trim()]);
                      }
                      setKeywordInput("");
                    }}
                  >
                    Add
                  </Button>
                </div>
                {form.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {form.keywords.map((kw) => (
                      <Badge key={kw} variant="secondary" className="gap-1 pr-1">
                        {kw}
                        <button
                          type="button"
                          onClick={() =>
                            updateField("keywords", form.keywords.filter((x) => x !== kw))
                          }
                          className="hover:text-destructive"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Photo upload */}
              <div className="space-y-1.5">
                <Label>Photo</Label>
                <div className="flex items-center gap-3">
                  {photoPreview ? (
                    <Image
                      src={photoPreview}
                      alt="Photo"
                      width={64}
                      height={64}
                      className="size-16 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="size-16 rounded-full bg-muted flex items-center justify-center text-lg font-semibold text-muted-foreground">
                      {initials || "?"}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="size-3.5 mr-1.5" />
                      {t("admin.experts.editor.uploadPhoto")}
                    </Button>
                    {photoPreview && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          updateField("photoId", undefined);
                          setPhotoPreview(null);
                        }}
                      >
                        {t("admin.experts.editor.removePhoto")}
                      </Button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ===== Section 2: Sectors ===== */}
          <SectionHeader num={2} label={t("admin.experts.editor.section.geography")} />
          {openSections.has(2) && (
            <div className="pl-6 space-y-4 pb-4">
              <div className="space-y-2">
                <Label>Sectors</Label>
                <div className="grid grid-cols-2 gap-2">
                  {SECTORS.map((sector) => (
                    <label key={sector} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.sectors.includes(sector)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateField("sectors", [...form.sectors, sector]);
                          } else {
                            updateField(
                              "sectors",
                              form.sectors.filter((s) => s !== sector)
                            );
                          }
                        }}
                        className="rounded border-input"
                      />
                      {sector}
                    </label>
                  ))}
                </div>
                {/* Custom sectors (not in preset list) */}
                {form.sectors.filter((s) => !SECTORS.includes(s)).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.sectors.filter((s) => !SECTORS.includes(s)).map((s) => (
                      <Badge key={s} variant="secondary" className="gap-1 pr-1">
                        {s}
                        <button
                          type="button"
                          onClick={() => updateField("sectors", form.sectors.filter((x) => x !== s))}
                          className="hover:text-destructive"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  <Input
                    value={sectorInput}
                    onChange={(e) => setSectorInput(e.target.value)}
                    placeholder="Add custom sector..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && sectorInput.trim()) {
                        e.preventDefault();
                        if (!form.sectors.includes(sectorInput.trim())) {
                          updateField("sectors", [...form.sectors, sectorInput.trim()]);
                        }
                        setSectorInput("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (sectorInput.trim() && !form.sectors.includes(sectorInput.trim())) {
                        updateField("sectors", [...form.sectors, sectorInput.trim()]);
                      }
                      setSectorInput("");
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ===== Section 3: Skills ===== */}
          <SectionHeader num={3} label={t("admin.experts.editor.section.skills")} />
          {openSections.has(3) && (
            <div className="pl-6 space-y-4 pb-4">
              <div className="flex items-center justify-between">
                <Label>Skills ({form.skills.length})</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    updateField("skills", [
                      ...form.skills,
                      { name: "", level: 2 as const, evidence: "" },
                    ])
                  }
                >
                  <Plus className="size-3.5 mr-1" />
                  {t("admin.experts.editor.addSkill")}
                </Button>
              </div>
              {form.skills.map((skill, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-3 relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6 absolute top-2 right-2 text-destructive"
                    onClick={() =>
                      updateField(
                        "skills",
                        form.skills.filter((_, j) => j !== i)
                      )
                    }
                  >
                    <Trash2 className="size-3" />
                  </Button>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Skill Name</Label>
                    <Select
                      value={SKILL_PRESETS.includes(skill.name) ? skill.name : "__custom__"}
                      onValueChange={(v) => {
                        const updated = [...form.skills];
                        updated[i] = { ...updated[i], name: v === "__custom__" ? "" : v };
                        updateField("skills", updated);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select skill..." />
                      </SelectTrigger>
                      <SelectContent>
                        {SKILL_PRESETS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                        <SelectItem value="__custom__">Custom...</SelectItem>
                      </SelectContent>
                    </Select>
                    {!SKILL_PRESETS.includes(skill.name) && (
                      <Input
                        value={skill.name}
                        onChange={(e) => {
                          const updated = [...form.skills];
                          updated[i] = { ...updated[i], name: e.target.value };
                          updateField("skills", updated);
                        }}
                        placeholder="Custom skill name"
                        className="mt-1"
                      />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Level</Label>
                    <div className="flex gap-3">
                      {([1, 2, 3, 4] as const).map((lvl) => (
                        <label key={lvl} className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <input
                            type="radio"
                            name={`skill-level-${i}`}
                            checked={skill.level === lvl}
                            onChange={() => {
                              const updated = [...form.skills];
                              updated[i] = { ...updated[i], level: lvl };
                              updateField("skills", updated);
                            }}
                            className="accent-primary"
                          />
                          {lvl}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Evidence</Label>
                    <Textarea
                      value={skill.evidence}
                      onChange={(e) => {
                        const updated = [...form.skills];
                        updated[i] = { ...updated[i], evidence: e.target.value };
                        updateField("skills", updated);
                      }}
                      placeholder="Describe evidence of this skill..."
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Verified At</Label>
                      <Input
                        type="date"
                        value={
                          skill.verifiedAt
                            ? new Date(skill.verifiedAt).toISOString().split("T")[0]
                            : ""
                        }
                        onChange={(e) => {
                          const updated = [...form.skills];
                          updated[i] = {
                            ...updated[i],
                            verifiedAt: e.target.value
                              ? new Date(e.target.value).getTime()
                              : undefined,
                          };
                          updateField("skills", updated);
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Verified By</Label>
                      <Input
                        value={skill.verifiedBy ?? ""}
                        onChange={(e) => {
                          const updated = [...form.skills];
                          updated[i] = { ...updated[i], verifiedBy: e.target.value || undefined };
                          updateField("skills", updated);
                        }}
                        placeholder="Verifier name"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ===== Section 4: Certifications & Experience ===== */}
          <SectionHeader num={4} label={t("admin.experts.editor.section.credentials")} />
          {openSections.has(4) && (
            <div className="pl-6 space-y-4 pb-4">
              {/* Certifications */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Certifications ({form.certifications.length})</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      updateField("certifications", [
                        ...form.certifications,
                        { name: "" },
                      ])
                    }
                  >
                    <Plus className="size-3.5 mr-1" />
                    {t("admin.experts.editor.addCert")}
                  </Button>
                </div>
                {form.certifications.map((cert, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <Input
                        value={cert.name}
                        onChange={(e) => {
                          const updated = [...form.certifications];
                          updated[i] = { ...updated[i], name: e.target.value };
                          updateField("certifications", updated);
                        }}
                        placeholder="Certification name"
                      />
                      <Input
                        value={cert.org ?? ""}
                        onChange={(e) => {
                          const updated = [...form.certifications];
                          updated[i] = { ...updated[i], org: e.target.value || undefined };
                          updateField("certifications", updated);
                        }}
                        placeholder="Organization"
                      />
                      <Input
                        value={cert.year ?? ""}
                        onChange={(e) => {
                          const updated = [...form.certifications];
                          updated[i] = { ...updated[i], year: e.target.value || undefined };
                          updateField("certifications", updated);
                        }}
                        placeholder="Year"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-destructive"
                      onClick={() =>
                        updateField(
                          "certifications",
                          form.certifications.filter((_, j) => j !== i)
                        )
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Experiences */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Experiences ({form.experiences.length})</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      updateField("experiences", [
                        ...form.experiences,
                        { title: "", role: "" },
                      ])
                    }
                  >
                    <Plus className="size-3.5 mr-1" />
                    {t("admin.experts.editor.addExp")}
                  </Button>
                </div>
                {form.experiences.map((exp, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-2 relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6 absolute top-2 right-2 text-destructive"
                      onClick={() =>
                        updateField(
                          "experiences",
                          form.experiences.filter((_, j) => j !== i)
                        )
                      }
                    >
                      <Trash2 className="size-3" />
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Title</Label>
                        <Input
                          value={exp.title}
                          onChange={(e) => {
                            const updated = [...form.experiences];
                            updated[i] = { ...updated[i], title: e.target.value };
                            updateField("experiences", updated);
                          }}
                          placeholder="Project / engagement title"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Company</Label>
                        <Input
                          value={exp.company ?? ""}
                          onChange={(e) => {
                            const updated = [...form.experiences];
                            updated[i] = { ...updated[i], company: e.target.value || undefined };
                            updateField("experiences", updated);
                          }}
                          placeholder="e.g. Acme Corp"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Location</Label>
                        <Input
                          value={exp.location ?? ""}
                          onChange={(e) => {
                            const updated = [...form.experiences];
                            updated[i] = { ...updated[i], location: e.target.value || undefined };
                            updateField("experiences", updated);
                          }}
                          placeholder="e.g. Dhaka, Bangladesh"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Work Mode</Label>
                        <div className="flex gap-1.5 pt-0.5">
                          {([
                            { value: "on-site", label: "On-site", color: "bg-[#A855F7]/15 text-[#A855F7] border-[#A855F7]/30" },
                            { value: "remote", label: "Remote", color: "bg-[#FF6B00]/15 text-[#FF6B00] border-[#FF6B00]/30" },
                            { value: "hybrid", label: "Hybrid", color: "bg-[#00BFFF]/15 text-[#00BFFF] border-[#00BFFF]/30" },
                          ] as const).map((mode) => (
                            <button
                              key={mode.value}
                              type="button"
                              className={cn(
                                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all",
                                exp.workMode === mode.value
                                  ? mode.color
                                  : "border-border text-muted-foreground/50 hover:border-muted-foreground/30"
                              )}
                              onClick={() => {
                                const updated = [...form.experiences];
                                updated[i] = {
                                  ...updated[i],
                                  workMode: exp.workMode === mode.value ? undefined : mode.value,
                                };
                                updateField("experiences", updated);
                              }}
                            >
                              {mode.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Role</Label>
                        <Input
                          value={exp.role}
                          onChange={(e) => {
                            const updated = [...form.experiences];
                            updated[i] = { ...updated[i], role: e.target.value };
                            updateField("experiences", updated);
                          }}
                          placeholder="e.g. Lead Consultant"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Duration</Label>
                        <Input
                          value={exp.duration ?? ""}
                          onChange={(e) => {
                            const updated = [...form.experiences];
                            updated[i] = { ...updated[i], duration: e.target.value || undefined };
                            updateField("experiences", updated);
                          }}
                          placeholder="e.g. 6 months"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Scope</Label>
                      <Input
                        value={exp.scope ?? ""}
                        onChange={(e) => {
                          const updated = [...form.experiences];
                          updated[i] = { ...updated[i], scope: e.target.value || undefined };
                          updateField("experiences", updated);
                        }}
                        placeholder="e.g. 500 employees"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== Section 5: Education, Projects, Languages & Affiliations ===== */}
          <SectionHeader num={5} label={t("admin.experts.editor.section.educationProjects") || "Education, Projects, Languages & Affiliations"} />
          {openSections.has(5) && (
            <div className="pl-6 space-y-4 pb-4">
              {/* Education */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Education</Label>
                {form.education.map((edu, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                    <Input placeholder="Degree" value={edu.degree} onChange={(e) => {
                      const updated = [...form.education];
                      updated[i] = { ...updated[i], degree: e.target.value };
                      setForm({ ...form, education: updated });
                    }} />
                    <Input placeholder="Institution" value={edu.institution} onChange={(e) => {
                      const updated = [...form.education];
                      updated[i] = { ...updated[i], institution: e.target.value };
                      setForm({ ...form, education: updated });
                    }} />
                    <Input placeholder="Year" value={edu.year || ""} onChange={(e) => {
                      const updated = [...form.education];
                      updated[i] = { ...updated[i], year: e.target.value };
                      setForm({ ...form, education: updated });
                    }} />
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => {
                      setForm({ ...form, education: form.education.filter((_, j) => j !== i) });
                    }}>
                      <Trash2 className="size-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => {
                  setForm({ ...form, education: [...form.education, { degree: "", institution: "" }] });
                }}>
                  <Plus className="size-3.5 mr-1" /> Add Education
                </Button>
              </div>

              {/* Languages */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Languages</Label>
                {form.languages.map((lang, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                    <Input placeholder="Language" value={lang.name} onChange={(e) => {
                      const updated = [...form.languages];
                      updated[i] = { ...updated[i], name: e.target.value };
                      setForm({ ...form, languages: updated });
                    }} />
                    <Select value={lang.proficiency || ""} onValueChange={(v) => {
                      const updated = [...form.languages];
                      updated[i] = { ...updated[i], proficiency: v as typeof lang.proficiency };
                      setForm({ ...form, languages: updated });
                    }}>
                      <SelectTrigger><SelectValue placeholder="Proficiency" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="native">Native</SelectItem>
                        <SelectItem value="fluent">Fluent</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="basic">Basic</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => {
                      setForm({ ...form, languages: form.languages.filter((_, j) => j !== i) });
                    }}>
                      <Trash2 className="size-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => {
                  setForm({ ...form, languages: [...form.languages, { name: "" }] });
                }}>
                  <Plus className="size-3.5 mr-1" /> Add Language
                </Button>
              </div>

              {/* Projects */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Projects</Label>
                {form.projects.map((proj, i) => (
                  <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Project {i + 1}</span>
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => {
                        setForm({ ...form, projects: form.projects.filter((_, j) => j !== i) });
                      }}>
                        <Trash2 className="size-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Project name" value={proj.name} onChange={(e) => {
                        const updated = [...form.projects];
                        updated[i] = { ...updated[i], name: e.target.value };
                        setForm({ ...form, projects: updated });
                      }} />
                      <Input placeholder="Client" value={proj.client || ""} onChange={(e) => {
                        const updated = [...form.projects];
                        updated[i] = { ...updated[i], client: e.target.value };
                        setForm({ ...form, projects: updated });
                      }} />
                    </div>
                    <Input placeholder="Duration" value={proj.duration || ""} onChange={(e) => {
                      const updated = [...form.projects];
                      updated[i] = { ...updated[i], duration: e.target.value };
                      setForm({ ...form, projects: updated });
                    }} />
                    <Textarea placeholder="Description" rows={2} value={proj.description || ""} onChange={(e) => {
                      const updated = [...form.projects];
                      updated[i] = { ...updated[i], description: e.target.value };
                      setForm({ ...form, projects: updated });
                    }} />
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => {
                  setForm({ ...form, projects: [...form.projects, { name: "" }] });
                }}>
                  <Plus className="size-3.5 mr-1" /> Add Project
                </Button>
              </div>

              {/* Affiliations */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Professional Affiliations</Label>
                {form.affiliations.map((aff, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_0.5fr_auto] gap-2 items-end">
                    <Input placeholder="Organization" value={aff.name} onChange={(e) => {
                      const updated = [...form.affiliations];
                      updated[i] = { ...updated[i], name: e.target.value };
                      setForm({ ...form, affiliations: updated });
                    }} />
                    <Input placeholder="Role" value={aff.role || ""} onChange={(e) => {
                      const updated = [...form.affiliations];
                      updated[i] = { ...updated[i], role: e.target.value };
                      setForm({ ...form, affiliations: updated });
                    }} />
                    <Input placeholder="Since" value={aff.since || ""} onChange={(e) => {
                      const updated = [...form.affiliations];
                      updated[i] = { ...updated[i], since: e.target.value };
                      setForm({ ...form, affiliations: updated });
                    }} />
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => {
                      setForm({ ...form, affiliations: form.affiliations.filter((_, j) => j !== i) });
                    }}>
                      <Trash2 className="size-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => {
                  setForm({ ...form, affiliations: [...form.affiliations, { name: "" }] });
                }}>
                  <Plus className="size-3.5 mr-1" /> Add Affiliation
                </Button>
              </div>
            </div>
          )}

          {/* ===== Section 6: Session & Headhunting ===== */}
          <SectionHeader num={6} label={t("admin.experts.editor.section.session")} />
          {openSections.has(6) && (
            <div className="pl-6 space-y-4 pb-4">
              {/* Session lengths */}
              <div className="space-y-2">
                <Label>Session Lengths (minutes)</Label>
                <div className="flex gap-4">
                  {SESSION_LENGTHS.map((len) => (
                    <label key={len} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.sessionLengths.includes(len)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateField("sessionLengths", [...form.sessionLengths, len].sort((a, b) => a - b));
                          } else {
                            updateField(
                              "sessionLengths",
                              form.sessionLengths.filter((l) => l !== len)
                            );
                          }
                        }}
                        className="rounded border-input"
                      />
                      {len} min
                    </label>
                  ))}
                </div>
              </div>

              {/* Availability notes */}
              <div className="space-y-1.5">
                <Label>Availability Notes</Label>
                <Textarea
                  value={form.availabilityNotes}
                  onChange={(e) => updateField("availabilityNotes", e.target.value)}
                  placeholder="e.g. Available weekdays 10am-6pm BST"
                  rows={2}
                />
              </div>

              {/* Headhunting */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.headhuntingOptedIn}
                    onChange={(e) => updateField("headhuntingOptedIn", e.target.checked)}
                    className="rounded border-input"
                  />
                  <span className="font-medium">Headhunting Opt-in</span>
                </label>

                {form.headhuntingOptedIn && (
                  <div className="pl-6 space-y-3 border-l-2 border-primary/20">
                    <div className="space-y-1.5">
                      <Label>CTC Range</Label>
                      <Input
                        value={form.ctcRange}
                        onChange={(e) => updateField("ctcRange", e.target.value)}
                        placeholder="e.g. 50-80 LPA"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Preferred Locations</Label>
                      <div className="flex gap-2">
                        <Input
                          value={locationInput}
                          onChange={(e) => setLocationInput(e.target.value)}
                          placeholder="e.g. Dhaka"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && locationInput.trim()) {
                              e.preventDefault();
                              if (!form.preferredLocations.includes(locationInput.trim())) {
                                updateField("preferredLocations", [
                                  ...form.preferredLocations,
                                  locationInput.trim(),
                                ]);
                              }
                              setLocationInput("");
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (locationInput.trim() && !form.preferredLocations.includes(locationInput.trim())) {
                              updateField("preferredLocations", [
                                ...form.preferredLocations,
                                locationInput.trim(),
                              ]);
                            }
                            setLocationInput("");
                          }}
                        >
                          Add
                        </Button>
                      </div>
                      {form.preferredLocations.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {form.preferredLocations.map((loc) => (
                            <Badge key={loc} variant="secondary" className="gap-1 pr-1">
                              {loc}
                              <button
                                type="button"
                                onClick={() =>
                                  updateField(
                                    "preferredLocations",
                                    form.preferredLocations.filter((x) => x !== loc)
                                  )
                                }
                                className="hover:text-destructive"
                              >
                                <X className="size-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label>Notice Period</Label>
                      <Input
                        value={form.noticePeriod}
                        onChange={(e) => updateField("noticePeriod", e.target.value)}
                        placeholder="e.g. 2 months"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Scout Activation */}
              <div className="space-y-3 mt-4 pt-4 border-t border-border">
                <p className="text-sm font-semibold">Scout Activation</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Scout Status</Label>
                    <Select
                      value={form.scoutStatus || "none"}
                      onValueChange={(v) => updateField("scoutStatus", v === "none" ? "" : v as FormData["scoutStatus"])}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not a Scout</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Scout Tier</Label>
                    <Select
                      value={form.scoutTier || "none"}
                      onValueChange={(v) => updateField("scoutTier", v === "none" ? "" : v as FormData["scoutTier"])}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="verified">Verified</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {form.scoutStatus && (
                  <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                    <p className="text-xs text-muted-foreground">Coverage lanes — comma-separated values</p>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Functions</Label>
                      <Input
                        value={form.scoutFunctions}
                        onChange={(e) => updateField("scoutFunctions", e.target.value)}
                        placeholder="e.g. HR, Finance, Operations, Engineering"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Industries</Label>
                      <Input
                        value={form.scoutIndustries}
                        onChange={(e) => updateField("scoutIndustries", e.target.value)}
                        placeholder="e.g. RMG, Pharma, FMCG, Banking"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Geographies</Label>
                      <Input
                        value={form.scoutGeographies}
                        onChange={(e) => updateField("scoutGeographies", e.target.value)}
                        placeholder="e.g. Dhaka, Chittagong, Bangladesh, UAE"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Role Levels</Label>
                      <Input
                        value={form.scoutRoleLevels}
                        onChange={(e) => updateField("scoutRoleLevels", e.target.value)}
                        placeholder="e.g. Mid, Senior, Director, C-Suite"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== Section 7: Settings ===== */}
          <SectionHeader num={7} label={t("admin.experts.editor.section.settings")} />
          {openSections.has(7) && (
            <div className="pl-6 space-y-4 pb-4">
              {/* Availability status */}
              <div className="space-y-1.5">
                <Label>Availability Status</Label>
                <Select
                  value={form.availabilityStatus}
                  onValueChange={(v) =>
                    updateField("availabilityStatus", v as "available" | "busy" | "on_leave")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">
                      {t("admin.experts.availability.available")}
                    </SelectItem>
                    <SelectItem value="busy">
                      {t("admin.experts.availability.busy")}
                    </SelectItem>
                    <SelectItem value="on_leave">
                      {t("admin.experts.availability.on_leave")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Featured */}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) => updateField("isFeatured", e.target.checked)}
                  className="rounded border-input"
                />
                <span className="font-medium">Featured Expert</span>
              </label>

              {/* Display order */}
              <div className="space-y-1.5">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={form.displayOrder}
                  onChange={(e) => updateField("displayOrder", parseInt(e.target.value) || 0)}
                  min={0}
                  className="w-24"
                />
              </div>

              {/* Rating */}
              <div className="space-y-1.5">
                <Label>Rating (0-5)</Label>
                <Input
                  type="number"
                  value={form.rating}
                  onChange={(e) =>
                    updateField("rating", Math.min(5, Math.max(0, parseFloat(e.target.value) || 0)))
                  }
                  min={0}
                  max={5}
                  step={0.1}
                  className="w-24"
                />
              </div>

              {/* Review count */}
              <div className="space-y-1.5">
                <Label>Review Count</Label>
                <Input
                  type="number"
                  value={form.reviewCount}
                  onChange={(e) => updateField("reviewCount", parseInt(e.target.value) || 0)}
                  min={0}
                  className="w-24"
                />
              </div>

              {/* Session count */}
              <div className="space-y-1.5">
                <Label>Session Count</Label>
                <Input
                  type="number"
                  value={form.sessionCount}
                  onChange={(e) => updateField("sessionCount", parseInt(e.target.value) || 0)}
                  min={0}
                  className="w-24"
                />
              </div>
            </div>
          )}

          {/* ===== Section 7: Quick Questions summary (edit only) ===== */}
          {editId && (
            <>
              <SectionHeader num={8} label={t("admin.experts.editor.section.questions")} />
              {openSections.has(8) && (
                <div className="pl-6 pb-4">
                  <QuickQuestionsSummary expertId={editId} />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t bg-background p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => handleSave("draft")}
              variant="outline"
              disabled={saving || !form.name.trim()}
            >
              {t("admin.experts.editor.saveDraft")}
            </Button>
            <Button
              onClick={() => handleSave("published")}
              disabled={saving || !form.name.trim()}
            >
              {t("admin.experts.editor.publish")}
            </Button>
            {editId && existing?.status === "published" && (
              <Button
                onClick={() => handleSave("draft")}
                variant="secondary"
                disabled={saving}
              >
                {t("admin.experts.editor.unpublish")}
              </Button>
            )}
            {editId && existing?.status !== "archived" && (
              <Button
                onClick={() => handleSave("archived")}
                variant="ghost"
                className="text-destructive"
                disabled={saving}
              >
                {t("admin.experts.editor.archive")}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// --- Quick Questions Summary (lightweight — full management in Questions tab) ---

function QuickQuestionsSummary({ expertId }: { expertId: Id<"experts"> }) {
  const { t } = useLanguage();
  const questions = useQuery(api.quickQuestions.listByExpert, { expertId });

  if (!questions) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  const pending = questions.filter((q) => q.status === "pending").length;
  const answered = questions.filter((q) => q.status === "answered").length;
  const total = questions.length;

  if (total === 0) {
    return <p className="text-sm text-muted-foreground">{t("admin.quickQuestions.noQuestions")}</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-sm">
        <span>{total} total</span>
        <span className="text-muted-foreground">&middot;</span>
        {pending > 0 && (
          <span className="inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-400 font-medium">
            <Clock className="size-3.5" />
            {pending} {t("admin.questions.pendingBadge")}
          </span>
        )}
        {answered > 0 && (
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            {answered} {t("admin.questions.answered")}
          </span>
        )}
      </div>
      <a
        href="/admin/experts?tab=questions"
        className="text-xs text-primary hover:underline"
      >
        {t("admin.questions.viewAll")} &rarr;
      </a>
    </div>
  );
}
