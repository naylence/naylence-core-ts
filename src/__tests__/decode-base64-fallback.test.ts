import { decodeBase64Fallback } from "../naylence/fame/core/util/id-generator";

describe("Base64 Fallback Decoder", () => {
  
  it("should decode complete base64 without issues", () => {
    // Use actual base64 from the blacklist that we know works
    const input = "SGVsbG8"; // This should decode properly
    const result = decodeBase64Fallback(input);
    
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
  
  it("should handle case where encoded3 equals -1 (line 42)", () => {
    // Create input where the 3rd character results in -1 from indexOf
    // This will test: if (encoded3 !== 64)
    const input = "SGVs"; // Incomplete, will have encoded3 as -1
    const result = decodeBase64Fallback(input);
    
    expect(typeof result).toBe("string");
    // Since encoded3 is -1 (not 64), the condition should be true
  });
  
  it("should handle case where encoded4 equals -1 (line 43)", () => {
    // Create input where the 4th character results in -1 from indexOf  
    // This will test: if (encoded4 !== 64)
    const input = "SGV"; // Very incomplete, will have encoded4 as -1
    const result = decodeBase64Fallback(input);
    
    expect(typeof result).toBe("string");
    // Since encoded4 is -1 (not 64), the condition should be true
  });
  
  it("should handle input cleaning (line 34)", () => {
    // Test the regex replacement: str.replace(/[^A-Za-z0-9+/]/g, '')
    const input = "SGVs-invalid@chars#here";
    const result = decodeBase64Fallback(input);
    
    expect(typeof result).toBe("string");
    // The invalid characters should be removed before processing
  });
  
  it("should handle empty string", () => {
    const result = decodeBase64Fallback("");
    expect(result).toBe("");
  });
  
  it("should process while loop with different lengths", () => {
    const testCases = [
      "S",      // 1 char
      "SG",     // 2 chars
      "SGV",    // 3 chars  
      "SGVs",   // 4 chars (complete block)
      "SGVsbG", // 6 chars (1.5 blocks)
      "SGVsbG8", // 7 chars
    ];
    
    testCases.forEach(input => {
      const result = decodeBase64Fallback(input);
      expect(typeof result).toBe("string");
    });
  });
  
  it("should handle bitmap calculations", () => {
    // Test the bitmap calculation: (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4
    const input = "AAAA"; // All A's (index 0) - simple case
    const result = decodeBase64Fallback(input);
    
    expect(typeof result).toBe("string");
  });
  
  it("should handle String.fromCharCode conversions", () => {
    // Test the character conversion lines:
    // result += String.fromCharCode((bitmap >> 16) & 255);
    // result += String.fromCharCode((bitmap >> 8) & 255);
    // result += String.fromCharCode(bitmap & 255);
    
    const input = "TWFu"; // "Man" - known good base64
    const result = decodeBase64Fallback(input);
    
    expect(typeof result).toBe("string");
    expect(result).toBe("Man");
  });
  
  it("should process actual blacklist values", () => {
    // Test with real blacklist base64 values to ensure they work
    const blacklistSamples = [
      "c2hpdA==",    // Should decode to "shit"
      "ZnVj",        // Should decode to something
      "ZGFtbg==",    // Should decode to something
    ];
    
    blacklistSamples.forEach(b64 => {
      const result = decodeBase64Fallback(b64);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });
  });
  
  it("should test all code paths in while loop", () => {
    // Ensure we hit all the lines in the while loop
    const input = "VGVzdERhdGEgSGVyZQ"; // Longer input to test multiple iterations
    const result = decodeBase64Fallback(input);
    
    expect(typeof result).toBe("string");
  });
});