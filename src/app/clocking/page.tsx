import { cookies } from 'next/headers';
import KioskScreen from '@/components/clocking/kiosk-screen';

export const metadata = {
  title: 'Clock In / Out — RSL Express',
  description: 'Employee clock-in kiosk for RSL Express laundry',
};

export default async function ClockingPage() {
  const cookieStore = await cookies();
  const isKioskMode = cookieStore.get('rsl_kiosk_mode')?.value === '1';

  return <KioskScreen isKioskMode={isKioskMode} />;
}
