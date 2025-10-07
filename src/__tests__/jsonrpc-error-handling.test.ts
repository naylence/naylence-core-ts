import {
  makeRequest,
  parseRequest,
  makeResponse,
  parseResponse,
  makeMethodNotFoundError,
  makeInvalidParamsError,
  makeInternalError,
  makeParseError,
  makeInvalidRequestError,
} from '../naylence/fame/core/rpc/jsonrpc';

import { JSONRPCError } from '../naylence/fame/core/rpc/types';

describe('JSON-RPC Error Handling', () => {
  describe('makeResponse error handling paths', () => {
    it('should handle JSONRPCError instance (line 57 - first branch)', () => {
      // Test the 'code' in error && 'message' in error path
      const error: JSONRPCError = {
        code: -32601,
        message: 'Method not found',
        data: { method: 'test.unknown' },
      };

      const response = makeResponse(123, undefined, error);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(123);
      expect(response.error).toEqual({
        code: -32601,
        message: 'Method not found',
        data: { method: 'test.unknown' },
      });
    });

    it('should handle raw error object (line 57 - second branch)', () => {
      // Test the fallback case where error doesn't have proper structure
      const error = {
        someField: 'value',
        otherField: 123,
      } as any; // Force it to pass type checking

      const response = makeResponse(123, undefined, error);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(123);
      expect(response.error).toBeDefined();
    });

    it('should handle error with only code (partial structure)', () => {
      const error = { code: -32603 } as any;

      const response = makeResponse(456, undefined, error);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(456);
      expect(response.error).toBeDefined();
    });

    it('should handle error with only message (partial structure)', () => {
      const error = { message: 'Some error' } as any;

      const response = makeResponse(789, undefined, error);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(789);
      expect(response.error).toBeDefined();
    });
  });

  describe('Error helper functions', () => {
    it('should create method not found error with data', () => {
      const response = makeMethodNotFoundError(123, 'unknown.method');

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(123);
      expect(response.error).toEqual({
        code: -32601,
        message: 'Method not found',
        data: { method: 'unknown.method' },
      });
    });

    it('should create invalid params error with details', () => {
      const response = makeInvalidParamsError(
        456,
        'Missing required parameter'
      );

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(456);
      expect(response.error).toEqual({
        code: -32602,
        message: 'Invalid params',
        data: { details: 'Missing required parameter' },
      });
    });

    it('should create invalid params error without details', () => {
      const response = makeInvalidParamsError(789);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(789);
      expect(response.error).toEqual({
        code: -32602,
        message: 'Invalid params',
        data: undefined,
      });
    });

    it('should create internal error with custom message', () => {
      const response = makeInternalError(101, 'Database connection failed');

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(101);
      expect(response.error).toEqual({
        code: -32603,
        message: 'Database connection failed',
      });
    });

    it('should create internal error with default message', () => {
      const response = makeInternalError(202);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(202);
      expect(response.error).toEqual({
        code: -32603,
        message: 'Internal error',
      });
    });

    it('should create parse error', () => {
      const response = makeParseError();

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBeNull();
      expect(response.error).toEqual({
        code: -32700,
        message: 'Parse error',
      });
    });

    it('should create invalid request error with provided id', () => {
      const response = makeInvalidRequestError(303);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(303);
      expect(response.error).toEqual({
        code: -32600,
        message: 'Invalid Request',
      });
    });

    it('should create invalid request error with default null id', () => {
      const response = makeInvalidRequestError();

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBeNull();
      expect(response.error).toEqual({
        code: -32600,
        message: 'Invalid Request',
      });
    });
  });

  describe('Helper function edge cases', () => {
    it('should handle null id in makeResponse', () => {
      const response = makeResponse(null, { data: 'test' });

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBeNull();
      expect(response.result).toEqual({ data: 'test' });
    });

    it('should handle undefined error data field', () => {
      const error = {
        code: -32601,
        message: 'Method not found',
        // no data field
      };

      const response = makeResponse(404, undefined, error);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(404);
      expect(response.error.code).toBe(-32601);
      expect(response.error.message).toBe('Method not found');
    });
  });
});
