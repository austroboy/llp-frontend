"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useFormPrefill } from "@/hooks/use-form-prefill";
import { useAccountType } from "@/components/providers/account-context";
import { HeadhuntingHireSignupGate } from "@/components/headhunting/headhunting-hire-signup-gate";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { INDUSTRIES, ORG_TYPES as HEADHUNTING_ORG_TYPES } from "@/lib/constants";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  ClipboardList,
  Layers,
  Send,
  CheckCircle2,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Check,
  Copy,
  MoveRight,
  Pencil,
  AlertCircle,
  Package,
  X,
  Paperclip,
  Upload,
  FileUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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

// ─── Option Constants ─────────────────────────────────────────────────────────

// INDUSTRIES and ORG_TYPES imported from @/lib/constants

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

const COMPANY_SIZES = ["1-50", "51-200", "201-500", "500+"];

const HIRING_SUPPORT_TYPES = [
  "Executive Search", "Mid-level Recruitment", "Volume Hiring",
  "Contract / Temporary Staffing", "Confidential Replacement",
  "Project-based Hiring", "Other",
];

const CONFIDENTIALITY_OPTIONS = [
  { value: "open", label: "Open search, company name can be disclosed" },
  { value: "limited", label: "Limited disclosure, share details selectively" },
  { value: "confidential", label: "Confidential search, company name withheld initially" },
  { value: "highly_confidential", label: "Highly confidential / replacement mandate" },
];

const URGENCY_LEVELS = [
  { value: "standard", label: "Standard" },
  { value: "urgent", label: "Urgent" },
  { value: "critical", label: "Critical" },
  { value: "flexible", label: "Flexible / No rush" },
];

const WORK_MODES = ["On-site", "Remote", "Hybrid"];
const WEEKLY_DAYS = ["5 days", "6 days", "Rotational", "Flexible"];
const SHIFT_TYPES = ["General / Day shift", "Rotational shifts", "Night shift", "Flexible"];
const TRAVEL_OPTIONS = ["No travel", "Occasional", "Regular", "Extensive"];
const RELOCATION_OPTIONS = ["Not applicable", "Yes, company provides support", "Case by case", "No"];

const SENIORITY_LEVELS = [
  "Entry-level", "Junior", "Mid-level", "Senior", "Lead",
  "Manager", "Senior Manager", "Director", "VP", "C-level / Executive",
];

// ─── Override field mapping (group field → override field) ────────────────────

const OVERRIDE_FIELDS = [
  { key: "workMode", label: "Work Mode", category: "conditions" },
  { key: "weeklyWorkingDays", label: "Weekly Working Days", category: "conditions" },
  { key: "shiftType", label: "Shift Type", category: "conditions" },
  { key: "workingHours", label: "Working Hours", category: "conditions" },
  { key: "jobLocation", label: "Job Location", category: "conditions" },
  { key: "travelRequirement", label: "Travel Requirement", category: "conditions" },
  { key: "relocationSupport", label: "Relocation Support", category: "conditions" },
  { key: "monthlySalaryRange", label: "Monthly Salary", category: "compensation" },
  { key: "annualCtcRange", label: "Annual CTC", category: "compensation" },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface BenefitField {
  enabled: boolean;
  note: string;
}

interface RoleEntry {
  id: string;
  roleTitle: string;
  department: string;
  seniorityLevel: string;
  openings: number;
  reportingTo: string;
  roleSummary: string;
  mustHaveCriteria: string;
  goodToHaveCriteria: string;
  roleNotes: string;
  // Override fields
  overriddenFields: string[];
  ovWorkMode: string;
  ovWeeklyWorkingDays: string;
  ovShiftType: string;
  ovWorkingHours: string;
  ovJobLocation: string;
  ovTravelRequirement: string;
  ovRelocationSupport: string;
  ovMonthlySalaryRange: string;
  ovAnnualCtcRange: string;
}

interface GroupEntry {
  id: string;
  groupName: string;
  groupDescription: string;
  positionsInGroup: number;
  // Conditions
  workMode: string;
  weeklyWorkingDays: string;
  shiftType: string;
  workingHours: string;
  jobLocation: string;
  travelRequirement: string;
  relocationSupport: string;
  // Compensation
  monthlySalaryRange: string;
  annualCtcRange: string;
  variablePay: BenefitField;
  cashBenefits: BenefitField;
  transportSupport: BenefitField;
  accommodationSupport: BenefitField;
  medicalCoverage: BenefitField;
  lifeAccidentProtection: BenefitField;
  retirementBenefits: BenefitField;
  leaveBenefits: BenefitField;
  learningDevelopment: BenefitField;
  careerGrowth: BenefitField;
  otherBenefits: string;
  internalNotes: string;
  // Attachments (client-side File objects, uploaded on submit)
  jdFile: File | null;
  rjpFile: File | null;
  compensationSheetFile: File | null;
  orgChartFile: File | null;
  otherDocFiles: File[];
  // Roles
  roles: RoleEntry[];
}

// ─── Steps ────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 0, label: "Company", icon: Building2 },
  { id: 1, label: "Assignment", icon: ClipboardList },
  { id: 2, label: "Groups & Roles", icon: Layers },
  { id: 3, label: "Review", icon: Send },
];

const defaultBenefit = (): BenefitField => ({ enabled: false, note: "" });

const newRole = (): RoleEntry => ({
  id: crypto.randomUUID(),
  roleTitle: "",
  department: "",
  seniorityLevel: "",
  openings: 1,
  reportingTo: "",
  roleSummary: "",
  mustHaveCriteria: "",
  goodToHaveCriteria: "",
  roleNotes: "",
  overriddenFields: [],
  ovWorkMode: "",
  ovWeeklyWorkingDays: "",
  ovShiftType: "",
  ovWorkingHours: "",
  ovJobLocation: "",
  ovTravelRequirement: "",
  ovRelocationSupport: "",
  ovMonthlySalaryRange: "",
  ovAnnualCtcRange: "",
});

const newGroup = (name?: string): GroupEntry => ({
  id: crypto.randomUUID(),
  groupName: name || "",
  groupDescription: "",
  positionsInGroup: 0,
  workMode: "",
  weeklyWorkingDays: "",
  shiftType: "",
  workingHours: "",
  jobLocation: "",
  travelRequirement: "",
  relocationSupport: "",
  monthlySalaryRange: "",
  annualCtcRange: "",
  variablePay: defaultBenefit(),
  cashBenefits: defaultBenefit(),
  transportSupport: defaultBenefit(),
  accommodationSupport: defaultBenefit(),
  medicalCoverage: defaultBenefit(),
  lifeAccidentProtection: defaultBenefit(),
  retirementBenefits: defaultBenefit(),
  leaveBenefits: defaultBenefit(),
  learningDevelopment: defaultBenefit(),
  careerGrowth: defaultBenefit(),
  otherBenefits: "",
  internalNotes: "",
  jdFile: null,
  rjpFile: null,
  compensationSheetFile: null,
  orgChartFile: null,
  otherDocFiles: [],
  roles: [newRole()],
});

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function NewHiringFlowPage() {
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();
  const { isOrgUser, isLoaded: accountLoaded } = useAccountType();
  const { prefill, isLoaded: prefillLoaded } = useFormPrefill();

  const myClient = useQuery(
    api.headhunting.clients.getByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const createClientWithClerkId = useMutation(api.headhunting.clients.createWithClerkId);
  const updateClient = useMutation(api.headhunting.clients.update);
  const createAssignment = useMutation(api.headhunting.hiringAssignments.create);
  const submitAssignment = useMutation(api.headhunting.hiringAssignments.submit);
  const createRoleGroupMut = useMutation(api.headhunting.roleGroups.create);
  const updateRoleGroupMut = useMutation(api.headhunting.roleGroups.update);
  const createRoleMut = useMutation(api.headhunting.roles.create);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const addAttachment = useMutation(api.headhunting.roleGroups.addAttachment);
  const setOtherDocs = useMutation(api.headhunting.roleGroups.setOtherDocs);

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [triedNext, setTriedNext] = useState(false);

  // Searchable dropdown states
  const [industryOpen, setIndustryOpen] = useState(false);
  const [sectorOpen, setSectorOpen] = useState(false);

  // ─── Step 0: Company Profile ─────────────────────────────────────
  const [company, setCompany] = useState({
    companyName: "",
    website: "",
    companyEmail: "",
    companyPhone: "",
    companyLocation: "",
    industry: "",
    sector: "",
    organisationType: "",
    businessStage: "",
    companySize: "",
    contactName: "",
    contactDesignation: "",
    workEmail: "",
    phone: "",
    alternativeContact: "",
    notes: "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!prefillLoaded) return;
    setCompany(prev => ({
      ...prev,
      contactName: prev.contactName || prefill.fullName,
      workEmail: prev.workEmail || prefill.workEmail,
      phone: prev.phone || prefill.phone,
      contactDesignation: prev.contactDesignation || prefill.designation,
      companyName: prev.companyName || prefill.company,
      companyEmail: prev.companyEmail || prefill.email,
      companyLocation: prev.companyLocation || prefill.location,
    }));
  }, [prefillLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Step 1: Assignment ──────────────────────────────────────────
  const [assignment, setAssignment] = useState({
    assignmentName: "",
    hiringSupportType: "",
    hiringScopeSummary: "",
    totalOpenings: 1,
    hiringEntity: "",
    confidentialityPreference: "",
    geography: "",
    urgencyLevel: "",
    targetJoiningTimeline: "",
    internalNotes: "",
  });

  // ─── Step 2: Groups & Roles (Phase 2 multi-group) ───────────────
  const [groupMode, setGroupMode] = useState<"undecided" | "shared" | "individual">("undecided");
  const [groups, setGroups] = useState<GroupEntry[]>([newGroup()]);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<"conditions" | "compensation" | "attachments" | null>(null);
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);
  const [showOverrideFor, setShowOverrideFor] = useState<string | null>(null);
  const [moveRoleId, setMoveRoleId] = useState<string | null>(null);

  // Collapsible compensation sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    compensation: true,
    allowances: false,
    coverage: false,
    others: false,
  });

  // Pre-fill from existing client
  const prefilled = myClient && company.companyName === "" && myClient.companyName;
  if (prefilled && myClient) {
    const c = myClient as Record<string, unknown>;
    setCompany((prev) => ({
      ...prev,
      companyName: (c.companyName as string) || "",
      website: (c.website as string) || "",
      companyEmail: (c.companyEmail as string) || "",
      companyPhone: (c.companyPhone as string) || "",
      companyLocation: (c.companyLocation as string) || "",
      industry: (c.industry as string) || "",
      sector: (c.sector as string) || "",
      organisationType: (c.organisationType as string) || "",
      businessStage: (c.businessStage as string) || "",
      companySize: (c.companySize as string) || "",
    }));
  }

  // ─── Group/Role Helpers ──────────────────────────────────────────

  const toggleSection = (key: string) =>
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  const updateGroup = (groupId: string, field: string, value: unknown) => {
    setGroups((gs) =>
      gs.map((g) => (g.id === groupId ? { ...g, [field]: value } : g))
    );
  };

  const updateGroupBenefit = (
    groupId: string,
    key: string,
    field: "enabled" | "note",
    value: boolean | string
  ) => {
    setGroups((gs) =>
      gs.map((g) =>
        g.id === groupId
          ? { ...g, [key]: { ...(g[key as keyof GroupEntry] as BenefitField), [field]: value } }
          : g
      )
    );
  };

  const addGroup = () => {
    const g = newGroup(`Group ${groups.length + 1}`);
    setGroups((gs) => [...gs, g]);
    setExpandedGroupId(g.id);
  };

  const duplicateGroup = (groupId: string) => {
    const source = groups.find((g) => g.id === groupId);
    if (!source) return;
    const dup: GroupEntry = {
      ...source,
      id: crypto.randomUUID(),
      groupName: `${source.groupName} (copy)`,
      jdFile: null,
      rjpFile: null,
      compensationSheetFile: null,
      orgChartFile: null,
      otherDocFiles: [],
      roles: source.roles.map((r) => ({ ...r, id: crypto.randomUUID() })),
    };
    setGroups((gs) => [...gs, dup]);
    setExpandedGroupId(dup.id);
    toast.success("Group duplicated");
  };

  const removeGroup = (groupId: string) => {
    if (groups.length <= 1) {
      toast.error("At least one group is required");
      return;
    }
    setGroups((gs) => gs.filter((g) => g.id !== groupId));
    if (expandedGroupId === groupId) setExpandedGroupId(null);
    if (editingGroupId === groupId) setEditingGroupId(null);
  };

  const updateRole = (groupId: string, roleId: string, field: string, value: unknown) => {
    setGroups((gs) =>
      gs.map((g) =>
        g.id === groupId
          ? {
              ...g,
              roles: g.roles.map((r) =>
                r.id === roleId ? { ...r, [field]: value } : r
              ),
            }
          : g
      )
    );
  };

  const addRoleToGroup = (groupId: string) => {
    const r = newRole();
    setGroups((gs) =>
      gs.map((g) =>
        g.id === groupId ? { ...g, roles: [...g.roles, r] } : g
      )
    );
    setExpandedRoleId(r.id);
  };

  const removeRole = (groupId: string, roleId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group || group.roles.length <= 1) {
      toast.error("At least one role per group is required");
      return;
    }
    setGroups((gs) =>
      gs.map((g) =>
        g.id === groupId
          ? { ...g, roles: g.roles.filter((r) => r.id !== roleId) }
          : g
      )
    );
  };

  const moveRoleToGroup = (roleId: string, sourceGroupId: string, targetGroupId: string) => {
    const sourceGroup = groups.find((g) => g.id === sourceGroupId);
    const role = sourceGroup?.roles.find((r) => r.id === roleId);
    if (!role || !sourceGroup) return;
    if (sourceGroup.roles.length <= 1) {
      toast.error("Cannot move the last role out of a group");
      return;
    }
    setGroups((gs) =>
      gs.map((g) => {
        if (g.id === sourceGroupId) return { ...g, roles: g.roles.filter((r) => r.id !== roleId) };
        if (g.id === targetGroupId) return { ...g, roles: [...g.roles, role] };
        return g;
      })
    );
    setMoveRoleId(null);
    toast.success("Role moved");
  };

  const createGroupFromRole = (roleId: string, sourceGroupId: string) => {
    const sourceGroup = groups.find((g) => g.id === sourceGroupId);
    const role = sourceGroup?.roles.find((r) => r.id === roleId);
    if (!role || !sourceGroup) return;
    if (sourceGroup.roles.length <= 1) {
      toast.error("Cannot extract the last role from a group");
      return;
    }
    // Create new group inheriting source group conditions
    const { roles: _, id: _gid, groupName: _gn, groupDescription: _gd, positionsInGroup: _p, jdFile: _jd, rjpFile: _rjp, compensationSheetFile: _cs, orgChartFile: _oc, otherDocFiles: _od, ...groupConditions } = sourceGroup;
    const ng: GroupEntry = {
      ...groupConditions,
      id: crypto.randomUUID(),
      groupName: role.roleTitle || `New Group`,
      groupDescription: "",
      positionsInGroup: role.openings,
      jdFile: null,
      rjpFile: null,
      compensationSheetFile: null,
      orgChartFile: null,
      otherDocFiles: [],
      roles: [{ ...role, overriddenFields: [], ovWorkMode: "", ovWeeklyWorkingDays: "", ovShiftType: "", ovWorkingHours: "", ovJobLocation: "", ovTravelRequirement: "", ovRelocationSupport: "", ovMonthlySalaryRange: "", ovAnnualCtcRange: "" }],
    };
    setGroups((gs) => [
      ...gs.map((g) =>
        g.id === sourceGroupId
          ? { ...g, roles: g.roles.filter((r) => r.id !== roleId) }
          : g
      ),
      ng,
    ]);
    setExpandedGroupId(ng.id);
    toast.success("New group created from role");
  };

  // Toggle override for a role field
  const toggleRoleOverride = (groupId: string, roleId: string, fieldKey: string) => {
    setGroups((gs) =>
      gs.map((g) =>
        g.id === groupId
          ? {
              ...g,
              roles: g.roles.map((r) => {
                if (r.id !== roleId) return r;
                const isOverridden = r.overriddenFields.includes(fieldKey);
                if (isOverridden) {
                  // Remove override — clear the value
                  const ovKey = `ov${fieldKey.charAt(0).toUpperCase()}${fieldKey.slice(1)}` as keyof RoleEntry;
                  return {
                    ...r,
                    overriddenFields: r.overriddenFields.filter((f) => f !== fieldKey),
                    [ovKey]: "",
                  };
                } else {
                  // Add override — copy group value as starting point
                  const groupValue = (g[fieldKey as keyof GroupEntry] as string) || "";
                  const ovKey = `ov${fieldKey.charAt(0).toUpperCase()}${fieldKey.slice(1)}` as keyof RoleEntry;
                  return {
                    ...r,
                    overriddenFields: [...r.overriddenFields, fieldKey],
                    [ovKey]: groupValue,
                  };
                }
              }),
            }
          : g
      )
    );
  };

  // Handle "individual" mode — auto-create one group per role
  const handleIndividualMode = () => {
    setGroupMode("individual");
    // Keep existing groups but allow adding more
  };

  const handleSharedMode = () => {
    setGroupMode("shared");
  };

  // ─── Validation ─────────────────────────────────────────────────

  const validate = (s: number): string[] => {
    const missing: string[] = [];
    if (s === 0) {
      if (!company.companyName.trim()) missing.push("Company Name");
      if (!company.industry.trim()) missing.push("Industry");
      if (!company.contactName.trim()) missing.push("Primary Contact Person Name");
      if (!company.workEmail.trim()) missing.push("Work Email");
      if (!company.phone.trim()) missing.push("Phone / WhatsApp");
    }
    if (s === 1) {
      if (!assignment.assignmentName.trim()) missing.push("Assignment Name");
      if (!assignment.hiringSupportType.trim()) missing.push("Hiring Support Type");
      if (assignment.totalOpenings < 1) missing.push("Total Number of Openings");
    }
    if (s === 2) {
      if (groupMode === "undecided") missing.push("Please choose a grouping option");
      for (const g of groups) {
        if (!g.groupName.trim()) missing.push(`Group name (for "${g.groupName || "unnamed group"}")`);
        for (const r of g.roles) {
          if (!r.roleTitle.trim()) missing.push(`Role Title (in group "${g.groupName || "unnamed"}")`);
          if (r.openings < 1) missing.push(`Openings (for role "${r.roleTitle || "unnamed"}")`);
        }
      }
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
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  // ─── Submit ─────────────────────────────────────────────────────

  const handleSubmit = async () => {
    for (let s = 0; s <= 2; s++) {
      const errors = validate(s);
      if (errors.length > 0) {
        toast.error(`Step "${STEPS[s].label}": ${errors.join(", ")}`);
        setStep(s);
        return;
      }
    }

    setSubmitting(true);
    try {
      if (!user?.id) {
        toast.error("Please sign in first.");
        setSubmitting(false);
        return;
      }

      // 1. Create or update Company Profile
      let clientId: Id<"htClients">;
      if (myClient?._id) {
        clientId = myClient._id;
        await updateClient({
          id: clientId,
          companyName: company.companyName.trim(),
          industry: company.industry || undefined,
          sector: company.sector || undefined,
          website: company.website || undefined,
          companyEmail: company.companyEmail || undefined,
          companyPhone: company.companyPhone || undefined,
          companyLocation: company.companyLocation || undefined,
          companySize: company.companySize || undefined,
          organisationType: company.organisationType || undefined,
          businessStage: company.businessStage || undefined,
          alternativeContact: company.alternativeContact || undefined,
          notes: company.notes || undefined,
        });
      } else {
        clientId = await createClientWithClerkId({
          companyName: company.companyName.trim(),
          contactName: company.contactName.trim(),
          contactEmail: company.workEmail.trim(),
          contactPhone: company.phone.trim() || undefined,
          contactDesignation: company.contactDesignation.trim() || undefined,
          clerkId: user.id,
          industry: company.industry || undefined,
          sector: company.sector || undefined,
          website: company.website || undefined,
          companyEmail: company.companyEmail || undefined,
          companyPhone: company.companyPhone || undefined,
          companyLocation: company.companyLocation || undefined,
          companySize: company.companySize || undefined,
          organisationType: company.organisationType || undefined,
          businessStage: company.businessStage || undefined,
          alternativeContact: company.alternativeContact || undefined,
          notes: company.notes || undefined,
        });
      }

      // Upload logo if provided
      if (logoFile) {
        const uploadUrl = await generateUploadUrl({});
        const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": logoFile.type }, body: logoFile });
        if (res.ok) {
          const { storageId } = await res.json();
          await updateClient({ id: clientId, logoId: storageId });
        }
      }

      // 2. Create Assignment
      const totalOpenings = groups.reduce(
        (sum, g) => sum + g.roles.reduce((rs, r) => rs + r.openings, 0),
        0
      );
      const assignmentId = await createAssignment({
        clientId,
        clerkId: user.id,
        assignmentName: assignment.assignmentName.trim(),
        hiringSupportType: assignment.hiringSupportType,
        hiringScopeSummary: assignment.hiringScopeSummary || undefined,
        totalOpenings,
        hiringEntity: assignment.hiringEntity || undefined,
        confidentialityPreference: assignment.confidentialityPreference || undefined,
        geography: assignment.geography || undefined,
        urgencyLevel: assignment.urgencyLevel || undefined,
        targetJoiningTimeline: assignment.targetJoiningTimeline || undefined,
        internalNotes: assignment.internalNotes || undefined,
      });

      // 3. Create groups + roles
      const benefitOrUndefined = (b: BenefitField) =>
        b.enabled ? { enabled: true, note: b.note || undefined } : undefined;

      for (const group of groups) {
        const roleGroupId = await createRoleGroupMut({
          assignmentId,
          groupName: group.groupName.trim(),
          groupDescription: group.groupDescription || undefined,
          positionsInGroup: group.roles.reduce((s, r) => s + r.openings, 0),
        });

        await updateRoleGroupMut({
          id: roleGroupId,
          workMode: group.workMode || undefined,
          weeklyWorkingDays: group.weeklyWorkingDays || undefined,
          shiftType: group.shiftType || undefined,
          workingHours: group.workingHours || undefined,
          jobLocation: group.jobLocation || undefined,
          travelRequirement: group.travelRequirement || undefined,
          relocationSupport: group.relocationSupport || undefined,
          monthlySalaryRange: group.monthlySalaryRange || undefined,
          annualCtcRange: group.annualCtcRange || undefined,
          variablePay: benefitOrUndefined(group.variablePay),
          cashBenefits: benefitOrUndefined(group.cashBenefits),
          transportSupport: benefitOrUndefined(group.transportSupport),
          accommodationSupport: benefitOrUndefined(group.accommodationSupport),
          medicalCoverage: benefitOrUndefined(group.medicalCoverage),
          lifeAccidentProtection: benefitOrUndefined(group.lifeAccidentProtection),
          retirementBenefits: benefitOrUndefined(group.retirementBenefits),
          leaveBenefits: benefitOrUndefined(group.leaveBenefits),
          learningDevelopment: benefitOrUndefined(group.learningDevelopment),
          careerGrowth: benefitOrUndefined(group.careerGrowth),
          otherBenefits: group.otherBenefits || undefined,
          internalNotes: group.internalNotes || undefined,
        });

        // Upload attachments
        const fileFields = [
          { file: group.jdFile, field: "jdFileId" as const },
          { file: group.rjpFile, field: "rjpFileId" as const },
          { file: group.compensationSheetFile, field: "compensationSheetFileId" as const },
          { file: group.orgChartFile, field: "orgChartFileId" as const },
        ];
        for (const { file, field } of fileFields) {
          if (file) {
            const uploadUrl = await generateUploadUrl({});
            const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
            if (res.ok) {
              const { storageId } = await res.json();
              await addAttachment({ id: roleGroupId, field, storageId });
            }
          }
        }

        // Upload other documents (multi-file)
        if (group.otherDocFiles.length > 0) {
          const otherIds: string[] = [];
          for (const file of group.otherDocFiles) {
            const uploadUrl = await generateUploadUrl({});
            const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
            if (res.ok) {
              const { storageId } = await res.json();
              otherIds.push(storageId);
            }
          }
          if (otherIds.length > 0) {
            await setOtherDocs({ id: roleGroupId, storageIds: otherIds as Id<"_storage">[] });
          }
        }

        for (const role of group.roles) {
          await createRoleMut({
            roleGroupId,
            assignmentId,
            roleTitle: role.roleTitle.trim(),
            department: role.department || undefined,
            seniorityLevel: role.seniorityLevel || undefined,
            openings: role.openings,
            reportingTo: role.reportingTo || undefined,
            roleSummary: role.roleSummary || undefined,
            mustHaveCriteria: role.mustHaveCriteria || undefined,
            goodToHaveCriteria: role.goodToHaveCriteria || undefined,
            roleNotes: role.roleNotes || undefined,
            overriddenFields: role.overriddenFields.length > 0 ? role.overriddenFields : undefined,
            ovWorkMode: role.overriddenFields.includes("workMode") ? role.ovWorkMode || undefined : undefined,
            ovWeeklyWorkingDays: role.overriddenFields.includes("weeklyWorkingDays") ? role.ovWeeklyWorkingDays || undefined : undefined,
            ovShiftType: role.overriddenFields.includes("shiftType") ? role.ovShiftType || undefined : undefined,
            ovWorkingHours: role.overriddenFields.includes("workingHours") ? role.ovWorkingHours || undefined : undefined,
            ovJobLocation: role.overriddenFields.includes("jobLocation") ? role.ovJobLocation || undefined : undefined,
            ovTravelRequirement: role.overriddenFields.includes("travelRequirement") ? role.ovTravelRequirement || undefined : undefined,
            ovRelocationSupport: role.overriddenFields.includes("relocationSupport") ? role.ovRelocationSupport || undefined : undefined,
            ovMonthlySalaryRange: role.overriddenFields.includes("monthlySalaryRange") ? role.ovMonthlySalaryRange || undefined : undefined,
            ovAnnualCtcRange: role.overriddenFields.includes("annualCtcRange") ? role.ovAnnualCtcRange || undefined : undefined,
          });
        }
      }

      // 4. Submit
      await submitAssignment({ id: assignmentId });

      fireNotification("mandate_created", {
        mandateTitle: assignment.assignmentName.trim(),
        clientName: company.companyName.trim(),
        source: "hiring_flow",
        urgency: assignment.urgencyLevel || "standard",
        groupCount: groups.length,
        totalOpenings,
      });

      toast.success("Hiring request submitted! LLP will be in touch shortly.");
      router.push("/headhunting/client");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Auth gate ──────────────────────────────────────────────────
  // Headhunting hire requests are organization-only.
  //  - Guests           → render the in-flow signup gate (issue 6)
  //  - Individual users → block with an upgrade prompt (issue 4)
  //  - Org users        → continue to the wizard
  // Server-side backstop: convex/headhunting/hiringAssignments.create and
  // convex/headhunting/clients.createWithClerkId both call requireOrgUser.

  if (!userLoaded || !accountLoaded) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <HeadhuntingHireSignupGate />;
  }

  if (!isOrgUser) {
    return (
      <div className="mx-auto max-w-md py-16 px-4 text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="size-7 text-primary" />
          </div>
        </div>
        <h1 className="text-xl font-bold">Organization account required</h1>
        <p className="text-sm text-muted-foreground">
          Your account is registered as an Individual. LLP Headhunting requests
          are available to organization accounts only. Please sign in with an
          organization account, or create one to continue.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button asChild className="rounded-full flex-1">
            <Link href="/sign-up">Create Org Account</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full flex-1">
            <Link href="/headhunting">Back to Headhunting</Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground pt-2">
          Need help switching account types? Email{" "}
          <a href="mailto:support@laborlawpartner.com" className="text-primary hover:underline">
            support@laborlawpartner.com
          </a>
        </p>
      </div>
    );
  }

  // ─── Loading ────────────────────────────────────────────────────

  if (myClient === undefined) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  // ─── Computed ───────────────────────────────────────────────────

  const totalRoleOpenings = groups.reduce(
    (sum, g) => sum + g.roles.reduce((rs, r) => rs + r.openings, 0),
    0
  );
  const totalRoles = groups.reduce((sum, g) => sum + g.roles.length, 0);

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      {/* Back */}
      <Link
        href="/headhunting/client"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Dashboard
      </Link>

      <div>
        <h1 className="text-xl font-bold">Submit a Hiring Request</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tell us about your company and the roles you need filled.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = step > i;
          const active = step === i;
          return (
            <div key={s.id} className="flex items-center gap-1.5 flex-1 min-w-0">
              <button
                type="button"
                onClick={() => { if (done) setStep(i); }}
                disabled={!done}
                className={cn(
                  "size-7 rounded-full flex items-center justify-center shrink-0 transition-colors",
                  done ? "bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90"
                    : active ? "bg-primary/20 text-primary border border-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {done ? <CheckCircle2 className="size-3.5" /> : <Icon className="size-3.5" />}
              </button>
              <span className={cn("text-xs truncate hidden sm:block", active ? "font-medium text-foreground" : "text-muted-foreground")}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border min-w-[8px]" />}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        {/* ─── STEP 0: Company Profile ──────────────────────────── */}
        {step === 0 && (
          <>
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Building2 className="size-4 text-primary" /> Company Profile
            </h2>
            <p className="text-xs text-muted-foreground">
              {myClient ? "Review and update your company details." : "Enter your company information. This will be saved for future assignments."}
            </p>
            {/* Logo upload */}
            <div className="flex items-center gap-4 mb-2">
              <label className="relative size-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-muted/30 transition-colors overflow-hidden shrink-0">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="size-full object-cover" />
                ) : (
                  <Upload className="size-5 text-muted-foreground" />
                )}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setLogoFile(file);
                      setLogoPreview(URL.createObjectURL(file));
                    }
                  }}
                />
              </label>
              <div>
                <p className="text-xs font-medium">Company Logo</p>
                <p className="text-xs text-muted-foreground">{logoFile ? logoFile.name : "Optional — click to upload"}</p>
                {logoFile && (
                  <button type="button" onClick={() => { setLogoFile(null); setLogoPreview(null); }} className="text-xs text-red-500 hover:underline mt-0.5">Remove</button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-1 sm:col-span-2 space-y-1.5">
                <Label className="text-xs">Company Name *</Label>
                <Input value={company.companyName} onChange={(e) => setCompany((c) => ({ ...c, companyName: e.target.value }))} placeholder="e.g. Acme Corporation Ltd." className={cn("text-sm", triedNext && !company.companyName.trim() && "border-red-500 ring-1 ring-red-500")} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Website</Label>
                <Input value={company.website} onChange={(e) => setCompany((c) => ({ ...c, website: e.target.value }))} placeholder="https://..." className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Company Email</Label>
                <Input value={company.companyEmail} onChange={(e) => setCompany((c) => ({ ...c, companyEmail: e.target.value }))} placeholder="info@company.com" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Company Phone</Label>
                <Input value={company.companyPhone} onChange={(e) => setCompany((c) => ({ ...c, companyPhone: e.target.value }))} placeholder="+880..." className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Company Location</Label>
                <Input value={company.companyLocation} onChange={(e) => setCompany((c) => ({ ...c, companyLocation: e.target.value }))} placeholder="e.g. Dhaka, Bangladesh" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Industry *</Label>
                <SearchableSelect value={company.industry} options={INDUSTRIES} open={industryOpen} onOpenChange={setIndustryOpen} onSelect={(val) => setCompany((c) => ({ ...c, industry: val }))} placeholder="Search industry..." error={triedNext && !company.industry.trim()} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sector / Sub-sector</Label>
                <SearchableSelect value={company.sector} options={SECTORS} open={sectorOpen} onOpenChange={setSectorOpen} onSelect={(val) => setCompany((c) => ({ ...c, sector: val }))} placeholder="Search sector..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Organisation Type</Label>
                <Select value={company.organisationType} onValueChange={(v) => setCompany((c) => ({ ...c, organisationType: v }))}>
                  <SelectTrigger className="text-sm h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{ORG_TYPES.map((opt) => (<SelectItem key={opt} value={opt} className="text-sm">{opt}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Business / Project Stage</Label>
                <Select value={company.businessStage} onValueChange={(v) => setCompany((c) => ({ ...c, businessStage: v }))}>
                  <SelectTrigger className="text-sm h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{BUSINESS_STAGES.map((opt) => (<SelectItem key={opt} value={opt} className="text-sm">{opt}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Company Size</Label>
                <Select value={company.companySize} onValueChange={(v) => setCompany((c) => ({ ...c, companySize: v }))}>
                  <SelectTrigger className="text-sm h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{COMPANY_SIZES.map((opt) => (<SelectItem key={opt} value={opt} className="text-sm">{opt} employees</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
            {/* Primary contact */}
            <div className="border-t border-border pt-4 mt-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Primary Contact Person</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Full Name *</Label>
                  <Input value={company.contactName} onChange={(e) => setCompany((c) => ({ ...c, contactName: e.target.value }))} placeholder="e.g. John Doe" className={cn("text-sm", triedNext && !company.contactName.trim() && "border-red-500 ring-1 ring-red-500")} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Designation</Label>
                  <Input value={company.contactDesignation} onChange={(e) => setCompany((c) => ({ ...c, contactDesignation: e.target.value }))} placeholder="e.g. HR Director" className="text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Work Email *</Label>
                  <Input value={company.workEmail} onChange={(e) => setCompany((c) => ({ ...c, workEmail: e.target.value }))} placeholder="name@company.com" type="email" className={cn("text-sm", triedNext && !company.workEmail.trim() && "border-red-500 ring-1 ring-red-500")} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone / WhatsApp *</Label>
                  <Input value={company.phone} onChange={(e) => setCompany((c) => ({ ...c, phone: e.target.value }))} placeholder="+880..." className={cn("text-sm", triedNext && !company.phone.trim() && "border-red-500 ring-1 ring-red-500")} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Alternative Contact</Label>
                  <Input value={company.alternativeContact} onChange={(e) => setCompany((c) => ({ ...c, alternativeContact: e.target.value }))} placeholder="Name and contact details" className="text-sm" />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea value={company.notes} onChange={(e) => setCompany((c) => ({ ...c, notes: e.target.value }))} placeholder="Any additional context..." rows={2} className="text-sm" />
            </div>
          </>
        )}

        {/* ─── STEP 1: Assignment ────────────────────────────────── */}
        {step === 1 && (
          <>
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <ClipboardList className="size-4 text-primary" /> Hiring Assignment
            </h2>
            <p className="text-xs text-muted-foreground">Describe what you&apos;re hiring for.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-1 sm:col-span-2 space-y-1.5">
                <Label className="text-xs">Assignment Name *</Label>
                <Input value={assignment.assignmentName} onChange={(e) => setAssignment((a) => ({ ...a, assignmentName: e.target.value }))} placeholder="e.g. Q3 2026 Senior Hires" className={cn("text-sm", triedNext && !assignment.assignmentName.trim() && "border-red-500 ring-1 ring-red-500")} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Hiring Support Type *</Label>
                <Select value={assignment.hiringSupportType} onValueChange={(v) => setAssignment((a) => ({ ...a, hiringSupportType: v }))}>
                  <SelectTrigger className={cn("text-sm h-9", triedNext && !assignment.hiringSupportType && "border-red-500 ring-1 ring-red-500")}><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{HIRING_SUPPORT_TYPES.map((opt) => (<SelectItem key={opt} value={opt} className="text-sm">{opt}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Total Number of Openings *</Label>
                <Input type="number" min={1} value={assignment.totalOpenings} onChange={(e) => setAssignment((a) => ({ ...a, totalOpenings: parseInt(e.target.value) || 1 }))} className="text-sm" />
              </div>
              <div className="col-span-1 sm:col-span-2 space-y-1.5">
                <Label className="text-xs">Hiring Scope Summary</Label>
                <Textarea value={assignment.hiringScopeSummary} onChange={(e) => setAssignment((a) => ({ ...a, hiringScopeSummary: e.target.value }))} placeholder="Brief overview..." rows={2} className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Hiring Entity / Business Unit</Label>
                <Input value={assignment.hiringEntity} onChange={(e) => setAssignment((a) => ({ ...a, hiringEntity: e.target.value }))} placeholder="e.g. Subsidiary name" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Confidentiality Preference</Label>
                <Select value={assignment.confidentialityPreference} onValueChange={(v) => setAssignment((a) => ({ ...a, confidentialityPreference: v }))}>
                  <SelectTrigger className="text-sm h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{CONFIDENTIALITY_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value} className="text-sm">{opt.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Geography / Hiring Market</Label>
                <Input value={assignment.geography} onChange={(e) => setAssignment((a) => ({ ...a, geography: e.target.value }))} placeholder="e.g. Bangladesh, South Asia" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Urgency Level</Label>
                <Select value={assignment.urgencyLevel} onValueChange={(v) => setAssignment((a) => ({ ...a, urgencyLevel: v }))}>
                  <SelectTrigger className="text-sm h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{URGENCY_LEVELS.map((opt) => (<SelectItem key={opt.value} value={opt.value} className="text-sm">{opt.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Target Joining Timeline</Label>
                <Input value={assignment.targetJoiningTimeline} onChange={(e) => setAssignment((a) => ({ ...a, targetJoiningTimeline: e.target.value }))} placeholder="e.g. Within 8 weeks" className="text-sm" />
              </div>
              <div className="col-span-1 sm:col-span-2 space-y-1.5">
                <Label className="text-xs">Internal Notes</Label>
                <Textarea value={assignment.internalNotes} onChange={(e) => setAssignment((a) => ({ ...a, internalNotes: e.target.value }))} placeholder="Notes for LLP's team..." rows={2} className="text-sm" />
              </div>
            </div>
          </>
        )}

        {/* ─── STEP 2: Groups & Roles ───────────────────────────── */}
        {step === 2 && (
          <>
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Layers className="size-4 text-primary" /> Groups & Roles
            </h2>

            {/* Guide prompt */}
            {groupMode === "undecided" && (
              <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-5 space-y-4">
                <p className="text-sm font-medium">
                  Do any positions share the same compensation, benefits, or work setup?
                </p>
                <p className="text-xs text-muted-foreground">
                  Group together positions that share the same package, work setup, or hiring conditions. Only role-specific differences are entered separately.
                </p>
                <div className="flex gap-3">
                  <Button variant="default" size="sm" onClick={handleSharedMode} className="gap-1.5">
                    <Layers className="size-3.5" /> Yes, group positions
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleIndividualMode} className="gap-1.5">
                    No, each role is different
                  </Button>
                </div>
              </div>
            )}

            {/* Group management — shown after choosing mode */}
            {groupMode !== "undecided" && (
              <div className="space-y-4">
                {/* Mode indicator */}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {groupMode === "shared"
                      ? `${groups.length} group${groups.length !== 1 ? "s" : ""} · ${totalRoles} role${totalRoles !== 1 ? "s" : ""} · ${totalRoleOpenings} opening${totalRoleOpenings !== 1 ? "s" : ""}`
                      : `${totalRoles} role${totalRoles !== 1 ? "s" : ""} · ${totalRoleOpenings} opening${totalRoleOpenings !== 1 ? "s" : ""}`}
                  </p>
                  <button
                    type="button"
                    onClick={() => setGroupMode("undecided")}
                    className="text-xs text-primary hover:underline"
                  >
                    Change grouping
                  </button>
                </div>

                {/* Group cards */}
                {groups.map((group, gIdx) => (
                  <div key={group.id} className="rounded-lg border border-border overflow-hidden">
                    {/* Group header */}
                    <div className="bg-muted/30 px-4 py-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setExpandedGroupId(expandedGroupId === group.id ? null : group.id)}
                        className="flex items-center gap-2 min-w-0 flex-1 text-left"
                      >
                        <Package className="size-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <span className="text-sm font-medium truncate block">
                            {group.groupName || `Group ${gIdx + 1}`}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {group.roles.length} role{group.roles.length !== 1 ? "s" : ""}
                            {group.workMode && ` · ${group.workMode}`}
                            {group.monthlySalaryRange && ` · ${group.monthlySalaryRange}`}
                          </span>
                        </div>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => { setEditingGroupId(group.id); setEditingSection("conditions"); }} className="p-1.5 rounded hover:bg-muted transition-colors" title="Edit work setup">
                          <Pencil className="size-3.5 text-muted-foreground" />
                        </button>
                        <button type="button" onClick={() => duplicateGroup(group.id)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Duplicate group">
                          <Copy className="size-3.5 text-muted-foreground" />
                        </button>
                        {groups.length > 1 && (
                          <button type="button" onClick={() => removeGroup(group.id)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Delete group">
                            <Trash2 className="size-3.5 text-muted-foreground hover:text-red-500" />
                          </button>
                        )}
                        {expandedGroupId === group.id ? (
                          <ChevronUp className="size-4 text-muted-foreground ml-1" />
                        ) : (
                          <ChevronDown className="size-4 text-muted-foreground ml-1" />
                        )}
                      </div>
                    </div>

                    {/* Group expanded content */}
                    {expandedGroupId === group.id && (
                      <div className="p-4 space-y-4">
                        {/* Group name + description */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Group Name *</Label>
                            <Input value={group.groupName} onChange={(e) => updateGroup(group.id, "groupName", e.target.value)} placeholder="e.g. Senior Management Team" className={cn("text-sm", triedNext && !group.groupName.trim() && "border-red-500 ring-1 ring-red-500")} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Description</Label>
                            <Input value={group.groupDescription} onChange={(e) => updateGroup(group.id, "groupDescription", e.target.value)} placeholder="Brief description..." className="text-sm" />
                          </div>
                        </div>

                        {/* Quick action buttons */}
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => { setEditingGroupId(group.id); setEditingSection("conditions"); }} className="gap-1 text-xs h-7">
                            <Pencil className="size-3" /> Edit Work Setup
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => { setEditingGroupId(group.id); setEditingSection("compensation"); }} className="gap-1 text-xs h-7">
                            <Pencil className="size-3" /> Edit Compensation
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => { setEditingGroupId(group.id); setEditingSection("attachments"); }} className="gap-1 text-xs h-7">
                            <Paperclip className="size-3" /> Attachments
                            {(group.jdFile || group.rjpFile || group.compensationSheetFile || group.orgChartFile || group.otherDocFiles.length > 0) && (
                              <span className="text-[9px] bg-primary/10 text-primary px-1 rounded">{[group.jdFile, group.rjpFile, group.compensationSheetFile, group.orgChartFile, ...group.otherDocFiles].filter(Boolean).length}</span>
                            )}
                          </Button>
                        </div>

                        {/* Summary of conditions/compensation */}
                        {(group.workMode || group.jobLocation || group.monthlySalaryRange) && (
                          <div className="rounded bg-muted/40 p-3 text-xs space-y-1">
                            {group.workMode && <div className="flex justify-between"><span className="text-muted-foreground">Work Mode</span><span>{group.workMode}</span></div>}
                            {group.jobLocation && <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span>{group.jobLocation}</span></div>}
                            {group.weeklyWorkingDays && <div className="flex justify-between"><span className="text-muted-foreground">Working Days</span><span>{group.weeklyWorkingDays}</span></div>}
                            {group.shiftType && <div className="flex justify-between"><span className="text-muted-foreground">Shift</span><span>{group.shiftType}</span></div>}
                            {group.monthlySalaryRange && <div className="flex justify-between"><span className="text-muted-foreground">Monthly Salary</span><span>{group.monthlySalaryRange}</span></div>}
                            {group.annualCtcRange && <div className="flex justify-between"><span className="text-muted-foreground">Annual CTC</span><span>{group.annualCtcRange}</span></div>}
                            {countEnabledBenefits(group) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Benefits</span><span>{countEnabledBenefits(group)} selected</span></div>}
                          </div>
                        )}

                        {/* Roles in this group */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Roles in this group
                          </h4>
                          {group.roles.map((role, rIdx) => (
                            <RoleCard
                              key={role.id}
                              role={role}
                              index={rIdx}
                              groupId={group.id}
                              group={group}
                              groups={groups}
                              expanded={expandedRoleId === role.id}
                              onToggleExpand={() => setExpandedRoleId(expandedRoleId === role.id ? null : role.id)}
                              onUpdate={(field, value) => updateRole(group.id, role.id, field, value)}
                              onRemove={() => removeRole(group.id, role.id)}
                              onToggleOverride={(fieldKey) => toggleRoleOverride(group.id, role.id, fieldKey)}
                              onMoveToGroup={(targetGroupId) => moveRoleToGroup(role.id, group.id, targetGroupId)}
                              onCreateGroupFromRole={() => createGroupFromRole(role.id, group.id)}
                              showOverride={showOverrideFor === role.id}
                              onToggleOverridePanel={() => setShowOverrideFor(showOverrideFor === role.id ? null : role.id)}
                              canRemove={group.roles.length > 1}
                              canExtract={group.roles.length > 1}
                              triedNext={triedNext}
                            />
                          ))}
                          <Button type="button" variant="ghost" size="sm" onClick={() => addRoleToGroup(group.id)} className="w-full gap-1.5 text-xs h-8 border border-dashed border-border">
                            <Plus className="size-3" /> Add role to this group
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add group button */}
                {groupMode === "shared" && (
                  <Button type="button" variant="outline" onClick={addGroup} className="w-full gap-1.5">
                    <Plus className="size-3.5" /> Add Another Group
                  </Button>
                )}

                {/* For individual mode, just show "Add Another Role" */}
                {groupMode === "individual" && (
                  <Button type="button" variant="outline" onClick={() => {
                    const g = newGroup(`Role ${groups.length + 1}`);
                    setGroups((gs) => [...gs, g]);
                    setExpandedGroupId(g.id);
                  }} className="w-full gap-1.5">
                    <Plus className="size-3.5" /> Add Another Role
                  </Button>
                )}
              </div>
            )}

            {/* Group editor modal (inline) */}
            {editingGroupId && editingSection && (
              <GroupEditor
                group={groups.find((g) => g.id === editingGroupId)!}
                section={editingSection}
                onUpdate={(field, value) => updateGroup(editingGroupId, field, value)}
                onUpdateBenefit={(key, field, value) => updateGroupBenefit(editingGroupId, key, field, value)}
                onClose={() => { setEditingGroupId(null); setEditingSection(null); }}
                openSections={openSections}
                toggleSection={toggleSection}
              />
            )}
          </>
        )}

        {/* ─── STEP 3: Review & Submit ──────────────────────────── */}
        {step === 3 && (
          <>
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Send className="size-4 text-primary" /> Review & Submit
            </h2>

            <div className="space-y-4">
              <ReviewSection title="Company">
                <ReviewRow label="Company" value={company.companyName} />
                <ReviewRow label="Industry" value={company.industry} />
                <ReviewRow label="Contact" value={company.contactName} />
                <ReviewRow label="Email" value={company.workEmail} />
                {company.companyLocation && <ReviewRow label="Location" value={company.companyLocation} />}
              </ReviewSection>

              <ReviewSection title="Assignment">
                <ReviewRow label="Name" value={assignment.assignmentName} />
                <ReviewRow label="Type" value={assignment.hiringSupportType} />
                {assignment.urgencyLevel && <ReviewRow label="Urgency" value={assignment.urgencyLevel} capitalize />}
                {assignment.geography && <ReviewRow label="Geography" value={assignment.geography} />}
                {assignment.targetJoiningTimeline && <ReviewRow label="Timeline" value={assignment.targetJoiningTimeline} />}
              </ReviewSection>

              {/* Groups summary */}
              {groups.map((group, gIdx) => (
                <ReviewSection key={group.id} title={groups.length > 1 ? `Group: ${group.groupName || `#${gIdx + 1}`}` : "Positions"}>
                  {group.workMode && <ReviewRow label="Work Mode" value={group.workMode} />}
                  {group.jobLocation && <ReviewRow label="Location" value={group.jobLocation} />}
                  {group.monthlySalaryRange && <ReviewRow label="Monthly Salary" value={group.monthlySalaryRange} />}
                  {group.annualCtcRange && <ReviewRow label="Annual CTC" value={group.annualCtcRange} />}
                  {countEnabledBenefits(group) > 0 && <ReviewRow label="Benefits" value={`${countEnabledBenefits(group)} benefit(s) selected`} />}
                  {countAttachments(group) > 0 && <ReviewRow label="Attachments" value={`${countAttachments(group)} file(s) attached`} />}

                  <div className="border-t border-border mt-2 pt-2 space-y-1">
                    {group.roles.map((role, rIdx) => (
                      <div key={role.id} className="flex justify-between items-center py-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">
                            <span className="text-muted-foreground">#{rIdx + 1}</span>{" "}
                            {role.roleTitle || "Untitled"}
                          </span>
                          {role.overriddenFields.length > 0 && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 text-amber-600 border-amber-300">
                              custom
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {role.openings} opening{role.openings !== 1 ? "s" : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </ReviewSection>
              ))}

              {/* Totals */}
              <div className="rounded-lg bg-muted/40 p-4">
                <div className="flex justify-between text-sm font-medium">
                  <span>Total Groups</span>
                  <span>{groups.length}</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span>Total Roles</span>
                  <span>{totalRoles}</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span>Total Openings</span>
                  <span>{totalRoleOpenings}</span>
                </div>
              </div>
            </div>

            {/* What happens next */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
              <p className="font-medium mb-1">What happens next?</p>
              <ul className="text-muted-foreground space-y-1 text-xs">
                <li className="flex items-start gap-1.5"><CheckCircle2 className="size-3.5 mt-0.5 text-primary shrink-0" /> LLP will review your request within 1 business day</li>
                <li className="flex items-start gap-1.5"><CheckCircle2 className="size-3.5 mt-0.5 text-primary shrink-0" /> A diagnostic call will finalise role details</li>
                <li className="flex items-start gap-1.5"><CheckCircle2 className="size-3.5 mt-0.5 text-primary shrink-0" /> Once approved, sourcing begins through the LLP scout network</li>
              </ul>
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(s - 1, 0))} disabled={step === 0} className="gap-1.5">
          <ArrowLeft className="size-3.5" /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={handleNext} className="gap-1.5">
            Next <ArrowRight className="size-3.5" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
            <Send className="size-3.5" />
            {submitting ? "Submitting..." : "Submit Hiring Request"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── RoleCard component ───────────────────────────────────────────────────────

function RoleCard({
  role,
  index,
  groupId,
  group,
  groups,
  expanded,
  onToggleExpand,
  onUpdate,
  onRemove,
  onToggleOverride,
  onMoveToGroup,
  onCreateGroupFromRole,
  showOverride,
  onToggleOverridePanel,
  canRemove,
  canExtract,
  triedNext,
}: {
  role: RoleEntry;
  index: number;
  groupId: string;
  group: GroupEntry;
  groups: GroupEntry[];
  expanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (field: string, value: unknown) => void;
  onRemove: () => void;
  onToggleOverride: (fieldKey: string) => void;
  onMoveToGroup: (targetGroupId: string) => void;
  onCreateGroupFromRole: () => void;
  showOverride: boolean;
  onToggleOverridePanel: () => void;
  canRemove: boolean;
  canExtract: boolean;
  triedNext: boolean;
}) {
  const hasOverrides = role.overriddenFields.length > 0;

  return (
    <div className={cn("rounded border bg-card overflow-hidden", hasOverrides && "border-amber-300/50")}>
      {/* Role header */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
          <span className="text-sm truncate">{role.roleTitle || "Untitled Role"}</span>
          {role.openings > 1 && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">x{role.openings}</span>}
          {hasOverrides && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 text-amber-600 border-amber-300 gap-0.5">
              <AlertCircle className="size-2.5" /> custom settings
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {canRemove && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} className="p-1 text-muted-foreground hover:text-red-500 transition-colors">
              <Trash2 className="size-3.5" />
            </button>
          )}
          {expanded ? <ChevronUp className="size-3.5 text-muted-foreground" /> : <ChevronDown className="size-3.5 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-border">
          {/* Role fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="col-span-1 sm:col-span-2 space-y-1.5">
              <Label className="text-xs">Role Title *</Label>
              <Input value={role.roleTitle} onChange={(e) => onUpdate("roleTitle", e.target.value)} placeholder="e.g. Head of Finance" className={cn("text-sm", triedNext && !role.roleTitle.trim() && "border-red-500 ring-1 ring-red-500")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Department / Function</Label>
              <Input value={role.department} onChange={(e) => onUpdate("department", e.target.value)} placeholder="e.g. Finance" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Seniority Level</Label>
              <Select value={role.seniorityLevel} onValueChange={(v) => onUpdate("seniorityLevel", v)}>
                <SelectTrigger className="text-sm h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{SENIORITY_LEVELS.map((opt) => (<SelectItem key={opt} value={opt} className="text-sm">{opt}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Number of Openings *</Label>
              <Input type="number" min={1} value={role.openings} onChange={(e) => onUpdate("openings", parseInt(e.target.value) || 1)} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reporting To</Label>
              <Input value={role.reportingTo} onChange={(e) => onUpdate("reportingTo", e.target.value)} placeholder="e.g. CEO" className="text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Role Summary</Label>
            <Textarea value={role.roleSummary} onChange={(e) => onUpdate("roleSummary", e.target.value)} placeholder="Brief description..." rows={2} className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Must-have Criteria</Label>
            <Textarea value={role.mustHaveCriteria} onChange={(e) => onUpdate("mustHaveCriteria", e.target.value)} placeholder="e.g. CPA certified, 10+ years..." rows={2} className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Good-to-have Criteria</Label>
            <Textarea value={role.goodToHaveCriteria} onChange={(e) => onUpdate("goodToHaveCriteria", e.target.value)} placeholder="e.g. FMCG experience..." rows={2} className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Role-Specific Notes</Label>
            <Textarea value={role.roleNotes} onChange={(e) => onUpdate("roleNotes", e.target.value)} placeholder="Any extra context..." rows={2} className="text-sm" />
          </div>

          {/* Override panel */}
          <div className="border-t border-border pt-3">
            <button type="button" onClick={onToggleOverridePanel} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
              <AlertCircle className="size-3" />
              {showOverride ? "Hide" : "Customise"} work setup / compensation for this role
              {hasOverrides && ` (${role.overriddenFields.length} override${role.overriddenFields.length !== 1 ? "s" : ""})`}
            </button>

            {showOverride && (
              <div className="mt-3 space-y-2 rounded bg-amber-50/50 dark:bg-amber-950/20 p-3 border border-amber-200/50 dark:border-amber-800/30">
                <p className="text-xs text-muted-foreground">
                  Toggle overrides to customise this role&apos;s settings. Unchecked fields inherit from the group.
                </p>
                {OVERRIDE_FIELDS.map(({ key, label }) => {
                  const isOverridden = role.overriddenFields.includes(key);
                  const ovKey = `ov${key.charAt(0).toUpperCase()}${key.slice(1)}` as keyof RoleEntry;
                  const groupValue = (group[key as keyof GroupEntry] as string) || "";
                  return (
                    <div key={key} className="space-y-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={isOverridden} onChange={() => onToggleOverride(key)} className="rounded border-border" />
                        <span className="text-xs">{label}</span>
                        {!isOverridden && groupValue && (
                          <span className="text-xs text-muted-foreground ml-auto">inherited: {groupValue}</span>
                        )}
                      </label>
                      {isOverridden && (
                        <Input
                          value={role[ovKey] as string}
                          onChange={(e) => onUpdate(ovKey, e.target.value)}
                          placeholder={groupValue ? `Group: ${groupValue}` : `Enter ${label.toLowerCase()}...`}
                          className="text-xs h-7 ml-5"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Role actions */}
          <div className="border-t border-border pt-3 flex flex-wrap gap-2">
            {groups.length > 1 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="gap-1 text-xs h-7">
                    <MoveRight className="size-3" /> Move to group
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1" align="start">
                  {groups.filter((g) => g.id !== groupId).map((g, i) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => onMoveToGroup(g.id)}
                      className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted transition-colors truncate"
                    >
                      {g.groupName || `Group ${i + 1}`}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            )}
            {canExtract && (
              <Button type="button" variant="ghost" size="sm" onClick={onCreateGroupFromRole} className="gap-1 text-xs h-7">
                <Plus className="size-3" /> New group from this role
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── GroupEditor (inline modal for editing conditions/compensation) ───────────

function GroupEditor({
  group,
  section,
  onUpdate,
  onUpdateBenefit,
  onClose,
  openSections,
  toggleSection,
}: {
  group: GroupEntry;
  section: "conditions" | "compensation" | "attachments";
  onUpdate: (field: string, value: unknown) => void;
  onUpdateBenefit: (key: string, field: "enabled" | "note", value: boolean | string) => void;
  onClose: () => void;
  openSections: Record<string, boolean>;
  toggleSection: (key: string) => void;
}) {
  const sectionLabel = section === "conditions" ? "Work Setup & Conditions" : section === "compensation" ? "Compensation & Benefits" : "Attachments";

  return (
    <div className="rounded-lg border-2 border-primary/30 bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          {sectionLabel}
          <span className="text-xs text-muted-foreground font-normal ml-2">— {group.groupName}</span>
        </h3>
        <button type="button" onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
          <X className="size-4 text-muted-foreground" />
        </button>
      </div>

      {section === "conditions" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Work Mode</Label>
            <Select value={group.workMode} onValueChange={(v) => onUpdate("workMode", v)}>
              <SelectTrigger className="text-sm h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{WORK_MODES.map((opt) => (<SelectItem key={opt} value={opt} className="text-sm">{opt}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Weekly Working Days</Label>
            <Select value={group.weeklyWorkingDays} onValueChange={(v) => onUpdate("weeklyWorkingDays", v)}>
              <SelectTrigger className="text-sm h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{WEEKLY_DAYS.map((opt) => (<SelectItem key={opt} value={opt} className="text-sm">{opt}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Shift Type</Label>
            <Select value={group.shiftType} onValueChange={(v) => onUpdate("shiftType", v)}>
              <SelectTrigger className="text-sm h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{SHIFT_TYPES.map((opt) => (<SelectItem key={opt} value={opt} className="text-sm">{opt}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Working Hours</Label>
            <Input value={group.workingHours} onChange={(e) => onUpdate("workingHours", e.target.value)} placeholder="e.g. 9 AM – 6 PM" className="text-sm" />
          </div>
          <div className="col-span-1 sm:col-span-2 space-y-1.5">
            <Label className="text-xs">Job Location</Label>
            <Input value={group.jobLocation} onChange={(e) => onUpdate("jobLocation", e.target.value)} placeholder="e.g. Gulshan, Dhaka" className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Travel Requirement</Label>
            <Select value={group.travelRequirement} onValueChange={(v) => onUpdate("travelRequirement", v)}>
              <SelectTrigger className="text-sm h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{TRAVEL_OPTIONS.map((opt) => (<SelectItem key={opt} value={opt} className="text-sm">{opt}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Relocation Support</Label>
            <Select value={group.relocationSupport} onValueChange={(v) => onUpdate("relocationSupport", v)}>
              <SelectTrigger className="text-sm h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{RELOCATION_OPTIONS.map((opt) => (<SelectItem key={opt} value={opt} className="text-sm">{opt}</SelectItem>))}</SelectContent>
            </Select>
          </div>
        </div>
      )}

      {section === "compensation" && (
        <div className="space-y-3">
          <CollapsibleSection title="Compensation" open={openSections.compensation} onToggle={() => toggleSection("compensation")}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Monthly Salary / Range</Label>
                <Input value={group.monthlySalaryRange} onChange={(e) => onUpdate("monthlySalaryRange", e.target.value)} placeholder="e.g. 80,000 – 120,000 BDT" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Annual CTC</Label>
                <Input value={group.annualCtcRange} onChange={(e) => onUpdate("annualCtcRange", e.target.value)} placeholder="e.g. 15 – 20 lakh BDT" className="text-sm" />
              </div>
            </div>
            <BenefitCheckbox label="Variable Pay / Bonus / Incentive" benefit={group.variablePay} onChange={(f, v) => onUpdateBenefit("variablePay", f, v)} />
          </CollapsibleSection>
          <CollapsibleSection title="Allowances" open={openSections.allowances} onToggle={() => toggleSection("allowances")}>
            <BenefitCheckbox label="Cash / Practical Benefits" benefit={group.cashBenefits} onChange={(f, v) => onUpdateBenefit("cashBenefits", f, v)} />
            <BenefitCheckbox label="Transport Support" benefit={group.transportSupport} onChange={(f, v) => onUpdateBenefit("transportSupport", f, v)} />
            <BenefitCheckbox label="Accommodation / Housing Support" benefit={group.accommodationSupport} onChange={(f, v) => onUpdateBenefit("accommodationSupport", f, v)} />
          </CollapsibleSection>
          <CollapsibleSection title="Coverage" open={openSections.coverage} onToggle={() => toggleSection("coverage")}>
            <BenefitCheckbox label="Medical / Health Coverage" benefit={group.medicalCoverage} onChange={(f, v) => onUpdateBenefit("medicalCoverage", f, v)} />
            <BenefitCheckbox label="Life / Accident Protection" benefit={group.lifeAccidentProtection} onChange={(f, v) => onUpdateBenefit("lifeAccidentProtection", f, v)} />
            <BenefitCheckbox label="Retirement / Long-term Benefits" benefit={group.retirementBenefits} onChange={(f, v) => onUpdateBenefit("retirementBenefits", f, v)} />
          </CollapsibleSection>
          <CollapsibleSection title="Others" open={openSections.others} onToggle={() => toggleSection("others")}>
            <BenefitCheckbox label="Leave / Time-off Benefits" benefit={group.leaveBenefits} onChange={(f, v) => onUpdateBenefit("leaveBenefits", f, v)} />
            <BenefitCheckbox label="Learning & Development Support" benefit={group.learningDevelopment} onChange={(f, v) => onUpdateBenefit("learningDevelopment", f, v)} />
            <BenefitCheckbox label="Career Growth / Progression" benefit={group.careerGrowth} onChange={(f, v) => onUpdateBenefit("careerGrowth", f, v)} />
            <div className="space-y-1.5 pt-2">
              <Label className="text-xs">Other Benefits / Selling Points</Label>
              <Textarea value={group.otherBenefits} onChange={(e) => onUpdate("otherBenefits", e.target.value)} placeholder="e.g. Company car, gym..." rows={2} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Internal Notes for LLP Only</Label>
              <Textarea value={group.internalNotes} onChange={(e) => onUpdate("internalNotes", e.target.value)} placeholder="Notes for LLP team..." rows={2} className="text-sm" />
            </div>
          </CollapsibleSection>
        </div>
      )}

      {section === "attachments" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Upload supporting documents for this group. These will be shared with LLP during the diagnostic.
          </p>
          <FileUploadField label="Job Description (JD)" file={group.jdFile} onFileChange={(f) => onUpdate("jdFile", f)} />
          <FileUploadField label="Realistic Job Preview (RJP)" file={group.rjpFile} onFileChange={(f) => onUpdate("rjpFile", f)} />
          <FileUploadField label="Compensation Sheet" file={group.compensationSheetFile} onFileChange={(f) => onUpdate("compensationSheetFile", f)} />
          <FileUploadField label="Organisation Chart" file={group.orgChartFile} onFileChange={(f) => onUpdate("orgChartFile", f)} />
          {/* Other documents — multi-file */}
          <div className="space-y-1.5">
            <Label className="text-xs">Other Documents</Label>
            <label className="flex items-center gap-2 rounded border border-dashed border-border px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors">
              <FileUp className="size-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">Add files...</span>
              <input
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.ppt,.pptx"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0) {
                    onUpdate("otherDocFiles", [...group.otherDocFiles, ...files]);
                  }
                }}
              />
            </label>
            {group.otherDocFiles.length > 0 && (
              <div className="space-y-1">
                {group.otherDocFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1">
                    <span className="truncate">{f.name}</span>
                    <button type="button" onClick={() => onUpdate("otherDocFiles", group.otherDocFiles.filter((_, j) => j !== i))} className="p-0.5 text-muted-foreground hover:text-red-500">
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Button type="button" variant="default" size="sm" onClick={onClose} className="w-full">
        Done
      </Button>
    </div>
  );
}

// ─── Shared Sub-components ────────────────────────────────────────────────────

function SearchableSelect({ value, options, open, onOpenChange, onSelect, placeholder, error }: {
  value: string; options: readonly string[]; open: boolean; onOpenChange: (o: boolean) => void;
  onSelect: (v: string) => void; placeholder: string; error?: boolean;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className={cn("w-full justify-between text-sm h-9 font-normal", error && "border-red-500 ring-1 ring-red-500")}>
          <span className={cn("truncate", !value && "text-muted-foreground")}>{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder} className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty className="py-3 text-xs text-center text-muted-foreground">No match.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem key={opt} value={opt} onSelect={(val) => { onSelect(val === value ? "" : val); onOpenChange(false); }} className="text-xs">
                  <Check className={cn("mr-2 size-3.5", value === opt ? "opacity-100" : "opacity-0")} />
                  {opt}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function CollapsibleSection({ title, open, onToggle, children }: {
  title: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors">
        <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
        {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 py-3 space-y-3">{children}</div>}
    </div>
  );
}

function BenefitCheckbox({ label, benefit, onChange }: {
  label: string; benefit: BenefitField; onChange: (field: "enabled" | "note", value: boolean | string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={benefit.enabled} onChange={(e) => onChange("enabled", e.target.checked)} className="rounded border-border" />
        <span className="text-xs">{label}</span>
      </label>
      {benefit.enabled && (
        <Input value={benefit.note} onChange={(e) => onChange("note", e.target.value)} placeholder="Details (optional)..." className="text-xs h-8 ml-6" />
      )}
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode; }) {
  return (
    <div className="rounded-lg bg-muted/40 p-4 space-y-1">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{title}</h3>
      {children}
    </div>
  );
}

function ReviewRow({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean; }) {
  if (!value) return null;
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium", capitalize && "capitalize")}>{value}</span>
    </div>
  );
}

function countEnabledBenefits(group: GroupEntry): number {
  const keys: (keyof GroupEntry)[] = [
    "variablePay", "cashBenefits", "transportSupport", "accommodationSupport",
    "medicalCoverage", "lifeAccidentProtection", "retirementBenefits",
    "leaveBenefits", "learningDevelopment", "careerGrowth",
  ];
  return keys.filter((k) => (group[k] as BenefitField)?.enabled).length;
}

function countAttachments(group: GroupEntry): number {
  return [group.jdFile, group.rjpFile, group.compensationSheetFile, group.orgChartFile, ...group.otherDocFiles].filter(Boolean).length;
}

function FileUploadField({ label, file, onFileChange }: {
  label: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <label className={cn(
          "flex-1 flex items-center gap-2 rounded border border-dashed border-border px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors",
          file && "border-primary/30 bg-primary/5"
        )}>
          <FileUp className="size-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground truncate">
            {file ? file.name : "Choose file..."}
          </span>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          />
        </label>
        {file && (
          <button
            type="button"
            onClick={() => onFileChange(null)}
            className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
