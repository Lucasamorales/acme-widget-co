import { useCallback } from 'react';
import { fetchProducts, fetchQuote } from './api/client';
import { BasketPanel } from './components/BasketPanel';
import { ProductList } from './components/ProductList';
import { useBasket } from './hooks/use-basket';
import { useRequest } from './hooks/use-request';

/** The basket page: product tickets on one side, the receipt on the other. */
export function App() {
  // fetchProducts is a module-level function, so its identity never changes
  // and the catalogue loads once.
  const products = useRequest(fetchProducts);
  const basket = useBasket();

  // A new function only when the items change, so exactly one quote request
  // is sent per basket change.
  const getQuote = useCallback(
    (signal: AbortSignal) => fetchQuote(basket.items, signal),
    [basket.items],
  );
  const quote = useRequest(getQuote);

  return (
    <main className="page">
      <header className="header">
        <h1>Acme Widget Co</h1>
        <p className="muted">Sales basket proof of concept</p>
      </header>

      <div className="layout">
        <ProductList products={products} quantities={basket.quantities} onAdd={basket.add} />
        <BasketPanel
          catalogue={products.data?.products ?? []}
          quantities={basket.quantities}
          quote={quote}
          onAdd={basket.add}
          onRemove={basket.remove}
        />
      </div>
    </main>
  );
}
