import { QueryProvider } from '@/lib/providers/query-provider';

/**
 * Kiosk layout — no Navigation, no AuthGuard.
 * Root AuthProvider still wraps the tree but treats /clocking as public.
 * QueryProvider is kept for any future client queries on this route.
 */
export default function ClockingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <div className="min-h-screen bg-[#0f172a] text-white overflow-hidden">
        {children}
      </div>
    </QueryProvider>
  );
}
