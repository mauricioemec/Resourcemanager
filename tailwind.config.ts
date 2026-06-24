import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0b1020",
        surface: "#141a2e",
        "surface-2": "#1c2440",
        border: "#283153",
        muted: "#8b97b8",
        text: "#e8ecf7",
        brand: "#5b8def",
        good: "#22c55e",
        warn: "#f59e0b",
        bad: "#ef4444",
      },
    },
  },
  plugins: [],
};

export default config;
