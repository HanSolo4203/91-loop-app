import { NextRequest, NextResponse } from 'next/server';
import { authenticateClockingPin } from '@/lib/clocking';
import { endKioskWeighIn, kioskChemicalErrorResponse, parseKioskBody } from '@/lib/clocking-chemicals';
import { KioskEndWeighInSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

// POST /api/clocking/chemicals/end
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateClockingPin(
      request,
      'POST /api/clocking/chemicals/end pin error:'
    );
    if (auth.response) return auth.response;

    const input = parseKioskBody(auth.body, KioskEndWeighInSchema);
    const result = await endKioskWeighIn({
      employeeId: auth.employee.id,
      weighInId: input.weigh_in_id,
      endKg: input.end_kg,
      addedL: input.added_l,
      notes: input.notes,
      confirmHighUsage: input.confirm_high_usage === true,
    });

    return NextResponse.json({
      success: true,
      weigh_in: result.weigh_in,
      on_hand_l: result.on_hand_l,
    });
  } catch (error) {
    return kioskChemicalErrorResponse(error, 'POST /api/clocking/chemicals/end error:');
  }
}
