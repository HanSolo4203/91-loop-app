import type { Metadata, Viewport } from 'next';
import { QueryProvider } from '@/lib/providers/query-provider';

/**
 * Kiosk layout — no Navigation, no AuthGuard.
 * Root AuthProvider still wraps the tree but treats /clocking as public.
 * QueryProvider is kept for any future client queries on this route.
 */
export const metadata: Metadata = {
  title: 'RSL Express — Staff Kiosk',
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'RSL Kiosk',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#1e3a8a',
};

export default function ClockingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <div className="h-dvh w-screen overflow-hidden bg-blue-900 select-none text-white">
        {children}
      </div>
    </QueryProvider>
  );
}
