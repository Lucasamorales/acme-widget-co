import { useMemo, useState } from 'react';

/** How many units of each product code are in the basket, e.g. `{ R01: 2 }`. */
export type Quantities = Readonly<Record<string, number>>;

/**
 * Holds the basket's contents on the client. Pricing is not done here: the
 * server prices `items` on every change.
 */
export function useBasket() {
  const [quantities, setQuantities] = useState<Quantities>({});

  // The API takes one code per unit: { R01: 2 } becomes ["R01", "R01"].
  // Memoised because the quote request depends on this array's identity:
  // a new array on every render would send a new request on every render.
  const items = useMemo(
    () => Object.entries(quantities).flatMap(([code, count]) => Array<string>(count).fill(code)),
    [quantities],
  );

  // Updater functions read the latest state, so rapid clicks are never lost
  // to a stale `quantities` value captured by an earlier render.
  function add(code: string): void {
    setQuantities((current) => ({ ...current, [code]: (current[code] ?? 0) + 1 }));
  }

  function remove(code: string): void {
    setQuantities((current) => ({ ...current, [code]: Math.max(0, (current[code] ?? 0) - 1) }));
  }

  return { quantities, items, add, remove };
}
