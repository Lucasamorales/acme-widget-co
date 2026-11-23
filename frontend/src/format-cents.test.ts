import { describe, expect, it } from 'vitest';
import { formatCents } from './format-cents';

describe('formatCents', () => {
  it.each([
    { cents: 5437, expected: '$54.37' },
    { cents: 795, expected: '$7.95' },
    { cents: 0, expected: '$0.00' },
    { cents: 123456, expected: '$1,234.56' },
  ])('formats $cents cents as $expected', ({ cents, expected }) => {
    expect(formatCents(cents)).toBe(expected);
  });
});
