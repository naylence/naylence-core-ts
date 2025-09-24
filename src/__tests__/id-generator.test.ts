import {
  generateId,
  generateIdAsync,
  GenerateIdOptions,
  BytesLike
} from "../naylence/fame/core/util/id-generator";

describe("ID Generator", () => {
  describe("generateId", () => {
    it("should generate unique ids with default options", () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe("string");
      expect(typeof id2).toBe("string");
      expect(id1.length).toBeGreaterThan(0);
      expect(id2.length).toBeGreaterThan(0);
    });

    it("should generate ids with custom length", () => {
      const shortId = generateId({ length: 8 });
      const longId = generateId({ length: 32 });
      expect(shortId.length).toBe(8);
      expect(longId.length).toBe(32);
    });

    it("should use random mode by default", () => {
      const id = generateId({ mode: "random" });
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });

    it("should throw error for fingerprint mode in browser environment", () => {
      expect(() => {
        generateId({ mode: "fingerprint", material: "test-material" });
      }).toThrow("Browser environment requires async ID generation - use generateIdAsync instead");
    });

    it("should throw error for different materials in browser environment", () => {
      expect(() => {
        generateId({ mode: "fingerprint", material: "material1" });
      }).toThrow("Browser environment requires async ID generation - use generateIdAsync instead");
    });

    it("should throw error for Uint8Array material in browser environment", () => {
      expect(() => {
        const material = new Uint8Array([1, 2, 3, 4]);
        generateId({ mode: "fingerprint", material });
      }).toThrow("Browser environment requires async ID generation - use generateIdAsync instead");
    });

    it("should throw error for array of materials in browser environment", () => {
      expect(() => {
        const materials: BytesLike[] = ["part1", "part2", new Uint8Array([1, 2])];
        generateId({ mode: "fingerprint", material: materials });
      }).toThrow("Browser environment requires async ID generation - use generateIdAsync instead");
    });

    it("should respect blacklist when provided", () => {
      const blacklist = new Set(["blacklisted-id"]);
      const id = generateId({ blacklist });
      expect(id).not.toBe("blacklisted-id");
      expect(typeof id).toBe("string");
    });

    it("should throw error for custom hash algorithm in browser environment", () => {
      expect(() => {
        generateId({ 
          mode: "fingerprint", 
          material: "test",
          hashAlg: "sha256" 
        });
      }).toThrow("Browser environment requires async ID generation - use generateIdAsync instead");
    });

    it("should handle empty options object", () => {
      const id = generateId({});
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });
  });

  describe("generateIdAsync", () => {
    it("should generate unique ids asynchronously", async () => {
      const id1Promise = generateIdAsync();
      const id2Promise = generateIdAsync();
      const [id1, id2] = await Promise.all([id1Promise, id2Promise]);
      
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe("string");
      expect(typeof id2).toBe("string");
      expect(id1.length).toBeGreaterThan(0);
      expect(id2.length).toBeGreaterThan(0);
    });

    it("should generate async ids with custom length", async () => {
      const id = await generateIdAsync({ length: 24 });
      expect(id.length).toBe(24);
    });

    it("should handle fingerprint mode asynchronously", async () => {
      const material = "async-test-material";
      const id1 = await generateIdAsync({ mode: "fingerprint", material });
      const id2 = await generateIdAsync({ mode: "fingerprint", material });
      expect(id1).toBe(id2); // Same material should produce same fingerprint
    });

    it("should generate multiple async ids concurrently", async () => {
      const promises = Array.from({ length: 5 }, () => generateIdAsync());
      const ids = await Promise.all(promises);
      
      // All should be unique
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);
      
      // All should be strings
      ids.forEach(id => {
        expect(typeof id).toBe("string");
        expect(id.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Edge cases and error handling", () => {
    it("should handle very small lengths", () => {
      const id = generateId({ length: 1 });
      expect(id.length).toBe(1);
    });

    it("should handle very large lengths", () => {
      const id = generateId({ length: 100 });
      expect(id.length).toBe(100);
    });

    it("should handle complex blacklist scenarios", () => {
      // Generate some ids to potentially blacklist
      const existingIds = Array.from({ length: 10 }, () => generateId());
      const blacklist = new Set(existingIds);
      
      const newId = generateId({ blacklist });
      expect(blacklist.has(newId)).toBe(false);
    });

    it("should throw error for different hash algorithms in browser environment", () => {
      expect(() => {
        generateId({ 
          mode: "fingerprint", 
          material: "test-material", 
          hashAlg: "sha1" 
        });
      }).toThrow("Browser environment requires async ID generation - use generateIdAsync instead");
    });

    it("should throw error for mixed material types in browser environment", () => {
      expect(() => {
        const mixedMaterials: BytesLike[] = [
          "string-material",
          new Uint8Array([65, 66, 67]), // ABC
          "another-string"
        ];
        
        generateId({ 
          mode: "fingerprint", 
          material: mixedMaterials 
        });
      }).toThrow("Browser environment requires async ID generation - use generateIdAsync instead");
    });
  });

  describe("Performance and consistency", () => {
    it("should generate many IDs quickly", () => {
      const startTime = Date.now();
      const ids = Array.from({ length: 1000 }, () => generateId());
      const endTime = Date.now();
      
      // Should complete in reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      
      // All should be unique (for random mode)
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(1000);
    });

    it("should handle concurrent async generation", async () => {
      const concurrentCount = 50;
      const promises = Array.from({ length: concurrentCount }, () => generateIdAsync());
      
      const startTime = Date.now();
      const ids = await Promise.all(promises);
      const endTime = Date.now();
      
      // Should complete in reasonable time
      expect(endTime - startTime).toBeLessThan(2000);
      
      // All should be unique
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(concurrentCount);
    });

    it("should throw error for fingerprint consistency test in browser environment", () => {
      expect(() => {
        generateId({ mode: "fingerprint", material: "consistency-test" });
      }).toThrow("Browser environment requires async ID generation - use generateIdAsync instead");
    });
  });
});