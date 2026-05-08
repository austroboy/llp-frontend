"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useAccountType } from "@/components/providers/account-context";
import { useFormPrefill } from "@/hooks/use-form-prefill";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { INDUSTRIES } from "@/lib/constants";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  Globe,
  Loader2,
  Network,
  Send,
  Shield,
  Sparkles,
  Upload,
  User,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ScoutInsightSidebar, ScoutInsightMobileStrip } from "@/components/headhunting/scout-insight-cards";

// ═══════════════════════════════════════════════════════════════
// Option lists for the 18 sections
// ═══════════════════════════════════════════════════════════════

const PROFESSIONAL_BASES = [
  "Accounting and Finance",
  "Production and Operations",
  "Agriculture, Livestock and Fisheries",
  "Banking and Financial Services",
  "Hospitality, Travel and Tourism",
  "NGO and Development",
  "Supply Chain and Procurement",
  "Commercial and Business Development",
  "Research and Consultancy",
  "Education and Training",
  "Information Technology and Telecommunications",
  "Reception and Executive Support",
  "Engineering and Architecture",
  "Marketing and Sales",
  "Data Entry, Operations Support and BPO",
  "Garments and Textiles",
  "Customer Service and Call Centre",
  "Design and Creative",
  "Human Resources and Organizational Development",
  "Media, Advertising and Events",
  "Security and Support Services",
  "General Management and Administration",
  "Pharmaceuticals",
  "Law and Legal",
  "Healthcare and Medical",
  "Electrical and Electronics Technical Services",
  "Company Secretary and Regulatory Affairs",
  "Driving and Transport Support",
  "Pathology and Laboratory Support",
  "Mechanical and Technical Services",
  "Chef and Kitchen Operations",
  "Security Guard Services",
  "Nursing",
  "Office Support Services",
  "Food Service and Waiting Staff",
  "Delivery and Field Support",
  "Sales Representative",
  "Retail and Showroom Sales",
  "Graphic Design",
  "Caregiving and Childcare",
  "Garments Technical and Machine Operations",
  "CAD and Drafting Support",
  "Housekeeping",
  "Welding and Fabrication",
  "Plumbing and Pipe Fitting",
  "Sewing Machine Operations",
  "Cleaning Services",
  "Masonry and Construction Support",
  "Gym and Fitness Training",
  "Beauty and Salon Services",
  "Gardening and Grounds Support",
  "Interpretation and Language Support",
  "Fire Safety and Firefighting",
  "Religious Services",
  "Carpentry and Woodwork",
  "Physiotherapy",
  "Other",
];

const FUNCTIONS = [
  "Accounting and Finance",
  "Production and Operations", 
  "Agriculture, Livestock and Fisheries",
  "Banking and Financial Services",
  "Hospitality, Travel and Tourism",
  "NGO and Development",
  "Supply Chain and Procurement",
  "Commercial and Business Development",
  "Research and Consultancy",
  "Education and Training",
  "Information Technology and Telecommunications",
  "Reception and Executive Support",
  "Engineering and Architecture",
  "Marketing and Sales",
  "Data Entry, Operations Support and BPO",
  "Garments and Textiles",
  "Customer Service and Call Centre",
  "Design and Creative",
  "Human Resources and Organizational Development",
  "Media, Advertising and Events", 
  "Security and Support Services",
  "General Management and Administration",
  "Pharmaceuticals",
  "Law and Legal",
  "Healthcare and Medical",
  "Electrical and Electronics Technical Services",
  "Company Secretary and Regulatory Affairs",
  "Driving and Transport Support",
  "Pathology and Laboratory Support",
  "Mechanical and Technical Services",
  "Chef and Kitchen Operations",
  "Security Guard Services",
  "Nursing",
  "Office Support Services",
  "Food Service and Waiting Staff",
  "Delivery and Field Support",
  "Sales Representative",
  "Retail and Showroom Sales",
  "Graphic Design",
  "Caregiving and Childcare",
  "Garments Technical and Machine Operations",
  "CAD and Drafting Support",
  "Housekeeping",
  "Welding and Fabrication",
  "Plumbing and Pipe Fitting",
  "Sewing Machine Operations",
  "Cleaning Services",
  "Masonry and Construction Support",
  "Gym and Fitness Training",
  "Beauty and Salon Services",
  "Gardening and Grounds Support",
  "Interpretation and Language Support",
  "Fire Safety and Firefighting",
  "Religious Services",
  "Carpentry and Woodwork",
  "Physiotherapy",
];

// INDUSTRIES imported from @/lib/constants

const TALENT_SEGMENTS = [
  "Junior / Entry-level", "Mid-level Professionals", "Senior Management",
  "C-Suite / Executive", "Technical Specialists", "Blue Collar / Factory",
  "Freshers / Graduates", "Diaspora / Returnees", "Expats",
  "Freelancers / Gig Workers", "Board / Advisory",
];

const ACCESS_BASIS = [
  "Current colleagues / team", "Former colleagues network", "Alumni network",
  "Professional association members", "Industry conference contacts", "Social media network (LinkedIn)",
  "Community / civic group connections", "Personal referral network", "Vendor / supplier relationships",
  "Client relationships", "Academic / university connections",
];

const ROLE_LEVELS = [
  "Junior / Entry (0-2 yrs)", "Associate (2-5 yrs)", "Mid-level (5-8 yrs)",
  "Senior (8-12 yrs)", "Manager / Lead", "Senior Manager / Associate Director",
  "Director", "VP / AVP / SVP", "C-Suite (CEO, CFO, COO, etc.)", "Board / Advisory",
];

const HIRING_EXP_TYPES = [
  "Direct sourcing / headhunting", "Referral-based hiring", "CV screening / shortlisting",
  "Candidate assessment / fit validation", "Leadership hiring",
  "Bulk / volume hiring", "Campus / graduate recruitment",
  "Cross-border hiring", "Confidential / retained search",
  "Replacement / urgent hiring",
];

const HIRING_SCOPES = [
  "Single organization / in-house", "Group of companies",
  "Multi-client / agency / consulting", "Regional scope", "Global scope",
];

const SENIORITY_EXPOSURE = [
  "Entry level", "Mid-level professionals", "Senior professionals",
  "Leadership / head of function", "Executive / C-level",
];

const COUNTRIES = [
  "Bangladesh", "India", "Pakistan", "Sri Lanka", "Nepal",
  "UAE", "Saudi Arabia", "Qatar", "Kuwait", "Oman", "Bahrain",
  "Malaysia", "Singapore", "Thailand", "Indonesia",
  "UK", "USA", "Canada", "Australia", "Germany",
  "China", "Japan", "South Korea", "Other",
];

const CORRIDORS = [
  "Domestic hiring in Bangladesh", "Bangladesh ↔ India", "Bangladesh ↔ Middle East",
  "Bangladesh ↔ Southeast Asia", "Bangladesh ↔ UK/Europe", "Bangladesh ↔ USA/Canada",
  "India ↔ Middle East", "Cross-border (other)", "Global mobility",
];

const MANDATE_TYPES = [
  "Urgent / time-critical", "Confidential / retained", "Niche / specialist",
  "Bulk / volume", "Leadership / C-suite", "Cross-border / relocation",
  "Replacement / backfill", "Project-based / contract",
];

const DEFAULT_COMMUNITIES = [
  "IPM Bangladesh",
  "Bangladesh FMCG HR Society",
  "HR Professionals in Bangladesh (HRPB)",
  "ICAB",
  "ICMAB",
  "CFA Society Bangladesh",
  "IEB",
  "IEEE Bangladesh Section",
  "IEAB",
  "NOSHTRI",
  "RSC",
  "Nirapon",
  "BSCMS",
  "CIPS Bangladesh Branch",
  "BPPA",
  "BASIS",
  "Bangladesh Computer Society",
  "BACCO",
  "Bangladesh Bar Council",
  "Bangladesh Supreme Court Bar Association",
  "Dhaka Bar Association",
  "Marketers' Institute, Bangladesh",
  "Marketing Society of Bangladesh (MSB)",
  "BSHRM",
  "SHRM",
];

const DEFAULT_COMMUNITY_ROLES = [
  "Member",
  "Volunteer / Organizer", 
  "Speaker / Trainer",
  "Office Bearer / Committee",
  "Active Participant",
  "Board Member",
  "Advisory Role",
  "Chapter Lead",
  "Other",
];

const POPULAR_FUNCTIONS = [
  "Human Resources and Organizational Development",
  "Marketing and Sales", 
  "Accounting and Finance",
  "Information Technology and Telecommunications",
  "Engineering and Architecture",
  "Production and Operations",
  "Supply Chain and Procurement",
  "Commercial and Business Development",
];

const POPULAR_INDUSTRIES = [
  "Banking and Financial Services",
  "Information Technology",
  "Garments and Textiles",
  "Pharmaceuticals",
  "Real Estate and Property Development",
  "Telecommunications",
  "Education and Training",
  "Manufacturing",
];

const INVOLVEMENT_TYPES = [
  "Source & refer candidates only", "Source + initial screening",
  "Full cycle (source to offer)", "Advisory / strategic support",
  "Market mapping / intelligence", "Interview coordination",
];

const VISIBILITY_OPTIONS = [
  { value: "internal_only", label: "LLP Internal only — visible only to LLP team" },
  { value: "limited_public", label: "Limited public profile — name and function visible, no direct contact" },
];

// ═══════════════════════════════════════════════════════════════
// Step definitions
// ═══════════════════════════════════════════════════════════════

const STEPS = [
  { id: 0, title: "Basic Identity", sections: "S1-S2" },
  { id: 1, title: "Specialization", sections: "S3-S4" },
  { id: 2, title: "Talent Access", sections: "S5-S7" },
  { id: 3, title: "Hiring Experience", sections: "S8-S9" },
  { id: 4, title: "Geography & Hiring Reach", sections: "S10-S12" },
  { id: 5, title: "Mandate & Network", sections: "S13-S15" },
  { id: 6, title: "Preferences", sections: "S16-S17" },
  { id: 7, title: "Confirm & Submit", sections: "S18" },
];

// ═══════════════════════════════════════════════════════════════
// Multi-select tag component
// ═══════════════════════════════════════════════════════════════

function TagSelect({
  options, selected, onChange, max, label, hint,
}: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  max?: number;
  label: string;
  hint?: string;
}) {
  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt));
    } else if (!max || selected.length < max) {
      onChange([...selected, opt]);
    } else {
      toast.error(`Maximum ${max} selections allowed`);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">{label} {max && <span className="text-muted-foreground">(max {max})</span>}</Label>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <Badge
            key={opt}
            variant={selected.includes(opt) ? "default" : "outline"}
            className={cn(
              "cursor-pointer text-[11px] transition-colors",
              selected.includes(opt) && "bg-primary text-primary-foreground"
            )}
            onClick={() => toggle(opt)}
          >
            {selected.includes(opt) && <Check className="size-2.5 mr-0.5" />}
            {opt}
          </Badge>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════

export default function ScoutJoinPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { isOrgUser } = useAccountType();
  const { prefill, isLoaded: prefillLoaded } = useFormPrefill();
  const clerkId = user?.id || "";

  const existingProfile = useQuery(
    api.headhunting.scoutProfiles.getByUser,
    clerkId ? { clerkId } : "skip"
  );
  const upsert = useMutation(api.headhunting.scoutProfiles.upsert);
  const submitProfile = useMutation(api.headhunting.scoutProfiles.submit);
  const resetForReapply = useMutation(api.headhunting.scoutProfiles.resetForReapply);
  const generateUploadUrl = useMutation(api.headhunting.scoutProfiles.generateUploadUrl);

  const [step, setStep] = useState(0);
  const [showFormAnyway, setShowFormAnyway] = useState(false);
  const [resettingForReapply, setResettingForReapply] = useState(false);
  const [saving, setSaving] = useState(false);
  const [triedNext, setTriedNext] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [professionalBaseOpen, setProfessionalBaseOpen] = useState(false);
  const [communityOpenStates, setCommunityOpenStates] = useState<Record<number, boolean>>({});
  const [roleOpenStates, setRoleOpenStates] = useState<Record<number, boolean>>({});
  const [functionPrimaryOpen, setFunctionPrimaryOpen] = useState(false);
  const [functionSecondaryOpen, setFunctionSecondaryOpen] = useState(false);
  const [industryPrimaryOpen, setIndustryPrimaryOpen] = useState(false);
  const [industrySecondaryOpen, setIndustrySecondaryOpen] = useState(false);
  const [sourcingMarketsOpen, setSourcingMarketsOpen] = useState(false);
  const [marketFamiliarityOpen, setMarketFamiliarityOpen] = useState(false);
  const stepRef = useRef(step);
  stepRef.current = step;

  // Form state — mirrors all 18 sections
  // Restore from localStorage if available (survives sign-in redirect)
  const [form, setForm] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("llp_scout_draft");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {
    // S1
    fullName: "", currentTitle: "", currentCompany: "", location: "",
    mobile: "", email: "", linkedin: "", oneLiner: "", totalYearsExperience: "",
    recruitmentYears: "", hiringPercentage: "",
    // S2
    professionalBase: "",
    professionalBaseOther: "",
    // S3
    functionPrimary: [] as string[], functionSecondary: [] as string[], functionBasis: "",
    // S4
    industryPrimary: [] as string[], industrySecondary: [] as string[], industryBasis: "",
    // S5-S6
    talentAccessSegments: [] as string[], talentAccessBasis: [] as string[],
    // S7-S8
    hiringExperienceTypes: [] as string[], hiringScope: [] as string[], seniorityExposure: [] as string[],
    // S10-S11 (legacy — kept for backward compat)
    countriesSupported: [] as string[], countriesOther: "", hiringCorridors: [] as string[], corridorsOther: "",
    // S12 (legacy)
    geographyExposure: [] as { geography: string; exposureTypes: string[] }[],
    // S10-S12 v2: Enhanced Geography
    primarySourcingMarkets: [] as { country: string; strength: string; type: string }[],
    crossBorderCorridors: [] as { corridor: string; strength: string; type: string }[],
    marketFamiliarity: [] as string[],
    geographyExample: "",
    // S13
    mandateTypeStrengths: [] as string[],
    // S14
    communitiesPrimary: [] as { name: string; role?: string; isCustom?: boolean; customRole?: boolean }[],
    communitiesAdditional: [] as { name: string; role?: string; isCustom?: boolean; customRole?: boolean }[],
    // S16
    activeScouting: false, involvementTypes: [] as string[],
    willingConfidential: false, willingCrossBorder: false,
    preferredLevels: [] as string[],
    // S17
    visibility: "internal_only" as "internal_only" | "limited_public",
    // S18
    confirmMasterAcceptance: false, confirmEmployerTrust: false, confirmPlatformConduct: false,
    talentBankConsent: false, talentBankCvStorageId: "" as string,
  };
  });

  // Block org users from accessing scout join
  useEffect(() => {
    if (isOrgUser) router.replace("/headhunting");
  }, [isOrgUser, router]);

  // Auto-save form to localStorage (survives sign-in redirect)

  useEffect(() => {
    try {
      localStorage.setItem("llp_scout_draft", JSON.stringify(form));
    } catch {}
  }, [form]);

  // Clear localStorage after successful Convex save
  useEffect(() => {
    if (existingProfile?._id) {
      try { localStorage.removeItem("llp_scout_draft"); } catch {}
    }
  }, [existingProfile]);

  // Load existing draft — only once on first load, not on every Convex update
  useEffect(() => {
    if (draftLoaded) return;
    if (existingProfile && existingProfile.status === "draft") {
      setForm((f: any) => ({
        ...f,
        fullName: existingProfile.fullName || f.fullName,
        currentTitle: existingProfile.currentTitle || "",
        currentCompany: existingProfile.currentCompany || "",
        location: existingProfile.location || "",
        mobile: existingProfile.mobile || "",
        email: existingProfile.email || f.email,
        linkedin: existingProfile.linkedin || "",
        oneLiner: existingProfile.oneLiner || "",
        totalYearsExperience: (existingProfile as any).totalYearsExperience || "",
        recruitmentYears: (existingProfile as any).recruitmentYears || "",
        hiringPercentage: (existingProfile as any).hiringPercentage || "",
        professionalBase: existingProfile.professionalBase || "",
        professionalBaseOther: existingProfile.professionalBaseOther || "",
        functionPrimary: existingProfile.functionPrimary || [],
        functionSecondary: existingProfile.functionSecondary || [],
        functionBasis: existingProfile.functionBasis || "",
        industryPrimary: existingProfile.industryPrimary || [],
        industrySecondary: existingProfile.industrySecondary || [],
        industryBasis: existingProfile.industryBasis || "",
        talentAccessSegments: existingProfile.talentAccessSegments || [],
        talentAccessBasis: existingProfile.talentAccessBasis || [],
        hiringExperienceTypes: existingProfile.hiringExperienceTypes || [],
        hiringScope: existingProfile.hiringScope || [],
        seniorityExposure: (existingProfile as any).seniorityExposure || [],
        countriesSupported: existingProfile.countriesSupported || [],
        hiringCorridors: existingProfile.hiringCorridors || [],
        geographyExposure: existingProfile.geographyExposure || [],
        primarySourcingMarkets: (existingProfile as any).primarySourcingMarkets || [],
        crossBorderCorridors: (existingProfile as any).crossBorderCorridors || [],
        marketFamiliarity: (existingProfile as any).marketFamiliarity || [],
        geographyExample: (existingProfile as any).geographyExample || "",
        mandateTypeStrengths: existingProfile.mandateTypeStrengths || [],
        communitiesPrimary: existingProfile.communitiesPrimary || [],
        communitiesAdditional: existingProfile.communitiesAdditional || [],
        activeScouting: existingProfile.activeScouting || false,
        involvementTypes: existingProfile.involvementTypes || [],
        willingConfidential: existingProfile.willingConfidential || false,
        willingCrossBorder: existingProfile.willingCrossBorder || false,
        preferredLevels: existingProfile.preferredLevels || [],
        visibility: (existingProfile.visibility === "internal_only" || existingProfile.visibility === "limited_public")
          ? existingProfile.visibility : "internal_only",
        confirmMasterAcceptance: existingProfile.confirmMasterAcceptance || false,
        confirmPlatformConduct: existingProfile.confirmPlatformConduct || false,
        talentBankConsent: (existingProfile as any).talentBankConsent || false,
        talentBankCvStorageId: (existingProfile as any).talentBankCvStorageId || "",
      }));
      setStep(existingProfile.currentStep || 0);
      setDraftLoaded(true);
    }
    // Also mark loaded if profile came back as null/undefined (no draft exists)
    if (existingProfile === null) {
      setDraftLoaded(true);
    }
  }, [existingProfile, draftLoaded]);

  // Prefill from Clerk + Convex profile
  useEffect(() => {
    if (!prefillLoaded) return;
    setForm((f: any) => ({
      ...f,
      fullName: f.fullName || prefill.fullName,
      email: f.email || prefill.email,
      mobile: f.mobile || prefill.phone,
      currentTitle: f.currentTitle || prefill.designation,
      currentCompany: f.currentCompany || prefill.company,
      location: f.location || prefill.location,
      linkedin: f.linkedin || prefill.linkedin,
    }));
  }, [prefillLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Whitelist sanitizer: ONLY send fields the Convex validator accepts ──
  // This eliminates the entire class of "extra field" bugs permanently.
  const sanitizeForConvex = useCallback((rawForm: any) => {
    const ALLOWED_FIELDS = new Set([
      "fullName", "currentTitle", "currentCompany", "location", "mobile", "email",
      "linkedin", "oneLiner", "totalYearsExperience",
      "professionalBase", "professionalBaseOther",
      "functionPrimary", "functionSecondary", "functionBasis",
      "industryPrimary", "industrySecondary", "industryBasis",
      "talentAccessSegments", "talentAccessBasis",
      "roleLevelReach", "hiringExperienceTypes", "hiringScope", "seniorityExposure",
      "recruitmentYears", "hiringPercentage",
      "countriesSupported", "countriesOther", "hiringCorridors", "corridorsOther",
      "geographyExposure", "primarySourcingMarkets", "crossBorderCorridors",
      "marketFamiliarity", "geographyExample",
      "mandateTypeStrengths",
      "communitiesPrimary", "communitiesAdditional",
      "activeScouting", "involvementTypes",
      "willingConfidential", "willingCrossBorder", "preferredLevels",
      "visibility", "identityMode",
      "confirmMasterAcceptance", "confirmEmployerTrust", "confirmPlatformConduct",
      "talentBankConsent", "talentBankCvStorageId",
    ]);

    const safe: Record<string, any> = {};
    for (const [key, val] of Object.entries(rawForm)) {
      if (ALLOWED_FIELDS.has(key) && val !== undefined) safe[key] = val;
    }

    // Clean nested objects — only keep Convex-valid keys
    if (safe.communitiesPrimary) {
      safe.communitiesPrimary = safe.communitiesPrimary.map((c: any) => ({ name: c.name, role: c.role, country: c.country }));
    }
    if (safe.communitiesAdditional) {
      safe.communitiesAdditional = safe.communitiesAdditional.map((c: any) => ({ name: c.name, role: c.role }));
    }
    if (safe.crossBorderCorridors) {
      safe.crossBorderCorridors = safe.crossBorderCorridors.map((c: any) => ({ corridor: c.corridor, strength: c.strength, type: c.type }));
    }
    if (safe.geographyExposure) {
      safe.geographyExposure = safe.geographyExposure.map((g: any) => ({ geography: g.geography, exposureTypes: g.exposureTypes }));
    }
    if (safe.primarySourcingMarkets) {
      safe.primarySourcingMarkets = safe.primarySourcingMarkets.map((m: any) => ({ country: m.country, strength: m.strength, type: m.type }));
    }
    // Strip empty talentBankCvStorageId — Convex expects valid storage ID or undefined
    if (!safe.talentBankCvStorageId) delete safe.talentBankCvStorageId;

    return safe;
  }, []);

  // Auto-save — uses stepRef to always get the latest step value
  const autoSave = useCallback(async (overrideStep?: number) => {
    if (!clerkId) return;
    setSaving(true);
    try {
      const safe = sanitizeForConvex(form);
      await upsert({ clerkId, ...safe, currentStep: overrideStep ?? stepRef.current });
    } catch {
      // Silent fail on auto-save
    } finally {
      setSaving(false);
    }
  }, [clerkId, form, upsert, sanitizeForConvex]);

  const goNext = () => {
    // Step-specific validation — all mandatory fields must be filled before proceeding
    const missing: string[] = [];

    if (step === 0) {
      // S1-S2: Basic Identity
      if (!form.fullName.trim()) missing.push("Full Name");
      if (!form.currentCompany.trim()) missing.push("Company / Organization");
      if (!form.location.trim()) missing.push("Location");
      if (!form.mobile.trim()) missing.push("Mobile");
      if (!form.email.trim()) missing.push("Email");
      if (!form.linkedin.trim()) missing.push("LinkedIn");
      if (!form.totalYearsExperience) missing.push("Total Years of Professional Experience");
      if (!form.professionalBase) missing.push("Professional Base");
    }

    if (step === 1) {
      // S3-S4: Function & Industry Specialization
      if (form.functionPrimary.length === 0) missing.push("Primary Function Specialization");
      if (form.industryPrimary.length === 0) missing.push("Primary Industry Specialization");
    }

    if (step === 2) {
      // S5-S6: Talent Access
      if (form.talentAccessSegments.length === 0) missing.push("Talent Access Segments");
      if (form.talentAccessBasis.length === 0) missing.push("Talent Access Basis");
    }

    if (step === 3) {
      // S8-S9: Hiring Experience
      if (form.hiringExperienceTypes.length === 0) missing.push("Hiring Experience Types");
      if (form.hiringScope.length === 0) missing.push("Hiring Scope Exposure");
      if (form.seniorityExposure.length === 0) missing.push("Role Seniority Exposure");
      if (!form.recruitmentYears) missing.push("Recruitment Years");
      if (!form.hiringPercentage) missing.push("Hiring Percentage");
    }

    if (step === 4) {
      // S10-S12 v2: Enhanced Geography
      if (form.primarySourcingMarkets.length === 0) {
        missing.push("Primary Sourcing Markets (min 1)");
      } else if (form.primarySourcingMarkets.some((m: any) => !m.strength || !m.type)) {
        missing.push("Primary Sourcing Markets — each must have Strength and Type set");
      }
      // Cross-border corridors are optional — but if any are added, validate them
      if (form.crossBorderCorridors.length > 0) {
        if (form.crossBorderCorridors.some((c: any) => !c.fromCountry || !c.toCountry)) {
          missing.push("Cross-border Corridors — each must have From and To country set");
        } else if (form.crossBorderCorridors.some((c: any) => !c.strength || !c.type)) {
          missing.push("Cross-border Corridors — each must have Strength and Type set");
        }
      }
      if (form.geographyExample && form.geographyExample.length > 250) {
        missing.push("Geography Example must be under 250 characters");
      }
    }

    if (step === 5) {
      // S14: Professional Communities & Networks
      const validCommunities = form.communitiesPrimary.filter((c: any) => c.name && c.name.trim() !== "");
      if (validCommunities.length === 0) missing.push("Professional Communities & Networks (add at least 1 with a name)");
      const missingCountry = validCommunities.some((c: any) => !c.country);
      if (missingCountry) missing.push("Country is required for each community");
    }

    if (step === 6) {
      // S16: Working Preferences — only validate mandate fields if actively scouting
      if (form.activeScouting) {
        if (form.involvementTypes.length === 0) missing.push("Involvement Type");
        if (form.preferredLevels.length === 0) missing.push("Preferred Levels to Work On");
      }
    }

    if (missing.length > 0) {
      setTriedNext(true);
      toast.error(`Please complete: ${missing.join(", ")}`);
      return;
    }
    setTriedNext(false);

    const nextStep = Math.min(step + 1, STEPS.length - 1);
    setStep(nextStep);
    // Save with the NEW step value, not the old one
    autoSave(nextStep).catch(() => {});
  };

  const goPrev = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    if (!clerkId) {
      toast.error("Please sign in first");
      return;
    }

    if (!form.confirmMasterAcceptance || !form.confirmPlatformConduct) {
      toast.error("Please accept all three confirmations before submitting");
      return;
    }

    setSubmitting(true);
    try {
      // Save and get profile ID directly from upsert — sanitizeForConvex strips all invalid fields
      const safe = sanitizeForConvex(form);
      const profileId = await upsert({ clerkId, ...safe, currentStep: stepRef.current });

      if (!profileId) {
        toast.error("Failed to save your profile. Please try again.");
        return;
      }

      const result = await submitProfile({ id: profileId });
      toast.success(`Application received! Your ID: ${result.profileId}`);
      router.push("/headhunting/scout");
    } catch (e) {
      console.error("[scout-join] Submit failed:", e);
      toast.error(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Already submitted — show notice but don't block
  if (existingProfile && existingProfile.status !== "draft" && !showFormAnyway) {
    const isRejected = existingProfile.status === "rejected";
    const isRemoved = existingProfile.status === "removed";
    const canReapply = isRejected || isRemoved;

    const handleReapply = async () => {
      if (!clerkId) return;
      setResettingForReapply(true);
      try {
        await resetForReapply({ clerkId });
        setShowFormAnyway(true);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to reset application");
      } finally {
        setResettingForReapply(false);
      }
    };

    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center space-y-4">
        {canReapply
          ? <XCircle className="size-12 mx-auto text-red-500" />
          : <CheckCircle2 className="size-12 mx-auto text-green-600" />}
        <h1 className="text-xl font-bold">
          {existingProfile.status === "submitted" ? "Application Received" :
           existingProfile.status === "approved" ? "Application Approved" :
           existingProfile.status === "rejected" ? "Application Not Approved" :
           existingProfile.status === "removed" ? "Scout Access Removed" :
           "Application Under Review"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {existingProfile.status === "submitted"
            ? "Your application has been submitted and is currently under verification. Once the review is completed, a confirmation email will be sent, and the updated status will also appear in your dashboard."
            : existingProfile.status === "approved"
            ? `Your scout profile ${existingProfile.profileId} is approved.`
            : existingProfile.status === "rejected"
            ? `Your application was not approved at this time. You may update your profile and re-apply.`
            : existingProfile.status === "removed"
            ? `Your scout access has been removed. You are welcome to re-apply at any time.`
            : `Your scout profile ${existingProfile.profileId} is under review.`}
        </p>
        <div className="flex items-center justify-center gap-3 mt-4">
          <Link href="/headhunting/scout">
            <Button type="button" variant="outline">Go to Scout Dashboard</Button>
          </Link>
          {canReapply && (
            <Button
              type="button"
              onClick={handleReapply}
              disabled={resettingForReapply}
            >
              {resettingForReapply ? <><Loader2 className="size-3.5 animate-spin mr-1" />Preparing...</> : "Re-apply Now"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!isLoaded) return <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>;

  const u = (key: string, value: unknown) => setForm((f: any) => ({ ...f, [key]: value }));

  // Block render for org users
  if (isOrgUser) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <Link href="/headhunting" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="size-4" /> Headhunting
      </Link>

      {/* Two-column layout: form (left) + insight sidebar (right) */}
      <div className="flex gap-8 items-start">
      {/* Left: form column */}
      <div className="flex-1 min-w-0 space-y-6">

      {/* Intro */}
      {step === 0 && !existingProfile && (
        <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Network className="size-5 text-primary" />
            <h2 className="text-lg font-bold">How Scouts Contribute and Earn</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            LLP Scouts are independent professionals who leverage their networks to connect talent with hiring mandates.
            You source candidates, we handle screening, compliance, and client delivery. You earn a share of the placement fee for every successful hire.
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><Sparkles className="size-3 text-primary" /> Earn per placement</span>
            <span className="flex items-center gap-1"><Shield className="size-3 text-primary" /> Confidential mandates</span>
            <span className="flex items-center gap-1"><Globe className="size-3 text-primary" /> Cross-border opportunities</span>
            <span className="flex items-center gap-1"><User className="size-3 text-primary" /> Identity stays private</span>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold">Scout Application</h1>
        <p className="text-sm text-muted-foreground">
          Step {step + 1} of {STEPS.length}: {STEPS[step].title}
          {saving && <span className="ml-2 text-primary"><Loader2 className="inline size-3 animate-spin" /> Saving...</span>}
        </p>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1">
        {STEPS.map((s) => (
          <div
            key={s.id}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors cursor-pointer",
              s.id <= step ? "bg-primary" : "bg-muted"
            )}
            onClick={() => { if (s.id <= step) setStep(s.id); }}
          />
        ))}
      </div>

      {/* Form content */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-5">
        {step === 0 && (
          <>
            {/* S1: Basic Identity */}
            <h3 className="text-sm font-semibold flex items-center gap-1.5"><User className="size-4 text-primary" /> Basic Identity</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label className="text-xs">Full Name *</Label>
                <Input value={form.fullName} onChange={(e) => u("fullName", e.target.value)} className={cn(triedNext && !form.fullName.trim() && "border-red-500 ring-1 ring-red-500")} /></div>
              <div className="space-y-1"><Label className="text-xs">Current Title</Label>
                <Input value={form.currentTitle} onChange={(e) => u("currentTitle", e.target.value)} placeholder="e.g. Head of HR" /></div>
              <div className="space-y-1"><Label className="text-xs">Company / Organization *</Label>
                <Input value={form.currentCompany} onChange={(e) => u("currentCompany", e.target.value)} className={cn(triedNext && !form.currentCompany.trim() && "border-red-500 ring-1 ring-red-500")} /></div>
              <div className="space-y-1"><Label className="text-xs">Location *</Label>
                <Input value={form.location} onChange={(e) => u("location", e.target.value)} placeholder="City, Country" className={cn(triedNext && !form.location.trim() && "border-red-500 ring-1 ring-red-500")} /></div>
              <div className="space-y-1"><Label className="text-xs">Mobile *</Label>
                <Input value={form.mobile} onChange={(e) => u("mobile", e.target.value)} placeholder="+880..." className={cn(triedNext && !form.mobile.trim() && "border-red-500 ring-1 ring-red-500")} /></div>
              <div className="space-y-1"><Label className="text-xs">Email *</Label>
                <Input value={form.email} onChange={(e) => u("email", e.target.value)} type="email" className={cn(triedNext && !form.email.trim() && "border-red-500 ring-1 ring-red-500")} /></div>
              <div className="space-y-1"><Label className="text-xs">LinkedIn *</Label>
                <Input value={form.linkedin} onChange={(e) => u("linkedin", e.target.value)} placeholder="https://linkedin.com/in/..." className={cn(triedNext && !form.linkedin.trim() && "border-red-500 ring-1 ring-red-500")} /></div>
              <div className="col-span-2 space-y-1"><Label className="text-xs">One-liner</Label>
                <Input value={form.oneLiner} onChange={(e) => u("oneLiner", e.target.value)} placeholder="In one sentence, describe the type of talent, industry, or network you can help LLP access." /></div>
            </div>
            {/* S1: Experience Depth */}
            <div className="space-y-1">
              <Label className="text-xs">Total Years of Professional Experience *</Label>
              <Select value={form.totalYearsExperience} onValueChange={(v) => u("totalYearsExperience", v)}>
                <SelectTrigger className={cn("text-xs h-9", triedNext && !form.totalYearsExperience && "border-red-500 ring-1 ring-red-500")}><SelectValue placeholder="Select range..." /></SelectTrigger>
                <SelectContent>
                  {["<2 years", "2–5 years", "5–10 years", "10–15 years", "15–20 years", "20+ years"].map(opt => (
                    <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* S2: Professional Base */}
            <div className="space-y-2 pt-2">
              <Label className="text-xs font-semibold">Current Professional Base *</Label>
              <Popover open={professionalBaseOpen} onOpenChange={setProfessionalBaseOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={professionalBaseOpen}
                    className={cn("w-full justify-between text-xs h-9 font-normal", triedNext && !form.professionalBase && "border-red-500 ring-1 ring-red-500")}
                  >
                    {form.professionalBase || "Select your base..."}
                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search professional base..." className="text-xs" />
                    <CommandEmpty>No professional base found.</CommandEmpty>
                    <CommandList>
                      <CommandGroup>
                        {PROFESSIONAL_BASES.map((base) => (
                          <CommandItem
                            key={base}
                            value={base}
                            onSelect={() => {
                              u("professionalBase", base);
                              setProfessionalBaseOpen(false);
                            }}
                            className="text-xs"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-3 w-3",
                                form.professionalBase === base ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {base}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {form.professionalBase === "Other" && (
                <Input
                  value={form.professionalBaseOther || ""}
                  onChange={(e) => u("professionalBaseOther", e.target.value)}
                  placeholder="Please specify your professional base"
                  className="text-xs mt-1.5"
                />
              )}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            {/* S3: Function Specialization */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Primary Function Specialization *</Label>
              <p className="text-[11px] text-muted-foreground">Select up to 3 functions where you have the strongest sourcing ability. Start typing to search.</p>
              
              {/* Selected Functions as Chips */}
              {form.functionPrimary.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {form.functionPrimary.map((func: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="text-xs px-2 py-1 flex items-center gap-1">
                      {func}
                      <button
                        type="button"
                        onClick={() => u("functionPrimary", form.functionPrimary.filter((f: string) => f !== func))}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
                        aria-label="Remove"
                      ><X className="size-3.5" /></button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Function Selector */}
              <Popover open={functionPrimaryOpen} onOpenChange={setFunctionPrimaryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={functionPrimaryOpen}
                    className="w-full justify-start text-xs h-9 font-normal text-left"
                    disabled={form.functionPrimary.length >= 3}
                  >
                    <ChevronsUpDown className="mr-2 h-3 w-3 shrink-0 opacity-50" />
                    {form.functionPrimary.length >= 3 
                      ? "Maximum 3 functions selected"
                      : "Search functions, e.g. HR, Engineering, Nursing"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search functions..." className="text-xs" />
                    <CommandEmpty>No functions found.</CommandEmpty>
                    <CommandList className="max-h-[300px]">
                      {/* Popular Choices First */}
                      {form.functionPrimary.length === 0 && (
                        <CommandGroup heading="Popular Choices">
                          {POPULAR_FUNCTIONS
                            .filter(func => !form.functionPrimary.includes(func))
                            .map((func) => (
                              <CommandItem
                                key={func}
                                value={func}
                                onSelect={() => {
                                  if (form.functionPrimary.length < 3) {
                                    const newSelection = [...form.functionPrimary, func];
                                    u("functionPrimary", newSelection);
                                    u("functionSecondary", form.functionSecondary.filter((s: string) => !newSelection.includes(s)));
                                    if (newSelection.length < 3) {
                                      setFunctionPrimaryOpen(true);
                                    } else {
                                      setFunctionPrimaryOpen(false);
                                    }
                                  }
                                }}
                                className="text-xs"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-3 w-3",
                                    form.functionPrimary.includes(func) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {func}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      )}
                      
                      {/* All Functions */}
                      <CommandGroup heading="All Functions">
                        {FUNCTIONS
                          .filter(func => !form.functionPrimary.includes(func))
                          .map((func) => (
                            <CommandItem
                              key={func}
                              value={func}
                              onSelect={() => {
                                if (form.functionPrimary.length < 3) {
                                  const newSelection = [...form.functionPrimary, func];
                                  u("functionPrimary", newSelection);
                                  u("functionSecondary", form.functionSecondary.filter((s: string) => !newSelection.includes(s)));
                                  if (newSelection.length < 3) {
                                    setFunctionPrimaryOpen(true);
                                  } else {
                                    setFunctionPrimaryOpen(false);
                                  }
                                }
                              }}
                              className="text-xs"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-3 w-3",
                                  form.functionPrimary.includes(func) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {func}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            {/* Secondary Functions */}
            <div className="space-y-2 pt-3">
              <Label className="text-xs font-semibold">Secondary Functions</Label>
              <p className="text-[11px] text-muted-foreground">Select up to 5 additional functions you can support. These complement your primary specialization.</p>
              
              {/* Selected Secondary Functions as Chips */}
              {form.functionSecondary.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {form.functionSecondary.map((func: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-xs px-2 py-1 flex items-center gap-1">
                      {func}
                      <button
                        type="button"
                        onClick={() => u("functionSecondary", form.functionSecondary.filter((f: string) => f !== func))}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
                        aria-label="Remove"
                      ><X className="size-3.5" /></button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Secondary Function Selector */}
              <Popover open={functionSecondaryOpen} onOpenChange={setFunctionSecondaryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={functionSecondaryOpen}
                    className="w-full justify-start text-xs h-9 font-normal text-left"
                    disabled={form.functionSecondary.length >= 5}
                  >
                    <ChevronsUpDown className="mr-2 h-3 w-3 shrink-0 opacity-50" />
                    {form.functionSecondary.length >= 5 
                      ? "Maximum 5 secondary functions selected"
                      : "Add secondary functions..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search functions..." className="text-xs" />
                    <CommandEmpty>No functions found.</CommandEmpty>
                    <CommandList className="max-h-[300px]">
                      {/* Available Functions (excluding primary selections) */}
                      <CommandGroup heading="Available Functions">
                        {FUNCTIONS
                          .filter(func => !form.functionPrimary.includes(func) && !form.functionSecondary.includes(func))
                          .map((func) => (
                            <CommandItem
                              key={func}
                              value={func}
                              onSelect={() => {
                                if (form.functionSecondary.length < 5) {
                                  const newSelection = [...form.functionSecondary, func];
                                  u("functionSecondary", newSelection);
                                  if (newSelection.length < 5) {
                                    setFunctionSecondaryOpen(true);
                                  } else {
                                    setFunctionSecondaryOpen(false);
                                  }
                                }
                              }}
                              className="text-xs"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-3 w-3",
                                  form.functionSecondary.includes(func) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {func}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1"><Label className="text-xs">Why these functions?</Label>
              <Textarea value={form.functionBasis} onChange={(e) => u("functionBasis", e.target.value)} rows={2} className="text-xs" placeholder="Brief explanation of your functional expertise..." /></div>

            {/* S4: Industry Specialization */}
            <div className="pt-4 space-y-2">
              <Label className="text-xs font-semibold">Primary Industry Specialization *</Label>
              <p className="text-[11px] text-muted-foreground">Select up to 2 industries where you have the strongest sourcing network. Start typing to search.</p>
              
              {/* Selected Industries as Chips */}
              {form.industryPrimary.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {form.industryPrimary.map((industry: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="text-xs px-2 py-1 flex items-center gap-1">
                      {industry}
                      <button
                        type="button"
                        onClick={() => u("industryPrimary", form.industryPrimary.filter((i: string) => i !== industry))}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
                        aria-label="Remove"
                      ><X className="size-3.5" /></button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Industry Selector */}
              <Popover open={industryPrimaryOpen} onOpenChange={setIndustryPrimaryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={industryPrimaryOpen}
                    className="w-full justify-start text-xs h-9 font-normal text-left"
                    disabled={form.industryPrimary.length >= 2}
                  >
                    <ChevronsUpDown className="mr-2 h-3 w-3 shrink-0 opacity-50" />
                    {form.industryPrimary.length >= 2 
                      ? "Maximum 2 industries selected"
                      : "Search industries, e.g. Banking, IT, Garments"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search industries..." className="text-xs" />
                    <CommandEmpty>No industries found.</CommandEmpty>
                    <CommandList className="max-h-[300px]">
                      {/* Popular Choices First */}
                      {form.industryPrimary.length === 0 && (
                        <CommandGroup heading="Popular Choices">
                          {POPULAR_INDUSTRIES
                            .filter(industry => !form.industryPrimary.includes(industry))
                            .map((industry) => (
                              <CommandItem
                                key={industry}
                                value={industry}
                                onSelect={() => {
                                  if (form.industryPrimary.length < 2) {
                                    const newSelection = [...form.industryPrimary, industry];
                                    u("industryPrimary", newSelection);
                                    u("industrySecondary", form.industrySecondary.filter((s: string) => !newSelection.includes(s)));
                                    if (newSelection.length < 2) {
                                      setIndustryPrimaryOpen(true);
                                    } else {
                                      setIndustryPrimaryOpen(false);
                                    }
                                  }
                                }}
                                className="text-xs"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-3 w-3",
                                    form.industryPrimary.includes(industry) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {industry}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      )}
                      
                      {/* All Industries */}
                      <CommandGroup heading="All Industries">
                        {INDUSTRIES
                          .filter(industry => !form.industryPrimary.includes(industry))
                          .map((industry) => (
                            <CommandItem
                              key={industry}
                              value={industry}
                              onSelect={() => {
                                if (form.industryPrimary.length < 2) {
                                  const newSelection = [...form.industryPrimary, industry];
                                  u("industryPrimary", newSelection);
                                  u("industrySecondary", form.industrySecondary.filter((s: string) => !newSelection.includes(s)));
                                  if (newSelection.length < 2) {
                                    setIndustryPrimaryOpen(true);
                                  } else {
                                    setIndustryPrimaryOpen(false);
                                  }
                                }
                              }}
                              className="text-xs"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-3 w-3",
                                  form.industryPrimary.includes(industry) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {industry}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {/* Secondary Industries */}
              <div className="mt-3 space-y-2">
                <Label className="text-xs font-semibold">Secondary Industries</Label>
                <p className="text-[11px] text-muted-foreground">Select up to 4 additional industries where you have sourcing network or interest.</p>
                
                {/* Selected Secondary Industries as Chips */}
                {form.industrySecondary.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {form.industrySecondary.map((industry: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs px-2 py-1 flex items-center gap-1">
                        {industry}
                        <button
                          type="button"
                          onClick={() => u("industrySecondary", form.industrySecondary.filter((i: string) => i !== industry))}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
                          aria-label="Remove"
                        ><X className="size-3.5" /></button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Secondary Industry Selector */}
                <Popover open={industrySecondaryOpen} onOpenChange={setIndustrySecondaryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={industrySecondaryOpen}
                      className="w-full justify-start text-xs h-9 font-normal text-left"
                      disabled={form.industrySecondary.length >= 4}
                    >
                      <ChevronsUpDown className="mr-2 h-3 w-3 shrink-0 opacity-50" />
                      {form.industrySecondary.length >= 4 
                        ? "Maximum 4 secondary industries selected"
                        : "Add secondary industries..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search industries..." className="text-xs" />
                      <CommandEmpty>No industries found.</CommandEmpty>
                      <CommandList className="max-h-[300px]">
                        {/* Available Industries (excluding primary selections) */}
                        <CommandGroup heading="Available Industries">
                          {INDUSTRIES
                            .filter(industry => !form.industryPrimary.includes(industry) && !form.industrySecondary.includes(industry))
                            .map((industry) => (
                              <CommandItem
                                key={industry}
                                value={industry}
                                onSelect={() => {
                                  if (form.industrySecondary.length < 4) {
                                    const newSelection = [...form.industrySecondary, industry];
                                    u("industrySecondary", newSelection);
                                    if (newSelection.length < 4) {
                                      setIndustrySecondaryOpen(true);
                                    } else {
                                      setIndustrySecondaryOpen(false);
                                    }
                                  }
                                }}
                                className="text-xs"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-3 w-3",
                                    form.industrySecondary.includes(industry) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {industry}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1 mt-3"><Label className="text-xs">Why these industries?</Label>
                <Textarea value={form.industryBasis} onChange={(e) => u("industryBasis", e.target.value)} rows={2} className="text-xs" /></div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            {/* S5 */}
            <TagSelect options={TALENT_SEGMENTS} selected={form.talentAccessSegments} onChange={(v) => u("talentAccessSegments", v)} max={5} label="Talent Access Segments" hint="Which talent pools can you realistically source from?" />
            {/* S6 */}
            <TagSelect options={ACCESS_BASIS} selected={form.talentAccessBasis} onChange={(v) => u("talentAccessBasis", v)} max={5} label="Talent Access Basis" hint="How do you connect with these talent pools?" />
          </>
        )}

        {step === 3 && (
          <>
            {/* S8 */}
            <TagSelect options={HIRING_EXP_TYPES} selected={form.hiringExperienceTypes} onChange={(v) => u("hiringExperienceTypes", v)} max={5} label="Hiring Experience Types" hint="What types of hiring work have you handled or supported? Select 1–5." />
            {/* S9 */}
            <TagSelect options={HIRING_SCOPES} selected={form.hiringScope} onChange={(v) => u("hiringScope", v)} max={3} label="Hiring Scope Exposure" hint="What type of hiring environment have you worked in? Select 1–3." />
            {/* S9b — Role Seniority Exposure */}
            <TagSelect options={SENIORITY_EXPOSURE} selected={form.seniorityExposure} onChange={(v) => u("seniorityExposure", v)} max={2} label="What role seniority levels have you recruited for in recent years?" hint="Select 1–2 that best describe your recent hiring focus." />
            {/* S8: Recruitment intensity */}
            <div className="space-y-1">
              <Label className="text-xs">Years spent specifically on hiring / recruitment *</Label>
              <p className="text-[11px] text-muted-foreground">Not general HR — specifically: sourcing, screening, interviewing, placing candidates.</p>
              <Select value={form.recruitmentYears} onValueChange={(v) => u("recruitmentYears", v)}>
                <SelectTrigger className={cn("text-xs h-9", triedNext && !form.recruitmentYears && "border-red-500 ring-1 ring-red-500")}>
                  <SelectValue placeholder="Select range..." />
                </SelectTrigger>
                <SelectContent>
                  {["Less than 2 years", "2–4 years", "4–7 years", "7–10 years", "10+ years"].map(opt => (
                    <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">What % of your current / most recent role involves hiring? *</Label>
              <p className="text-[11px] text-muted-foreground">Estimate how much of your time goes to hiring-related activities.</p>
              <Select value={form.hiringPercentage} onValueChange={(v) => u("hiringPercentage", v)}>
                <SelectTrigger className={cn("text-xs h-9", triedNext && !form.hiringPercentage && "border-red-500 ring-1 ring-red-500")}>
                  <SelectValue placeholder="Select range..." />
                </SelectTrigger>
                <SelectContent>
                  {["Less than 20%", "20–40%", "40–60%", "60–80%", "80% or more"].map(opt => (
                    <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            {/* ── Section 1: Primary Sourcing Markets ── */}
            <div className="space-y-3">
              <Label className="text-xs font-medium">Primary Sourcing Markets *</Label>
              <p className="text-[11px] text-muted-foreground">Select countries where you can actively source talent through your own network.</p>
              <Popover open={sourcingMarketsOpen} onOpenChange={setSourcingMarketsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={sourcingMarketsOpen}
                    className="w-full justify-start text-xs h-9 font-normal text-left"
                    disabled={form.primarySourcingMarkets.length >= 5}
                  >
                    <ChevronsUpDown className="mr-2 h-3 w-3 shrink-0 opacity-50" />
                    {form.primarySourcingMarkets.length >= 5
                      ? "Maximum 5 markets selected"
                      : "Search countries..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search countries..." className="text-xs" />
                    <CommandEmpty>No countries found.</CommandEmpty>
                    <CommandList className="max-h-[300px]">
                      <CommandGroup>
                        {COUNTRIES.filter(c => c !== "Other" && !form.primarySourcingMarkets.find((m: any) => m.country === c))
                          .map((country) => (
                            <CommandItem
                              key={country}
                              value={country}
                              onSelect={() => {
                                if (form.primarySourcingMarkets.length < 5) {
                                  u("primarySourcingMarkets", [...form.primarySourcingMarkets, { country, strength: "Moderate", type: "Active sourcing" }]);
                                  if (form.primarySourcingMarkets.length >= 4) setSourcingMarketsOpen(false);
                                }
                              }}
                              className="text-xs"
                            >
                              <Check className={cn("mr-2 h-3 w-3", "opacity-0")} />
                              {country}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-[11px] text-muted-foreground">{form.primarySourcingMarkets.length} of 5 selected</p>
              {form.primarySourcingMarkets.map((m: any, i: number) => (
                <div key={m.country} className="flex flex-wrap items-center gap-2 rounded-md border p-2">
                  <Badge variant="secondary" className="text-xs">{m.country}</Badge>
                  <Select value={m.strength} onValueChange={(val) => {
                    const updated = [...form.primarySourcingMarkets];
                    updated[i] = { ...updated[i], strength: val };
                    u("primarySourcingMarkets", updated);
                  }}>
                    <SelectTrigger className="text-xs h-7 w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Strong", "Moderate", "Limited"].map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={m.type} onValueChange={(val) => {
                    const updated = [...form.primarySourcingMarkets];
                    updated[i] = { ...updated[i], type: val };
                    u("primarySourcingMarkets", updated);
                  }}>
                    <SelectTrigger className="text-xs h-7 w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Active sourcing", "Market understanding", "Past hiring exposure"].map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 ml-auto" onClick={() => u("primarySourcingMarkets", form.primarySourcingMarkets.filter((_: any, idx: number) => idx !== i))}>
                    <X className="size-3" />
                  </Button>
                </div>
              ))}
            </div>

            {/* ── Section 2: Cross-border Hiring Corridors ── */}
            <div className="space-y-3 pt-6">
              <Label className="text-xs font-medium">Cross-border Hiring Corridors <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <p className="text-[11px] text-muted-foreground">Add country-to-country corridors where you have supported hiring or candidate movement. e.g. Bangladesh → India</p>
              {form.crossBorderCorridors.map((c: any, i: number) => (
                <div key={i} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Select value={c.fromCountry || ""} onValueChange={(val) => {
                      const updated = [...form.crossBorderCorridors];
                      updated[i] = { ...updated[i], fromCountry: val, corridor: `${val} → ${updated[i].toCountry || "?"}` };
                      u("crossBorderCorridors", updated);
                    }}>
                      <SelectTrigger className="text-xs h-8 w-40"><SelectValue placeholder="From country" /></SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.filter(c => c !== "Other").map(country => <SelectItem key={country} value={country} className="text-xs">{country}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground">→</span>
                    <Select value={c.toCountry || ""} onValueChange={(val) => {
                      const updated = [...form.crossBorderCorridors];
                      updated[i] = { ...updated[i], toCountry: val, corridor: `${updated[i].fromCountry || "?"} → ${val}` };
                      u("crossBorderCorridors", updated);
                    }}>
                      <SelectTrigger className="text-xs h-8 w-40"><SelectValue placeholder="To country" /></SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.filter(c => c !== "Other").map(country => <SelectItem key={country} value={country} className="text-xs">{country}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 ml-auto" onClick={() => u("crossBorderCorridors", form.crossBorderCorridors.filter((_: any, idx: number) => idx !== i))}>
                      <X className="size-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Select value={c.strength} onValueChange={(val) => {
                      const updated = [...form.crossBorderCorridors];
                      updated[i] = { ...updated[i], strength: val };
                      u("crossBorderCorridors", updated);
                    }}>
                      <SelectTrigger className="text-xs h-7 w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Strong", "Moderate", "Limited"].map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={c.type} onValueChange={(val) => {
                      const updated = [...form.crossBorderCorridors];
                      updated[i] = { ...updated[i], type: val };
                      u("crossBorderCorridors", updated);
                    }}>
                      <SelectTrigger className="text-xs h-7 w-48"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Active sourcing", "Market understanding", "Past hiring exposure"].map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
              {form.crossBorderCorridors.length < 4 && (
                <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => u("crossBorderCorridors", [...form.crossBorderCorridors, { corridor: "", fromCountry: "", toCountry: "", strength: "Moderate", type: "Active sourcing" }])}>
                  + Add Corridor
                </Button>
              )}
              <p className="text-[11px] text-muted-foreground">{form.crossBorderCorridors.length} of 4 added</p>
            </div>

            {/* ── Section 3: Market Familiarity ── */}
            <div className="space-y-3 pt-6">
              <Label className="text-xs font-medium">Market Familiarity</Label>
              <p className="text-[11px] text-muted-foreground">Add locations where you understand hiring patterns, salary expectations, or candidate behavior, even if you do not actively source there.</p>
              <Popover open={marketFamiliarityOpen} onOpenChange={setMarketFamiliarityOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={marketFamiliarityOpen}
                    className="w-full justify-start text-xs h-9 font-normal text-left"
                    disabled={form.marketFamiliarity.length >= 8}
                  >
                    <ChevronsUpDown className="mr-2 h-3 w-3 shrink-0 opacity-50" />
                    {form.marketFamiliarity.length >= 8
                      ? "Maximum 8 markets selected"
                      : "Search countries..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search countries..." className="text-xs" />
                    <CommandEmpty>No countries found.</CommandEmpty>
                    <CommandList className="max-h-[300px]">
                      <CommandGroup>
                        {COUNTRIES.filter(c => c !== "Other" && !form.marketFamiliarity.includes(c))
                          .map((country) => (
                            <CommandItem
                              key={country}
                              value={country}
                              onSelect={() => {
                                if (form.marketFamiliarity.length < 8) {
                                  u("marketFamiliarity", [...form.marketFamiliarity, country]);
                                  if (form.marketFamiliarity.length >= 7) setMarketFamiliarityOpen(false);
                                }
                              }}
                              className="text-xs"
                            >
                              <Check className={cn("mr-2 h-3 w-3", "opacity-0")} />
                              {country}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-[11px] text-muted-foreground">{form.marketFamiliarity.length} of 8 selected</p>
              <div className="flex flex-wrap gap-1.5">
                {form.marketFamiliarity.map((c: string) => (
                  <Badge key={c} variant="secondary" className="text-xs gap-1 pr-1">
                    {c}
                    <button type="button" onClick={() => u("marketFamiliarity", form.marketFamiliarity.filter((x: string) => x !== c))} className="ml-0.5 hover:text-destructive">
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* ── Section 4: Geography Example ── */}
            <div className="space-y-2 pt-6">
              <Label className="text-xs font-medium">Example of geography-based hiring work</Label>
              <Textarea
                value={form.geographyExample}
                onChange={(e) => u("geographyExample", e.target.value)}
                placeholder="e.g. Recruited 3 senior engineers from Bangladesh to UAE construction projects in 2024"
                className="text-xs min-h-[80px]"
                maxLength={250}
              />
              <p className={cn("text-[11px]", form.geographyExample.length > 0 && (form.geographyExample.length < 150 || form.geographyExample.length > 250) ? "text-destructive" : "text-muted-foreground")}>
                {form.geographyExample.length}/250 characters {form.geographyExample.length > 0 && form.geographyExample.length < 150 ? "(min 150)" : ""}
              </p>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            {/* S13 — Mandate Type Strength REMOVED (derived from earlier sections: Role Level, Corridors, Hiring Experience, Function/Industry) */}
            {/* S13 — Network Freshness REMOVED (not required) */}
            {/* S14 */}
            <div className="space-y-2 pt-2">
              <Label className="text-xs font-medium">Professional Communities & Networks (up to 6)</Label>
              <p className="text-[11px] text-muted-foreground">Add the professional groups or networks you&apos;re part of. New names will be reviewed before being added to the shared list.</p>
              {form.communitiesPrimary.map((c: any, i: any) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex gap-2 items-center">
                    <Popover open={communityOpenStates[i] || false} onOpenChange={(open) => 
                      setCommunityOpenStates(prev => ({ ...prev, [i]: open }))
                    }>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={communityOpenStates[i] || false}
                          className="w-full justify-between text-xs h-9 font-normal flex-1"
                        >
                          {c.name || "Select community..."}
                          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search community..." className="text-xs" />
                          <CommandEmpty>No community found.</CommandEmpty>
                          <CommandList>
                            <CommandGroup>
                              {DEFAULT_COMMUNITIES
                                .filter((dc) => dc === c.name || !form.communitiesPrimary.some((cp: any) => cp.name === dc))
                                .map((dc) => (
                                  <CommandItem
                                    key={dc}
                                    value={dc}
                                    onSelect={() => {
                                      const next = [...form.communitiesPrimary];
                                      next[i] = { ...next[i], name: dc, isCustom: false };
                                      u("communitiesPrimary", next);
                                      setCommunityOpenStates(prev => ({ ...prev, [i]: false }));
                                    }}
                                    className="text-xs"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-3 w-3",
                                        c.name === dc ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {dc}
                                  </CommandItem>
                                ))}
                              <CommandItem
                                value="__custom__"
                                onSelect={() => {
                                  const next = [...form.communitiesPrimary];
                                  next[i] = { ...next[i], name: "", isCustom: true };
                                  u("communitiesPrimary", next);
                                  setCommunityOpenStates(prev => ({ ...prev, [i]: false }));
                                }}
                                className="text-xs font-medium text-primary border-t"
                              >
                                + Add New Community
                              </CommandItem>
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {(c as any).isCustom && (
                      <Input value={c.name} onChange={(e) => {
                        const next = [...form.communitiesPrimary];
                        next[i] = { ...next[i], name: e.target.value };
                        u("communitiesPrimary", next);
                      }} className="text-xs flex-1" placeholder="Enter community name" />
                    )}
                    <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => u("communitiesPrimary", form.communitiesPrimary.filter((_: any, idx: any) => idx !== i))}>
                      <X className="size-3" />
                    </Button>
                  </div>
                  {/* Role + Country row */}
                  <div className="flex gap-2 items-center pl-0 ml-0">
                    <Popover open={roleOpenStates[i] || false} onOpenChange={(open) => 
                      setRoleOpenStates(prev => ({ ...prev, [i]: open }))
                    }>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={roleOpenStates[i] || false}
                          className="w-40 justify-between text-xs h-8 font-normal"
                        >
                          {c.role || "Your role"}
                          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-40 p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search role..." className="text-xs" />
                          <CommandEmpty>No role found.</CommandEmpty>
                          <CommandList>
                            <CommandGroup>
                              {DEFAULT_COMMUNITY_ROLES.map((role) => (
                                <CommandItem
                                  key={role}
                                  value={role}
                                  onSelect={() => {
                                    const next = [...form.communitiesPrimary];
                                    if (role === "Other") {
                                      next[i] = { ...next[i], role: "", customRole: true };
                                    } else {
                                      next[i] = { ...next[i], role: role, customRole: false };
                                    }
                                    u("communitiesPrimary", next);
                                    setRoleOpenStates(prev => ({ ...prev, [i]: false }));
                                  }}
                                  className="text-xs"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-3 w-3",
                                      c.role === role ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {role === "Other" ? "+ Add Role" : role}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {(c as any).customRole && (
                      <Input 
                        value={c.role} 
                        onChange={(e) => {
                          const next = [...form.communitiesPrimary];
                          next[i] = { ...next[i], role: e.target.value };
                          u("communitiesPrimary", next);
                        }} 
                        className="text-xs w-32" 
                        placeholder="Enter role" 
                      />
                    )}
                    <Select
                      value={c.country || ""}
                      onValueChange={(val) => {
                        const next = [...form.communitiesPrimary];
                        next[i] = { ...next[i], country: val };
                        u("communitiesPrimary", next);
                      }}
                    >
                      <SelectTrigger className={cn("w-40 text-xs h-8", triedNext && c.name && !c.country && "border-red-500 ring-1 ring-red-500")}>
                        <SelectValue placeholder="Country *" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.filter(c => c !== "Other").map((country) => (
                          <SelectItem key={country} value={country} className="text-xs">{country}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {i < form.communitiesPrimary.length - 1 && <div className="border-b border-border/50 my-1" />}
                </div>
              ))}
              {form.communitiesPrimary.length < 6 && (
                <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => u("communitiesPrimary", [...form.communitiesPrimary, { name: "", role: "", country: "" }])}>
                  + Add Community
                </Button>
              )}
            </div>
          </>
        )}

        {step === 6 && (
          <>
            {/* S16: Working Preference */}
            <h3 className="text-sm font-semibold">Working Preference</h3>

            <div className="space-y-5">
              {/* Active scouting toggle */}
              <div className="flex items-center gap-2.5 rounded-lg border border-border p-3">
                <input type="checkbox" checked={form.activeScouting} onChange={(e) => u("activeScouting", e.target.checked)} className="size-4" />
                <Label className="text-xs font-medium">Open to active mandates</Label>
              </div>

              {/* Mandate-related fields — hidden when not actively scouting, data preserved */}
              {form.activeScouting && (
                <div className="space-y-5 pl-1">
                  <TagSelect options={INVOLVEMENT_TYPES} selected={form.involvementTypes} onChange={(v) => {
                    if (v.length <= 3) u("involvementTypes", v);
                    else toast.error("Maximum 3 selections allowed");
                  }} max={3} label="Involvement Type" hint="How would you like to support a mandate?" />

                  <div className="flex gap-6 flex-wrap">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={form.willingConfidential} onChange={(e) => u("willingConfidential", e.target.checked)} className="size-3.5" />
                      <Label className="text-[11px]">Open to confidential / sensitive mandates</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={form.willingCrossBorder} onChange={(e) => u("willingCrossBorder", e.target.checked)} className="size-3.5" />
                      <Label className="text-[11px]">Open to cross-border mandates</Label>
                    </div>
                  </div>

                  <TagSelect options={ROLE_LEVELS} selected={form.preferredLevels} onChange={(v) => {
                    if (v.length <= 4) u("preferredLevels", v);
                    else toast.error("Maximum 4 selections allowed");
                  }} max={4} label="Preferred Levels to Work On" hint="Select up to 4 levels you can realistically work on." />
                </div>
              )}

              {/* S17: Visibility */}
              <div className="space-y-3 pt-2">
                <Label className="text-xs font-semibold">Visibility Preference</Label>
                {VISIBILITY_OPTIONS.map((opt) => (
                  <div key={opt.value} className="flex items-center gap-2.5">
                    <input type="radio" name="visibility" value={opt.value} checked={form.visibility === opt.value} onChange={() => u("visibility", opt.value)} className="size-3.5" />
                    <Label className="text-[11px]">{opt.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 7 && (
          <>
            {/* S18: Trust + Confirm */}
            <h3 className="text-sm font-semibold flex items-center gap-1.5"><Shield className="size-4 text-primary" /> Trust Summary & Confirmations</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Please review and confirm the following before submission.
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 rounded-lg border border-border p-3.5">
                <input type="checkbox" checked={form.confirmMasterAcceptance} onChange={(e) => u("confirmMasterAcceptance", e.target.checked)} className="size-4 mt-0.5" />
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold">Application Confirmation *</Label>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">I confirm that the information provided is accurate and I consent to LLP using this data for mandate matching and scout assignment.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-lg border border-border p-3.5">
                <input type="checkbox" checked={form.confirmPlatformConduct} onChange={(e) => u("confirmPlatformConduct", e.target.checked)} className="size-4 mt-0.5" />
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold">Candidate Consent & Conduct *</Label>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">All CVs I submit will have prior candidate consent. I will maintain confidentiality of mandate details and follow LLP&apos;s submission process.</p>
                </div>
              </div>
            </div>

            {/* Talent Bank opt-in */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2.5 rounded-lg border border-border p-3.5">
                <input type="checkbox" checked={form.talentBankConsent} onChange={(e) => u("talentBankConsent", e.target.checked)} className="size-4" />
                <div className="space-y-0.5">
                  <Label className="text-xs font-medium">Open to being considered as a candidate through LLP&apos;s Talent Bank</Label>
                  <p className="text-[10px] text-muted-foreground">Your scout profile data will also be used for talent matching opportunities.</p>
                </div>
              </div>

              {form.talentBankConsent && (
                <div className="rounded-lg border border-dashed border-border/70 p-4 space-y-2.5 ml-1">
                  <div className="flex items-center gap-2">
                    <Upload className="size-3.5 text-muted-foreground" />
                    <Label className="text-xs font-medium">Upload CV</Label>
                    <Badge variant="outline" className="text-[10px] ml-1">Optional</Badge>
                  </div>
                  {form.talentBankCvStorageId ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[11px]">CV uploaded ✓</Badge>
                      <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground" onClick={() => u("talentBankCvStorageId", "")}>Remove</Button>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="text-[11px] file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-[11px] file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:cursor-pointer"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 5 * 1024 * 1024) {
                            toast.error("File too large. Maximum 5MB.");
                            return;
                          }
                          setUploadingCv(true);
                          try {
                            const uploadUrl = await generateUploadUrl();
                            const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
                            const { storageId } = await res.json();
                            u("talentBankCvStorageId", storageId);
                            toast.success("CV uploaded");
                          } catch {
                            toast.error("Upload failed. Please try again.");
                          } finally {
                            setUploadingCv(false);
                          }
                        }}
                        disabled={uploadingCv}
                      />
                      {uploadingCv && <p className="text-[10px] text-muted-foreground mt-1"><Loader2 className="inline size-3 animate-spin mr-1" />Uploading...</p>}
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground">PDF or Word, max 5MB. CV can also be uploaded later from your dashboard.</p>
                </div>
              )}
            </div>

            {/* Sign-in required notice */}
            {!user && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 p-4 space-y-2">
                <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">Sign in to submit</h4>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  You need to sign in or create an account before submitting your scout application. Your form data will be saved to your account.
                </p>
                <Link href={`/sign-in?redirect_url=${encodeURIComponent("/headhunting/scout/join")}`}>
                  <Button size="sm" className="text-xs mt-1">Sign In / Create Account</Button>
                </Link>
              </div>
            )}

            {/* Summary */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-2.5 text-xs">
              <h4 className="font-semibold text-sm">Profile Summary</h4>
              <div className="grid grid-cols-2 gap-2.5">
                {form.fullName && (
                  <div><span className="text-muted-foreground text-[11px]">Name</span><p className="font-medium text-xs">{form.fullName}</p></div>
                )}
                {form.professionalBase && (
                  <div><span className="text-muted-foreground text-[11px]">Base</span><p className="font-medium text-xs">{form.professionalBase}</p></div>
                )}
                {form.functionPrimary.length > 0 ? (
                  <div><span className="text-muted-foreground text-[11px]">Functions</span><p className="font-medium text-xs">{form.functionPrimary.join(", ")}</p></div>
                ) : (
                  <div><span className="text-muted-foreground text-[11px]">Functions</span><p className="text-[11px] text-muted-foreground/70 italic">Not added yet</p></div>
                )}
                {form.industryPrimary.length > 0 ? (
                  <div><span className="text-muted-foreground text-[11px]">Industries</span><p className="font-medium text-xs">{form.industryPrimary.join(", ")}</p></div>
                ) : (
                  <div><span className="text-muted-foreground text-[11px]">Industries</span><p className="text-[11px] text-muted-foreground/70 italic">Not added yet</p></div>
                )}
                {form.primarySourcingMarkets.length > 0 ? (
                  <div><span className="text-muted-foreground text-[11px]">Markets</span><p className="font-medium text-xs">{form.primarySourcingMarkets.map((m: any) => m.country).join(", ")}</p></div>
                ) : (
                  <div><span className="text-muted-foreground text-[11px]">Markets</span><p className="text-[11px] text-muted-foreground/70 italic">Not added yet</p></div>
                )}
                <div><span className="text-muted-foreground text-[11px]">Visibility</span><p className="font-medium text-xs">{form.visibility === "internal_only" ? "Internal only" : "Limited public"}</p></div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={goPrev} disabled={step === 0} className="gap-1.5 text-xs">
          <ArrowLeft className="size-3.5" /> Previous
        </Button>
        <div className="flex gap-2">
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={goNext} className="gap-1.5 text-xs">
              Next <ArrowRight className="size-3.5" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !user || !form.confirmMasterAcceptance || !form.confirmPlatformConduct}
              className="gap-1.5 text-xs"
            >
              {submitting ? <><Loader2 className="size-3.5 animate-spin" /> Submitting...</> : <><Send className="size-3.5" /> Submit Application</>}
            </Button>
          )}
        </div>
      </div>

      {/* Mobile insight strip — shown below form on small screens */}
      <div className="lg:hidden">
        <ScoutInsightMobileStrip step={step} />
      </div>

      </div>{/* end form column */}

      {/* Right: insight sidebar — desktop only */}
      <div className="hidden lg:block w-72 xl:w-80 shrink-0 sticky top-8">
        <ScoutInsightSidebar step={step} />
      </div>

      </div>{/* end two-column layout */}
    </div>
  );
}
