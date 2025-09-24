/**
 * Dedicated test file for difficult-to-reach lines in id-generator
 * This file uses module mocking to ensure coverage of initialization code
 */

describe("ID Generator Initialization", () => {
  
  beforeEach(() => {
    // Clear all module cache to ensure fresh imports
    jest.resetModules();
  });
  
  it("should trigger Buffer path during module initialization", async () => {
    // Mock environment before module import
    const originalAtob = (globalThis as any).atob;
    const originalBuffer = (globalThis as any).Buffer;
    
    try {
      // Set up the specific environment we want to test
      delete (globalThis as any).atob;
      (globalThis as any).Buffer = {
        from: jest.fn().mockReturnValue({
          toString: jest.fn().mockReturnValue("test")
        })
      };
      
      // Now import the module fresh - this should execute initialization with our mocked Buffer
      const { generateIdAsync } = await import("../naylence/fame/core/util/id-generator");
      
      const id = await generateIdAsync({ length: 8, mode: "random" });
      expect(id).toBeTruthy();
      
      // Verify Buffer.from was called during initialization
      expect((globalThis as any).Buffer.from).toHaveBeenCalled();
      
    } finally {
      // Restore environment
      if (originalAtob) (globalThis as any).atob = originalAtob;
      if (originalBuffer) (globalThis as any).Buffer = originalBuffer;
      else delete (globalThis as any).Buffer;
    }
  });
  
  it("should trigger Node.js environment detection during initialization", async () => {
    const originalRequire = (globalThis as any).require;
    const originalNavigator = (globalThis as any).navigator;
    
    try {
      // Set up Node.js environment
      delete (globalThis as any).navigator;
      (globalThis as any).require = jest.fn((module: string) => {
        if (module === "os") {
          return {
            networkInterfaces: () => ({
              "eth0": [{
                mac: "00:11:22:33:44:55",
                address: "192.168.1.100",
                internal: false 
              }]
            }),
            hostname: () => "test-host"
          };
        }
        throw new Error(`Module ${module} not found`);
      });
      
      // Import fresh module
      const { generateIdAsync } = await import("../naylence/fame/core/util/id-generator");
      
      const id = await generateIdAsync({ length: 8, mode: "fingerprint" });
      expect(id).toBeTruthy();
      
      // Verify require was called
      expect((globalThis as any).require).toHaveBeenCalledWith("os");
      
    } finally {
      // Restore environment
      if (originalRequire) (globalThis as any).require = originalRequire;
      else delete (globalThis as any).require;
      if (originalNavigator) (globalThis as any).navigator = originalNavigator;
    }
  });
  
  it("should trigger error fallback during Node.js detection", async () => {
    const originalRequire = (globalThis as any).require;
    const originalNavigator = (globalThis as any).navigator;
    
    try {
      // Set up environment that will throw during require
      delete (globalThis as any).navigator;
      (globalThis as any).require = jest.fn(() => {
        throw new Error("Module loading error");
      });
      
      // Import fresh module - should hit the catch block
      const { generateIdAsync } = await import("../naylence/fame/core/util/id-generator");
      
      const id = await generateIdAsync({ length: 8, mode: "fingerprint" });
      expect(id).toBeTruthy();
      
    } finally {
      // Restore environment
      if (originalRequire) (globalThis as any).require = originalRequire;
      else delete (globalThis as any).require;
      if (originalNavigator) (globalThis as any).navigator = originalNavigator;
    }
  });
  
  it("should test blacklist collision scenario with specific data", async () => {
    // Import fresh module
    const { generateIdAsync } = await import("../naylence/fame/core/util/id-generator");
    
    // Try to generate an ID that might collide with blacklist
    // Using specific material that might create problematic content
    const problematicSeeds = [
      "shit",
      "damn", 
      "crap",
      "fuc",
      "ass"
    ];
    
    for (const seed of problematicSeeds) {
      const id = await generateIdAsync({ 
        length: 6, 
        mode: "fingerprint", 
        material: seed,
        hashAlg: "SHA-256"
      });
      
      expect(id).toBeTruthy();
      expect(typeof id).toBe("string");
      
      // Verify it doesn't contain blacklisted words
      const lowerCase = id.toLowerCase();
      expect(lowerCase).not.toContain("shit");
      expect(lowerCase).not.toContain("damn");
      expect(lowerCase).not.toContain("crap");
    }
  });
});