"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { currencySymbol, formatMoney, formatMoneyCompact } from "@/lib/currency";

// Module-level cache + in-flight de-dupe, same pattern as useBranding — every
// component on a page shares one /api/tenant/branding request instead of each
// firing its own. Cleared on full page load (e.g. after login/logout/impersonation
// switch), which is when the tenant context can actually change.
let cached: string | null = null;
let inflight: Promise<string> | null = null;

function fetchCurrency(): Promise<string> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = api
      .get("/api/tenant/branding")
      .then((res) => (cached = res.data?.data?.branding?.currency || "PKR"))
      .catch(() => (cached = "PKR"));
  }
  return inflight;
}

/** The current tenant's owner-configured revenue display currency (Owner Settings →
 * Shop Profile → Currency). Defaults to PKR until the fetch resolves or if unset. */
export function useTenantCurrency() {
  const [currency, setCurrency] = useState<string>(cached || "PKR");

  useEffect(() => {
    let cancelled = false;
    fetchCurrency().then((c) => {
      if (!cancelled) setCurrency(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    currency,
    symbol: currencySymbol(currency),
    format: (amount: number) => formatMoney(amount, currency),
    formatCompact: (amount: number) => formatMoneyCompact(amount, currency),
  };
}
