// Locale-sensitive presentation stays out of pages/components. Callers may
// override en-US when internationalization is introduced.
export function formatDate(value: string, locale = "en-US") {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

export function formatNumber(value: number, locale = "en-US") {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatCurrencyFromCents(
  cents: number,
  currency = "USD",
  locale = "en-US"
) {
  // Financial records use integer cents; Intl expects the major currency unit.
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency
  }).format(cents / 100);
}

export function formatDuration(seconds: number) {
  // Audio durations use compact m:ss rather than a locale-aware clock.
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
