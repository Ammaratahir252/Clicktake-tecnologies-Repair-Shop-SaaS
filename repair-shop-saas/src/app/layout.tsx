import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // This import is what makes Tailwind work

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Repair Shop SaaS",
  description: "Multi-tenant repair shop management system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 antialiased`}>
        {/* The 'children' will render your Register and Login pages */}
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}