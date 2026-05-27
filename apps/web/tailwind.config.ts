import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#06030f",
          panel: "#10142a",
          surface: "#161c36",
          accent: "#a855f7",
          accentStrong: "#c084fc",
          text: "#f8f7ff",
          textSoft: "#d4d2e7",
          muted: "#a3a0bf",
          border: "#2b2f4b",
        },
      },
      boxShadow: {
        brand: "0 16px 42px rgba(4, 7, 20, 0.55)",
        glow: "0 16px 40px rgba(168, 85, 247, 0.26)",
      },
      borderRadius: {
        panel: "1rem",
      },
      fontFamily: {
        display: ["Space Grotesk", "Sora", "IBM Plex Sans", "Segoe UI", "sans-serif"],
      },
    }
  },
  plugins: []
} satisfies Config;
