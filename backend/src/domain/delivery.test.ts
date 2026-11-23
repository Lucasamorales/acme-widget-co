import { describe, expect, it } from 'vitest';
import { deliveryCharge, type DeliveryTier } from './delivery.js';

const TIERS: readonly DeliveryTier[] = [
  { below: 1000, charge: 200 },
  { below: 2000, charge: 100 },
  { below: Infinity, charge: 0 },
];

describe('deliveryCharge', () => {
  it.each([
    { amount: 0, charge: 200 },
    { amount: 999, charge: 200 },
    { amount: 1000, charge: 100 },
    { amount: 1999, charge: 100 },
    { amount: 2000, charge: 0 },
  ])('charges $charge for an order of $amount', ({ amount, charge }) => {
    expect(deliveryCharge(amount, TIERS)).toBe(charge);
  });

  it('gives the same result when tiers are passed out of order', () => {
    const reversed = TIERS.toReversed();

    expect(deliveryCharge(999, reversed)).toBe(200);
    expect(deliveryCharge(2000, reversed)).toBe(0);
  });

  it('throws a RangeError when no tier covers the order', () => {
    const capped = [{ below: 1000, charge: 200 }];

    expect(() => deliveryCharge(1000, capped)).toThrow(RangeError);
  });
});
