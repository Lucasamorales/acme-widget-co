import { describe, expect, it } from 'vitest';
import { deliveryCharge } from '../domain/index.js';
import { ACME_DELIVERY_TIERS, createAcmeBasket } from './acme-rules.js';

/** Prices a list of product codes with Acme's rules, in cents. */
function totalOf(codes: readonly string[]): number {
  const basket = createAcmeBasket();
  codes.forEach((code) => basket.add(code));
  return basket.total();
}

describe('Acme rules', () => {
  // Basket validates its rules on creation, so this fails in CI, before any
  // deploy, if someone mistypes a price or a delivery band.
  it('are valid', () => {
    expect(() => createAcmeBasket()).not.toThrow();
  });
});

// The example baskets and totals given in the brief.
describe('Acme rules: examples from the brief', () => {
  it.each([
    { codes: ['B01', 'G01'], total: 3785 }, // $37.85
    { codes: ['R01', 'R01'], total: 5437 }, // $54.37
    { codes: ['R01', 'G01'], total: 6085 }, // $60.85
    { codes: ['B01', 'B01', 'R01', 'R01', 'R01'], total: 9827 }, // $98.27
  ])('$codes costs $total cents', ({ codes, total }) => {
    expect(totalOf(codes)).toBe(total);
  });
});

// The exact boundary amounts cannot be reached with Acme's prices, so the
// bands are checked directly.
describe('Acme rules: delivery bands', () => {
  it.each([
    { amount: 4999, charge: 495 },
    { amount: 5000, charge: 295 }, // exactly $50 is not "under $50"
    { amount: 8999, charge: 295 },
    { amount: 9000, charge: 0 }, // exactly $90 is free
  ])('an order of $amount cents pays $charge cents delivery', ({ amount, charge }) => {
    expect(deliveryCharge(amount, ACME_DELIVERY_TIERS)).toBe(charge);
  });
});
