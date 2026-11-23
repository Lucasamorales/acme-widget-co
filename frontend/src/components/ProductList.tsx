import type { ProductsResponse } from '@acme/backend/contract';
import { formatCents } from '../format-cents';
import type { Quantities } from '../hooks/use-basket';
import type { RequestState } from '../hooks/use-request';
import { ErrorMessage } from './ErrorMessage';

interface ProductListProps {
  readonly products: RequestState<ProductsResponse>;
  /** Units in the basket per code; replays the swatch animation when one changes. */
  readonly quantities: Quantities;
  readonly onAdd: (code: string) => void;
}

/** The catalogue as a stack of tickets, each with a colour swatch and an Add button. */
export function ProductList({ products, quantities, onAdd }: ProductListProps) {
  return (
    <section className="products-panel" aria-labelledby="products-heading">
      <h2 id="products-heading" className="eyebrow">
        Products
      </h2>

      {products.error ? (
        <ErrorMessage error={products.error} />
      ) : !products.data ? (
        <p className="muted">Loading products…</p>
      ) : (
        <ul className="tickets">
          {products.data.products.map((product) => {
            const quantity = quantities[product.code] ?? 0;
            return (
              <li key={product.code} className="ticket">
                <div className="ticket-stub">
                  {/* Keyed on the quantity so each add remounts it and replays the animation. */}
                  <div
                    key={quantity}
                    className="swatch"
                    data-code={product.code}
                    data-in-basket={quantity > 0}
                    aria-hidden="true"
                  >
                    <span className="swatch-colour" />
                    <span className="swatch-code">{product.code}</span>
                  </div>
                </div>
                <div className="ticket-body">
                  <div className="ticket-heading">
                    <p className="product-name">{product.name}</p>
                    <p className="ticket-code">{product.code}</p>
                  </div>
                  {product.offerLabels.map((label) => (
                    <p key={label} className="offer-stamp">
                      {label}
                    </p>
                  ))}
                  <div className="ticket-footer">
                    <p className="price">{formatCents(product.price)}</p>
                    <button
                      type="button"
                      className="button-primary"
                      onClick={() => onAdd(product.code)}
                      aria-label={`Add ${product.name} to basket`}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
