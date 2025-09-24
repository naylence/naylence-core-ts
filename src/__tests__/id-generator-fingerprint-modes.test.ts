import { generateIdAsync } from "../naylence/fame/core/util/id-generator";

describe("ID Generator Fingerprint Modes", () => {
  
  describe("Network interface edge cases", () => {
    it("should test inner loop break condition when MAC is found", async () => {
      const originalRequire = (globalThis as any).require;
      
      try {
        // Create a scenario where MAC is found in the inner loop and breaks
        (globalThis as any).require = (name: string) => {
          if (name === "os") {
            return {
              networkInterfaces: () => ({
                "eth0": [
                  { mac: "00:00:00:00:00:00" }, // Invalid MAC (first interface)
                  { mac: "aa:bb:cc:dd:ee:ff" }, // Valid MAC (should break here)
                ],
                "wlan0": [
                  // This interface should not be processed due to break
                  { mac: "11:22:33:44:55:66" }
                ]
              }),
              hostname: () => "inner-loop-break-test"
            };
          }
          return undefined;
        };
        
        const id = await generateIdAsync({ mode: "fingerprint" });
        expect(id).toBeDefined();
        expect(typeof id).toBe("string");
      } finally {
        (globalThis as any).require = originalRequire;
      }
    });

    it("should test outer loop continue when no MAC found in interface", async () => {
      const originalRequire = (globalThis as any).require;
      
      try {
        // Create multiple interfaces where some have no valid MACs
        (globalThis as any).require = (name: string) => {
          if (name === "os") {
            return {
              networkInterfaces: () => ({
                "lo": [
                  { mac: "00:00:00:00:00:00" }, // Invalid MAC
                  { mac: null }, // No MAC
                ],
                "eth0": [
                  { mac: "00:00:00:00:00:00" }, // Invalid MAC
                ],
                "wlan0": [
                  { mac: "ff:ee:dd:cc:bb:aa" }, // Valid MAC (found after continuing)
                ]
              }),
              hostname: () => "outer-loop-continue-test"
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

    it("should test scenario where require function exists but os throws", async () => {
      const originalRequire = (globalThis as any).require;
      
      try {
        // Make the os module throw an error to trigger the catch block (line 158)
        (globalThis as any).require = (name: string) => {
          if (name === "os") {
            throw new Error("OS module access denied");
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

  describe("Async blacklist re-hashing (lines 420-421)", () => {
    it("should create deterministic collision to force async re-hash", async () => {
      // Create a specific blacklist that might cause a collision but is still solvable
      const specificBlacklist = new Set([
        // Add specific short patterns that might appear but leave room for valid IDs
        "aa", "bb", "cc", "dd", "ee"
      ]);
      
      // Use a very specific material and reasonable length
      const id = await generateIdAsync({ 
        mode: "fingerprint", 
        material: "specific-collision-material",
        blacklist: specificBlacklist,
        length: 8  // Reasonable length to avoid impossible constraints
      });
      
      expect(id).toBeDefined();
      expect(typeof id).toBe("string");
      
      // The result should not contain any blacklisted substrings
      for (const bad of specificBlacklist) {
        expect(id.toLowerCase()).not.toContain(bad);
      }
    });

    it("should test multiple async re-hash iterations with moderate blacklist", async () => {
      // Create a moderate blacklist to force some re-hashing but keep it solvable
      const moderateBlacklist = new Set([
        "test", "bad", "evil", "no", "stop"
      ]);
      
      const id = await generateIdAsync({ 
        mode: "fingerprint", 
        material: "force-multiple-rehash",
        blacklist: moderateBlacklist,
        length: 12  // Reasonable length
      });
      
      expect(id).toBeDefined();
      expect(typeof id).toBe("string");
      expect(id.length).toBeLessThanOrEqual(12);  // Length can be shorter due to base62 encoding
      expect(id.length).toBeGreaterThan(0);
      
      // Verify no blacklisted content
      for (const bad of moderateBlacklist) {
        expect(id.toLowerCase()).not.toContain(bad);
      }
    });
  });

  describe("Browser environment edge cases", () => {
    it("should test browser path with very long user agent", async () => {
      const originalNavigator = (globalThis as any).navigator;
      const originalRequire = (globalThis as any).require;
      
      try {
        // Create a very long user agent string to test string handling
        const longUserAgent = "Mozilla/5.0 ".repeat(100) + "TestBrowser/1.0";
        
        (globalThis as any).navigator = {
          userAgent: longUserAgent
        };
        
        // Remove require to ensure browser path
        delete (globalThis as any).require;
        
        const id = await generateIdAsync({ mode: "fingerprint" });
        expect(id).toBeDefined();
        expect(typeof id).toBe("string");
      } finally {
        (globalThis as any).navigator = originalNavigator;
        (globalThis as any).require = originalRequire;
      }
    });

    it("should test browser path with special characters in user agent", async () => {
      const originalNavigator = (globalThis as any).navigator;
      const originalRequire = (globalThis as any).require;
      
      try {
        (globalThis as any).navigator = {
          userAgent: "Mozilla/5.0 (Special; Characters: äöü; 日本語) TestBrowser/1.0"
        };
        
        delete (globalThis as any).require;
        
        const id = await generateIdAsync({ mode: "fingerprint" });
        expect(id).toBeDefined();
      } finally {
        (globalThis as any).navigator = originalNavigator;
        (globalThis as any).require = originalRequire;
      }
    });
  });

  describe("Environment variable edge cases", () => {
    it("should test with complex environment salt scenarios", async () => {
      const originalProcess = (globalThis as any).process;
      
      try {
        // Test with complex environment variable
        (globalThis as any).process = { 
          env: { 
            FAME_NODE_ID_SALT: "complex-salt-with-special-chars-äöü-123!@#" 
          } 
        };
        
        const id = await generateIdAsync({ mode: "fingerprint" });
        expect(id).toBeDefined();
      } finally {
        (globalThis as any).process = originalProcess;
      }
    });

    it("should test with binary data in environment salt", async () => {
      const originalProcess = (globalThis as any).process;
      
      try {
        // Test with binary-like data in environment
        const binaryData = new Uint8Array([0, 1, 2, 3, 255, 254, 253]);
        (globalThis as any).process = { 
          env: { 
            FAME_NODE_ID_SALT: binaryData 
          } 
        };
        
        const id = await generateIdAsync({ mode: "fingerprint" });
        expect(id).toBeDefined();
      } finally {
        (globalThis as any).process = originalProcess;
      }
    });
  });
});