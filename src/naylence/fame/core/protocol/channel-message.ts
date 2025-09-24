/**
 * Message containers for binding channels that preserve delivery context.
 */

import { z } from 'zod';
import { FameEnvelope, FameEnvelopeSchema } from './envelope';
import { FameDeliveryContext, FameDeliveryContextSchema } from './delivery-context';

// Fame channel message schema
export const FameChannelMessageSchema = z.object({
  envelope: FameEnvelopeSchema,
  context: FameDeliveryContextSchema.optional(),
});

export type FameChannelMessageData = z.infer<typeof FameChannelMessageSchema>;

/**
 * Container for messages sent through binding channels.
 * 
 * This allows us to preserve delivery context while maintaining
 * backward compatibility with direct envelope messages.
 */
export class FameChannelMessage {
  constructor(
    public envelope: FameEnvelope,
    public context?: FameDeliveryContext
  ) {}

  static fromObject(obj: FameChannelMessageData): FameChannelMessage {
    return new FameChannelMessage(obj.envelope, obj.context);
  }

  toObject(): FameChannelMessageData {
    return {
      envelope: this.envelope,
      ...(this.context !== undefined && { context: this.context }),
    };
  }
}

// Type alias for messages that can be sent through binding channels
export type FameBindingChannelMessage = FameEnvelope | FameChannelMessage;

/**
 * Create a channel message, using the wrapped form only when context is present.
 * 
 * This preserves backward compatibility by sending raw envelopes when no context
 * is provided, but wraps them when context needs to be preserved.
 */
export function createChannelMessage(
  envelope: FameEnvelope,
  context?: FameDeliveryContext
): FameBindingChannelMessage {
  if (context !== undefined) {
    return new FameChannelMessage(envelope, context);
  } else {
    return envelope;
  }
}

/**
 * Extract envelope and context from a binding channel message.
 * 
 * @returns tuple of [envelope, context] where context may be undefined
 */
export function extractEnvelopeAndContext(
  message: FameBindingChannelMessage
): [FameEnvelope, FameDeliveryContext | undefined] {
  if (message instanceof FameChannelMessage) {
    return [message.envelope, message.context];
  } else if (message && typeof message === 'object' && 'frame' in message) {
    // It's a FameEnvelope
    return [message as FameEnvelope, undefined];
  } else {
    throw new TypeError(`Unexpected message type in binding channel: ${typeof message}`);
  }
}

/**
 * Type guard to check if a message is a FameChannelMessage
 */
export function isFameChannelMessage(message: FameBindingChannelMessage): message is FameChannelMessage {
  return message instanceof FameChannelMessage;
}

/**
 * Type guard to check if a message is a FameEnvelope
 */
export function isFameEnvelope(message: FameBindingChannelMessage): message is FameEnvelope {
  return !isFameChannelMessage(message) && typeof message === 'object' && 'frame' in message;
}