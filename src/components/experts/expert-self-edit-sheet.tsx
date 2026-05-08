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

interface SocialProfile {
  platform: string;
  url: string;
}

interface FormData {
  email: string;
  designation: string;
  organization: string;
  city: string;
  linkedin: string;
  portfolio: string;
  socialProfiles: SocialProfile[];
  bio: string;
  photoId?: Id<"_storage">;
  sectors: string[];
  countriesWorked: string[];
  companiesWorked: Company[];
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
  keywords: string[];
  availabilityStatus: "available" | "busy" | "on_leave";
}

interface ExpertSelfEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expertId: Id<"experts">;
  clerkId: string;
}

export function ExpertSelfEditSheet({
  open,
  onOpenChange,
  expertId,
  clerkId,
}: ExpertSelfEditSheetProps) {
  const { t } = useLanguage();
  const [form, setForm] = useState<FormData>({
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
    keywords: [],
    availabilityStatus: "available",
  });
  const [openSections, setOpenSections] = useState<Set<number>>(new Set([1]));
  const [saving, setSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [countryInput, setCountryInput] = useState("");
  const [sectorInput, setSectorInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const expert = useQuery(api.experts.getById, { id: expertId });
  const photoUrl = useQuery(
    api.experts.getPhotoUrl,
    expert?.photoId ? { photoId: expert.photoId } : "skip"
  );

  const selfUpdateMutation = useMutation(api.experts.selfUpdate);
  const generateUploadUrl = useMutation(api.experts.generateUploadUrl);

  // Pre-fill form
  useEffect(() => {
    if (!open || !expert) return;
    setForm({
      email: expert.email ?? "",
      designation: expert.designation,
      organization: expert.organization,
      city: expert.city,
      linkedin: expert.linkedin ?? "",
      portfolio: expert.portfolio ?? "",
      socialProfiles: expert.socialProfiles ?? [],
      bio: expert.bio,
      photoId: expert.photoId,
      sectors: expert.sectors,
      countriesWorked: expert.countriesWorked,
      companiesWorked: expert.companiesWorked,
      certifications: expert.certifications.map((c) => ({
        name: c.name,
        org: c.org,
        year: c.year,
      })),
      education: expert.education || [],
      projects: expert.projects || [],
      languages: expert.languages || [],
      affiliations: expert.affiliations || [],
      experiences: expert.experiences.map((e) => ({
        title: e.title,
        company: e.company,
        location: e.location,
        workMode: e.workMode as WorkMode | undefined,
        duration: e.duration,
        scope: e.scope,
        role: e.role,
      })),
      sessionLengths: expert.sessionPreferences.lengths,
      availabilityNotes: expert.sessionPreferences.availabilityNotes ?? "",
      headhuntingOptedIn: expert.headhunting.optedIn,
      ctcRange: expert.headhunting.ctcRange ?? "",
      preferredLocations: expert.headhunting.preferredLocations ?? [],
      noticePeriod: expert.headhunting.noticePeriod ?? "",
      keywords: expert.keywords ?? [],
      availabilityStatus: expert.availabilityStatus,
    });
    if (photoUrl) setPhotoPreview(photoUrl);
  }, [open, expert, photoUrl]);

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

  const handleSave = async () => {
    setSaving(true);
    try {
      await selfUpdateMutation({
        id: expertId,
        clerkId,
        email: form.email || undefined,
        designation: form.designation,
        organization: form.organization,
        city: form.city,
        linkedin: form.linkedin || undefined,
        portfolio: form.portfolio || undefined,
        socialProfiles: form.socialProfiles.length > 0 ? form.socialProfiles : undefined,
        bio: form.bio,
        photoId: form.photoId,
        sectors: form.sectors,
        countriesWorked: form.countriesWorked,
        companiesWorked: form.companiesWorked,
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
          preferredLocations:
            form.preferredLocations.length > 0
              ? form.preferredLocations
              : undefined,
          noticePeriod: form.noticePeriod || undefined,
        },
        keywords: form.keywords.length > 0 ? form.keywords : undefined,
        availabilityStatus: form.availabilityStatus,
      });
      onOpenChange(false);
    } catch (err) {
      console.error("Save failed:", err);
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[700px] sm:w-[800px] overflow-y-auto !max-w-none p-0"
      >
        <div className="p-6 pb-0">
          <SheetHeader>
            <SheetTitle>{t("profile.selfEdit.title")}</SheetTitle>
            <SheetDescription>{t("profile.selfEdit.desc")}</SheetDescription>
          </SheetHeader>
        </div>

        <div className="p-6 space-y-1">
          {/* ===== Section 1: Basic Info ===== */}
          <SectionHeader num={1} label={t("admin.experts.editor.section.basic")} />
          {openSections.has(1) && (
            <div className="pl-6 space-y-4 pb-4">
              {/* Name (read-only) */}
              {expert && (
                <div className="space-y-1.5">
                  <Label>{t("profile.selfEdit.name")}</Label>
                  <Input value={expert.name} disabled className="opacity-60" />
                  <p className="text-xs text-muted-foreground">
                    {t("profile.selfEdit.nameHint")}
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="email@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Designation *</Label>
                <Input
                  value={form.designation}
                  onChange={(e) => updateField("designation", e.target.value)}
                  placeholder="e.g. Senior HR Consultant"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Organization *</Label>
                <Input
                  value={form.organization}
                  onChange={(e) => updateField("organization", e.target.value)}
                  placeholder="e.g. LLP Consultants Ltd."
                />
              </div>

              <div className="space-y-1.5">
                <Label>City *</Label>
                <Input
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  placeholder="e.g. Dhaka"
                />
              </div>

              <div className="space-y-1.5">
                <Label>LinkedIn URL</Label>
                <Input
                  value={form.linkedin}
                  onChange={(e) => updateField("linkedin", e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>

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

              <div className="space-y-1.5">
                <Label>Bio *</Label>
                <Textarea
                  value={form.bio}
                  onChange={(e) => updateField("bio", e.target.value)}
                  placeholder="Professional background and expertise..."
                  rows={4}
                />
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
                      {expert?.initials || "?"}
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

              {/* Keywords */}
              <div className="space-y-1.5">
                <Label>{t("profile.selfEdit.keywords")}</Label>
                <p className="text-xs text-muted-foreground">{t("profile.selfEdit.keywordsHint")}</p>
                <div className="flex gap-2">
                  <Input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    placeholder="e.g. Compliance, HR Audit"
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
                    <label
                      key={sector}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
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
                {/* Custom sectors */}
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

          {/* ===== Section 3: Certifications & Experience ===== */}
          <SectionHeader
            num={3}
            label={t("admin.experts.editor.section.credentials")}
          />
          {openSections.has(3) && (
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
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={cert.name}
                      onChange={(e) => {
                        const updated = [...form.certifications];
                        updated[i] = { ...updated[i], name: e.target.value };
                        updateField("certifications", updated);
                      }}
                      placeholder="Certification name"
                      className="flex-1"
                    />
                    <Input
                      value={cert.org ?? ""}
                      onChange={(e) => {
                        const updated = [...form.certifications];
                        updated[i] = { ...updated[i], org: e.target.value };
                        updateField("certifications", updated);
                      }}
                      placeholder="Org"
                      className="w-28"
                    />
                    <Input
                      value={cert.year ?? ""}
                      onChange={(e) => {
                        const updated = [...form.certifications];
                        updated[i] = { ...updated[i], year: e.target.value };
                        updateField("certifications", updated);
                      }}
                      placeholder="Year"
                      className="w-20"
                    />
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
                  <Label>Experience ({form.experiences.length})</Label>
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
                  <div
                    key={i}
                    className="border rounded-lg p-3 space-y-2 relative"
                  >
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
                        <Label className="text-xs">Title *</Label>
                        <Input
                          value={exp.title}
                          onChange={(e) => {
                            const updated = [...form.experiences];
                            updated[i] = {
                              ...updated[i],
                              title: e.target.value,
                            };
                            updateField("experiences", updated);
                          }}
                          placeholder="e.g. HR Audit"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Company</Label>
                        <Input
                          value={exp.company ?? ""}
                          onChange={(e) => {
                            const updated = [...form.experiences];
                            updated[i] = {
                              ...updated[i],
                              company: e.target.value || undefined,
                            };
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
                            updated[i] = {
                              ...updated[i],
                              location: e.target.value || undefined,
                            };
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
                        <Label className="text-xs">Role *</Label>
                        <Input
                          value={exp.role}
                          onChange={(e) => {
                            const updated = [...form.experiences];
                            updated[i] = {
                              ...updated[i],
                              role: e.target.value,
                            };
                            updateField("experiences", updated);
                          }}
                          placeholder="e.g. Lead Auditor"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Duration</Label>
                        <Input
                          value={exp.duration ?? ""}
                          onChange={(e) => {
                            const updated = [...form.experiences];
                            updated[i] = {
                              ...updated[i],
                              duration: e.target.value || undefined,
                            };
                            updateField("experiences", updated);
                          }}
                          placeholder="e.g. 2019–2022"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Scope</Label>
                      <Input
                        value={exp.scope ?? ""}
                        onChange={(e) => {
                          const updated = [...form.experiences];
                          updated[i] = {
                            ...updated[i],
                            scope: e.target.value || undefined,
                          };
                          updateField("experiences", updated);
                        }}
                        placeholder="e.g. Factory-level compliance"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== Section 4: Education ===== */}
          <SectionHeader num={4} label="Education" />
          {openSections.has(4) && (
            <div className="pl-6 space-y-4 pb-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Education ({form.education.length})</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      updateField("education", [
                        ...form.education,
                        { degree: "", institution: "" },
                      ])
                    }
                  >
                    <Plus className="size-3.5 mr-1" />
                    Add
                  </Button>
                </div>
                {form.education.map((edu, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={edu.degree}
                      onChange={(e) => {
                        const updated = [...form.education];
                        updated[i] = { ...updated[i], degree: e.target.value };
                        updateField("education", updated);
                      }}
                      placeholder="Degree *"
                      className="flex-1"
                    />
                    <Input
                      value={edu.institution}
                      onChange={(e) => {
                        const updated = [...form.education];
                        updated[i] = { ...updated[i], institution: e.target.value };
                        updateField("education", updated);
                      }}
                      placeholder="Institution *"
                      className="flex-1"
                    />
                    <Input
                      value={edu.fieldOfStudy ?? ""}
                      onChange={(e) => {
                        const updated = [...form.education];
                        updated[i] = { ...updated[i], fieldOfStudy: e.target.value || undefined };
                        updateField("education", updated);
                      }}
                      placeholder="Field of Study"
                      className="w-32"
                    />
                    <Input
                      value={edu.year ?? ""}
                      onChange={(e) => {
                        const updated = [...form.education];
                        updated[i] = { ...updated[i], year: e.target.value || undefined };
                        updateField("education", updated);
                      }}
                      placeholder="Year"
                      className="w-20"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-destructive"
                      onClick={() =>
                        updateField(
                          "education",
                          form.education.filter((_, j) => j !== i)
                        )
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== Section 5: Languages ===== */}
          <SectionHeader num={5} label="Languages" />
          {openSections.has(5) && (
            <div className="pl-6 space-y-4 pb-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Languages ({form.languages.length})</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      updateField("languages", [
                        ...form.languages,
                        { name: "" },
                      ])
                    }
                  >
                    <Plus className="size-3.5 mr-1" />
                    Add
                  </Button>
                </div>
                {form.languages.map((lang, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={lang.name}
                      onChange={(e) => {
                        const updated = [...form.languages];
                        updated[i] = { ...updated[i], name: e.target.value };
                        updateField("languages", updated);
                      }}
                      placeholder="Language name"
                      className="flex-1"
                    />
                    <Select
                      value={lang.proficiency ?? ""}
                      onValueChange={(v) => {
                        const updated = [...form.languages];
                        updated[i] = {
                          ...updated[i],
                          proficiency: v as "native" | "fluent" | "advanced" | "intermediate" | "basic",
                        };
                        updateField("languages", updated);
                      }}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Proficiency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="native">Native</SelectItem>
                        <SelectItem value="fluent">Fluent</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="basic">Basic</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-destructive"
                      onClick={() =>
                        updateField(
                          "languages",
                          form.languages.filter((_, j) => j !== i)
                        )
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== Section 6: Projects ===== */}
          <SectionHeader num={6} label="Projects" />
          {openSections.has(6) && (
            <div className="pl-6 space-y-4 pb-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Projects ({form.projects.length})</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      updateField("projects", [
                        ...form.projects,
                        { name: "" },
                      ])
                    }
                  >
                    <Plus className="size-3.5 mr-1" />
                    Add
                  </Button>
                </div>
                {form.projects.map((proj, i) => (
                  <div
                    key={i}
                    className="border rounded-lg p-3 space-y-2 relative"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6 absolute top-2 right-2 text-destructive"
                      onClick={() =>
                        updateField(
                          "projects",
                          form.projects.filter((_, j) => j !== i)
                        )
                      }
                    >
                      <Trash2 className="size-3" />
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Project Name *</Label>
                        <Input
                          value={proj.name}
                          onChange={(e) => {
                            const updated = [...form.projects];
                            updated[i] = { ...updated[i], name: e.target.value };
                            updateField("projects", updated);
                          }}
                          placeholder="e.g. Compliance Overhaul"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Client</Label>
                        <Input
                          value={proj.client ?? ""}
                          onChange={(e) => {
                            const updated = [...form.projects];
                            updated[i] = { ...updated[i], client: e.target.value || undefined };
                            updateField("projects", updated);
                          }}
                          placeholder="e.g. Acme Corp"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Duration</Label>
                        <Input
                          value={proj.duration ?? ""}
                          onChange={(e) => {
                            const updated = [...form.projects];
                            updated[i] = { ...updated[i], duration: e.target.value || undefined };
                            updateField("projects", updated);
                          }}
                          placeholder="e.g. 6 months"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Outcome</Label>
                        <Input
                          value={proj.outcome ?? ""}
                          onChange={(e) => {
                            const updated = [...form.projects];
                            updated[i] = { ...updated[i], outcome: e.target.value || undefined };
                            updateField("projects", updated);
                          }}
                          placeholder="e.g. 100% audit pass rate"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Textarea
                        value={proj.description ?? ""}
                        onChange={(e) => {
                          const updated = [...form.projects];
                          updated[i] = { ...updated[i], description: e.target.value || undefined };
                          updateField("projects", updated);
                        }}
                        placeholder="Brief project description..."
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== Section 7: Affiliations ===== */}
          <SectionHeader num={7} label="Affiliations" />
          {openSections.has(7) && (
            <div className="pl-6 space-y-4 pb-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Affiliations ({form.affiliations.length})</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      updateField("affiliations", [
                        ...form.affiliations,
                        { name: "" },
                      ])
                    }
                  >
                    <Plus className="size-3.5 mr-1" />
                    Add
                  </Button>
                </div>
                {form.affiliations.map((aff, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={aff.name}
                      onChange={(e) => {
                        const updated = [...form.affiliations];
                        updated[i] = { ...updated[i], name: e.target.value };
                        updateField("affiliations", updated);
                      }}
                      placeholder="Organization Name"
                      className="flex-1"
                    />
                    <Input
                      value={aff.role ?? ""}
                      onChange={(e) => {
                        const updated = [...form.affiliations];
                        updated[i] = { ...updated[i], role: e.target.value || undefined };
                        updateField("affiliations", updated);
                      }}
                      placeholder="Role"
                      className="w-36"
                    />
                    <Input
                      value={aff.since ?? ""}
                      onChange={(e) => {
                        const updated = [...form.affiliations];
                        updated[i] = { ...updated[i], since: e.target.value || undefined };
                        updateField("affiliations", updated);
                      }}
                      placeholder="Since"
                      className="w-24"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-destructive"
                      onClick={() =>
                        updateField(
                          "affiliations",
                          form.affiliations.filter((_, j) => j !== i)
                        )
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== Section 8: Session & Headhunting ===== */}
          <SectionHeader
            num={8}
            label={t("admin.experts.editor.section.session")}
          />
          {openSections.has(8) && (
            <div className="pl-6 space-y-4 pb-4">
              {/* Availability status */}
              <div className="space-y-1.5">
                <Label>{t("profile.selfEdit.availability")}</Label>
                <Select
                  value={form.availabilityStatus}
                  onValueChange={(v) =>
                    updateField(
                      "availabilityStatus",
                      v as "available" | "busy" | "on_leave"
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="busy">Busy</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Session lengths */}
              <div className="space-y-2">
                <Label>Session Lengths (minutes)</Label>
                <div className="flex gap-3">
                  {SESSION_LENGTHS.map((len) => (
                    <label
                      key={len}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={form.sessionLengths.includes(len)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateField("sessionLengths", [
                              ...form.sessionLengths,
                              len,
                            ]);
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

              <div className="space-y-1.5">
                <Label>Availability Notes</Label>
                <Textarea
                  value={form.availabilityNotes}
                  onChange={(e) =>
                    updateField("availabilityNotes", e.target.value)
                  }
                  placeholder="e.g. Available weekdays after 6 PM"
                  rows={2}
                />
              </div>

              {/* Headhunting */}
              <div className="space-y-3 border-t pt-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.headhuntingOptedIn}
                    onChange={(e) =>
                      updateField("headhuntingOptedIn", e.target.checked)
                    }
                    className="rounded border-input"
                  />
                  {t("profile.selfEdit.headhuntingOptIn")}
                </label>

                {form.headhuntingOptedIn && (
                  <div className="space-y-3 pl-6">
                    <div className="space-y-1.5">
                      <Label className="text-xs">CTC Range</Label>
                      <Input
                        value={form.ctcRange}
                        onChange={(e) =>
                          updateField("ctcRange", e.target.value)
                        }
                        placeholder="e.g. 30-50 LPA"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Notice Period</Label>
                      <Input
                        value={form.noticePeriod}
                        onChange={(e) =>
                          updateField("noticePeriod", e.target.value)
                        }
                        placeholder="e.g. 60 days"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Preferred Locations</Label>
                      <div className="flex gap-2">
                        <Input
                          value={locationInput}
                          onChange={(e) => setLocationInput(e.target.value)}
                          placeholder="e.g. Dhaka"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && locationInput.trim()) {
                              e.preventDefault();
                              if (
                                !form.preferredLocations.includes(
                                  locationInput.trim()
                                )
                              ) {
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
                            if (
                              locationInput.trim() &&
                              !form.preferredLocations.includes(
                                locationInput.trim()
                              )
                            ) {
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
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {form.preferredLocations.map((loc) => (
                            <Badge
                              key={loc}
                              variant="secondary"
                              className="gap-1 pr-1"
                            >
                              {loc}
                              <button
                                type="button"
                                onClick={() =>
                                  updateField(
                                    "preferredLocations",
                                    form.preferredLocations.filter(
                                      (x) => x !== loc
                                    )
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
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Skills info (read-only notice) */}
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 mt-2">
            <p className="text-xs text-muted-foreground">
              {t("profile.selfEdit.skillsNote")}
            </p>
          </div>
        </div>

        <SheetFooter className="sticky bottom-0 border-t bg-card p-4">
          <div className="flex w-full justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {t("profile.selfEdit.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t("profile.selfEdit.saving") : t("profile.selfEdit.save")}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
