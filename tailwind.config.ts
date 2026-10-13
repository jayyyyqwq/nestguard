import type { Config } from "tailwindcss";

// Industrial instrument panel: concrete grey, black ink, signal colours used only for status.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#141414",
        paper: {
          DEFAULT: "#E6E6E0",
          deep: "#D9D9D2",
        },
        panel: "#F5F5F0",
        line: "#C4C4BB",
        muted: "#5E5E57",
        gold: {
          DEFAULT: "#FFBE0B",
          tint: "#FFF0C2",
          dark: "#7A5800",
        },
        trust: {
          DEFAULT: "#1F9A50",
          tint: "#D5EEDD",
          dark: "#11623A",
        },
        alert: {
          DEFAULT: "#D83A2C",
          tint: "#F7D8D4",
          dark: "#8F1F15",
        },
      },
      fontFamily: {
        display: ["var(--font-barlow-condensed)", "sans-serif"],
        body: ["var(--font-barlow)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.25" },
        },
        stripes: {
          from: { backgroundPosition: "0 0" },
          to: { backgroundPosition: "28px 0" },
        },
      },
      animation: {
        rise: "rise 0.45s cubic-bezier(0.2, 0.7, 0.2, 1) both",
        blink: "blink 1.2s steps(2, jump-none) infinite",
        stripes: "stripes 1s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
