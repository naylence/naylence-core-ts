import { z } from 'zod';
import { DeliveryOriginType } from './origin-type';
import { FameResponseType } from './response-type';

// Authorization context schema
export const AuthorizationContextSchema = z.object({
  // Authentication results
  authenticated: z.boolean().default(false)
    .describe('Whether authentication succeeded'),
  
  authorized: z.boolean().default(false)
    .describe('Whether authorization succeeded'),
  
  principal: z.string().optional()
    .describe('Authenticated principal/user ID'),
  
  claims: z.record(z.string(), z.any()).default({})
    .describe('Token claims'),
  
  // Authorization results
  grantedScopes: z.array(z.string()).default([])
    .describe('Granted permission scopes'),
  
  restrictions: z.record(z.string(), z.any()).default({})
    .describe('Authorization restrictions'),
  
  // Context metadata
  authMethod: z.string().optional()
    .describe('Authentication method used'),
  
  expiresAt: z.date().optional()
    .describe('When authorization expires'),
}).transform((data) => {
  // Convert string dates to Date objects if needed
  if (typeof data.expiresAt === 'string') {
    data.expiresAt = new Date(data.expiresAt);
  }
  return data;
});

export type AuthorizationContext = z.infer<typeof AuthorizationContextSchema>;

// Helper methods for AuthorizationContext
export class AuthorizationContextHelper {
  constructor(private context: AuthorizationContext) {}

  /**
   * Check if a specific scope is granted
   */
  hasScope(scope: string): boolean {
    return this.context.grantedScopes.includes(scope);
  }

  /**
   * Check if any of the specified scopes are granted
   */
  hasAnyScope(scopes: string[]): boolean {
    return scopes.some(scope => this.context.grantedScopes.includes(scope));
  }

  /**
   * Check if authorization context is still valid
   */
  isValid(): boolean {
    if (!this.context.authenticated) {
      return false;
    }
    if (this.context.expiresAt && new Date() > this.context.expiresAt) {
      return false;
    }
    return true;
  }
}

// Security context schema
export const SecurityContextSchema = z.object({
  // Crypto level classification for inbound messages
  inboundCryptoLevel: z.any().optional()
    .describe('Classified crypto level of the inbound message (CryptoLevel enum)'),
  
  // Signature tracking for inbound messages
  inboundWasSigned: z.boolean().optional()
    .describe('Whether the inbound message was signed (for signature mirroring)'),
  
  // Channel encryption tracking
  cryptoChannelId: z.string().optional()
    .describe('ID of the virtual secure channel used for message delivery'),
  
  authorization: AuthorizationContextSchema.optional()
    .describe('Authorization context containing claims and permissions'),
});

export type SecurityContext = z.infer<typeof SecurityContextSchema>;

// Fame delivery context schema
export const FameDeliveryContextSchema = z.object({
  fromSystemId: z.string().optional()
    .describe('Delivery source system id'),
  
  fromConnector: z.any().optional()
    .describe('Delivery connector'),
  
  originType: z.nativeEnum(DeliveryOriginType).optional()
    .describe('Where this envelope came from: downstream, upstream, or local'),
  
  // Security context for cryptographic and channel information
  security: SecurityContextSchema.optional()
    .describe('Security-related context including crypto level and channel information'),
  
  meta: z.record(z.string(), z.any()).optional()
    .describe('Ad-hoc metadata for the delivery'),
  
  stickinessRequired: z.boolean().optional()
    .describe('Whether this delivery requires stickiness. When True, the delivery should use sticky routing even if not explicitly configured'),
  
  stickySid: z.string().optional()
    .describe('Original client session ID for sticky routing. Set when stickiness is requested to preserve the client\'s session identifier for AFT token generation'),
  
  expectedResponseType: z.nativeEnum(FameResponseType).default(FameResponseType.NONE)
    .describe('Expected response type for the delivery'),
});

export type FameDeliveryContext = z.infer<typeof FameDeliveryContextSchema>;

/**
 * Create a local delivery context
 */
export function localDeliveryContext(systemId?: string): FameDeliveryContext {
  return FameDeliveryContextSchema.parse({
    fromSystemId: systemId,
    originType: DeliveryOriginType.LOCAL,
  });
}

// Helper function to create authorization context with methods
export function createAuthorizationContext(data: Partial<AuthorizationContext>): AuthorizationContext & { helper: AuthorizationContextHelper } {
  const context = AuthorizationContextSchema.parse(data);
  return Object.assign(context, {
    helper: new AuthorizationContextHelper(context)
  });
}