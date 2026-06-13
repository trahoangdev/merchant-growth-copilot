import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-super-sans-vf)", "sans-serif"],
        body: ["var(--font-super-sans-vf)", "sans-serif"]
      },
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        panel: "var(--panel)",
        text: "var(--text)",
        muted: "var(--muted)",
        primary: "var(--primary)",
        accent: "var(--accent)",
        danger: "var(--danger)",
        line: "var(--line)"
      }
    }
  },
  plugins: []
};

export default config;
