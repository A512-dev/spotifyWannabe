export type Language = "en" | "fa";

export const LANGUAGE_STORAGE_KEY = "soundwave-language";

const persianLabels: Record<string, string> = {
  Home: "خانه",
  Music: "موسیقی",
  Playlists: "فهرست‌های پخش",
  "Artist Dashboard": "داشبورد هنرمند",
  Support: "پشتیبانی",
  Admin: "مدیریت",
  Profile: "نمایه",
  Notifications: "اعلان‌ها",
  Settings: "تنظیمات",
  Preferences: "ترجیحات",
  Language: "زبان",
  English: "انگلیسی",
  Persian: "فارسی",
  "System sounds": "صداهای سامانه",
  "Enable notifications": "فعال‌سازی اعلان‌ها",
  "Subscription expiry notifications": "اعلان‌های پایان اشتراک",
  "Followed artist releases": "انتشارهای هنرمندان دنبال‌شده",
  "Support ticket notifications": "اعلان‌های تیکت پشتیبانی",
  "Save preferences": "ذخیرهٔ ترجیحات",
  "Saving...": "در حال ذخیره...",
  Subscription: "اشتراک",
  Plan: "طرح",
  "Billing period": "دورهٔ پرداخت",
  "Continue to payment": "ادامه به پرداخت",
  "Danger zone": "ناحیهٔ خطر",
  "Delete account": "حذف حساب",
  "Main navigation": "ناوبری اصلی",
  Workspace: "فضای کاری",
  Account: "حساب کاربری",
  "Session Active": "نشست فعال",
  "Log out": "خروج",
  "Loading account...": "در حال بارگذاری حساب...",
  "Sign in required": "ورود لازم است",
  "Access denied": "دسترسی مجاز نیست",
  "Please log in before opening this part of SoundWave.": "برای مشاهدهٔ این بخش از ساوندویو وارد حساب خود شوید.",
  "Go to login": "رفتن به صفحهٔ ورود",
  "Your current role does not have access to this page.": "نقش کاربری فعلی شما به این صفحه دسترسی ندارد.",
  "Go to your home": "رفتن به صفحهٔ اصلی",
};

export function localeForLanguage(language: Language) {
  return language === "fa" ? "fa-IR" : "en-US";
}

export function translate(language: Language, label: string, values?: Record<string, string | number>) {
  const template = language === "fa" ? (persianLabels[label] ?? label) : label;
  if (!values) return template;
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

export function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "en";
  return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) === "fa" ? "fa" : "en";
}

