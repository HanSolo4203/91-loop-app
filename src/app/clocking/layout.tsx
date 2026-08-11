import type { Viewport } from 'next';
import { QueryProvider } from '@/lib/providers/query-provider';

/**
 * Kiosk layout — no Navigation, no AuthGuard.
 * Root AuthProvider still wraps the tree but treats /clocking as public.
 * QueryProvider is kept for any future client queries on this route.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0f172a',
};

export default function ClockingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <div
        className="fixed inset-0 z-50 bg-[#0f172a] text-white overflow-hidden flex flex-col"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
      >
        {children}
      </div>
    </QueryProvider>
  );
}
