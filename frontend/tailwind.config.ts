import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: "#09090b",
        surface: {
          DEFAULT: "#121214",
          secondary: "#151518",
          tertiary: "#1a1a1e",
        },
        card: {
          DEFAULT: "#18181b",
          hover: "#202024",
        },
        border: {
          DEFAULT: "#27272a",
          subtle: "#1e1e22",
          highlight: "#3f3f46",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
