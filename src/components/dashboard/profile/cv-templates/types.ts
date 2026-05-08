export interface CvTemplateProps {
  profile: {
    fullName: string;
    email: string;
    phone?: string;
    headline: string;
    city: string;
    country?: string;
    linkedin?: string;
    portfolio?: string;
    summary: string;
    photoUrl?: string;
  };
  experiences: Array<{
    title: string;
    company: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    isCurrent: boolean;
    description: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    fieldOfStudy?: string;
    year?: string;
  }>;
  skills: Array<{
    name: string;
    yearsOfExperience?: number;
  }>;
  certifications: Array<{
    name: string;
    org?: string;
    year?: string;
  }>;
  languages?: Array<{
    name: string;
    proficiency?: string;
  }>;
  accentColor?: string;
}

export type CvTemplateName =
  | "professional"
  | "modern"
  | "minimal"
  | "executive"
  | "boardroom"
  | "diplomat"
  | "canvas"
  | "vibrant"
  | "portfolio"
  | "terminal"
  | "blueprint"
  | "stack"
  | "scholar"
  | "thesis";

export type CvTemplateCategory =
  | "all"
  | "classic"
  | "corporate"
  | "creative"
  | "tech"
  | "academic";

export interface EnhancedProfile {
  summary: string;
  enhancedBio: string;
  enhancedExperiences: Array<{
    title: string;
    company: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    isCurrent: boolean;
    description: string;
  }>;
  enhancedSkills: Array<{
    name: string;
    yearsOfExperience?: number;
  }>;
}
