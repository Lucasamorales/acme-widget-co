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
  const tier = tiers
    .toSorted((a, b) => a.below - b.below)
    .find((candidate) => orderAmount < candidate.below);

  if (!tier) {
    throw new RangeError(`No delivery tier covers an order of ${orderAmount} cents`);
  }
  return tier.charge;
}
