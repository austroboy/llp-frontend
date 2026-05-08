"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Search, ShieldCheck, Scale, Layers3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const features = [
  {
    icon: Search,
    title: "Smart Search",
    text: "Find labour law and compliance answers with less friction.",
  },
  {
    icon: ShieldCheck,
    title: "Trust Layer",
    text: "Structured outputs designed to feel clear and responsible.",
  },
  {
    icon: Layers3,
    title: "Ecosystem Ready",
    text: "Search, academy, services, and marketplace in one direction.",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
};

export default function LLPGreenThemeLandingPage() {
  const [backgroundMode, setBackgroundMode] = React.useState("paper");

  const theme =
    backgroundMode === "paper"
      ? {
          modeLabel: "Paper Theme",
          page: "#F6F1E8",
          pageGradient:
            "radial-gradient(circle at 10% 8%, rgba(167,215,197,0.14), transparent 20%), radial-gradient(circle at 88% 10%, rgba(46,125,91,0.08), transparent 18%), linear-gradient(180deg, #F6F1E8 0%, #F3EEE4 55%, #F8F4EC 100%)",
          texture:
            "linear-gradient(rgba(120,113,108,0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(120,113,108,0.022) 1px, transparent 1px)",
          textureSize: "24px 24px, 24px 24px",
          shell: "rgba(255,255,255,0.52)",
          card: "rgba(255,252,247,0.72)",
          cardStrong: "rgba(255,253,249,0.82)",
          line: "rgba(120,113,108,0.14)",
          softPanel: "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(244,239,232,0.82))",
          badge: "rgba(255,255,255,0.62)",
          input: "#FFFDF8",
          toggleBg: "rgba(255,255,255,0.58)",
          toggleActive: "#FFFCF6",
          headline: "#111827",
          subtext: "#5B6471",
          infoText: "#6B7280",
          cardShadow: "0 18px 44px rgba(15,23,42,0.055)",
          subtleShadow: "0 8px 24px rgba(15,23,42,0.04)",
          ambient: "radial-gradient(circle, rgba(46,125,91,0.14), transparent 62%)",
        }
      : {
          modeLabel: "Crisp Theme",
          page: "#FFFFFF",
          pageGradient:
            "radial-gradient(circle at 12% 10%, rgba(167,215,197,0.22), transparent 22%), radial-gradient(circle at 85% 12%, rgba(46,125,91,0.12), transparent 18%), linear-gradient(to bottom, #ffffff, #fbfdfc)",
          texture: "none",
          textureSize: "auto",
          shell: "rgba(255,255,255,0.82)",
          card: "rgba(255,255,255,0.78)",
          cardStrong: "rgba(255,255,255,0.88)",
          line: "rgba(148,163,184,0.16)",
          softPanel: "linear-gradient(180deg, rgba(255,255,255,0.97), rgba(234,246,240,0.78))",
          badge: "rgba(255,255,255,0.85)",
          input: "#FFFFFF",
          toggleBg: "rgba(255,255,255,0.82)",
          toggleActive: "#FFFFFF",
          headline: "#0F172A",
          subtext: "#475569",
          infoText: "#64748B",
          cardShadow: "0 20px 50px rgba(15,23,42,0.08)",
          subtleShadow: "0 8px 24px rgba(15,23,42,0.05)",
          ambient: "radial-gradient(circle, rgba(46,125,91,0.18), transparent 62%)",
        };

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: theme.page, color: theme.headline }}>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20"
        animate={{ opacity: [0.9, 1, 0.92] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: theme.pageGradient }}
      />

      {backgroundMode === "paper" && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-60"
          style={{ backgroundImage: theme.texture, backgroundSize: theme.textureSize }}
        />
      )}

      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5 lg:px-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex items-center gap-3"
        >
          <div
            className="flex h-9 w-9 items-center justify-center rounded-2xl ring-1 ring-black/5"
            style={{ backgroundColor: "#F3FBF7", color: "#2E7D5B" }}
          >
            <Scale className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Labour Law Partner</div>
            <div className="text-sm font-semibold" style={{ color: theme.headline }}>LLP</div>
          </div>
        </motion.div>

        <motion.nav
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.04 }}
          className="hidden items-center gap-7 text-sm md:flex"
          style={{ color: theme.infoText }}
        >
          <a href="#product" className="transition hover:text-slate-900">Product</a>
          <a href="#features" className="transition hover:text-slate-900">Features</a>
          <a href="#preview" className="transition hover:text-slate-900">Preview</a>
        </motion.nav>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="flex items-center gap-2"
        >
          <div
            className="hidden rounded-2xl p-1 md:flex"
            style={{ backgroundColor: theme.toggleBg, border: `1px solid ${theme.line}` }}
          >
            <button
              onClick={() => setBackgroundMode("crisp")}
              className="rounded-xl px-3 py-1.5 text-xs font-medium transition"
              style={{
                backgroundColor: backgroundMode === "crisp" ? theme.toggleActive : "transparent",
                color: theme.headline,
                boxShadow: backgroundMode === "crisp" ? "0 1px 2px rgba(15,23,42,0.06)" : "none",
              }}
            >
              Crisp White
            </button>
            <button
              onClick={() => setBackgroundMode("paper")}
              className="rounded-xl px-3 py-1.5 text-xs font-medium transition"
              style={{
                backgroundColor: backgroundMode === "paper" ? theme.toggleActive : "transparent",
                color: theme.headline,
                boxShadow: backgroundMode === "paper" ? "0 1px 2px rgba(15,23,42,0.06)" : "none",
              }}
            >
              Paper White
            </button>
          </div>

          <Button
            variant="outline"
            className="h-10 rounded-2xl px-4 backdrop-blur"
            style={{ backgroundColor: theme.shell, borderColor: theme.line }}
          >
            Join Waitlist
          </Button>
        </motion.div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-14 pt-4 lg:px-6 lg:pb-20 lg:pt-8">
        <section id="product" className="grid items-center gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.04 }}
              className="mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs shadow-sm backdrop-blur"
              style={{ backgroundColor: theme.badge, border: `1px solid ${theme.line}`, color: theme.subtext }}
            >
              <Sparkles className="h-3.5 w-3.5" style={{ color: "#2E7D5B" }} />
              Minimal legal AI for Bangladesh compliance
            </motion.div>

            <h1
              className="max-w-2xl text-4xl font-semibold tracking-[-0.045em] sm:text-5xl lg:text-[64px] lg:leading-[0.98]"
              style={{ color: theme.headline }}
            >
              Search law.
              <br />
              Understand action.
              <br />
              Move faster.
            </h1>

            <p className="mt-5 max-w-lg text-base leading-7 lg:text-[17px]" style={{ color: theme.subtext }}>
              LLP is a focused AI search experience for labour law, HR compliance, and practical workplace guidance.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <motion.div whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button
                  size="lg"
                  className="h-11 rounded-2xl px-5 text-white shadow-[0_10px_24px_rgba(46,125,91,0.18)]"
                  style={{ backgroundColor: "#2E7D5B" }}
                >
                  Try Free Search
                  <motion.span
                    animate={{ x: [0, 3, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    className="ml-2 inline-flex"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </motion.span>
                </Button>
              </motion.div>
              <motion.div whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-11 rounded-2xl px-5"
                  style={{ backgroundColor: theme.shell, borderColor: theme.line }}
                >
                  See Ecosystem
                </Button>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.12 }}
              className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm"
              style={{ color: theme.infoText }}
            >
              <div>
                <span className="font-semibold" style={{ color: theme.headline }}>125+</span> mapped files
              </div>
              <div>
                <span className="font-semibold" style={{ color: theme.headline }}>AI-first</span> user flow
              </div>
              <div>
                <span className="font-semibold" style={{ color: theme.headline }}>Dual</span> background mode
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            id="preview"
            initial={{ opacity: 0, y: 24, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, delay: 0.06 }}
            className="relative"
          >
            <motion.div
              aria-hidden
              className="absolute -inset-3 -z-10 rounded-[28px] blur-2xl"
              animate={{ opacity: [0.1, 0.17, 0.1], scale: [0.98, 1.02, 0.98] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              style={{ background: theme.ambient }}
            />

            <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}>
              <Card
                className="overflow-hidden rounded-[28px] backdrop-blur-xl"
                style={{ backgroundColor: theme.cardStrong, border: `1px solid ${theme.line}`, boxShadow: theme.cardShadow }}
              >
                <CardContent className="p-3.5 lg:p-4">
                  <div className="rounded-[24px] p-4" style={{ background: theme.softPanel, border: `1px solid ${theme.line}` }}>
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Preview</div>
                        <div className="mt-1 text-base font-semibold" style={{ color: theme.headline }}>LLP Search</div>
                      </div>
                      <motion.div
                        animate={{ opacity: [0.75, 1, 0.75] }}
                        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                        className="rounded-full px-3 py-1 text-[11px] font-medium"
                        style={{ backgroundColor: theme.badge, border: `1px solid ${theme.line}`, color: theme.subtext }}
                      >
                        {theme.modeLabel}
                      </motion.div>
                    </div>

                    <div
                      className="rounded-[18px] p-3.5"
                      style={{ backgroundColor: theme.cardStrong, border: `1px solid ${theme.line}`, boxShadow: theme.subtleShadow }}
                    >
                      <label className="mb-2.5 block text-sm font-medium" style={{ color: theme.subtext }}>
                        Ask a labour law question
                      </label>
                      <div className="flex gap-2.5">
                        <Input
                          defaultValue="Termination benefits after resignation"
                          className="h-11 rounded-2xl text-sm"
                          style={{ backgroundColor: theme.input, borderColor: theme.line }}
                        />
                        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
                          <Button className="h-11 rounded-2xl px-4 text-white" style={{ backgroundColor: "#2E7D5B" }}>
                            <Search className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2.5">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.18 }}
                        className="rounded-[18px] p-3.5"
                        style={{ backgroundColor: theme.card, border: `1px solid ${theme.line}`, boxShadow: theme.subtleShadow }}
                      >
                        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Response style</div>
                        <div className="mt-1.5 text-sm font-medium" style={{ color: theme.headline }}>
                          Legal reference · practical meaning · next action
                        </div>
                      </motion.div>

                      <div className="grid gap-2.5 sm:grid-cols-3">
                        {[
                          ["Free", "Fast queries"],
                          ["Pro", "Clarified answers"],
                          ["Enterprise", "Team workflow"],
                        ].map(([title, text], index) => (
                          <motion.div
                            key={title}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, delay: 0.22 + index * 0.06 }}
                            whileHover={{ y: -3 }}
                            className="rounded-[16px] p-3 text-center"
                            style={{ backgroundColor: theme.card, border: `1px solid ${theme.line}`, boxShadow: theme.subtleShadow }}
                          >
                            <div className="text-sm font-semibold" style={{ color: theme.headline }}>{title}</div>
                            <div className="mt-1 text-[11px]" style={{ color: theme.infoText }}>{text}</div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </section>

        <section id="features" className="mt-14 grid gap-3.5 md:grid-cols-3">
          {features.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                {...fadeUp}
                transition={{ duration: 0.35, delay: index * 0.06 }}
                whileHover={{ y: -4 }}
              >
                <Card
                  className="rounded-[22px] backdrop-blur"
                  style={{ backgroundColor: theme.card, border: `1px solid ${theme.line}`, boxShadow: theme.subtleShadow }}
                >
                  <CardContent className="p-5">
                    <div
                      className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: "#F3FBF7", color: "#2E7D5B" }}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <h3 className="text-base font-semibold" style={{ color: theme.headline }}>{item.title}</h3>
                    <p className="mt-2.5 text-sm leading-6" style={{ color: theme.subtext }}>{item.text}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </section>

        <motion.section {...fadeUp} transition={{ duration: 0.4, delay: 0.08 }} className="mt-14">
          <div
            className="rounded-[26px] px-6 py-6 backdrop-blur lg:flex lg:items-center lg:justify-between"
            style={{ backgroundColor: theme.card, border: `1px solid ${theme.line}`, boxShadow: theme.subtleShadow }}
          >
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Background modes</div>
              <h3 className="mt-2 text-xl font-semibold tracking-tight" style={{ color: theme.headline }}>
                Keep both. Crisp for startup sharpness, paper for warmer trust.
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-6" style={{ color: theme.subtext }}>
                The paper mode now uses warmer neutrals and an editorial surface feel, while the crisp mode keeps the cleaner SaaS-product look.
              </p>
            </div>
            <div className="mt-5 flex gap-2.5 lg:mt-0">
              {[
                "#2E7D5B",
                "#1F5A43",
                "#A7D7C5",
                backgroundMode === "paper" ? "#F6F1E8" : "#FFFFFF",
              ].map((color, index) => (
                <motion.div
                  key={color + index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="text-center"
                >
                  <motion.div
                    whileHover={{ y: -3, scale: 1.04 }}
                    className="h-11 w-11 rounded-2xl border border-black/5"
                    style={{ backgroundColor: color, boxShadow: theme.subtleShadow }}
                  />
                  <div className="mt-1.5 text-[10px]" style={{ color: theme.infoText }}>{color}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      </main>
    </div>
  );
}
