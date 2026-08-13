/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  // Class-based dark mode (app is light-only) — avoids NativeWind's web
  // "Cannot manually set color scheme" crash when the device theme is dark.
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Warm paper background — deliberately not a generic gray dashboard.
        paper: "#F4EDE3",
        card: "#FFFFFF",
        // Warm near-black used for text and dark panels.
        night: "#1C1714",
        ink: {
          DEFAULT: "#211B18",
          soft: "#3A322D",
          muted: "#8A817A",
        },
        sand: "#EBE1D3",
        // Bordeaux — paylika's signature accent (a deep wine red).
        bordeaux: {
          50: "#F8EAED",
          100: "#EEC9D0",
          200: "#DD98A4",
          300: "#C96A79",
          400: "#A83F51",
          500: "#8F2135",
          600: "#7B1126", // primary — official paylika bordeaux
          700: "#640E1F",
          800: "#4B0A17",
          900: "#33060F",
        },
        forest: "#2F6B4F",
        clay: "#A8412F",
      },
      fontFamily: {
        // Display: Bricolage Grotesque (editorial, high character).
        display: ["BricolageGrotesque_700Bold"],
        "display-x": ["BricolageGrotesque_800ExtraBold"],
        "display-semi": ["BricolageGrotesque_600SemiBold"],
        // Body/UI: Space Grotesk.
        sans: ["SpaceGrotesk_400Regular"],
        medium: ["SpaceGrotesk_500Medium"],
        semibold: ["SpaceGrotesk_600SemiBold"],
        bold: ["SpaceGrotesk_700Bold"],
      },
    },
  },
  plugins: [],
};
