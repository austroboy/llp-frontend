import {
  FileText,
  Columns2,
  Minus,
  Crown,
  Building2,
  Landmark,
  Palette,
  Flame,
  LayoutGrid,
  TerminalSquare,
  Grid3X3,
  Layers,
  GraduationCap,
  BookOpen,
} from "lucide-react";
import type { CoverLetterTemplateName, CoverLetterCategory } from "./types";

export interface CLTemplateRegistryEntry {
  id: CoverLetterTemplateName;
  category: CoverLetterCategory;
  icon: typeof FileText;
  labelKey: string;
  descKey: string;
  defaultAccent: string;
}

export const CL_TEMPLATE_REGISTRY: CLTemplateRegistryEntry[] = [
  // Classic
  {
    id: "cl-professional",
    category: "classic",
    icon: FileText,
    labelKey: "cl.generator.templateProfessional",
    descKey: "cl.generator.templateProfessionalDesc",
    defaultAccent: "#1e293b",
  },
  {
    id: "cl-modern",
    category: "classic",
    icon: Columns2,
    labelKey: "cl.generator.templateModern",
    descKey: "cl.generator.templateModernDesc",
    defaultAccent: "#2563eb",
  },
  {
    id: "cl-minimal",
    category: "classic",
    icon: Minus,
    labelKey: "cl.generator.templateMinimal",
    descKey: "cl.generator.templateMinimalDesc",
    defaultAccent: "#111827",
  },
  // Corporate/Executive
  {
    id: "cl-executive",
    category: "corporate",
    icon: Crown,
    labelKey: "cl.generator.templateExecutive",
    descKey: "cl.generator.templateExecutiveDesc",
    defaultAccent: "#b8860b",
  },
  {
    id: "cl-boardroom",
    category: "corporate",
    icon: Building2,
    labelKey: "cl.generator.templateBoardroom",
    descKey: "cl.generator.templateBoardroomDesc",
    defaultAccent: "#1a1a2e",
  },
  {
    id: "cl-diplomat",
    category: "corporate",
    icon: Landmark,
    labelKey: "cl.generator.templateDiplomat",
    descKey: "cl.generator.templateDiplomatDesc",
    defaultAccent: "#2d3748",
  },
  // Creative/Design
  {
    id: "cl-canvas",
    category: "creative",
    icon: Palette,
    labelKey: "cl.generator.templateCanvas",
    descKey: "cl.generator.templateCanvasDesc",
    defaultAccent: "#7c3aed",
  },
  {
    id: "cl-vibrant",
    category: "creative",
    icon: Flame,
    labelKey: "cl.generator.templateVibrant",
    descKey: "cl.generator.templateVibrantDesc",
    defaultAccent: "#dc2626",
  },
  {
    id: "cl-portfolio",
    category: "creative",
    icon: LayoutGrid,
    labelKey: "cl.generator.templatePortfolio",
    descKey: "cl.generator.templatePortfolioDesc",
    defaultAccent: "#059669",
  },
  // Tech/Developer
  {
    id: "cl-terminal",
    category: "tech",
    icon: TerminalSquare,
    labelKey: "cl.generator.templateTerminal",
    descKey: "cl.generator.templateTerminalDesc",
    defaultAccent: "#22c55e",
  },
  {
    id: "cl-blueprint",
    category: "tech",
    icon: Grid3X3,
    labelKey: "cl.generator.templateBlueprint",
    descKey: "cl.generator.templateBlueprintDesc",
    defaultAccent: "#0284c7",
  },
  {
    id: "cl-stack",
    category: "tech",
    icon: Layers,
    labelKey: "cl.generator.templateStack",
    descKey: "cl.generator.templateStackDesc",
    defaultAccent: "#6366f1",
  },
  // Academic/Research
  {
    id: "cl-scholar",
    category: "academic",
    icon: GraduationCap,
    labelKey: "cl.generator.templateScholar",
    descKey: "cl.generator.templateScholarDesc",
    defaultAccent: "#7c2d12",
  },
  {
    id: "cl-thesis",
    category: "academic",
    icon: BookOpen,
    labelKey: "cl.generator.templateThesis",
    descKey: "cl.generator.templateThesisDesc",
    defaultAccent: "#1e40af",
  },
];

export const CL_TEMPLATE_CATEGORIES: {
  id: CoverLetterCategory;
  labelKey: string;
}[] = [
  { id: "all", labelKey: "cl.generator.categoryAll" },
  { id: "classic", labelKey: "cl.generator.categoryClassic" },
  { id: "corporate", labelKey: "cl.generator.categoryCorporate" },
  { id: "creative", labelKey: "cl.generator.categoryCreative" },
  { id: "tech", labelKey: "cl.generator.categoryTech" },
  { id: "academic", labelKey: "cl.generator.categoryAcademic" },
];

export function getCLDefaultAccent(
  templateId: CoverLetterTemplateName
): string {
  return (
    CL_TEMPLATE_REGISTRY.find((t) => t.id === templateId)?.defaultAccent ??
    "#1e293b"
  );
}
