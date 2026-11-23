/**
 * Entry point. Reads configuration, plugs Acme's rules into the app and
 * starts listening. This is the only module with side effects.
 *
 * @packageDocumentation
 */

import { existsSync } from 'node:fs';
import { createApp } from './api/app.js';
import { ACME_CATALOGUE, createAcmeBasket } from './config/acme-rules.js';
import { loadEnv } from './config/env.js';

const env = loadEnv();
const staticDir = existsSync(env.STATIC_DIR) ? env.STATIC_DIR : undefined;

const app = createApp({ catalogue: ACME_CATALOGUE, createBasket: createAcmeBasket, staticDir });

const server = app.listen(env.PORT, (error) => {
  if (error) {
    throw error;
  }
  console.log(`Listening on http://localhost:${env.PORT}`);
  console.log(
    staticDir ? `Serving frontend from ${staticDir}` : 'No frontend build found: API only',
  );
});

// Hosting platforms stop the app with SIGTERM. close() stops new connections
// and lets in-flight requests finish, then the process exits on its own.
process.on('SIGTERM', () => {
  server.close();
});
