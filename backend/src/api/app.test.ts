import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { ACME_CATALOGUE, ACME_OFFERS, createAcmeBasket } from '../config/acme-rules.js';
import { createApp } from './app.js';

const app = createApp({
  catalogue: ACME_CATALOGUE,
  offers: ACME_OFFERS,
  createBasket: createAcmeBasket,
});

describe('GET /api/health', () => {
  it('reports that the server is up', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('GET /api/products', () => {
  it('returns the catalogue with the offers advertised on each product', async () => {
    const res = await request(app).get('/api/products');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      products: [
        {
          code: 'R01',
          name: 'Red Widget',
          price: 3295,
          offerLabels: ['Buy one, get the second half price'],
        },
        { code: 'G01', name: 'Green Widget', price: 2495, offerLabels: [] },
        { code: 'B01', name: 'Blue Widget', price: 795, offerLabels: [] },
      ],
    });
  });
});

describe('POST /api/quote', () => {
  it('prices a basket, returning only the contract fields', async () => {
    const res = await request(app)
      .post('/api/quote')
      .send({ items: ['R01', 'R01'] });

    expect(res.status).toBe(200);
    // 6590 - 1648 = 4942 after offers, 58 short of the $50 band.
    expect(res.body).toEqual({
      subtotal: 6590,
      discount: 1648,
      delivery: 495,
      total: 5437,
      nextDeliveryBand: { amountToReach: 58, charge: 295 },
      offerSavings: [],
    });
  });

  it('says how much one more red widget saves when the basket has one', async () => {
    const res = await request(app)
      .post('/api/quote')
      .send({ items: ['R01', 'G01'] });

    expect(res.body).toMatchObject({
      total: 6085,
      // 3295 + 2495 = 5790 after offers; free delivery starts at 9000.
      nextDeliveryBand: { amountToReach: 3210, charge: 0 },
      offerSavings: [{ productCode: 'R01', saving: 1648 }],
    });
  });

  it('sends a null next band once delivery is free', async () => {
    const res = await request(app)
      .post('/api/quote')
      .send({ items: ['B01', 'B01', 'R01', 'R01', 'R01'] });

    expect(res.body).toMatchObject({ total: 9827, delivery: 0, nextDeliveryBand: null });
  });

  it('prices an empty basket at zero', async () => {
    const res = await request(app).post('/api/quote').send({ items: [] });

    expect(res.body).toEqual({
      subtotal: 0,
      discount: 0,
      delivery: 0,
      total: 0,
      nextDeliveryBand: null,
      offerSavings: [],
    });
  });

  it('rejects an unknown product code', async () => {
    const res = await request(app)
      .post('/api/quote')
      .send({ items: ['X99'] });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: { code: 'UNKNOWN_PRODUCT', message: 'Unknown product code: "X99"' },
    });
  });

  it.each([
    { case: 'no body', body: undefined, message: 'expected object, received undefined' },
    {
      case: 'items is not an array',
      body: { items: 'R01' },
      message: 'items: Invalid input: expected array, received string',
    },
    {
      case: 'an item is not a string',
      body: { items: [1] },
      message: 'items.0: Invalid input: expected string, received number',
    },
  ])('rejects a body with $case', async ({ body, message }) => {
    const res = await request(app).post('/api/quote').send(body);

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: { code: 'INVALID_REQUEST' } });
    expect((res.body as { error: { message: string } }).error.message).toContain(message);
  });

  it('rejects malformed JSON with a 400, not a 500', async () => {
    const res = await request(app)
      .post('/api/quote')
      .set('Content-Type', 'application/json')
      .send('{"items": [');

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: { code: 'INVALID_REQUEST' } });
  });
});

describe('errors', () => {
  it('answers unknown API routes with a JSON 404', async () => {
    const res = await request(app).get('/api/nope');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'No route for GET /api/nope' },
    });
  });

  it('logs unexpected errors and hides their details from the client', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failingApp = createApp({
      catalogue: ACME_CATALOGUE,
      offers: [],
      createBasket: () => {
        throw new Error('secret internal detail');
      },
    });

    const res = await request(failingApp).post('/api/quote').send({ items: [] });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
    });
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });
});
