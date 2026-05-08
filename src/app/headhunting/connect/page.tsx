"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  ArrowLeft,
  CheckCircle2,
  Handshake,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import { fireNotification } from "@/lib/notify";

export default function ConnectForHiringPage() {
  const { user } = useUser();
  const orgData = useQuery(
    api.organizations.getByCreator,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const submitLead = useMutation(api.headhunting.clientLeads.submit);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  const [form, setForm] = useState({
    contactName: "",
    email: "",
    phone: "",
    companyName: "",
    roleTitle: "",
    briefDescription: "",
    urgency: "standard" as "standard" | "urgent" | "critical",
  });

  // Autofill from Clerk user + org data
  useEffect(() => {
    if (prefilled) return;
    if (!user) return;
    if (orgData === undefined) return;

    setForm((f) => ({
      ...f,
      contactName: f.contactName || orgData?.primaryContactName || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      email: f.email || orgData?.primaryContactEmail || user.emailAddresses?.[0]?.emailAddress || "",
      phone: f.phone || orgData?.primaryContactPhone || "",
      companyName: f.companyName || orgData?.name || (user.publicMetadata as { orgName?: string })?.orgName || "",
    }));
    setPrefilled(true);
  }, [user, orgData, prefilled]);

  const u = (field: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    setTriedSubmit(true);
    const missing: string[] = [];
    if (!form.contactName.trim()) missing.push("Your Name");
    if (!form.email.trim()) missing.push("Email");
    if (!form.companyName.trim()) missing.push("Company Name");
    if (!form.roleTitle.trim()) missing.push("Role You're Hiring For");
    if (missing.length > 0) {
      toast.error(`Please fill in: ${missing.join(", ")}`);
      return;
    }

    setSubmitting(true);
    try {
      await submitLead({
        contactName: form.contactName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        companyName: form.companyName.trim(),
        roleTitle: form.roleTitle.trim(),
        briefDescription: form.briefDescription.trim() || undefined,
        urgency: form.urgency,
      });

      fireNotification("mandate_created", {
        mandateTitle: form.roleTitle.trim(),
        clientName: form.companyName.trim(),
        source: "lead_capture",
        urgency: form.urgency,
        mandateType: "non_exclusive",
      });

      setSubmitted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <SiteTopNav />
        <div className="mx-auto max-w-lg px-4 py-24 text-center space-y-4">
          <CheckCircle2 className="size-12 mx-auto text-green-600" />
          <h1 className="text-xl font-bold">Request Received</h1>
          <p className="text-sm text-muted-foreground">
            Thank you for reaching out. An LLP consultant will contact you within 1 business day to discuss your hiring needs in detail.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link href="/headhunting">
              <Button variant="outline">Back to Headhunting</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Create Account</Button>
            </Link>
          </div>
        </div>
        <HomepageFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteTopNav />

      <div className="mx-auto max-w-lg space-y-6 px-4 py-12">
        <Link
          href="/headhunting"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Headhunting
        </Link>

        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium">
            <Handshake className="size-3.5 text-primary" />
            Connect for Hiring Support
          </div>
          <h1 className="text-xl font-bold">Tell us what you need</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Share the basics and an LLP consultant will reach out to understand your full requirements before sourcing begins.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Your Name *</Label>
              <Input
                value={form.contactName}
                onChange={(e) => u("contactName", e.target.value)}
                placeholder="Full name"
                className={cn("text-sm", triedSubmit && !form.contactName.trim() && "border-red-500 ring-1 ring-red-500")}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email *</Label>
              <Input
                value={form.email}
                onChange={(e) => u("email", e.target.value)}
                type="email"
                placeholder="work@company.com"
                className={cn("text-sm", triedSubmit && !form.email.trim() && "border-red-500 ring-1 ring-red-500")}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone / WhatsApp</Label>
              <Input
                value={form.phone}
                onChange={(e) => u("phone", e.target.value)}
                placeholder="+880..."
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Company Name *</Label>
              <Input
                value={form.companyName}
                onChange={(e) => u("companyName", e.target.value)}
                placeholder="Your organisation"
                className={cn("text-sm", triedSubmit && !form.companyName.trim() && "border-red-500 ring-1 ring-red-500")}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Role You're Hiring For *</Label>
              <Input
                value={form.roleTitle}
                onChange={(e) => u("roleTitle", e.target.value)}
                placeholder="e.g. Head of Finance, Senior Developer, Factory Manager"
                className={cn("text-sm", triedSubmit && !form.roleTitle.trim() && "border-red-500 ring-1 ring-red-500")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Brief Description</Label>
            <Textarea
              value={form.briefDescription}
              onChange={(e) => u("briefDescription", e.target.value)}
              placeholder="Any context that would help us understand the role — industry, location, seniority, timeline..."
              rows={3}
              className="text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">How urgent is this?</Label>
            <Select value={form.urgency} onValueChange={(v) => u("urgency", v)}>
              <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard" className="text-sm">Standard — within weeks</SelectItem>
                <SelectItem value="urgent" className="text-sm">Urgent — within days</SelectItem>
                <SelectItem value="critical" className="text-sm">Critical — immediate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full gap-1.5">
            <Send className="size-3.5" />
            {submitting ? "Submitting..." : "Connect with LLP"}
          </Button>
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
          <p className="font-medium mb-1">What happens next?</p>
          <ul className="text-muted-foreground space-y-1 text-xs">
            <li className="flex items-start gap-1.5"><CheckCircle2 className="size-3.5 mt-0.5 text-primary shrink-0" /> An LLP consultant contacts you within 1 business day</li>
            <li className="flex items-start gap-1.5"><CheckCircle2 className="size-3.5 mt-0.5 text-primary shrink-0" /> We conduct a hiring diagnostic to understand the full requirement</li>
            <li className="flex items-start gap-1.5"><CheckCircle2 className="size-3.5 mt-0.5 text-primary shrink-0" /> Once aligned, sourcing begins through the LLP scout network</li>
          </ul>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-primary hover:underline">Sign in</Link>
          {" "}to manage your mandates.
        </p>
      </div>

      <HomepageFooter />
    </div>
  );
}
