export type StockUnit = 'L' | 'kg';

/** Products are stocked in litres unless the product is set to kilograms. */
export function stockUnit(value: unknown): StockUnit {
  return value === 'kg' ? 'kg' : 'L';
}

/**
 * Kilogram products are 1 kg of stock per 1 kg on the scale.
 * Litre products keep their kg-per-litre conversion.
 */
export function densityForUnit(unit: unknown, kgPerLitre: number): number {
  if (stockUnit(unit) === 'kg') return 1;
  return Number.isFinite(kgPerLitre) && kgPerLitre > 0 ? kgPerLitre : 1;
}
