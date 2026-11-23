import type { ProductsResponse, QuoteRequest, QuoteResponse } from '@acme/backend/contract';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const PRODUCTS: ProductsResponse = {
  products: [
    {
      code: 'R01',
      name: 'Red Widget',
      price: 3295,
      offerLabels: ['Buy one, get the second half price'],
    },
    { code: 'B01', name: 'Blue Widget', price: 795, offerLabels: [] },
  ],
};

/** A quote whose total is easy to recognise in the page, with no hints. */
function quoteWithTotal(total: number): QuoteResponse {
  return {
    subtotal: total,
    discount: 0,
    delivery: 0,
    total,
    nextDeliveryBand: null,
    offerSavings: [],
  };
}

/** A quote that carries both hints: a delivery footnote and an offer nudge. */
const QUOTE_WITH_HINTS: QuoteResponse = {
  subtotal: 3295,
  discount: 0,
  delivery: 495,
  total: 3790,
  nextDeliveryBand: { amountToReach: 1705, charge: 295 },
  offerSavings: [{ productCode: 'R01', saving: 1648 }],
};

const FOOTNOTE = '$17.05 more and delivery is $2.95.';
const NUDGE = 'Add 1 more Red Widget to save $16.48';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** The basket each quote request asked for, in order. */
function quotedBaskets(fetchMock: ReturnType<typeof vi.fn>): string[][] {
  return fetchMock.mock.calls
    .filter(([path]) => path === '/api/quote')
    .map(([, init]) => (JSON.parse((init as RequestInit).body as string) as QuoteRequest).items)
    .map((items) => [...items]);
}

/**
 * Replaces `fetch`. Products load immediately; each quote waits until the
 * test resolves it, so tests control the order responses arrive in.
 */
function stubServer() {
  const pendingQuotes: ((response: Response) => void)[] = [];
  const fetchMock = vi.fn((path: string) =>
    path === '/api/products'
      ? Promise.resolve(json(PRODUCTS))
      : new Promise<Response>((resolve) => pendingQuotes.push(resolve)),
  );
  vi.stubGlobal('fetch', fetchMock);

  /** Answers the quote request with the given index (0 is the first). */
  async function answerQuote(index: number, response: Response): Promise<void> {
    await act(async () => {
      pendingQuotes[index]?.(response);
      await Promise.resolve();
    });
  }

  return { fetchMock, answerQuote };
}

async function addRedWidget(): Promise<void> {
  fireEvent.click(await screen.findByRole('button', { name: 'Add Red Widget to basket' }));
}

/** The amount in the "Total" row, or undefined when no total is shown. */
function displayedTotal(): string | undefined {
  return screen.queryByText('Total')?.nextElementSibling?.textContent ?? undefined;
}

/**
 * The free-delivery stamp. Found by class because it is hidden from
 * assistive technology (the Delivery row already says "Free"), so it has no
 * role or accessible name to query.
 */
function freeDeliveryStamp(): Element | null {
  return document.querySelector('.free-stamp');
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('sends exactly one quote request per basket change', async () => {
    const { fetchMock } = stubServer();
    render(<App />);

    await addRedWidget();
    await addRedWidget();

    // One for the empty basket on load, then one per click. A request loop
    // would keep adding calls here.
    expect(quotedBaskets(fetchMock)).toEqual([[], ['R01'], ['R01', 'R01']]);
  });

  it('shows the latest basket’s total even when an older response arrives last', async () => {
    const { answerQuote } = stubServer();
    render(<App />);
    await addRedWidget(); // quote 1
    await addRedWidget(); // quote 2

    await answerQuote(2, json(quoteWithTotal(5437)));
    await answerQuote(1, json(quoteWithTotal(3790))); // slow, out-of-date answer

    expect(displayedTotal()).toBe('$54.37');
  });

  it('shows an error instead of a stale total when a quote fails', async () => {
    const { answerQuote } = stubServer();
    render(<App />);
    await addRedWidget();
    await answerQuote(1, json(quoteWithTotal(3790)));
    expect(displayedTotal()).toBe('$37.90');

    await addRedWidget();
    await answerQuote(
      2,
      json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } }, 500),
    );

    expect(screen.getByRole('alert').textContent).toContain('Something went wrong');
    expect(displayedTotal()).toBeUndefined();
  });

  it('tells the user when the server cannot be reached', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );
    render(<App />);

    expect((await screen.findByRole('alert')).textContent).toContain('Can’t reach the server');
  });

  it('advertises an offer on the product it applies to', async () => {
    stubServer();
    render(<App />);

    expect(await screen.findByText('Buy one, get the second half price')).toBeDefined();
  });

  it('explains how much more to spend for cheaper delivery, and what one more unit saves', async () => {
    const { answerQuote } = stubServer();
    render(<App />);
    await addRedWidget();
    await answerQuote(1, json(QUOTE_WITH_HINTS));

    expect(screen.getByText(FOOTNOTE)).toBeDefined();
    expect(screen.getByText(NUDGE)).toBeDefined();
  });

  it('removes the hints when the next quote fails, so they never describe another basket', async () => {
    const { answerQuote } = stubServer();
    render(<App />);
    await addRedWidget();
    await answerQuote(1, json(QUOTE_WITH_HINTS));

    await addRedWidget();
    await answerQuote(
      2,
      json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } }, 500),
    );

    expect(screen.queryByText(FOOTNOTE)).toBeNull();
    expect(screen.queryByText(NUDGE)).toBeNull();
  });

  it('stamps free delivery only on a quote for a non-empty basket', async () => {
    const { answerQuote } = stubServer();
    render(<App />);
    await answerQuote(0, json(quoteWithTotal(0))); // the empty basket's quote: delivery 0
    await addRedWidget();

    // Quote 1 is still pending, so the totals show the empty basket's quote.
    expect(freeDeliveryStamp()).toBeNull();

    await answerQuote(1, json(quoteWithTotal(9827)));

    expect(freeDeliveryStamp()).not.toBeNull();
  });
});
