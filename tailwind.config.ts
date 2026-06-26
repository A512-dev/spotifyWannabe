import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./providers/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          900: "#121212",
          800: "#181818",
          700: "#242424",
          600: "#2f2f2f"
        },
        brand: {
          500: "#1db954",
          600: "#169c46"
        }
      },
      boxShadow: {
        player: "0 -16px 40px rgba(0, 0, 0, 0.35)"
      }
    }
  },
  plugins: []
};

export default config;

