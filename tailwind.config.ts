import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1B4332",
        "primary-hover": "#145027",
        surface: "#F8F5F0",
        "surface-card": "#FFFFFF",
        border: "#D1C9BD",
        "text-primary": "#1A1A1A",
        "text-secondary": "#6B6560",
        "text-arabic": "#1A1A1A",
        error: "#B91C1C",
        success: "#166534",
        warning: "#92400E",
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        arabic: [
          "Noto Naskh Arabic",
          "Traditional Arabic",
          "Arabic Typesetting",
          "Geeza Pro",
          "serif",
        ],
      },
      fontSize: {
        display: ["2.25rem", { lineHeight: "2.5rem", fontWeight: "700" }],
        heading: ["1.5rem", { lineHeight: "2rem", fontWeight: "700" }],
        subheading: ["1.125rem", { lineHeight: "1.75rem", fontWeight: "600" }],
      },
    },
  },
  plugins: [],
};

export default config;
