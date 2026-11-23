/**
 * An amount of money in whole cents, e.g. `3295` for $32.95.
 *
 * All arithmetic uses integer cents because binary floating point cannot
 * represent most decimal prices exactly (`0.1 + 0.2 !== 0.3`). Formatting
 * amounts for display is the frontend's job.
 */
export type Cents = number;

/**
 * Checks that a number is a valid amount of money.
 *
 * @param value - The number to check.
 * @returns `true` for a whole, non-negative number of cents.
 */
export function isCents(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}
