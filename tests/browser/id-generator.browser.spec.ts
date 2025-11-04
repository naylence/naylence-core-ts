import { beforeAll, describe, expect, it } from 'vitest';
import { webcrypto } from 'node:crypto';

import { generateId, generateIdAsync } from '../../src/browser/index.js';

const SEED_STORAGE_KEY = 'naylence:fame:seed';

describe('browser id generator (vitest)', () => {
  beforeAll(() => {
    const current = globalThis.crypto as Crypto | undefined;
    const hasRandom = typeof current?.getRandomValues === 'function';
    if (!hasRandom && typeof webcrypto !== 'undefined') {
      Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: webcrypto,
      });
    }

    try {
      globalThis.localStorage?.removeItem(SEED_STORAGE_KEY);
    } catch {
      // ignore storage access errors
    }
  });

  it('creates random ids of the requested length', () => {
    const id = generateId({ length: 10, mode: 'random' });
    expect(id).toHaveLength(10);
  });

  it('persists a fingerprint seed for subsequent calls', async () => {
    const first = await generateIdAsync({ mode: 'fingerprint', length: 18 });
    const second = await generateIdAsync({ mode: 'fingerprint', length: 18 });

    expect(second).toBe(first);
    expect(typeof first).toBe('string');
    expect(first.length).toBeLessThanOrEqual(18);
  });
});
