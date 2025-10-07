import {
  AuthorizationContext,
  AuthorizationContextSchema,
  AuthorizationContextHelper,
  createAuthorizationContext,
  localDeliveryContext,
} from '../naylence/fame/core/protocol/delivery-context';

import {
  DataFrame,
  DataFrameSchema,
  NodeHelloFrame,
  NodeHelloFrameSchema,
  NodeWelcomeFrame,
  NodeWelcomeFrameSchema,
  DeliveryAckFrame,
  DeliveryAckFrameSchema,
} from '../naylence/fame/core/protocol/frames';

import { DeliveryOriginType } from '../naylence/fame/core/protocol/origin-type';

describe('Protocol Schema Validation', () => {
  describe('AuthorizationContext', () => {
    describe('schema validation', () => {
      it('should validate valid authorization context', () => {
        const validContext = {
          authenticated: true,
          authorized: true,
          principal: 'user@example.com',
          claims: { role: 'admin', scope: 'read write' },
          grantedScopes: ['read', 'write'],
          restrictions: { maxRequests: 100 },
          authMethod: 'jwt',
          expiresAt: new Date('2024-12-31T23:59:59Z'),
        };

        const result = AuthorizationContextSchema.parse(validContext);
        expect(result).toEqual(validContext);
      });

      it('should use default values for optional fields', () => {
        const minimalContext = {};

        const result = AuthorizationContextSchema.parse(minimalContext);
        expect(result.authenticated).toBe(false);
        expect(result.authorized).toBe(false);
        expect(result.claims).toEqual({});
        expect(result.grantedScopes).toEqual([]);
        expect(result.restrictions).toEqual({});
      });

      it('should validate context with Date objects', () => {
        const contextWithDate = {
          authenticated: true,
          authorized: true,
          expiresAt: new Date('2024-12-31T23:59:59Z'),
        };

        const result = AuthorizationContextSchema.parse(contextWithDate);
        expect(result.expiresAt).toBeInstanceOf(Date);
        expect(result.expiresAt?.toISOString()).toBe(
          '2024-12-31T23:59:59.000Z'
        );
      });

      it('should handle validation errors gracefully', () => {
        const invalidContext = {
          authenticated: 'not-a-boolean',
          authorized: true,
        };

        expect(() =>
          AuthorizationContextSchema.parse(invalidContext)
        ).toThrow();
      });
    });

    describe('AuthorizationContextHelper', () => {
      let context: AuthorizationContext;
      let helper: AuthorizationContextHelper;

      beforeEach(() => {
        context = {
          authenticated: true,
          authorized: true,
          principal: 'user@example.com',
          claims: { role: 'admin', department: 'engineering' },
          grantedScopes: ['read', 'write', 'admin'],
          restrictions: { maxRequests: 100, rateLimit: '10/min' },
          authMethod: 'jwt',
          expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        };
        helper = new AuthorizationContextHelper(context);
      });

      describe('scope validation', () => {
        it('should return true for granted scopes', () => {
          expect(helper.hasScope('read')).toBe(true);
          expect(helper.hasScope('write')).toBe(true);
          expect(helper.hasScope('admin')).toBe(true);
        });

        it('should return false for non-granted scopes', () => {
          expect(helper.hasScope('delete')).toBe(false);
          expect(helper.hasScope('super-admin')).toBe(false);
        });

        it('should handle empty scopes array', () => {
          const emptyContext = { ...context, grantedScopes: [] };
          const emptyHelper = new AuthorizationContextHelper(emptyContext);
          expect(emptyHelper.hasScope('read')).toBe(false);
        });

        it('should return true if any scope is granted', () => {
          expect(helper.hasAnyScope(['read', 'nonexistent'])).toBe(true);
          expect(helper.hasAnyScope(['write', 'delete'])).toBe(true);
        });

        it('should return false if no scopes are granted', () => {
          expect(helper.hasAnyScope(['delete', 'nonexistent'])).toBe(false);
        });
      });

      describe('validity checks', () => {
        it('should return true for authenticated and non-expired context', () => {
          expect(helper.isValid()).toBe(true);
        });

        it('should return false for non-authenticated context', () => {
          const unauthenticatedContext = { ...context, authenticated: false };
          const unauthenticatedHelper = new AuthorizationContextHelper(
            unauthenticatedContext
          );
          expect(unauthenticatedHelper.isValid()).toBe(false);
        });

        it('should return false for expired context', () => {
          const expiredContext = {
            ...context,
            expiresAt: new Date(Date.now() - 1000),
          };
          const expiredHelper = new AuthorizationContextHelper(expiredContext);
          expect(expiredHelper.isValid()).toBe(false);
        });

        it('should return true when no expiration date is set', () => {
          const noExpiryContext = { ...context, expiresAt: undefined };
          const noExpiryHelper = new AuthorizationContextHelper(
            noExpiryContext
          );
          expect(noExpiryHelper.isValid()).toBe(true);
        });
      });
    });

    describe('createAuthorizationContext', () => {
      it('should create context with default values', () => {
        const context = createAuthorizationContext({});
        expect(context.authenticated).toBe(false);
        expect(context.authorized).toBe(false);
        expect(context.claims).toEqual({});
        expect(context.grantedScopes).toEqual([]);
        expect(context.restrictions).toEqual({});
        expect(context.helper).toBeInstanceOf(AuthorizationContextHelper);
      });

      it('should create context with provided values', () => {
        const context = createAuthorizationContext({
          authenticated: true,
          authorized: true,
          principal: 'test@example.com',
          grantedScopes: ['read'],
        });

        expect(context.authenticated).toBe(true);
        expect(context.authorized).toBe(true);
        expect(context.principal).toBe('test@example.com');
        expect(context.grantedScopes).toEqual(['read']);
        expect(context.helper).toBeInstanceOf(AuthorizationContextHelper);
      });

      it('should have working helper methods', () => {
        const context = createAuthorizationContext({
          authenticated: true,
          grantedScopes: ['read', 'write'],
        });

        expect(context.helper.hasScope('read')).toBe(true);
        expect(context.helper.hasScope('delete')).toBe(false);
        expect(context.helper.isValid()).toBe(true);
      });
    });

    describe('localDeliveryContext', () => {
      it('should create local delivery context', () => {
        const context = localDeliveryContext();
        expect(context.originType).toBe(DeliveryOriginType.LOCAL);
      });

      it('should create local delivery context with system id', () => {
        const context = localDeliveryContext('test-system');
        expect(context.fromSystemId).toBe('test-system');
        expect(context.originType).toBe(DeliveryOriginType.LOCAL);
      });
    });
  });

  describe('Frame Schema Validation', () => {
    describe('DataFrameSchema', () => {
      it('should validate valid data frame', () => {
        const validFrame = {
          type: 'Data',
          payload: { message: 'test', data: [1, 2, 3] },
          fid: 'frame-123',
          codec: 'json',
        };

        const result = DataFrameSchema.parse(validFrame);
        expect(result.type).toBe('Data');
        expect(result.payload).toEqual({ message: 'test', data: [1, 2, 3] });
        expect(result.fid).toBe('frame-123');
        expect(result.codec).toBe('json');
      });

      it('should validate frame with minimal required fields', () => {
        const minimalFrame = {
          type: 'Data',
          payload: 'simple string payload',
        };

        const result = DataFrameSchema.parse(minimalFrame);
        expect(result.type).toBe('Data');
        expect(result.payload).toBe('simple string payload');
      });

      it('should validate frame with b64 codec', () => {
        const b64Frame = {
          type: 'Data',
          payload: 'base64encodeddata',
          codec: 'b64',
        };

        const result = DataFrameSchema.parse(b64Frame);
        expect(result.codec).toBe('b64');
      });

      it('should reject invalid frame type', () => {
        const invalidFrame = {
          type: 'InvalidType',
          payload: 'test',
        };

        expect(() => DataFrameSchema.parse(invalidFrame)).toThrow();
      });

      it('should reject invalid codec', () => {
        const invalidFrame = {
          type: 'Data',
          payload: 'test',
          codec: 'invalid-codec',
        };

        expect(() => DataFrameSchema.parse(invalidFrame)).toThrow();
      });
    });

    describe('DeliveryAckFrameSchema', () => {
      it('should validate valid delivery ack frame with default values', () => {
        const validFrame = {
          type: 'DeliveryAck',
          ok: true,
          code: 'SUCCESS',
          reason: 'Message delivered successfully',
          refId: 'msg-456',
        };

        const result = DeliveryAckFrameSchema.parse(validFrame);
        expect(result.type).toBe('DeliveryAck');
        expect(result.ok).toBe(true);
        expect(result.code).toBe('SUCCESS');
        expect(result.reason).toBe('Message delivered successfully');
        expect(result.refId).toBe('msg-456');
      });

      it('should validate NACK frame with error details', () => {
        const nackFrame = {
          type: 'DeliveryAck',
          ok: false,
          code: 'TIMEOUT',
          reason: 'Delivery failed: timeout',
          refId: 'failed-msg-123',
        };

        const result = DeliveryAckFrameSchema.parse(nackFrame);
        expect(result.ok).toBe(false);
        expect(result.code).toBe('TIMEOUT');
        expect(result.reason).toBe('Delivery failed: timeout');
        expect(result.refId).toBe('failed-msg-123');
      });

      it('should use default values for minimal frame', () => {
        const minimalFrame = {
          type: 'DeliveryAck',
        };

        const result = DeliveryAckFrameSchema.parse(minimalFrame);
        expect(result.type).toBe('DeliveryAck');
        expect(result.ok).toBe(true); // Default value
      });

      it('should validate frame without optional fields', () => {
        const simpleFrame = {
          ok: false,
        };

        const result = DeliveryAckFrameSchema.parse(simpleFrame);
        expect(result.type).toBe('DeliveryAck'); // Default value
        expect(result.ok).toBe(false);
        expect(result.code).toBeUndefined();
        expect(result.reason).toBeUndefined();
        expect(result.refId).toBeUndefined();
      });
    });
  });
});
