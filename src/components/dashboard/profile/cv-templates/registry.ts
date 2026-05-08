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
import type { CvTemplateName, CvTemplateCategory } from "./types";

export interface TemplateRegistryEntry {
  id: CvTemplateName;
  category: CvTemplateCategory;
  icon: typeof FileText;
  labelKey: string;
  descKey: string;
  defaultAccent: string;
  layout: "single" | "two-column" | "hybrid";
}

export const TEMPLATE_REGISTRY: TemplateRegistryEntry[] = [
  // Classic
  {
    id: "professional",
    category: "classic",
    icon: FileText,
    labelKey: "cv.generator.templateProfessional",
    descKey: "cv.generator.templateProfessionalDesc",
    defaultAccent: "#1e293b",
    layout: "single",
  },
  {
    id: "modern",
    category: "classic",
    icon: Columns2,
    labelKey: "cv.generator.templateModern",
    descKey: "cv.generator.templateModernDesc",
    defaultAccent: "#2563eb",
    layout: "two-column",
  },
  {
    id: "minimal",
    category: "classic",
    icon: Minus,
    labelKey: "cv.generator.templateMinimal",
    descKey: "cv.generator.templateMinimalDesc",
    defaultAccent: "#111827",
    layout: "single",
  },
  // Corporate/Executive
  {
    id: "executive",
    category: "corporate",
    icon: Crown,
    labelKey: "cv.generator.templateExecutive",
    descKey: "cv.generator.templateExecutiveDesc",
    defaultAccent: "#b8860b",
    layout: "single",
  },
  {
    id: "boardroom",
    category: "corporate",
    icon: Building2,
    labelKey: "cv.generator.templateBoardroom",
    descKey: "cv.generator.templateBoardroomDesc",
    defaultAccent: "#1a1a2e",
    layout: "single",
  },
  {
    id: "diplomat",
    category: "corporate",
    icon: Landmark,
    labelKey: "cv.generator.templateDiplomat",
    descKey: "cv.generator.templateDiplomatDesc",
    defaultAccent: "#2d3748",
    layout: "single",
  },
  // Creative/Design
  {
    id: "canvas",
    category: "creative",
    icon: Palette,
    labelKey: "cv.generator.templateCanvas",
    descKey: "cv.generator.templateCanvasDesc",
    defaultAccent: "#7c3aed",
    layout: "two-column",
  },
  {
    id: "vibrant",
    category: "creative",
    icon: Flame,
    labelKey: "cv.generator.templateVibrant",
    descKey: "cv.generator.templateVibrantDesc",
    defaultAccent: "#dc2626",
    layout: "single",
  },
  {
    id: "portfolio",
    category: "creative",
    icon: LayoutGrid,
    labelKey: "cv.generator.templatePortfolio",
    descKey: "cv.generator.templatePortfolioDesc",
    defaultAccent: "#059669",
    layout: "single",
  },
  // Tech/Developer
  {
    id: "terminal",
    category: "tech",
    icon: TerminalSquare,
    labelKey: "cv.generator.templateTerminal",
    descKey: "cv.generator.templateTerminalDesc",
    defaultAccent: "#22c55e",
    layout: "single",
  },
  {
    id: "blueprint",
    category: "tech",
    icon: Grid3X3,
    labelKey: "cv.generator.templateBlueprint",
    descKey: "cv.generator.templateBlueprintDesc",
    defaultAccent: "#0284c7",
    layout: "two-column",
  },
  {
    id: "stack",
    category: "tech",
    icon: Layers,
    labelKey: "cv.generator.templateStack",
    descKey: "cv.generator.templateStackDesc",
    defaultAccent: "#6366f1",
    layout: "two-column",
  },
  // Academic/Research
  {
    id: "scholar",
    category: "academic",
    icon: GraduationCap,
    labelKey: "cv.generator.templateScholar",
    descKey: "cv.generator.templateScholarDesc",
    defaultAccent: "#7c2d12",
    layout: "single",
  },
  {
    id: "thesis",
    category: "academic",
    icon: BookOpen,
    labelKey: "cv.generator.templateThesis",
    descKey: "cv.generator.templateThesisDesc",
    defaultAccent: "#1e40af",
    layout: "hybrid",
  },
];

export const TEMPLATE_CATEGORIES: {
  id: CvTemplateCategory;
  labelKey: string;
}[] = [
  { id: "all", labelKey: "cv.generator.categoryAll" },
  { id: "classic", labelKey: "cv.generator.categoryClassic" },
  { id: "corporate", labelKey: "cv.generator.categoryCorporate" },
  { id: "creative", labelKey: "cv.generator.categoryCreative" },
  { id: "tech", labelKey: "cv.generator.categoryTech" },
  { id: "academic", labelKey: "cv.generator.categoryAcademic" },
];

export function getDefaultAccent(templateId: CvTemplateName): string {
  return (
    TEMPLATE_REGISTRY.find((t) => t.id === templateId)?.defaultAccent ??
    "#1e293b"
  );
}
