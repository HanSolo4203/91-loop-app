function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export interface DecantFill {
  /** Litres already in the bottle, from the scale. */
  litresNow: number;
  /** Litres to take from the drum. Zero when the bottle is already full. */
  pouredL: number;
  /** Weight the shift starts at. The full bottle after a pour, otherwise the scale weight. */
  startKg: number;
}

/**
 * Staff weigh the bottle before filling it. The pour is the gap up to the
 * bottle size, and that amount leaves the drums. The shift then starts from
 * a full bottle, so end-of-shift usage does not add the pour again.
 */
export function pourToFillBottle(
  weighedKg: number,
  issueSizeL: number,
  kgPerLitre: number
): DecantFill {
  const density = kgPerLitre > 0 ? kgPerLitre : 1;
  const targetL = issueSizeL > 0 ? issueSizeL : 5;
  const litresNow = round3(weighedKg / density);
  const pouredL = round3(Math.max(0, targetL - litresNow));
  const startKg = pouredL > 0 ? round3(targetL * density) : round3(weighedKg);
  return { litresNow, pouredL, startKg };
}

export function drumPourLimitMessage(
  pouredL: number,
  drumL: number,
  unit: 'L' | 'kg' = 'L'
): string | null {
  if (pouredL <= drumL) return null;
  const left = Math.max(0, drumL);
  if (left <= 0) return 'Nothing left in the drums to pour.';
  return `Only ${(Math.round(left * 10) / 10).toFixed(1)} ${unit} left in the drums.`;
}
