"use client";

/**
 * HomepageCodexStyles — shared design-system CSS scoped to `.hp-codex`.
 * Same Legal Codex vibe as the /experts page: sepia paper (light),
 * deep forest (dark), rust + green accents, Fraunces/Poppins/JetBrains.
 */
export function HomepageCodexStyles() {
  return <style>{CODEX_CSS}</style>;
}

const CODEX_CSS = `
.hp-codex {
  --hp-paper:       #f4ecda;
  --hp-paper-soft:  #faf4e2;
  --hp-paper-warm:  #f1e8c8;
  --hp-ink:         #1d1410;
  --hp-ink-muted:   rgba(29, 20, 16, 0.62);
  --hp-ink-faint:   rgba(29, 20, 16, 0.36);
  --hp-rule:        rgba(29, 20, 16, 0.11);
  --hp-rule-strong: rgba(29, 20, 16, 0.20);
  --hp-rust:        #b25c22;
  --hp-rust-deep:   #8a4116;
  --hp-rust-soft:   rgba(178, 92, 34, 0.10);
  --hp-green:       #2e7d5b;
  --hp-green-deep:  #1f5a43;
  --hp-green-soft:  rgba(46, 125, 91, 0.10);
  --hp-green-leaf:  #a7d7c5;
  --hp-card-bg:     #fbf5e2;
  --hp-card-bg-end: #f3ead1;
  --hp-card-border: rgba(29, 20, 16, 0.14);

  --hp-mono:    var(--font-jetbrains), ui-monospace, monospace;
  --hp-serif:   var(--font-baskerville), Georgia, serif;
  --hp-display: var(--font-fraunces), var(--font-baskerville), Georgia, serif;
  --hp-body:    var(--font-poppins), ui-sans-serif, system-ui, sans-serif;
  --hp-italic:  var(--font-fraunces), var(--font-lora), serif;

  color: var(--hp-ink);
  font-family: var(--hp-body);
  background: linear-gradient(180deg, #faf4e2 0%, #f4ecd6 42%, #f0e6c6 100%);
  position: relative;
  isolation: isolate;
}

.dark .hp-codex {
  --hp-paper:       #111011;
  --hp-paper-soft:  #0e0d0c;
  --hp-paper-warm:  #0a0a0a;
  --hp-ink:         #ede6d8;
  --hp-ink-muted:   rgba(237, 230, 216, 0.58);
  --hp-ink-faint:   rgba(237, 230, 216, 0.32);
  --hp-rule:        rgba(237, 230, 216, 0.10);
  --hp-rule-strong: rgba(237, 230, 216, 0.18);
  --hp-rust:        #d38044;
  --hp-rust-deep:   #b25c22;
  --hp-rust-soft:   rgba(211, 128, 68, 0.14);
  --hp-green:       #4ade80;
  --hp-green-deep:  #2e7d5b;
  --hp-green-soft:  rgba(74, 222, 128, 0.10);
  --hp-green-leaf:  #9ddbb8;
  --hp-card-bg:     #0a0a0a;
  --hp-card-bg-end: #050505;
  --hp-card-border: rgba(237, 230, 216, 0.12);

  background: linear-gradient(180deg, #0e0d0c 0%, #0a0a0a 100%);
}

/* ── Page-level scaffolding (grid + grain + watermark + margin rule) ── */
.hp-bg-scaffold {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}
.hp-bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to bottom, rgba(29,20,16,0.05) 1px, transparent 1px);
  background-size: 100% 44px;
  opacity: 0.7;
}
.dark .hp-bg-grid {
  background-image:
    linear-gradient(to bottom, rgba(237,230,216,0.04) 1px, transparent 1px);
}
.hp-bg-grain {
  position: absolute;
  inset: 0;
  opacity: 0.10;
  mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.95  0 0 0 0 0.9  0 0 0 0 0.85  0 0 0 0.45 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
  background-size: 200px 200px;
}
.dark .hp-bg-grain {
  opacity: 0.18;
  mix-blend-mode: overlay;
}
.hp-bg-margin {
  position: absolute;
  inset: 0 auto 0 clamp(8px, 1.6vw, 28px);
  width: 1px;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(178, 92, 34, 0.22) 6%,
    rgba(178, 92, 34, 0.22) 94%,
    transparent 100%
  );
}
.dark .hp-bg-margin {
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(211, 128, 68, 0.16) 6%,
    rgba(211, 128, 68, 0.16) 94%,
    transparent 100%
  );
}
.hp-bg-watermark {
  position: fixed;
  right: 3vw;
  bottom: 4vh;
  width: 220px;
  height: 220px;
  z-index: 0;
  pointer-events: none;
  -webkit-mask: url('/law-sign.svg') center / contain no-repeat;
          mask: url('/law-sign.svg') center / contain no-repeat;
  background-color: #d4c3a0;
  opacity: 0.06;
}
.dark .hp-bg-watermark {
  background-color: #1a1918;
  opacity: 0.35;
}

/* ── Section marker row: § 0N — Label ───────────────────────────────── */
.hp-marker {
  display: flex;
  align-items: center;
  gap: 16px;
  font-family: var(--hp-mono);
  font-size: 10.5px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--hp-ink-muted);
}
.hp-marker-rule {
  display: inline-block;
  height: 1px;
  width: 32px;
  background: var(--hp-rule-strong);
}
.hp-marker-section { color: var(--hp-rust); font-weight: 600; }
.hp-marker-label   { color: var(--hp-ink-muted); }
.hp-marker-tail    { flex: 1; height: 1px; background: var(--hp-rule); }

/* ── Typography ─────────────────────────────────────────────────────── */
.hp-display {
  font-family: var(--hp-display);
  font-weight: 400;
  font-size: clamp(2.2rem, 4.8vw, 3.8rem);
  line-height: 1.05;
  letter-spacing: -0.022em;
  color: var(--hp-ink);
  font-variation-settings: "opsz" 56, "SOFT" 30;
}
.hp-display em {
  font-style: italic;
  color: var(--hp-rust);
  font-variation-settings: "opsz" 96, "SOFT" 100;
}
.hp-h2 {
  font-family: var(--hp-display);
  font-weight: 400;
  font-size: clamp(1.9rem, 3.6vw, 2.8rem);
  line-height: 1.08;
  letter-spacing: -0.018em;
  color: var(--hp-ink);
  font-variation-settings: "opsz" 42;
}
.hp-h2 em {
  font-style: italic;
  color: var(--hp-rust);
  font-variation-settings: "opsz" 72, "SOFT" 100;
}
.hp-h3 {
  font-family: var(--hp-display);
  font-weight: 400;
  font-size: 1.3rem;
  line-height: 1.18;
  letter-spacing: -0.012em;
  color: var(--hp-ink);
  font-variation-settings: "opsz" 22;
}
.hp-standfirst {
  font-family: var(--hp-italic);
  font-style: italic;
  font-size: 1.08rem;
  line-height: 1.65;
  color: var(--hp-ink-muted);
  font-variation-settings: "opsz" 20;
}
.hp-body {
  font-family: var(--hp-body);
  font-size: 0.92rem;
  line-height: 1.6;
  color: var(--hp-ink-muted);
}
.hp-small {
  font-family: var(--hp-body);
  font-size: 0.82rem;
  line-height: 1.55;
  color: var(--hp-ink-muted);
}
.hp-micro {
  font-family: var(--hp-mono);
  font-size: 10.5px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--hp-ink-muted);
}
.hp-numeral {
  font-family: var(--hp-display);
  font-weight: 400;
  color: var(--hp-rust);
  font-variation-settings: "opsz" 96, "SOFT" 100;
}
.hp-italic-accent {
  font-family: var(--hp-italic);
  font-style: italic;
  color: var(--hp-rust);
  font-variation-settings: "opsz" 48, "SOFT" 100;
}

/* ── Buttons ────────────────────────────────────────────────────────── */
.hp-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  font-family: var(--font-outfit), var(--font-sans), ui-sans-serif, system-ui, sans-serif;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 160ms ease, border-color 160ms ease, box-shadow 160ms ease, color 160ms ease, transform 160ms ease, filter 160ms ease;
  user-select: none;
  text-decoration: none;
}
.hp-btn--sm { padding: 9px 14px; font-size: 11px; gap: 8px; }
.hp-btn--primary {
  color: #fafaf5;
  background: linear-gradient(180deg, #3c9b6f 0%, var(--hp-green-deep) 100%);
  border-color: var(--hp-green-deep);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.22),
    0 10px 24px -14px rgba(46, 125, 91, 0.5);
}
.hp-btn--primary:hover {
  background: linear-gradient(180deg, #45a87a 0%, var(--hp-green) 100%);
}
.hp-btn--rust {
  color: #fffaf2;
  background: linear-gradient(180deg,
    color-mix(in oklab, var(--hp-rust) 92%, white) 0%,
    var(--hp-rust-deep) 100%);
  border-color: var(--hp-rust-deep);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.25),
    0 10px 24px -14px rgba(178, 92, 34, 0.5);
}
.hp-btn--rust:hover { filter: brightness(1.05); }
.hp-btn--ghost {
  color: var(--hp-ink);
  background: transparent;
  border-color: var(--hp-rule-strong);
}
.hp-btn--ghost:hover {
  background: color-mix(in oklab, var(--hp-ink) 5%, transparent);
  border-color: var(--hp-ink-muted);
}

/* ── Chip / tag ─────────────────────────────────────────────────────── */
.hp-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  font-family: var(--font-outfit), var(--font-sans), ui-sans-serif, system-ui, sans-serif;
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--hp-ink-muted);
  background: color-mix(in oklab, var(--hp-ink) 3%, transparent);
  border: 1px solid var(--hp-rule);
}
.hp-chip--rust {
  color: var(--hp-rust);
  background: var(--hp-rust-soft);
  border-color: color-mix(in oklab, var(--hp-rust) 22%, transparent);
}
.hp-chip--green {
  color: var(--hp-green);
  background: var(--hp-green-soft);
  border-color: color-mix(in oklab, var(--hp-green) 22%, transparent);
}

/* ── Paper card / panel ─────────────────────────────────────────────── */
.hp-panel {
  background: linear-gradient(180deg, var(--hp-card-bg) 0%, var(--hp-card-bg-end) 100%);
  border: 1px solid var(--hp-card-border);
  box-shadow: 0 8px 32px -18px rgba(29, 20, 16, 0.22);
}
.dark .hp-panel { box-shadow: 0 8px 32px -18px rgba(0, 0, 0, 0.5); }

.hp-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  border-bottom: 1px solid var(--hp-rule);
  background: color-mix(in oklab, var(--hp-rust) 5%, transparent);
}
.hp-panel-num {
  font-family: var(--hp-mono);
  font-size: 10.5px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--hp-rust);
  font-weight: 600;
}
.hp-panel-title {
  font-family: var(--hp-mono);
  font-size: 10.5px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--hp-ink-muted);
}
.hp-panel-body { padding: 20px 22px; }

.hp-tick-row { display: flex; align-items: flex-start; gap: 10px; }
.hp-tick-row + .hp-tick-row { margin-top: 10px; }
.hp-tick {
  flex-shrink: 0;
  margin-top: 7px;
  width: 16px;
  height: 1px;
  background: var(--hp-rust);
}

/* ── Hairline grid (for bento / registry layouts) ───────────────────── */
.hp-hairline-grid {
  display: grid;
  gap: 1px;
  border: 1px solid var(--hp-rule-strong);
  background: var(--hp-rule-strong);
}
.hp-hairline-grid > * {
  background: linear-gradient(180deg, var(--hp-card-bg) 0%, var(--hp-card-bg-end) 100%);
  padding: 24px;
  position: relative;
  transition: background 200ms ease;
}
.hp-hairline-grid > a:hover,
.hp-hairline-grid > button:hover,
.hp-hairline-grid > .hp-cell--hover:hover {
  background: color-mix(in oklab, var(--hp-rust) 4%, var(--hp-card-bg));
}

/* ── Editorial stat ─────────────────────────────────────────────────── */
.hp-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.hp-stat-num {
  font-family: var(--hp-display);
  font-weight: 400;
  font-size: clamp(2.4rem, 4.8vw, 3.6rem);
  line-height: 0.9;
  color: var(--hp-green);
  letter-spacing: -0.025em;
  font-variation-settings: "opsz" 96, "SOFT" 80;
}
.hp-stat-num--rust { color: var(--hp-rust); }
.hp-stat-num--ink  { color: var(--hp-ink); }
.hp-stat-label {
  font-family: var(--hp-mono);
  font-size: 10.5px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--hp-ink-muted);
  margin-top: 8px;
}
.hp-stat-sub {
  font-family: var(--hp-italic);
  font-style: italic;
  font-size: 0.86rem;
  color: var(--hp-ink-faint);
  line-height: 1.35;
}

/* ── Module / path card ─────────────────────────────────────────────── */
.hp-folio {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 100%;
}
.hp-folio-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.hp-folio-num {
  font-family: var(--hp-mono);
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--hp-rust);
}
.hp-folio-badge {
  font-family: var(--hp-mono);
  font-size: 9.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--hp-ink-faint);
}
.hp-folio-icon {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--hp-rule-strong);
  background: color-mix(in oklab, var(--hp-ink) 3%, transparent);
  color: var(--hp-green);
  transition: border-color 200ms ease, color 200ms ease;
}
.hp-folio-icon--rust { color: var(--hp-rust); }
.hp-folio-icon--ink  { color: var(--hp-ink); }
.hp-folio:hover .hp-folio-icon {
  border-color: var(--hp-rust);
}
.hp-folio-title {
  font-family: var(--hp-display);
  font-weight: 400;
  font-size: 1.15rem;
  line-height: 1.2;
  color: var(--hp-ink);
  letter-spacing: -0.012em;
  font-variation-settings: "opsz" 24;
}
.hp-folio-sub {
  font-family: var(--hp-italic);
  font-style: italic;
  color: var(--hp-ink-muted);
  font-size: 0.88rem;
  line-height: 1.45;
}
.hp-folio-foot {
  margin-top: auto;
  padding-top: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.hp-folio-cta {
  font-family: var(--hp-mono);
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--hp-rust);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-bottom: 1px solid transparent;
  padding-bottom: 2px;
  transition: border-color 200ms ease;
}
.hp-folio:hover .hp-folio-cta {
  border-bottom-color: var(--hp-rust);
}

/* ── Input field ────────────────────────────────────────────────────── */
.hp-input {
  width: 100%;
  padding: 11px 14px;
  font-family: var(--hp-mono);
  font-size: 13px;
  color: var(--hp-ink);
  background: var(--hp-paper-soft);
  border: 1px solid var(--hp-rule-strong);
  outline: none;
  transition: border-color 200ms ease, background 200ms ease;
}
.hp-input::placeholder { color: var(--hp-ink-faint); }
.hp-input:focus { border-color: var(--hp-rust); background: #fff; }
.dark .hp-input:focus { background: rgba(20,17,16,0.96); }

.hp-field-label {
  display: block;
  margin-bottom: 6px;
  font-family: var(--hp-mono);
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--hp-ink-muted);
}

/* ── Running list (editorial bullets) ───────────────────────────────── */
.hp-runlist { display: flex; flex-direction: column; gap: 10px; }
.hp-runlist-item {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--hp-rule);
}
.hp-runlist-item:last-child { border-bottom: none; padding-bottom: 0; }
.hp-runlist-num {
  flex-shrink: 0;
  font-family: var(--hp-mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  color: var(--hp-rust);
  min-width: 22px;
  padding-top: 2px;
}
.hp-runlist-text {
  font-family: var(--hp-body);
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--hp-ink);
}

/* ── Reveal on mount ─────────────────────────────────────────────────── */
@keyframes hpFadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes hpRule {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}
.hp-reveal { animation: hpFadeUp 620ms cubic-bezier(0.16,1,0.3,1) both; }
.hp-reveal-1  { animation-delay:   0ms; }
.hp-reveal-2  { animation-delay:  80ms; }
.hp-reveal-3  { animation-delay: 160ms; }
.hp-reveal-4  { animation-delay: 240ms; }
.hp-reveal-5  { animation-delay: 320ms; }
.hp-reveal-6  { animation-delay: 400ms; }

@media (prefers-reduced-motion: reduce) {
  .hp-reveal,
  .hp-reveal-1, .hp-reveal-2, .hp-reveal-3, .hp-reveal-4, .hp-reveal-5, .hp-reveal-6 {
    animation: none !important;
  }
}
`;
