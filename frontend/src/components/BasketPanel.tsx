import type { NextDeliveryBandDto, ProductDto, QuoteResponse } from '@acme/backend/contract';
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

/** The basket as a till receipt: its lines and the server's price breakdown. */
export function BasketPanel({ catalogue, quantities, quote, onAdd, onRemove }: BasketPanelProps) {
  const lines = catalogue.filter((product) => (quantities[product.code] ?? 0) > 0);
  // A count of units, not money, so it is fine to add up in the browser.
  const itemCount = lines.reduce((count, product) => count + (quantities[product.code] ?? 0), 0);

  return (
    <section className="receipt" aria-labelledby="basket-heading">
      <div className="receipt-paper">
        <h2 id="basket-heading" className="receipt-title">
          Basket
        </h2>
        <p className="receipt-count">{itemCount === 1 ? '1 item' : `${itemCount} items`}</p>
        <hr className="rule-dashed" />

        {lines.length === 0 ? (
          <p className="receipt-empty">Your basket is empty.</p>
        ) : (
          <>
            <ul className="lines">
              {lines.map((product) => (
                <li key={product.code} className="line">
                  <div>
                    <p className="line-name">{product.name}</p>
                    <p className="line-detail">
                      {quantities[product.code]} @ {formatCents(product.price)}
                    </p>
                  </div>
                  <span className="stepper">
                    <button
                      type="button"
                      className="stepper-button"
                      onClick={() => onRemove(product.code)}
                      aria-label={`Remove one ${product.name}`}
                    >
                      −
                    </button>
                    <button
                      type="button"
                      className="stepper-button"
                      onClick={() => onAdd(product.code)}
                      aria-label={`Add one ${product.name}`}
                    >
                      +
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            <hr className="rule-dashed" />
            <Totals quote={quote} catalogue={catalogue} />
          </>
        )}
      </div>
      <div className="receipt-edge" aria-hidden="true" />
    </section>
  );
}

interface TotalsProps {
  readonly quote: RequestState<QuoteResponse>;
  /** Used to name the products in offer hints. */
  readonly catalogue: readonly ProductDto[];
}

/** Shows only amounts calculated by the server; the browser does no pricing. */
function Totals({ quote, catalogue }: TotalsProps) {
  // A failed quote shows an error, never the previous total or hints, which
  // would look current but belong to a different basket.
  if (quote.error) {
    return <ErrorMessage error={quote.error} />;
  }
  if (!quote.data) {
    return <p className="muted">Calculating…</p>;
  }

  const { subtotal, discount, delivery, total, nextDeliveryBand, offerSavings } = quote.data;
  return (
    <div className={quote.isLoading ? 'totals updating' : 'totals'} aria-busy={quote.isLoading}>
      <dl className="totals-list">
        <dt>Subtotal</dt>
        <dd>{formatCents(subtotal)}</dd>
        {/* A comparison, not `discount && …`: with a number, React would render a stray "0". */}
        {discount > 0 && (
          <>
            <dt className="offer">Offer discount</dt>
            <dd className="offer">−{formatCents(discount)}</dd>
          </>
        )}
        <dt>Delivery</dt>
        <dd>
          {delivery === 0 ? 'Free' : formatCents(delivery)}
          {nextDeliveryBand && (
            <span className="footnote-ref" aria-hidden="true">
              *
            </span>
          )}
        </dd>
        {/* HTML allows a <div> around one dt/dd pair. It lets this row wrap, so a
            total of any length moves to its own line instead of overflowing, and
            the stamp, kept in the layout flow, can never cover the amount. */}
        <div className="total-row">
          <dt>
            <span>Total</span>
            {/* The quote shown can be the previous one while a new one loads. After
                the first Add that is the empty basket's quote, which also has
                delivery 0, so `subtotal > 0` stops the stamp from landing on an order
                that has not reached free delivery. Checking the quote, not
                `isLoading`, keeps the stamp mounted (and not slamming again) while
                re-quoting in the free band. Hidden from screen readers because the
                Delivery row already says "Free". */}
            {subtotal > 0 && delivery === 0 && (
              <span className="free-stamp" aria-hidden="true">
                Free
                <br />
                delivery
              </span>
            )}
          </dt>
          <dd aria-live="polite">
            <span key={total} className="total-amount">
              {formatCents(total)}
            </span>
          </dd>
        </div>
      </dl>

      {nextDeliveryBand && <DeliveryFootnote nextBand={nextDeliveryBand} />}

      {offerSavings.map(({ productCode, saving }) => (
        <p key={productCode} className="nudge">
          Add 1 more{' '}
          {catalogue.find((product) => product.code === productCode)?.name ?? productCode} to save{' '}
          {formatCents(saving)}
        </p>
      ))}
    </div>
  );
}

interface DeliveryFootnoteProps {
  readonly nextBand: NextDeliveryBandDto;
}

/** Explains the asterisk on the delivery line: how much more changes the charge. */
function DeliveryFootnote({ nextBand }: DeliveryFootnoteProps) {
  // "is", not "drops to": the domain does not require the next band to be cheaper.
  const outcome =
    nextBand.charge === 0 ? 'delivery is free' : `delivery is ${formatCents(nextBand.charge)}`;
  return (
    <p className="footnote">
      {formatCents(nextBand.amountToReach)} more and {outcome}.
    </p>
  );
}
