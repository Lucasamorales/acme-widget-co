import { describe, expect, it } from 'vitest';
import { Basket } from './basket.js';
import type { DeliveryTier } from './delivery.js';
import { UnknownProductError } from './errors.js';
import type { Offer } from './offers/offer.js';
import type { Product } from './product.js';

// Simple test rules, independent of Acme's, so these tests only exercise
// the basket's own logic.
const CATALOGUE: readonly Product[] = [
  { code: 'A', name: 'Item A', price: 600 },
  { code: 'B', name: 'Item B', price: 500 },
];

const TIERS: readonly DeliveryTier[] = [
  { below: 1000, charge: 100 },
  { below: Infinity, charge: 0 },
];

/** An offer that always takes off the same amount. */
function fixedDiscount(amount: number): Offer {
  return { label: 'Fixed discount', productCodes: [], discount: () => amount };
}

/** An offer that takes 100 off every unit of A after the first. */
const EVERY_EXTRA_A_SAVES_100: Offer = {
  label: 'Extra A saves 100',
  productCodes: ['A'],
  discount: (items) => Math.max(0, items.filter((item) => item.code === 'A').length - 1) * 100,
};

describe('Basket', () => {
  it('costs nothing when empty, with no delivery charge', () => {
    const basket = new Basket(CATALOGUE, TIERS, []);

    expect(basket.summary()).toMatchObject({ subtotal: 0, delivery: 0, total: 0 });
  });

  it('adds up item prices and the delivery charge', () => {
    const basket = new Basket(CATALOGUE, TIERS, []);
    basket.add('A');

    expect(basket.summary()).toMatchObject({ subtotal: 600, delivery: 100, total: 700 });
  });

  it('charges delivery on the amount after offers', () => {
    const basket = new Basket(CATALOGUE, TIERS, [fixedDiscount(200)]);
    basket.add('A');
    basket.add('B');

    // 1100 is free to deliver, but 1100 - 200 = 900 is not.
    expect(basket.summary()).toMatchObject({
      subtotal: 1100,
      discount: 200,
      delivery: 100,
      total: 1000,
    });
  });

  it('adds up the discounts from every offer', () => {
    const basket = new Basket(CATALOGUE, TIERS, [fixedDiscount(50), fixedDiscount(25)]);
    basket.add('A');

    expect(basket.summary().discount).toBe(75);
  });

  it('total() matches summary().total', () => {
    const basket = new Basket(CATALOGUE, TIERS, [fixedDiscount(50)]);
    basket.add('A');

    expect(basket.total()).toBe(basket.summary().total);
  });

  it('rejects a product code that is not in the catalogue', () => {
    const basket = new Basket(CATALOGUE, TIERS, []);

    expect(() => basket.add('Z')).toThrow(UnknownProductError);
    expect(() => basket.add('Z')).toThrow('Unknown product code: "Z"');
  });

  it('rejects an offer that returns a fraction of a cent', () => {
    const basket = new Basket(CATALOGUE, TIERS, [fixedDiscount(1647.5)]);
    basket.add('A');

    expect(() => basket.total()).toThrow('An offer returned an invalid discount: 1647.5');
  });
});

describe('Basket next delivery band', () => {
  it('measures the distance from the amount after offers', () => {
    const basket = new Basket(CATALOGUE, TIERS, [fixedDiscount(200)]);
    basket.add('A');
    basket.add('B');

    // 1100 - 200 = 900, so 100 more reaches the free band.
    expect(basket.summary().nextDeliveryBand).toEqual({ amountToReach: 100, charge: 0 });
  });

  it('has none for an empty basket, which pays no delivery', () => {
    const basket = new Basket(CATALOGUE, TIERS, []);

    expect(basket.summary().nextDeliveryBand).toBeUndefined();
  });

  it('has none once the order is in the last band', () => {
    const basket = new Basket(CATALOGUE, TIERS, []);
    basket.add('A');
    basket.add('B');

    expect(basket.summary().nextDeliveryBand).toBeUndefined();
  });
});

describe('Basket offer savings on the next unit', () => {
  it.each([
    { codes: [], savings: [] }, // the first A saves nothing
    { codes: ['B'], savings: [] },
    { codes: ['A'], savings: [{ productCode: 'A', saving: 100 }] },
    { codes: ['A', 'A'], savings: [{ productCode: 'A', saving: 100 }] },
  ])('with $codes in the basket returns $savings', ({ codes, savings }) => {
    const basket = new Basket(CATALOGUE, TIERS, [EVERY_EXTRA_A_SAVES_100]);
    codes.forEach((code) => basket.add(code));

    expect(basket.offerSavingsOnNextUnit()).toEqual(savings);
  });

  it('does not change the basket', () => {
    const basket = new Basket(CATALOGUE, TIERS, [EVERY_EXTRA_A_SAVES_100]);
    basket.add('A');

    basket.offerSavingsOnNextUnit();

    expect(basket.summary().subtotal).toBe(600);
  });
});

describe('Basket rule validation', () => {
  it.each([
    {
      problem: 'two products share a code',
      catalogue: [...CATALOGUE, { code: 'A', name: 'Duplicate', price: 1 }],
      tiers: TIERS,
      error: 'Duplicate product code in catalogue: "A"',
    },
    {
      problem: 'a price is written in dollars',
      catalogue: [{ code: 'A', name: 'Item A', price: 32.95 }],
      tiers: TIERS,
      error: 'Price of "A" must be whole cents, got 32.95',
    },
    {
      problem: 'a price is negative',
      catalogue: [{ code: 'A', name: 'Item A', price: -1 }],
      tiers: TIERS,
      error: 'Price of "A" must be whole cents, got -1',
    },
    {
      problem: 'a delivery charge is not whole cents',
      catalogue: CATALOGUE,
      tiers: [{ below: Infinity, charge: 4.95 }],
      error: 'Delivery charge must be whole cents, got 4.95',
    },
    {
      problem: 'no delivery band is open-ended',
      catalogue: CATALOGUE,
      tiers: [{ below: 1000, charge: 100 }],
      error: 'Delivery tiers need an open-ended band with `below: Infinity`',
    },
  ])('fails when $problem', ({ catalogue, tiers, error }) => {
    expect(() => new Basket(catalogue, tiers, [])).toThrow(error);
  });
});
