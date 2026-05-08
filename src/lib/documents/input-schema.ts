// Per-doc-type required-input schema for the document builder UI.
// The chat UI renders a form from this schema before calling generateDocument().
// Fields listed here are what the generator expects inside userInputs.

import type { DocType } from "./types";

export interface InputField {
  /** key used inside userInputs record */
  field: string;
  /** English label for the form control */
  label: string;
  /** Bangla label for the form control */
  labelBn: string;
  /** UI control hint */
  type: "text" | "date" | "textarea" | "select";
  /** Whether the field must be provided before generation */
  required: boolean;
  /** For type === "select": the allowed option values */
  options?: string[];
}

export const DOC_INPUT_SCHEMA: Record<DocType, InputField[]> = {
  "termination-notice": [
    {
      field: "employeeName",
      label: "Employee Name",
      labelBn: "কর্মীর নাম",
      type: "text",
      required: true,
    },
    {
      field: "employeeDesignation",
      label: "Designation",
      labelBn: "পদবী",
      type: "text",
      required: true,
    },
    {
      field: "employerCompany",
      label: "Employer / Company",
      labelBn: "নিয়োগকারী / প্রতিষ্ঠান",
      type: "text",
      required: true,
    },
    {
      field: "terminationDate",
      label: "Effective Termination Date",
      labelBn: "চাকরিচ্যুতি কার্যকর তারিখ",
      type: "date",
      required: true,
    },
    {
      field: "noticeStartDate",
      label: "Notice Issue Date",
      labelBn: "নোটিশ জারির তারিখ",
      type: "date",
      required: true,
    },
    {
      field: "reason",
      label: "Reason",
      labelBn: "কারণ",
      type: "select",
      required: true,
      options: ["retrenchment", "end-of-contract", "performance", "mutual"],
    },
    {
      field: "noticePeriodDays",
      label: "Notice Period (days)",
      labelBn: "নোটিশের মেয়াদ (দিন)",
      type: "text",
      required: true,
    },
  ],

  "grievance-letter": [
    {
      field: "workerName",
      label: "Worker Name",
      labelBn: "কর্মীর নাম",
      type: "text",
      required: true,
    },
    {
      field: "employerCompany",
      label: "Employer / Company",
      labelBn: "নিয়োগকারী / প্রতিষ্ঠান",
      type: "text",
      required: true,
    },
    {
      field: "grievanceDate",
      label: "Grievance Date",
      labelBn: "অভিযোগের তারিখ",
      type: "date",
      required: true,
    },
    {
      field: "issueDescription",
      label: "Issue Description",
      labelBn: "বিষয়ের বিবরণ",
      type: "textarea",
      required: true,
    },
    {
      field: "reliefSought",
      label: "Relief Sought",
      labelBn: "প্রার্থিত প্রতিকার",
      type: "textarea",
      required: true,
    },
  ],

  "show-cause-notice": [
    {
      field: "employeeName",
      label: "Employee Name",
      labelBn: "কর্মীর নাম",
      type: "text",
      required: true,
    },
    {
      field: "employerCompany",
      label: "Employer / Company",
      labelBn: "নিয়োগকারী / প্রতিষ্ঠান",
      type: "text",
      required: true,
    },
    {
      field: "allegationDate",
      label: "Date of Alleged Incident",
      labelBn: "অভিযুক্ত ঘটনার তারিখ",
      type: "date",
      required: true,
    },
    {
      field: "allegation",
      label: "Allegation / Misconduct",
      labelBn: "অভিযোগ / অসদাচরণ",
      type: "textarea",
      required: true,
    },
    {
      field: "responseDeadline",
      label: "Response Deadline",
      labelBn: "জবাব দেওয়ার শেষ তারিখ",
      type: "date",
      required: true,
    },
  ],

  "leave-application": [
    {
      field: "workerName",
      label: "Worker Name",
      labelBn: "কর্মীর নাম",
      type: "text",
      required: true,
    },
    {
      field: "employerCompany",
      label: "Employer / Company",
      labelBn: "নিয়োগকারী / প্রতিষ্ঠান",
      type: "text",
      required: true,
    },
    {
      field: "leaveType",
      label: "Leave Type",
      labelBn: "ছুটির ধরন",
      type: "select",
      required: true,
      options: ["annual", "sick", "casual", "festival", "maternity"],
    },
    {
      field: "fromDate",
      label: "From Date",
      labelBn: "শুরুর তারিখ",
      type: "date",
      required: true,
    },
    {
      field: "toDate",
      label: "To Date",
      labelBn: "শেষের তারিখ",
      type: "date",
      required: true,
    },
    {
      field: "reason",
      label: "Reason",
      labelBn: "কারণ",
      type: "textarea",
      required: true,
    },
  ],

  "domestic-worker-contract": [
    {
      field: "workerName",
      label: "Worker Name",
      labelBn: "কর্মীর নাম",
      type: "text",
      required: true,
    },
    {
      field: "employerName",
      label: "Employer Name",
      labelBn: "নিয়োগকারীর নাম",
      type: "text",
      required: true,
    },
    {
      field: "employerAddress",
      label: "Employer Address",
      labelBn: "নিয়োগকারীর ঠিকানা",
      type: "textarea",
      required: true,
    },
    {
      field: "startDate",
      label: "Contract Start Date",
      labelBn: "চুক্তি শুরুর তারিখ",
      type: "date",
      required: true,
    },
    {
      field: "dutiesDescription",
      label: "Duties / Scope of Work",
      labelBn: "দায়িত্ব / কাজের পরিধি",
      type: "textarea",
      required: true,
    },
    {
      field: "monthlyWage",
      label: "Monthly Wage (BDT)",
      labelBn: "মাসিক মজুরি (টাকা)",
      type: "text",
      required: true,
    },
    {
      field: "workingHours",
      label: "Working Hours per Day",
      labelBn: "দৈনিক কাজের সময়",
      type: "text",
      required: true,
    },
    {
      field: "termsOfNotice",
      label: "Notice Terms on Termination",
      labelBn: "চাকরিচ্যুতির নোটিশ শর্ত",
      type: "textarea",
      required: true,
    },
  ],

  // ─── Stubs — fill out later ──────────────────────────────────────
  "defense-reply": [],
  "resignation-letter": [],
  "salary-complaint": [],
  "maternity-leave-application": [],
  "appointment-letter": [],
  "service-certificate": [],
  "forced-labour-self-audit": [],
  "harassment-committee-sop": [],
  "equal-pay-audit": [],
  "pragati-opt-in-notice": [],
};

/**
 * Return the list of required field keys for a given doc type.
 * Empty array means the doc type is stubbed — no validation enforced.
 */
export function getRequiredFields(docType: DocType): string[] {
  return DOC_INPUT_SCHEMA[docType]
    .filter((f) => f.required)
    .map((f) => f.field);
}
