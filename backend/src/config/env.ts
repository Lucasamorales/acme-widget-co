import { resolve } from 'node:path';
import { z } from 'zod';

const envSchema = z.object({
  /** Port to listen on. Hosting platforms usually set this. */
  PORT: z.coerce.number().int().positive().default(3000),
  /** Folder of the built frontend. Defaults to `frontend/dist` in this repo. */
  STATIC_DIR: z.string().default(resolve(import.meta.dirname, '../../../frontend/dist')),
});

/** Validated runtime configuration. */
export type Env = z.infer<typeof envSchema>;

/**
 * Reads and validates configuration from environment variables.
 *
 * Fails at startup with a clear message when a value is invalid, instead of
 * misbehaving later (e.g. `Number("abc")` silently becoming `NaN`).
 *
 * @param source - Where to read variables from. Defaults to `process.env`.
 * @throws {Error} If a variable is invalid, listing each problem.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
