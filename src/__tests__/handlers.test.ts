import {
  FameMessageResponse,
  FameMessageHandler,
  FameEnvelopeHandler,
  FameRPCHandler,
  createMessageResponse,
  isFameMessageResponse,
  normalizeHandlerResponse,
} from '../naylence/fame/core/handlers/handlers';
import {
  createFameEnvelope,
  FameEnvelope,
} from '../naylence/fame/core/protocol/envelope';
import {
  localDeliveryContext,
  FameDeliveryContext,
} from '../naylence/fame/core/protocol/delivery-context';
import { FameResponseType } from '../naylence/fame/core/protocol/response-type';

// Mock implementations for testing
const mockEnvelope: FameEnvelope = createFameEnvelope({
  frame: {
    type: 'Data',
    payload: { message: 'test' },
  },
  to: 'test-target@mock.host',
  responseType: FameResponseType.ACK,
});

const mockContext: FameDeliveryContext = localDeliveryContext();

describe('Handlers', () => {
  describe('createMessageResponse', () => {
    it('should create response with envelope only when context is undefined', () => {
      const response = createMessageResponse(mockEnvelope);

      expect(response).toEqual({ envelope: mockEnvelope });
      expect(response).not.toHaveProperty('context');
    });

    it('should create response with envelope and context when context is provided', () => {
      const response = createMessageResponse(mockEnvelope, mockContext);

      expect(response).toEqual({
        envelope: mockEnvelope,
        context: mockContext,
      });
    });

    it('should create response with null context when explicitly passed', () => {
      const response = createMessageResponse(mockEnvelope, null as any);

      expect(response).toEqual({
        envelope: mockEnvelope,
        context: null,
      });
    });

    it('should handle empty context object', () => {
      const emptyContext = {} as FameDeliveryContext;
      const response = createMessageResponse(mockEnvelope, emptyContext);

      expect(response).toEqual({
        envelope: mockEnvelope,
        context: emptyContext,
      });
    });
  });

  describe('isFameMessageResponse', () => {
    it('should return true for valid FameMessageResponse', () => {
      const validResponse: FameMessageResponse = {
        envelope: mockEnvelope,
      };

      expect(isFameMessageResponse(validResponse)).toBe(true);
    });

    it('should return true for FameMessageResponse with context', () => {
      const validResponse: FameMessageResponse = {
        envelope: mockEnvelope,
        context: mockContext,
      };

      expect(isFameMessageResponse(validResponse)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isFameMessageResponse(null)).toBeFalsy();
    });

    it('should return false for undefined', () => {
      expect(isFameMessageResponse(undefined)).toBeFalsy();
    });

    it('should return false for primitive values', () => {
      expect(isFameMessageResponse('string')).toBe(false);
      expect(isFameMessageResponse(123)).toBe(false);
      expect(isFameMessageResponse(true)).toBe(false);
    });

    it('should return false for objects without envelope property', () => {
      expect(isFameMessageResponse({})).toBe(false);
      expect(isFameMessageResponse({ context: mockContext })).toBe(false);
      expect(isFameMessageResponse({ data: 'test' })).toBe(false);
    });

    it('should return false for objects with null envelope', () => {
      expect(isFameMessageResponse({ envelope: null })).toBeFalsy();
    });

    it('should return false for objects with undefined envelope', () => {
      expect(isFameMessageResponse({ envelope: undefined })).toBeFalsy();
    });

    it('should return false for objects with non-object envelope', () => {
      expect(isFameMessageResponse({ envelope: 'string' })).toBe(false);
      expect(isFameMessageResponse({ envelope: 123 })).toBe(false);
      expect(isFameMessageResponse({ envelope: true })).toBe(false);
    });

    it('should return false for objects with envelope missing frame property', () => {
      const invalidEnvelope = {
        id: 'test-id',
        to: 'test@mock.host',
      };

      expect(isFameMessageResponse({ envelope: invalidEnvelope })).toBe(false);
    });

    it('should return true for objects with envelope having null frame (current behavior)', () => {
      const invalidEnvelope = {
        frame: null,
        id: 'test-id',
        to: 'test@mock.host',
      };

      expect(isFameMessageResponse({ envelope: invalidEnvelope })).toBe(true);
    });

    it('should return false for arrays', () => {
      expect(isFameMessageResponse([mockEnvelope])).toBe(false);
    });
  });

  describe('normalizeHandlerResponse', () => {
    it('should return null for null input', () => {
      expect(normalizeHandlerResponse(null)).toBe(null);
    });

    it('should return null for undefined input', () => {
      expect(normalizeHandlerResponse(undefined)).toBe(null);
    });

    it('should return the response for valid FameMessageResponse', () => {
      const validResponse: FameMessageResponse = {
        envelope: mockEnvelope,
        context: mockContext,
      };

      expect(normalizeHandlerResponse(validResponse)).toBe(validResponse);
    });

    it('should return null for non-FameMessageResponse objects', () => {
      expect(normalizeHandlerResponse({ data: 'test' })).toBe(null);
      expect(normalizeHandlerResponse({ result: 'success' })).toBe(null);
      expect(normalizeHandlerResponse({})).toBe(null);
    });

    it('should return null for primitive values', () => {
      expect(normalizeHandlerResponse('string result')).toBe(null);
      expect(normalizeHandlerResponse(123)).toBe(null);
      expect(normalizeHandlerResponse(true)).toBe(null);
      expect(normalizeHandlerResponse(false)).toBe(null);
    });

    it('should return null for arrays', () => {
      expect(normalizeHandlerResponse([1, 2, 3])).toBe(null);
      expect(normalizeHandlerResponse(['result'])).toBe(null);
    });

    it('should handle complex objects that are not FameMessageResponse', () => {
      const complexObject = {
        data: {
          nested: {
            property: 'value',
          },
        },
        array: [1, 2, 3],
        envelope: 'not an envelope object',
      };

      expect(normalizeHandlerResponse(complexObject)).toBe(null);
    });
  });

  describe('Handler Type Usage Examples', () => {
    describe('FameMessageHandler', () => {
      it('should handle message and return direct result', async () => {
        const handler: FameMessageHandler = async (_message: unknown) => {
          return { processed: true, original: _message };
        };

        const result = await handler({ test: 'data' });
        expect(result).toEqual({ processed: true, original: { test: 'data' } });
      });

      it('should handle message and return FameMessageResponse', async () => {
        const handler: FameMessageHandler = async (_message: unknown) => {
          return createMessageResponse(mockEnvelope, mockContext);
        };

        const result = await handler({ test: 'data' });
        expect(isFameMessageResponse(result)).toBe(true);
        expect(result).toEqual({
          envelope: mockEnvelope,
          context: mockContext,
        });
      });

      it('should handle message and return null', async () => {
        const handler: FameMessageHandler = async (_message: unknown) => {
          return null;
        };

        const result = await handler({ test: 'data' });
        expect(result).toBe(null);
      });

      it('should handle message and return undefined', async () => {
        const handler: FameMessageHandler = async (_message: unknown) => {
          return undefined;
        };

        const result = await handler({ test: 'data' });
        expect(result).toBe(undefined);
      });
    });

    describe('FameEnvelopeHandler', () => {
      it('should handle envelope without context', async () => {
        const handler: FameEnvelopeHandler = async (envelope: FameEnvelope) => {
          return createMessageResponse(envelope);
        };

        const result = await handler(mockEnvelope);
        expect(result).toEqual({ envelope: mockEnvelope });
      });

      it('should handle envelope with context', async () => {
        const handler: FameEnvelopeHandler = async (
          envelope: FameEnvelope,
          context?: FameDeliveryContext
        ) => {
          return createMessageResponse(envelope, context);
        };

        const result = await handler(mockEnvelope, mockContext);
        expect(result).toEqual({
          envelope: mockEnvelope,
          context: mockContext,
        });
      });

      it('should return null when no response needed', async () => {
        const handler: FameEnvelopeHandler = async (
          envelope: FameEnvelope,
          context?: FameDeliveryContext
        ) => {
          // Process but don't respond
          return null;
        };

        const result = await handler(mockEnvelope, mockContext);
        expect(result).toBe(null);
      });
    });

    describe('FameRPCHandler', () => {
      it('should handle RPC call and return direct result', async () => {
        const handler: FameRPCHandler = async (
          method: string,
          params?: Record<string, any>
        ) => {
          return { method, params, result: 'success' };
        };

        const result = await handler('test.method', { arg1: 'value1' });
        expect(result).toEqual({
          method: 'test.method',
          params: { arg1: 'value1' },
          result: 'success',
        });
      });

      it('should handle RPC call and return FameMessageResponse', async () => {
        const handler: FameRPCHandler = async (
          method: string,
          params?: Record<string, any>
        ) => {
          return createMessageResponse(mockEnvelope);
        };

        const result = await handler('test.method', { arg1: 'value1' });
        expect(isFameMessageResponse(result)).toBe(true);
      });

      it('should handle RPC call without params', async () => {
        const handler: FameRPCHandler = async (method: string) => {
          return { method, hasParams: false };
        };

        const result = await handler('test.method');
        expect(result).toEqual({ method: 'test.method', hasParams: false });
      });

      it('should handle RPC call and return null', async () => {
        const handler: FameRPCHandler = async (
          method: string,
          params?: Record<string, any>
        ) => {
          return null;
        };

        const result = await handler('test.method', {});
        expect(result).toBe(null);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle isFameMessageResponse with circular references', () => {
      const circular: any = {};
      circular.self = circular;
      circular.envelope = mockEnvelope;

      expect(isFameMessageResponse(circular)).toBe(true);
    });

    it('should handle normalizeHandlerResponse with circular references', () => {
      const circular: any = {};
      circular.self = circular;

      expect(normalizeHandlerResponse(circular)).toBe(null);
    });

    it('should handle envelope with extra properties', () => {
      const envelopeWithExtras = {
        ...mockEnvelope,
        extraProperty: 'should not affect validation',
      };

      const response = { envelope: envelopeWithExtras };
      expect(isFameMessageResponse(response)).toBe(true);
    });

    it('should handle response with extra properties', () => {
      const responseWithExtras = {
        envelope: mockEnvelope,
        context: mockContext,
        extraProperty: 'should not affect validation',
      };

      expect(isFameMessageResponse(responseWithExtras)).toBe(true);
      expect(normalizeHandlerResponse(responseWithExtras)).toBe(
        responseWithExtras
      );
    });
  });
});
