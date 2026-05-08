"use client";

/**
 * In-flow Organization Account creation step for /headhunting/client/hire/new.
 *
 * Renders for guests who land on the headhunting hire form without an account.
 * Captures the minimum needed to create a Clerk org account (representative
 * name, company email, company name, password) and proceeds to email
 * verification. After verification, calls /api/auth/finalize-org which creates
 * the Convex `organizations` row and promotes publicMetadata.accountType to
 * "organization". Once that returns, the parent page's `useUser()` will see
 * the new session and the existing hiring wizard takes over from Step 0
 * (Company Profile), pre-filled with the company name captured here.
 *
 * Personal email providers (Gmail/Yahoo/Outlook/etc.) are blocked at the
 * input level — see src/lib/personal-email.ts.
 *
 * Tracking flow (orderNumber, /track) is unchanged — this component only
 * handles the account-creation step.
 */

import { useState, useCallback } from "react";
import { useSignUp, useUser } from "@clerk/nextjs";
import { Building2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/ui/logo";
import { isPersonalEmail, PERSONAL_EMAIL_WARNING } from "@/lib/personal-email";
import { track } from "@/lib/posthog/events";

type Phase = "form" | "verify";

interface FormState {
  representativeName: string;
  companyName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const initialForm: FormState = {
  representativeName: "",
  companyName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export function HeadhuntingHireSignupGate() {
  const { signUp, setActive, isLoaded: signUpLoaded } = useSignUp();
  const { user } = useUser();

  const [phase, setPhase] = useState<Phase>("form");
  const [form, setForm] = useState<FormState>(initialForm);
  const [emailError, setEmailError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  const updateField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const validateEmail = useCallback(() => {
    if (!form.email) return;
    if (isPersonalEmail(form.email)) {
      setEmailError(PERSONAL_EMAIL_WARNING);
    } else {
      setEmailError("");
    }
  }, [form.email]);

  const validate = (): string | null => {
    if (!form.representativeName.trim()) return "Representative name is required.";
    if (!form.companyName.trim()) return "Company name is required.";
    if (!form.email.trim()) return "Company email is required.";
    if (isPersonalEmail(form.email)) return PERSONAL_EMAIL_WARNING;
    if (form.password.length < 8) return "Password must be at least 8 characters.";
    if (form.password !== form.confirmPassword) return "Passwords do not match.";
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

      // Stamp the org marker into unsafeMetadata so /api/auth/finalize-org
      // can heal even if Phase B fails on this tab. We pass companyName so
      // the Convex organizations row gets a real name on creation.
      const result = await signUp.create({
        emailAddress: form.email,
        password: form.password,
        firstName,
        lastName,
        unsafeMetadata: {
          accountType: "organization",
          pendingOrg: {
            companyName: form.companyName,
          },
        },
      });

      // PostHog: hire-side employer lead. position=organization is a
      // sentinel because this gate is the company-account form — there
      // is no per-role field at this step. Real position labels land
      // later in the wizard's mandate intake.
      void track("headhunting_lead_submitted", {
        cta: "employer",
        position: "organization",
      });

      if (result.status === "complete" && result.createdSessionId) {
        // No verification needed (rare — depends on Clerk instance settings).
        await setActive({ session: result.createdSessionId });
        await fetch("/api/auth/finalize-org", { method: "POST" }).catch(() => {});
        await user?.reload?.();
        // Page will re-render with user populated and the wizard takes over.
      } else {
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        setPhase("verify");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { errors?: { longMessage?: string }[] })?.errors?.[0]?.longMessage ||
            "Something went wrong. Please try again.";
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

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        // Create the Convex organizations row + promote accountType to
        // publicMetadata in one server-side step. account-context will
        // also self-heal on next sign-in if this fails.
        await fetch("/api/auth/finalize-org", { method: "POST" }).catch(() => {});
        await user?.reload?.();
        // Parent page re-renders with the wizard.
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { errors?: { longMessage?: string }[] })?.errors?.[0]?.longMessage ||
            "Invalid verification code.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!signUpLoaded) {
    return (
      <div className="mx-auto max-w-md py-12 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (phase === "verify") {
    return (
      <div className="mx-auto max-w-md py-12 px-4 space-y-6">
        <div className="text-center space-y-2">
          <Logo className="size-10 mx-auto" />
          <h1 className="text-2xl font-bold font-serif">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            We sent a verification code to <strong>{form.email}</strong>
          </p>
        </div>
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Enter code"
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Verifying…" : "Verify Email & Continue"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl py-10 px-4 space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-2">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="size-6 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-bold font-serif">Create your organization account</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          LLP Headhunting requests are available to organization users only.
          Create your account to continue with your hiring request.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-border bg-card p-6 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="repName">Your Name *</Label>
            <Input
              id="repName"
              value={form.representativeName}
              onChange={(e) => updateField("representativeName", e.target.value)}
              placeholder="Full name"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="companyName">Company Name *</Label>
            <Input
              id="companyName"
              value={form.companyName}
              onChange={(e) => updateField("companyName", e.target.value)}
              placeholder="Company Ltd."
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Company Email *</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => {
              updateField("email", e.target.value);
              if (emailError) setEmailError("");
            }}
            onBlur={validateEmail}
            placeholder="you@company.com"
            required
          />
          {emailError && <p className="text-xs text-destructive">{emailError}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">Password *</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                placeholder="Min. 8 characters"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm Password *</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                placeholder="Re-enter password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? "Creating account…" : "Create Account & Continue"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Already have an organization account?{" "}
          <a
            href="/sign-in?redirect_url=%2Fheadhunting%2Fclient%2Fhire%2Fnew"
            className="text-primary hover:underline"
          >
            Sign in
          </a>
        </p>
      </form>
    </div>
  );
}
