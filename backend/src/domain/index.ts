/**
 * Pricing rules for a shopping basket: products, offers and delivery.
 *
 * This is the public API of the domain. Code outside `domain/` imports from
 * this file only, so files inside can be moved or renamed freely.
 *
 * @packageDocumentation
 */

export { Basket, type BasketSummary, type OfferSaving } from './basket.js';
export {
  deliveryCharge,
  type DeliveryTier,
  nextDeliveryBand,
  type NextDeliveryBand,
} from './delivery.js';
export { UnknownProductError } from './errors.js';
export type { Cents } from './money.js';
export { buyOneGetSecondHalfPrice } from './offers/buy-one-get-second-half-price.js';
export type { Offer } from './offers/offer.js';
export type { Product } from './product.js';
