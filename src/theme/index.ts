import { Platform } from "react-native";

export const theme = {
  colors: {
    background: "#090b10",
    backgroundAlt: "#171c29",
    card: "rgba(14, 17, 26, 0.9)",
    cardMuted: "rgba(26, 31, 42, 0.94)",
    border: "rgba(195, 210, 228, 0.16)",
    surface: "#f59e0b",
    surfacePressed: "#d97706",
    accent: "#7dd3fc",
    text: "#f5f1e6",
    subtleText: "#b5b1a6",
    warning: "#f87171",
    player: "#7dd3fc",
    orb: "#f59e0b",
    hazard: "#f87171"
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 22,
    xl: 28,
    xxl: 36,
    xxxl: 52
  },
  radius: {
    md: 10,
    lg: 14,
    xl: 18
  },
  fonts: {
    display: Platform.select({
      ios: "Courier-Bold",
      android: "monospace",
      default: "Courier New"
    }),
    body: Platform.select({
      ios: "Courier",
      android: "monospace",
      default: "Courier New"
    }),
    bodyBold: Platform.select({
      ios: "Courier-Bold",
      android: "monospace",
      default: "Courier New"
    }),
    label: Platform.select({
      ios: "Courier-Bold",
      android: "monospace",
      default: "Courier New"
    })
  }
} as const;

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
