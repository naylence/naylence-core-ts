import {
  generateId,
  generateIdAsync,
  GenerateIdOptions,
  BytesLike,
} from '../naylence/fame/core/util/id-generator';

describe('ID Generator Crypto Algorithms', () => {
  const originalCrypto = (globalThis as any).crypto;
  const originalAtob = (globalThis as any).atob;
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

  describe('Fallback base64 decoder', () => {
    it('should handle edge cases in fallback base64 decoder', () => {
      delete (globalThis as any).atob;
      delete (globalThis as any).Buffer;

      // This should trigger the fallback decoder with various edge cases
      const result = generateId({ length: 8 });
      expect(typeof result).toBe('string');
      expect(result.length).toBe(8);
    });

    it('should handle encoded3 === 64 branch in fallback decoder', () => {
      delete (globalThis as any).atob;
      delete (globalThis as any).Buffer;

      // Generate with specific conditions that might trigger encoded3 === 64
      const result = generateId({ mode: 'random', length: 6 });
      expect(typeof result).toBe('string');
      expect(result.length).toBe(6);
    });

    it('should handle encoded4 === 64 branch in fallback decoder', () => {
      delete (globalThis as any).atob;
      delete (globalThis as any).Buffer;

      // Multiple generations to hit different conditions
      for (let i = 0; i < 5; i++) {
        const result = generateId({ mode: 'random', length: 4 });
        expect(typeof result).toBe('string');
        expect(result.length).toBe(4);
      }
    });

    it('should handle character replacement in fallback decoder', () => {
      delete (globalThis as any).atob;
      delete (globalThis as any).Buffer;

      // This will exercise the str.replace(/[^A-Za-z0-9+/]/g, '') line
      const result = generateId({ mode: 'random', length: 10 });
      expect(typeof result).toBe('string');
      expect(result.length).toBe(10);
    });
  });

  describe('Network interface detection edge cases', () => {
    it('should handle network interfaces without MAC addresses', async () => {
      delete (globalThis as any).crypto;
      (globalThis as any).require = (name: string) => {
        if (name === 'os') {
          return {
            networkInterfaces: () => ({
              lo0: [{ mac: undefined, internal: true }],
              eth0: [{ mac: null, internal: false }],
              wlan0: [{ internal: false }], // No mac property
            }),
            hostname: () => 'test-host',
          };
        }
        return undefined;
      };

      const id = await generateIdAsync({ mode: 'fingerprint' });
      expect(typeof id).toBe('string');
    });

    it('should handle empty network interfaces', async () => {
      delete (globalThis as any).crypto;
      (globalThis as any).require = (name: string) => {
        if (name === 'os') {
          return {
            networkInterfaces: () => ({}), // Empty interfaces
            hostname: () => 'empty-interfaces-host',
          };
        }
        return undefined;
      };

      const id = await generateIdAsync({ mode: 'fingerprint' });
      expect(typeof id).toBe('string');
    });

    it('should handle network interfaces with all-zero MAC', async () => {
      delete (globalThis as any).crypto;
      (globalThis as any).require = (name: string) => {
        if (name === 'os') {
          return {
            networkInterfaces: () => ({
              lo0: [{ mac: '00:00:00:00:00:00', internal: true }], // Excluded
              bond0: [{ mac: '00:00:00:00:00:00', internal: false }], // Also excluded
            }),
            hostname: () => 'no-valid-mac-host',
          };
        }
        return undefined;
      };

      const id = await generateIdAsync({ mode: 'fingerprint' });
      expect(typeof id).toBe('string');
    });

    it('should handle mixed valid and invalid MACs', async () => {
      delete (globalThis as any).crypto;
      (globalThis as any).require = (name: string) => {
        if (name === 'os') {
          return {
            networkInterfaces: () => ({
              lo0: [{ mac: '00:00:00:00:00:00', internal: true }],
              eth0: [{ mac: null, internal: false }],
              wlan0: [{ mac: 'aa:bb:cc:dd:ee:ff', internal: false }], // Valid MAC
            }),
            hostname: () => 'mixed-mac-host',
          };
        }
        return undefined;
      };

      const id = await generateIdAsync({ mode: 'fingerprint' });
      expect(typeof id).toBe('string');
    });

    it('should handle OS module errors gracefully', async () => {
      delete (globalThis as any).crypto;
      (globalThis as any).require = (name: string) => {
        if (name === 'os') {
          return {
            networkInterfaces: () => {
              throw new Error('Network interfaces not available');
            },
            hostname: () => 'error-host',
          };
        }
        return undefined;
      };

      const id = await generateIdAsync({ mode: 'fingerprint' });
      expect(typeof id).toBe('string');
    });
  });

  describe('Hash algorithm processing edge cases', () => {
    it('should handle hash algorithm conversion with digits', async () => {
      const id = await generateIdAsync({
        mode: 'fingerprint',
        material: 'test-sha256',
        hashAlg: 'sha256', // Will be converted to SHA-256
      });
      expect(typeof id).toBe('string');
    });

    it('should handle hash algorithm conversion with complex names', async () => {
      const id = await generateIdAsync({
        mode: 'fingerprint',
        material: 'test-complex',
        hashAlg: 'sha3-256', // Will be converted to SHA3-256
      });
      expect(typeof id).toBe('string');
    });

    it('should handle Node.js hash algorithm case conversion', () => {
      delete (globalThis as any).crypto;
      (globalThis as any).require = (name: string) => {
        if (name === 'crypto') {
          return {
            createHash: (algorithm: string) => {
              // Verify the algorithm case conversion
              expect(algorithm).toBe('sha256'); // lowercase, no dash
              return {
                update: () => {},
                digest: () => new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
              };
            },
          };
        }
        return undefined;
      };

      const id = generateId({
        mode: 'fingerprint',
        material: 'test-case-conversion',
        hashAlg: 'SHA-256', // Will be converted to sha256
      });
      expect(typeof id).toBe('string');
    });
  });

  describe('Blacklist collision and re-hashing', () => {
    it('should handle multiple blacklist collisions requiring re-hashing', () => {
      delete (globalThis as any).crypto;
      let hashCallCount = 0;

      (globalThis as any).require = (name: string) => {
        if (name === 'crypto') {
          return {
            createHash: (algorithm: string) => ({
              update: () => {},
              digest: () => {
                hashCallCount++;
                // Create content that actually triggers real blacklist words
                // Use the actual blacklisted words from the module
                if (hashCallCount === 1) {
                  // Create bytes that spell 'shit' when base62 encoded
                  return new Uint8Array([
                    115,
                    104,
                    105,
                    116, // 'shit' in ASCII
                    0,
                    0,
                    0,
                    0,
                  ]);
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

      const id = generateId({
        mode: 'fingerprint',
        material: 'collision-test-material',
        length: 8,
      });

      expect(typeof id).toBe('string');
      // At least one hash should have been called
      expect(hashCallCount).toBeGreaterThanOrEqual(1);
    });

    it('should handle async blacklist collisions and re-hashing', async () => {
      let hashCallCount = 0;
      const originalSubtle = (globalThis as any).crypto?.subtle;

      (globalThis as any).crypto = {
        subtle: {
          digest: async (algorithm: string, data: ArrayBuffer) => {
            hashCallCount++;
            if (hashCallCount <= 2) {
              // First few attempts produce blacklisted content
              const buffer = new ArrayBuffer(8);
              const view = new Uint8Array(buffer);
              view.fill(116); // Will contain patterns matching blacklist
              return buffer;
            } else {
              const buffer = new ArrayBuffer(8);
              const view = new Uint8Array(buffer);
              view.fill(150); // Safe content
              return buffer;
            }
          },
        },
      };

      const blacklist = new Set(['test', 'bad']);
      const id = await generateIdAsync({
        mode: 'fingerprint',
        material: 'async-collision-test',
        blacklist,
        length: 8,
      });

      expect(typeof id).toBe('string');
      expect(hashCallCount).toBeGreaterThanOrEqual(1);

      // Restore
      if (originalSubtle) {
        (globalThis as any).crypto.subtle = originalSubtle;
      }
    });
  });

  describe('Crypto.subtle error handling', () => {
    it('should handle crypto.subtle digest errors and fall back', async () => {
      (globalThis as any).crypto = {
        subtle: {
          digest: async () => {
            throw new Error('WebCrypto digest failed');
          },
        },
      };

      const id = await generateIdAsync({
        mode: 'fingerprint',
        material: 'crypto-error-test',
      });
      expect(typeof id).toBe('string');
    });

    it('should handle crypto.subtle with malformed buffer', async () => {
      (globalThis as any).crypto = {
        subtle: {
          digest: async (algorithm: string, data: unknown) => {
            // Simulate buffer creation error
            if (data instanceof ArrayBuffer) {
              throw new Error('Buffer processing error');
            }
            return new ArrayBuffer(32);
          },
        },
      };

      const id = await generateIdAsync({
        mode: 'fingerprint',
        material: 'buffer-error-test',
      });
      expect(typeof id).toBe('string');
    });
  });

  describe('TextDecoder/TextEncoder edge cases', () => {
    it('should handle Uint8Array material with special characters', async () => {
      // Create Uint8Array with various byte values including high values
      const specialBytes = new Uint8Array([
        0,
        1,
        127,
        128,
        255, // Various edge values
        65,
        66,
        67, // ABC
        240,
        159,
        152,
        128, // UTF-8 emoji bytes
      ]);

      const id = await generateIdAsync({
        mode: 'fingerprint',
        material: specialBytes,
      });
      expect(typeof id).toBe('string');
    });

    it('should handle empty Uint8Array in TextDecoder', async () => {
      const emptyBytes = new Uint8Array(0);

      const id = await generateIdAsync({
        mode: 'fingerprint',
        material: emptyBytes,
      });
      expect(typeof id).toBe('string');
    });
  });

  describe('Process.argv edge cases', () => {
    it('should handle process.argv with mixed flag types', async () => {
      (globalThis as any).process = {
        argv: [
          'node',
          '/path/to/script.js',
          '--verbose',
          'non-flag-arg',
          '--debug=true',
          '--instance',
          'should-be-filtered',
          '--config',
          'config.json',
          '--help',
        ],
        env: {},
      };

      const id = await generateIdAsync({ mode: 'fingerprint' });
      expect(typeof id).toBe('string');
    });

    it('should handle process.argv with no flags', async () => {
      (globalThis as any).process = {
        argv: ['node', '/path/to/script.js', 'arg1', 'arg2'],
        env: {},
      };

      const id = await generateIdAsync({ mode: 'fingerprint' });
      expect(typeof id).toBe('string');
    });

    it('should handle process.argv without entry script', async () => {
      (globalThis as any).process = {
        argv: ['node'], // Missing script path
        env: {},
      };

      const id = await generateIdAsync({ mode: 'fingerprint' });
      expect(typeof id).toBe('string');
    });

    it('should handle process.argv with only instance flag', async () => {
      (globalThis as any).process = {
        argv: ['node', '/script.js', '--instance', 'test'],
        env: {},
      };

      const id = await generateIdAsync({ mode: 'fingerprint' });
      expect(typeof id).toBe('string');
    });
  });

  describe('Random bytes generation edge cases', () => {
    it('should handle crypto.getRandomValues failure', () => {
      const originalCrypto = (globalThis as any).crypto;

      // Mock crypto to be undefined to force fallback to Node.js crypto path
      delete (globalThis as any).crypto;

      // Mock require to simulate Node.js crypto that fails
      const originalRequire = (globalThis as any).require;
      (globalThis as any).require = (name: string) => {
        if (name === 'crypto') {
          return {
            randomBytes: () => {
              throw new Error('Node.js randomBytes failed');
            },
          };
        }
        return undefined;
      };

      try {
        // This should fall back to Math.random since both crypto options fail
        const id = generateId({ mode: 'random', length: 8 });
        expect(typeof id).toBe('string');
        expect(id.length).toBe(8);
      } finally {
        // Restore
        (globalThis as any).crypto = originalCrypto;
        (globalThis as any).require = originalRequire;
      }
    });

    it('should handle Node.js crypto.randomBytes failure', () => {
      delete (globalThis as any).crypto;
      (globalThis as any).require = (name: string) => {
        if (name === 'crypto') {
          return {
            randomBytes: () => {
              throw new Error('randomBytes failed');
            },
          };
        }
        return undefined;
      };

      const id = generateId({ mode: 'random', length: 8 });
      expect(typeof id).toBe('string');
      expect(id.length).toBe(8);
    });
  });

  describe('Base62 encoding edge cases', () => {
    it('should handle very large numbers that exercise all base62 paths', () => {
      // Generate large IDs to exercise base62 encoding with big numbers
      const id = generateId({ mode: 'random', length: 100 });
      expect(typeof id).toBe('string');
      expect(id.length).toBe(100);
      expect(/^[0-9a-zA-Z]+$/.test(id)).toBe(true);
    });

    it('should handle digest encoding with zero bytes', () => {
      delete (globalThis as any).crypto;
      (globalThis as any).require = (name: string) => {
        if (name === 'crypto') {
          return {
            createHash: () => ({
              update: () => {},
              digest: () => new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]), // All zeros
            }),
          };
        }
        return undefined;
      };

      const id = generateId({
        mode: 'fingerprint',
        material: 'zero-digest-test',
        length: 8,
      });
      expect(typeof id).toBe('string');
    });
  });

  describe('Array material processing edge cases', () => {
    it('should handle array with very large number of materials', async () => {
      const largeMaterialArray: BytesLike[] = [];
      for (let i = 0; i < 50; i++) {
        largeMaterialArray.push(`material-${i}`);
        largeMaterialArray.push(new Uint8Array([i % 256]));
      }

      const id = await generateIdAsync({
        mode: 'fingerprint',
        material: largeMaterialArray,
      });
      expect(typeof id).toBe('string');
    });

    it('should handle array with alternating string and Uint8Array types', async () => {
      const mixedArray: BytesLike[] = [];
      for (let i = 0; i < 10; i++) {
        if (i % 2 === 0) {
          mixedArray.push(`string-${i}`);
        } else {
          mixedArray.push(new Uint8Array([i, i + 1, i + 2]));
        }
      }

      const id = await generateIdAsync({
        mode: 'fingerprint',
        material: mixedArray,
      });
      expect(typeof id).toBe('string');
    });

    it('should handle sync array material processing', () => {
      delete (globalThis as any).crypto;
      (globalThis as any).require = (name: string) => {
        if (name === 'crypto') {
          return {
            createHash: () => ({
              update: () => {},
              digest: () => new Uint8Array([10, 20, 30, 40]),
            }),
          };
        }
        return undefined;
      };

      const materials: BytesLike[] = [
        'sync-part1',
        new Uint8Array([100, 101, 102]),
        'sync-part2',
      ];

      const id = generateId({
        mode: 'fingerprint',
        material: materials,
        length: 8,
      });
      expect(typeof id).toBe('string');
    });
  });

  describe('Environment detection', () => {
    it('should handle require function that throws errors', async () => {
      (globalThis as any).require = () => {
        throw new Error('Require failed');
      };

      const id = await generateIdAsync({ mode: 'fingerprint' });
      expect(typeof id).toBe('string');
    });

    it('should handle require returning null/undefined', async () => {
      (globalThis as any).require = () => null;

      const id = await generateIdAsync({ mode: 'fingerprint' });
      expect(typeof id).toBe('string');
    });

    it('should handle OS module methods throwing errors', async () => {
      delete (globalThis as any).crypto;
      (globalThis as any).require = (name: string) => {
        if (name === 'os') {
          return {
            networkInterfaces: () => {
              throw new Error('Network error');
            },
            hostname: () => {
              throw new Error('Hostname error');
            },
          };
        }
        return undefined;
      };

      const id = await generateIdAsync({ mode: 'fingerprint' });
      expect(typeof id).toBe('string');
    });

    it('should handle navigator with empty user agent', async () => {
      (globalThis as any).navigator = { userAgent: '' };

      const id = await generateIdAsync({ mode: 'fingerprint' });
      expect(typeof id).toBe('string');
    });

    it('should handle navigator with very long user agent', async () => {
      (globalThis as any).navigator = {
        userAgent: 'Very '.repeat(1000) + 'Long User Agent String',
      };

      const id = await generateIdAsync({ mode: 'fingerprint' });
      expect(typeof id).toBe('string');
    });
  });
});
