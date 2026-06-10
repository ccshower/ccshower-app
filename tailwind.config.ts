import type { Config } from "tailwindcss";

/**
 * Cores e sombras alinhadas a `docs/design-system.html` (referência visual).
 * Prefixo `cc` mantém compatibilidade com classes já usadas no app.
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cc: {
          ink: "#1a1f2e",
          deep: "#343d52",
          muted: "#6b7898",
          subtle: "#8d9ab5",
          canvas: "#f8fafc",
          surface: "#ffffff",
          border: "#dde3ed",
          "border-strong": "#b8c2d6",
          "border-light": "#f0f3f8",
          blue: "#7189a8",
          "blue-soft": "#e8f0f7",
          "blue-focus": "#8da3bf",
          "blue-deep": "#5b6f8c",
          rose: "#d4908a",
          "rose-soft": "#f7eceb",
          "rose-deep": "#c47a7a",
          red: "#c47a7a",
          "red-soft": "#f7eceb",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      borderRadius: {
        ds: "6px",
        "ds-lg": "12px",
        "ds-xl": "20px",
      },
      boxShadow: {
        sheet: "0 4px 16px rgba(26,31,46,0.08), 0 2px 6px rgba(26,31,46,0.05)",
        lift: "0 12px 40px rgba(26,31,46,0.12), 0 4px 12px rgba(26,31,46,0.06)",
        focus: "0 0 0 3px rgba(113,137,168,0.12)",
        "focus-error": "0 0 0 3px rgba(212,144,138,0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
