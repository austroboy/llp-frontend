export interface CoverLetterContent {
  recipientName?: string;
  companyAddress?: string;
  opening: string;
  body: string;
  closing: string;
  signoff: string;
}

export interface CoverLetterTemplateProps {
  content: CoverLetterContent;
  profile: {
    fullName: string;
    email: string;
    phone?: string;
    city?: string;
    country?: string;
    linkedin?: string;
    portfolio?: string;
    headline: string;
  };
  jobTitle: string;
  companyName: string;
  accentColor: string;
  signatureUrl?: string;
}

export type CoverLetterTemplateName =
  | "cl-professional"
  | "cl-modern"
  | "cl-minimal"
  | "cl-executive"
  | "cl-boardroom"
  | "cl-diplomat"
  | "cl-canvas"
  | "cl-vibrant"
  | "cl-portfolio"
  | "cl-terminal"
  | "cl-blueprint"
  | "cl-stack"
  | "cl-scholar"
  | "cl-thesis";

export type CoverLetterCategory =
  | "all"
  | "classic"
  | "corporate"
  | "creative"
  | "tech"
  | "academic";
