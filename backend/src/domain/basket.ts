import { deliveryCharge, type DeliveryTier } from './delivery.js';
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

    const discount = this.offers.reduce((sum, offer) => {
      const amount = offer.discount(this.items);
      // Offers are plug-ins. One returning e.g. 1647.5 would quietly break
      // the whole-cents rule and every total after it.
      if (!isCents(amount)) {
        throw new RangeError(`An offer returned an invalid discount: ${amount}`);
      }
      return sum + amount;
    }, 0);

    const afterDiscount = subtotal - discount;

    // Delivery depends on the amount after offers, not the full price: the
    // brief's R01 + R01 example only totals $54.37 this way. An empty basket
    // has nothing to deliver, so it pays no delivery.
    const delivery =
      this.items.length === 0 ? 0 : deliveryCharge(afterDiscount, this.deliveryTiers);

    return { subtotal, discount, delivery, total: afterDiscount + delivery };
  }
}
