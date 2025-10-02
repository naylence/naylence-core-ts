import { z } from 'zod';
import { FameAddressSchema } from '../address/address.js';
import { DeliveryOriginType } from './origin-type.js';
import { SecuritySettingsSchema } from './security-settings.js';

// Base frame schema
export const FameFrameSchema = z.object({
  type: z.string(),
});

export type FameFrame = z.infer<typeof FameFrameSchema>;

// Delivery acknowledgment frame
export const DeliveryAckFrameSchema = z.object({
  type: z.literal('DeliveryAck').default('DeliveryAck'),
  ok: z.boolean().default(true), // True ⇒ ACK, False ⇒ NACK
  code: z.string().optional(),
  reason: z.string().optional(),
  refId: z.string().optional(), // Optional reference id, typically envelope id being acked
});

export type DeliveryAckFrame = z.infer<typeof DeliveryAckFrameSchema>;

// Stickiness negotiation payload
export const StickinessSchema = z.object({
  // Preferred mechanism or negotiated mode: 'aft' (advanced) or 'attr' (simple)
  mode: z.enum(['aft', 'attr']).optional(),
  
  // Optional multi-mode advertisement from child; if present, 'mode' is the preferred one
  supportedModes: z.array(z.enum(['aft', 'attr'])).optional(),
  
  // Parent-side toggle when replying; ignored by child when advertising
  enabled: z.boolean().optional(),
  
  // TTL hint for AFT-based stickiness; ignored for attribute mode
  ttlSec: z.number().optional(),
  
  // Schema version for forward-compat negotiation
  version: z.number().default(1),
});

export type Stickiness = z.infer<typeof StickinessSchema>;

// Address bind frame
export const AddressBindFrameSchema = z.object({
  type: z.literal('AddressBind').default('AddressBind'),
  address: FameAddressSchema,
  encryptionKeyId: z.string().optional(),
  physicalPath: z.string().optional(),
});

export type AddressBindFrame = z.infer<typeof AddressBindFrameSchema>;

// Address bind acknowledgment frame
export const AddressBindAckFrameSchema = DeliveryAckFrameSchema.extend({
  type: z.literal('AddressBindAck').default('AddressBindAck'),
  address: FameAddressSchema,
});

export type AddressBindAckFrame = z.infer<typeof AddressBindAckFrameSchema>;

// Address unbind frame
export const AddressUnbindFrameSchema = z.object({
  type: z.literal('AddressUnbind').default('AddressUnbind'),
  address: FameAddressSchema,
});

export type AddressUnbindFrame = z.infer<typeof AddressUnbindFrameSchema>;

// Address unbind acknowledgment frame
export const AddressUnbindAckFrameSchema = DeliveryAckFrameSchema.extend({
  type: z.literal('AddressUnbindAck').default('AddressUnbindAck'),
  address: FameAddressSchema,
});

export type AddressUnbindAckFrame = z.infer<typeof AddressUnbindAckFrameSchema>;

// Node heartbeat frame
export const NodeHeartbeatFrameSchema = z.object({
  type: z.literal('NodeHeartbeat').default('NodeHeartbeat'),
  address: FameAddressSchema.optional(),
  systemId: z.string().optional(),
  payload: z.any().optional(),
});

export type NodeHeartbeatFrame = z.infer<typeof NodeHeartbeatFrameSchema>;

// Node heartbeat acknowledgment frame
export const NodeHeartbeatAckFrameSchema = DeliveryAckFrameSchema.extend({
  type: z.literal('NodeHeartbeatAck').default('NodeHeartbeatAck'),
  address: FameAddressSchema.optional(),
  routingEpoch: z.string().optional(),
  payload: z.any().optional(),
});

export type NodeHeartbeatAckFrame = z.infer<typeof NodeHeartbeatAckFrameSchema>;

// Data frame with optional encryption
export const DataFrameSchema = z.object({
  type: z.literal('Data').default('Data'),
  fid: z.string().optional(),
  codec: z.enum(['json', 'b64']).optional(),
  payload: z.any(),
  pd: z.string().optional(), // Payload digest only for encrypted data frames
  
  // Channel encryption fields
  cid: z.string().optional().describe('Channel ID for encrypted data frames'),
  nonce: z.string().optional().describe('Base64-encoded nonce for encrypted frames (12 bytes)'),
}).transform((data) => {
  // Validate nonce length if provided
  if (data.nonce) {
    try {
      const decoded = atob(data.nonce);
      if (decoded.length !== 12) {
        throw new Error(`Nonce must be exactly 12 bytes, got ${decoded.length}`);
      }
    } catch (e) {
      throw new Error(`Invalid base64 nonce: ${e}`);
    }
  }
  return data;
});

export type DataFrame = z.infer<typeof DataFrameSchema>;

// Node hello frame
export const NodeHelloFrameSchema = z.object({
  type: z.literal('NodeHello').default('NodeHello'),
  systemId: z.string(), // Final system_id for this node (might be newly assigned)
  logicals: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  supportedTransports: z.array(z.string()).optional(),
  regionHint: z.string().optional(),
  instanceId: z.string(),
  securitySettings: SecuritySettingsSchema.optional()
    .describe('Desired security settings for the child node'),
});

export type NodeHelloFrame = z.infer<typeof NodeHelloFrameSchema>;

// Node welcome frame
export const NodeWelcomeFrameSchema = z.object({
  type: z.literal('NodeWelcome').default('NodeWelcome'),
  systemId: z.string(),
  targetSystemId: z.string().optional(),
  targetPhysicalPath: z.string().optional(),
  instanceId: z.string(),
  assignedPath: z.string().optional(),
  acceptedCapabilities: z.array(z.string()).optional(),
  acceptedLogicals: z.array(z.string()).optional(),
  rejectedLogicals: z.array(z.string()).optional(),
  connectionGrants: z.array(z.any()).optional(),
  expiresAt: z.string().datetime().optional(), // ISO string
  metadata: z.record(z.string(), z.any()).optional(),
  reason: z.string().optional(),
  securitySettings: SecuritySettingsSchema.optional()
    .describe('Security settings the parent expects the child to follow'),
});

export type NodeWelcomeFrame = z.infer<typeof NodeWelcomeFrameSchema>;

// Node attach frame
export const NodeAttachFrameSchema = z.object({
  type: z.literal('NodeAttach').default('NodeAttach'),
  originType: z.nativeEnum(DeliveryOriginType).default(DeliveryOriginType.DOWNSTREAM),
  systemId: z.string(),
  instanceId: z.string(),
  assignedPath: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  acceptedLogicals: z.array(z.string()).optional(),
  keys: z.array(z.record(z.string(), z.any())).optional(),
  callbackGrants: z.array(z.record(z.string(), z.any())).optional()
    .describe('List of inbound callback connection grants the child or peer supports for reverse connections initiated by the parent'),
  stickiness: StickinessSchema.optional()
    .describe('Stickiness negotiation payload (advertisement when sent by child)'),
});

export type NodeAttachFrame = z.infer<typeof NodeAttachFrameSchema>;

// Node attach acknowledgment frame
export const NodeAttachAckFrameSchema = DeliveryAckFrameSchema.extend({
  type: z.literal('NodeAttachAck').default('NodeAttachAck'),
  targetSystemId: z.string().optional(),
  assignedPath: z.string().optional(),
  targetPhysicalPath: z.string().optional(),
  routingEpoch: z.string().optional(),
  keys: z.array(z.record(z.string(), z.any())).optional(),
  expiresAt: z.string().datetime().optional(), // RFC 3339; optional lease time
  stickiness: StickinessSchema.optional()
    .describe('Stickiness negotiation payload (policy when sent by parent)'),
});

export type NodeAttachAckFrame = z.infer<typeof NodeAttachAckFrameSchema>;

// Capability advertise frame
export const CapabilityAdvertiseFrameSchema = z.object({
  type: z.literal('CapabilityAdvertise').default('CapabilityAdvertise'),
  capabilities: z.array(z.string()),
  address: FameAddressSchema,
});

export type CapabilityAdvertiseFrame = z.infer<typeof CapabilityAdvertiseFrameSchema>;

// Capability advertise acknowledgment frame
export const CapabilityAdvertiseAckFrameSchema = DeliveryAckFrameSchema.extend({
  type: z.literal('CapabilityAdvertiseAck').default('CapabilityAdvertiseAck'),
  capabilities: z.array(z.string()),
  address: FameAddressSchema,
});

export type CapabilityAdvertiseAckFrame = z.infer<typeof CapabilityAdvertiseAckFrameSchema>;

// Capability withdraw frame
export const CapabilityWithdrawFrameSchema = z.object({
  type: z.literal('CapabilityWithdraw').default('CapabilityWithdraw'),
  capabilities: z.array(z.string()),
  address: FameAddressSchema,
});

export type CapabilityWithdrawFrame = z.infer<typeof CapabilityWithdrawFrameSchema>;

// Capability withdraw acknowledgment frame
export const CapabilityWithdrawAckFrameSchema = DeliveryAckFrameSchema.extend({
  type: z.literal('CapabilityWithdrawAck').default('CapabilityWithdrawAck'),
  capabilities: z.array(z.string()),
  address: FameAddressSchema,
});

export type CapabilityWithdrawAckFrame = z.infer<typeof CapabilityWithdrawAckFrameSchema>;

// Key announce frame
export const KeyAnnounceFrameSchema = z.object({
  type: z.literal('KeyAnnounce').default('KeyAnnounce'),
  address: FameAddressSchema.optional(),
  physicalPath: z.string(),
  keys: z.array(z.record(z.string(), z.any())),
  created: z.string().datetime().default(() => new Date().toISOString())
    .describe('Key creation timestamp'),
  expires: z.string().datetime().optional()
    .describe('Key expiration timestamp'),
});

export type KeyAnnounceFrame = z.infer<typeof KeyAnnounceFrameSchema>;

// Key request frame
export const KeyRequestFrameSchema = z.object({
  type: z.literal('KeyRequest').default('KeyRequest'),
  kid: z.string().optional(),
  address: FameAddressSchema.optional(),
  physicalPath: z.string().optional(),
});

export type KeyRequestFrame = z.infer<typeof KeyRequestFrameSchema>;

// Secure open frame
export const SecureOpenFrameSchema = z.object({
  type: z.literal('SecureOpen').default('SecureOpen'),
  cid: z.string().describe('Client-chosen str for the new channel'),
  ephPub: z.string().describe('Base64-encoded 32-byte X25519 public key'),
  alg: z.string().default('CHACHA20P1305').describe('Channel encryption algorithm'),
  opts: z.number().default(0).describe('Bitfield for cipher-suite, PQ-hybrid flags, etc.'),
}).transform((data) => {
  // Validate ephemeral public key length
  try {
    const decoded = atob(data.ephPub);
    if (decoded.length !== 32) {
      throw new Error(`Ephemeral public key must be exactly 32 bytes, got ${decoded.length}`);
    }
  } catch (e) {
    throw new Error(`Invalid base64 ephemeral public key: ${e}`);
  }
  return data;
});

export type SecureOpenFrame = z.infer<typeof SecureOpenFrameSchema>;

// Secure accept frame
export const SecureAcceptFrameSchema = DeliveryAckFrameSchema.extend({
  type: z.literal('SecureAccept').default('SecureAccept'),
  cid: z.string(), // Channel id, same as in SecureOpen
  ephPub: z.string().describe('Base64-encoded server\'s 32-byte X25519 public key'),
  alg: z.string().default('CHACHA20P1305').describe('Channel encryption algorithm'),
}).transform((data) => {
  // Validate ephemeral public key length
  try {
    const decoded = atob(data.ephPub);
    if (decoded.length !== 32) {
      throw new Error(`Ephemeral public key must be exactly 32 bytes, got ${decoded.length}`);
    }
  } catch (e) {
    throw new Error(`Invalid base64 ephemeral public key: ${e}`);
  }
  return data;
});

export type SecureAcceptFrame = z.infer<typeof SecureAcceptFrameSchema>;

// Secure close frame
export const SecureCloseFrameSchema = z.object({
  type: z.literal('SecureClose').default('SecureClose'),
  cid: z.string(), // Channel id, same as in SecureOpen
  reason: z.string().optional().describe('Human-friendly reason code'),
});

export type SecureCloseFrame = z.infer<typeof SecureCloseFrameSchema>;

// Union type for all frame types
export const FameFrameUnionSchema = z.discriminatedUnion('type', [
  DeliveryAckFrameSchema,
  AddressBindFrameSchema,
  AddressBindAckFrameSchema,
  AddressUnbindFrameSchema,
  AddressUnbindAckFrameSchema,
  NodeHeartbeatFrameSchema,
  NodeHeartbeatAckFrameSchema,
  DataFrameSchema,
  NodeHelloFrameSchema,
  NodeWelcomeFrameSchema,
  NodeAttachFrameSchema,
  NodeAttachAckFrameSchema,
  CapabilityAdvertiseFrameSchema,
  CapabilityAdvertiseAckFrameSchema,
  CapabilityWithdrawFrameSchema,
  CapabilityWithdrawAckFrameSchema,
  KeyAnnounceFrameSchema,
  KeyRequestFrameSchema,
  SecureOpenFrameSchema,
  SecureAcceptFrameSchema,
  SecureCloseFrameSchema,
]);

export type FameFrameUnion = z.infer<typeof FameFrameUnionSchema>;