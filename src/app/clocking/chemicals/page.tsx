import { cookies } from 'next/headers';
import ChemicalWeighScreen from '@/components/clocking/chemical-weigh-screen';

export const metadata = {
  title: 'Weigh Chemicals — RSL Express',
  description: 'Kiosk screen for weighing laundry chemicals',
};

export default async function ChemicalWeighPage() {
  const cookieStore = await cookies();
  const isKioskMode = cookieStore.get('rsl_kiosk_mode')?.value === '1';

  return <ChemicalWeighScreen isKioskMode={isKioskMode} />;
}
