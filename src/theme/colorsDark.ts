const palette = {
  neutral900: "#F3F7FF",
  neutral800: "#D6DFF0",
  neutral700: "#B4C0D4",
  neutral600: "#8795AD",
  neutral500: "#5C6A82",
  neutral400: "#38455B",
  neutral300: "#1E293B",
  neutral200: "#111827",
  neutral100: "#0B1220",

  primary600: "#D9E7FF",
  primary500: "#93B8F6",
  primary400: "#739EEB",
  primary300: "#4F82D4",
  primary200: "#3A66B0",
  primary100: "#294C83",

  secondary500: "#D8E2F2",
  secondary400: "#B5C1D6",
  secondary300: "#8D9BB6",
  secondary200: "#62708B",
  secondary100: "#414E68",

  accent500: "#FFE5C4",
  accent400: "#FFD49D",
  accent300: "#FFC075",
  accent200: "#F3A74C",
  accent100: "#D98A23",

  angry100: "#F2D6CD",
  angry500: "#C03403",

  overlay20: "rgba(11, 18, 32, 0.2)",
  overlay50: "rgba(11, 18, 32, 0.5)",
} as const

export const colors = {
  palette,
  transparent: "rgba(0, 0, 0, 0)",
  text: palette.neutral800,
  textDim: palette.neutral600,
  background: palette.neutral200,
  border: palette.neutral400,
  tint: palette.primary500,
  tintInactive: palette.neutral300,
  separator: palette.neutral300,
  error: palette.angry500,
  errorBackground: palette.angry100,
} as const
