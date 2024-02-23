import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    colors: {
      white: colors.white,
      primary: {
        100: "#F3F0F9",
        200: "#E7E1F4",
        300: "#CCC0E7",
        400: "#8C73C9",
        500: "#5E3FA6",
        600: "#513790",
        700: "#432D76",
        800: "#302055",
        900: "#1D1434",
        950: "#1F1537",
      },
      slate: colors.slate,
      orange: { 600: "orange" },
      green: { 600: "green" },
    },
    extend: {
      fontFamily: {
        space: ["SpaceGrotesk-Regular", "sans-serif"],
        spaceBold: ["SpaceGrotesk-Bold", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
