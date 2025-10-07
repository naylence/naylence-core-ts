import {
  Subscription,
  Channel,
} from '../naylence/fame/core/service/subscription';
import { FameAddress } from '../naylence/fame/core/address/address';

describe('Subscription', () => {
  // Mock Channel implementation for testing
  class MockChannel implements Channel {
    constructor(public _id: string = 'test-channel') {}

    // Add any additional properties as needed
    [key: string]: unknown;
  }

  describe('Subscription class', () => {
    let mockChannel: MockChannel;
    let testAddress: FameAddress;

    beforeEach(() => {
      mockChannel = new MockChannel('test-channel-1');
      testAddress = new FameAddress('user@example.com/api');
    });

    describe('constructor', () => {
      it('should create subscription with channel and address', () => {
        const subscription = new Subscription(mockChannel, testAddress);

        expect(subscription.channel).toBe(mockChannel);
        expect(subscription.address).toBe(testAddress);
      });

      it('should create subscription with different channel types', () => {
        const differentChannel = { id: 'different', type: 'websocket' };
        const subscription = new Subscription(differentChannel, testAddress);

        expect(subscription.channel).toBe(differentChannel);
        expect(subscription.address).toBe(testAddress);
      });
    });

    describe('fromObject', () => {
      it('should create subscription from object', () => {
        const obj = {
          channel: mockChannel,
          address: testAddress,
        };

        const subscription = Subscription.fromObject(obj);

        expect(subscription).toBeInstanceOf(Subscription);
        expect(subscription.channel).toBe(mockChannel);
        expect(subscription.address).toBe(testAddress);
      });

      it('should create subscription from object with complex channel', () => {
        const complexChannel = {
          id: 'complex-channel',
          protocol: 'websocket',
          metadata: { version: '1.0' },
          handlers: ['onMessage', 'onClose'],
        };

        const obj = {
          channel: complexChannel,
          address: testAddress,
        };

        const subscription = Subscription.fromObject(obj);

        expect(subscription.channel).toBe(complexChannel);
        expect(subscription.address).toBe(testAddress);
      });
    });

    describe('toObject', () => {
      it('should convert subscription to object', () => {
        const subscription = new Subscription(mockChannel, testAddress);

        const obj = subscription.toObject();

        expect(obj).toEqual({
          channel: mockChannel,
          address: testAddress,
        });
      });

      it('should convert subscription with complex data to object', () => {
        const complexChannel = {
          id: 'complex',
          data: { nested: { value: 123 } },
        };
        const complexAddress = new FameAddress('service@*.example.com/api/v2');

        const subscription = new Subscription(complexChannel, complexAddress);
        const obj = subscription.toObject();

        expect(obj.channel).toBe(complexChannel);
        expect(obj.address).toBe(complexAddress);
      });

      it('should create objects that can round-trip', () => {
        const subscription1 = new Subscription(mockChannel, testAddress);
        const obj = subscription1.toObject();
        const subscription2 = Subscription.fromObject(obj);

        expect(subscription2.channel).toEqual(subscription1.channel);
        expect(subscription2.address).toEqual(subscription1.address);
      });
    });

    describe('toString', () => {
      it('should provide string representation', () => {
        const subscription = new Subscription(mockChannel, testAddress);

        const result = subscription.toString();

        expect(result).toBe(
          `Subscription(channel=${mockChannel}, address=${testAddress})`
        );
      });

      it('should handle complex channel in string representation', () => {
        const complexChannel = {
          id: 'test',
          toString: () => '[CustomChannel]',
        };

        const subscription = new Subscription(complexChannel, testAddress);
        const result = subscription.toString();

        expect(result).toContain('Subscription(channel=');
        expect(result).toContain('address=');
      });

      it('should handle different address formats in string representation', () => {
        const pathOnlyAddress = new FameAddress('user@/api');
        const hostOnlyAddress = new FameAddress('service@example.com');
        const wildcardAddress = new FameAddress('user@*.example.com');

        const sub1 = new Subscription(mockChannel, pathOnlyAddress);
        const sub2 = new Subscription(mockChannel, hostOnlyAddress);
        const sub3 = new Subscription(mockChannel, wildcardAddress);

        expect(sub1.toString()).toContain('user@/api');
        expect(sub2.toString()).toContain('service@example.com');
        expect(sub3.toString()).toContain('user@*.example.com');
      });
    });

    describe('edge cases and integration', () => {
      it('should handle subscription with null-like channel properties', () => {
        const channelWithNulls = {
          id: null,
          data: undefined,
          handlers: [],
        };

        const subscription = new Subscription(channelWithNulls, testAddress);

        expect(subscription.channel).toBe(channelWithNulls);
        expect(subscription.toObject().channel).toBe(channelWithNulls);
      });

      it('should handle subscription lifecycle operations', () => {
        const subscription = new Subscription(mockChannel, testAddress);

        // Test object conversion
        const obj = subscription.toObject();
        const reconstructed = Subscription.fromObject(obj);

        // Test string representation
        const str = reconstructed.toString();

        expect(reconstructed.channel.id).toBe(mockChannel.id);
        expect(reconstructed.address.toString()).toBe(testAddress.toString());
        expect(str).toContain('Subscription');
      });

      it('should work with various channel implementations', () => {
        const channelTypes = [
          { type: 'http', id: 'http-1' },
          { type: 'websocket', id: 'ws-1', url: 'ws://example.com' },
          { type: 'grpc', id: 'grpc-1', port: 9090 },
          mockChannel,
        ];

        channelTypes.forEach((channel) => {
          const subscription = new Subscription(channel, testAddress);
          expect(subscription.channel).toBe(channel);

          const obj = subscription.toObject();
          expect(obj.channel).toBe(channel);

          const reconstructed = Subscription.fromObject(obj);
          expect(reconstructed.channel).toBe(channel);
        });
      });
    });
  });
});
