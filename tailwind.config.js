/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0f1a",
        panel: "#111827",
        ink: "#e5e7eb",
        sub: "#9ca3af",
        neon: {
          cyan: "#2bd9fe",
          pink: "#ff3cac",
          lime: "#b7ff4a",
        },
      },
      boxShadow: {
        neon: "0 0 6px rgba(43,217,254,.6), inset 0 0 16px rgba(255,60,172,.08)",
        glow: "0 0 20px rgba(43,217,254,.25)",
      },
      fontFamily: {
        display: ["Orbitron", "ui-sans-serif", "system-ui"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
