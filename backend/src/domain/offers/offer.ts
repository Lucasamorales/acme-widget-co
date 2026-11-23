import type { Cents } from '../money.js';
import type { Product } from '../product.js';

/**
 * A special offer that can lower the price of a basket.
 *
 * Offers follow the Strategy pattern: the basket asks each offer for its
 * discount without knowing how the offer works. To add a new kind of offer,
 * implement this interface; `Basket` does not need to change.
 */
export interface Offer {
  /**
   * Works out how much this offer takes off the basket.
   *
   * @param items - Every product in the basket, one entry per unit.
   * @returns The discount in whole cents, zero when the offer does not apply.
   */
  discount(items: readonly Product[]): Cents;
}
