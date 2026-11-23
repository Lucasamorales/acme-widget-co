import { describe, expect, it } from 'vitest';
import type { Product } from '../product.js';
import { buyOneGetSecondHalfPrice } from './buy-one-get-second-half-price.js';

const RED: Product = { code: 'R01', name: 'Red Widget', price: 3295 };
const BLUE: Product = { code: 'B01', name: 'Blue Widget', price: 795 };

/** Returns `count` units of `product`. */
function unitsOf(product: Product, count: number): Product[] {
  return Array.from({ length: count }, () => product);
}

describe('buyOneGetSecondHalfPrice', () => {
  const offer = buyOneGetSecondHalfPrice('R01');

  it.each([
    { reds: 0, discount: 0 },
    { reds: 1, discount: 0 },
    // Half of 3295 is 1647.5. The customer pays 1647, so the discount is 1648.
    { reds: 2, discount: 1648 },
    { reds: 3, discount: 1648 },
    { reds: 4, discount: 3296 },
  ])('takes off $discount for $reds red widgets', ({ reds, discount }) => {
    expect(offer.discount(unitsOf(RED, reds))).toBe(discount);
  });

  it('ignores other products', () => {
    expect(offer.discount([RED, BLUE, BLUE])).toBe(0);
  });
});
