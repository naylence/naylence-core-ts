import {
  FameChannelMessage,
  FameChannelMessageData,
  FameChannelMessageSchema,
  FameBindingChannelMessage,
  createChannelMessage,
  extractEnvelopeAndContext,
  isFameChannelMessage,
  isFameEnvelope
} from "../naylence/fame/core/protocol/channel-message";
import { FameEnvelope, createFameEnvelope } from "../naylence/fame/core/protocol/envelope";
import { FameDeliveryContext, localDeliveryContext } from "../naylence/fame/core/protocol/delivery-context";
import { FameResponseType } from "../naylence/fame/core/protocol/response-type";

describe("Channel Message", () => {
  let mockEnvelope: FameEnvelope;
  let mockContext: FameDeliveryContext;

  beforeEach(() => {
    mockEnvelope = createFameEnvelope({
      frame: {
        type: "Data",
        payload: { message: "test" }
      },
      to: "test-target@mock.host",
      responseType: FameResponseType.ACK
    });

    mockContext = localDeliveryContext();
  });

  describe("FameChannelMessage Class", () => {
    describe("constructor", () => {
      it("should create channel message with envelope only", () => {
        const channelMessage = new FameChannelMessage(mockEnvelope);
        
        expect(channelMessage.envelope).toBe(mockEnvelope);
        expect(channelMessage.context).toBeUndefined();
      });

      it("should create channel message with envelope and context", () => {
        const channelMessage = new FameChannelMessage(mockEnvelope, mockContext);
        
        expect(channelMessage.envelope).toBe(mockEnvelope);
        expect(channelMessage.context).toBe(mockContext);
      });

      it("should create channel message with null context", () => {
        const channelMessage = new FameChannelMessage(mockEnvelope, null as any);
        
        expect(channelMessage.envelope).toBe(mockEnvelope);
        expect(channelMessage.context).toBe(null);
      });
    });

    describe("fromObject", () => {
      it("should create channel message from object with envelope only", () => {
        const data: FameChannelMessageData = {
          envelope: mockEnvelope
        };
        
        const channelMessage = FameChannelMessage.fromObject(data);
        
        expect(channelMessage.envelope).toBe(mockEnvelope);
        expect(channelMessage.context).toBeUndefined();
      });

      it("should create channel message from object with envelope and context", () => {
        const data: FameChannelMessageData = {
          envelope: mockEnvelope,
          context: mockContext
        };
        
        const channelMessage = FameChannelMessage.fromObject(data);
        
        expect(channelMessage.envelope).toBe(mockEnvelope);
        expect(channelMessage.context).toBe(mockContext);
      });
    });

    describe("toObject", () => {
      it("should convert to object with envelope only when no context", () => {
        const channelMessage = new FameChannelMessage(mockEnvelope);
        
        const obj = channelMessage.toObject();
        
        expect(obj).toEqual({ envelope: mockEnvelope });
        expect(obj).not.toHaveProperty("context");
      });

      it("should convert to object with envelope and context when context present", () => {
        const channelMessage = new FameChannelMessage(mockEnvelope, mockContext);
        
        const obj = channelMessage.toObject();
        
        expect(obj).toEqual({ envelope: mockEnvelope, context: mockContext });
      });

      it("should convert to object with null context when context is null", () => {
        const channelMessage = new FameChannelMessage(mockEnvelope, null as any);
        
        const obj = channelMessage.toObject();
        
        expect(obj).toEqual({ envelope: mockEnvelope, context: null });
      });
    });
  });

  describe("Schema Validation", () => {
    it("should validate valid channel message data with envelope only", () => {
      // Create raw data that matches schema expectations
      const data = {
        envelope: {
          id: "test-id",
          to: "test-target@mock.host",
          frame: {
            type: "Data",
            payload: { message: "test" }
          }
        }
      };
      
      const result = FameChannelMessageSchema.parse(data);
      
      expect(result.envelope).toBeDefined();
      expect(result.context).toBeUndefined();
    });

    it("should validate valid channel message data with envelope and context", () => {
      // Create raw data that matches schema expectations
      const data = {
        envelope: {
          id: "test-id",
          to: "test-target@mock.host",
          frame: {
            type: "Data",
            payload: { message: "test" }
          }
        },
        context: {
          expectedResponseType: 1  // FameResponseType.ACK
        }
      };
      
      const result = FameChannelMessageSchema.parse(data);
      
      expect(result.envelope).toBeDefined();
      expect(result.context).toBeDefined();
    });
  });

  describe("createChannelMessage", () => {
    it("should return envelope directly when no context provided", () => {
      const result = createChannelMessage(mockEnvelope);
      
      expect(result).toBe(mockEnvelope);
      expect(result).not.toBeInstanceOf(FameChannelMessage);
    });

    it("should return envelope directly when context is explicitly undefined", () => {
      const result = createChannelMessage(mockEnvelope, undefined);
      
      expect(result).toBe(mockEnvelope);
      expect(result).not.toBeInstanceOf(FameChannelMessage);
    });

    it("should return FameChannelMessage when context is provided", () => {
      const result = createChannelMessage(mockEnvelope, mockContext);
      
      expect(result).toBeInstanceOf(FameChannelMessage);
      expect((result as FameChannelMessage).envelope).toBe(mockEnvelope);
      expect((result as FameChannelMessage).context).toBe(mockContext);
    });

    it("should return FameChannelMessage when context is null", () => {
      const result = createChannelMessage(mockEnvelope, null as any);
      
      expect(result).toBeInstanceOf(FameChannelMessage);
      expect((result as FameChannelMessage).envelope).toBe(mockEnvelope);
      expect((result as FameChannelMessage).context).toBe(null);
    });
  });

  describe("extractEnvelopeAndContext", () => {
    it("should extract envelope and context from FameChannelMessage", () => {
      const channelMessage = new FameChannelMessage(mockEnvelope, mockContext);
      
      const [envelope, context] = extractEnvelopeAndContext(channelMessage);
      
      expect(envelope).toBe(mockEnvelope);
      expect(context).toBe(mockContext);
    });

    it("should extract envelope and undefined context from FameChannelMessage without context", () => {
      const channelMessage = new FameChannelMessage(mockEnvelope);
      
      const [envelope, context] = extractEnvelopeAndContext(channelMessage);
      
      expect(envelope).toBe(mockEnvelope);
      expect(context).toBeUndefined();
    });

    it("should extract envelope and undefined context from direct envelope", () => {
      const [envelope, context] = extractEnvelopeAndContext(mockEnvelope);
      
      expect(envelope).toBe(mockEnvelope);
      expect(context).toBeUndefined();
    });

    it("should throw TypeError for invalid message type", () => {
      const invalidMessage = "not a valid message" as any;
      
      expect(() => extractEnvelopeAndContext(invalidMessage)).toThrow(TypeError);
      expect(() => extractEnvelopeAndContext(invalidMessage)).toThrow("Unexpected message type in binding channel: string");
    });

    it("should throw TypeError for null message", () => {
      const nullMessage = null as any;
      
      expect(() => extractEnvelopeAndContext(nullMessage)).toThrow(TypeError);
      expect(() => extractEnvelopeAndContext(nullMessage)).toThrow("Unexpected message type in binding channel: object");
    });

    it("should throw TypeError for undefined message", () => {
      const undefinedMessage = undefined as any;
      
      expect(() => extractEnvelopeAndContext(undefinedMessage)).toThrow(TypeError);
      expect(() => extractEnvelopeAndContext(undefinedMessage)).toThrow("Unexpected message type in binding channel: undefined");
    });

    it("should throw TypeError for object without frame property", () => {
      const invalidObject = { data: "test" } as any;
      
      expect(() => extractEnvelopeAndContext(invalidObject)).toThrow(TypeError);
      expect(() => extractEnvelopeAndContext(invalidObject)).toThrow("Unexpected message type in binding channel: object");
    });

    it("should handle objects with frame property as FameEnvelope", () => {
      const objectWithFrame = { frame: { type: "Data", payload: {} }, id: "test" } as any;
      
      const [envelope, context] = extractEnvelopeAndContext(objectWithFrame);
      
      expect(envelope).toBe(objectWithFrame);
      expect(context).toBeUndefined();
    });
  });

  describe("Type Guards", () => {
    describe("isFameChannelMessage", () => {
      it("should return true for FameChannelMessage instances", () => {
        const channelMessage = new FameChannelMessage(mockEnvelope, mockContext);
        
        expect(isFameChannelMessage(channelMessage)).toBe(true);
      });

      it("should return false for FameEnvelope", () => {
        expect(isFameChannelMessage(mockEnvelope)).toBe(false);
      });

      it("should return false for other objects", () => {
        expect(isFameChannelMessage({ frame: {} } as any)).toBe(false);
        expect(isFameChannelMessage({} as any)).toBe(false);
        expect(isFameChannelMessage(null as any)).toBe(false);
        expect(isFameChannelMessage(undefined as any)).toBe(false);
      });

      it("should return false for primitive values", () => {
        expect(isFameChannelMessage("string" as any)).toBe(false);
        expect(isFameChannelMessage(123 as any)).toBe(false);
        expect(isFameChannelMessage(true as any)).toBe(false);
      });
    });

    describe("isFameEnvelope", () => {
      it("should return true for FameEnvelope objects", () => {
        expect(isFameEnvelope(mockEnvelope)).toBe(true);
      });

      it("should return true for objects with frame property", () => {
        const objectWithFrame = { frame: { type: "Data", payload: {} } } as any;
        
        expect(isFameEnvelope(objectWithFrame)).toBe(true);
      });

      it("should return false for FameChannelMessage instances", () => {
        const channelMessage = new FameChannelMessage(mockEnvelope, mockContext);
        
        expect(isFameEnvelope(channelMessage)).toBe(false);
      });

      it("should return false for objects without frame property", () => {
        expect(isFameEnvelope({ data: "test" } as any)).toBe(false);
        expect(isFameEnvelope({} as any)).toBe(false);
      });

      it("should throw error for null but return false for undefined", () => {
        expect(() => isFameEnvelope(null as any)).toThrow();
        expect(isFameEnvelope(undefined as any)).toBe(false);
      });

      it("should return false for primitive values", () => {
        expect(isFameEnvelope("string" as any)).toBe(false);
        expect(isFameEnvelope(123 as any)).toBe(false);
        expect(isFameEnvelope(true as any)).toBe(false);
      });
    });
  });

  describe("Integration", () => {
    it("should handle round-trip conversion for channel message with context", () => {
      // Create channel message
      const original = createChannelMessage(mockEnvelope, mockContext);
      
      // Extract data
      const [envelope, context] = extractEnvelopeAndContext(original);
      
      // Recreate
      const recreated = createChannelMessage(envelope, context);
      
      expect(isFameChannelMessage(original)).toBe(true);
      expect(isFameChannelMessage(recreated)).toBe(true);
      expect((recreated as FameChannelMessage).envelope).toEqual(mockEnvelope);
      expect((recreated as FameChannelMessage).context).toEqual(mockContext);
    });

    it("should handle round-trip conversion for direct envelope", () => {
      // Create direct envelope message
      const original = createChannelMessage(mockEnvelope);
      
      // Extract data
      const [envelope, context] = extractEnvelopeAndContext(original);
      
      // Recreate
      const recreated = createChannelMessage(envelope, context);
      
      expect(isFameEnvelope(original)).toBe(true);
      expect(isFameEnvelope(recreated)).toBe(true);
      expect(recreated).toBe(mockEnvelope);
    });

    it("should work with fromObject and toObject", () => {
      const channelMessage = new FameChannelMessage(mockEnvelope, mockContext);
      const data = channelMessage.toObject();
      const recreated = FameChannelMessage.fromObject(data);
      
      expect(recreated.envelope).toEqual(mockEnvelope);
      expect(recreated.context).toEqual(mockContext);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty envelope object", () => {
      const emptyEnvelope = {} as FameEnvelope;
      const channelMessage = new FameChannelMessage(emptyEnvelope);
      
      expect(channelMessage.envelope).toBe(emptyEnvelope);
    });

    it("should handle complex context objects", () => {
      const complexContext = {
        ...mockContext,
        meta: { customProperty: "value", nested: { data: 123 } }
      } as FameDeliveryContext;
      
      const channelMessage = new FameChannelMessage(mockEnvelope, complexContext);
      const obj = channelMessage.toObject();
      const recreated = FameChannelMessage.fromObject(obj);
      
      expect(recreated.context).toEqual(complexContext);
    });

    it("should handle mixed type scenarios", () => {
      const messages: FameBindingChannelMessage[] = [
        mockEnvelope,
        new FameChannelMessage(mockEnvelope),
        new FameChannelMessage(mockEnvelope, mockContext)
      ];
      
      messages.forEach(message => {
        const [envelope, context] = extractEnvelopeAndContext(message);
        expect(envelope).toBeDefined();
        expect(typeof envelope).toBe("object");
      });
    });
  });
});