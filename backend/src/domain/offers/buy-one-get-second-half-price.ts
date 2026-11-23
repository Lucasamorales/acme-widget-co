import type { Offer } from './offer.js';

/**
 * Creates a "buy one, get the second half price" offer for one product.
 *
 * Units are discounted in pairs: two units get one discount, three units
 * still get one, and four get two.
 *
 * When half the price is not a whole number of cents, the customer pays the
 * lower amount. Half of 3295 is 1647.5, so the second unit costs 1647 and the
 * discount is 1648. The example totals in the brief ($54.37 and $98.27) are
 * only reached with this rounding.
 *
 * @param productCode - Code of the product the offer applies to.
 * @returns An offer to pass to a `Basket`.
 *
 * @example
 * const offers = [buyOneGetSecondHalfPrice('R01')];
 */
export function buyOneGetSecondHalfPrice(productCode: string): Offer {
  return {
    label: 'Buy one, get the second half price',
    productCodes: [productCode],
    discount(items) {
      const units = items.filter((item) => item.code === productCode);
      const pairs = Math.floor(units.length / 2);

      // All units share one price. With no units there are no pairs, so 0 is safe.
      const unitPrice = units[0]?.price ?? 0;
      const secondUnitPrice = Math.floor(unitPrice / 2);

      return pairs * (unitPrice - secondUnitPrice);
    },
  };
}
