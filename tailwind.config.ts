import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        card: "hsl(var(--card) / <alpha-value>)",
        popover: "hsl(var(--popover) / <alpha-value>)",
        muted: { DEFAULT: "hsl(var(--muted) / <alpha-value>)", foreground: "hsl(var(--muted-foreground) / <alpha-value>)" },
        border: "hsl(var(--border) / <alpha-value>)",
        primary: { DEFAULT: "hsl(var(--primary) / <alpha-value>)", foreground: "hsl(var(--primary-foreground) / <alpha-value>)" },
        destructive: { DEFAULT: "hsl(var(--destructive) / <alpha-value>)", foreground: "0 0% 100%" },
        prio: { high: "hsl(var(--p-high) / <alpha-value>)", medium: "hsl(var(--p-medium) / <alpha-value>)", low: "hsl(var(--p-low) / <alpha-value>)" },
      },
      fontFamily: {
        supercell: ["Lilita One", "sans-serif"],
        poppins: ["Poppins", "sans-serif"],
      },
      keyframes: {
        float: {
          "0%,100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(40px,-50px,0) scale(1.12)" },
        },
        shimmer: { "0%": { transform: "translateX(-100%)" }, "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        float: "float 18s ease-in-out infinite",
        "float-slow": "float 26s ease-in-out infinite reverse",
        shimmer: "shimmer 3.2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
