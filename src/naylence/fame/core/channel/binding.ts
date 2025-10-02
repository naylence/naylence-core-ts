import { FameAddress } from '../address/address.js';
import { ReadWriteChannel } from './channel.js';

/**
 * Binding class representing a connection between a channel and an address
 */
export class Binding {
  constructor(
    public channel: ReadWriteChannel,
    public address: FameAddress
  ) {}

  /**
   * Create a binding from an object
   */
  static fromObject(obj: { channel: ReadWriteChannel; address: FameAddress }): Binding {
    return new Binding(obj.channel, obj.address);
  }

  /**
   * Convert binding to a plain object
   */
  toObject(): { channel: ReadWriteChannel; address: FameAddress } {
    return {
      channel: this.channel,
      address: this.address,
    };
  }

  /**
   * Get a string representation of the binding
   */
  toString(): string {
    return `Binding(channel=${this.channel}, address=${this.address})`;
  }

  /**
   * Close the binding and its channel
   */
  async close(): Promise<void> {
    if ('close' in this.channel && typeof this.channel.close === 'function') {
      await this.channel.close();
    }
  }
}