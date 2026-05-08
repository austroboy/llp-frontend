import {
  Star,
  Zap,
  Trophy,
  Heart,
  Crown,
  ShieldCheck,
  Rocket,
  GraduationCap,
  Lightbulb,
  BadgeCheck,
  Gem,
  Medal,
  Flame,
  Target,
  Sparkles,
  Globe,
  BookOpen,
  Handshake,
  Users,
  Scale,
  Gavel,
  Brain,
  Blocks,
  Cog,
  Hammer,
  Waypoints,
  CircleDot,
  Compass,
  Eye,
  Leaf,
  type LucideIcon,
} from "lucide-react";

// --- Icon registry ---

export const BADGE_ICON_MAP: Record<string, { icon: LucideIcon; label: string }> = {
  Star:          { icon: Star,          label: "Star" },
  Zap:           { icon: Zap,           label: "Zap" },
  Trophy:        { icon: Trophy,        label: "Trophy" },
  Heart:         { icon: Heart,         label: "Heart" },
  Crown:         { icon: Crown,         label: "Crown" },
  ShieldCheck:   { icon: ShieldCheck,   label: "Shield Check" },
  Rocket:        { icon: Rocket,        label: "Rocket" },
  GraduationCap: { icon: GraduationCap, label: "Graduation Cap" },
  Lightbulb:     { icon: Lightbulb,     label: "Lightbulb" },
  BadgeCheck:    { icon: BadgeCheck,     label: "Badge Check" },
  Gem:           { icon: Gem,           label: "Gem" },
  Medal:         { icon: Medal,         label: "Medal" },
  Flame:         { icon: Flame,         label: "Flame" },
  Target:        { icon: Target,        label: "Target" },
  Sparkles:      { icon: Sparkles,      label: "Sparkles" },
  Globe:         { icon: Globe,         label: "Globe" },
  BookOpen:      { icon: BookOpen,      label: "Book" },
  Handshake:     { icon: Handshake,     label: "Handshake" },
  Users:         { icon: Users,         label: "Users" },
  Scale:         { icon: Scale,         label: "Scale" },
  Gavel:         { icon: Gavel,         label: "Gavel" },
  Brain:         { icon: Brain,         label: "Brain" },
  Blocks:        { icon: Blocks,        label: "Blocks" },
  Cog:           { icon: Cog,           label: "Cog" },
  Hammer:        { icon: Hammer,        label: "Hammer" },
  Waypoints:     { icon: Waypoints,     label: "Waypoints" },
  CircleDot:     { icon: CircleDot,     label: "Circle Dot" },
  Compass:       { icon: Compass,       label: "Compass" },
  Eye:           { icon: Eye,           label: "Eye" },
  Leaf:          { icon: Leaf,          label: "Leaf" },
};

export const BADGE_ICON_NAMES = Object.keys(BADGE_ICON_MAP);

// --- Badge config (predefined badges with default icons) ---

export const BADGE_CONFIG: Record<string, { label: string; color: string; defaultIcon: string }> = {
  top_rated: {
    label: "Top Rated",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    defaultIcon: "Star",
  },
  quick_responder: {
    label: "Quick Responder",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    defaultIcon: "Zap",
  },
  ten_sessions: {
    label: "10+ Sessions",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    defaultIcon: "Trophy",
  },
  repeat_clients: {
    label: "Repeat Clients",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    defaultIcon: "Heart",
  },
};

export function getBadgeDisplay(badge: string) {
  if (BADGE_CONFIG[badge]) {
    return {
      label: BADGE_CONFIG[badge].label,
      color: BADGE_CONFIG[badge].color,
      defaultIcon: BADGE_CONFIG[badge].defaultIcon,
    };
  }
  return {
    label: badge,
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    defaultIcon: undefined,
  };
}

/** Resolve the icon component for a badge. Uses explicit icon if set, falls back to predefined default. */
export function getBadgeIcon(badge: string, icon?: string): LucideIcon | undefined {
  const iconName = icon || BADGE_CONFIG[badge]?.defaultIcon;
  if (iconName && BADGE_ICON_MAP[iconName]) {
    return BADGE_ICON_MAP[iconName].icon;
  }
  return undefined;
}
