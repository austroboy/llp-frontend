"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Logo } from "@/components/ui/logo";
import { Sparkles } from "lucide-react";

const LAUNCH_DATE = new Date("2026-05-01T00:00:00+06:00");

const features = [
  "AI-powered Bangladesh labour law search across the full Act, amendments & rules",
  "Compliance diagnostics, documentation packs & PF/Gratuity setup",
  "Expatriate & visa processing with expert oversight",
  "HR & people solutions — from policy drafting to dispute resolution",
  "Licensing & regulatory guidance for trade, factory & environmental permits",
  "Multilingual support in English and Bangla (বাংলা)",
  "Direct access to verified legal and HR experts",
];

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  const display = String(value).padStart(2, "0");
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-[52px] h-[52px] rounded-xl bg-primary/8 border border-primary/15 overflow-hidden flex items-center justify-center">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={display}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="absolute font-mono text-xl font-bold tabular-nums text-foreground"
          >
            {display}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
        {label}
      </span>
    </div>
  );
}

export function LaunchTeaserModal() {
  const [open, setOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    setOpen(new Date() < LAUNCH_DATE);
  }, []);

  useEffect(() => {
    if (!open) return;

    const calc = (): TimeLeft | null => {
      const diff = LAUNCH_DATE.getTime() - Date.now();
      if (diff <= 0) return null;
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      };
    };

    setTimeLeft(calc());
    const timer = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(timer);
  }, [open]);

  if (!open) return null;

  return (
    <DialogPrimitive.Root open={open}>
      <DialogPrimitive.Portal>
        {/* Overlay at z-40 — header (z-50) stays accessible above */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-md" />
        <DialogPrimitive.Content
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          className="fixed inset-0 z-40 flex items-center justify-center p-4 pt-20 sm:p-8 sm:pt-24"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border/60 bg-background shadow-2xl ring-1 ring-black/5 dark:ring-white/5"
          >
            {/* Top gradient accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/70 to-accent" />

            {/* Radial glow */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,hsl(var(--primary)/0.07),transparent)]" />

            <div className="relative px-6 pb-7 pt-6 sm:px-8">
              {/* Header row: logo + badge */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                    <Logo className="size-5" />
                  </div>
                  <p className="font-semibold text-sm text-foreground">Labor Law Partner</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
                  <Sparkles className="size-3" />
                  Coming Soon
                </span>
              </div>

              {/* Title */}
              <DialogPrimitive.Title asChild>
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-[28px] leading-snug"
                >
                  Launching May 1<sup className="text-base align-super">st</sup>, 2026
                </motion.h2>
              </DialogPrimitive.Title>

              {/* Description */}
              <DialogPrimitive.Description asChild>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="mt-2 text-sm leading-relaxed text-muted-foreground"
                >
                  Bangladesh&apos;s first AI-powered legal compliance platform — built for HR
                  professionals, employers, and legal practitioners who need fast, reliable
                  answers from official labour law documents.
                </motion.p>
              </DialogPrimitive.Description>

              {/* Countdown timer */}
              {timeLeft && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28, duration: 0.4 }}
                  className="mt-5 flex items-end justify-center gap-2 sm:gap-3"
                >
                  <CountdownUnit value={timeLeft.days} label="Days" />
                  <span className="mb-7 text-lg font-bold text-primary/30 leading-none">:</span>
                  <CountdownUnit value={timeLeft.hours} label="Hours" />
                  <span className="mb-7 text-lg font-bold text-primary/30 leading-none">:</span>
                  <CountdownUnit value={timeLeft.minutes} label="Min" />
                  <span className="mb-7 text-lg font-bold text-primary/30 leading-none">:</span>
                  <CountdownUnit value={timeLeft.seconds} label="Sec" />
                </motion.div>
              )}

              {/* Divider */}
              <div className="my-4 h-px bg-border/50" />

              {/* Feature list */}
              <motion.ul
                initial="hidden"
                animate="visible"
                variants={{
                  visible: {
                    transition: { staggerChildren: 0.055, delayChildren: 0.42 },
                  },
                }}
                className="space-y-2"
              >
                {features.map((f) => (
                  <motion.li
                    key={f}
                    variants={{
                      hidden: { opacity: 0, x: -6 },
                      visible: { opacity: 1, x: 0 },
                    }}
                    className="flex items-start gap-2.5 text-[13px] leading-snug text-foreground/75 sm:text-sm"
                  >
                    <span className="mt-[5px] block size-1.5 shrink-0 rounded-full bg-primary/50" />
                    {f}
                  </motion.li>
                ))}
              </motion.ul>

              {/* Tagline */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.0, duration: 0.5 }}
                className="mt-5 text-center text-[11px] font-medium uppercase tracking-widest text-primary/40"
              >
                Stay tuned — something exceptional is coming
              </motion.p>
            </div>
          </motion.div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
