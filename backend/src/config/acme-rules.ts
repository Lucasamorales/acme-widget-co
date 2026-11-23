/**
 * Acme Widget Co's prices, delivery bands and offers, taken from the brief.
 *
 * Business rules live here as data. Changing a price, a band or an offer
 * means editing this file only.
 *
 * @packageDocumentation
 */

import {
  Basket,
  buyOneGetSecondHalfPrice,
  type DeliveryTier,
  type Offer,
  type Product,
} from '../domain/index.js';

/** The products Acme sells. */
export const ACME_CATALOGUE: readonly Product[] = [
  { code: 'R01', name: 'Red Widget', price: 3295 },
  { code: 'G01', name: 'Green Widget', price: 2495 },
  { code: 'B01', name: 'Blue Widget', price: 795 },
];

/** Under $50 pays $4.95, under $90 pays $2.95, $90 or more is free. */
export const ACME_DELIVERY_TIERS: readonly DeliveryTier[] = [
  { below: 5000, charge: 495 },
  { below: 9000, charge: 295 },
  { below: Infinity, charge: 0 },
];

/** The offers currently running. */
export const ACME_OFFERS: readonly Offer[] = [buyOneGetSecondHalfPrice('R01')];

/** Creates an empty basket with Acme's rules. */
export function createAcmeBasket(): Basket {
  return new Basket(ACME_CATALOGUE, ACME_DELIVERY_TIERS, ACME_OFFERS);
}
