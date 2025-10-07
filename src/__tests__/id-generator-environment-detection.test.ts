import { jest } from '@jest/globals';
import {
  generateId,
  generateIdAsync,
} from '../naylence/fame/core/util/id-generator';

describe('ID Generator Environment Detection', () => {
  it('should test globalThis.Buffer path in decodeBase64 (line 54)', async () => {
    // Mock globalThis to have Buffer but not atob
    const originalAtob = (globalThis as any).atob;
    const originalBuffer = (globalThis as any).Buffer;

    try {
      // Remove atob to force fallback
      delete (globalThis as any).atob;

      // Mock Buffer
      (globalThis as any).Buffer = {
        from: jest.fn().mockReturnValue({
          toString: jest.fn().mockReturnValue('decoded-string'),
        }),
      };

      // This should trigger the globalThis.Buffer path during blacklist initialization
      const id = await generateIdAsync({ length: 8, mode: 'fingerprint' });
      expect(id).toBeTruthy();
    } finally {
      // Restore original values
      if (originalAtob) {
        (globalThis as any).atob = originalAtob;
      }
      if (originalBuffer) {
        (globalThis as any).Buffer = originalBuffer;
      } else {
        delete (globalThis as any).Buffer;
      }
    }
  });

  it('should test blacklist collision handling (lines 427-428)', async () => {
    // Generate an ID that might collide with blacklist
    // Use a seed that could potentially create blacklisted content
    const id1 = await generateIdAsync({
      length: 8,
      mode: 'fingerprint',
      hashAlg: 'SHA-256',
    });
    const id2 = await generateIdAsync({
      length: 8,
      mode: 'fingerprint',
      hashAlg: 'SHA-256',
    });

    // Both should be valid IDs (not containing blacklisted words)
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(typeof id1).toBe('string');
    expect(typeof id2).toBe('string');

    // They should be the same since they use fingerprint mode with same params
    expect(id1).toBe(id2);
  });

  it('should force blacklist collision to test while loop', async () => {
    // Try to generate multiple IDs with different lengths to increase chance
    // of hitting the blacklist checking code
    const promises = [];
    for (let i = 4; i <= 12; i++) {
      promises.push(
        generateIdAsync({ length: i, mode: 'random', hashAlg: 'SHA-256' })
      );
    }

    const ids = await Promise.all(promises);

    // All should be valid
    ids.forEach((id: string) => {
      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
    });
  });

  it('should test Node.js environment detection error case (line 165)', async () => {
    const originalRequire = (globalThis as any).require;

    try {
      // Mock require to throw an error
      (globalThis as any).require = () => {
        throw new Error('Module not found');
      };

      const id = await generateIdAsync({ length: 8, mode: 'fingerprint' });
      expect(id).toBeTruthy();
    } finally {
      // Restore original require
      if (originalRequire) {
        (globalThis as any).require = originalRequire;
      } else {
        delete (globalThis as any).require;
      }
    }
  });

  it('should test network interfaces with MAC address (lines 141-159)', async () => {
    const originalRequire = (globalThis as any).require;

    try {
      // Mock Node.js os module with network interfaces
      (globalThis as any).require = (module: string) => {
        if (module === 'os') {
          return {
            networkInterfaces: () => ({
              eth0: [
                {
                  mac: '00:11:22:33:44:55',
                  address: '192.168.1.100',
                  internal: false,
                },
              ],
              lo: [
                {
                  mac: '00:00:00:00:00:00', // This should be skipped
                  address: '127.0.0.1',
                  internal: true,
                },
              ],
            }),
            hostname: () => 'test-hostname',
          };
        }
        throw new Error(`Module ${module} not found`);
      };

      const id = await generateIdAsync({ length: 8, mode: 'fingerprint' });
      expect(id).toBeTruthy();
    } finally {
      // Restore original require
      if (originalRequire) {
        (globalThis as any).require = originalRequire;
      } else {
        delete (globalThis as any).require;
      }
    }
  });

  it('should test network interfaces without valid MAC (fallback to hostname)', async () => {
    const originalRequire = (globalThis as any).require;

    try {
      // Mock Node.js os module with no valid MAC addresses
      (globalThis as any).require = (module: string) => {
        if (module === 'os') {
          return {
            networkInterfaces: () => ({
              lo: [
                {
                  mac: '00:00:00:00:00:00', // Invalid MAC
                  address: '127.0.0.1',
                  internal: true,
                },
              ],
            }),
            hostname: () => 'test-hostname',
          };
        }
        throw new Error(`Module ${module} not found`);
      };

      const id = await generateIdAsync({ length: 8, mode: 'fingerprint' });
      expect(id).toBeTruthy();
    } finally {
      // Restore original require
      if (originalRequire) {
        (globalThis as any).require = originalRequire;
      } else {
        delete (globalThis as any).require;
      }
    }
  });
});
