"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, UserCheck, Headset, Network, GraduationCap, FileText } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";

const modules = [
  { key: "home.strip.aiSearch", href: "/sign-in", icon: Search },
  { key: "home.strip.experts", href: "/experts", icon: UserCheck },
  { key: "home.strip.services", href: "/services", icon: Headset },
  { key: "home.strip.headhunting", href: "/headhunting", icon: Network },
  { key: "home.strip.academy", href: "/academy", icon: GraduationCap },
  { key: "home.strip.resources", href: "/resources", icon: FileText },
] as const;

export function UniverseDock() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return null; // Temporarily hidden globally

  return (
    <motion.nav
      className="fixed right-0 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col items-center gap-1 py-3 px-1.5 rounded-l-xl border border-r-0 border-border/60 bg-background/80 backdrop-blur-lg shadow-lg"
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: "circOut", delay: 0.3 }}
      aria-label="Platform navigation"
    >
      <div className="text-[9px] font-semibold tracking-widest uppercase text-muted-foreground/50 mb-1 [writing-mode:vertical-rl]">
        LLP
      </div>

      {modules.map(({ key, href, icon: Icon }, i) => {
        const isActive = pathname !== "/" && pathname.startsWith(href.replace("/sign-in", "/chat"));
        const isHovered = hoveredIndex === i;

        return (
          <div
            key={key}
            className="relative"
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <Link
              href={href}
              className={cn(
                "flex items-center justify-center size-10 rounded-lg transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="size-4" strokeWidth={isHovered ? 2.5 : 2} />
            </Link>

            {/* Tooltip — slides out left */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  className="absolute right-full top-1/2 -translate-y-1/2 mr-2 flex items-center pointer-events-none"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.15 }}
                >
                  <span
                    className={cn(
                      "whitespace-nowrap px-2.5 py-1 rounded-md text-xs font-medium shadow-md border",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border"
                    )}
                  >
                    {t(key)}
                  </span>
                  {/* Connector */}
                  <div className={cn(
                    "h-[2px] w-2",
                    isActive ? "bg-primary" : "bg-border"
                  )} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </motion.nav>
  );
}
