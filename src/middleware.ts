import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
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
    '/((?!_next/static|_next/image|favicon.ico|rsllogo.png|.*\\.png|.*\\.jpg|.*\\.svg).*)',
  ],
};
