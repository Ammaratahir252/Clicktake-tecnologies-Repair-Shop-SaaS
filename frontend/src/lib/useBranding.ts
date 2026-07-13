"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export interface PublicBranding {
  logoUrl?: string;
  faviconUrl?: string;
  companyName?: string;
  footerText?: string;
  primaryColor?: string;
  secondaryColor?: string;
  loginBackgroundUrl?: string;
}

// Module-level cache + in-flight de-dupe so every component using this hook on the
// same page (header, footer, sidebar, etc.) shares one network request instead of
// each firing its own on mount.
let cached: PublicBranding | null = null;
let inflight: Promise<PublicBranding> | null = null;

function fetchBranding(): Promise<PublicBranding> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = axios
      .get("/api/public/branding")
      .then((res) => (cached = res.data?.data || {}))
      .catch(() => (cached = {}));
  }
  return inflight;
}

/** Platform branding (logo, favicon, colors, company name, etc.) from Settings →
 * Appearance. Returns `{}` until the fetch resolves — callers should fall back to
 * their own default look for every field, same as before this existed. */
export function useBranding(): PublicBranding {
  const [branding, setBranding] = useState<PublicBranding>(cached || {});

  useEffect(() => {
    let cancelled = false;
    fetchBranding().then((data) => {
      if (!cancelled) setBranding(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return branding;
}

/** Converts a "#rrggbb" (or "#rgb") hex color to an "r,g,b" triple for building rgba()
 * strings — lets tinted shadows/focus-rings follow a custom Appearance primary color
 * instead of staying hardcoded to one default. Falls back to Dibnow's default blue
 * (29,78,216) if given an unparsable value. */
export function hexToRgbTriple(hex: string): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return "29,78,216";
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}
