import { FameEnvelope } from '../protocol/envelope.js';
import { FameDeliveryContext } from '../protocol/delivery-context.js';

/**
 * Response containing an envelope to be delivered.
 */
export interface FameMessageResponse {
  envelope: FameEnvelope;
  context?: FameDeliveryContext;
}

/**
 * Helper function to create a message response
 */
export function createMessageResponse(
  envelope: FameEnvelope,
  context?: FameDeliveryContext
): FameMessageResponse {
  return context !== undefined ? { envelope, context } : { envelope };
}

/**
 * Type for message handlers that can process any message and return a response
 */
export type FameMessageHandler<T = any> = (
  message: T
) => Promise<any | FameMessageResponse | null | undefined>;

/**
 * Type for envelope handlers that process Fame envelopes with delivery context
 */
export type FameEnvelopeHandler = (
  envelope: FameEnvelope,
  context?: FameDeliveryContext
) => Promise<
  | FameMessageResponse
  | AsyncIterable<FameMessageResponse>
  | null
  | undefined
>;

/**
 * Type for RPC handlers that can return a result directly or a FameMessageResponse
 */
export type FameRPCHandler = (
  method: string,
  params?: Record<string, any>
) => Promise<any | FameMessageResponse | null | undefined>;

/**
 * Type guard to check if a response is a FameMessageResponse
 */
export function isFameMessageResponse(response: any): response is FameMessageResponse {
  return (
    response &&
    typeof response === 'object' &&
    'envelope' in response &&
    response.envelope &&
    typeof response.envelope === 'object' &&
    'frame' in response.envelope
  );
}

/**
 * Utility function to normalize handler responses
 */
export function normalizeHandlerResponse(
  response: any | FameMessageResponse | null | undefined
): FameMessageResponse | null {
  if (response === null || response === undefined) {
    return null;
  }
  
  if (isFameMessageResponse(response)) {
    return response;
  }
  
  // For any other response, we can't automatically convert it to a FameMessageResponse
  // This would need to be handled by the calling code
  return null;
}