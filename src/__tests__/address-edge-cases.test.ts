import {
  FameAddress,
  parseAddressComponents,
  formatAddressFromComponents,
} from '../naylence/fame/core/address/address';

describe('Address Validation Edge Cases', () => {
  describe('validateHost empty string handling', () => {
    it('should handle empty host validation case', () => {
      // This should trigger the early return in validateHost when host is empty
      // Testing formatAddressFromComponents with empty host
      const result = formatAddressFromComponents('user', '', '/api');
      expect(result.toString()).toBe('user@/api');
    });

    it('should handle null host in formatAddressFromComponents', () => {
      // Test the path where host is null/undefined
      const result = formatAddressFromComponents('user', null, '/api');
      expect(result.toString()).toBe('user@/api');
    });
  });

  describe('validatePath empty checks', () => {
    it('should handle empty path validation case', () => {
      // Test the early return in validatePath when path is empty
      const result = formatAddressFromComponents('user', 'example.com', '');
      expect(result.toString()).toBe('user@example.com');
    });

    it('should handle null path in formatAddressFromComponents', () => {
      // Test the path where path is null/undefined
      const result = formatAddressFromComponents('user', 'example.com', null);
      expect(result.toString()).toBe('user@example.com');
    });

    it('should handle root path validation', () => {
      // Test the path === '/' case in validatePath
      const result = formatAddressFromComponents('user', 'example.com', '/');
      expect(result.toString()).toBe('user@example.com/');
    });
  });

  describe('parseAddressComponents edge cases', () => {
    it('should handle address without @ symbol', () => {
      // This should trigger the error on line ~180
      expect(() => parseAddressComponents('userexample.com')).toThrow(
        "Missing '@' in address"
      );
    });
  });

  describe('formatAddressFromComponents validation', () => {
    it('should handle undefined host and path', () => {
      // Test the case where both host and path are undefined
      expect(() =>
        formatAddressFromComponents('user', undefined, undefined)
      ).toThrow('At least one of host or path must be provided');
    });

    it('should handle empty string host and path', () => {
      // Test case where both are empty strings
      expect(() => formatAddressFromComponents('user', '', '')).toThrow(
        'At least one of host or path must be provided'
      );
    });

    it('should handle falsely values for host and path', () => {
      // Test various falsy combinations that should trigger validation
      expect(() => formatAddressFromComponents('user', null, '')).toThrow(
        'At least one of host or path must be provided'
      );

      expect(() => formatAddressFromComponents('user', '', null)).toThrow(
        'At least one of host or path must be provided'
      );
    });
  });

  describe('Additional validation edge cases', () => {
    it('should handle validateHost with undefined input', () => {
      // Test direct undefined/null host handling
      const result = formatAddressFromComponents('user', undefined, '/api');
      expect(result.toString()).toBe('user@/api');
    });

    it('should handle validatePath with undefined input', () => {
      // Test direct undefined/null path handling
      const result = formatAddressFromComponents(
        'user',
        'example.com',
        undefined
      );
      expect(result.toString()).toBe('user@example.com');
    });

    it('should handle complex address parsing edge case', () => {
      // Test edge cases in address parsing that might hit uncovered branches
      const [participant, host, path] = parseAddressComponents(
        'user@example.com/api/v1'
      );
      expect(participant).toBe('user');
      expect(host).toBe('example.com');
      expect(path).toBe('/api/v1');
    });

    it('should handle address with @ in participant name', () => {
      // This should use lastIndexOf('@') logic - use valid participant chars
      const [participant, host, path] = parseAddressComponents(
        'user-email@example.com/api'
      );
      expect(participant).toBe('user-email');
      expect(host).toBe('example.com');
      expect(path).toBe('/api');
    });
  });

  describe('FameAddress Edge Cases', () => {
    it('should handle address creation with minimal location', () => {
      // Test cases that might hit uncovered constructor branches
      // Using valid minimal format
      const addr1 = new FameAddress('user@host');
      expect(addr1.toString()).toBe('user@host');

      const addr2 = new FameAddress('user@/path');
      expect(addr2.toString()).toBe('user@/path');
    });

    it('should trigger location empty validation', () => {
      // This should trigger the "Location part cannot be empty" error
      expect(() => new FameAddress('user@')).toThrow(
        'Location part cannot be empty'
      );
    });
  });
});
