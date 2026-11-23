import {
  deliveryCharge,
  type DeliveryTier,
  nextDeliveryBand,
  type NextDeliveryBand,
} from './delivery.js';
import { UnknownProductError } from './errors.js';
import { type Cents, isCents } from './money.js';
import type { Offer } from './offers/offer.js';
import type { Product } from './product.js';

/** Every step of a basket's price calculation. */
export interface BasketSummary {
  /** Sum of the full prices, before offers. */
  readonly subtotal: Cents;
  /** Total taken off by all offers. */
  readonly discount: Cents;
  /** Delivery charge, based on the amount after offers. */
  readonly delivery: Cents;
  /** Amount to pay: `subtotal - discount + delivery`. */
  readonly total: Cents;
  /**
   * The next delivery band above the amount after offers, so the customer
   * can be told how much more to spend. `undefined` when the basket is
   * empty or already in the last band.
   */
  readonly nextDeliveryBand: NextDeliveryBand | undefined;
}

/** A product whose next unit would cost less because of an offer. */
export interface OfferSaving {
  /** Code of the product to add. */
  readonly productCode: string;
  /** How much more the offers would take off if one more unit were added. */
  readonly saving: Cents;
}

/**
 * Checks the rules a basket is given, so a mistake in configuration fails
 * as soon as a basket is created instead of producing wrong prices.
 *
 * @throws {Error} If two products share a code.
 * @throws {RangeError} If a price or delivery charge is not whole cents, or
 * no delivery band is open-ended.
 */
function assertValidRules(
  catalogue: readonly Product[],
  deliveryTiers: readonly DeliveryTier[],
): void {
  const codes = new Set<string>();
  for (const { code, price } of catalogue) {
    // A Map built from duplicates would silently keep only the last product.
    if (codes.has(code)) {
      throw new Error(`Duplicate product code in catalogue: "${code}"`);
    }
    if (!isCents(price)) {
      throw new RangeError(`Price of "${code}" must be whole cents, got ${price}`);
    }
    codes.add(code);
  }

  for (const { charge } of deliveryTiers) {
    if (!isCents(charge)) {
      throw new RangeError(`Delivery charge must be whole cents, got ${charge}`);
    }
  }
  // `below` limits are not checked with isCents: the last one is Infinity,
  // which is not an integer.
  if (!deliveryTiers.some(({ below }) => below === Infinity)) {
    throw new RangeError('Delivery tiers need an open-ended band with `below: Infinity`');
  }
}

/**
 * A shopping basket that prices its contents using the rules it is given.
 *
 * The basket holds no business rules of its own: the catalogue, delivery
 * tiers and offers are all passed to the constructor.
 *
 * @example
 * const basket = new Basket(catalogue, deliveryTiers, offers);
 * basket.add('R01');
 * basket.add('R01');
 * basket.total(); // 5437
 */
export class Basket {
  private readonly catalogue: ReadonlyMap<string, Product>;
  private readonly deliveryTiers: readonly DeliveryTier[];
  private readonly offers: readonly Offer[];
  private readonly items: Product[] = [];

  /**
   * @param catalogue - The products that can be added.
   * @param deliveryTiers - The delivery price bands.
   * @param offers - The offers to apply, if any.
   * @throws {Error | RangeError} If the rules are invalid; see the messages.
   */
  constructor(
    catalogue: readonly Product[],
    deliveryTiers: readonly DeliveryTier[],
    offers: readonly Offer[],
  ) {
    assertValidRules(catalogue, deliveryTiers);
    this.catalogue = new Map(catalogue.map((product) => [product.code, product]));
    this.deliveryTiers = deliveryTiers;
    this.offers = offers;
  }

  /**
   * Adds one unit of a product to the basket.
   *
   * @param code - The product code, e.g. `"R01"`.
   * @throws {UnknownProductError} If the code is not in the catalogue.
   */
  add(code: string): void {
    const product = this.catalogue.get(code);
    if (!product) {
      throw new UnknownProductError(code);
    }
    this.items.push(product);
  }

  /**
   * Returns the amount to pay, with offers and delivery applied.
   *
   * @returns The total in cents, e.g. `5437` for $54.37.
   */
  total(): Cents {
    return this.summary().total;
  }

  /**
   * Returns the full price breakdown. {@link Basket.total} uses the same
   * calculation, so the two can never disagree.
   *
   * @throws {RangeError} If an offer returns a discount that is not whole cents.
   */
  summary(): BasketSummary {
    const subtotal = this.items.reduce((sum, item) => sum + item.price, 0);
    const discount = this.offerDiscount(this.items);
    const afterDiscount = subtotal - discount;

    // An empty basket has nothing to deliver, so it pays no delivery and
    // has no band to move towards.
    if (this.items.length === 0) {
      return { subtotal, discount, delivery: 0, total: afterDiscount, nextDeliveryBand: undefined };
    }

    // Delivery depends on the amount after offers, not the full price: the
    // brief's R01 + R01 example only totals $54.37 this way. The next band
    // is measured from the same amount, so the hint and the charge agree.
    const delivery = deliveryCharge(afterDiscount, this.deliveryTiers);
    return {
      subtotal,
      discount,
      delivery,
      total: afterDiscount + delivery,
      nextDeliveryBand: nextDeliveryBand(afterDiscount, this.deliveryTiers),
    };
  }

  /**
   * Lists the products whose next unit would be cheaper because of an
   * offer, and by how much: with one red widget in the basket, one more
   * saves 1648.
   *
   * Works for any offer, because it compares the offers' discount with and
   * without one more unit instead of knowing how each offer works.
   *
   * @returns One entry per product where one more unit raises the
   * discount, in catalogue order. Empty when no offer would apply.
   * @throws {RangeError} If an offer returns a discount that is not whole cents.
   */
  offerSavingsOnNextUnit(): readonly OfferSaving[] {
    const current = this.offerDiscount(this.items);
    return [...this.catalogue.values()]
      .map((product) => ({
        productCode: product.code,
        saving: this.offerDiscount([...this.items, product]) - current,
      }))
      .filter(({ saving }) => saving > 0);
  }

  /**
   * Adds up the discounts every offer gives for `items`.
   *
   * @throws {RangeError} If an offer returns a discount that is not whole cents.
   */
  private offerDiscount(items: readonly Product[]): Cents {
    return this.offers.reduce((sum, offer) => {
      const amount = offer.discount(items);
      // Offers are plug-ins. One returning e.g. 1647.5 would quietly break
      // the whole-cents rule and every total after it.
      if (!isCents(amount)) {
        throw new RangeError(`An offer returned an invalid discount: ${amount}`);
      }
      return sum + amount;
    }, 0);
  }
}
