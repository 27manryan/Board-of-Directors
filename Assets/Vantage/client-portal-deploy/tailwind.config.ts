import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Vantage core palette
        navy: {
          DEFAULT: "#1B2A4A",
          light: "#253761",
          dark: "#121D33",
        },
        gold: {
          DEFAULT: "#B8972E",
          light: "#CDB050",
          dark: "#96791F",
        },
        cream: {
          DEFAULT: "#F5F0E8",
          50: "#F8F3EB",
          100: "#F5F0E8",
          200: "#F2EDE5",
          300: "#ECE8E0",
        },
        muted: "#6B7FA3",
      },
      fontFamily: {
        serif: ["Cormorant Garamond", "Georgia", "serif"],
        sans: ["system-ui", "-apple-system", "sans-serif"],
      },
      fontSize: {
        label: ["0.75rem", { letterSpacing: "0.1em", fontWeight: "500" }],
      },
      borderRadius: {
        // Zero radius everywhere — sharp edges per design system
        none: "0px",
        DEFAULT: "0px",
        sm: "0px",
        md: "0px",
        lg: "0px",
        xl: "0px",
        "2xl": "0px",
        full: "0px",
      },
      letterSpacing: {
        widest: "0.15em",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
