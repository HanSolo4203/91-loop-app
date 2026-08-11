import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/clocking';

const COOKIE_NAME = 'rsl_kiosk_mode';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function kioskCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
    secure: process.env.NODE_ENV === 'production',
  };
}

// GET /api/kiosk-mode — whether this device has kiosk mode active
export async function GET(request: NextRequest) {
  const active = request.cookies.get(COOKIE_NAME)?.value === '1';
  return NextResponse.json({ success: true, active });
}

// POST /api/kiosk-mode — admin only, sets the kiosk cookie
export async function POST(request: NextRequest) {
  try {
    const { isAdmin } = await getCurrentUser(request);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_NAME, '1', kioskCookieOptions(COOKIE_MAX_AGE));
    return response;
  } catch (error) {
    console.error('Error enabling kiosk mode:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to enable kiosk mode' },
      { status: 500 }
    );
  }
}

// DELETE /api/kiosk-mode — admin only, clears the kiosk cookie
export async function DELETE(request: NextRequest) {
  try {
    const { isAdmin } = await getCurrentUser(request);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_NAME, '', kioskCookieOptions(0));
    return response;
  } catch (error) {
    console.error('Error disabling kiosk mode:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to disable kiosk mode' },
      { status: 500 }
    );
  }
}
