import { NextRequest, NextResponse } from 'next/server';
import { authenticateClockingPin } from '@/lib/clocking';
import { kioskChemicalErrorResponse, parseKioskBody, startKioskWeighIn } from '@/lib/clocking-chemicals';
import { KioskStartWeighInSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

// POST /api/clocking/chemicals/start
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateClockingPin(
      request,
      'POST /api/clocking/chemicals/start pin error:'
    );
    if (auth.response) return auth.response;

    const input = parseKioskBody(auth.body, KioskStartWeighInSchema);
    const weighIn = await startKioskWeighIn({
      employeeId: auth.employee.id,
      productId: input.product_id,
      startKg: input.start_kg,
      pouredL: input.poured_l,
      notes: input.notes,
    });

    return NextResponse.json({ success: true, weigh_in: weighIn });
  } catch (error) {
    return kioskChemicalErrorResponse(error, 'POST /api/clocking/chemicals/start error:');
  }
}
