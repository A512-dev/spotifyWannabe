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
          600: "#2f2f2f",

          light: "#F0F0F0" 
        },
        brand: {
          // رنگ‌های پایه اسپاتیفای (در صورت نیاز به حفظ آن‌ها)
          500: "#744B93",
          600: "#169c46",
          primary: "#744B93",     // بنفش تیره
          secondary: "#C889B5",   // بنفش روشن
          accent: "#FCE5CC" ,      // کرمی/هلویی
          bgDark: "#1a0b2e"       // بنفش تیره عمیق (مخصوص پس‌زمینه کل سایت)
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