/**
 * app/layout.tsx
 *
 * AuthGuard has been removed. Route protection is now handled entirely
 * by middleware.ts at the edge, before the page ever renders.
 */
import type { Metadata } from 'next';
import './globals.css'; // keep your existing global styles

export const metadata: Metadata = {
  title: 'Repair Shop SaaS',
  description: 'Multi-tenant repair shop management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}