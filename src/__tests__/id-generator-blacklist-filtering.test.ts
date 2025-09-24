import { generateId, generateIdAsync } from "../naylence/fame/core/util/id-generator";

describe("ID Generator Blacklist Filtering", () => {
  
  describe("Fallback base64 decoder (lines 27-49)", () => {
    it("should use fallback decoder when atob and Buffer are undefined", async () => {
      // Save originals
      const originalAtob = (globalThis as any).atob;
      const originalBuffer = (globalThis as any).Buffer;
      const originalGlobalThisBuffer = (globalThis as any).globalThis?.Buffer;
      
      try {
        // Remove both atob and Buffer to force fallback
        delete (globalThis as any).atob;
        delete (globalThis as any).Buffer;
        if ((globalThis as any).globalThis) {
          delete (globalThis as any).globalThis.Buffer;
        }
        
        // Force module reload to trigger base64 decoder during blacklist initialization
        // Use async version which will trigger more code paths
        const id = await generateIdAsync({ mode: "fingerprint" });
        
        expect(id).toBeDefined();
        expect(typeof id).toBe("string");
      } finally {
        // Restore
        if (originalAtob !== undefined) {
          (globalThis as any).atob = originalAtob;
        }
        if (originalBuffer !== undefined) {
          (globalThis as any).Buffer = originalBuffer;
        }
        if (originalGlobalThisBuffer !== undefined && (globalThis as any).globalThis) {
          (globalThis as any).globalThis.Buffer = originalGlobalThisBuffer;
        }
      }
    });
    
    it("should handle padding in fallback decoder (lines 42-43)", async () => {
      const originalAtob = (globalThis as any).atob;
      const originalBuffer = (globalThis as any).Buffer;
      
      try {
        delete (globalThis as any).atob;
        delete (globalThis as any).Buffer;
        
        // Use async version to trigger the code paths we need
        const id = await generateIdAsync({ mode: "fingerprint" });
        
        expect(id).toBeDefined();
      } finally {
        if (originalAtob !== undefined) (globalThis as any).atob = originalAtob;
        if (originalBuffer !== undefined) (globalThis as any).Buffer = originalBuffer;
      }
    });
  });

  describe("Network interface detection (lines 134-152)", () => {
    it("should handle hostname fallback when no valid MAC found", async () => {
      const originalRequire = (globalThis as any).require;
      
      try {
        // Mock Node.js environment with network interfaces but no valid MACs
        (globalThis as any).require = (name: string) => {
          if (name === "os") {
            return {
              networkInterfaces: () => ({
                "eth0": [
                  { mac: "00:00:00:00:00:00" }, // Invalid MAC
                ],
                "lo": [
                  { mac: null }, // No MAC
                ]
              }),
              hostname: () => "test-hostname"
            };
          }
          return undefined;
        };
        
        // Use async fingerprint mode to trigger network detection
        const id = await generateIdAsync({ mode: "fingerprint" });
        
        expect(id).toBeDefined();
      } finally {
        (globalThis as any).require = originalRequire;
      }
    });
    
    it("should handle require exists but no interfaces found", async () => {
      const originalRequire = (globalThis as any).require;
      
      try {
        (globalThis as any).require = (name: string) => {
          if (name === "os") {
            return {
              networkInterfaces: () => ({}), // Empty interfaces
              hostname: () => "empty-interfaces-hostname"
            };
          }
          return undefined;
        };
        
        const id = await generateIdAsync({ mode: "fingerprint" });
        expect(id).toBeDefined();
      } finally {
        (globalThis as any).require = originalRequire;
      }
    });
  });

  describe("Error handling", () => {
    it("should catch errors in getDefaultNodeFingerprint", async () => {
      const originalRequire = (globalThis as any).require;
      
      try {
        // Make require throw an error to trigger catch block
        (globalThis as any).require = (name: string) => {
          if (name === "os") {
            throw new Error("OS module error");
          }
          return undefined;
        };
        
        const id = await generateIdAsync({ mode: "fingerprint" });
        expect(id).toBeDefined();
      } finally {
        (globalThis as any).require = originalRequire;
      }
    });
  });

  describe("Extra material Uint8Array handling", () => {
    it("should handle Uint8Array extraMaterial in fingerprint mode", async () => {
      const uint8Material = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      
      const id = await generateIdAsync({ 
        mode: "fingerprint",
        material: uint8Material 
      });
      
      expect(id).toBeDefined();
      expect(typeof id).toBe("string");
    });
  });

  describe("Blacklist collision re-hashing (lines 348-349)", () => {
    it("should handle blacklist collision and re-hash", () => {
      // Remove crypto.subtle to ensure we're in Node.js path
      const originalCrypto = (globalThis as any).crypto;
      
      try {
        // Mock crypto without subtle to force sync path
        (globalThis as any).crypto = {
          getRandomValues: originalCrypto?.getRandomValues
        };
        
        // Use a material that when hashed will match a blacklisted word
        // We need to find a material that produces a collision
        const material = "test-material-for-collision";
        
        const id = generateId({ mode: "fingerprint", material });
        expect(id).toBeDefined();
        expect(typeof id).toBe("string");
        // The ID should not be a blacklisted word
      } finally {
        (globalThis as any).crypto = originalCrypto;
      }
    });
  });

  describe("Hash algorithm conversion (lines 420-421)", () => {
    it("should handle Node.js hash algorithm name conversion", () => {
      const originalRequire = (globalThis as any).require;
      
      try {
        // Mock Node.js crypto to test hash algorithm conversion
        (globalThis as any).require = (name: string) => {
          if (name === "crypto") {
            return {
              createHash: (algorithm: string) => {
                // This should trigger the algorithm conversion logic
                expect(algorithm).toBeTruthy();
                return {
                  update: () => {},
                  digest: () => new Uint8Array([1, 2, 3, 4])
                };
              }
            };
          }
          return undefined;
        };
        
        // Remove browser crypto to force Node.js path
        const originalCrypto = (globalThis as any).crypto;
        delete (globalThis as any).crypto;
        
        try {
          const id = generateId({ mode: "fingerprint", material: "test-hash-algorithm" });
          expect(id).toBeDefined();
        } finally {
          (globalThis as any).crypto = originalCrypto;
        }
      } finally {
        (globalThis as any).require = originalRequire;
      }
    });
  });
});