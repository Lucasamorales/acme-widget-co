import { describe, expect, it } from 'vitest';
import { deliveryCharge, type DeliveryTier, nextDeliveryBand } from './delivery.js';

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

describe('nextDeliveryBand', () => {
  it.each([
    { amount: 0, next: { amountToReach: 1000, charge: 100 } },
    { amount: 999, next: { amountToReach: 1, charge: 100 } },
    { amount: 1000, next: { amountToReach: 1000, charge: 0 } },
    { amount: 1999, next: { amountToReach: 1, charge: 0 } },
    { amount: 2000, next: undefined }, // already in the last band
  ])('for an order of $amount returns $next', ({ amount, next }) => {
    expect(nextDeliveryBand(amount, TIERS)).toEqual(next);
  });

  it('gives the same result when tiers are passed out of order', () => {
    expect(nextDeliveryBand(999, TIERS.toReversed())).toEqual({ amountToReach: 1, charge: 100 });
  });

  it('throws a RangeError when no tier covers the order', () => {
    const capped = [{ below: 1000, charge: 200 }];

    expect(() => nextDeliveryBand(1000, capped)).toThrow(RangeError);
  });
});
