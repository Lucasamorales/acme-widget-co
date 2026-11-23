/**
 * Thrown when a product code is not in the basket's catalogue.
 *
 * It has its own class so callers, such as the HTTP layer, can use
 * `instanceof` to tell bad input apart from unexpected failures.
 */
export class UnknownProductError extends Error {
  /** The product code that was not found. */
  readonly productCode: string;

  constructor(productCode: string) {
    super(`Unknown product code: "${productCode}"`);
    this.name = 'UnknownProductError';
    this.productCode = productCode;
  }
}
