import type {
  ErrorCode,
  ErrorResponse,
  ProductsResponse,
  QuoteRequest,
  QuoteResponse,
} from '@acme/backend/contract';

/** Why a request failed: an error code from the API, or no response at all. */
export type ApiErrorCode = ErrorCode | 'NETWORK_ERROR';

/** A failed API call. Components branch on `code`, never on the message. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ApiError';
    this.code = code;
  }
}

/**
 * Wraps anything thrown into an {@link ApiError}, so callers handle one type.
 *
 * @param error - The value that was thrown.
 */
export function toApiError(error: unknown): ApiError {
  return error instanceof ApiError
    ? error
    : new ApiError('INTERNAL_ERROR', 'Unexpected error', { cause: error });
}

/**
 * Sends a request and returns the parsed JSON body.
 *
 * The response is cast to `T` without runtime checks: both sides share the
 * contract types, so a mismatch fails type checking, not here.
 *
 * @throws {ApiError} With `NETWORK_ERROR` if the server could not be reached,
 * or the API's error code for an error response.
 * @throws {DOMException} Unchanged when `init.signal` aborts the request.
 */
async function request<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch (error) {
    if (init.signal?.aborted) {
      throw error;
    }
    throw new ApiError('NETWORK_ERROR', 'Could not reach the server', { cause: error });
  }

  if (!response.ok) {
    // A proxy or crash can return a non-JSON error page, so parsing may fail.
    const body = (await response.json().catch(() => undefined)) as ErrorResponse | undefined;
    throw new ApiError(
      body?.error.code ?? 'INTERNAL_ERROR',
      body?.error.message ?? `Request failed with status ${response.status}`,
    );
  }
  return (await response.json()) as T;
}

/** Loads the product catalogue. */
export function fetchProducts(signal: AbortSignal): Promise<ProductsResponse> {
  return request('/api/products', { signal });
}

/**
 * Prices a basket on the server.
 *
 * @param items - One product code per unit, e.g. `["R01", "R01"]`.
 */
export function fetchQuote(items: readonly string[], signal: AbortSignal): Promise<QuoteResponse> {
  const body: QuoteRequest = { items };
  return request('/api/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
}
