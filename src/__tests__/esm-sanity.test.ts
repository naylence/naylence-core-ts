import { describe, it, expect } from '@jest/globals';

import { generateId, generateIdAsync } from '../index.js';
import { FameAddress } from '../naylence/fame/core/address/address';

describe('esm sanity', () => {
  it('constructs FameAddress', () => {
    const addr = new FameAddress('test@/foo');
    expect(addr.toString()).toBe('test@/foo');
  });

  it('creates random identifiers without touching Node-specific APIs', () => {
    const id = generateId({ length: 12, mode: 'random' });
    expect(typeof id).toBe('string');
    expect(id).toHaveLength(12);
  });

  it('supports async fingerprint generation when material is provided', async () => {
    const id = await generateIdAsync({
      mode: 'fingerprint',
      material: ['esm', 'sanity'],
      length: 16,
    });

    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
    expect(id.length).toBeLessThanOrEqual(16);
  });
});
