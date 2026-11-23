import type { Cents } from './money.js';

/**
 * A delivery price band: orders strictly below `below` pay `charge`.
 *
 * Give the last band `below: Infinity` so that every order is covered.
 */
export interface DeliveryTier {
  /** Exclusive upper limit of the band. */
  readonly below: Cents;
  /** Delivery cost for an order in this band. */
  readonly charge: Cents;
}

/** The delivery band after the one an order is in, and how far away it is. */
export interface NextDeliveryBand {
  /** How much more the order (after offers) must reach to enter the band. */
  readonly amountToReach: Cents;
  /** Delivery cost in that band. */
  readonly charge: Cents;
}

/**
 * Returns the tiers ordered by their limit, so callers can pass them in any order.
 *
 * @param tiers - The delivery bands.
 */
function byLimit(tiers: readonly DeliveryTier[]): readonly DeliveryTier[] {
  return tiers.toSorted((a, b) => a.below - b.below);
}

/**
 * Returns the delivery charge for an order.
 *
 * Picks the band with the lowest limit that the order is under, so the
 * tiers can be passed in any order.
 *
 * @param orderAmount - The order amount after offers have been applied.
 * @param tiers - The delivery bands to choose from.
 * @returns The delivery charge.
 * @throws {RangeError} If no band covers `orderAmount`.
 */
export function deliveryCharge(orderAmount: Cents, tiers: readonly DeliveryTier[]): Cents {
  const tier = byLimit(tiers).find((candidate) => orderAmount < candidate.below);

  if (!tier) {
    throw new RangeError(`No delivery tier covers an order of ${orderAmount} cents`);
  }
  return tier.charge;
}

/**
 * Returns the band after the one an order is in, so the customer can be
 * told how much more to spend to change their delivery charge.
 *
 * Bands are not required to get cheaper; this reports the next band as
 * configured. Acme's bands do get cheaper, ending in free delivery.
 *
 * @param orderAmount - The order amount after offers have been applied.
 * @param tiers - The delivery bands, in any order.
 * @returns The next band, or `undefined` when the order is in the last band.
 * @throws {RangeError} If no band covers `orderAmount`.
 *
 * @example
 * // R01 + G01 is 5790 after offers; free delivery starts at 9000.
 * nextDeliveryBand(5790, ACME_DELIVERY_TIERS); // { amountToReach: 3210, charge: 0 }
 */
export function nextDeliveryBand(
  orderAmount: Cents,
  tiers: readonly DeliveryTier[],
): NextDeliveryBand | undefined {
  const sorted = byLimit(tiers);
  const index = sorted.findIndex((candidate) => orderAmount < candidate.below);
  const current = sorted[index];

  if (!current) {
    throw new RangeError(`No delivery tier covers an order of ${orderAmount} cents`);
  }
  const next = sorted[index + 1];
  if (!next) {
    return undefined;
  }
  // `current.below` is finite here: only the last band is open-ended, and
  // the last band has no next band.
  return { amountToReach: current.below - orderAmount, charge: next.charge };
}
