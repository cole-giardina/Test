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
          bg: "#0D1B2A",
          surface: "#1A2E40",
          border: "#2A4560",
          accent: "#5C7E8F",
          bright: "#7FB3C8",
          glow: "#AECFDC",
        },
        /** Legacy `cirque.*` aliases — mapped to dark theme tokens */
        cirque: {
          white: "#0D1B2A",
          bg: "#0D1B2A",
          ink: "#FFFFFF",
          muted: "#A8C0D0",
          tertiary: "#5C7E8F",
          line: "#2A4560",
          surface: "#1A2E40",
          accent: "#5C7E8F",
          bright: "#7FB3C8",
          glow: "#AECFDC",
        },
      },
      fontFamily: {
        sans: ["System", "sans-serif"],
      },
    },
  },
  plugins: [],
};
