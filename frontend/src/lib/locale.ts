import 'server-only';
import connectDB from '@/lib/db';
import PlatformSettings from '@/models/platformSettings.model';

/**
 * Platform locale settings (Super Admin → Settings → General) applied to every
 * platform-generated timestamp: emails, the daily report, and (via
 * /api/public/branding) the admin Audit/Logs date columns.
 */
export interface PlatformLocale {
  timezone: string;
  dateFormat: string;          // DD/MM/YYYY | MM/DD/YYYY | YYYY-MM-DD
  timeFormat: '12h' | '24h';
}

const LOCALE_DEFAULTS: PlatformLocale = { timezone: 'Asia/Karachi', dateFormat: 'DD/MM/YYYY', timeFormat: '24h' };

export async function getPlatformLocale(): Promise<PlatformLocale> {
  try {
    await connectDB();
    const s = await PlatformSettings.findOne().select('timezone dateFormat timeFormat').lean() as any;
    return {
      timezone: s?.timezone || LOCALE_DEFAULTS.timezone,
      dateFormat: s?.dateFormat || LOCALE_DEFAULTS.dateFormat,
      timeFormat: s?.timeFormat === '12h' ? '12h' : '24h',
    };
  } catch {
    return LOCALE_DEFAULTS;
  }
}

function partsIn(d: Date, timezone: string): Record<string, string> {
  let fmt: Intl.DateTimeFormat;
  try {
    fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
  } catch {
    fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'UTC',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
  }
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) out[p.type] = p.value;
  return out;
}

export function formatPlatformDate(date: Date | string | number, locale: PlatformLocale): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  const p = partsIn(d, locale.timezone);
  switch (locale.dateFormat) {
    case 'MM/DD/YYYY': return `${p.month}/${p.day}/${p.year}`;
    case 'YYYY-MM-DD': return `${p.year}-${p.month}-${p.day}`;
    default:           return `${p.day}/${p.month}/${p.year}`;
  }
}

export function formatPlatformTime(date: Date | string | number, locale: PlatformLocale): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  const p = partsIn(d, locale.timezone);
  if (locale.timeFormat === '12h') {
    const h24 = Number(p.hour) % 24;
    const ampm = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12}:${p.minute} ${ampm}`;
  }
  return `${p.hour}:${p.minute}`;
}

export function formatPlatformDateTime(date: Date | string | number, locale: PlatformLocale): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return `${formatPlatformDate(d, locale)} ${formatPlatformTime(d, locale)} (${locale.timezone})`;
}
