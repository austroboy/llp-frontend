"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { INDUSTRIES, ORG_TYPES as HEADHUNTING_ORG_TYPES } from "@/lib/constants";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Building2,
  Briefcase,
  FileText,
  ListChecks,
  Send,
  ChevronsUpDown,
  Check,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { fireNotification } from "@/lib/notify";

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

const SECTORS = [
  "Consumer Goods", "Industrial Goods", "Utilities", "Infrastructure",
  "EPC / Project Delivery", "Operations & Maintenance", "Corporate Services",
  "Shared Services", "Plant / Production", "Commercial / Business",
  "Sales / Distribution", "Export-oriented Business", "Domestic Market",
  "B2B", "B2C", "Public Service", "Development / Social Impact",
  "Technology Product", "Technology Service", "Professional Services", "Other",
];

const ORG_TYPES = HEADHUNTING_ORG_TYPES;

const BUSINESS_STAGES = [
  "Company formation / registration stage", "Pre-operational / setup stage",
  "Greenfield project development", "Construction / commissioning stage",
  "Early operations / ramp-up", "Fully operational / stable operations",
  "Expansion / scale-up phase", "Restructuring / turnaround phase",
  "Project-based / temporary operation",
];

const ROLE_BASES = [
  "Head office / corporate", "Factory / plant / production site",
  "Project site / field", "Regional / branch office",
  "Remote / home-based", "Retail / showroom / outlet",
  "Warehouse / logistics hub", "Multi-site / roaming",
];

// ─── Steps ────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 0, label: "Company", icon: Building2 },
  { id: 1, label: "Role", icon: Briefcase },
  { id: 2, label: "Requirements", icon: ListChecks },
  { id: 3, label: "Submit", icon: Send },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function NewMandatePage() {
  const router = useRouter();
  const { user } = useUser();

  const myClient = useQuery(
    api.headhunting.clients.getByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const createMandate = useMutation(api.headhunting.mandates.create);
  const createClientWithClerkId = useMutation(api.headhunting.clients.createWithClerkId);

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [triedNext, setTriedNext] = useState(false);
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [industryOpen, setIndustryOpen] = useState(false);
  const [sectorOpen, setSectorOpen] = useState(false);

  const [form, setForm] = useState({
    // Step 0 — Company context (6 fields)
    industry: "",
    sector: "",
    organisationType: "",
    businessStage: "",
    roleBase: "",
    confidentiality: "partial" as "full_mask" | "partial_clue" | "disclosed" | "highly_confidential",
    // Step 1 — Role
    title: "",
    department: "",
    reportingLine: "",
    location: "",
    urgency: "standard" as "standard" | "urgent" | "critical",
    mandateType: "non_exclusive" as "exclusive" | "non_exclusive" | "retainer",
    // Step 2 — Requirements
    mustHaves: "",
    dealBreakers: "",
    budgetRange: "",
    timeline: "",
    // Step 3 — notes
    additionalNotes: "",
  });

  const u = (field: keyof typeof form, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  // Validation per step
  const validate = (s: number): string[] => {
    const missing: string[] = [];
    if (s === 0) {
      if (!form.industry) missing.push("Industry");
    }
    if (s === 1) {
      if (!form.title.trim()) missing.push("Job title");
    }
    return missing;
  };

  const handleNext = () => {
    setTriedNext(true);
    const errors = validate(step);
    if (errors.length > 0) {
      toast.error(`Please fill in: ${errors.join(", ")}`);
      return;
    }
    setTriedNext(false);
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error("Job title is required.");
      return;
    }
    setSubmitting(true);
    try {
      // Auto-create client account if not found
      let clientId = myClient?._id;
      if (!clientId) {
        if (!user?.id) {
          toast.error("Please sign in first.");
          setSubmitting(false);
          return;
        }
        clientId = await createClientWithClerkId({
          companyName: form.industry ? `${user.fullName || user.primaryEmailAddress?.emailAddress || "Unknown"}'s Company` : "Unknown Company",
          contactName: user.fullName || "Unknown",
          contactEmail: user.primaryEmailAddress?.emailAddress || "",
          clerkId: user.id,
          industry: form.industry || undefined,
        });
      }
      const mandateId = await createMandate({
        clientId,
        source: "web_form",
        rawTitle: form.title.trim(),
        rawDescription: [
          form.department && `Department: ${form.department}`,
          form.reportingLine && `Reporting to: ${form.reportingLine}`,
          form.location && `Location: ${form.location}`,
          form.organisationType && `Organisation type: ${form.organisationType}`,
          form.businessStage && `Business stage: ${form.businessStage}`,
          form.roleBase && `Role base / operating area: ${form.roleBase}`,
        ].filter(Boolean).join("\n") || undefined,
        rawNotes: [
          form.mustHaves && `Must-haves:\n${form.mustHaves}`,
          form.dealBreakers && `Deal-breakers:\n${form.dealBreakers}`,
          form.budgetRange && `Budget: ${form.budgetRange}`,
          form.timeline && `Timeline: ${form.timeline}`,
          form.additionalNotes && `Additional notes:\n${form.additionalNotes}`,
        ].filter(Boolean).join("\n\n") || undefined,
        urgency: form.urgency,
        mandateType: form.mandateType,
        mandateSource: "llp_direct",
        commercialOwner: "llp",
        clientFacingBrand: "llp",
        approvalOwner: "llp_only",
        scoutPayoutBasis: "llp_direct_revenue",
      });

      // Notify admin about new client mandate (non-blocking)
      fireNotification("mandate_created", {
        mandateTitle: form.title.trim(),
        clientName: myClient?.companyName || user?.fullName || "New Client",
        source: "web_form",
        urgency: form.urgency,
        mandateType: form.mandateType,
      });
      toast.success("Mandate submitted — LLP will be in touch shortly.");
      router.push(`/headhunting/client/mandates/${mandateId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (myClient === undefined) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      {/* Back */}
      <Link
        href="/headhunting/client"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Mandates
      </Link>

      <div>
        <h1 className="text-xl font-bold">Submit a Hiring Mandate</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tell us about the role. An LLP consultant will contact you for a detailed diagnostic before sourcing begins.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = step > i;
          const active = step === i;
          return (
            <div key={s.id} className="flex items-center gap-2 flex-1 min-w-0">
              <div className={cn(
                "size-7 rounded-full flex items-center justify-center shrink-0 transition-colors",
                done ? "bg-primary text-primary-foreground" :
                active ? "bg-primary/20 text-primary border border-primary" :
                "bg-muted text-muted-foreground"
              )}>
                {done ? <CheckCircle2 className="size-3.5" /> : <Icon className="size-3.5" />}
              </div>
              <span className={cn(
                "text-xs truncate hidden sm:block",
                active ? "font-medium text-foreground" : "text-muted-foreground"
              )}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border min-w-[8px]" />}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">

        {/* STEP 0: Company context — 6 fields */}
        {step === 0 && (
          <>
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Building2 className="size-4 text-primary" /> Company Context
            </h2>
            <p className="text-xs text-muted-foreground">Help us understand your organisation so we can source the right talent.</p>
            <div className="grid grid-cols-2 gap-4">
              {/* Industry — searchable + custom entry */}
              <div className="space-y-1.5">
                <Label className="text-xs">Industry *</Label>
                <Popover open={industryOpen} onOpenChange={setIndustryOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={industryOpen} className={cn("w-full justify-between text-sm h-9 font-normal", triedNext && !form.industry && "border-red-500 ring-1 ring-red-500")}>
                      <span className={cn("truncate", !form.industry && "text-muted-foreground")}>{form.industry || "Select industry..."}</span>
                      <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search or type custom..." className="h-8 text-xs" />
                      <CommandList>
                        <CommandEmpty className="py-3 text-xs text-center text-muted-foreground">No match — press enter to use as custom.</CommandEmpty>
                        <CommandGroup>
                          {INDUSTRIES.map(opt => (
                            <CommandItem key={opt} value={opt} onSelect={(val) => { u("industry", val); setIndustryOpen(false); }} className="text-xs">
                              <Check className={cn("mr-2 size-3.5", form.industry === opt ? "opacity-100" : "opacity-0")} />
                              {opt}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {form.industry === "Other" && (
                  <Input value="" onChange={e => u("industry", e.target.value)} placeholder="Specify industry..." className="text-sm mt-1" />
                )}
              </div>
              {/* Sector / Sub-sector — searchable + custom entry */}
              <div className="space-y-1.5">
                <Label className="text-xs">Sector / Sub-sector</Label>
                <Popover open={sectorOpen} onOpenChange={setSectorOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={sectorOpen} className="w-full justify-between text-sm h-9 font-normal">
                      <span className={cn("truncate", !form.sector && "text-muted-foreground")}>{form.sector || "Select sector..."}</span>
                      <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search or type custom..." className="h-8 text-xs" />
                      <CommandList>
                        <CommandEmpty className="py-3 text-xs text-center text-muted-foreground">No match — press enter to use as custom.</CommandEmpty>
                        <CommandGroup>
                          {SECTORS.map(opt => (
                            <CommandItem key={opt} value={opt} onSelect={(val) => { u("sector", val); setSectorOpen(false); }} className="text-xs">
                              <Check className={cn("mr-2 size-3.5", form.sector === opt ? "opacity-100" : "opacity-0")} />
                              {opt}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {form.sector === "Other" && (
                  <Input value="" onChange={e => u("sector", e.target.value)} placeholder="Specify sector..." className="text-sm mt-1" />
                )}
              </div>
              {/* Organisation Type */}
              <div className="space-y-1.5">
                <Label className="text-xs">Organisation Type</Label>
                <Select value={form.organisationType} onValueChange={v => u("organisationType", v)}>
                  <SelectTrigger className="text-sm h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {ORG_TYPES.map(opt => (
                      <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Business / Project Stage */}
              <div className="space-y-1.5">
                <Label className="text-xs">Business / Project Stage</Label>
                <Select value={form.businessStage} onValueChange={v => u("businessStage", v)}>
                  <SelectTrigger className="text-sm h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {BUSINESS_STAGES.map(opt => (
                      <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Role Base / Operating Area */}
              <div className="space-y-1.5">
                <Label className="text-xs">Role Base / Operating Area</Label>
                <Select value={form.roleBase} onValueChange={v => u("roleBase", v)}>
                  <SelectTrigger className="text-sm h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {ROLE_BASES.map(opt => (
                      <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Confidentiality */}
              <div className="space-y-1.5">
                <Label className="text-xs">Confidentiality</Label>
                <Select value={form.confidentiality} onValueChange={v => u("confidentiality", v)}>
                  <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_mask" className="text-sm">Company identity withheld — name not disclosed during sourcing</SelectItem>
                    <SelectItem value="partial_clue" className="text-sm">Limited disclosure — industry shared, company name withheld</SelectItem>
                    <SelectItem value="disclosed" className="text-sm">Open search — company name can be shared with candidates</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}

        {/* STEP 1: Role basics */}
        {step === 1 && (
          <>
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Briefcase className="size-4 text-primary" /> Role Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Job Title *</Label>
                <Input
                  value={form.title}
                  onChange={e => u("title", e.target.value)}
                  placeholder="e.g. Head of Finance"
                  className={cn("text-sm", triedNext && !form.title.trim() && "border-red-500 ring-1 ring-red-500")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Department</Label>
                <Popover open={departmentOpen} onOpenChange={setDepartmentOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={departmentOpen}
                      className="w-full justify-between text-sm h-9 font-normal"
                    >
                      <span className={cn("truncate", !form.department && "text-muted-foreground")}>
                        {form.department || "Search department..."}
                      </span>
                      <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search department..." className="h-8 text-xs" />
                      <CommandList>
                        <CommandEmpty className="py-3 text-xs text-center text-muted-foreground">No match found.</CommandEmpty>
                        <CommandGroup>
                          {FUNCTIONS.map((fn) => (
                            <CommandItem
                              key={fn}
                              value={fn}
                              onSelect={(val) => {
                                u("department", val === form.department ? "" : val);
                                setDepartmentOpen(false);
                              }}
                              className="text-xs"
                            >
                              <Check className={cn("mr-2 size-3.5", form.department === fn ? "opacity-100" : "opacity-0")} />
                              {fn}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Reporting Line</Label>
                <Input value={form.reportingLine} onChange={e => u("reportingLine", e.target.value)} placeholder="e.g. Reports to CEO" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Location</Label>
                <Input value={form.location} onChange={e => u("location", e.target.value)} placeholder="e.g. Dhaka, Bangladesh" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Urgency</Label>
                <Select value={form.urgency} onValueChange={v => u("urgency", v)}>
                  <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard" className="text-sm">Standard</SelectItem>
                    <SelectItem value="urgent" className="text-sm">Urgent</SelectItem>
                    <SelectItem value="critical" className="text-sm">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Mandate Type</Label>
                <Select value={form.mandateType} onValueChange={v => u("mandateType", v)}>
                  <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="non_exclusive" className="text-sm">Non-exclusive</SelectItem>
                    <SelectItem value="exclusive" className="text-sm">Exclusive</SelectItem>
                    <SelectItem value="retainer" className="text-sm">Retainer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}

        {/* STEP 2: Requirements */}
        {step === 2 && (
          <>
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <ListChecks className="size-4 text-primary" /> Key Requirements
            </h2>
            <p className="text-xs text-muted-foreground">Optional at this stage — LLP will conduct a full diagnostic with you before sourcing starts.</p>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Must-Haves</Label>
                <Textarea
                  value={form.mustHaves}
                  onChange={e => u("mustHaves", e.target.value)}
                  placeholder="e.g. 10+ years in FMCG, P&L ownership experience, fluent in English..."
                  rows={3}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Deal-Breakers</Label>
                <Textarea
                  value={form.dealBreakers}
                  onChange={e => u("dealBreakers", e.target.value)}
                  placeholder="e.g. No candidates from direct competitors, must be based in Dhaka..."
                  rows={2}
                  className="text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Salary / Budget Range</Label>
                  <Input value={form.budgetRange} onChange={e => u("budgetRange", e.target.value)} placeholder="e.g. 3–4 lakh/month" className="text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Ideal Timeline</Label>
                  <Input value={form.timeline} onChange={e => u("timeline", e.target.value)} placeholder="e.g. Within 6 weeks" className="text-sm" />
                </div>
              </div>
            </div>
          </>
        )}

        {/* STEP 3: Review + submit */}
        {step === 3 && (
          <>
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <FileText className="size-4 text-primary" /> Review & Submit
            </h2>

            <div className="rounded-lg bg-muted/40 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Role</span>
                <span className="font-medium">{form.title || "—"}</span>
              </div>
              {form.department && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Department</span>
                  <span>{form.department}</span>
                </div>
              )}
              {form.location && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span>{form.location}</span>
                </div>
              )}
              {form.urgency && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Urgency</span>
                  <span className="capitalize">{form.urgency}</span>
                </div>
              )}
              {form.mustHaves && (
                <div className="pt-1">
                  <span className="text-muted-foreground text-xs">Must-haves provided ✓</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Additional Notes (optional)</Label>
              <Textarea
                value={form.additionalNotes}
                onChange={e => u("additionalNotes", e.target.value)}
                placeholder="Anything else LLP should know before the diagnostic call..."
                rows={3}
                className="text-sm"
              />
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
              <p className="font-medium mb-1">What happens next?</p>
              <ul className="text-muted-foreground space-y-1 text-xs">
                <li className="flex items-start gap-1.5"><CheckCircle2 className="size-3.5 mt-0.5 text-primary shrink-0" /> LLP will review your mandate and contact you within 1 business day</li>
                <li className="flex items-start gap-1.5"><CheckCircle2 className="size-3.5 mt-0.5 text-primary shrink-0" /> A diagnostic call will be scheduled to finalise the role blueprint</li>
                <li className="flex items-start gap-1.5"><CheckCircle2 className="size-3.5 mt-0.5 text-primary shrink-0" /> Once you approve the blueprint, sourcing begins through LLP scouts</li>
              </ul>
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(s => Math.max(s - 1, 0))}
          disabled={step === 0}
          className="gap-1.5"
        >
          <ArrowLeft className="size-3.5" /> Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={handleNext} className="gap-1.5">
            Next <ArrowRight className="size-3.5" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
            <Send className="size-3.5" />
            {submitting ? "Submitting..." : "Submit Mandate"}
          </Button>
        )}
      </div>
    </div>
  );
}
