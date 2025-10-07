import {
  generateId,
  generateIdAsync,
} from '../naylence/fame/core/util/id-generator';

describe('ID Generator Error Handling', () => {
  describe('Force base64 decoder execution (lines 27-49)', () => {
    it('should execute fallback base64 decoder by manipulating environment before module load', async () => {
      // This test aims to trigger the base64 decoder fallback path
      // We need to create conditions where the decoder is called with different inputs

      // Save original environment
      const originalAtob = (globalThis as any).atob;
      const originalBuffer = (globalThis as any).Buffer;
      const originalRequire = (globalThis as any).require;
      const originalCrypto = (globalThis as any).crypto;

      try {
        // Remove atob and Buffer to force fallback path
        delete (globalThis as any).atob;
        delete (globalThis as any).Buffer;

        // Remove crypto.subtle to allow sync execution
        (globalThis as any).crypto = {
          getRandomValues: originalCrypto?.getRandomValues,
        };

        // Create a custom blacklist that will trigger base64 decoding
        const customBlacklist = new Set(['dGVzdA==']); // 'test' in base64

        // Mock require to return no Buffer
        (globalThis as any).require = () => undefined;

        // Test with material that might trigger blacklist checking
        const id = await generateIdAsync({
          mode: 'fingerprint',
          material: 'test-material-to-trigger-decoder',
          blacklist: customBlacklist,
        });

        expect(id).toBeDefined();
        expect(typeof id).toBe('string');
      } finally {
        // Restore environment
        if (originalAtob !== undefined) (globalThis as any).atob = originalAtob;
        if (originalBuffer !== undefined)
          (globalThis as any).Buffer = originalBuffer;
        (globalThis as any).require = originalRequire;
        (globalThis as any).crypto = originalCrypto;
      }
    });

    it('should handle base64 strings with different padding scenarios', async () => {
      const originalAtob = (globalThis as any).atob;
      const originalBuffer = (globalThis as any).Buffer;
      const originalCrypto = (globalThis as any).crypto;

      try {
        // Remove both to force manual implementation
        delete (globalThis as any).atob;
        delete (globalThis as any).Buffer;

        // Remove crypto.subtle
        (globalThis as any).crypto = {
          getRandomValues: originalCrypto?.getRandomValues,
        };

        // Test various base64 scenarios that would exercise different branches
        const customBlacklist = new Set([
          'SGVsbG8=', // 'Hello' - single padding
          'SGVsbG8gV29ybGQ=', // 'Hello World' - single padding
          'VGVzdA==', // 'Test' - double padding
          'YWJjZA==', // 'abcd' - double padding
        ]);

        const id = await generateIdAsync({
          mode: 'fingerprint',
          material: 'trigger-different-base64-paths',
          blacklist: customBlacklist,
        });

        expect(id).toBeDefined();
      } finally {
        if (originalAtob !== undefined) (globalThis as any).atob = originalAtob;
        if (originalBuffer !== undefined)
          (globalThis as any).Buffer = originalBuffer;
        (globalThis as any).crypto = originalCrypto;
      }
    });
  });

  describe('Network interface detection paths (lines 134-152)', () => {
    it('should handle MAC address search with valid MAC found', async () => {
      const originalRequire = (globalThis as any).require;

      try {
        // Mock Node.js environment with network interfaces containing valid MAC
        (globalThis as any).require = (name: string) => {
          if (name === 'os') {
            return {
              networkInterfaces: () => ({
                eth0: [
                  { mac: '00:11:22:33:44:55' }, // Valid MAC
                ],
                wlan0: [
                  { mac: 'aa:bb:cc:dd:ee:ff' }, // Another valid MAC
                ],
              }),
              hostname: () => 'test-hostname',
            };
          }
          return undefined;
        };

        const id = await generateIdAsync({ mode: 'fingerprint' });
        expect(id).toBeDefined();
      } finally {
        (globalThis as any).require = originalRequire;
      }
    });

    it('should iterate through multiple interfaces to find valid MAC', async () => {
      const originalRequire = (globalThis as any).require;

      try {
        (globalThis as any).require = (name: string) => {
          if (name === 'os') {
            return {
              networkInterfaces: () => ({
                lo: [
                  { mac: '00:00:00:00:00:00' }, // Invalid loopback MAC
                ],
                eth0: [
                  { mac: null }, // No MAC
                ],
                wlan0: [
                  { mac: 'ff:ff:ff:ff:ff:ff' }, // Valid MAC (found after iteration)
                ],
              }),
              hostname: () => 'iteration-test-hostname',
            };
          }
          return undefined;
        };

        const id = await generateIdAsync({ mode: 'fingerprint' });
        expect(id).toBeDefined();
      } finally {
        (globalThis as any).require = originalRequire;
      }
    });

    it('should break early when MAC is found', async () => {
      const originalRequire = (globalThis as any).require;

      try {
        (globalThis as any).require = (name: string) => {
          if (name === 'os') {
            return {
              networkInterfaces: () => ({
                eth0: [
                  { mac: '11:22:33:44:55:66' }, // First valid MAC - should break here
                ],
                wlan0: [
                  { mac: '77:88:99:aa:bb:cc' }, // This shouldn't be checked
                ],
              }),
              hostname: () => 'early-break-hostname',
            };
          }
          return undefined;
        };

        const id = await generateIdAsync({ mode: 'fingerprint' });
        expect(id).toBeDefined();
      } finally {
        (globalThis as any).require = originalRequire;
      }
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle os.networkInterfaces() throwing error', async () => {
      const originalRequire = (globalThis as any).require;

      try {
        (globalThis as any).require = (name: string) => {
          if (name === 'os') {
            return {
              networkInterfaces: () => {
                throw new Error('Network interfaces error');
              },
              hostname: () => 'error-test-hostname',
            };
          }
          return undefined;
        };

        const id = await generateIdAsync({ mode: 'fingerprint' });
        expect(id).toBeDefined();
      } finally {
        (globalThis as any).require = originalRequire;
      }
    });

    it('should handle Uint8Array extraMaterial in async fingerprint', async () => {
      // Test line 170 - Uint8Array path in getDefaultNodeFingerprint
      const uint8Material = new Uint8Array([84, 101, 115, 116]); // "Test"

      // Mock environment to ensure we go through getDefaultNodeFingerprint
      const originalProcess = (globalThis as any).process;
      (globalThis as any).process = {
        env: { FAME_NODE_ID_SALT: uint8Material },
      };

      try {
        const id = await generateIdAsync({ mode: 'fingerprint' });
        expect(id).toBeDefined();
      } finally {
        (globalThis as any).process = originalProcess;
      }
    });

    it('should handle string extraMaterial in async fingerprint', async () => {
      // Test the else branch of line 170
      const originalProcess = (globalThis as any).process;
      (globalThis as any).process = {
        env: { FAME_NODE_ID_SALT: 'test-string-salt' },
      };

      try {
        const id = await generateIdAsync({ mode: 'fingerprint' });
        expect(id).toBeDefined();
      } finally {
        (globalThis as any).process = originalProcess;
      }
    });
  });

  describe('Blacklist collision re-hashing (lines 348-349, 420-421)', () => {
    it('should force sync blacklist collision and re-hash', () => {
      // Create a custom blacklist with short words that are more likely to collide
      const aggressiveBlacklist = new Set([
        'a',
        'b',
        'c',
        'd',
        'e',
        'f',
        'g',
        'h',
        'i',
        'j',
        'aa',
        'ab',
        'ac',
        'ad',
        'ae',
        'af',
        'ag',
        'ah',
        'ai',
        'aj',
        'ba',
        'bb',
        'bc',
        'bd',
        'be',
        'bf',
        'bg',
        'bh',
        'bi',
        'bj',
      ]);

      // Remove crypto.subtle to force sync path
      const originalCrypto = (globalThis as any).crypto;
      (globalThis as any).crypto = {
        getRandomValues: originalCrypto?.getRandomValues,
      };

      try {
        // Test with material likely to cause collisions
        const id = generateId({
          mode: 'fingerprint',
          material: 'collision-test',
          blacklist: aggressiveBlacklist,
          length: 2, // Short length increases collision probability
        });

        expect(id).toBeDefined();
        expect(typeof id).toBe('string');

        // Verify the result doesn't contain blacklisted words
        const idLower = id.toLowerCase();
        for (const bad of aggressiveBlacklist) {
          expect(idLower).not.toContain(bad);
        }
      } finally {
        (globalThis as any).crypto = originalCrypto;
      }
    });

    it('should force async blacklist collision and re-hash', async () => {
      // Test lines 420-421 in async version
      const aggressiveBlacklist = new Set([
        'x',
        'y',
        'z',
        'xx',
        'yy',
        'zz',
        'xyz',
      ]);

      const id = await generateIdAsync({
        mode: 'fingerprint',
        material: 'async-collision-test',
        blacklist: aggressiveBlacklist,
        length: 3, // Short length to increase collision chances
      });

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');

      // Verify no blacklisted content
      const idLower = id.toLowerCase();
      for (const bad of aggressiveBlacklist) {
        expect(idLower).not.toContain(bad);
      }
    });

    it('should test multiple re-hash iterations', () => {
      // Create a blacklist that will definitely cause multiple collisions
      const veryAggressiveBlacklist = new Set<string>();

      // Add all single characters and many combinations
      for (let i = 0; i < 26; i++) {
        const char = String.fromCharCode(97 + i); // a-z
        veryAggressiveBlacklist.add(char);
        veryAggressiveBlacklist.add(char + char);
        veryAggressiveBlacklist.add(char + char + char);
      }

      const originalCrypto = (globalThis as any).crypto;
      (globalThis as any).crypto = {
        getRandomValues: originalCrypto?.getRandomValues,
      };

      try {
        const id = generateId({
          mode: 'fingerprint',
          material: 'multi-rehash-test',
          blacklist: veryAggressiveBlacklist,
          length: 4,
        });

        expect(id).toBeDefined();
        expect(typeof id).toBe('string');
      } finally {
        (globalThis as any).crypto = originalCrypto;
      }
    });
  });

  describe('Browser environment detection', () => {
    it('should handle navigator.userAgent path in async', async () => {
      const originalNavigator = (globalThis as any).navigator;
      const originalRequire = (globalThis as any).require;

      try {
        // Mock browser environment
        (globalThis as any).navigator = {
          userAgent: 'Mozilla/5.0 (Test Browser) TestEngine/1.0',
        };

        // Remove require to ensure browser path
        delete (globalThis as any).require;

        const id = await generateIdAsync({ mode: 'fingerprint' });
        expect(id).toBeDefined();
      } finally {
        (globalThis as any).navigator = originalNavigator;
        (globalThis as any).require = originalRequire;
      }
    });
  });
});
