import type { Appearance } from "@clerk/types";

/**
 * lf-* glass appearance for embedded Clerk widgets.
 * Mount inside a `.lf-page` ancestor so the lf-* CSS vars resolve.
 *
 * Spec: docs/superpowers/specs/2026-04-27-sign-in-up-DESIGN.md
 */
export const lfClerkAppearance: Appearance = {
  variables: {
    colorPrimary: "var(--accent-blue)",
    colorText: "var(--ink)",
    colorTextSecondary: "var(--ink-2)",
    colorBackground: "transparent",
    colorInputBackground: "var(--glass-bg)",
    colorInputText: "var(--ink)",
    colorDanger: "var(--rust)",
    colorSuccess: "var(--emerald)",
    fontFamily:
      "var(--lf-body), Poppins, system-ui, -apple-system, sans-serif",
    fontFamilyButtons:
      "var(--lf-display), Fraunces, Georgia, serif",
    borderRadius: "16px",
    fontSize: "15px",
    spacingUnit: "1rem",
  },
  elements: {
    rootBox: "lf-clerk w-full",
    card: [
      "bg-transparent text-[var(--ink)]",
      "rounded-none border-0 shadow-none",
      "px-0 py-0",
    ].join(" "),
    cardBox: "rounded-none border-0 shadow-none bg-transparent",
    logoBox: "flex justify-center mb-4",
    logoImage: "max-h-10 w-auto",
    header: "hidden",
    headerTitle: "hidden",
    headerSubtitle: "hidden",

    socialButtonsBlockButton: [
      "rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)]",
      "text-[var(--ink)]",
      "hover:bg-[var(--glass-bg-strong)] hover:border-[color-mix(in_oklab,var(--accent-blue)_36%,var(--glass-border))]",
      "transition-all duration-180",
      "py-3 px-5",
      "backdrop-blur-md",
    ].join(" "),
    socialButtonsBlockButtonText: [
      "font-[family:var(--lf-mono),JetBrains_Mono,monospace]",
      "text-[11.5px] tracking-[0.18em] uppercase",
    ].join(" "),
    socialButtonsProviderIcon: "size-4",

    dividerRow: "my-6",
    dividerLine: "bg-[var(--line-2)]",
    dividerText: [
      "font-[family:var(--lf-mono),JetBrains_Mono,monospace]",
      "text-[10.5px] tracking-[0.24em] uppercase",
      "text-[var(--ink-4)]",
    ].join(" "),

    formFieldLabel: [
      "font-[family:var(--lf-mono),JetBrains_Mono,monospace]",
      "text-[11px] tracking-[0.18em] uppercase font-medium",
      "text-[var(--ink-3)]",
    ].join(" "),
    formFieldInput: [
      "rounded-full bg-[var(--glass-bg)]",
      "border border-[var(--glass-border)]",
      "text-[var(--ink)] placeholder:text-[var(--ink-4)]",
      "px-5 py-3.5 text-[15px]",
      "font-[family:var(--lf-body),Poppins,sans-serif]",
      "focus:border-[var(--accent-blue)]",
      "focus:ring-4 focus:ring-[var(--accent-blue-ghost)]",
      "outline-none transition-all duration-150",
      "backdrop-blur-md",
    ].join(" "),
    formFieldInputShowPasswordButton:
      "text-[var(--ink-3)] hover:text-[var(--ink-2)]",
    formFieldHintText: "text-[12px] text-[var(--ink-3)] mt-1.5",
    formFieldErrorText: "text-[12px] text-[var(--rust)] mt-1.5",
    formFieldSuccessText: "text-[12px] text-[var(--emerald)] mt-1.5",
    formFieldAction: [
      "font-[family:var(--lf-mono),JetBrains_Mono,monospace]",
      "text-[10px] tracking-[0.18em] uppercase",
      "text-[var(--accent-blue)]",
      "underline underline-offset-4 decoration-1",
    ].join(" "),

    formButtonPrimary: [
      "rounded-full",
      "bg-[linear-gradient(180deg,color-mix(in_oklab,var(--accent-blue)_92%,white)_0%,var(--accent-blue)_100%)]",
      "text-[#fafaf5]",
      "font-[family:var(--lf-display),Fraunces,Georgia,serif]",
      "text-[14px] font-bold tracking-[-0.006em]",
      "py-3.5 px-7",
      "border border-[color-mix(in_oklab,var(--accent-blue)_60%,white_10%)]",
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_14px_36px_-10px_color-mix(in_oklab,var(--accent-blue)_55%,transparent)]",
      "hover:-translate-y-0.5",
      "active:translate-y-0",
      "transition-all duration-180",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-blue)]",
    ].join(" "),
    formButtonReset: [
      "rounded-full bg-[var(--glass-bg)]",
      "text-[var(--ink-2)] hover:text-[var(--ink)]",
      "font-[family:var(--lf-mono),JetBrains_Mono,monospace]",
      "text-[11.5px] tracking-[0.18em] uppercase",
      "border border-[var(--glass-border)]",
      "py-3 px-5 hover:bg-[var(--glass-bg-strong)]",
      "transition-all duration-180",
    ].join(" "),

    otpCodeFieldInput: [
      "rounded-2xl border border-[var(--glass-border)]",
      "bg-[var(--glass-bg-strong)] text-[var(--ink)]",
      "font-[family:var(--lf-mono),JetBrains_Mono,monospace]",
      "text-2xl tracking-[0.06em]",
      "focus:border-[var(--accent-blue)] focus:ring-2 focus:ring-[var(--accent-blue-ghost)] outline-none",
      "transition-all duration-120",
    ].join(" "),

    footer: "!mt-7 !border-t !border-[var(--line-2)] !pt-5 !bg-transparent",
    footerAction: "!bg-transparent",
    footerActionText: [
      "!text-[14px] !text-[var(--ink)]",
      "!font-[family:var(--lf-body),Poppins,sans-serif]",
    ].join(" "),
    footerActionLink: [
      "!text-[var(--accent-blue)] hover:!text-[var(--accent-blue-deep)]",
      "!underline !underline-offset-4 !decoration-1",
      "!font-[family:var(--lf-mono),JetBrains_Mono,monospace]",
      "!text-[12px] !tracking-[0.18em] !uppercase !font-semibold !ml-1",
    ].join(" "),

    identityPreviewText: "text-[var(--ink)] text-[14px]",
    identityPreviewEditButton: "text-[var(--accent-blue)]",

    alertText: "text-[var(--rust)] text-[13px]",
    formResendCodeLink: [
      "text-[var(--accent-blue)]",
      "font-[family:var(--lf-mono),JetBrains_Mono,monospace]",
      "text-[11px] tracking-[0.18em] uppercase",
      "underline underline-offset-4 decoration-1",
    ].join(" "),

    badge: [
      "rounded-full bg-[var(--glass-bg)] text-[var(--ink-2)]",
      "border border-[var(--glass-border)]",
      "font-[family:var(--lf-mono),JetBrains_Mono,monospace]",
      "text-[10px] tracking-[0.2em] uppercase px-3 py-1",
    ].join(" "),
  },
};
