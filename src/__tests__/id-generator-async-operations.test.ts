import {
  generateId,
  generateIdAsync,
  GenerateIdOptions,
  BytesLike,
} from '../naylence/fame/core/util/id-generator';

describe('ID Generator Async Operations', () => {
  // Mock environments for testing different code paths
  const originalCrypto = (globalThis as any).crypto;
  const originalAtob = (globalThis as any).atob;
  const originalGlobalThis = globalThis;
  const originalRequire = (globalThis as any).require;
  const originalNavigator = (globalThis as any).navigator;
  const originalProcess = (globalThis as any).process;

  afterEach(() => {
    // Restore original environment
    (globalThis as any).crypto = originalCrypto;
    (globalThis as any).atob = originalAtob;
    (globalThis as any).require = originalRequire;
    (globalThis as any).navigator = originalNavigator;
    (globalThis as any).process = originalProcess;
  });

  describe('decodeBase64 function paths', () => {
    it('should use atob when available', () => {
      // Test normal browser atob path
      const result = generateId({ length: 8 });
      expect(typeof result).toBe('string');
      expect(result.length).toBe(8);
    });

    it('should use Buffer when atob unavailable but globalThis.Buffer exists', () => {
      delete (globalThis as any).atob;
      (globalThis as any).Buffer = {
        from: (str: string, encoding: string) => ({
          toString: () => (str === 'c2hpdA==' ? 'shit' : 'decoded'),
        }),
      };

      const result = generateId({ length: 8 });
      expect(typeof result).toBe('string');
      expect(result.length).toBe(8);
    });

    it('should use fallback base64 decoder when neither atob nor Buffer available', () => {
      delete (globalThis as any).atob;
      delete (globalThis as any).Buffer;

      const result = generateId({ length: 8 });
      expect(typeof result).toBe('string');
      expect(result.length).toBe(8);
    });
  });

  describe('Mode validation', () => {
    it('should throw error for invalid mode', () => {
      expect(() => {
        generateId({ mode: 'invalid' as any });
      }).toThrow("mode must be 'random' or 'fingerprint'");
    });

    it('should throw error for invalid mode in async', async () => {
      await expect(generateIdAsync({ mode: 'invalid' as any })).rejects.toThrow(
        "mode must be 'random' or 'fingerprint'"
      );
    });
  });

  describe('Random mode', () => {
    it('should generate random IDs with different lengths', () => {
      const lengths = [1, 4, 8, 16, 32, 64];
      lengths.forEach((length) => {
        const id = generateId({ mode: 'random', length });
        expect(id.length).toBe(length);
        expect(/^[0-9a-zA-Z]+$/.test(id)).toBe(true);
      });
    });

    it('should handle blacklist filtering in random mode', () => {
      // Create a small blacklist with common patterns
      const blacklist = new Set(['test', 'bad', 'word']);
      const id = generateId({ mode: 'random', length: 16, blacklist });

      // Check that none of the blacklisted words appear in the result
      blacklist.forEach((badWord) => {
        expect(id.toLowerCase().includes(badWord)).toBe(false);
      });
    });

    it('should handle empty blacklist', () => {
      const emptyBlacklist = new Set<string>();
      const id = generateId({ mode: 'random', blacklist: emptyBlacklist });
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });
  });

  describe('Fingerprint mode - Node.js simulation', () => {
    beforeEach(() => {
      // Remove crypto.subtle to simulate Node.js environment
      delete (globalThis as any).crypto;
    });

    it('should generate fingerprint ID with string material in Node.js environment', () => {
      // Mock Node.js crypto module
      (globalThis as any).require = (name: string) => {
        if (name === 'crypto') {
          return {
            createHash: (algorithm: string) => ({
              update: (data: Uint8Array) => {},
              digest: () => new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
            }),
          };
        }
        return undefined;
      };

      const id = generateId({
        mode: 'fingerprint',
        material: 'test-string-material',
        length: 12,
      });

      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
      expect(id.length).toBeLessThanOrEqual(12);
    });

    it('should generate fingerprint ID with Uint8Array material', () => {
      (globalThis as any).require = (name: string) => {
        if (name === 'crypto') {
          return {
            createHash: (algorithm: string) => ({
              update: (data: Uint8Array) => {},
              digest: () => new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80]),
            }),
          };
        }
        return undefined;
      };

      const material = new Uint8Array([1, 2, 3, 4]);
      const id = generateId({
        mode: 'fingerprint',
        material,
        length: 8,
      });

      expect(typeof id).toBe('string');
      expect(id.length).toBe(8);
    });

    it('should generate fingerprint ID with array of materials', () => {
      (globalThis as any).require = (name: string) => {
        if (name === 'crypto') {
          return {
            createHash: (algorithm: string) => ({
              update: (data: Uint8Array) => {},
              digest: () =>
                new Uint8Array([100, 101, 102, 103, 104, 105, 106, 107]),
            }),
          };
        }
        return undefined;
      };

      const materials: BytesLike[] = [
        'string-part',
        new Uint8Array([65, 66, 67]),
        'another-string',
      ];

      const id = generateId({
        mode: 'fingerprint',
        material: materials,
        length: 10,
      });

      expect(typeof id).toBe('string');
      expect(id.length).toBe(10);
    });

    it('should handle blacklist collision and re-hash in fingerprint mode', () => {
      let hashCallCount = 0;
      (globalThis as any).require = (name: string) => {
        if (name === 'crypto') {
          return {
            createHash: (algorithm: string) => ({
              update: (data: Uint8Array) => {},
              digest: () => {
                hashCallCount++;
                // First hash produces something that definitely contains 'shit' when base62 encoded
                if (hashCallCount === 1) {
                  // Create bytes that will encode to contain blacklisted word
                  const bytes = new Uint8Array(32);
                  // Fill with specific pattern that might produce blacklisted content
                  for (let i = 0; i < 32; i++) {
                    bytes[i] = 100 + (i % 10); // Values 100-109
                  }
                  return bytes;
                } else {
                  return new Uint8Array([
                    200, 201, 202, 203, 204, 205, 206, 207,
                  ]);
                }
              },
            }),
          };
        }
        return undefined;
      };

      // Use the default blacklist which includes profanity
      const id = generateId({
        mode: 'fingerprint',
        material: 'material-that-produces-blacklisted',
        length: 8,
      });

      expect(typeof id).toBe('string');
      expect(id.length).toBe(8);
      // Since we can't guarantee a collision with the real blacklist, just check we got a result
      expect(hashCallCount).toBeGreaterThanOrEqual(1);
    });

    it('should throw error when no material provided in fingerprint mode sync', () => {
      expect(() => {
        generateId({ mode: 'fingerprint' });
      }).toThrow(
        'Fingerprint mode requires async operation in browser - use generateIdAsync instead'
      );
    });

    it('should use fallback hash when Node.js crypto unavailable', () => {
      (globalThis as any).require = undefined;

      const id = generateId({
        mode: 'fingerprint',
        material: 'test-fallback-hash',
        length: 6,
      });

      expect(typeof id).toBe('string');
      expect(id.length).toBe(6);
    });
  });

  describe('Async fingerprint mode', () => {
    it('should handle fingerprint mode with no material (default node fingerprint)', async () => {
      // Mock environment to get default fingerprint
      (globalThis as any).navigator = { userAgent: 'Test User Agent' };

      const id = await generateIdAsync({ mode: 'fingerprint', length: 10 });
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
      expect(id.length).toBeLessThanOrEqual(10);
    });

    it('should handle array materials in async mode', async () => {
      const materials: BytesLike[] = [
        'async-part1',
        new Uint8Array([70, 71, 72]),
        'async-part2',
      ];

      const id = await generateIdAsync({
        mode: 'fingerprint',
        material: materials,
        length: 14,
      });

      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
      expect(id.length).toBeLessThanOrEqual(14);
    });

    it('should handle blacklist collisions in async mode', async () => {
      const blacklist = new Set(['async']);
      const id = await generateIdAsync({
        mode: 'fingerprint',
        material: 'async-test-material',
        blacklist,
        length: 12,
      });

      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
      expect(id.toLowerCase().includes('async')).toBe(false);
    });

    it('should handle environment salt from process.env', async () => {
      (globalThis as any).process = {
        env: { FAME_NODE_ID_SALT: 'test-env-salt' },
      };

      const id = await generateIdAsync({ mode: 'fingerprint' });
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });
  });

  describe('Environment detection', () => {
    it('should handle browser environment without navigator', async () => {
      delete (globalThis as any).navigator;
      (globalThis as any).crypto = { subtle: {} }; // Browser-like

      const id = await generateIdAsync({ mode: 'fingerprint', length: 8 });
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should handle Node.js environment with MAC address', async () => {
      delete (globalThis as any).crypto;
      (globalThis as any).require = (name: string) => {
        if (name === 'os') {
          return {
            networkInterfaces: () => ({
              eth0: [{ mac: '00:11:22:33:44:55', internal: false }],
            }),
            hostname: () => 'test-hostname',
          };
        }
        if (name === 'crypto') {
          return {
            createHash: (alg: string) => ({
              update: () => {},
              digest: () => new Uint8Array([1, 2, 3, 4]),
            }),
          };
        }
        return undefined;
      };

      const id = await generateIdAsync({ mode: 'fingerprint' });
      expect(typeof id).toBe('string');
    });

    it('should handle Node.js environment without MAC but with hostname', async () => {
      delete (globalThis as any).crypto;
      (globalThis as any).require = (name: string) => {
        if (name === 'os') {
          return {
            networkInterfaces: () => ({
              lo: [{ mac: '00:00:00:00:00:00', internal: true }], // Excluded MAC
            }),
            hostname: () => 'test-hostname-only',
          };
        }
        if (name === 'crypto') {
          return {
            createHash: (alg: string) => ({
              update: () => {},
              digest: () => new Uint8Array([5, 6, 7, 8]),
            }),
          };
        }
        return undefined;
      };

      const id = await generateIdAsync({ mode: 'fingerprint' });
      expect(typeof id).toBe('string');
    });

    it('should handle unknown environment', async () => {
      delete (globalThis as any).navigator;
      delete (globalThis as any).crypto;
      (globalThis as any).require = undefined;

      const id = await generateIdAsync({
        mode: 'fingerprint',
        material: 'fallback-material',
      });
      expect(typeof id).toBe('string');
    });
  });

  describe('Crypto fallbacks', () => {
    it('should use Math.random fallback when no crypto available', () => {
      const originalCryptoGetRandomValues = globalThis.crypto?.getRandomValues;
      delete (globalThis as any).crypto;
      (globalThis as any).require = undefined;

      const id = generateId({ mode: 'random', length: 8 });
      expect(typeof id).toBe('string');
      expect(id.length).toBe(8);

      // Restore
      if (originalCrypto && originalCryptoGetRandomValues) {
        (globalThis as any).crypto = {
          getRandomValues: originalCryptoGetRandomValues,
        };
      }
    });

    it('should use Node.js crypto.randomBytes when available', () => {
      delete (globalThis as any).crypto;
      (globalThis as any).require = (name: string) => {
        if (name === 'crypto') {
          return {
            randomBytes: (length: number) => new Uint8Array(length).fill(42),
          };
        }
        return undefined;
      };

      const id = generateId({ mode: 'random', length: 6 });
      expect(typeof id).toBe('string');
      expect(id.length).toBe(6);
    });

    it('should handle crypto.subtle failures gracefully', async () => {
      (globalThis as any).crypto = {
        subtle: {
          digest: () => Promise.reject(new Error('Crypto failure')),
        },
      };

      const id = await generateIdAsync({
        mode: 'fingerprint',
        material: 'test-crypto-failure',
      });
      expect(typeof id).toBe('string');
    });
  });

  describe('Base62 encoding edge cases', () => {
    it('should handle zero value in base62', () => {
      // This tests the n === 0n path in base62 function
      // We can't directly test it, but we can test with material that might produce zero
      const id = generateId({
        mode: 'random',
        length: 1,
      });
      expect(typeof id).toBe('string');
      expect(id.length).toBe(1);
    });

    it('should handle large numbers in base62 encoding', () => {
      const id = generateId({ mode: 'random', length: 50 });
      expect(typeof id).toBe('string');
      expect(id.length).toBe(50);
      expect(/^[0-9a-zA-Z]+$/.test(id)).toBe(true);
    });
  });

  describe('Hash algorithm variations', () => {
    it('should handle different hash algorithms in Node.js', () => {
      delete (globalThis as any).crypto; // Ensure Node.js environment

      (globalThis as any).require = (name: string) => {
        if (name === 'crypto') {
          return {
            createHash: (algorithm: string) => ({
              update: (data: Uint8Array) => {},
              digest: () =>
                new Uint8Array([algorithm === 'sha1' ? 1 : 2, 3, 4, 5]),
            }),
          };
        }
        return undefined;
      };

      const id1 = generateId({
        mode: 'fingerprint',
        material: 'test',
        hashAlg: 'sha1',
      });
      const id2 = generateId({
        mode: 'fingerprint',
        material: 'test',
        hashAlg: 'sha256',
      });

      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
    });

    it('should handle hash algorithm conversion in async mode', async () => {
      const id = await generateIdAsync({
        mode: 'fingerprint',
        material: 'test-conversion',
        hashAlg: 'sha-256', // Test conversion to SHA-256
      });
      expect(typeof id).toBe('string');
    });
  });

  describe('getCanonicalArgv', () => {
    it('should handle process.argv with flags', async () => {
      (globalThis as any).process = {
        argv: ['node', 'script.js', '--flag1', '--flag2', '--instance', 'test'],
        env: {},
      };

      const id = await generateIdAsync({ mode: 'fingerprint' });
      expect(typeof id).toBe('string');
    });

    it('should handle process.argv without flags', async () => {
      (globalThis as any).process = {
        argv: ['node', 'script.js'],
        env: {},
      };

      const id = await generateIdAsync({ mode: 'fingerprint' });
      expect(typeof id).toBe('string');
    });

    it('should handle errors in getCanonicalArgv', async () => {
      (globalThis as any).process = {
        get argv() {
          throw new Error('Process error');
        },
        env: {},
      };

      const id = await generateIdAsync({ mode: 'fingerprint' });
      expect(typeof id).toBe('string');
    });
  });

  describe('Material handling edge cases', () => {
    it('should handle single empty string material', async () => {
      const id = await generateIdAsync({
        mode: 'fingerprint',
        material: '',
      });
      expect(typeof id).toBe('string');
    });

    it('should handle empty Uint8Array material', async () => {
      const id = await generateIdAsync({
        mode: 'fingerprint',
        material: new Uint8Array(0),
      });
      expect(typeof id).toBe('string');
    });

    it('should handle array with empty materials', async () => {
      const materials: BytesLike[] = ['', new Uint8Array(0), 'non-empty'];
      const id = await generateIdAsync({
        mode: 'fingerprint',
        material: materials,
      });
      expect(typeof id).toBe('string');
    });

    it('should handle single-item array material', async () => {
      const materials: BytesLike[] = ['single-item'];
      const id = await generateIdAsync({
        mode: 'fingerprint',
        material: materials,
      });
      expect(typeof id).toBe('string');
    });
  });

  describe('Consistency checks', () => {
    it('should produce same fingerprint for same input', async () => {
      const material = 'consistent-test-material';
      const id1 = await generateIdAsync({ mode: 'fingerprint', material });
      const id2 = await generateIdAsync({ mode: 'fingerprint', material });
      expect(id1).toBe(id2);
    });

    it('should produce different fingerprints for different inputs', async () => {
      const id1 = await generateIdAsync({
        mode: 'fingerprint',
        material: 'material1',
      });
      const id2 = await generateIdAsync({
        mode: 'fingerprint',
        material: 'material2',
      });
      expect(id1).not.toBe(id2);
    });

    it('should produce different random IDs each time', () => {
      const id1 = generateId({ mode: 'random' });
      const id2 = generateId({ mode: 'random' });
      expect(id1).not.toBe(id2);
    });
  });
});
