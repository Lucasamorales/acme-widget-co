import type { ApiError } from '../api/client';

interface ErrorMessageProps {
  readonly error: ApiError;
}

/** A user-facing message for a failed request. Server details are not shown. */
export function ErrorMessage({ error }: ErrorMessageProps) {
  const text =
    error.code === 'NETWORK_ERROR'
      ? 'Can’t reach the server. Check your connection, then refresh the page.'
      : 'Something went wrong. Please refresh the page and try again.';

  return (
    <p role="alert" className="error">
      {text}
    </p>
  );
}
