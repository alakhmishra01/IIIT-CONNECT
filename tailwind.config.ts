import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { navy: "#0F172A", indigo: "#6366F1", amber: "#F59E0B" },
      fontFamily: {
        heading: ["var(--font-grotesk)"],
        body: ["var(--font-inter)"],
      },
    },
  },
  plugins: [],
} satisfies Config;
