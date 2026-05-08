import {
  BanknoteIcon,
  CalendarIcon,
  UserXIcon,
  BabyIcon,
  ClockIcon,
  ShieldIcon,
  ScaleIcon,
  GavelIcon,
  FileTextIcon,
  AlertTriangleIcon,
  BriefcaseIcon,
  CalculatorIcon,
  type LucideIcon,
} from "lucide-react";

export interface Suggestion {
  id: string;
  translationKey: string;
  icon: LucideIcon;
}

export const suggestions: Suggestion[] = [
  { id: "wages", translationKey: "suggestion.wages", icon: BanknoteIcon },
  { id: "leave", translationKey: "suggestion.leave", icon: CalendarIcon },
  { id: "termination", translationKey: "suggestion.termination", icon: UserXIcon },
  { id: "maternity", translationKey: "suggestion.maternity", icon: BabyIcon },
  { id: "overtime", translationKey: "suggestion.overtime", icon: ClockIcon },
  { id: "safety", translationKey: "suggestion.safety", icon: ShieldIcon },
  { id: "probation", translationKey: "suggestion.probation", icon: BriefcaseIcon },
  { id: "workingHours", translationKey: "suggestion.workingHours", icon: ClockIcon },
  { id: "dismissalVsTermination", translationKey: "suggestion.dismissalVsTermination", icon: ScaleIcon },
  { id: "gratuity", translationKey: "suggestion.gratuity", icon: CalculatorIcon },
  { id: "misconduct", translationKey: "suggestion.misconduct", icon: AlertTriangleIcon },
  { id: "registers", translationKey: "suggestion.registers", icon: FileTextIcon },
  { id: "courtDisputes", translationKey: "suggestion.courtDisputes", icon: GavelIcon },
  { id: "noticePay", translationKey: "suggestion.noticePay", icon: BanknoteIcon },
];
