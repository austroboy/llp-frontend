export interface DerivedTheme {
  accent: string;
  accentLight: string;
  accentDark: string;
  headerBg: string;
  headerText: string;
  sidebarBg: string;
  sidebarText: string;
  sectionTitle: string;
  borderColor: string;
  chipBg: string;
  chipText: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((c) => c.toString(16).padStart(2, "0"))
      .join("")
  );
}

export function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount
  );
}

export function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

export function blendWithWhite(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(
    r * alpha + 255 * (1 - alpha),
    g * alpha + 255 * (1 - alpha),
    b * alpha + 255 * (1 - alpha)
  );
}

export function deriveTheme(accentColor: string): DerivedTheme {
  return {
    accent: accentColor,
    accentLight: lighten(accentColor, 0.85),
    accentDark: darken(accentColor, 0.25),
    headerBg: accentColor,
    headerText: "#ffffff",
    sidebarBg: darken(accentColor, 0.3),
    sidebarText: lighten(accentColor, 0.8),
    sectionTitle: accentColor,
    borderColor: lighten(accentColor, 0.6),
    chipBg: lighten(accentColor, 0.9),
    chipText: darken(accentColor, 0.15),
  };
}
