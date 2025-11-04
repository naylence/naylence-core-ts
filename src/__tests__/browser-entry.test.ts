/** @jest-environment jsdom */

import { describe, it, expect, beforeAll } from '@jest/globals';

import { generateId, generateIdAsync } from '@naylence/core/browser';

describe('browser entry', () => {
  beforeAll(() => {
    const cryptoRef = (globalThis as any).crypto;
    if (!cryptoRef?.getRandomValues) {
      // Node >=16 exposes webcrypto on the crypto module
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { webcrypto } = require('crypto') as { webcrypto: Crypto };
      Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: webcrypto,
      });
    }
  });

  it('generates random ids using browser-safe implementation', () => {
    const id = generateId({ length: 10, mode: 'random' });
    expect(typeof id).toBe('string');
    expect(id).toHaveLength(10);
  });

  it('throws for synchronous fingerprint mode', () => {
    expect(() => generateId({ mode: 'fingerprint' })).toThrow(
      /async ID generation/i
    );
  });

  it('supports async fingerprint ids with web crypto', async () => {
    const id = await generateIdAsync({
      mode: 'fingerprint',
      material: ['browser-entry', 'sanity'],
      length: 18,
    });

    expect(typeof id).toBe('string');
    expect(id.length).toBeLessThanOrEqual(18);
    expect(id.length).toBeGreaterThan(0);
  });
});
