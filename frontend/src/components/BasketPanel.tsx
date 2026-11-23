import type { ProductDto, QuoteResponse } from '@acme/backend/contract';
import { formatCents } from '../format-cents';
import type { Quantities } from '../hooks/use-basket';
import type { RequestState } from '../hooks/use-request';
import { ErrorMessage } from './ErrorMessage';

interface BasketPanelProps {
  readonly catalogue: readonly ProductDto[];
  readonly quantities: Quantities;
  readonly quote: RequestState<QuoteResponse>;
  readonly onAdd: (code: string) => void;
  readonly onRemove: (code: string) => void;
}

/** The basket's lines and the server's price breakdown. */
export function BasketPanel({ catalogue, quantities, quote, onAdd, onRemove }: BasketPanelProps) {
  const lines = catalogue.filter((product) => (quantities[product.code] ?? 0) > 0);

  return (
    <section className="panel" aria-labelledby="basket-heading">
      <h2 id="basket-heading">Basket</h2>

      {lines.length === 0 ? (
        <p className="muted">Your basket is empty.</p>
      ) : (
        <>
          <ul className="lines">
            {lines.map((product) => (
              <li key={product.code} className="line">
                <span>
                  {product.name}
                  <span className="muted"> × {formatCents(product.price)}</span>
                </span>
                <span className="stepper">
                  <button
                    type="button"
                    onClick={() => onRemove(product.code)}
                    aria-label={`Remove one ${product.name}`}
                  >
                    −
                  </button>
                  <span>{quantities[product.code]}</span>
                  <button
                    type="button"
                    onClick={() => onAdd(product.code)}
                    aria-label={`Add one ${product.name}`}
                  >
                    +
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <Totals quote={quote} />
        </>
      )}
    </section>
  );
}

interface TotalsProps {
  readonly quote: RequestState<QuoteResponse>;
}

/** Shows only amounts calculated by the server; the browser does no pricing. */
function Totals({ quote }: TotalsProps) {
  // A failed quote shows an error, never the previous total, which would
  // look current but belong to a different basket.
  if (quote.error) {
    return <ErrorMessage error={quote.error} />;
  }
  if (!quote.data) {
    return <p className="muted">Calculating…</p>;
  }

  const { subtotal, discount, delivery, total } = quote.data;
  return (
    <dl className={quote.isLoading ? 'totals updating' : 'totals'} aria-busy={quote.isLoading}>
      <dt>Subtotal</dt>
      <dd>{formatCents(subtotal)}</dd>
      {/* A comparison, not `discount && …`: with a number, React would render a stray "0". */}
      {discount > 0 && (
        <>
          <dt>Offer discount</dt>
          <dd>−{formatCents(discount)}</dd>
        </>
      )}
      <dt>Delivery</dt>
      <dd>{delivery === 0 ? 'Free' : formatCents(delivery)}</dd>
      <dt className="grand-total">Total</dt>
      <dd className="grand-total" aria-live="polite">
        {formatCents(total)}
      </dd>
    </dl>
  );
}
