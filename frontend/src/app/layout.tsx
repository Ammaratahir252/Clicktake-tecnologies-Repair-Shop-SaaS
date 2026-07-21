import type { Metadata, Viewport } from 'next';
import { cache } from 'react';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';
import connectDB from '@/lib/db';
import PlatformSettings from '@/models/platformSettings.model';
import './globals.css';

// Cached per-request (React's cache()) so generateMetadata() and RootLayout() share
// one DB round trip instead of two, even though Next.js calls them separately.
const getBranding = cache(async (): Promise<{ faviconUrl: string; darkModeDefault: boolean; companyName: string }> => {
  try {
    await connectDB();
    const s = await PlatformSettings.findOne().select('faviconUrl darkModeDefault companyName').lean() as any;
    return {
      faviconUrl: s?.faviconUrl || '',
      darkModeDefault: s?.darkModeDefault ?? false,
      companyName: s?.companyName || 'DibnowRepairSaaS',
    };
  } catch {
    return { faviconUrl: '', darkModeDefault: false, companyName: 'DibnowRepairSaaS' };
  }
});

const DEFAULT_ICONS = {
  icon: [
    { url: '/favicon.svg', type: 'image/svg+xml' },
    { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
  ],
  apple: '/icon-192.png',
  shortcut: '/favicon.svg',
};

export async function generateMetadata(): Promise<Metadata> {
  const { faviconUrl, companyName } = await getBranding();

  return {
    title: {
      default: companyName,
      template: `%s · ${companyName}`,
    },
    description: 'Multi-tenant repair shop management platform with PWA support',
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: companyName,
    },
    // Falls back to the bundled static icon set until a super admin uploads a custom
    // favicon in Settings → Appearance.
    icons: faviconUrl ? { icon: [{ url: faviconUrl }], apple: faviconUrl, shortcut: faviconUrl } : DEFAULT_ICONS,
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fdf6ee' },
    { media: '(prefers-color-scheme: dark)', color: '#fdf6ee' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { darkModeDefault } = await getBranding();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        {/* DM Sans + DM Serif Display — loaded once, app-wide, instead of the
            per-page <link> tags this used to have (login/register/forgot-password/
            reset-password/select-plan/page.tsx/shops all pulled their own copy,
            which is exactly what Next's no-page-custom-font lint rule warns
            against: same font re-fetched per navigation instead of shared). */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800;9..40,900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme={darkModeDefault ? 'dark' : 'light'}
          enableSystem={false}
          disableTransitionOnChange
        >
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
