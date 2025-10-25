import { z } from 'zod';
import { FameAddress, FameAddressSchema } from '../address/address.js';
import { FlowFlags, CreditUpdateFrameSchema } from './flow.js';
import { FameFrameUnionSchema } from './frames.js';
import { FameResponseType } from './response-type.js';
import { SecurityHeaderSchema } from './security-header.js';
import { generateId } from '../util/id-generator.js';

// Define priority enum
export enum Priority {
  LOW = 'low',          // bulk work, non-critical
  NORMAL = 'normal',    // default
  HIGH = 'high',        // time-sensitive
  SPECULATIVE = 'speculative', // race-style, best-effort
}

// Version constant
export const ENVELOPE_VERSION = '1.0';

// Meta value types - restricted for extension metadata
const MetaValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.union([z.string(), z.number(), z.boolean()])),
  z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
]);

export type MetaValue = z.infer<typeof MetaValueSchema>;

// All frames union (includes credit update frames)
const AllFramesUnionSchema = z.union([
  FameFrameUnionSchema,
  CreditUpdateFrameSchema,
]);

export type AllFramesUnion = z.infer<typeof AllFramesUnionSchema>;

const TimestampSchema = z
  .preprocess((value) => {
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return value;
  }, z.date())
  .describe('UTC timestamp when the envelope was created');

const FLOW_FLAG_MASK =
  FlowFlags.SYN | FlowFlags.ACK | FlowFlags.RESET;

const FlowFlagsSchema = z
  .number()
  .int()
  .min(0)
  .refine((value) => (value & ~FLOW_FLAG_MASK) === 0, {
    message: 'FlowFlags contains unsupported bits',
  })
  .transform((value) => value as FlowFlags);

// Fame envelope schema
export const FameEnvelopeSchema = z.object({
  version: z.string().default(ENVELOPE_VERSION).optional(),
  
  id: z.string().default(() => generateId())
    .describe('Unique envelope identifier for de-duplication and tracing'),
  
  sid: z.string().optional()
    .describe('Source system id, hash of the sender\'s physical path'),
  
  traceId: z.string().optional()
    .describe('Logical trace id for correlating related envelopes'),
  
  to: FameAddressSchema.optional()
    .describe('Destination address; if unset, uses capability routing'),
  
  replyTo: FameAddressSchema.optional()
    .describe('Address where receivers should send their response'),
  
  capabilities: z.array(z.string()).optional()
    .describe('List of capability names this envelope is intended for'),
  
  rtype: z.nativeEnum(FameResponseType).optional()
    .describe('Expected response type for the envelope'),
  
  corrId: z.string().optional()
    .describe('Correlation ID for tracking related envelopes'),
  
  flowId: z.string().optional()
    .describe('Logical stream identifier for handling backpressure'),
  
  seqId: z.number().default(0).optional()
    .describe('Monotonic counter per-sender to order envelopes if needed'),
  
  flowFlags: FlowFlagsSchema.default(FlowFlags.NONE).optional()
    .describe('Flags controlling flow behavior (e.g., start/end of window)'),
  
  ttl: z.number().optional()
    .describe('Time-to-live (in hops) after which the envelope is dropped'),
  
  priority: z.nativeEnum(Priority).optional()
    .describe('Delivery priority hint (e.g., low, normal, high)'),
  
  frame: AllFramesUnionSchema
    .describe('The actual payload frame (e.g. DataFrame, NodeHeartbeatFrame)'),
  
  ts: TimestampSchema.default(() => new Date()),
  
  sec: SecurityHeaderSchema.optional()
    .describe('Optional security header'),
  
  aft: z.string().optional()
    .describe('Node-signed affinity tag. JWS compact format. ' +
             'Sentinel verifies signature & expiry; routes accordingly.'),
  
  meta: z.record(z.string(), MetaValueSchema).optional()
    .describe('Extension metadata: kebab-case or dotted keys; values must be ' +
             'str, int, float, bool or small list thereof.'),
}).transform((data) => {
  // Ensure ts is a Date object
  if (typeof data.ts === 'string') {
    data.ts = new Date(data.ts);
  }
  return data;
});

export type FameEnvelope = z.infer<typeof FameEnvelopeSchema>;

// Create fame envelope function
export interface CreateFameEnvelopeOptions {
  frame: AllFramesUnion;
  id?: string;
  sid?: string;
  traceId?: string;
  to?: FameAddress | string;
  capabilities?: string[];
  responseType?: FameResponseType;
  replyTo?: FameAddress;
  flowId?: string;
  windowId?: number;
  flags?: FlowFlags;
  corrId?: string;
  timestamp?: Date;
}

export function createFameEnvelope(options: CreateFameEnvelopeOptions): FameEnvelope {
  // Convert string to FameAddress if needed
  let toAddress: FameAddress | undefined;
  if (options.to) {
    toAddress = typeof options.to === 'string' ? new FameAddress(options.to) : options.to;
  }

  const envelope = FameEnvelopeSchema.parse({
    id: options.id || generateId(),
    sid: options.sid,
    traceId: options.traceId || generateId(),
    to: toAddress?.toString(), // Convert to string for schema validation
    capabilities: options.capabilities,
    rtype: options.responseType,
    replyTo: options.replyTo?.toString(), // Convert to string for schema validation
    frame: options.frame,
    flowId: options.flowId,
    seqId: options.windowId || 0,
    flowFlags: options.flags || FlowFlags.NONE,
    corrId: options.corrId,
    ts: options.timestamp || new Date(),
  });
  
  return envelope;
}

// Create envelope from dictionary/object
export function envelopeFromDict(data: Record<string, any>): FameEnvelope {
  return FameEnvelopeSchema.parse(data);
}

// Generic envelope type with specific frame type
export interface FameEnvelopeWith<T extends AllFramesUnion> extends Omit<FameEnvelope, 'frame'> {
  frame: T;
}

// Envelope factory interface
export interface EnvelopeFactory {
  createEnvelope(options: CreateFameEnvelopeOptions): FameEnvelope;
}

// Utility functions for envelope serialization
export function serializeEnvelope(envelope: FameEnvelope, options?: { safeLog?: boolean }): Record<string, any> {
  const serialized: Record<string, any> = { ...envelope };
  
  // Convert timestamp to ISO string with milliseconds precision
  if (serialized.ts instanceof Date) {
    serialized.ts = serialized.ts.toISOString();
  }
  
  // Convert camelCase to snake_case for compatibility with Python
  const converted: Record<string, any> = {};
  for (const [key, value] of Object.entries(serialized)) {
    let convertedKey = key;
    if (key === 'traceId') convertedKey = 'trace_id';
    else if (key === 'replyTo') convertedKey = 'reply_to';
    else if (key === 'corrId') convertedKey = 'corr_id';
    else if (key === 'flowId') convertedKey = 'flow_id';
    else if (key === 'seqId') convertedKey = 'seq_id';
    else if (key === 'flowFlags') convertedKey = 'flow_flags';
    
    converted[convertedKey] = value;
  }
  
  // Mask security header if safe logging is enabled
  if (options?.safeLog && converted.sec) {
    converted.sec = '<hidden>';
  }
  
  return converted;
}

export function deserializeEnvelope(data: Record<string, any>): FameEnvelope {
  // Convert snake_case to camelCase for TypeScript
  const converted: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    let convertedKey = key;
    if (key === 'trace_id') convertedKey = 'traceId';
    else if (key === 'reply_to') convertedKey = 'replyTo';
    else if (key === 'corr_id') convertedKey = 'corrId';
    else if (key === 'flow_id') convertedKey = 'flowId';
    else if (key === 'seq_id') convertedKey = 'seqId';
    else if (key === 'flow_flags') convertedKey = 'flowFlags';
    
    converted[convertedKey] = value;
  }
  
  return FameEnvelopeSchema.parse(converted);
}