"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Building2, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

/**
 * Client Account Settings Page (Client Workspace v3.1)
 *
 * Route: /headhunting/client/account
 * Client edits company profile: industry, size, website, billing, etc.
 */
export default function ClientAccountPage() {
  const { user } = useUser();
  const myClient = useQuery(
    api.headhunting.clients.getByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );
  const updateClient = useMutation(api.headhunting.clients.update);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [sector, setSector] = useState("");
  const [website, setWebsite] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [description, setDescription] = useState("");
  const [hiringVolume, setHiringVolume] = useState("");
  const [billingEntity, setBillingEntity] = useState("");
  const [billingEmail, setBillingEmail] = useState("");

  // Populate form when data loads
  useEffect(() => {
    if (myClient && myClient._id) {
      const c = myClient as Record<string, unknown>;
      setCompanyName((c.companyName as string) || "");
      setIndustry((c.industry as string) || "");
      setSector((c.sector as string) || "");
      setWebsite((c.website as string) || "");
      setLinkedinUrl((c.linkedinUrl as string) || "");
      setCompanySize((c.companySize as string) || "");
      setDescription((c.description as string) || "");
      setHiringVolume((c.hiringVolume as string) || "");
      setBillingEntity((c.billingEntity as string) || "");
      setBillingEmail((c.billingEmail as string) || "");
    }
  }, [myClient]);

  const handleSave = async () => {
    if (!myClient?._id) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateClient({
        id: myClient._id,
        companyName: companyName || undefined,
        industry: industry || undefined,
        sector: sector || undefined,
        website: website || undefined,
        linkedinUrl: linkedinUrl || undefined,
        companySize: companySize || undefined,
        description: description || undefined,
        hiringVolume: hiringVolume || undefined,
        billingEntity: billingEntity || undefined,
        billingEmail: billingEmail || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to update client:", err);
    } finally {
      setSaving(false);
    }
  };

  if (myClient === undefined) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (myClient === null) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center py-16">
        <Building2 className="size-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Your account is not linked to a company profile yet. Please contact LLP admin.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/mandates" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="size-3.5" /> Back to Mandates
          </Link>
          <h1 className="text-xl font-bold">Company Profile</h1>
          <p className="text-sm text-muted-foreground">Manage your company details and billing information</p>
        </div>
        <Badge variant="outline" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          Active
        </Badge>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-5">
        {/* Company Info */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Company Name</label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Industry</label>
            <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Manufacturing, IT, Garments" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Sector</label>
            <Input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="e.g. Private, MNC, Startup" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Company Size</label>
            <Select value={companySize} onValueChange={setCompanySize}>
              <SelectTrigger>
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1-10">1-10 employees</SelectItem>
                <SelectItem value="11-50">11-50 employees</SelectItem>
                <SelectItem value="51-200">51-200 employees</SelectItem>
                <SelectItem value="201-500">201-500 employees</SelectItem>
                <SelectItem value="500+">500+ employees</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Company Description</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Brief description of your company..." />
        </div>

        {/* Online Presence */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Website</label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">LinkedIn URL</label>
            <Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/company/..." />
          </div>
        </div>

        {/* Hiring */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Hiring Volume (annual)</label>
          <Select value={hiringVolume} onValueChange={setHiringVolume}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select volume" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1-5">1-5 hires/year</SelectItem>
              <SelectItem value="6-20">6-20 hires/year</SelectItem>
              <SelectItem value="21-50">21-50 hires/year</SelectItem>
              <SelectItem value="50+">50+ hires/year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Billing */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium mb-3">Billing Information</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Billing Entity Name</label>
              <Input value={billingEntity} onChange={(e) => setBillingEntity(e.target.value)} placeholder="Legal entity name for invoicing" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Billing Email</label>
              <Input value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} placeholder="accounts@company.com" />
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
            Save Changes
          </Button>
          {saved && <span className="text-sm text-green-600">Saved successfully</span>}
        </div>
      </div>
    </div>
  );
}
