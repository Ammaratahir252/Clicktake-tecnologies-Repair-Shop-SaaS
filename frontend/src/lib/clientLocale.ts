'use client';

import { useEffect, useState, useCallback } from 'react';

/**
 * Client-side counterpart of lib/locale.ts — formats timestamps using the
 * platform's timezone / date format / time format (Super Admin → Settings →
 * General), fetched once from the public branding endpoint.
 */
interface ClientLocale {
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
}

const DEFAULTS: ClientLocale = { timezone: 'Asia/Karachi', dateFormat: 'DD/MM/YYYY', timeFormat: '24h' };

export function formatWithLocale(date: Date | string | number, locale: ClientLocale): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';

  let parts: Record<string, string> = {};
  try {
    for (const p of new Intl.DateTimeFormat('en-GB', {
      timeZone: locale.timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(d)) parts[p.type] = p.value;
  } catch {
    for (const p of new Intl.DateTimeFormat('en-GB', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(d)) parts[p.type] = p.value;
  }

  const dateStr =
    locale.dateFormat === 'MM/DD/YYYY' ? `${parts.month}/${parts.day}/${parts.year}`
    : locale.dateFormat === 'YYYY-MM-DD' ? `${parts.year}-${parts.month}-${parts.day}`
    : `${parts.day}/${parts.month}/${parts.year}`;

  let timeStr: string;
  if (locale.timeFormat === '12h') {
    const h24 = Number(parts.hour) % 24;
    const ampm = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    timeStr = `${h12}:${parts.minute} ${ampm}`;
  } else {
    timeStr = `${parts.hour}:${parts.minute}`;
  }

  return `${dateStr} ${timeStr}`;
}

/** Hook: returns a formatter bound to the platform's saved locale settings. */
export function usePlatformDateFormat(): (date: Date | string | number) => string {
  const [locale, setLocale] = useState<ClientLocale>(DEFAULTS);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/public/branding')
      .then((r) => r.json())
      .then((j) => {
        if (cancelled || !j?.data) return;
        setLocale({
          timezone: j.data.timezone || DEFAULTS.timezone,
          dateFormat: j.data.dateFormat || DEFAULTS.dateFormat,
          timeFormat: j.data.timeFormat === '12h' ? '12h' : '24h',
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return useCallback((date: Date | string | number) => formatWithLocale(date, locale), [locale]);
}
