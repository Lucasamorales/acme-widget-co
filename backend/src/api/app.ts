import express from 'express';
import { z } from 'zod';
import type { Basket, Offer, Product } from '../domain/index.js';
import type { ProductsResponse, QuoteRequest, QuoteResponse } from './contract.js';
import { errorHandler, notFound } from './error-handler.js';

/**
 * Everything the app needs from outside. Passing these in, rather than
 * importing Acme's rules here, keeps the HTTP layer free of business rules
 * and lets tests supply their own.
 */
export interface AppDependencies {
  readonly catalogue: readonly Product[];
  /**
   * Offers to advertise next to their products. Pricing uses the offers
   * inside the basket from `createBasket`; pass the same list to both.
   */
  readonly offers: readonly Offer[];
  /** Returns a new, empty basket for each quote. */
  readonly createBasket: () => Basket;
  /** Folder of the built frontend to serve. Omit to serve the API only. */
  readonly staticDir?: string;
}

/**
 * Checks the shape of a quote request. Whether each code exists is decided
 * by the basket, so that rule lives in one place.
 */
const quoteRequestSchema = z.object({
  items: z.array(z.string()),
}) satisfies z.ZodType<QuoteRequest>;

/**
 * Creates the Express app without starting it, so tests can call it
 * directly without opening a port.
 */
export function createApp({
  catalogue,
  offers,
  createBasket,
  staticDir,
}: AppDependencies): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/products', (_req, res) => {
    // Copy only the contract's fields, so new domain fields are never exposed by accident.
    const products = catalogue.map(({ code, name, price }) => ({
      code,
      name,
      price,
      offerLabels: offers
        .filter((offer) => offer.productCodes.includes(code))
        .map((offer) => offer.label),
    }));
    const body: ProductsResponse = { products };
    res.json(body);
  });

  // Stateless: the client sends the whole basket and gets it priced. The
  // server keeps no sessions, so any instance can answer any request.
  app.post('/api/quote', (req, res) => {
    const { items } = quoteRequestSchema.parse(req.body);

    const basket = createBasket();
    items.forEach((code) => basket.add(code));

    // Copy the fields into a literal: TypeScript only rejects extra
    // properties on literals, so this stops `items` leaking into the response.
    const { subtotal, discount, delivery, total, nextDeliveryBand } = basket.summary();
    const body: QuoteResponse = {
      subtotal,
      discount,
      delivery,
      total,
      // JSON has no `undefined`, so the contract says null.
      nextDeliveryBand: nextDeliveryBand
        ? { amountToReach: nextDeliveryBand.amountToReach, charge: nextDeliveryBand.charge }
        : null,
      offerSavings: basket
        .offerSavingsOnNextUnit()
        .map(({ productCode, saving }) => ({ productCode, saving })),
    };
    res.json(body);
  });

  app.use('/api', notFound);

  if (staticDir) {
    app.use(express.static(staticDir));
  }

  app.use(errorHandler);
  return app;
}
