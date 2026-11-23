import { describe, expect, it } from 'vitest';
import { loadEnv } from './env.js';

describe('loadEnv', () => {
  it('uses defaults when nothing is set', () => {
    expect(loadEnv({}).PORT).toBe(3000);
  });

  it('turns PORT from text into a number', () => {
    expect(loadEnv({ PORT: '8080' }).PORT).toBe(8080);
  });

  it('fails fast on an invalid PORT', () => {
    expect(() => loadEnv({ PORT: 'abc' })).toThrow(/Invalid environment variables:[\s\S]*PORT/);
  });
});
