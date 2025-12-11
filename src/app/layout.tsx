import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { QueryProvider } from "@/lib/providers/query-provider";
import { RefreshTokenGuard } from "@/components/auth/refresh-token-guard";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "RSL Express - Linen Tracking System",
  description: "Professional linen tracking and management system for RSL Express. Track batches, manage inventory, and streamline your linen operations.",
  keywords: ["linen tracking", "inventory management", "RSL Express", "laundry management", "batch tracking"],
  authors: [{ name: "RSL Express" }],
  openGraph: {
    title: "RSL Express - Linen Tracking System",
    description: "Professional linen tracking and management system",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased bg-slate-50 text-slate-900">
        <ErrorBoundary>
          <RefreshTokenGuard />
          <QueryProvider>
            <div className="min-h-screen flex flex-col">
              {children}
            </div>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
