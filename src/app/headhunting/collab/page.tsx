"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Globe,
  Handshake,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import { cn } from "@/lib/utils";

const VALUE_CARDS = [
  {
    icon: Users,
    title: "Scout Network Access",
    desc: "Tap into LLP's growing scout and partner network across relevant markets, without having to build every corridor from scratch.",
  },
  {
    icon: TrendingUp,
    title: "Structured Commercial Terms",
    desc: "Partnerships operate through a defined commercial framework so delivery expectations and revenue-sharing logic are aligned from the start.",
  },
  {
    icon: Shield,
    title: "Compliance & Delivery Support",
    desc: "LLP supports structured screening, labour law awareness, and coordinated shortlist handling through a shared operational model.",
  },
  {
    icon: Globe,
    title: "Cross-market Reach",
    desc: "Extend your sourcing reach through a more connected collaboration model across relevant markets as the network continues to grow.",
  },
];

export default function CollabPage() {
  const { user } = useUser();
  const orgData = useQuery(
    api.organizations.getByCreator,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    role: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    firmType: "",
    note: "",
  });

  // Autofill from Clerk user + org data (wait for org query to settle)
  useEffect(() => {
    if (prefilled) return;
    if (!user) return;
    // Wait for org query to finish loading (undefined = loading, null = no org)
    if (orgData === undefined) return;

    setForm((f) => ({
      ...f,
      companyName: f.companyName || orgData?.name || (user.publicMetadata as { orgName?: string })?.orgName || "",
      contactName: f.contactName || orgData?.primaryContactName || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      role: f.role || orgData?.primaryContactDesignation || "",
      contactEmail: f.contactEmail || orgData?.primaryContactEmail || user.emailAddresses?.[0]?.emailAddress || "",
      contactPhone: f.contactPhone || orgData?.primaryContactPhone || "",
      website: f.website || orgData?.website || "",
    }));
    setPrefilled(true);
  }, [user, orgData, prefilled]);

  const createPartner = useMutation(api.headhunting.collab.createPartner);

  const u = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    setTriedSubmit(true);
    const missing: string[] = [];
    if (!form.companyName.trim()) missing.push("Company / Firm Name");
    if (!form.contactName.trim()) missing.push("Contact Person");
    if (!form.role.trim()) missing.push("Your Role / Designation");
    if (!form.contactEmail.trim()) missing.push("Email");
    if (missing.length > 0) {
      toast.error(`Please fill in: ${missing.join(", ")}`);
      return;
    }
    setSubmitting(true);
    try {
      await createPartner({
        companyName: form.companyName.trim(),
        contactName: form.contactName.trim(),
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.trim() || undefined,
        website: form.website.trim() || undefined,
        notes: [
          form.role.trim() ? `Role: ${form.role.trim()}` : "",
          form.firmType.trim() ? `Firm Type: ${form.firmType.trim()}` : "",
          form.note.trim() || "",
        ].filter(Boolean).join("\n") || undefined,
      });
      setSubmitted(true);
      toast.success("Partnership inquiry submitted!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <SiteTopNav />
        <div className="mx-auto max-w-lg px-4 py-24 text-center space-y-4">
          <CheckCircle2 className="size-14 mx-auto text-green-600" />
          <h1 className="text-xl font-bold">Partnership Inquiry Received</h1>
          <p className="text-sm text-muted-foreground">
            Thank you for your interest. Our partnerships team will review your details and reach out to discuss how we can work together.
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            Expect a response within 2–3 business days.
          </p>
          <Link href="/headhunting">
            <Button variant="outline" className="mt-4">Back to Headhunting</Button>
          </Link>
        </div>
        <HomepageFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteTopNav />

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 pt-20 pb-12 lg:px-6 sm:pt-28 sm:pb-16">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium">
            <Handshake className="size-3.5 text-primary" />
            B2B Partnership
          </div>

          <h1 className="mt-5 font-serif text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl leading-[1.15]">
            Collaborate with LLP on shared mandates
          </h1>

          <p className="mt-3 mx-auto max-w-xl text-muted-foreground text-[15px] leading-relaxed">
            For recruitment firms, search agencies, staffing businesses, and HR consultancies looking to extend sourcing reach through LLP&apos;s structured scout-led infrastructure.
          </p>
        </div>
      </section>

      {/* ── Eligibility + Form ───────────────────────────────── */}
      <section className="mx-auto max-w-2xl px-4 pb-20 lg:px-6">
        {/* Eligibility note */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 p-5 mb-8">
          <div className="flex items-start gap-3">
            <Building2 className="size-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">For Firms Only</h3>
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                This collaboration route is intended for registered recruitment firms, search firms, staffing businesses, and HR consultancies. Individual professionals with access to talent networks should join through the{" "}
                <Link href="/headhunting/scout/join" className="underline underline-offset-2 font-medium hover:text-amber-900 dark:hover:text-amber-200">
                  Scout Network
                </Link>{" "}
                instead.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div>
            <h3 className="text-base font-semibold">Express Partnership Interest</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Share your firm&apos;s details and LLP will review the enquiry and connect if the collaboration path looks relevant.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Company / Firm Name *</Label>
              <Input
                value={form.companyName}
                onChange={(e) => u("companyName", e.target.value)}
                placeholder="Your organisation name"
                className={cn("text-sm", triedSubmit && !form.companyName.trim() && "border-red-500 ring-1 ring-red-500")}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Contact Person *</Label>
              <Input
                value={form.contactName}
                onChange={(e) => u("contactName", e.target.value)}
                placeholder="Full name"
                className={cn("text-sm", triedSubmit && !form.contactName.trim() && "border-red-500 ring-1 ring-red-500")}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Your Role / Designation *</Label>
              <Input
                value={form.role}
                onChange={(e) => u("role", e.target.value)}
                placeholder="e.g. Managing Director, Head of Partnerships"
                className={cn("text-sm", triedSubmit && !form.role.trim() && "border-red-500 ring-1 ring-red-500")}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email *</Label>
              <Input
                value={form.contactEmail}
                onChange={(e) => u("contactEmail", e.target.value)}
                type="email"
                placeholder="business@company.com"
                className={cn("text-sm", triedSubmit && !form.contactEmail.trim() && "border-red-500 ring-1 ring-red-500")}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input
                value={form.contactPhone}
                onChange={(e) => u("contactPhone", e.target.value)}
                placeholder="+880..."
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Website</Label>
              <Input
                value={form.website}
                onChange={(e) => u("website", e.target.value)}
                placeholder="https://..."
                className="text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Type of Firm</Label>
            <select
              value={form.firmType}
              onChange={(e) => u("firmType", e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Select firm type</option>
              <option value="Recruitment Firm">Recruitment Firm</option>
              <option value="Search Firm">Search Firm</option>
              <option value="Staffing Business">Staffing Business</option>
              <option value="HR Consultancy">HR Consultancy</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Tell us about your firm and the collaboration you have in mind</Label>
            <Textarea
              value={form.note}
              onChange={(e) => u("note", e.target.value)}
              placeholder="Your firm's focus areas, geographies, and what kind of collaboration you're looking for..."
              className="text-sm min-h-[100px]"
            />
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full sm:w-auto rounded-full gap-1.5">
            {submitting ? "Submitting..." : "Submit Partnership Interest"}
            <ArrowRight className="size-4" />
          </Button>

          <p className="text-[11px] text-muted-foreground">
            LLP will review the enquiry, assess fit, and reach out to discuss next steps if the collaboration path looks relevant.
          </p>
        </div>
      </section>

      {/* ── Value Cards ──────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 pb-20 lg:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VALUE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="rounded-xl border border-border bg-card p-5 space-y-2.5">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <h3 className="text-sm font-semibold">{card.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <HomepageFooter />
    </div>
  );
}
