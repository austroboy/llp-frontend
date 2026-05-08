"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { SignUp, useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Check } from "lucide-react";
import { useTheme } from "next-themes";
import { motion, MotionConfig, AnimatePresence, type Variants } from "framer-motion";
import {
  ORG_TYPES,
  INDUSTRIES,
  EMPLOYEE_RANGES,
} from "@/lib/constants";
import {
  isPersonalEmail,
  PERSONAL_EMAIL_WARNING,
} from "@/lib/personal-email";
import { AuthSpine, AuthSpineBand } from "@/components/auth/AuthSpine";
import { lfClerkAppearance } from "@/lib/clerk-appearance-lf";
import "@/components/landing/landing.css";
import "@/components/landing/landing-auth.css";

type Step = "choose" | "individual" | "org-form" | "org-verify";
type AccountType = "individual" | "organization";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

function buildDossier(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `DOSSIER № LLP-${y}.${m}.${day} / ENROL-${String(
    Math.floor(d.getTime() / 1000) % 1000
  ).padStart(3, "0")}`;
}

export default function SignUpPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>("choose");
  const [selectedType, setSelectedType] = useState<AccountType | null>(null);
  const [dossier, setDossier] = useState("DOSSIER № LLP / ENROL-…");

  useEffect(() => {
    setMounted(true);
    setDossier(buildDossier());
  }, []);

  const themeAttr = mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "light";

  return (
    <div className="lf-page" data-theme={themeAttr} suppressHydrationWarning>
      <MotionConfig reducedMotion="user">
        <AnimatePresence mode="wait">
          {step === "choose" && (
            <ChooseStep
              key="choose"
              dossier={dossier}
              selected={selectedType}
              onSelect={setSelectedType}
              onContinue={() => {
                if (selectedType === "individual") setStep("individual");
                else if (selectedType === "organization") setStep("org-form");
              }}
            />
          )}

          {step === "individual" && (
            <IndividualStep
              key="individual"
              dossier={dossier}
              onBack={() => setStep("choose")}
            />
          )}

          {(step === "org-form" || step === "org-verify") && (
            <OrgSignUpFlow
              key="org"
              dossier={dossier}
              step={step}
              setStep={setStep}
            />
          )}
        </AnimatePresence>
      </MotionConfig>
    </div>
  );
}

/* ───────────────────────────────────────────────────────── *
 * STATE A — Account Type Chooser
 * ───────────────────────────────────────────────────────── */

function ChooseStep({
  dossier,
  selected,
  onSelect,
  onContinue,
}: {
  dossier: string;
  selected: AccountType | null;
  onSelect: (t: AccountType) => void;
  onContinue: () => void;
}) {
  return (
    <motion.main
      className="lf-auth-shell"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28, ease: EASE_OUT }}
    >
      <AuthSpine
        dossier={dossier}
        kicker="§ 1.0 · New Account · Labour-Law Research"
        title="Open a research account."
        body="Get AI-assisted Bangladesh labour-law answers — bilingual (EN · বাংলা), cited, and grounded in the nine governing instruments from the 2006 Act through the 2026 amendments."
        foot="Enrolment · Under oath · Recorded"
      />
      <AuthSpineBand />

      <section className="lf-auth-paper">
        <motion.div
          className="lf-auth-paper-inner lf-auth-paper-inner--md"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <motion.div
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 24 }}
            variants={fadeUp}
          >
            <span className="lf-auth-kicker">
              <span className="lf-auth-kicker-mark">§ 1.0</span>
              Create an account
            </span>
            <Link href="/sign-in" className="lf-auth-link" style={{ fontFamily: "var(--lf-mono)", fontSize: 11.5, letterSpacing: "0.18em", textTransform: "uppercase" }}>
              Sign in →
            </Link>
          </motion.div>

          <motion.h2 className="lf-auth-h2" variants={fadeUp}>
            Two account types.
          </motion.h2>
          <motion.p className="lf-auth-deck" variants={fadeUp}>
            Pick one — you can&apos;t change this later.
          </motion.p>

          <motion.div
            style={{ marginTop: 40, display: "grid", gap: 24 }}
            variants={stagger}
          >
            <motion.button
              type="button"
              className="lf-auth-tab"
              data-active={selected === "individual"}
              onClick={() => onSelect("individual")}
              aria-pressed={selected === "individual"}
              variants={fadeUp}
            >
              <span className="lf-auth-tab-eyebrow">Account type · Individual</span>
              <h3 className="lf-auth-tab-title">Individual</h3>
              <p className="lf-auth-tab-body">
                AI labour-law search in English and বাংলা. Expert directory,
                service requests, and your full conversation history — saved
                to your personal account.
              </p>
              {selected === "individual" && (
                <span aria-hidden className="lf-auth-tab-medallion">LLP</span>
              )}
            </motion.button>

            <motion.button
              type="button"
              className="lf-auth-tab"
              data-active={selected === "organization"}
              onClick={() => onSelect("organization")}
              aria-pressed={selected === "organization"}
              variants={fadeUp}
            >
              <span className="lf-auth-tab-eyebrow">Account type · Organization</span>
              <h3 className="lf-auth-tab-title">Organization</h3>
              <p className="lf-auth-tab-body">
                Compliance research, HR policy drafting, expert consultations,
                and shared access for your team — under one company account.
              </p>
              {selected === "organization" && (
                <span aria-hidden className="lf-auth-tab-medallion">LLP</span>
              )}
            </motion.button>
          </motion.div>

          <motion.div
            style={{ marginTop: 40, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}
            variants={fadeUp}
          >
            <button
              type="button"
              onClick={onContinue}
              disabled={!selected}
              className="lf-auth-cta lf-auth-cta--primary"
            >
              Continue →
            </button>
            <span className="lf-auth-foot-stamp" style={{ marginTop: 0 }}>
              Email verification next
            </span>
          </motion.div>

          <motion.p
            style={{ marginTop: 48, fontSize: 13, lineHeight: 1.55, color: "var(--ink-2)" }}
            variants={fadeUp}
          >
            Already have an account?{" "}
            <Link href="/sign-in" className="lf-auth-link">Sign in</Link>
            <span style={{ margin: "0 8px", color: "var(--ink-4)" }}>·</span>
            <Link href="/" className="lf-auth-link" style={{ color: "var(--ink-2)" }}>
              Back to home
            </Link>
          </motion.p>
        </motion.div>
      </section>
    </motion.main>
  );
}

/* ───────────────────────────────────────────────────────── *
 * STATE B — Individual Sign-Up
 * ───────────────────────────────────────────────────────── */

function IndividualStep({
  dossier,
  onBack,
}: {
  dossier: string;
  onBack: () => void;
}) {
  return (
    <motion.main
      className="lf-auth-shell"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28, ease: EASE_OUT }}
    >
      <AuthSpine
        dossier={dossier}
        kicker="§ 1.1 · Individual · Labour-Law Research"
        title="Research as an individual."
        body="Workers, HR practitioners, students — bilingual answers cited to the exact section of the 2006 Act, 2015 Rules, and every amendment through 2026."
        foot="Enrolment · Under oath · Recorded"
      />
      <AuthSpineBand />

      <section className="lf-auth-paper">
        <motion.div
          className="lf-auth-paper-inner lf-auth-paper-inner--sm"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <motion.button
            onClick={onBack}
            className="lf-auth-topbar-back"
            variants={fadeUp}
          >
            <ArrowLeft className="size-3.5" />
            Back to account types
          </motion.button>

          <motion.span className="lf-auth-kicker" style={{ marginTop: 24 }} variants={fadeUp}>
            <span className="lf-auth-kicker-mark">§ 1.1</span>
            Individual · Labour-Law Research
          </motion.span>
          <motion.h2 className="lf-auth-h2" variants={fadeUp}>
            Create your account.
          </motion.h2>

          <motion.div style={{ marginTop: 32 }} variants={fadeUp}>
            <SignUp
              appearance={lfClerkAppearance}
              routing="path"
              path="/sign-up"
              signInUrl="/sign-in"
            />
          </motion.div>

          <motion.p className="lf-auth-foot-stamp" variants={fadeUp}>
            Email verification next · Research history saved
          </motion.p>
        </motion.div>
      </section>
    </motion.main>
  );
}

/* ───────────────────────────────────────────────────────── *
 * STATES C + D — Organization flow (filled in Tasks 6 + 7)
 * ───────────────────────────────────────────────────────── */

interface OrgFormData {
  representativeName: string;
  email: string;
  phone: string;
  companyName: string;
  designation: string;
  orgType: string;
  industry: string;
  employeeCount: string;
  city: string;
  country: string;
  password: string;
  confirmPassword: string;
}

function OrgSignUpFlow({
  dossier,
  step,
  setStep,
}: {
  dossier: string;
  step: "org-form" | "org-verify";
  setStep: (s: Step) => void;
}) {
  const { signUp, setActive } = useSignUp();
  const router = useRouter();
  const createOrg = useMutation(api.organizations.create);

  const [form, setForm] = useState<OrgFormData>({
    representativeName: "",
    email: "",
    phone: "",
    companyName: "",
    designation: "",
    orgType: "",
    industry: "",
    employeeCount: "",
    city: "",
    country: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingForm, setPendingForm] = useState<OrgFormData | null>(null);

  const updateField = useCallback(
    <K extends keyof OrgFormData>(key: K, value: OrgFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const checkEmail = useCallback(async () => {
    if (!form.email) return;
    setEmailError("");
    if (isPersonalEmail(form.email)) {
      setEmailError(PERSONAL_EMAIL_WARNING);
      return;
    }
    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      if (data.exists) {
        setEmailError(
          "This email is already registered. Use a different email or sign in instead."
        );
      }
    } catch {
      // ignore
    }
  }, [form.email]);

  const validate = (): string | null => {
    if (!form.representativeName.trim()) return "Representative name is required.";
    if (!form.email.trim()) return "Work email is required.";
    if (isPersonalEmail(form.email)) return PERSONAL_EMAIL_WARNING;
    if (!form.phone.trim()) return "Phone number is required.";
    if (!form.companyName.trim()) return "Company name is required.";
    if (!form.designation.trim()) return "Designation is required.";
    if (!form.orgType) return "Organization type is required.";
    if (!form.industry) return "Industry is required.";
    if (!form.employeeCount) return "Employee count range is required.";
    if (!form.city.trim()) return "City is required.";
    if (!form.country.trim()) return "Country is required.";
    if (form.password.length < 8) return "Password must be at least 8 characters.";
    if (form.password !== form.confirmPassword) return "Passwords do not match.";
    if (emailError) return emailError;
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!signUp) return;

    setLoading(true);
    setError("");

    try {
      const nameParts = form.representativeName.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

      const result = await signUp.create({
        emailAddress: form.email,
        password: form.password,
        firstName,
        lastName,
        unsafeMetadata: {
          accountType: "organization",
          pendingOrg: {
            companyName: form.companyName,
            industry: form.industry,
            employeeCount: form.employeeCount,
            city: form.city,
            country: form.country,
            designation: form.designation,
            phone: form.phone,
            orgType: form.orgType,
          },
        },
      });

      if (result.status === "complete" && result.createdUserId) {
        await setActive({ session: result.createdSessionId });
        const orgId = await createOrg({
          name: form.companyName,
          industry: form.industry,
          size: form.employeeCount,
          address: `${form.city}, ${form.country}`,
          primaryContactName: form.representativeName,
          primaryContactDesignation: form.designation,
          primaryContactEmail: form.email,
          primaryContactPhone: form.phone,
          createdByClerkId: result.createdUserId,
        });
        const metaRes = await fetch("/api/auth/set-org-metadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgId, orgName: form.companyName }),
        });
        if (!metaRes.ok) {
          console.error(
            "[org-signup] set-org-metadata failed:",
            await metaRes.text().catch(() => "")
          );
        }
        router.push("/org");
      } else {
        setPendingForm(form);
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        setStep("org-verify");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { errors?: { longMessage?: string }[] })?.errors?.[0]
              ?.longMessage || "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUp) return;

    setLoading(true);
    setError("");

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });

      if (result.status === "complete" && result.createdUserId) {
        await setActive({ session: result.createdSessionId });

        if (pendingForm) {
          try {
            const orgId = await createOrg({
              name: pendingForm.companyName,
              industry: pendingForm.industry,
              size: pendingForm.employeeCount,
              address: `${pendingForm.city}, ${pendingForm.country}`,
              primaryContactName: pendingForm.representativeName,
              primaryContactDesignation: pendingForm.designation,
              primaryContactEmail: pendingForm.email,
              primaryContactPhone: pendingForm.phone,
              createdByClerkId: result.createdUserId,
            });
            const metaRes = await fetch("/api/auth/set-org-metadata", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orgId, orgName: pendingForm.companyName }),
            });
            if (!metaRes.ok) {
              console.error(
                "[org-signup] set-org-metadata failed:",
                await metaRes.text().catch(() => "")
              );
            }
          } catch (orgErr) {
            console.error(
              "[org-signup] org finalize failed, will heal on next sign-in:",
              orgErr
            );
          }
        } else {
          console.warn(
            "[org-signup] pendingForm null — relying on finalize-org to heal"
          );
        }

        router.push("/org");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { errors?: { longMessage?: string }[] })?.errors?.[0]
              ?.longMessage || "Invalid verification code.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const chapters = useMemo(
    () => [
      {
        label: "§ I Identity",
        done:
          !!form.representativeName.trim() &&
          !!form.email.trim() &&
          !!form.phone.trim(),
      },
      {
        label: "§ II Company",
        done:
          !!form.companyName.trim() &&
          !!form.designation.trim() &&
          !!form.orgType &&
          !!form.industry &&
          !!form.employeeCount,
      },
      {
        label: "§ III Domicile",
        done: !!form.city.trim() && !!form.country.trim(),
      },
      {
        label: "§ IV Credentials",
        done:
          form.password.length >= 8 && form.password === form.confirmPassword,
      },
    ],
    [form]
  );

  if (step === "org-verify") {
    return (
      <OrgVerifyState
        pendingEmail={pendingForm?.email || form.email}
        verificationCode={verificationCode}
        setVerificationCode={setVerificationCode}
        loading={loading}
        error={error}
        onVerify={handleVerify}
        onBackToForm={() => setStep("org-form")}
      />
    );
  }

  return (
    <OrgFormState
      dossier={dossier}
      form={form}
      updateField={updateField}
      checkEmail={checkEmail}
      emailError={emailError}
      setEmailError={setEmailError}
      showPassword={showPassword}
      setShowPassword={setShowPassword}
      showConfirmPassword={showConfirmPassword}
      setShowConfirmPassword={setShowConfirmPassword}
      error={error}
      loading={loading}
      onSubmit={handleSubmit}
      onBack={() => setStep("choose")}
      chapters={chapters}
    />
  );
}

/* OrgFormState + OrgVerifyState defined in Tasks 6 + 7. Stubs follow: */

function OrgFormState({
  dossier,
  form,
  updateField,
  checkEmail,
  emailError,
  setEmailError,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  error,
  loading,
  onSubmit,
  onBack,
  chapters,
}: {
  dossier: string;
  form: OrgFormData;
  updateField: <K extends keyof OrgFormData>(key: K, value: OrgFormData[K]) => void;
  checkEmail: () => void;
  emailError: string;
  setEmailError: (s: string) => void;
  showPassword: boolean;
  setShowPassword: (fn: (s: boolean) => boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (fn: (s: boolean) => boolean) => void;
  error: string;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  chapters: { label: string; done: boolean }[];
}) {
  return (
    <motion.main
      className="lf-auth-paper"
      style={{ paddingTop: 56, paddingBottom: 64 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28, ease: EASE_OUT }}
    >
      <div className="lf-auth-paper-inner lf-auth-paper-inner--wide">
        <div className="lf-auth-topbar">
          <button type="button" onClick={onBack} className="lf-auth-topbar-back">
            <ArrowLeft className="size-3.5" />
            Back to account types
          </button>
          <span className="lf-auth-topbar-serial" suppressHydrationWarning>
            {dossier}
          </span>
        </div>

        <div style={{ marginBottom: 32 }}>
          <span className="lf-auth-kicker">
            <span className="lf-auth-kicker-mark">§ 2.0</span>
            Organization Account
          </span>
          <h1 className="lf-auth-h2" style={{ fontSize: "clamp(32px, 4vw, 44px)" }}>
            Register your organization.
          </h1>
          <p className="lf-auth-deck" style={{ maxWidth: "60ch" }}>
            Fill each field. Email verification comes next. Your organization
            gets shared labour-law research, policy drafting tools, and expert
            consultations under one account.
          </p>
        </div>

        <form onSubmit={onSubmit} className="lf-auth-org-grid">
          <div className="lf-auth-filing">
            <FilingSection num="§ I" title="Identity" />
            <FilingRow label="Representative" htmlFor="repName">
              <input
                id="repName"
                className="lf-auth-input"
                value={form.representativeName}
                onChange={(e) => updateField("representativeName", e.target.value)}
                placeholder="Full name"
                required
              />
            </FilingRow>
            <FilingRow label="Work Email" htmlFor="email" error={emailError}>
              <input
                id="email"
                type="email"
                className="lf-auth-input"
                value={form.email}
                onChange={(e) => {
                  updateField("email", e.target.value);
                  if (emailError) setEmailError("");
                }}
                onBlur={checkEmail}
                placeholder="you@company.com"
                aria-invalid={!!emailError}
                required
              />
            </FilingRow>
            <FilingRow label="Phone" htmlFor="phone">
              <input
                id="phone"
                type="tel"
                className="lf-auth-input"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="+880…"
                required
              />
            </FilingRow>

            <FilingSection num="§ II" title="Company" />
            <FilingRow label="Company Name" htmlFor="company">
              <input
                id="company"
                className="lf-auth-input"
                value={form.companyName}
                onChange={(e) => updateField("companyName", e.target.value)}
                placeholder="Company Ltd."
                required
              />
            </FilingRow>
            <FilingRow label="Designation" htmlFor="designation">
              <input
                id="designation"
                className="lf-auth-input"
                value={form.designation}
                onChange={(e) => updateField("designation", e.target.value)}
                placeholder="HR Manager"
                required
              />
            </FilingRow>
            <FilingRow label="Organization Type" htmlFor="orgType">
              <select
                id="orgType"
                className="lf-auth-select"
                value={form.orgType}
                onChange={(e) => updateField("orgType", e.target.value)}
                required
              >
                <option value="">Select type…</option>
                {ORG_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </FilingRow>
            <FilingRow label="Industry" htmlFor="industry">
              <select
                id="industry"
                className="lf-auth-select"
                value={form.industry}
                onChange={(e) => updateField("industry", e.target.value)}
                required
              >
                <option value="">Select industry…</option>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </FilingRow>
            <FilingRow label="Headcount" htmlFor="employees">
              <select
                id="employees"
                className="lf-auth-select"
                value={form.employeeCount}
                onChange={(e) => updateField("employeeCount", e.target.value)}
                required
              >
                <option value="">Select range…</option>
                {EMPLOYEE_RANGES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </FilingRow>

            <FilingSection num="§ III" title="Domicile" />
            <FilingRow label="City" htmlFor="city">
              <input
                id="city"
                className="lf-auth-input"
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
                placeholder="Dhaka"
                required
              />
            </FilingRow>
            <FilingRow label="Country" htmlFor="country">
              <input
                id="country"
                className="lf-auth-input"
                value={form.country}
                onChange={(e) => updateField("country", e.target.value)}
                placeholder="Bangladesh"
                required
              />
            </FilingRow>

            <FilingSection num="§ IV" title="Credentials" />
            <FilingRow label="Password" htmlFor="password">
              <div className="lf-auth-input-pwd">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="lf-auth-input"
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="lf-auth-input-pwd-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </FilingRow>
            <FilingRow label="Confirm" htmlFor="confirmPassword">
              <div className="lf-auth-input-pwd">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  className="lf-auth-input"
                  value={form.confirmPassword}
                  onChange={(e) => updateField("confirmPassword", e.target.value)}
                  placeholder="Re-enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((s) => !s)}
                  className="lf-auth-input-pwd-toggle"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </FilingRow>

            {error && (
              <p className="lf-auth-field-error" style={{ marginTop: 24 }}>{error}</p>
            )}

            <div style={{ marginTop: 32, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
              <button
                type="submit"
                disabled={loading}
                className="lf-auth-cta lf-auth-cta--primary"
              >
                {loading ? "Submitting…" : "Continue →"}
              </button>
              <span className="lf-auth-foot-stamp" style={{ marginTop: 0 }}>
                All fields required
              </span>
            </div>

            <p style={{ marginTop: 24, fontSize: 13, color: "var(--ink-2)" }}>
              Already have an account?{" "}
              <Link href="/sign-in" className="lf-auth-link">Sign in</Link>.
            </p>
          </div>

          <aside>
            <div className="lf-auth-ledger">
              <p className="lf-auth-kicker" style={{ marginBottom: 4 }}>
                <span className="lf-auth-kicker-mark">§</span> Progress
              </p>
              <p style={{ marginBottom: 16, fontSize: 12, lineHeight: 1.5, color: "var(--ink-2)" }}>
                Each section ticks off as you fill it in.
              </p>
              {chapters.map((c) => (
                <div
                  key={c.label}
                  className="lf-auth-ledger-row"
                  data-done={c.done ? "true" : "false"}
                >
                  <span className="lf-auth-ledger-circle">
                    {c.done && <Check size={10} />}
                  </span>
                  <span>{c.label}</span>
                </div>
              ))}

              <div className="lf-auth-ledger-foot">
                <p className="lf-auth-ledger-foot-label">Reference</p>
                <p className="lf-auth-ledger-foot-value" suppressHydrationWarning>
                  {dossier.replace("DOSSIER № ", "")}
                </p>
              </div>
            </div>
          </aside>
        </form>
      </div>
    </motion.main>
  );
}

function FilingSection({ num, title }: { num: string; title: string }) {
  return (
    <div className="lf-auth-filing-section">
      <span className="lf-auth-filing-num">{num}</span>
      <span className="lf-auth-filing-title">{title}</span>
    </div>
  );
}

function FilingRow({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="lf-auth-filing-row">
      <label htmlFor={htmlFor} className="lf-auth-field-label">
        {label}
      </label>
      <div className="lf-auth-field">
        {children}
        {error && <p className="lf-auth-field-error">{error}</p>}
      </div>
    </div>
  );
}

function OrgVerifyState({
  pendingEmail,
  verificationCode,
  setVerificationCode,
  loading,
  error,
  onVerify,
  onBackToForm,
}: {
  pendingEmail: string;
  verificationCode: string;
  setVerificationCode: (s: string) => void;
  loading: boolean;
  error: string;
  onVerify: (e: React.FormEvent) => void;
  onBackToForm: () => void;
}) {
  return (
    <motion.main
      className="lf-auth-shell lf-auth-shell--centered"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.32, ease: EASE_OUT }}
    >
      <motion.div
        className="lf-auth-paper-inner lf-auth-paper-inner--lg"
        style={{ textAlign: "center" }}
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <motion.div style={{ display: "flex", justifyContent: "center" }} variants={fadeUp}>
          <Link
            href="/"
            className="lf-auth-medallion lf-auth-medallion--lg"
            aria-label="Back to home"
            style={{ borderColor: "var(--accent-blue)", color: "var(--accent-blue)" }}
          >
            LLP
          </Link>
        </motion.div>

        <motion.span
          className="lf-auth-kicker"
          style={{ marginTop: 32, justifyContent: "center" }}
          variants={fadeUp}
        >
          <span className="lf-auth-kicker-mark">§ 1.2</span>
          Email Verification
        </motion.span>
        <motion.h2 className="lf-auth-h2" style={{ marginTop: 16 }} variants={fadeUp}>
          Check your email.
        </motion.h2>
        <motion.p
          className="lf-auth-deck"
          style={{ marginLeft: "auto", marginRight: "auto" }}
          variants={fadeUp}
        >
          We sent a six-digit code to{" "}
          <strong style={{ color: "var(--ink)" }}>{pendingEmail}</strong>. It expires in ten minutes.
        </motion.p>

        <motion.div
          style={{ margin: "40px 0", display: "flex", justifyContent: "center" }}
          variants={fadeUp}
        >
          <span className="lf-auth-ribbon">
            <span className="lf-auth-ribbon-dot" />
            Awaiting code
          </span>
        </motion.div>

        <motion.form
          onSubmit={onVerify}
          style={{ display: "flex", flexDirection: "column", gap: 32 }}
          variants={fadeUp}
        >
          <CodeBoxes value={verificationCode} onChange={setVerificationCode} />

          {error && (
            <p className="lf-auth-field-error" style={{ textAlign: "center" }}>
              {error}
            </p>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16 }}>
            <button
              type="submit"
              disabled={loading || verificationCode.length < 6}
              className="lf-auth-cta lf-auth-cta--primary"
            >
              {loading ? "Verifying…" : "Verify →"}
            </button>
            <button
              type="button"
              onClick={onBackToForm}
              className="lf-auth-cta lf-auth-cta--ghost"
            >
              <ArrowLeft className="size-3.5" />
              Edit details
            </button>
          </div>
        </motion.form>

        <motion.p className="lf-auth-foot-stamp" variants={fadeUp}>
          Code valid for 10 minutes
        </motion.p>
      </motion.div>
    </motion.main>
  );
}

function CodeBoxes({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const slots = [0, 1, 2, 3, 4, 5];

  const setAt = (i: number, ch: string) => {
    const arr = value.padEnd(6, " ").split("");
    arr[i] = ch.replace(/\D/g, "").slice(-1) || "";
    onChange(arr.join("").trimEnd());
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted) {
      e.preventDefault();
      onChange(pasted);
    }
  };

  return (
    <div className="lf-auth-code-row" onPaste={onPaste}>
      {slots.map((i) => (
        <input
          key={i}
          className="lf-auth-code-slot"
          value={value[i] ?? ""}
          placeholder=" "
          onChange={(e) => {
            setAt(i, e.target.value);
            const next = e.currentTarget.parentElement?.children[i + 1];
            if (e.target.value && next instanceof HTMLInputElement) {
              next.focus();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !value[i] && i > 0) {
              const prev = e.currentTarget.parentElement?.children[i - 1];
              if (prev instanceof HTMLInputElement) prev.focus();
            }
          }}
          maxLength={1}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}
