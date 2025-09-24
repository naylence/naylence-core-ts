import { FameAddress } from '../address/address';

/**
 * Channel interface for subscription management
 * This is a forward declaration - the actual Channel implementation will be defined in the channel module
 */
export interface Channel {
  // Placeholder interface - will be properly defined when porting the channel module
  [key: string]: any;
}

/**
 * Subscription class representing a binding between a channel and an address
 */
export class Subscription {
  constructor(
    public channel: Channel,
    public address: FameAddress
  ) {}

  /**
   * Create a subscription from an object
   */
  static fromObject(obj: { channel: Channel; address: FameAddress }): Subscription {
    return new Subscription(obj.channel, obj.address);
  }

  /**
   * Convert subscription to a plain object
   */
  toObject(): { channel: Channel; address: FameAddress } {
    return {
      channel: this.channel,
      address: this.address,
    };
  }

  /**
   * Get a string representation of the subscription
   */
  toString(): string {
    return `Subscription(channel=${this.channel}, address=${this.address})`;
  }
}