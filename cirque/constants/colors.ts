/**
 * Cirque design tokens — dark slate-blue UI, cool blue-gray accents,
 * frosted glass surfaces. See CLAUDE.md "Design system".
 */
export const colors = {
  // Backgrounds
  background: "#0D1B2A",
  backgroundSecondary: "#112230",
  surface: "#1A2E40",
  surfaceFrosted: "#1E3448",

  // Borders
  border: "#2A4560",
  borderFrost: "#3A5570",

  // Text
  textPrimary: "#FFFFFF",
  textSecondary: "#A8C0D0",
  textTertiary: "#5C7E8F",

  // Brand accents
  accent: "#5C7E8F",
  accentBright: "#7FB3C8",
  accentGlow: "#AECFDC",

  // Semantic
  success: "#4CAF82",
  warning: "#E8A838",
  danger: "#E05C5C",

  // Electrolyte bar colors
  sodium: "#7FB3C8",
  potassium: "#6BA892",
  magnesium: "#8B9DC3",
} as const;
