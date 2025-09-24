/**
 * A logical, transport-agnostic representation of a message channel.
 * Can be adapted into consumer/system-bound read/write variants.
 */
export interface Channel {
  // Base channel interface - can be extended by specific implementations
}

/**
 * A channel capable of reading messages.
 */
export interface ReadChannel extends Channel {
  /**
   * Pull the next available message. Returns null if no message is available.
   * Implementations should return an object with a unique 'id' field if acknowledgment is supported.
   */
  receive(timeout?: number): Promise<any>;

  /**
   * Optional operation.
   * Acknowledge a previously received message by its unique ID.
   * This is only meaningful for backends that track delivery state.
   */
  acknowledge(messageId: string): Promise<void>;
}

/**
 * A channel capable of writing messages.
 */
export interface WriteChannel extends Channel {
  /**
   * Send a message payload to the channel.
   * Payload format is backend-specific but must be serializable.
   */
  send(message: any): Promise<void>;
}

/**
 * A channel capable of both reading and writing.
 * This is the most common case for two-way message delivery flows.
 */
export interface ReadWriteChannel extends ReadChannel, WriteChannel {
  // Combines both read and write capabilities
}

/**
 * Type guards for channel interfaces
 */
export function isReadChannel(channel: Channel): channel is ReadChannel {
  return typeof (channel as ReadChannel).receive === 'function';
}

export function isWriteChannel(channel: Channel): channel is WriteChannel {
  return typeof (channel as WriteChannel).send === 'function';
}

export function isReadWriteChannel(channel: Channel): channel is ReadWriteChannel {
  return isReadChannel(channel) && isWriteChannel(channel);
}

/**
 * Base implementation of a simple channel
 */
export abstract class BaseChannel implements Channel {
  protected _closed = false;

  get closed(): boolean {
    return this._closed;
  }

  async close(): Promise<void> {
    this._closed = true;
  }

  protected checkNotClosed(): void {
    if (this._closed) {
      throw new Error('Channel is closed');
    }
  }
}

/**
 * Default timeout for channel operations
 */
export const DEFAULT_CHANNEL_TIMEOUT = 5000;