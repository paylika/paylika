/**
 * paylika color tokens.
 * Kept in sync with tailwind.config.js so we can use raw hex values
 * in places where className isn't available (SVG fills/strokes, chart bars).
 */
export const colors = {
  paper: "#F4EDE3",
  card: "#FFFFFF",
  night: "#1C1714",
  ink: "#211B18",
  inkSoft: "#3A322D",
  muted: "#8A817A",
  sand: "#EBE1D3",
  bordeaux: {
    50: "#F8EAED",
    100: "#EEC9D0",
    200: "#DD98A4",
    300: "#C96A79",
    400: "#A83F51",
    500: "#8F2135",
    600: "#7B1126",
    700: "#640E1F",
    800: "#4B0A17",
    900: "#33060F",
  },
  black: "#111111",
  forest: "#2F6B4F",
  clay: "#A8412F",
  white: "#FFFFFF",
} as const;

export const accent = colors.bordeaux[600];
