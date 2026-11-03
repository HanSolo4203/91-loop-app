import { NextResponse } from 'next/server';
import { kioskChemicalErrorResponse, listKioskChemicals } from '@/lib/clocking-chemicals';

export const dynamic = 'force-dynamic';

// GET /api/clocking/chemicals
export async function GET() {
  try {
    const products = await listKioskChemicals();
    return NextResponse.json({ success: true, products });
  } catch (error) {
    return kioskChemicalErrorResponse(error, 'GET /api/clocking/chemicals error:');
  }
}
