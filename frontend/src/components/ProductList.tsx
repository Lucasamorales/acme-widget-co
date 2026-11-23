import type { ProductsResponse } from '@acme/backend/contract';
import { formatCents } from '../format-cents';
import type { RequestState } from '../hooks/use-request';
import { ErrorMessage } from './ErrorMessage';

interface ProductListProps {
  readonly products: RequestState<ProductsResponse>;
  readonly onAdd: (code: string) => void;
}

/** The catalogue, with a button to add each product to the basket. */
export function ProductList({ products, onAdd }: ProductListProps) {
  return (
    <section className="panel" aria-labelledby="products-heading">
      <h2 id="products-heading">Products</h2>

      {products.error ? (
        <ErrorMessage error={products.error} />
      ) : !products.data ? (
        <p className="muted">Loading products…</p>
      ) : (
        <ul className="products">
          {products.data.products.map((product) => (
            <li key={product.code} className="product">
              <div>
                <p className="product-name">{product.name}</p>
                <p className="muted">
                  {product.code} · {formatCents(product.price)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onAdd(product.code)}
                aria-label={`Add ${product.name} to basket`}
              >
                Add
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
