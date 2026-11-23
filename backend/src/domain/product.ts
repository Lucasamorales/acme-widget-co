import type { Cents } from './money.js';

/** A product that can be added to a basket. */
export interface Product {
  /** Unique product code, e.g. `"R01"`. */
  readonly code: string;
  /** Display name, e.g. `"Red Widget"`. */
  readonly name: string;
  /** Price of one unit. */
  readonly price: Cents;
}
