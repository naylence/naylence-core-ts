import { FameAddress, generateId, generateIdAsync } from "../index";

describe("naylence-core-ts", () => {
  describe("FameAddress", () => {
    it("should create a valid FameAddress", () => {
      const address = new FameAddress("test@/path");
      expect(address.toString()).toBe("test@/path");
    });

    it("should validate participant names", () => {
      expect(() => new FameAddress("invalid@participant@/path")).toThrow();
      expect(() => new FameAddress("123-abc_TEST@/path")).not.toThrow();
    });

    it("should support host-only format", () => {
      const address = new FameAddress("service@host.domain");
      expect(address.toString()).toBe("service@host.domain");
    });

    it("should support host and path format", () => {
      const address = new FameAddress("service@host.domain/api/v1");
      expect(address.toString()).toBe("service@host.domain/api/v1");
    });

    it("should support wildcard hosts", () => {
      const address = new FameAddress("service@*.domain.com");
      expect(address.toString()).toBe("service@*.domain.com");
    });

    it("should reject wildcards in paths", () => {
      expect(() => new FameAddress("service@host/*/path")).toThrow();
    });
  });

  describe("ID Generation", () => {
    it("should generate random IDs", () => {
      const id1 = generateId();
      const id2 = generateId();
      
      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
      expect(id1).toHaveLength(16);
    });

    it("should generate async IDs", async () => {
      const id1 = await generateIdAsync();
      const id2 = await generateIdAsync();
      
      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
      expect(id1).toHaveLength(16);
    });

    it("should generate deterministic IDs from material", async () => {
      const material = "test-material";
      
      const id1 = await generateIdAsync({ mode: "fingerprint", material });
      const id2 = await generateIdAsync({ mode: "fingerprint", material });
      
      expect(id1).toBe(id2);
    });

    it("should support custom length", () => {
      const shortId = generateId({ length: 8 });
      const longId = generateId({ length: 24 });
      
      expect(shortId).toHaveLength(8);
      expect(longId).toHaveLength(24);
    });
  });
});