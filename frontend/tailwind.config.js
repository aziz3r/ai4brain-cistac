/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        ink: "var(--ink)",
        "muted-ink": "var(--muted-ink)",
        terracotta: "var(--terracotta)",
        teal: {
          DEFAULT: "var(--teal)",
          tint: "var(--teal-tint)",
        },
        hairline: "var(--hairline)",
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "Fraunces", "Georgia", "serif"],
        sans: ["var(--font-instrument)", "Instrument Sans", "Source Sans 3", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};