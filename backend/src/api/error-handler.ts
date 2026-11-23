import type { ErrorRequestHandler, RequestHandler, Response } from 'express';
import { z } from 'zod';
import { UnknownProductError } from '../domain/index.js';
import type { ErrorCode, ErrorResponse } from './contract.js';

function sendError(res: Response, status: number, code: ErrorCode, message: string): void {
  const body: ErrorResponse = { error: { code, message } };
  res.status(status).json(body);
}

/** One line per problem, e.g. `"items: Invalid input: expected array, received string"`. */
function describeIssues(error: z.ZodError): string {
  return error.issues
    .map(({ path, message }) =>
      path.length > 0 ? `${path.map(String).join('.')}: ${message}` : message,
    )
    .join('; ');
}

/**
 * True for the 4xx errors Express's body parser throws, such as malformed
 * JSON (400) or a body that is too large (413).
 */
function isClientHttpError(error: unknown): error is { status: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number' &&
    error.status >= 400 &&
    error.status < 500
  );
}

/** Answers API requests that matched no route. */
export const notFound: RequestHandler = (req, res) => {
  sendError(res, 404, 'NOT_FOUND', `No route for ${req.method} ${req.originalUrl}`);
};

/**
 * Turns every thrown error into the API's error format.
 *
 * Errors caused by the client get a 4xx status and a helpful message.
 * Anything else is logged and answered with a generic 500, so internal
 * details never reach the client.
 *
 * Express recognises error handlers by their four parameters, so `_next`
 * must stay even though it is unused.
 */
export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof z.ZodError) {
    sendError(res, 400, 'INVALID_REQUEST', describeIssues(error));
  } else if (error instanceof UnknownProductError) {
    sendError(res, 400, 'UNKNOWN_PRODUCT', error.message);
  } else if (isClientHttpError(error)) {
    sendError(res, error.status, 'INVALID_REQUEST', 'The request body could not be read');
  } else {
    console.error(error);
    sendError(res, 500, 'INTERNAL_ERROR', 'Something went wrong');
  }
};
