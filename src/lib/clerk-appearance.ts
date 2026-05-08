import type { Appearance } from "@clerk/types";

/**
 * Global Clerk appearance — Codex aesthetic.
 *
 * Applied via <ClerkProvider appearance={...}> so every Clerk surface
 * (UserButton popover, SignIn, SignUp, UserProfile) renders the same
 * parchment/rust/Fraunces identity chrome regardless of host page theme
 * (Codex on /, Protocol on /dashboard, Vault on /admin).
 *
 * Tokens `--hp-*` are promoted to :root and .dark in globals.css, so
 * Clerk's Radix portal (which mounts on <body>) can resolve the vars.
 * Dark mode auto-flips via .dark on <html>.
 *
 * Class names in `elements` are appended to Clerk's default classes —
 * styling lives under `@layer clerk` in globals.css.
 */
export const clerkCodexAppearance: Appearance = {
  cssLayerName: "clerk",
  variables: {
    colorPrimary: "var(--hp-rust)",
    colorText: "var(--hp-ink)",
    colorTextSecondary: "var(--hp-ink-muted)",
    colorBackground: "var(--hp-card-bg)",
    colorInputBackground: "var(--hp-paper-soft)",
    colorInputText: "var(--hp-ink)",
    colorNeutral: "var(--hp-ink)",
    colorDanger: "#b94747",
    colorSuccess: "#2e7d5b",
    colorWarning: "#a8864a",
    fontFamily: "var(--hp-body)",
    fontFamilyButtons: "var(--hp-body)",
    fontSize: "14px",
    borderRadius: "8px",
  },
  elements: {
    userButtonPopoverCard: "clerk-codex-card",
    userButtonPopoverMain: "clerk-codex-main",
    userButtonPopoverActions: "clerk-codex-actions",
    userButtonPopoverActionButton: "clerk-codex-action",
    userButtonPopoverActionButtonText: "clerk-codex-action-text",
    userButtonPopoverActionButtonIcon: "clerk-codex-action-icon",
    userButtonPopoverFooter: "clerk-codex-footer-hidden",
    userButtonAvatarBox: "clerk-codex-trigger-avatar",
    userPreview: "clerk-codex-preview",
    userPreviewAvatarBox: "clerk-codex-preview-avatar",
    userPreviewMainIdentifier: "clerk-codex-identifier-main",
    userPreviewSecondaryIdentifier: "clerk-codex-identifier-secondary",
    avatarBox: "clerk-codex-avatar",
  },
};
