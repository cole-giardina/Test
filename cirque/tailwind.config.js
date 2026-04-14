/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./context/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#3C3835",
          surface: "#514B47",
          border: "#6B645F",
          accent: "#6E7F99",
          bright: "#8FA1BC",
          glow: "#B7C4D8",
        },
        /** Legacy `cirque.*` aliases — mapped to dark theme tokens */
        cirque: {
          white: "#3C3835",
          bg: "#3C3835",
          ink: "#F2EEEA",
          muted: "#D3CBC4",
          tertiary: "#B1A79F",
          line: "#6B645F",
          surface: "#514B47",
          accent: "#6E7F99",
          bright: "#8FA1BC",
          glow: "#B7C4D8",
        },
      },
      fontFamily: {
        sans: ["System", "sans-serif"],
      },
    },
  },
  plugins: [],
};
