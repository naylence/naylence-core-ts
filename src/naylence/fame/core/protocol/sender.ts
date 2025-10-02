import { FameEnvelope } from './envelope.js';

/**
 * Protocol interface for sending Fame envelopes
 * TypeScript equivalent of Python's SenderProtocol
 */
export interface SenderProtocol {
  (envelope: FameEnvelope): Promise<void>;
}

/**
 * Type alias for sender functions
 */
export type Sender = SenderProtocol;