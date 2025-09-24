import {
  FameAddress,
  FameAddressSchema,
  parseAddress,
  parseAddressComponents,
  formatAddress,
  formatAddressFromComponents,
  makeFameAddress
} from "../naylence/fame/core/address/address";

describe("Address Parsing and Validation", () => {
  describe("FameAddress Class", () => {
    describe("constructor", () => {
      it("should create valid address with path-only format", () => {
        const address = new FameAddress("user@/api/v1");
        expect(address.toString()).toBe("user@/api/v1");
        expect(address.valueOf()).toBe("user@/api/v1");
      });

      it("should create valid address with host-only format", () => {
        const address = new FameAddress("service@example.com");
        expect(address.toString()).toBe("service@example.com");
      });

      it("should create valid address with host+path format", () => {
        const address = new FameAddress("api@server.domain.com/v1/endpoint");
        expect(address.toString()).toBe("api@server.domain.com/v1/endpoint");
      });

      it("should create valid address with wildcard host", () => {
        const address = new FameAddress("pool@*.fame.fabric");
        expect(address.toString()).toBe("pool@*.fame.fabric");
      });

      it("should throw on missing @ symbol", () => {
        expect(() => new FameAddress("invalid-address")).toThrow("Missing '@' in address");
      });

      it("should throw on empty location", () => {
        expect(() => new FameAddress("user@")).toThrow("Location part cannot be empty");
      });
    });

    describe("static create", () => {
      it("should create FameAddress instance", () => {
        const address = FameAddress.create("test@example.com");
        expect(address).toBeInstanceOf(FameAddress);
        expect(address.toString()).toBe("test@example.com");
      });
    });
  });

  describe("Participant Validation", () => {
    it("should accept valid participant names", () => {
      expect(() => new FameAddress("user@/path")).not.toThrow();
      expect(() => new FameAddress("User123@/path")).not.toThrow();
      expect(() => new FameAddress("test-service_v2@/path")).not.toThrow();
      expect(() => new FameAddress("ABC-123_test@/path")).not.toThrow();
    });

    it("should reject invalid participant names", () => {
      expect(() => new FameAddress("user.name@/path")).toThrow("Participant must match [A-Z a-z 0-9 _ -]+");
      expect(() => new FameAddress("user@host@/path")).toThrow("Participant must match [A-Z a-z 0-9 _ -]+");
      expect(() => new FameAddress("user space@/path")).toThrow("Participant must match [A-Z a-z 0-9 _ -]+");
      expect(() => new FameAddress("user#@/path")).toThrow("Participant must match [A-Z a-z 0-9 _ -]+");
      expect(() => new FameAddress("user/name@/path")).toThrow("Participant must match [A-Z a-z 0-9 _ -]+");
    });
  });

  describe("Host Validation", () => {
    it("should accept valid host names", () => {
      expect(() => new FameAddress("user@example.com")).not.toThrow();
      expect(() => new FameAddress("user@sub.domain.com")).not.toThrow();
      expect(() => new FameAddress("user@api-server.domain-name.org")).not.toThrow();
      expect(() => new FameAddress("user@localhost")).not.toThrow();
      expect(() => new FameAddress("user@server123.test")).not.toThrow();
    });

    it("should accept wildcard in leftmost position", () => {
      expect(() => new FameAddress("user@*.example.com")).not.toThrow();
      expect(() => new FameAddress("pool@*.fame.fabric")).not.toThrow();
    });

    it("should reject wildcard in non-leftmost position", () => {
      expect(() => new FameAddress("user@example.*.com")).toThrow("Wildcard '*' must be leftmost segment");
      expect(() => new FameAddress("user@example.com.*")).toThrow("Wildcard '*' must be leftmost segment");
    });

    it("should reject empty host segments", () => {
      expect(() => new FameAddress("user@.example.com")).toThrow("Empty host segment");
      expect(() => new FameAddress("user@example..com")).toThrow("Empty host segment");
      expect(() => new FameAddress("user@example.com.")).toThrow("Empty host segment");
    });

    it("should reject invalid host characters", () => {
      expect(() => new FameAddress("user@exam_ple.com")).toThrow("Bad host segment");
      // When there are multiple @, lastIndexOf('@') means participant becomes "user@example.c"
      expect(() => new FameAddress("user@example.c@m")).toThrow("Participant must match");
      // Test a host with invalid characters that doesn't contain '/'
      expect(() => new FameAddress("user@host-with-@invalid")).toThrow("Participant must match");
    });
  });

  describe("Path Validation", () => {
    it("should accept valid path formats", () => {
      expect(() => new FameAddress("user@/path")).not.toThrow();
      expect(() => new FameAddress("user@/")).not.toThrow();
      expect(() => new FameAddress("user@/api/v1")).not.toThrow();
      expect(() => new FameAddress("user@/api/v1/users/123")).not.toThrow();
      expect(() => new FameAddress("user@/service-api/v2.0")).not.toThrow();
      expect(() => new FameAddress("user@/test_path")).not.toThrow();
    });

    it("should accept path with host+path format", () => {
      expect(() => new FameAddress("user@example.com/api")).not.toThrow();
      expect(() => new FameAddress("user@api.server.com/v1/endpoint")).not.toThrow();
      expect(() => new FameAddress("user@example.com/")).not.toThrow();
    });

    it("should reject wildcards in paths", () => {
      expect(() => new FameAddress("user@/api/*/endpoint")).toThrow("Wildcards not allowed in path segments");
      expect(() => new FameAddress("user@/*/path")).toThrow("Wildcards not allowed in path segments");
      expect(() => new FameAddress("user@example.com/*/api")).toThrow("Wildcards not allowed in path segments");
    });

    it("should reject invalid path characters", () => {
      // When @ appears in what looks like path, participant parsing happens first
      expect(() => new FameAddress("user@/api@endpoint")).toThrow("Participant must match");
      expect(() => new FameAddress("user@/api space")).toThrow("Bad segment");
      expect(() => new FameAddress("user@example.com/api#endpoint")).toThrow("Bad segment");
    });
  });

  describe("parseAddress Function", () => {
    it("should parse path-only addresses", () => {
      const [name, location] = parseAddress("user@/api/v1");
      expect(name).toBe("user");
      expect(location).toBe("/api/v1");
    });

    it("should parse host-only addresses", () => {
      const [name, location] = parseAddress("service@example.com");
      expect(name).toBe("service");
      expect(location).toBe("example.com");
    });

    it("should parse host+path addresses", () => {
      const [name, location] = parseAddress("api@server.com/v1");
      expect(name).toBe("api");
      expect(location).toBe("server.com/v1");
    });

    it("should parse wildcard host addresses", () => {
      const [name, location] = parseAddress("pool@*.fame.fabric");
      expect(name).toBe("pool");
      expect(location).toBe("*.fame.fabric");
    });

    it("should handle multiple @ symbols correctly", () => {
      // lastIndexOf('@') means participant becomes "user@host" with location "domain.com"
      // But this fails participant validation since @ is not allowed in participant
      expect(() => parseAddress("user@host@domain.com")).toThrow("Participant must match");
      // Test a case that would work - no @ in participant
      const [name, location] = parseAddress("user@example.com");
      expect(name).toBe("user");
      expect(location).toBe("example.com");
    });
  });

  describe("parseAddressComponents Function", () => {
    it("should parse path-only format into components", () => {
      const [name, host, path] = parseAddressComponents("user@/api/v1");
      expect(name).toBe("user");
      expect(host).toBeNull();
      expect(path).toBe("/api/v1");
    });

    it("should parse host-only format into components", () => {
      const [name, host, path] = parseAddressComponents("service@example.com");
      expect(name).toBe("service");
      expect(host).toBe("example.com");
      expect(path).toBeNull();
    });

    it("should parse host+path format into components", () => {
      const [name, host, path] = parseAddressComponents("api@server.com/v1");
      expect(name).toBe("api");
      expect(host).toBe("server.com");
      expect(path).toBe("/v1");
    });

    it("should handle wildcard hosts", () => {
      const [name, host, path] = parseAddressComponents("pool@*.fame.fabric");
      expect(name).toBe("pool");
      expect(host).toBe("*.fame.fabric");
      expect(path).toBeNull();
    });

    it("should handle path without leading slash in host+path format", () => {
      const [name, host, path] = parseAddressComponents("api@server.com/endpoint");
      expect(name).toBe("api");
      expect(host).toBe("server.com");
      expect(path).toBe("/endpoint");
    });
  });

  describe("formatAddress Function", () => {
    it("should format path-only addresses", () => {
      const address = formatAddress("user", "/api/v1");
      expect(address.toString()).toBe("user@/api/v1");
    });

    it("should format host-only addresses", () => {
      const address = formatAddress("service", "example.com");
      expect(address.toString()).toBe("service@example.com");
    });

    it("should format host+path addresses", () => {
      const address = formatAddress("api", "server.com/v1");
      expect(address.toString()).toBe("api@server.com/v1");
    });

    it("should format wildcard host addresses", () => {
      const address = formatAddress("pool", "*.fame.fabric");
      expect(address.toString()).toBe("pool@*.fame.fabric");
    });

    it("should validate participant in formatAddress", () => {
      expect(() => formatAddress("invalid.name", "/path")).toThrow("Participant must match");
    });

    it("should validate location in formatAddress", () => {
      // Actual error message from validatePath uses "Bad segment" not "Wildcards not allowed"
      expect(() => formatAddress("user", "/invalid*/path")).toThrow("Bad segment");
    });
  });

  describe("formatAddressFromComponents Function", () => {
    it("should format from host and path components", () => {
      const address = formatAddressFromComponents("api", "server.com", "/v1");
      expect(address.toString()).toBe("api@server.com/v1");
    });

    it("should format from host-only components", () => {
      const address = formatAddressFromComponents("service", "example.com", null);
      expect(address.toString()).toBe("service@example.com");
    });

    it("should format from path-only components", () => {
      const address = formatAddressFromComponents("user", null, "/api");
      expect(address.toString()).toBe("user@/api");
    });

    it("should handle wildcard hosts", () => {
      const address = formatAddressFromComponents("pool", "*.fame.fabric", null);
      expect(address.toString()).toBe("pool@*.fame.fabric");
    });

    it("should throw when both host and path are null", () => {
      expect(() => formatAddressFromComponents("user", null, null)).toThrow("At least one of host or path must be provided");
    });

    it("should throw when both host and path are undefined", () => {
      expect(() => formatAddressFromComponents("user", undefined, undefined)).toThrow("At least one of host or path must be provided");
    });

    it("should validate participant", () => {
      expect(() => formatAddressFromComponents("invalid.name", "host.com", null)).toThrow("Participant must match");
    });

    it("should validate host", () => {
      expect(() => formatAddressFromComponents("user", "invalid_host", null)).toThrow("Bad host segment");
    });

    it("should validate path", () => {
      // Actual error message from validatePath uses "Bad segment" not "Wildcards not allowed"
      expect(() => formatAddressFromComponents("user", null, "/invalid*/path")).toThrow("Bad segment");
    });
  });

  describe("makeFameAddress Function", () => {
    it("should create FameAddress from valid string", () => {
      const address = makeFameAddress("user@example.com/api");
      expect(address).toBeInstanceOf(FameAddress);
      expect(address.toString()).toBe("user@example.com/api");
    });

    it("should throw for invalid string", () => {
      expect(() => makeFameAddress("invalid")).toThrow("Missing '@' in address");
    });
  });

  describe("FameAddressSchema", () => {
    it("should validate valid address strings", () => {
      const result = FameAddressSchema.parse("user@example.com");
      expect(result).toBeInstanceOf(FameAddress);
      expect(result.toString()).toBe("user@example.com");
    });

    it("should reject invalid address strings", () => {
      expect(() => FameAddressSchema.parse("invalid")).toThrow();
      expect(() => FameAddressSchema.parse("user@")).toThrow();
      expect(() => FameAddressSchema.parse("invalid.participant@/path")).toThrow();
    });

    it("should handle edge cases in schema validation", () => {
      expect(() => FameAddressSchema.parse("")).toThrow();
      expect(() => FameAddressSchema.parse("user@/invalid*/path")).toThrow();
    });
  });

  describe("Edge Cases and Complex Scenarios", () => {
    it("should handle complex host names", () => {
      expect(() => new FameAddress("service@api-v2.sub-domain.example-site.org")).not.toThrow();
      expect(() => new FameAddress("service@127.0.0.1")).not.toThrow();
      expect(() => new FameAddress("service@localhost.localdomain")).not.toThrow();
    });

    it("should handle complex path structures", () => {
      expect(() => new FameAddress("api@example.com/v1/users/123/profile")).not.toThrow();
      expect(() => new FameAddress("service@/api/v2.1/endpoint-name/action_type")).not.toThrow();
    });

    it("should handle multiple edge cases in validation", () => {
      // Empty path segments should not cause issues
      expect(() => new FameAddress("user@example.com/")).not.toThrow();
      
      // Single character components
      expect(() => new FameAddress("a@b.c")).not.toThrow();
      expect(() => new FameAddress("x@/y")).not.toThrow();
    });

    it("should round-trip parse and format operations", () => {
      const originalAddresses = [
        "user@/api/v1",
        "service@example.com",
        "api@server.com/endpoint",
        "pool@*.fame.fabric"
      ];

      originalAddresses.forEach(original => {
        const [name, location] = parseAddress(original);
        const reconstructed = formatAddress(name, location);
        expect(reconstructed.toString()).toBe(original);
      });
    });

    it("should round-trip component operations", () => {
      const testCases = [
        { address: "user@/api", expectedHost: null, expectedPath: "/api" },
        { address: "service@example.com", expectedHost: "example.com", expectedPath: null },
        { address: "api@server.com/v1", expectedHost: "server.com", expectedPath: "/v1" }
      ];

      testCases.forEach(({ address, expectedHost, expectedPath }) => {
        const [name, host, path] = parseAddressComponents(address);
        expect(host).toBe(expectedHost);
        expect(path).toBe(expectedPath);
        
        const reconstructed = formatAddressFromComponents(name, host, path);
        expect(reconstructed.toString()).toBe(address);
      });
    });
  });

  describe("Error Message Accuracy", () => {
    it("should provide specific error messages for different validation failures", () => {
      expect(() => new FameAddress("user@")).toThrow("Location part cannot be empty");
      expect(() => new FameAddress("user@example..com")).toThrow("Empty host segment");
      expect(() => new FameAddress("user@example.*.com")).toThrow("Wildcard '*' must be leftmost segment");
      expect(() => new FameAddress("user@/api/*/endpoint")).toThrow("Wildcards not allowed in path segments");
      expect(() => new FameAddress("user.name@/path")).toThrow("Participant must match [A-Z a-z 0-9 _ -]+");
    });

    it("should include problematic values in error messages", () => {
      try {
        new FameAddress("user@invalid_host.com");
        fail("Should have thrown");
      } catch (error: unknown) {
        expect((error as Error).message).toContain("invalid_host");
      }

      try {
        // This creates participant "user@/invalid" which fails participant validation
        new FameAddress("user@/invalid@path");
        fail("Should have thrown");
      } catch (error: unknown) {
        // Error message should include the actual problematic participant value
        expect((error as Error).message).toContain("user@/invalid");
      }
    });
  });
});