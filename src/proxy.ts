import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js 16+: route interception lives in proxy.ts (middleware.ts is ignored).
 * When rsl_kiosk_mode=1, keep this device on /clocking only.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Kiosk page, clocking APIs, and kiosk-mode toggle must remain reachable
  if (
    pathname.startsWith('/clocking') ||
    pathname.startsWith('/api/clocking') ||
    pathname.startsWith('/api/kiosk-mode')
  ) {
    return NextResponse.next();
  }

  const isKioskMode = request.cookies.get('rsl_kiosk_mode')?.value === '1';

  if (isKioskMode) {
    return NextResponse.redirect(new URL('/clocking', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets.
     * Keep this broad so dashboard/login/etc. are locked when kiosk mode is on.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)',
  ],
};
