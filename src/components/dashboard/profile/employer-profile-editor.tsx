"use client";

import { useState, useRef, type ChangeEvent } from "react";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
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
import {
  Building2,
  Upload,
  Globe,
  MapPin,
  Users,
  Briefcase,
  CreditCard,
  Shield,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { toast } from "sonner";

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];
const HIRING_VOLUMES = ["1-5 per year", "6-20 per year", "21-50 per year", "50+ per year"];

interface EmployerProfileEditorProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contact: any;
}

export function EmployerProfileEditor({ client, contact }: EmployerProfileEditorProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { t } = useLanguage();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user } = useUser();
  const updateClient = useMutation(api.headhunting.clients.update);
  const updateContact = useMutation(api.headhunting.clients.updateContact);
  const generateUploadUrl = useMutation(api.headhunting.clients.generateUploadUrl);

  const logoUrl = useQuery(
    api.headhunting.clients.getLogoUrl,
    client.logoId ? { logoId: client.logoId as Id<"_storage"> } : "skip"
  );

  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    // Company
    companyName: client.companyName ?? "",
    industry: client.industry ?? "",
    sector: client.sector ?? "",
    website: client.website ?? "",
    linkedinUrl: client.linkedinUrl ?? "",
    companySize: client.companySize ?? "",
    description: client.description ?? "",
    officeLocations: (client.officeLocations ?? []).join(", "),
    hiringVolume: client.hiringVolume ?? "",
    typicalFunctions: (client.typicalFunctions ?? []).join(", "),
    // Billing
    billingEntity: client.billingEntity ?? "",
    billingEmail: client.billingEmail ?? "",
    // Preferences
    defaultConfidentiality: client.defaultConfidentiality ?? "full_mask",
    defaultUrgency: client.defaultUrgency ?? "standard",
    // Contact
    contactName: contact?.name ?? "",
    contactEmail: contact?.email ?? "",
    contactPhone: contact?.phone ?? "",
    contactDesignation: contact?.designation ?? "",
  });

  const u = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const commaToArray = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB");
      return;
    }

    setLogoPreview(URL.createObjectURL(file));

    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      await updateClient({
        id: client._id as Id<"htClients">,
        logoId: storageId as Id<"_storage">,
      });
      toast.success("Logo uploaded");
    } catch {
      toast.error("Failed to upload logo");
      setLogoPreview(null);
    }
  };

  const handleSave = async () => {
    if (!form.companyName.trim()) return;
    setSaving(true);
    try {
      // Update client
      await updateClient({
        id: client._id as Id<"htClients">,
        companyName: form.companyName,
        industry: form.industry || undefined,
        sector: form.sector || undefined,
        website: form.website || undefined,
        linkedinUrl: form.linkedinUrl || undefined,
        companySize: form.companySize || undefined,
        description: form.description || undefined,
        officeLocations: commaToArray(form.officeLocations).length > 0 ? commaToArray(form.officeLocations) : undefined,
        hiringVolume: form.hiringVolume || undefined,
        typicalFunctions: commaToArray(form.typicalFunctions).length > 0 ? commaToArray(form.typicalFunctions) : undefined,
        billingEntity: form.billingEntity || undefined,
        billingEmail: form.billingEmail || undefined,
        defaultConfidentiality: form.defaultConfidentiality as "full_mask" | "partial_clue" | "disclosed",
        defaultUrgency: form.defaultUrgency as "standard" | "urgent" | "critical" | undefined,
      });

      // Update contact
      if (contact?._id) {
        await updateContact({
          contactId: contact._id as Id<"htClientContacts">,
          name: form.contactName || undefined,
          email: form.contactEmail || undefined,
          phone: form.contactPhone || undefined,
          designation: form.contactDesignation || undefined,
        });
      }

      toast.success("Profile saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const displayLogo = logoPreview || logoUrl;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
      {/* Header */}
      <div
        className="lf-card lf-card--feature"
        style={{
          padding: "var(--s-4)",
          display: "flex",
          alignItems: "center",
          gap: "var(--s-3)",
        }}
      >
        <div
          onClick={() => logoInputRef.current?.click()}
          style={{
            position: "relative",
            width: 80,
            height: 80,
            borderRadius: "var(--r-md)",
            border: "0.5px dashed var(--line-2)",
            background: "var(--paper-inner)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {displayLogo ? (
            <Image
              src={displayLogo}
              alt=""
              width={80}
              height={80}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: "var(--r-md)",
              }}
            />
          ) : (
            <Building2 className="size-7" style={{ color: "var(--ink-4)" }} />
          )}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
            onChange={handleLogoUpload}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(20, 20, 19, 0.4)",
              opacity: 0,
              transition: "opacity 200ms ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "var(--r-md)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
          >
            <Upload className="size-4" style={{ color: "white" }} />
          </div>
        </div>
        <div>
          <h2
            style={{
              fontFamily: "var(--lf-display)",
              fontSize: 24,
              fontWeight: 500,
              letterSpacing: "-0.014em",
              color: "var(--ink)",
              margin: 0,
            }}
          >
            {form.companyName || "Company Profile"}
          </h2>
          <p
            style={{
              fontFamily: "var(--lf-display)",
              fontStyle: "italic",
              fontSize: 14,
              color: "var(--ink-3)",
              margin: 0,
              marginTop: 4,
            }}
          >
            {form.industry}
            {form.industry && form.sector ? " / " : ""}
            {form.sector}
          </p>
        </div>
      </div>

      {/* Company Info */}
      <div className="lf-card lf-card--feature">
        <div className="dash-section-header">
          <h3 className="dash-section-title">
            <Building2
              className="size-4"
              style={{ display: "inline", marginRight: 6, color: "var(--accent-blue)", verticalAlign: "-2px" }}
            />
            Company Information
          </h3>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--s-3)",
          }}
        >
          <div style={{ gridColumn: "1 / -1" }}>
            <Label className="lf-field-label">Company Name *</Label>
            <Input
              value={form.companyName}
              onChange={(e) => u("companyName", e.target.value)}
              className="lf-input"
            />
          </div>
          <div>
            <Label className="lf-field-label">Industry</Label>
            <Input
              value={form.industry}
              onChange={(e) => u("industry", e.target.value)}
              placeholder="e.g. Technology, Manufacturing"
              className="lf-input"
            />
          </div>
          <div>
            <Label className="lf-field-label">Sector</Label>
            <Input
              value={form.sector}
              onChange={(e) => u("sector", e.target.value)}
              placeholder="e.g. FinTech, RMG"
              className="lf-input"
            />
          </div>
          <div>
            <Label className="lf-field-label">
              <Globe className="size-3" style={{ display: "inline", marginRight: 4 }} />
              Website
            </Label>
            <Input
              value={form.website}
              onChange={(e) => u("website", e.target.value)}
              placeholder="https://..."
              className="lf-input"
            />
          </div>
          <div>
            <Label className="lf-field-label">LinkedIn</Label>
            <Input
              value={form.linkedinUrl}
              onChange={(e) => u("linkedinUrl", e.target.value)}
              placeholder="https://linkedin.com/company/..."
              className="lf-input"
            />
          </div>
          <div>
            <Label className="lf-field-label">
              <Users className="size-3" style={{ display: "inline", marginRight: 4 }} />
              Company Size
            </Label>
            <Select value={form.companySize || "none"} onValueChange={(v) => u("companySize", v === "none" ? "" : v)}>
              <SelectTrigger className="lf-select-trigger">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {COMPANY_SIZES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s} employees
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="lf-field-label">
              <Briefcase className="size-3" style={{ display: "inline", marginRight: 4 }} />
              Hiring Volume
            </Label>
            <Select value={form.hiringVolume || "none"} onValueChange={(v) => u("hiringVolume", v === "none" ? "" : v)}>
              <SelectTrigger className="lf-select-trigger">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {HIRING_VOLUMES.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div style={{ marginTop: "var(--s-3)" }}>
          <Label className="lf-field-label">Company Description</Label>
          <Textarea
            value={form.description}
            onChange={(e) => u("description", e.target.value)}
            rows={4}
            placeholder="What does your company do? What's the culture like?"
            className="lf-input"
            style={{ height: "auto", borderRadius: 12, padding: "10px 14px" }}
          />
        </div>
        <div style={{ marginTop: "var(--s-3)" }}>
          <Label className="lf-field-label">
            <MapPin className="size-3" style={{ display: "inline", marginRight: 4 }} />
            Office Locations
          </Label>
          <Input
            value={form.officeLocations}
            onChange={(e) => u("officeLocations", e.target.value)}
            placeholder="Dhaka, Chittagong, Gazipur (comma-separated)"
            className="lf-input"
          />
        </div>
        <div style={{ marginTop: "var(--s-3)" }}>
          <Label className="lf-field-label">Typical Functions You Hire For</Label>
          <Input
            value={form.typicalFunctions}
            onChange={(e) => u("typicalFunctions", e.target.value)}
            placeholder="HR, Finance, Engineering, Operations (comma-separated)"
            className="lf-input"
          />
        </div>
      </div>

      {/* Contact Person */}
      <div className="lf-card lf-card--feature">
        <div className="dash-section-header">
          <h3 className="dash-section-title">
            <Users
              className="size-4"
              style={{ display: "inline", marginRight: 6, color: "var(--accent-blue)", verticalAlign: "-2px" }}
            />
            Contact Person
          </h3>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--s-3)",
          }}
        >
          <div>
            <Label className="lf-field-label">Name</Label>
            <Input
              value={form.contactName}
              onChange={(e) => u("contactName", e.target.value)}
              className="lf-input"
            />
          </div>
          <div>
            <Label className="lf-field-label">Designation</Label>
            <Input
              value={form.contactDesignation}
              onChange={(e) => u("contactDesignation", e.target.value)}
              placeholder="e.g. HR Director"
              className="lf-input"
            />
          </div>
          <div>
            <Label className="lf-field-label">Email</Label>
            <Input
              type="email"
              value={form.contactEmail}
              onChange={(e) => u("contactEmail", e.target.value)}
              className="lf-input"
            />
          </div>
          <div>
            <Label className="lf-field-label">Phone</Label>
            <Input
              value={form.contactPhone}
              onChange={(e) => u("contactPhone", e.target.value)}
              className="lf-input"
            />
          </div>
        </div>
      </div>

      {/* Hiring Preferences */}
      <div className="lf-card lf-card--feature">
        <div className="dash-section-header">
          <h3 className="dash-section-title">
            <Shield
              className="size-4"
              style={{ display: "inline", marginRight: 6, color: "var(--accent-blue)", verticalAlign: "-2px" }}
            />
            Hiring Preferences
          </h3>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--s-3)",
          }}
        >
          <div>
            <Label className="lf-field-label">Default Confidentiality</Label>
            <Select value={form.defaultConfidentiality} onValueChange={(v) => u("defaultConfidentiality", v)}>
              <SelectTrigger className="lf-select-trigger">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full_mask">Fully Masked</SelectItem>
                <SelectItem value="partial_clue">Partial Clue (industry only)</SelectItem>
                <SelectItem value="disclosed">Disclosed (company name visible)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="lf-field-label">Default Urgency</Label>
            <Select value={form.defaultUrgency || "standard"} onValueChange={(v) => u("defaultUrgency", v)}>
              <SelectTrigger className="lf-select-trigger">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Billing */}
      <div className="lf-card lf-card--feature">
        <div className="dash-section-header">
          <h3 className="dash-section-title">
            <CreditCard
              className="size-4"
              style={{ display: "inline", marginRight: 6, color: "var(--accent-blue)", verticalAlign: "-2px" }}
            />
            Billing Information
          </h3>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--s-3)",
          }}
        >
          <div>
            <Label className="lf-field-label">Billing Entity</Label>
            <Input
              value={form.billingEntity}
              onChange={(e) => u("billingEntity", e.target.value)}
              placeholder="Legal company name for invoices"
              className="lf-input"
            />
          </div>
          <div>
            <Label className="lf-field-label">Billing Email</Label>
            <Input
              type="email"
              value={form.billingEmail}
              onChange={(e) => u("billingEmail", e.target.value)}
              placeholder="accounts@company.com"
              className="lf-input"
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !form.companyName.trim()}
          className="lf-cta lf-cta--primary"
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
}
