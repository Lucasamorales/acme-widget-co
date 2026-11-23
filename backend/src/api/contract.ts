/**
 * Request and response shapes of the HTTP API.
 *
 * This is the contract between backend and frontend. It contains types only,
 * so the frontend can use it with `import type` and no backend code reaches
 * the browser bundle. All amounts are integer cents.
 *
 * The shapes are kept separate from the domain types on purpose: the domain
 * can change without silently changing what clients receive.
 *
 * @packageDocumentation
 */

/** A product as sent to clients. */
export interface ProductDto {
  readonly code: string;
  readonly name: string;
  readonly price: number;
  /** Labels of the offers advertised on this product; empty when there are none. */
  readonly offerLabels: readonly string[];
}

/** Response of `GET /api/products`. */
export interface ProductsResponse {
  readonly products: readonly ProductDto[];
}

/** Body of `POST /api/quote`: one product code per unit, e.g. `["R01", "R01"]`. */
export interface QuoteRequest {
  readonly items: readonly string[];
}

/** The delivery band after the one the order is in. */
export interface NextDeliveryBandDto {
  /** How much more the order, after offers, must reach to enter the band. */
  readonly amountToReach: number;
  /** Delivery charge in that band. */
  readonly charge: number;
}

/** A product whose next unit would cost less because of an offer. */
export interface OfferSavingDto {
  readonly productCode: string;
  /** How much one more unit would save. */
  readonly saving: number;
}

/** Response of `POST /api/quote`. */
export interface QuoteResponse {
  readonly subtotal: number;
  readonly discount: number;
  readonly delivery: number;
  readonly total: number;
  /** `null` when the basket is empty or already in the last delivery band. */
  readonly nextDeliveryBand: NextDeliveryBandDto | null;
  /** Empty when no offer would make the next unit of any product cheaper. */
  readonly offerSavings: readonly OfferSavingDto[];
}

/** Machine-readable error codes. Clients branch on these, never on messages. */
export type ErrorCode = 'INVALID_REQUEST' | 'UNKNOWN_PRODUCT' | 'NOT_FOUND' | 'INTERNAL_ERROR';

/** Body of every error response. */
export interface ErrorResponse {
  readonly error: {
    readonly code: ErrorCode;
    readonly message: string;
  };
}
