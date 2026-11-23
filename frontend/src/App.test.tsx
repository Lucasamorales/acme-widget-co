import type { ProductsResponse, QuoteRequest, QuoteResponse } from '@acme/backend/contract';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const PRODUCTS: ProductsResponse = {
  products: [
    { code: 'R01', name: 'Red Widget', price: 3295, offerLabels: [] },
    { code: 'B01', name: 'Blue Widget', price: 795, offerLabels: [] },
  ],
};

/** A quote whose total is easy to recognise in the page. */
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
});
