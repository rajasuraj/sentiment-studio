/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        display: ["Outfit", "DM Sans", "system-ui", "sans-serif"],
      },
      colors: {
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f4f6f9",
          subtle: "#eef1f6",
        },
        ink: {
          950: "#0a0f1a",
          900: "#111827",
          800: "#1f2937",
          500: "#64748b",
          400: "#94a3b8",
        },
        accent: {
          DEFAULT: "#4f46e5",
          hover: "#4338ca",
          muted: "#eef2ff",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 24px rgba(15, 23, 42, 0.06)",
        "card-hover":
          "0 2px 4px rgba(15, 23, 42, 0.04), 0 8px 32px rgba(15, 23, 42, 0.08)",
        soft: "0 1px 3px rgba(15, 23, 42, 0.06)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
      animation: {
        shimmer: "shimmer 1.4s ease-in-out infinite",
      },
      keyframes: {
        shimmer: {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
