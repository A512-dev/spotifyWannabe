import type { Config } from "tailwindcss";

const config: Config = {
  // Scan authored UI files only, allowing production CSS to omit unused classes.
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./providers/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      // Semantic tokens let components describe surface and brand roles.
      colors: {
        surface: {
          // Dark elevation scale: page background through raised controls.
          900: "#121212",
          800: "#181818",
          700: "#242424",
          600: "#2f2f2f",

          // Light transition screen used while auth/access state resolves.
          light: "#F0F0F0" 
        },
        brand: {
          // Numeric accents and the named purple/peach product palette.
          500: "#744B93",
          600: "#169c46",
          primary: "#744B93",
          secondary: "#C889B5",
          accent: "#FCE5CC",
          bgDark: "#1a0b2e"
        }
      },
      boxShadow: {
        // Upward shadow visually separates the fixed player from page content.
        player: "0 -16px 40px rgba(0, 0, 0, 0.35)"
      }
    }
  },
  plugins: []
};

export default config;
