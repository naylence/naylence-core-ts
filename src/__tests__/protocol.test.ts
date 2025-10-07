import { describe, it, expect } from '@jest/globals';
import { FameAddress } from '../naylence/fame/core/address/address';
import {
  DataFrameSchema,
  NodeHelloFrameSchema,
} from '../naylence/fame/core/protocol/frames';
import {
  createFameEnvelope,
  FameEnvelopeSchema,
  Priority,
} from '../naylence/fame/core/protocol/envelope';
import { FameResponseType } from '../naylence/fame/core/protocol/response-type';
import { FlowFlags } from '../naylence/fame/core/protocol/flow';

describe('Protocol Layer', () => {
  describe('Frames', () => {
    it('should create and validate a DataFr  ame', () => {
      const dataFrame = DataFrameSchema.parse({
        type: 'Data',
        payload: { message: 'Hello World' },
        codec: 'json',
      });

      expect(dataFrame.type).toBe('Data');
      expect(dataFrame.payload).toEqual({ message: 'Hello World' });
      expect(dataFrame.codec).toBe('json');
    });

    it('should create and validate a NodeHelloFrame', () => {
      const nodeHello = NodeHelloFrameSchema.parse({
        type: 'NodeHello',
        systemId: 'test-system',
        instanceId: 'test-instance-123',
        capabilities: ['compute', 'storage'],
      });

      expect(nodeHello.type).toBe('NodeHello');
      expect(nodeHello.systemId).toBe('test-system');
      expect(nodeHello.instanceId).toBe('test-instance-123');
      expect(nodeHello.capabilities).toEqual(['compute', 'storage']);
    });

    it('should validate nonce length for encrypted data frames', () => {
      const validNonce = btoa('123456789012'); // 12 bytes base64 encoded

      const dataFrame = DataFrameSchema.parse({
        type: 'Data',
        payload: 'encrypted-data',
        nonce: validNonce,
        cid: 'channel-123',
      });

      expect(dataFrame.nonce).toBe(validNonce);
      expect(dataFrame.cid).toBe('channel-123');
    });

    it('should reject invalid nonce length', () => {
      const invalidNonce = btoa('shortno'); // Less than 12 bytes

      expect(() => {
        DataFrameSchema.parse({
          type: 'Data',
          payload: 'encrypted-data',
          nonce: invalidNonce,
          cid: 'channel-123',
        });
      }).toThrow();
    });
  });

  describe('Envelope', () => {
    it('should create a Fame envelope with createFameEnvelope', () => {
      const frame = DataFrameSchema.parse({
        type: 'Data',
        payload: { test: 'data' },
      });

      const envelope = createFameEnvelope({
        frame,
        to: 'test@example.com/service',
        capabilities: ['test-capability'],
        responseType: FameResponseType.ACK,
      });

      expect(envelope.frame).toEqual(frame);
      expect(envelope.to).toBeInstanceOf(FameAddress);
      expect(envelope.to?.toString()).toBe('test@example.com/service');
      expect(envelope.capabilities).toEqual(['test-capability']);
      expect(envelope.rtype).toBe(FameResponseType.ACK);
      expect(envelope.id).toBeDefined();
      expect(envelope.ts).toBeInstanceOf(Date);
    });

    it('should parse envelope from object', () => {
      const envelopeData = {
        id: 'test-id-123',
        to: 'user@host.com/path',
        frame: {
          type: 'Data',
          payload: { message: 'Hello' },
        },
        priority: Priority.HIGH,
        flowFlags: FlowFlags.SYN,
      };

      const envelope = FameEnvelopeSchema.parse(envelopeData);

      expect(envelope.id).toBe('test-id-123');
      expect(envelope.to).toBeInstanceOf(FameAddress);
      expect(envelope.frame.type).toBe('Data');
      expect(envelope.priority).toBe(Priority.HIGH);
      expect(envelope.flowFlags).toBe(FlowFlags.SYN);
    });

    it('should handle timestamps correctly', () => {
      const testDate = new Date('2024-01-01T12:00:00.000Z');

      const envelope = createFameEnvelope({
        frame: { type: 'Data', payload: 'test' },
        timestamp: testDate,
      });

      expect(envelope.ts).toEqual(testDate);
    });

    it('should validate meta field restrictions', () => {
      const validMeta = {
        'string-field': 'value',
        'number-field': 42,
        'boolean-field': true,
        'array-field': ['a', 'b', 1, 2],
        'object-field': { nested: 'value' },
      };

      const envelope = FameEnvelopeSchema.parse({
        frame: { type: 'Data', payload: 'test' },
        meta: validMeta,
      });

      expect(envelope.meta).toEqual(validMeta);
    });
  });

  describe('Response Types', () => {
    it('should handle response type flags correctly', () => {
      expect(FameResponseType.NONE).toBe(0);
      expect(FameResponseType.ACK).toBe(1);
      expect(FameResponseType.REPLY).toBe(2);
      expect(FameResponseType.STREAM).toBe(4);

      // Test combination flags
      const ackAndReply = FameResponseType.ACK | FameResponseType.REPLY;
      expect(ackAndReply).toBe(3);
    });
  });

  describe('Flow Flags', () => {
    it('should handle flow flags correctly', () => {
      expect(FlowFlags.NONE).toBe(0);
      expect(FlowFlags.SYN).toBe(1);
      expect(FlowFlags.ACK).toBe(2);
      expect(FlowFlags.RESET).toBe(4);

      // Test combination
      const synAndAck = FlowFlags.SYN | FlowFlags.ACK;
      expect(synAndAck).toBe(3);
    });
  });
});
