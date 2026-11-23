const usdFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/**
 * Formats an amount of cents from the API as US dollars, for display only.
 *
 * Dividing by 100 gives a float that is not exactly the decimal amount, but
 * the error is far below half a cent, so rounding to two decimals is always
 * correct. Never do further arithmetic with the result.
 *
 * @example
 * formatCents(5437); // "$54.37"
 */
export function formatCents(cents: number): string {
  return usdFormatter.format(cents / 100);
}
