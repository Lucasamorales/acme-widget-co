import { useEffect, useState } from 'react';
import { type ApiError, toApiError } from '../api/client';

/** What a component sees of a request. */
export interface RequestState<T> {
  /**
   * Data from the most recent successful request. While a newer request is
   * loading this is the previous data, so the UI can dim it instead of
   * flickering; after a failure it is `undefined`.
   */
  readonly data: T | undefined;
  /** Why the current request failed, if it did. */
  readonly error: ApiError | undefined;
  /** True until the current request has finished. */
  readonly isLoading: boolean;
}

/** The outcome of one run, remembering which request produced it. */
type Outcome<T> =
  | { readonly request: unknown; readonly data: T; readonly error?: never }
  | { readonly request: unknown; readonly data?: never; readonly error: ApiError };

/**
 * Runs `request` on mount and again whenever `request` changes.
 *
 * Each run gets an `AbortSignal`. When `request` changes or the component
 * unmounts, the previous run is aborted and its result ignored, so a slow,
 * older response can never overwrite a newer one.
 *
 * `request` must keep the same identity between renders unless its inputs
 * change: pass a module-level function or wrap it in `useCallback`.
 * Otherwise it runs again on every render.
 *
 * @param request - Starts the request; must honour the signal.
 */
export function useRequest<T>(request: (signal: AbortSignal) => Promise<T>): RequestState<T> {
  const [outcome, setOutcome] = useState<Outcome<T>>();

  useEffect(() => {
    const controller = new AbortController();

    request(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) {
          setOutcome({ request, data });
        }
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setOutcome({ request, error: toApiError(error) });
        }
      },
    );

    return () => controller.abort();
  }, [request]);

  // Loading is derived, not stored: the request is still running if the
  // latest outcome came from a different (older) request.
  const isLoading = outcome?.request !== request;

  return {
    data: outcome?.data,
    error: isLoading ? undefined : outcome?.error,
    isLoading,
  };
}
