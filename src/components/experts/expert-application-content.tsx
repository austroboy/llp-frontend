"use client";

import { useState, useEffect, useCallback, useRef, useMemo, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import {
  motion,
  MotionConfig,
  AnimatePresence,
  type Variants,
} from "framer-motion";
import {
  CheckCircle,
  Plus,
  X,
  Upload,
  ArrowLeft,
  Loader2,
  Globe,
} from "lucide-react";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useAccountType } from "@/components/providers/account-context";
import { useFormPrefill } from "@/hooks/use-form-prefill";
import type { Id } from "@convex/_generated/dataModel";
import { toast } from "sonner";
import "@/components/landing/landing.css";

/* ------------------------------------------------------------------ */
/*  Motion variants (canonical lf-* design language)                   */
/* ------------------------------------------------------------------ */
const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
const heroStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
};
const inViewOnce = { once: true, margin: "-72px 0px" } as const;

/* ------------------------------------------------------------------ */
/*  Shared inline styles                                               */
/* ------------------------------------------------------------------ */
const fieldGroup: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--s-2)",
};

const textareaStyle: CSSProperties = {
  borderRadius: "var(--r-md)",
  padding: "12px 16px",
  minHeight: 120,
  resize: "vertical",
  fontFamily: "var(--lf-body)",
  fontSize: 14,
  lineHeight: 1.6,
  color: "var(--ink)",
  background: "var(--paper)",
  border: "1px solid var(--line-2)",
  outline: "none",
  width: "100%",
};

const selectStyle: CSSProperties = {
  fontFamily: "var(--lf-body)",
  fontSize: 14,
  color: "var(--ink)",
  background: "var(--paper)",
  cursor: "pointer",
};

const subPanelStyle: CSSProperties = {
  background: "var(--paper-warm)",
  border: "1px solid var(--line-1)",
  borderLeft: "2px solid var(--accent-blue)",
  borderRadius: "var(--r-md)",
  padding: "var(--s-3) var(--s-4)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--s-3)",
};

const entryRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  alignItems: "center",
  gap: "var(--s-3)",
  padding: "10px 14px",
  borderRadius: "var(--r-md)",
  background: "var(--paper-inner)",
  border: "1px solid var(--line-1)",
};

const chipBase: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 14px",
  borderRadius: 999,
  fontFamily: "var(--lf-mono)",
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  cursor: "pointer",
  border: "1px solid var(--line-2)",
  background: "var(--paper)",
  color: "var(--ink-2)",
  transition: "background 160ms ease, color 160ms ease, border-color 160ms ease",
};

/* ------------------------------------------------------------------ */
/*  Types for structured form data                                     */
/* ------------------------------------------------------------------ */
type SkillEntry = {
  name: string;
  level: 1 | 2 | 3 | 4;
  evidence: string;
  documentId?: Id<"_storage">;
};

type CertEntry = {
  name: string;
  org?: string;
  year?: string;
  documentId?: Id<"_storage">;
};

type ExpEntry = {
  title?: string;
  company?: string;
  location?: string;
  workMode?: "on-site" | "remote" | "hybrid";
  duration?: string;
  scope?: string;
  role?: string;
};

type EduEntry = {
  degree: string;
  institution: string;
  fieldOfStudy?: string;
  year?: string;
};

type ProjectEntry = {
  name: string;
  client?: string;
  description?: string;
  duration?: string;
  outcome?: string;
};

type LangEntry = {
  name: string;
  proficiency?: "native" | "fluent" | "advanced" | "intermediate" | "basic";
};

type AffiliationEntry = {
  name: string;
  role?: string;
  since?: string;
};

const PROFICIENCY_OPTIONS = ["native", "fluent", "advanced", "intermediate", "basic"] as const;

/* ------------------------------------------------------------------ */
/*  Skill level options                                                */
/* ------------------------------------------------------------------ */
const skillLevels = [
  { value: 1, labelKey: "apply.level.1.label", descKey: "apply.level.1.desc" },
  { value: 2, labelKey: "apply.level.2.label", descKey: "apply.level.2.desc" },
  { value: 3, labelKey: "apply.level.3.label", descKey: "apply.level.3.desc" },
  { value: 4, labelKey: "apply.level.4.label", descKey: "apply.level.4.desc" },
];

const skillOptions = [
  "PF Fund Setup",
  "GF Compliance",
  "WPPF Administration",
  "Audit Preparation",
  "Termination Handling",
  "Work Permits",
  "Policy Drafting",
  "Other",
];

const sectorOptions = [
  "RMG / Apparel",
  "Pharmaceuticals",
  "Manufacturing (non-RMG)",
  "Telecom / Technology",
  "FMCG / Consumer Goods",
  "Banking / Financial Services",
  "Construction / Real Estate",
  "Education / Training",
  "Healthcare / Hospitals",
  "Logistics / Transportation",
  "Retail / E-commerce",
  "Agriculture / Agro-processing",
  "Energy / Utilities",
  "Hospitality / Tourism",
  "Other",
];

/* ------------------------------------------------------------------ */
/*  lf-* form primitives (canonical design language)                   */
/* ------------------------------------------------------------------ */
function VaultLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="lf-field-label">
      {label}
      {required && (
        <span style={{ color: "var(--rust)", marginLeft: 4 }}>*</span>
      )}
    </label>
  );
}

function VaultInput({
  label,
  required,
  placeholder,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  placeholder: string;
  type?: string;
  value?: string;
  onChange?: (val: string) => void;
}) {
  return (
    <div style={fieldGroup}>
      <VaultLabel label={label} required={required} />
      <input
        type={type}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        className="lf-input"
      />
    </div>
  );
}

function VaultTextarea({
  label,
  required,
  placeholder,
  rows = 4,
  hint,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  placeholder: string;
  rows?: number;
  hint?: string;
  value?: string;
  onChange?: (val: string) => void;
}) {
  return (
    <div style={fieldGroup}>
      <VaultLabel label={label} required={required} />
      <textarea
        rows={rows}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        className="lf-input"
        style={textareaStyle}
      />
      {hint && (
        <p
          style={{
            fontSize: 11,
            color: "var(--ink-3)",
            letterSpacing: "0.02em",
            margin: 0,
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

function VaultSelect({
  label,
  required,
  options,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  options: string[];
  placeholder: string;
  value?: string;
  onChange?: (val: string) => void;
}) {
  return (
    <div style={fieldGroup}>
      <VaultLabel label={label} required={required} />
      <select
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        className="lf-input"
        style={selectStyle}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function VaultSectorToggle({
  label,
  required,
  options,
  placeholder,
  selected,
  onToggle,
}: {
  label: string;
  required?: boolean;
  options: string[];
  placeholder: string;
  selected: string[];
  onToggle: (sector: string) => void;
}) {
  return (
    <div style={fieldGroup}>
      <VaultLabel label={label} required={required} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s-2)" }}>
        {options.map((o) => {
          const on = selected.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => onToggle(o)}
              style={
                on
                  ? {
                      ...chipBase,
                      background: "var(--rust-ghost)",
                      color: "var(--rust)",
                      borderColor: "var(--rust)",
                    }
                  : chipBase
              }
              aria-pressed={on}
            >
              {o}
            </button>
          );
        })}
      </div>
      {selected.length === 0 && (
        <p style={{ fontSize: 11, color: "var(--ink-3)", margin: 0 }}>
          {placeholder}
        </p>
      )}
    </div>
  );
}

function VaultSubPlate({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={subPanelStyle}>
      <span
        className="lf-meta"
        style={{
          textTransform: "uppercase",
          color: "var(--accent-blue)",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function VaultEntryRow({
  folio,
  title,
  meta,
  onRemove,
}: {
  folio: string;
  title: string;
  meta?: string;
  onRemove: () => void;
}) {
  return (
    <div style={entryRowStyle}>
      <span
        className="lf-meta"
        style={{
          fontFamily: "var(--lf-mono)",
          color: "var(--accent-blue)",
          fontSize: 11,
          letterSpacing: "0.08em",
        }}
      >
        {folio}
      </span>
      <span
        style={{
          color: "var(--ink)",
          fontSize: 14,
          fontFamily: "var(--lf-body)",
        }}
      >
        {title}
        {meta && (
          <span
            style={{
              color: "var(--ink-3)",
              marginLeft: 8,
              fontSize: 12.5,
            }}
          >
            · {meta}
          </span>
        )}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          color: "var(--rust)",
          background: "transparent",
          border: 0,
          cursor: "pointer",
          padding: "4px 8px",
          fontFamily: "var(--lf-mono)",
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        <X size={12} /> Remove
      </button>
    </div>
  );
}

type ChapterState = "complete" | "needs-evidence" | "draft";

function VaultChapter({
  num,
  chapterLabel,
  titleKey,
  subtitleKey,
  state,
  active,
  onToggle,
  children,
}: {
  num: number;
  chapterLabel: string;
  titleKey: string;
  subtitleKey: string;
  state: ChapterState;
  active: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const { t } = useLanguage();
  const chipText =
    state === "complete"
      ? "Complete"
      : state === "needs-evidence"
        ? "Needs evidence"
        : "Draft";
  const chipColor =
    state === "complete"
      ? "var(--accent-blue)"
      : state === "needs-evidence"
        ? "var(--rust)"
        : "var(--ink-3)";
  const chipBg =
    state === "complete"
      ? "var(--accent-blue-ghost)"
      : state === "needs-evidence"
        ? "var(--rust-ghost)"
        : "var(--paper-warm)";
  return (
    <motion.section
      variants={fadeUp}
      className="lf-card"
      style={{ padding: "var(--s-4) var(--s-5)" }}
      data-section={num}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={active}
        style={{
          display: "flex",
          width: "100%",
          alignItems: "center",
          gap: "var(--s-3)",
          padding: "var(--s-1) 0",
          textAlign: "left",
          background: "transparent",
          border: 0,
          cursor: "pointer",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            className="lf-meta"
            style={{
              textTransform: "uppercase",
              color: "var(--accent-blue)",
              fontWeight: 600,
            }}
          >
            {chapterLabel}
          </span>
          <h3
            style={{
              fontFamily: "var(--lf-display)",
              fontSize: 22,
              fontWeight: 400,
              letterSpacing: "-0.008em",
              color: "var(--ink)",
              marginTop: 6,
              marginBottom: 4,
            }}
          >
            {t(titleKey)}
          </h3>
          <p
            className="lf-body"
            style={{
              fontSize: 13,
              color: "var(--ink-3)",
              margin: 0,
            }}
          >
            {t(subtitleKey)}
          </p>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "4px 10px",
            borderRadius: 999,
            fontFamily: "var(--lf-mono)",
            fontSize: 10.5,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: chipColor,
            background: chipBg,
            whiteSpace: "nowrap",
          }}
        >
          {chipText}
        </span>
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          width={14}
          height={14}
          style={{
            transform: active ? "rotate(180deg)" : "none",
            transition: "transform 200ms ease",
            color: "var(--ink-3)",
            flexShrink: 0,
          }}
        >
          <path
            d="M2 4.5 L6 8 L10 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <AnimatePresence initial={false}>
        {active && (
          <motion.div
            key={`chapter-${num}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                paddingTop: "var(--s-4)",
                marginTop: "var(--s-3)",
                borderTop: "1px solid var(--line-1)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--s-4)",
              }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

/* ------------------------------------------------------------------ */
/*  Folio helper                                                       */
/* ------------------------------------------------------------------ */
function buildFolioSerial(draftId?: string | null, userId?: string | null) {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const short = ((draftId ?? userId ?? "APPLY-NEW") + "XXXXXX")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(-6)
    .toUpperCase();
  return {
    folio: `LLP-${y}.${m}.${day} / ${short}`,
    serial: `DOSSIER № LLP-${y}.${m}.${day} / APPLICATION-${short}`,
  };
}

/* ================================================================== */
/*  Main Component                                                     */
/* ================================================================== */
export function ExpertApplicationContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const { user } = useUser();
  const { isOrgUser } = useAccountType();

  // Block org users from accessing expert apply
  useEffect(() => {
    if (isOrgUser) router.replace("/experts");
  }, [isOrgUser, router]);
  if (isOrgUser) return null;

  const { prefill, isLoaded: prefillLoaded } = useFormPrefill();

  // --- Convex mutations & queries ---
  const createApplication = useMutation(api.expertApplications.create);
  const updateApplication = useMutation(api.expertApplications.update);
  const generateUploadUrl = useMutation(api.expertApplications.generateUploadUrl);
  const existingDraft = useQuery(
    api.expertApplications.getByApplicant,
    user?.id ? { applicantClerkId: user.id } : "skip"
  );

  // --- UI state ---
  const [activeSection, setActiveSection] = useState(1);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [previousSubmissionStatus, setPreviousSubmissionStatus] = useState<string | null>(null);
  const [previousReviewNotes, setPreviousReviewNotes] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<Id<"expertApplications"> | null>(null);
  const draftLoadedRef = useRef(false);

  // --- Section 1: About You ---
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [designation, setDesignation] = useState("");
  const [organization, setOrganization] = useState("");
  const [city, setCity] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [bio, setBio] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [sectors, setSectors] = useState<string[]>([]);

  // --- Section 2: Skills ---
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [currentSkillName, setCurrentSkillName] = useState("");
  const [customSkillName, setCustomSkillName] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [currentEvidence, setCurrentEvidence] = useState("");
  const [currentSkillFile, setCurrentSkillFile] = useState<File | null>(null);

  // --- Section 2: Education ---
  const [education, setEducation] = useState<EduEntry[]>([]);
  const [currentEduDegree, setCurrentEduDegree] = useState("");
  const [currentEduInstitution, setCurrentEduInstitution] = useState("");
  const [currentEduField, setCurrentEduField] = useState("");
  const [currentEduYear, setCurrentEduYear] = useState("");

  // --- Section 2: Languages ---
  const [languages, setLanguages] = useState<LangEntry[]>([]);
  const [currentLangName, setCurrentLangName] = useState("");
  const [currentLangProficiency, setCurrentLangProficiency] = useState<LangEntry["proficiency"]>();

  // --- Section 3: Certs ---
  const [certs, setCerts] = useState<CertEntry[]>([]);
  const [currentCertName, setCurrentCertName] = useState("");
  const [currentCertOrg, setCurrentCertOrg] = useState("");
  const [currentCertYear, setCurrentCertYear] = useState("");

  // --- Section 3: Experiences ---
  const [exps, setExps] = useState<ExpEntry[]>([]);
  const [currentExpTitle, setCurrentExpTitle] = useState("");
  const [currentExpCompany, setCurrentExpCompany] = useState("");
  const [currentExpLocation, setCurrentExpLocation] = useState("");
  const [currentExpWorkMode, setCurrentExpWorkMode] = useState<"on-site" | "remote" | "hybrid" | "">("");
  const [currentExpDuration, setCurrentExpDuration] = useState("");
  const [currentExpScope, setCurrentExpScope] = useState("");
  const [currentExpRole, setCurrentExpRole] = useState("");

  // --- Section 3: Projects ---
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [currentProjName, setCurrentProjName] = useState("");
  const [currentProjClient, setCurrentProjClient] = useState("");
  const [currentProjDesc, setCurrentProjDesc] = useState("");
  const [currentProjDuration, setCurrentProjDuration] = useState("");
  const [currentProjOutcome, setCurrentProjOutcome] = useState("");

  // --- Section 3: Affiliations ---
  const [affiliations, setAffiliations] = useState<AffiliationEntry[]>([]);
  const [currentAffName, setCurrentAffName] = useState("");
  const [currentAffRole, setCurrentAffRole] = useState("");
  const [currentAffSince, setCurrentAffSince] = useState("");

  // --- Section 3: Session prefs ---
  const [sessionLengths, setSessionLengths] = useState<number[]>([]);

  // --- Section 3: Headhunting ---
  const [headhuntingOptIn, setHeadhuntingOptIn] = useState<boolean | null>(null);
  const [ctcRange, setCtcRange] = useState("");
  const [preferredLocations, setPreferredLocations] = useState("");
  const [noticePeriod, setNoticePeriod] = useState("");

  // --- Section 4: Consent ---
  const [consentAccuracy, setConsentAccuracy] = useState(false);
  const [consentProfile, setConsentProfile] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [consentError, setConsentError] = useState(false);

  // --- CV / URL auto-fill ---
  const [cvParsing, setCvParsing] = useState(false);
  const [cvParsed, setCvParsed] = useState(false);
  const [profileUrl, setProfileUrl] = useState("");
  const [urlParsing, setUrlParsing] = useState(false);
  const [urlParsed, setUrlParsed] = useState(false);
  const [cvDragging, setCvDragging] = useState(false);

  // --- Theme attr (binds light/dark on the lf-page root) ---
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const themeAttr = mounted
    ? resolvedTheme === "dark"
      ? "dark"
      : "light"
    : "light";

  // --- Pre-fill from Clerk + profile (only when no draft loaded) ---
  useEffect(() => {
    if (!prefillLoaded || draftLoadedRef.current) return;
    if (prefill.fullName && !name) setName(prefill.fullName);
    if (prefill.email && !email) setEmail(prefill.email);
    if (prefill.designation && !designation) setDesignation(prefill.designation);
    if (prefill.company && !organization) setOrganization(prefill.company);
    if (prefill.location && !city) setCity(prefill.location);
    if (prefill.linkedin && !linkedin) setLinkedin(prefill.linkedin);
    if (prefill.portfolio && !portfolio) setPortfolio(prefill.portfolio);
  }, [prefillLoaded]);

  // --- Load existing draft ---
  useEffect(() => {
    if (draftLoadedRef.current || !existingDraft) return;
    // If already submitted/approved/rejected, show notice but allow re-application
    if (existingDraft.status !== "draft") {
      setPreviousSubmissionStatus(existingDraft.status);
      setPreviousReviewNotes(existingDraft.reviewNotes ?? null);
      draftLoadedRef.current = true;
      return;
    }
    // Pre-fill from draft
    setDraftId(existingDraft._id);
    setName(existingDraft.name || "");
    setEmail(existingDraft.email || "");
    setDesignation(existingDraft.designation || "");
    setOrganization(existingDraft.organization || "");
    setCity(existingDraft.city || "");
    setLinkedin(existingDraft.linkedin || "");
    setPortfolio(existingDraft.portfolio || "");
    setBio(existingDraft.bio || "");
    setProfilePhotoUrl(existingDraft.profilePhotoUrl || "");
    setSectors(existingDraft.sectors || []);
    setSkills(
      (existingDraft.skills || []).map((s) => ({
        name: s.name,
        level: s.level as 1 | 2 | 3 | 4,
        evidence: s.evidence,
        documentId: s.documentId,
      }))
    );
    setCerts(
      (existingDraft.certifications || []).map((c) => ({
        name: c.name,
        org: c.org,
        year: c.year,
        documentId: c.documentId,
      }))
    );
    setExps(existingDraft.experiences || []);
    setEducation((existingDraft.education as EduEntry[] | undefined) || []);
    setProjects((existingDraft.projects as ProjectEntry[] | undefined) || []);
    setLanguages((existingDraft.languages as LangEntry[] | undefined) || []);
    setAffiliations((existingDraft.affiliations as AffiliationEntry[] | undefined) || []);
    if (existingDraft.sessionPreferences) {
      setSessionLengths(existingDraft.sessionPreferences.lengths || []);
    }
    if (existingDraft.headhunting) {
      setHeadhuntingOptIn(existingDraft.headhunting.optedIn);
      setCtcRange(existingDraft.headhunting.ctcRange || "");
      setPreferredLocations(
        (existingDraft.headhunting.preferredLocations || []).join(", ")
      );
      setNoticePeriod(existingDraft.headhunting.noticePeriod || "");
    }
    if (existingDraft.consent) {
      setConsentAccuracy(existingDraft.consent.accuracy);
      setConsentProfile(existingDraft.consent.profileCreation);
      setConsentMarketing(existingDraft.consent.marketing);
    }
    draftLoadedRef.current = true;
    toast.success(t("apply.draftLoaded") || "Draft loaded");
  }, [existingDraft]);

  // --- File upload helper ---
  const uploadFile = useCallback(
    async (file: File): Promise<Id<"_storage">> => {
      const url = await generateUploadUrl();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await res.json();
      return storageId as Id<"_storage">;
    },
    [generateUploadUrl]
  );

  // --- Profile photo upload ---
  const [photoPreview, setPhotoPreview] = useState("");
  const getStorageUrl = useMutation(api.expertApplications.getStorageUrl);
  const handlePhotoUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file (JPG, PNG)");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be under 5 MB");
        return;
      }
      setPhotoPreview(URL.createObjectURL(file));
      setPhotoUploading(true);
      try {
        const storageId = await uploadFile(file);
        const servingUrl = await getStorageUrl({ storageId });
        if (servingUrl) {
          setProfilePhotoUrl(servingUrl);
        }
        toast.success(t("apply.photo.uploaded") || "Photo uploaded");
      } catch {
        toast.error("Failed to upload photo");
        setPhotoPreview("");
      } finally {
        setPhotoUploading(false);
      }
    },
    [uploadFile, getStorageUrl, t]
  );

  // --- Collect form data ---
  const collectFormData = useCallback(() => {
    const locArr = preferredLocations
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);

    return {
      name: name || (user?.fullName ?? ""),
      email: email || user?.primaryEmailAddress?.emailAddress || "",
      designation: designation || undefined,
      organization: organization || undefined,
      city: city || undefined,
      linkedin: linkedin || undefined,
      portfolio: portfolio || undefined,
      bio: bio || undefined,
      profilePhotoUrl: profilePhotoUrl || undefined,
      sectors,
      skills: skills.map((s) => ({
        name: s.name,
        level: s.level,
        evidence: s.evidence,
        documentId: s.documentId,
      })),
      certifications: certs.map((c) => ({
        name: c.name,
        org: c.org || undefined,
        year: c.year || undefined,
        documentId: c.documentId,
      })),
      education: education.length > 0 ? education.map((e) => ({
        degree: e.degree,
        institution: e.institution,
        fieldOfStudy: e.fieldOfStudy || undefined,
        year: e.year != null && String(e.year) ? String(e.year) : undefined,
      })) : undefined,
      projects: projects.length > 0 ? projects.map((p) => ({
        name: p.name,
        client: p.client || undefined,
        description: p.description || undefined,
        duration: p.duration || undefined,
        outcome: p.outcome || undefined,
      })) : undefined,
      languages: languages.length > 0 ? languages.map((l) => ({
        name: l.name,
        proficiency: l.proficiency || undefined,
      })) : undefined,
      affiliations: affiliations.length > 0 ? affiliations.map((a) => ({
        name: a.name,
        role: a.role || undefined,
        since: a.since || undefined,
      })) : undefined,
      experiences: exps.map((e) => ({
        title: e.title || undefined,
        company: e.company || undefined,
        location: e.location || undefined,
        workMode: e.workMode || undefined,
        duration: e.duration || undefined,
        scope: e.scope || undefined,
        role: e.role || undefined,
      })),
      sessionPreferences:
        sessionLengths.length > 0 ? { lengths: sessionLengths } : undefined,
      headhunting:
        headhuntingOptIn !== null
          ? {
              optedIn: headhuntingOptIn,
              ctcRange: ctcRange || undefined,
              preferredLocations: locArr.length > 0 ? locArr : undefined,
              noticePeriod: noticePeriod || undefined,
            }
          : undefined,
      consent: {
        accuracy: consentAccuracy,
        profileCreation: consentProfile,
        marketing: consentMarketing,
      },
    };
  }, [
    name,
    email,
    user,
    designation,
    organization,
    city,
    linkedin,
    portfolio,
    bio,
    profilePhotoUrl,
    sectors,
    skills,
    certs,
    education,
    projects,
    languages,
    affiliations,
    exps,
    sessionLengths,
    headhuntingOptIn,
    ctcRange,
    preferredLocations,
    noticePeriod,
    consentAccuracy,
    consentProfile,
    consentMarketing,
  ]);

  // --- Save Draft handler ---
  const handleSaveDraft = useCallback(async () => {
    if (!user) {
      toast.error(t("apply.signInRequired") || "Please sign in to save your draft");
      return;
    }
    setSaving(true);
    try {
      const data = collectFormData();
      if (draftId) {
        await updateApplication({
          id: draftId,
          ...data,
          status: "draft",
          applicantClerkId: user.id,
        });
      } else {
        const id = await createApplication({
          ...data,
          status: "draft",
          applicantClerkId: user.id,
        });
        setDraftId(id);
      }
      toast.success(t("apply.draftSaved") || "Draft saved!");
    } catch (err) {
      console.error("Save draft error:", err);
      toast.error(t("apply.saveError") || "Failed to save draft");
    } finally {
      setSaving(false);
    }
  }, [user, draftId, collectFormData, createApplication, updateApplication, t]);

  // --- Submit handler ---
  const handleSubmit = useCallback(async () => {
    if (!user) {
      toast.error(t("apply.signInRequired") || "Please sign in to submit");
      return;
    }
    const finalName = name || user.fullName || "";
    if (!finalName.trim()) {
      toast.error(t("apply.validation.nameRequired") || "Name is required");
      setActiveSection(1);
      return;
    }
    if (skills.length === 0) {
      toast.error(
        t("apply.validation.skillRequired") || "Add at least one skill"
      );
      setActiveSection(2);
      return;
    }
    if (!consentAccuracy || !consentProfile) {
      toast.error(
        t("apply.validation.consentRequired") ||
          "Please accept the required consent checkboxes"
      );
      setConsentError(true);
      setActiveSection(4);
      return;
    }

    setSubmitting(true);
    try {
      const data = collectFormData();
      if (draftId) {
        await updateApplication({
          id: draftId,
          ...data,
          status: "submitted",
          applicantClerkId: user.id,
        });
      } else {
        await createApplication({
          ...data,
          status: "submitted",
          applicantClerkId: user.id,
        });
      }
      setSubmitted(true);
      toast.success(t("apply.submitted") || "Application submitted!");
      fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "expert_application_submitted",
          applicantName: data.name,
          applicantEmail: data.email,
          specialization: data.sectors?.[0] || "General",
        }),
      }).catch(() => {});
    } catch (err) {
      console.error("Submit error:", err);
      toast.error(t("apply.submitError") || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  }, [
    user,
    name,
    skills,
    consentAccuracy,
    consentProfile,
    draftId,
    collectFormData,
    createApplication,
    updateApplication,
    t,
  ]);

  // --- Add skill handler ---
  const handleAddSkill = useCallback(async () => {
    const skillName = currentSkillName === "Other" ? customSkillName.trim() : currentSkillName;
    if (!skillName || selectedLevel === null || !currentEvidence.trim()) {
      toast.error(
        t("apply.validation.skillFields") ||
          "Please fill skill name, level, and evidence"
      );
      return;
    }
    let docId: Id<"_storage"> | undefined;
    if (currentSkillFile) {
      try {
        docId = await uploadFile(currentSkillFile);
      } catch {
        toast.error("Failed to upload file");
      }
    }
    setSkills((prev) => [
      ...prev,
      {
        name: skillName,
        level: selectedLevel as 1 | 2 | 3 | 4,
        evidence: currentEvidence,
        documentId: docId,
      },
    ]);
    setCurrentSkillName("");
    setCustomSkillName("");
    setSelectedLevel(null);
    setCurrentEvidence("");
    setCurrentSkillFile(null);
  }, [currentSkillName, customSkillName, selectedLevel, currentEvidence, currentSkillFile, uploadFile, t]);

  const handleAddCert = useCallback(() => {
    if (!currentCertName.trim()) {
      toast.error(
        t("apply.validation.certName") || "Certification name is required"
      );
      return;
    }
    setCerts((prev) => [
      ...prev,
      {
        name: currentCertName,
        org: currentCertOrg || undefined,
        year: currentCertYear || undefined,
      },
    ]);
    setCurrentCertName("");
    setCurrentCertOrg("");
    setCurrentCertYear("");
  }, [currentCertName, currentCertOrg, currentCertYear, t]);

  const handleAddExp = useCallback(() => {
    if (!currentExpTitle.trim() && !currentExpRole.trim()) {
      toast.error(
        t("apply.validation.expFields") || "Please fill at least a title or role"
      );
      return;
    }
    setExps((prev) => [
      ...prev,
      {
        title: currentExpTitle || undefined,
        company: currentExpCompany || undefined,
        location: currentExpLocation || undefined,
        workMode: currentExpWorkMode || undefined,
        duration: currentExpDuration || undefined,
        scope: currentExpScope || undefined,
        role: currentExpRole || undefined,
      },
    ]);
    setCurrentExpTitle("");
    setCurrentExpCompany("");
    setCurrentExpLocation("");
    setCurrentExpWorkMode("");
    setCurrentExpDuration("");
    setCurrentExpScope("");
    setCurrentExpRole("");
  }, [currentExpTitle, currentExpCompany, currentExpLocation, currentExpWorkMode, currentExpDuration, currentExpScope, currentExpRole, t]);

  const toggleSessionLength = useCallback((min: number) => {
    setSessionLengths((prev) =>
      prev.includes(min) ? prev.filter((m) => m !== min) : [...prev, min]
    );
  }, []);

  const toggleSector = useCallback((sector: string) => {
    setSectors((prev) =>
      prev.includes(sector)
        ? prev.filter((s) => s !== sector)
        : [...prev, sector]
    );
  }, []);

  // --- Shared auto-fill from parsed AI data ---
  const applyParsedData = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data: any) => {
      if (data.name && !name) setName(data.name);
      if (data.designation && !designation) setDesignation(data.designation);
      if (data.organization && !organization) setOrganization(data.organization);
      if (data.city && !city) setCity(data.city);
      if (data.linkedin && !linkedin) setLinkedin(data.linkedin);
      if (data.portfolio && !portfolio) setPortfolio(data.portfolio);
      if (data.bio && !bio) setBio(data.bio);
      if (data.profilePhotoUrl && !profilePhotoUrl && !data.embeddedPhoto) setProfilePhotoUrl(data.profilePhotoUrl);

      if (data.sectors?.length) {
        setSectors((prev) => {
          return Array.from(new Set([...prev, ...data.sectors.filter((s: string) => sectorOptions.includes(s))]));
        });
      }

      if (data.skills?.length) {
        setSkills((prev) => {
          const existingNames = new Set(prev.map((s) => s.name));
          const newSkills = data.skills
            .filter((s: { name: string }) => !existingNames.has(s.name))
            .map((s: { name: string; level: number; evidence: string }) => ({
              name: s.name,
              level: Math.min(4, Math.max(1, s.level)) as 1 | 2 | 3 | 4,
              evidence: s.evidence || "",
            }));
          return [...prev, ...newSkills];
        });
      }

      if (data.certifications?.length) {
        setCerts((prev) => {
          const existingNames = new Set(prev.map((c) => c.name));
          const newCerts = data.certifications
            .filter((c: { name: string }) => c.name && !existingNames.has(c.name))
            .map((c: { name: string; org?: string; year?: string }) => ({
              name: c.name,
              org: c.org || undefined,
              year: c.year || undefined,
            }));
          return [...prev, ...newCerts];
        });
      }

      if (data.experiences?.length) {
        setExps((prev) => {
          const newExps = data.experiences.map(
            (e: { title?: string; company?: string; location?: string; workMode?: string; duration?: string; scope?: string; role?: string }) => ({
              title: e.title || undefined,
              company: e.company || undefined,
              location: e.location || undefined,
              workMode: (e.workMode === "on-site" || e.workMode === "remote" || e.workMode === "hybrid") ? e.workMode : undefined,
              duration: e.duration || undefined,
              scope: e.scope || undefined,
              role: e.role || undefined,
            })
          );
          return [...prev, ...newExps];
        });
      }

      if (data.education?.length) {
        setEducation((prev) => {
          const existingKeys = new Set(prev.map((e) => `${e.degree}|${e.institution}`));
          const newEdus = data.education
            .filter((e: { degree: string; institution: string }) => e.degree && e.institution && !existingKeys.has(`${e.degree}|${e.institution}`))
            .map((e: { degree: string; institution: string; fieldOfStudy?: string; year?: string | number }) => ({
              degree: e.degree,
              institution: e.institution,
              fieldOfStudy: e.fieldOfStudy || undefined,
              year: e.year != null ? String(e.year) : undefined,
            }));
          return [...prev, ...newEdus];
        });
      }

      if (data.projects?.length) {
        setProjects((prev) => {
          const existingNames = new Set(prev.map((p) => p.name));
          const newProjs = data.projects
            .filter((p: { name: string }) => p.name && !existingNames.has(p.name))
            .map((p: { name: string; client?: string; description?: string; duration?: string | number; outcome?: string }) => ({
              name: p.name,
              client: p.client || undefined,
              description: p.description || undefined,
              duration: p.duration != null ? String(p.duration) : undefined,
              outcome: p.outcome || undefined,
            }));
          return [...prev, ...newProjs];
        });
      }

      if (data.languages?.length) {
        setLanguages((prev) => {
          const existingNames = new Set(prev.map((l) => l.name.toLowerCase()));
          const validProf = new Set(PROFICIENCY_OPTIONS as readonly string[]);
          const newLangs = data.languages
            .filter((l: { name: string }) => l.name && !existingNames.has(l.name.toLowerCase()))
            .map((l: { name: string; proficiency?: string }) => ({
              name: l.name,
              proficiency: validProf.has(l.proficiency || "") ? l.proficiency as LangEntry["proficiency"] : undefined,
            }));
          return [...prev, ...newLangs];
        });
      }

      if (data.affiliations?.length) {
        setAffiliations((prev) => {
          const existingNames = new Set(prev.map((a) => a.name.toLowerCase()));
          const newAffs = data.affiliations
            .filter((a: { name: string }) => a.name && !existingNames.has(a.name.toLowerCase()))
            .map((a: { name: string; role?: string; since?: string | number }) => ({
              name: a.name,
              role: a.role || undefined,
              since: a.since != null ? String(a.since) : undefined,
            }));
          return [...prev, ...newAffs];
        });
      }

      if (data.headhunting) {
        if (data.headhunting.ctcRange && !ctcRange) setCtcRange(data.headhunting.ctcRange);
        if (data.headhunting.preferredLocations?.length && !preferredLocations) {
          setPreferredLocations(data.headhunting.preferredLocations.join(", "));
        }
        if (data.headhunting.noticePeriod && !noticePeriod) setNoticePeriod(data.headhunting.noticePeriod);
      }

      setActiveSection(1);
    },
    [name, designation, organization, city, linkedin, portfolio, bio, ctcRange, preferredLocations, noticePeriod]
  );

  // --- CV auto-fill handler ---
  const handleCvUpload = useCallback(
    async (file: File) => {
      setCvParsing(true);
      setCvParsed(false);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/experts/parse-cv", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to parse CV");
        }

        const { data } = await res.json();
        applyParsedData(data);

        const currentPhoto = profilePhotoUrl || data.profilePhotoUrl;
        if (!currentPhoto && data.embeddedPhoto) {
          try {
            const photoRes = await fetch(data.embeddedPhoto);
            const blob = await photoRes.blob();
            const photoFile = new File([blob], "cv-photo.jpg", { type: blob.type });
            await handlePhotoUpload(photoFile);
          } catch { /* best-effort */ }
        }

        setCvParsed(true);

        if (!currentPhoto && !data.embeddedPhoto) {
          toast.success(t("apply.cv.successNoPhoto") || "CV analyzed! Use 'Import from Profile' below to add your photo.");
        } else {
          toast.success(t("apply.cv.success") || "CV analyzed! Fields have been auto-filled.");
        }
      } catch (err) {
        console.error("CV parse error:", err);
        toast.error(
          err instanceof Error ? err.message : t("apply.cv.error") || "Failed to analyze CV"
        );
      } finally {
        setCvParsing(false);
      }
    },
    [applyParsedData, handlePhotoUpload, profilePhotoUrl, t]
  );

  // --- URL auto-fill handler ---
  const handleUrlParse = useCallback(
    async () => {
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

        if (data.embeddedPhoto && !profilePhotoUrl) {
          try {
            const photoRes = await fetch(data.embeddedPhoto);
            const blob = await photoRes.blob();
            const photoFile = new File([blob], "profile-photo.jpg", { type: blob.type });
            await handlePhotoUpload(photoFile);
          } catch { /* best-effort */ }
        }

        setUrlParsed(true);
        toast.success(t("apply.url.success") || "Profile analyzed! Fields have been auto-filled.");
      } catch (err) {
        console.error("URL parse error:", err);
        toast.error(
          err instanceof Error ? err.message : t("apply.url.error") || "Failed to analyze profile"
        );
      } finally {
        setUrlParsing(false);
      }
    },
    [profileUrl, applyParsedData, handlePhotoUpload, profilePhotoUrl, t]
  );

  // --- Chapter completion state ---
  const chapters = useMemo(() => {
    const ch1Done = Boolean(
      (name || user?.fullName) &&
        designation &&
        organization &&
        city &&
        bio &&
        sectors.length > 0
    );
    const ch2Done = skills.length > 0;
    const ch3Done = exps.length > 0 || certs.length > 0 || projects.length > 0;
    const ch4Done = consentAccuracy && consentProfile;
    return [
      { label: "§ I · Identity", done: ch1Done, state: (ch1Done ? "complete" : "draft") as ChapterState },
      { label: "§ II · Expertise", done: ch2Done, state: (ch2Done ? "complete" : "draft") as ChapterState },
      { label: "§ III · Dossier", done: ch3Done, state: (ch3Done ? "complete" : "draft") as ChapterState },
      { label: "§ IV · Countersignature", done: ch4Done, state: (ch4Done ? "complete" : "draft") as ChapterState },
    ];
  }, [name, user, designation, organization, city, bio, sectors, skills, exps, certs, projects, consentAccuracy, consentProfile]);

  const { folio, serial } = useMemo(
    () => buildFolioSerial(draftId, user?.id),
    [draftId, user?.id]
  );

  /* ========================= Success screen ========================= */
  if (submitted) {
    return (
      <MotionConfig reducedMotion="user">
        <div className="lf-page" data-theme={themeAttr} suppressHydrationWarning>
          <SiteTopNav />
          <main>
            <motion.section
              variants={heroStagger}
              initial="hidden"
              animate="show"
              style={{
                maxWidth: 760,
                margin: "0 auto",
                padding: "calc(var(--s-7) + 32px) var(--s-5) var(--s-7)",
                textAlign: "center",
              }}
            >
              <motion.div variants={fadeUp} className="lf-kicker" style={{ justifyContent: "center" }}>
                <span className="lf-kicker-mark">§ Closing</span>
                Admitted for review
              </motion.div>

              <motion.h1
                variants={fadeUp}
                style={{
                  fontFamily: "var(--lf-display)",
                  fontSize: "clamp(36px, 5vw, 56px)",
                  fontWeight: 400,
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                  color: "var(--ink)",
                  margin: "var(--s-3) 0 var(--s-3)",
                }}
              >
                {t("apply.success.title") || (
                  <>
                    Filed under folio{" "}
                    <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>
                      № {folio}
                    </em>
                  </>
                )}
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="lf-section-deck"
                style={{
                  maxWidth: 560,
                  margin: "0 auto",
                  fontStyle: "italic",
                }}
              >
                {t("apply.success.desc") ||
                  "Thank you for applying. Our chamber will review your submission within 3–5 business days and dispatch countersignature notice to your registered email."}
              </motion.p>

              <motion.p
                variants={fadeUp}
                style={{
                  fontFamily: "var(--lf-mono)",
                  fontSize: 11,
                  color: "var(--accent-blue)",
                  letterSpacing: "0.14em",
                  marginTop: "var(--s-5)",
                  textTransform: "uppercase",
                }}
              >
                {serial}
              </motion.p>

              <motion.div
                variants={fadeUp}
                style={{
                  marginTop: "var(--s-5)",
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: "var(--s-2)",
                }}
              >
                <Link href="/experts" className="lf-cta lf-cta--primary">
                  Return to directory →
                </Link>
                <Link href="/dashboard" className="lf-cta lf-cta--ghost">
                  Go to dashboard
                </Link>
              </motion.div>
            </motion.section>
          </main>
          <HomepageFooter />
        </div>
      </MotionConfig>
    );
  }

  /* =================== Approved / published state =================== */
  if (previousSubmissionStatus === "approved" || previousSubmissionStatus === "published") {
    return (
      <MotionConfig reducedMotion="user">
        <div className="lf-page" data-theme={themeAttr} suppressHydrationWarning>
          <SiteTopNav />
          <main>
            <motion.section
              variants={heroStagger}
              initial="hidden"
              animate="show"
              style={{
                maxWidth: 640,
                margin: "0 auto",
                padding: "calc(var(--s-7) + 32px) var(--s-5) var(--s-7)",
                textAlign: "center",
              }}
            >
              <motion.div variants={fadeUp} className="lf-kicker" style={{ justifyContent: "center" }}>
                <span className="lf-kicker-mark">Registered</span>
                Practitioner
              </motion.div>

              <motion.h1
                variants={fadeUp}
                style={{
                  fontFamily: "var(--lf-display)",
                  fontSize: "clamp(32px, 4.5vw, 48px)",
                  fontWeight: 400,
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                  color: "var(--ink)",
                  margin: "var(--s-3) 0",
                }}
              >
                You&apos;re already{" "}
                <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>
                  admitted to the Registry.
                </em>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="lf-section-deck"
                style={{ maxWidth: 520, margin: "0 auto", fontStyle: "italic" }}
              >
                Your expert dossier is live. Amend skills, experience, and profile
                from the practitioner dashboard.
              </motion.p>

              <motion.div
                variants={fadeUp}
                style={{
                  marginTop: "var(--s-5)",
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: "var(--s-2)",
                }}
              >
                <Link href="/dashboard/profile" className="lf-cta lf-cta--primary">
                  Manage your dossier →
                </Link>
                <Link href="/experts" className="lf-cta lf-cta--ghost">
                  View network
                </Link>
              </motion.div>
            </motion.section>
          </main>
          <HomepageFooter />
        </div>
      </MotionConfig>
    );
  }

  /* =================== Submitted / under_review ===================== */
  if (previousSubmissionStatus === "submitted" || previousSubmissionStatus === "under_review") {
    return (
      <MotionConfig reducedMotion="user">
        <div className="lf-page" data-theme={themeAttr} suppressHydrationWarning>
          <SiteTopNav />
          <main>
            <motion.section
              variants={heroStagger}
              initial="hidden"
              animate="show"
              style={{
                maxWidth: 640,
                margin: "0 auto",
                padding: "calc(var(--s-7) + 32px) var(--s-5) var(--s-7)",
                textAlign: "center",
              }}
            >
              <motion.div variants={fadeUp} className="lf-kicker" style={{ justifyContent: "center" }}>
                <span className="lf-kicker-mark">§ II</span>
                Pending chamber review
              </motion.div>

              <motion.h1
                variants={fadeUp}
                style={{
                  fontFamily: "var(--lf-display)",
                  fontSize: "clamp(32px, 4.5vw, 48px)",
                  fontWeight: 400,
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                  color: "var(--ink)",
                  margin: "var(--s-3) 0",
                }}
              >
                Application{" "}
                <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>
                  lodged.
                </em>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="lf-section-deck"
                style={{ maxWidth: 520, margin: "0 auto", fontStyle: "italic" }}
              >
                Your expert application is currently with the LLP chamber. We will
                dispatch countersignature notice as soon as a decision is entered
                on the docket.
              </motion.p>

              <motion.div
                variants={fadeUp}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  marginTop: "var(--s-4)",
                  padding: "6px 14px",
                  borderRadius: 999,
                  fontFamily: "var(--lf-mono)",
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--accent-blue)",
                  background: "var(--accent-blue-ghost)",
                }}
              >
                Status ·{" "}
                {previousSubmissionStatus === "under_review"
                  ? "Under review"
                  : "Submitted"}
              </motion.div>

              <motion.div
                variants={fadeUp}
                style={{
                  marginTop: "var(--s-5)",
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: "var(--s-2)",
                }}
              >
                <Link href="/experts" className="lf-cta lf-cta--ghost">
                  Browse network
                </Link>
                <Link href="/dashboard" className="lf-cta lf-cta--primary">
                  Dashboard →
                </Link>
              </motion.div>
            </motion.section>
          </main>
          <HomepageFooter />
        </div>
      </MotionConfig>
    );
  }

  /* =========================== Main form ============================ */
  const stepperStates: ("done" | "active" | "pending")[] = chapters.map((c, i) => {
    if (i + 1 === activeSection) return "active";
    if (c.done) return "done";
    return "pending";
  });

  const initials = (name || user?.fullName || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <MotionConfig reducedMotion="user">
      <div className="lf-page" data-theme={themeAttr} suppressHydrationWarning>
        <SiteTopNav />
        <main>
          {/* Header plate */}
          <motion.section
            variants={heroStagger}
            initial="hidden"
            animate="show"
            style={{
              maxWidth: 1180,
              margin: "0 auto",
              padding: "calc(var(--s-7) + 16px) var(--s-5) var(--s-5)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                alignItems: "start",
                gap: "var(--s-4)",
              }}
            >
              <div>
                <motion.div variants={fadeUp} className="lf-kicker">
                  <span className="lf-kicker-mark">Enrolment</span>
                  Subject · Practitioner
                </motion.div>
                <motion.h1
                  variants={fadeUp}
                  style={{
                    fontFamily: "var(--lf-display)",
                    fontSize: "clamp(36px, 5vw, 56px)",
                    fontWeight: 400,
                    lineHeight: 1.05,
                    letterSpacing: "-0.02em",
                    color: "var(--ink)",
                    margin: "var(--s-3) 0 var(--s-3)",
                  }}
                >
                  Apply for{" "}
                  <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>
                    admission to the Registry.
                  </em>
                </motion.h1>
                <motion.p
                  variants={fadeUp}
                  className="lf-section-deck"
                  style={{ maxWidth: 580, fontStyle: "italic" }}
                >
                  Each chapter is a filing card. Submissions are timestamped and
                  lodged under the dossier serial. Review takes 3–5 business days.
                </motion.p>
              </div>
              <motion.span
                variants={fadeUp}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "6px 14px",
                  borderRadius: 999,
                  fontFamily: "var(--lf-mono)",
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--rust)",
                  background: "var(--rust-ghost)",
                  whiteSpace: "nowrap",
                  alignSelf: "start",
                  justifySelf: "end",
                }}
              >
                Confidential filing
              </motion.span>
            </div>
          </motion.section>

          {/* Content area */}
          <motion.section
            variants={stagger}
            initial="hidden"
            animate="show"
            style={{
              maxWidth: 1180,
              margin: "0 auto",
              padding: "0 var(--s-5) var(--s-7)",
            }}
          >
            {/* Re-apply alert */}
            {previousSubmissionStatus === "rejected" && (
              <motion.div
                variants={fadeUp}
                role="status"
                className="lf-card"
                style={{
                  marginBottom: "var(--s-4)",
                  padding: "var(--s-3) var(--s-4)",
                  borderLeft: "3px solid var(--rust)",
                  display: "flex",
                  gap: "var(--s-3)",
                  alignItems: "flex-start",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    background: "var(--rust-ghost)",
                    color: "var(--rust)",
                    fontFamily: "var(--lf-mono)",
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  !
                </span>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <p
                    style={{
                      fontFamily: "var(--lf-display)",
                      color: "var(--ink)",
                      fontSize: 18,
                      letterSpacing: "-0.006em",
                      margin: 0,
                    }}
                  >
                    Previous submission returned.
                  </p>
                  <p
                    className="lf-body"
                    style={{
                      fontSize: 13.5,
                      lineHeight: 1.55,
                      color: "var(--ink-3)",
                      margin: 0,
                    }}
                  >
                    {previousReviewNotes
                      ? previousReviewNotes
                      : "The chamber returned your last filing. Revise the flagged sections and re-file when ready."}
                  </p>
                  <span
                    className="lf-meta"
                    style={{ color: "var(--rust)", textTransform: "uppercase" }}
                  >
                    Amendments retained · History on record
                  </span>
                </div>
              </motion.div>
            )}
            {previousSubmissionStatus &&
              previousSubmissionStatus !== "approved" &&
              previousSubmissionStatus !== "published" &&
              previousSubmissionStatus !== "rejected" && (
                <motion.div
                  variants={fadeUp}
                  role="status"
                  className="lf-card"
                  style={{
                    marginBottom: "var(--s-4)",
                    padding: "var(--s-3) var(--s-4)",
                    borderLeft: "3px solid var(--accent-blue)",
                    display: "flex",
                    gap: "var(--s-3)",
                    alignItems: "flex-start",
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      background: "var(--accent-blue-ghost)",
                      color: "var(--accent-blue)",
                      fontFamily: "var(--lf-mono)",
                      fontSize: 13,
                      flexShrink: 0,
                    }}
                  >
                    i
                  </span>
                  <div>
                    <p
                      style={{
                        color: "var(--ink)",
                        fontSize: 14,
                        fontWeight: 500,
                        margin: 0,
                      }}
                    >
                      Previous dossier on file ({previousSubmissionStatus}).
                    </p>
                    <p
                      className="lf-body"
                      style={{
                        fontSize: 12.5,
                        color: "var(--ink-3)",
                        marginTop: 4,
                      }}
                    >
                      A new filing may be lodged below. The prior submission
                      remains archived.
                    </p>
                  </div>
                </motion.div>
              )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 320px",
                gap: "var(--s-4)",
                alignItems: "start",
              }}
            >
              {/* ============================ Chapters ============================ */}
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)", minWidth: 0 }}>
                {/* Stepper progress */}
                <motion.div
                  variants={fadeUp}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: "var(--s-2)",
                  }}
                >
                  {[
                    { num: "01", labelKey: "apply.step.1" },
                    { num: "02", labelKey: "apply.step.2" },
                    { num: "03", labelKey: "apply.step.3" },
                    { num: "04", labelKey: "apply.step.4" },
                  ].map((s, i) => {
                    const state = stepperStates[i];
                    return (
                      <button
                        key={s.num}
                        type="button"
                        onClick={() => setActiveSection(i + 1)}
                        data-state={state}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                          padding: "12px 14px",
                          borderRadius: "var(--r-md)",
                          textAlign: "left",
                          cursor: "pointer",
                          fontFamily: "var(--lf-body)",
                          background:
                            state === "active"
                              ? "var(--paper)"
                              : state === "done"
                                ? "var(--accent-blue-ghost)"
                                : "var(--paper-warm)",
                          border:
                            state === "active"
                              ? "1px solid var(--accent-blue)"
                              : "1px solid var(--line-2)",
                          color: "var(--ink)",
                        }}
                      >
                        <span
                          className="lf-meta"
                          style={{
                            color:
                              state === "done"
                                ? "var(--accent-blue)"
                                : state === "active"
                                  ? "var(--ink)"
                                  : "var(--ink-3)",
                            textTransform: "uppercase",
                          }}
                        >
                          Step {s.num}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--lf-display)",
                            fontSize: 15,
                            color: "var(--ink)",
                          }}
                        >
                          {t(s.labelKey)}
                        </span>
                      </button>
                    );
                  })}
                </motion.div>

              {/* Chapter I — Identity */}
              <VaultChapter
                num={1}
                chapterLabel="§ I · Identity"
                titleKey="apply.s1.title"
                subtitleKey="apply.s1.subtitle"
                state={chapters[0].state}
                active={activeSection === 1}
                onToggle={() => setActiveSection(activeSection === 1 ? 0 : 1)}
              >
                <VaultInput
                  label={t("apply.s1.name")}
                  required
                  placeholder={t("apply.s1.namePh")}
                  value={name}
                  onChange={setName}
                />

                {/* Profile photo */}
                <div>
                  <VaultLabel label={t("apply.s1.photo")} />
                  <div className="flex items-center gap-5">
                    {photoPreview || profilePhotoUrl ? (
                      <Image
                        src={photoPreview || profilePhotoUrl!}
                        alt="Profile"
                        width={64}
                        height={64}
                        className="rounded-full object-cover"
                        style={{
                          border: "2px solid var(--line-2)",
                          width: 64,
                          height: 64,
                        }}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div
                        className="flex items-center justify-center rounded-full"
                        style={{
                          width: 64,
                          height: 64,
                          background: "var(--paper-warm)",
                          color: "var(--ink-2)",
                          fontFamily: "var(--lf-mono)",
                          fontSize: 16,
                          fontWeight: 500,
                          border: "1px solid var(--line-2)",
                        }}
                      >
                        {initials}
                      </div>
                    )}
                    <label
                      className={cn(
                        "lf-cta lf-cta--ghost",
                        photoUploading && "opacity-50 pointer-events-none"
                      )}
                      style={{ cursor: "pointer" }}
                    >
                      {photoUploading ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Upload className="size-3.5" />
                      )}
                      {photoUploading
                        ? t("apply.s1.photoUploading")
                        : t("apply.s1.photoUpload")}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        disabled={photoUploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handlePhotoUpload(f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <span
                      className="lf-meta"
                      style={{ color: "var(--ink-3)", textTransform: "uppercase" }}
                    >
                      JPG · PNG · max 5 MB
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <VaultInput
                    label={t("apply.s1.designation")}
                    required
                    placeholder={t("apply.s1.designationPh")}
                    value={designation}
                    onChange={setDesignation}
                  />
                  <VaultInput
                    label={t("apply.s1.organization")}
                    required
                    placeholder={t("apply.s1.organizationPh")}
                    value={organization}
                    onChange={setOrganization}
                  />
                </div>
                <VaultInput
                  label={t("apply.s1.city")}
                  required
                  placeholder={t("apply.s1.cityPh")}
                  value={city}
                  onChange={setCity}
                />
                <VaultInput
                  label={t("apply.s1.linkedin")}
                  placeholder="https://linkedin.com/in/yourprofile"
                  type="url"
                  value={linkedin}
                  onChange={setLinkedin}
                />
                <VaultInput
                  label={t("apply.s1.portfolio")}
                  placeholder="https://yourportfolio.com"
                  type="url"
                  value={portfolio}
                  onChange={setPortfolio}
                />
                <VaultTextarea
                  label={t("apply.s1.bio")}
                  required
                  placeholder={t("apply.s1.bioPh")}
                  hint={t("apply.s1.bioHint")}
                  value={bio}
                  onChange={setBio}
                />
                <VaultSectorToggle
                  label={t("apply.s1.sectors")}
                  required
                  options={sectorOptions}
                  placeholder={t("apply.s1.sectorsPh")}
                  selected={sectors}
                  onToggle={toggleSector}
                />
              </VaultChapter>

              {/* Chapter II — Expertise */}
              <VaultChapter
                num={2}
                chapterLabel="§ II · Expertise"
                titleKey="apply.s2.title"
                subtitleKey="apply.s2.subtitle"
                state={chapters[1].state}
                active={activeSection === 2}
                onToggle={() => setActiveSection(activeSection === 2 ? 0 : 2)}
              >
                {/* Skills list */}
                {skills.length > 0 && (
                  <div className="space-y-2">
                    {skills.map((s, i) => (
                      <VaultEntryRow
                        key={i}
                        folio={`L${s.level}`}
                        title={s.name}
                        meta={s.evidence.slice(0, 64) + (s.evidence.length > 64 ? "…" : "")}
                        onRemove={() =>
                          setSkills(skills.filter((_, j) => j !== i))
                        }
                      />
                    ))}
                  </div>
                )}

                <VaultSubPlate label={t("apply.s2.addSkill")}>
                  <VaultSelect
                    label={t("apply.s2.skillName")}
                    required
                    options={skillOptions}
                    placeholder={t("apply.s2.skillPh")}
                    value={currentSkillName}
                    onChange={(v) => {
                      setCurrentSkillName(v);
                      if (v !== "Other") setCustomSkillName("");
                    }}
                  />
                  {currentSkillName === "Other" && (
                    <VaultInput
                      label="Custom skill name"
                      required
                      placeholder="e.g. Web Development, Marketing Strategy"
                      value={customSkillName}
                      onChange={setCustomSkillName}
                    />
                  )}
                  <div style={fieldGroup}>
                    <VaultLabel label={t("apply.s2.selfLevel")} required />
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: "var(--s-2)",
                      }}
                    >
                      {skillLevels.map(({ value, labelKey, descKey }) => {
                        const active = selectedLevel === value;
                        return (
                          <button
                            type="button"
                            key={value}
                            onClick={() => setSelectedLevel(value)}
                            data-state={active ? "active" : undefined}
                            style={{
                              cursor: "pointer",
                              textAlign: "left",
                              display: "flex",
                              flexDirection: "column",
                              gap: 4,
                              padding: "12px 14px",
                              borderRadius: "var(--r-md)",
                              fontFamily: "var(--lf-body)",
                              background: active
                                ? "var(--accent-blue-ghost)"
                                : "var(--paper)",
                              border: active
                                ? "1px solid var(--accent-blue)"
                                : "1px solid var(--line-2)",
                              color: "var(--ink)",
                              transition:
                                "background 160ms ease, border-color 160ms ease",
                            }}
                          >
                            <span
                              className="lf-meta"
                              style={{
                                color: active
                                  ? "var(--accent-blue)"
                                  : "var(--ink-3)",
                                textTransform: "uppercase",
                              }}
                            >
                              Level {value}
                            </span>
                            <span
                              style={{
                                fontFamily: "var(--lf-display)",
                                fontSize: 15,
                                color: "var(--ink)",
                              }}
                            >
                              {t(labelKey)}
                            </span>
                            <span
                              style={{
                                fontSize: 11.5,
                                color: "var(--ink-3)",
                                lineHeight: 1.4,
                              }}
                            >
                              {t(descKey)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <VaultTextarea
                    label={t("apply.s2.evidence")}
                    required
                    placeholder={t("apply.s2.evidencePh")}
                    hint={t("apply.s2.evidenceHint")}
                    value={currentEvidence}
                    onChange={setCurrentEvidence}
                  />
                  <div>
                    <VaultLabel label={t("apply.s2.upload")} />
                    <label
                      className="lf-cta lf-cta--ghost"
                      style={{ cursor: "pointer" }}
                    >
                      <Upload className="size-3.5" />
                      {currentSkillFile
                        ? currentSkillFile.name
                        : "Attach evidence document"}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) =>
                          setCurrentSkillFile(e.target.files?.[0] ?? null)
                        }
                      />
                    </label>
                    <p
                      className="mt-2"
                      style={{ fontSize: 11, color: "var(--ink-3)" }}
                    >
                      {t("apply.s2.uploadHint")}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="lf-cta lf-cta--primary" style={{ width: "100%", justifyContent: "center" }}
                    onClick={handleAddSkill}
                  >
                    <Plus className="size-3.5" />
                    {t("apply.s2.addBtn")}
                  </button>
                </VaultSubPlate>

                {/* Education list */}
                {education.length > 0 && (
                  <div className="space-y-2">
                    {education.map((edu, i) => (
                      <VaultEntryRow
                        key={i}
                        folio={edu.year || "—"}
                        title={edu.degree}
                        meta={edu.institution}
                        onRemove={() =>
                          setEducation(education.filter((_, j) => j !== i))
                        }
                      />
                    ))}
                  </div>
                )}

                <VaultSubPlate label={t("apply.s2.education")}>
                  <p
                    style={{
                      fontSize: 12.5,
                      color: "var(--ink-2)",
                      marginTop: -8,
                    }}
                  >
                    {t("apply.s2.educationSub")}
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <VaultInput
                      label={t("apply.s2.degree")}
                      required
                      placeholder="e.g. MBA, LLB, BSc"
                      value={currentEduDegree}
                      onChange={setCurrentEduDegree}
                    />
                    <VaultInput
                      label={t("apply.s2.institution")}
                      required
                      placeholder="e.g. University of Dhaka"
                      value={currentEduInstitution}
                      onChange={setCurrentEduInstitution}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <VaultInput
                      label={t("apply.s2.fieldOfStudy")}
                      placeholder="e.g. Human Resource Management"
                      value={currentEduField}
                      onChange={setCurrentEduField}
                    />
                    <VaultInput
                      label={t("apply.s2.yearCompleted")}
                      placeholder="e.g. 2020"
                      value={currentEduYear}
                      onChange={setCurrentEduYear}
                    />
                  </div>
                  <button
                    type="button"
                    className="lf-cta lf-cta--ghost" style={{ width: "100%", justifyContent: "center" }}
                    onClick={() => {
                      if (
                        !currentEduDegree.trim() ||
                        !currentEduInstitution.trim()
                      ) {
                        toast.error("Degree and institution are required");
                        return;
                      }
                      setEducation((prev) => [
                        ...prev,
                        {
                          degree: currentEduDegree,
                          institution: currentEduInstitution,
                          fieldOfStudy: currentEduField || undefined,
                          year: currentEduYear || undefined,
                        },
                      ]);
                      setCurrentEduDegree("");
                      setCurrentEduInstitution("");
                      setCurrentEduField("");
                      setCurrentEduYear("");
                    }}
                  >
                    <Plus className="size-3.5" />
                    {t("apply.s2.addEducation")}
                  </button>
                </VaultSubPlate>

                {/* Languages list */}
                {languages.length > 0 && (
                  <div className="space-y-2">
                    {languages.map((lang, i) => (
                      <VaultEntryRow
                        key={i}
                        folio="LANG"
                        title={lang.name}
                        meta={
                          lang.proficiency
                            ? t(`lang.proficiency.${lang.proficiency}`)
                            : undefined
                        }
                        onRemove={() =>
                          setLanguages(languages.filter((_, j) => j !== i))
                        }
                      />
                    ))}
                  </div>
                )}

                <VaultSubPlate label={t("apply.s2.languages")}>
                  <p
                    style={{
                      fontSize: 12.5,
                      color: "var(--ink-2)",
                      marginTop: -8,
                    }}
                  >
                    {t("apply.s2.languagesSub")}
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <VaultInput
                      label={t("apply.s2.languageName")}
                      required
                      placeholder="e.g. English, Bangla"
                      value={currentLangName}
                      onChange={setCurrentLangName}
                    />
                    <VaultSelect
                      label={t("apply.s2.proficiency")}
                      options={PROFICIENCY_OPTIONS.map((p) => p)}
                      placeholder="Select proficiency"
                      value={currentLangProficiency || ""}
                      onChange={(v) =>
                        setCurrentLangProficiency(
                          v as LangEntry["proficiency"]
                        )
                      }
                    />
                  </div>
                  <button
                    type="button"
                    className="lf-cta lf-cta--ghost" style={{ width: "100%", justifyContent: "center" }}
                    onClick={() => {
                      if (!currentLangName.trim()) {
                        toast.error("Language name is required");
                        return;
                      }
                      setLanguages((prev) => [
                        ...prev,
                        {
                          name: currentLangName,
                          proficiency: currentLangProficiency || undefined,
                        },
                      ]);
                      setCurrentLangName("");
                      setCurrentLangProficiency(undefined);
                    }}
                  >
                    <Plus className="size-3.5" />
                    {t("apply.s2.addLanguage")}
                  </button>
                </VaultSubPlate>
              </VaultChapter>

              {/* Chapter III — Dossier */}
              <VaultChapter
                num={3}
                chapterLabel="§ III · Dossier"
                titleKey="apply.s3.title"
                subtitleKey="apply.s3.subtitle"
                state={chapters[2].state}
                active={activeSection === 3}
                onToggle={() => setActiveSection(activeSection === 3 ? 0 : 3)}
              >
                {/* Certifications */}
                {certs.length > 0 && (
                  <div className="space-y-2">
                    {certs.map((c, i) => (
                      <VaultEntryRow
                        key={i}
                        folio={c.year || "—"}
                        title={c.name}
                        meta={c.org}
                        onRemove={() =>
                          setCerts(certs.filter((_, j) => j !== i))
                        }
                      />
                    ))}
                  </div>
                )}
                <VaultSubPlate label={t("apply.s3.addCert")}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <VaultInput
                      label={t("apply.s3.certName")}
                      placeholder={t("apply.s3.certNamePh")}
                      value={currentCertName}
                      onChange={setCurrentCertName}
                    />
                    <VaultInput
                      label={t("apply.s3.certOrg")}
                      placeholder={t("apply.s3.certOrgPh")}
                      value={currentCertOrg}
                      onChange={setCurrentCertOrg}
                    />
                  </div>
                  <VaultInput
                    label={t("apply.s3.certYear")}
                    placeholder="e.g. 2020"
                    type="number"
                    value={currentCertYear}
                    onChange={setCurrentCertYear}
                  />
                  <button
                    type="button"
                    className="lf-cta lf-cta--ghost" style={{ width: "100%", justifyContent: "center" }}
                    onClick={handleAddCert}
                  >
                    <Plus className="size-3.5" />
                    {t("apply.s3.addCertBtn")}
                  </button>
                </VaultSubPlate>

                {/* Experience */}
                {exps.length > 0 && (
                  <div className="space-y-2">
                    {exps.map((e, i) => (
                      <VaultEntryRow
                        key={i}
                        folio={e.duration || "—"}
                        title={e.title || e.role || "Experience"}
                        meta={e.company || e.location}
                        onRemove={() =>
                          setExps(exps.filter((_, j) => j !== i))
                        }
                      />
                    ))}
                  </div>
                )}
                <VaultSubPlate label={t("apply.s3.addExp")}>
                  <VaultInput
                    label={t("apply.s3.expTitle")}
                    placeholder={t("apply.s3.expTitlePh")}
                    value={currentExpTitle}
                    onChange={setCurrentExpTitle}
                  />
                  <VaultInput
                    label="Company"
                    placeholder="e.g. Acme Corp"
                    value={currentExpCompany}
                    onChange={setCurrentExpCompany}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <VaultInput
                      label="Location"
                      placeholder="e.g. Dhaka, Bangladesh"
                      value={currentExpLocation}
                      onChange={setCurrentExpLocation}
                    />
                    <div style={fieldGroup}>
                      <VaultLabel label="Work mode" />
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                          gap: 0,
                          borderRadius: "var(--r-md)",
                          border: "1px solid var(--line-2)",
                          overflow: "hidden",
                          width: "100%",
                        }}
                      >
                        {(
                          [
                            { value: "on-site" as const, label: "On-site" },
                            { value: "remote" as const, label: "Remote" },
                            { value: "hybrid" as const, label: "Hybrid" },
                          ]
                        ).map((mode, i) => {
                          const active = currentExpWorkMode === mode.value;
                          return (
                            <button
                              type="button"
                              key={mode.value}
                              data-active={active}
                              onClick={() =>
                                setCurrentExpWorkMode(
                                  currentExpWorkMode === mode.value
                                    ? ""
                                    : mode.value
                                )
                              }
                              style={{
                                padding: "10px 14px",
                                fontFamily: "var(--lf-body)",
                                fontSize: 13,
                                color: active ? "var(--ink)" : "var(--ink-3)",
                                background: active
                                  ? "var(--accent-blue-ghost)"
                                  : "var(--paper)",
                                border: 0,
                                borderRight:
                                  i < 2 ? "1px solid var(--line-2)" : "none",
                                cursor: "pointer",
                                transition: "background 160ms ease",
                              }}
                            >
                              {mode.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <VaultInput
                    label={t("apply.s3.expDuration")}
                    placeholder={t("apply.s3.expDurationPh")}
                    value={currentExpDuration}
                    onChange={setCurrentExpDuration}
                  />
                  <VaultTextarea
                    label={t("apply.s3.expScope")}
                    placeholder={t("apply.s3.expScopePh")}
                    rows={2}
                    value={currentExpScope}
                    onChange={setCurrentExpScope}
                  />
                  <VaultTextarea
                    label={t("apply.s3.expRole")}
                    placeholder={t("apply.s3.expRolePh")}
                    rows={3}
                    value={currentExpRole}
                    onChange={setCurrentExpRole}
                  />
                  <button
                    type="button"
                    className="lf-cta lf-cta--ghost" style={{ width: "100%", justifyContent: "center" }}
                    onClick={handleAddExp}
                  >
                    <Plus className="size-3.5" />
                    {t("apply.s3.addExpBtn")}
                  </button>
                </VaultSubPlate>

                {/* Projects */}
                {projects.length > 0 && (
                  <div className="space-y-2">
                    {projects.map((p, i) => (
                      <VaultEntryRow
                        key={i}
                        folio={p.duration || "—"}
                        title={p.name}
                        meta={p.client || p.outcome}
                        onRemove={() =>
                          setProjects(projects.filter((_, j) => j !== i))
                        }
                      />
                    ))}
                  </div>
                )}
                <VaultSubPlate label={t("apply.s3.projects")}>
                  <p
                    style={{
                      fontSize: 12.5,
                      color: "var(--ink-2)",
                      marginTop: -8,
                    }}
                  >
                    {t("apply.s3.projectsSub")}
                  </p>
                  <VaultInput
                    label={t("apply.s3.projectName")}
                    required
                    placeholder="e.g. Factory Compliance Audit"
                    value={currentProjName}
                    onChange={setCurrentProjName}
                  />
                  <VaultInput
                    label={t("apply.s3.client")}
                    placeholder="e.g. ABC Garments Ltd"
                    value={currentProjClient}
                    onChange={setCurrentProjClient}
                  />
                  <VaultTextarea
                    label={t("apply.s3.projectDescription")}
                    placeholder="Brief description of the project"
                    rows={2}
                    value={currentProjDesc}
                    onChange={setCurrentProjDesc}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <VaultInput
                      label={t("apply.s3.projectDuration")}
                      placeholder="e.g. 6 months, 2022-2023"
                      value={currentProjDuration}
                      onChange={setCurrentProjDuration}
                    />
                    <VaultInput
                      label={t("apply.s3.outcome")}
                      placeholder="e.g. 100% compliance achieved"
                      value={currentProjOutcome}
                      onChange={setCurrentProjOutcome}
                    />
                  </div>
                  <button
                    type="button"
                    className="lf-cta lf-cta--ghost" style={{ width: "100%", justifyContent: "center" }}
                    onClick={() => {
                      if (!currentProjName.trim()) {
                        toast.error("Project name is required");
                        return;
                      }
                      setProjects((prev) => [
                        ...prev,
                        {
                          name: currentProjName,
                          client: currentProjClient || undefined,
                          description: currentProjDesc || undefined,
                          duration: currentProjDuration || undefined,
                          outcome: currentProjOutcome || undefined,
                        },
                      ]);
                      setCurrentProjName("");
                      setCurrentProjClient("");
                      setCurrentProjDesc("");
                      setCurrentProjDuration("");
                      setCurrentProjOutcome("");
                    }}
                  >
                    <Plus className="size-3.5" />
                    {t("apply.s3.addProject")}
                  </button>
                </VaultSubPlate>

                {/* Affiliations */}
                {affiliations.length > 0 && (
                  <div className="space-y-2">
                    {affiliations.map((a, i) => (
                      <VaultEntryRow
                        key={i}
                        folio={a.since || "—"}
                        title={a.name}
                        meta={a.role}
                        onRemove={() =>
                          setAffiliations(
                            affiliations.filter((_, j) => j !== i)
                          )
                        }
                      />
                    ))}
                  </div>
                )}
                <VaultSubPlate label={t("apply.s3.affiliations")}>
                  <p
                    style={{
                      fontSize: 12.5,
                      color: "var(--ink-2)",
                      marginTop: -8,
                    }}
                  >
                    {t("apply.s3.affiliationsSub")}
                  </p>
                  <VaultInput
                    label={t("apply.s3.affiliationName")}
                    required
                    placeholder="e.g. SHRM, BSHRM"
                    value={currentAffName}
                    onChange={setCurrentAffName}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <VaultInput
                      label={t("apply.s3.affiliationRole")}
                      placeholder="e.g. Member, Board Director"
                      value={currentAffRole}
                      onChange={setCurrentAffRole}
                    />
                    <VaultInput
                      label={t("apply.s3.affiliationSince")}
                      placeholder="e.g. 2019"
                      value={currentAffSince}
                      onChange={setCurrentAffSince}
                    />
                  </div>
                  <button
                    type="button"
                    className="lf-cta lf-cta--ghost" style={{ width: "100%", justifyContent: "center" }}
                    onClick={() => {
                      if (!currentAffName.trim()) {
                        toast.error("Organization name is required");
                        return;
                      }
                      setAffiliations((prev) => [
                        ...prev,
                        {
                          name: currentAffName,
                          role: currentAffRole || undefined,
                          since: currentAffSince || undefined,
                        },
                      ]);
                      setCurrentAffName("");
                      setCurrentAffRole("");
                      setCurrentAffSince("");
                    }}
                  >
                    <Plus className="size-3.5" />
                    {t("apply.s3.addAffiliation")}
                  </button>
                </VaultSubPlate>

                {/* Session length */}
                <div>
                  <VaultLabel label={t("apply.s3.sessionLength")} required />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s-2)" }}>
                    {[30, 60, 90].map((min) => {
                      const on = sessionLengths.includes(min);
                      return (
                        <button
                          key={min}
                          type="button"
                          onClick={() => toggleSessionLength(min)}
                          style={
                            on
                              ? {
                                  ...chipBase,
                                  background: "var(--rust-ghost)",
                                  color: "var(--rust)",
                                  borderColor: "var(--rust)",
                                }
                              : chipBase
                          }
                          aria-pressed={on}
                        >
                          {min} {t("apply.s3.minutes")}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </VaultChapter>

              {/* Chapter IV — Countersignature */}
              <VaultChapter
                num={4}
                chapterLabel="§ IV · Countersignature"
                titleKey="apply.s4.title"
                subtitleKey="apply.s4.subtitle"
                state={chapters[3].state}
                active={activeSection === 4}
                onToggle={() => setActiveSection(activeSection === 4 ? 0 : 4)}
              >
                <div
                  className={cn("space-y-3")}
                  style={
                    consentError && (!consentAccuracy || !consentProfile)
                      ? {
                          background: "var(--rust-ghost)",
                          borderLeft: "3px solid var(--rust)",
                          borderRadius: "var(--r-md)",
                          padding: "1rem 1.25rem",
                        }
                      : undefined
                  }
                >
                  {consentError && (!consentAccuracy || !consentProfile) && (
                    <p
                      className="lf-meta"
                      style={{ color: "var(--rust)", textTransform: "uppercase", fontWeight: 600 }}
                    >
                      {t("apply.validation.consentRequired") ||
                        "Please accept the required consent checkboxes before submitting."}
                    </p>
                  )}
                  <label
                    className="flex items-start gap-3 cursor-pointer"
                    style={{ fontSize: 14, lineHeight: 1.55 }}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      style={{ accentColor: "var(--rust)" }}
                      checked={consentAccuracy}
                      onChange={(e) => {
                        setConsentAccuracy(e.target.checked);
                        if (e.target.checked && consentProfile) setConsentError(false);
                      }}
                    />
                    <span style={{ color: "var(--ink)" }}>
                      {t("apply.s4.consent1")}{" "}
                      <span style={{ color: "var(--rust)" }}>*</span>
                    </span>
                  </label>
                  <label
                    className="flex items-start gap-3 cursor-pointer"
                    style={{ fontSize: 14, lineHeight: 1.55 }}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      style={{ accentColor: "var(--rust)" }}
                      checked={consentProfile}
                      onChange={(e) => {
                        setConsentProfile(e.target.checked);
                        if (e.target.checked && consentAccuracy) setConsentError(false);
                      }}
                    />
                    <span style={{ color: "var(--ink)" }}>
                      {t("apply.s4.consent2")}{" "}
                      <span style={{ color: "var(--rust)" }}>*</span>
                    </span>
                  </label>
                  <label
                    className="flex items-start gap-3 cursor-pointer"
                    style={{ fontSize: 14, lineHeight: 1.55 }}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      style={{ accentColor: "var(--rust)" }}
                      checked={consentMarketing}
                      onChange={(e) => setConsentMarketing(e.target.checked)}
                    />
                    <span style={{ color: "var(--ink)" }}>
                      {t("apply.s4.consent3")}
                    </span>
                  </label>
                </div>

                <div
                  style={{
                    background: "var(--paper-warm)",
                    border: "1px solid var(--line-2)",
                    borderRadius: "var(--r-md)",
                    padding: "1.1rem 1.25rem",
                  }}
                >
                  <span className="lf-meta" style={{ textTransform: "uppercase", color: "var(--accent-blue)", fontWeight: 600 }}>Filing summary</span>
                  <div className="mt-3 grid gap-2" style={{ fontSize: 13 }}>
                    <SummaryRow label="Skills filed" value={`${skills.length}`} />
                    <SummaryRow label="Certifications" value={`${certs.length}`} />
                    <SummaryRow label="Experience entries" value={`${exps.length}`} />
                    <SummaryRow label="Projects" value={`${projects.length}`} />
                    <SummaryRow label="Sectors" value={`${sectors.length}`} />
                    <SummaryRow label="Session lengths" value={sessionLengths.length ? sessionLengths.join(", ") + " min" : "—"} />
                  </div>
                </div>
              </VaultChapter>

              {/* Action bar */}
              <div className="flex items-center justify-between flex-wrap gap-3 pt-4">
                <Link href="/experts" className="lf-cta lf-cta--ghost">
                  <ArrowLeft className="size-3.5" />
                  {t("apply.back")}
                </Link>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="lf-cta lf-cta--ghost"
                    disabled={saving}
                    onClick={handleSaveDraft}
                  >
                    {saving && <Loader2 className="size-3.5 animate-spin" />}
                    {t("apply.saveDraft")}
                  </button>
                  <button
                    type="button"
                    className="lf-cta lf-cta--primary"
                    disabled={submitting}
                    onClick={handleSubmit}
                  >
                    {submitting && <Loader2 className="size-3.5 animate-spin" />}
                    {previousSubmissionStatus === "rejected"
                      ? "Revise and re-file →"
                      : t("apply.submit") || "File and submit for review →"}
                  </button>
                </div>
              </div>
            </div>

            {/* ============================ Sidebar ============================ */}
            <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
              {/* CV auto-fill */}
              <div
                className={cn(
                  "lf-card",
                  (urlParsed || urlParsing) && "pointer-events-none opacity-50"
                )}
                style={{ padding: "1.1rem 1.25rem" }}
              >
                <span className="lf-meta" style={{ textTransform: "uppercase", color: "var(--accent-blue)", fontWeight: 600 }}>CV auto-fill</span>
                <p
                  className="mt-2"
                  style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.55 }}
                >
                  {t("apply.cv.desc")}
                </p>

                {cvParsed ? (
                  <div
                    className="mt-3"
                    style={{
                      padding: "0.65rem 0.85rem",
                      borderRadius: "calc(var(--r-md) - 2px)",
                      background: "var(--rust-ghost)",
                      border: "1px solid color-mix(in oklab, var(--rust) 28%, transparent)",
                    }}
                  >
                    <div
                      className="flex items-center gap-2"
                      style={{ color: "var(--rust)", fontSize: 12 }}
                    >
                      <CheckCircle className="size-3.5" />
                      <span className="lf-meta" style={{ color: "var(--rust)", textTransform: "uppercase", fontWeight: 600 }}>
                        {t("apply.cv.done")}
                      </span>
                    </div>
                    <p
                      className="mt-1.5"
                      style={{ fontSize: 11, color: "var(--ink-2)" }}
                    >
                      {t("apply.cv.reviewHint")}
                    </p>
                  </div>
                ) : cvParsing ? (
                  <div
                    className="mt-3 flex items-center gap-2"
                    style={{ fontSize: 12, color: "var(--ink-2)" }}
                  >
                    <Loader2 className="size-3.5 animate-spin" style={{ color: "var(--rust)" }} />
                    <span className="lf-meta" style={{ textTransform: "uppercase" }}>{t("apply.cv.analyzing")}</span>
                  </div>
                ) : null}

                <label
                  className={cn(
                    "mt-3 flex flex-col items-center justify-center gap-2 text-center",
                    (cvParsing || urlParsed || urlParsing) &&
                      "pointer-events-none opacity-50"
                  )}
                  style={{
                    border: `1.5px dashed ${cvDragging ? "var(--rust)" : "var(--line-2)"}`,
                    borderRadius: "var(--r-md)",
                    padding: "1.25rem",
                    cursor: "pointer",
                    background: cvDragging
                      ? "var(--rust-ghost)"
                      : "var(--paper)",
                    transition: "background 160ms ease, border-color 160ms ease",
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!cvParsing && !urlParsed && !urlParsing) setCvDragging(true);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    if (!cvParsing && !urlParsed && !urlParsing) setCvDragging(true);
                  }}
                  onDragLeave={() => setCvDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setCvDragging(false);
                    if (cvParsing || urlParsed || urlParsing) return;
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleCvUpload(f);
                  }}
                >
                  <Upload
                    className="size-4"
                    style={{ color: cvDragging ? "var(--rust)" : "var(--ink-2)" }}
                  />
                  <span
                    className="lf-meta"
                    style={{ color: "var(--ink)", textTransform: "uppercase", fontWeight: 600 }}
                  >
                    {cvDragging
                      ? t("apply.cv.dropHere")
                      : cvParsed
                        ? t("apply.cv.uploadAnother")
                        : t("apply.cv.uploadBtn")}
                  </span>
                  <span style={{ fontSize: 10.5, color: "var(--ink-3)" }}>
                    PDF · DOC · DOCX · JPG · PNG
                  </span>
                  <span
                    style={{
                      fontSize: 10.5,
                      color: "var(--rust)",
                      fontFamily: "var(--lf-mono)",
                      letterSpacing: "0.12em",
                    }}
                  >
                    {t("apply.cv.pdfHint")}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="hidden"
                    disabled={cvParsing || urlParsed || urlParsing}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleCvUpload(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>

              {/* URL auto-fill */}
              <div
                className={cn(
                  "lf-card",
                  (cvParsed || cvParsing) && "pointer-events-none opacity-50"
                )}
                style={{ padding: "1.1rem 1.25rem" }}
              >
                <span className="lf-meta" style={{ textTransform: "uppercase", color: "var(--accent-blue)", fontWeight: 600 }}>Profile URL</span>
                <p
                  className="mt-2"
                  style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.55 }}
                >
                  {t("apply.url.desc")}
                </p>

                {urlParsed ? (
                  <div
                    className="mt-3"
                    style={{
                      padding: "0.65rem 0.85rem",
                      borderRadius: "calc(var(--r-md) - 2px)",
                      background: "var(--accent-blue-ghost)",
                      border: "1px solid color-mix(in oklab, var(--accent-blue) 28%, transparent)",
                    }}
                  >
                    <div
                      className="flex items-center gap-2"
                      style={{ color: "var(--accent-blue)", fontSize: 12 }}
                    >
                      <CheckCircle className="size-3.5" />
                      <span className="lf-meta" style={{ color: "var(--accent-blue)", textTransform: "uppercase", fontWeight: 600 }}>
                        {t("apply.url.done")}
                      </span>
                    </div>
                    <p
                      className="mt-1.5"
                      style={{ fontSize: 11, color: "var(--ink-2)" }}
                    >
                      {t("apply.cv.reviewHint")}
                    </p>
                  </div>
                ) : urlParsing ? (
                  <div
                    className="mt-3 flex items-center gap-2"
                    style={{ fontSize: 12, color: "var(--ink-2)" }}
                  >
                    <Loader2 className="size-3.5 animate-spin" style={{ color: "var(--accent-blue)" }} />
                    <span className="lf-meta" style={{ textTransform: "uppercase" }}>{t("apply.url.analyzing")}</span>
                  </div>
                ) : null}

                <div className="mt-3 space-y-2">
                  <input
                    type="url"
                    value={profileUrl}
                    onChange={(e) => setProfileUrl(e.target.value)}
                    placeholder={t("apply.url.placeholder")}
                    disabled={urlParsing || cvParsed || cvParsing}
                    className="lf-input"
                    style={{ fontSize: 13 }}
                  />
                  {profileUrl.includes("linkedin.com") && (
                    <p style={{ fontSize: 11, color: "var(--ink-3)" }}>
                      {t("apply.url.linkedinHint")}
                    </p>
                  )}
                  <button
                    type="button"
                    className="lf-cta lf-cta--primary" style={{ width: "100%", justifyContent: "center" }}
                    disabled={
                      urlParsing || !profileUrl.trim() || cvParsed || cvParsing
                    }
                    onClick={handleUrlParse}
                  >
                    {urlParsing ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Globe className="size-3.5" />
                    )}
                    {t("apply.url.analyzeBtn")}
                  </button>
                </div>
              </div>

              {/* Help */}
              <div className="lf-card" style={{ padding: "var(--s-4) var(--s-5)" }}>
                <span className="lf-meta" style={{ textTransform: "uppercase", color: "var(--rust)", fontWeight: 600 }}>{t("apply.help.title")}</span>
                <div className="mt-3 space-y-4">
                  {["apply.help.q1", "apply.help.q2", "apply.help.q3"].map((qk) => (
                    <div key={qk}>
                      <p
                        style={{
                          fontSize: 12.5,
                          fontWeight: 500,
                          color: "var(--ink)",
                        }}
                      >
                        {t(qk)}
                      </p>
                      <p
                        className="mt-1"
                        style={{
                          fontSize: 12,
                          color: "var(--ink-2)",
                          lineHeight: 1.55,
                        }}
                      >
                        {t(qk.replace(/\.q/, ".a"))}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
          </motion.section>
        </main>
        <HomepageFooter />
      </div>
    </MotionConfig>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: 6,
        borderBottom: "1px solid var(--line-2)",
      }}
    >
      <span className="lf-meta" style={{ color: "var(--ink-2)", textTransform: "uppercase" }}>
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--lf-mono)",
          color: "var(--ink)",
          fontSize: 13,
        }}
      >
        {value}
      </span>
    </div>
  );
}
