"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Clock,
  Loader2,
} from "lucide-react";

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const verification = useQuery(
    api.headhunting.verification.getByToken,
    token ? { token } : "skip"
  );

  const verifyMutation = useMutation(api.headhunting.verification.verify);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleVerify = async () => {
    if (!token) return;
    setVerifying(true);
    try {
      await verifyMutation({ token });
      setVerified(true);
    } catch {
      // error handled by state
    } finally {
      setVerifying(false);
    }
  };

  // No token provided
  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-6 space-y-3">
          <AlertCircle className="size-10 mx-auto text-red-500" />
          <h1 className="text-lg font-bold text-red-700 dark:text-red-400">
            Invalid Verification Link
          </h1>
          <p className="text-sm text-red-600/80 dark:text-red-400/80">
            No verification token was provided. Please use the link from your
            email.
          </p>
        </div>
        <Link href="/headhunting">
          <Button variant="outline" size="sm">Back to Headhunting</Button>
        </Link>
      </div>
    );
  }

  // Loading
  if (verification === undefined) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center space-y-4">
        <Loader2 className="size-8 mx-auto animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Verifying your link...</p>
      </div>
    );
  }

  // Invalid token — no record found
  if (verification === null) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-6 space-y-3">
          <AlertCircle className="size-10 mx-auto text-red-500" />
          <h1 className="text-lg font-bold text-red-700 dark:text-red-400">
            Invalid Verification Link
          </h1>
          <p className="text-sm text-red-600/80 dark:text-red-400/80">
            This verification link is not recognized. Please check your email
            for the correct link.
          </p>
        </div>
        <Link href="/headhunting">
          <Button variant="outline" size="sm">Back to Headhunting</Button>
        </Link>
      </div>
    );
  }

  // Expired
  if (verification.isExpired) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-6 space-y-3">
          <Clock className="size-10 mx-auto text-amber-500" />
          <h1 className="text-lg font-bold text-amber-700 dark:text-amber-400">
            Verification Link Expired
          </h1>
          <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
            This verification link has expired. Please contact your recruiter to
            receive a new verification link.
          </p>
        </div>
        <Link href="/headhunting">
          <Button variant="outline" size="sm">Back to Headhunting</Button>
        </Link>
      </div>
    );
  }

  // Already verified
  if (verification.isVerified || verified) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center space-y-4">
        <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 p-6 space-y-3">
          <CheckCircle2 className="size-10 mx-auto text-green-600" />
          <h1 className="text-lg font-bold text-green-700 dark:text-green-400">
            {verified ? "Identity Verified" : "Already Verified"}
          </h1>
          <p className="text-sm text-green-600/80 dark:text-green-400/80">
            {verified
              ? "Your identity has been successfully verified. Thank you!"
              : "Your identity has already been verified. No further action is needed."}
          </p>
          {verification.submission?.candidateName && (
            <p className="text-xs text-muted-foreground mt-2">
              Verified as: <span className="font-medium">{verification.submission?.candidateName}</span>
            </p>
          )}
        </div>
        <Link href="/headhunting">
          <Button variant="outline" size="sm">Back to Headhunting</Button>
        </Link>
      </div>
    );
  }

  // Valid + not expired + not verified — show verify button
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center space-y-4">
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <ShieldCheck className="size-10 mx-auto text-primary" />
        <h1 className="text-lg font-bold">Verify Your Identity</h1>

        {verification.submission?.candidateName && (
          <p className="text-sm text-muted-foreground">
            Hello, <span className="font-medium text-foreground">{verification.submission?.candidateName}</span>
          </p>
        )}

        {verification.mandateTitle && (
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Application for:</p>
            <p className="text-sm font-medium">{verification.mandateTitle}</p>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Click the button below to confirm your identity and proceed with your
          application.
        </p>

        <Button
          onClick={handleVerify}
          disabled={verifying}
          className="w-full gap-1.5"
        >
          <ShieldCheck className="size-4" />
          {verifying ? "Verifying..." : "Verify My Identity"}
        </Button>
      </div>
    </div>
  );
}

export default function VerifyPage() {
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
        <VerifyContent />
      </Suspense>
      <HomepageFooter />
    </div>
  );
}
