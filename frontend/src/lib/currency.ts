/**
 * lib/currency.ts
 *
 * Shop-level revenue currency. Independent of the platform's own
 * subscription-billing currency (set separately in super-admin settings) —
 * this is what each shop owner displays their own repair/ticket revenue in,
 * picked to match wherever they operate.
 */

export interface CurrencyOption {
  code: string;
  label: string;
  symbol: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: "PKR", label: "Pakistani Rupee", symbol: "Rs." },
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "AED", label: "UAE Dirham", symbol: "AED" },
  { code: "SAR", label: "Saudi Riyal", symbol: "SAR" },
  { code: "INR", label: "Indian Rupee", symbol: "₹" },
  { code: "CAD", label: "Canadian Dollar", symbol: "CA$" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
];

export function currencySymbol(code?: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? (code ? `${code} ` : "Rs.");
}

/** e.g. formatMoney(45000, "USD") -> "$45,000" */
export function formatMoney(amount: number, code = "PKR"): string {
  const symbol = currencySymbol(code);
  const rounded = Math.round(amount || 0);
  return `${symbol} ${rounded.toLocaleString()}`;
}

/** e.g. formatMoneyCompact(452000, "USD") -> "$452.0K" — matches the existing "45K" style used across reports/dashboards */
export function formatMoneyCompact(amount: number, code = "PKR"): string {
  const symbol = currencySymbol(code);
  return `${symbol} ${((amount || 0) / 1000).toFixed(1)}K`;
}
