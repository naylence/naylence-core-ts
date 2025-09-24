import { 
  FameEnvelopeSchema, 
  FameEnvelope, 
  Priority, 
  ENVELOPE_VERSION,
  createFameEnvelope,
  CreateFameEnvelopeOptions,
  envelopeFromDict,
  serializeEnvelope,
  deserializeEnvelope,
  MetaValue,
  AllFramesUnion
} from "../naylence/fame/core/protocol/envelope";
import { FlowFlags } from "../naylence/fame/core/protocol/flow";
import { FameResponseType } from "../naylence/fame/core/protocol/response-type";
import { FameAddress } from "../naylence/fame/core/address/address";

describe("Envelope Serialization", () => {
  
  // Helper to create valid data frame
  const createDataFrame = (payload: unknown = "test") => ({
    type: "Data" as const,
    payload
  });
  
  // Helper to create valid heartbeat frame
  const createHeartbeatFrame = () => ({
    type: "NodeHeartbeat" as const,
    nodeId: "test-node"
  });
  
  // Helper to create valid heartbeat ack frame
  const createHeartbeatAckFrame = () => ({
    type: "NodeHeartbeatAck" as const,
    ok: true,
    nodeId: "test-node"
  });
  
  // Basic envelope creation
  describe("FameEnvelopeSchema", () => {
    
    it("should create envelope with minimal required data", () => {
      const frame = createDataFrame();
      const envelope = FameEnvelopeSchema.parse({ frame });
      
      expect(envelope).toBeDefined();
      expect(envelope.version).toBe(ENVELOPE_VERSION);
      expect(envelope.id).toBeDefined();
      expect(envelope.ts).toBeInstanceOf(Date);
      expect(envelope.frame).toEqual(frame);
      expect(envelope.seqId).toBe(0);
      expect(envelope.flowFlags).toBe(FlowFlags.NONE);
    });
    
    it("should create envelope with all optional fields", () => {
      const frame = createHeartbeatFrame();
      const now = new Date();
      const data = {
        frame,
        version: "2.0",
        id: "custom-id",
        sid: "source-id",
        traceId: "trace-123",
        to: "user@example.com",
        replyTo: "sender@example.com",
        capabilities: ["cap1", "cap2"],
        rtype: FameResponseType.ACK,
        corrId: "corr-123",
        flowId: "flow-456",
        seqId: 42,
        flowFlags: FlowFlags.SYN,
        ttl: 10,
        priority: Priority.HIGH,
        ts: now,
        sec: { 
          sig: { val: "signature", alg: "EdDSA" },
          enc: { val: "encrypted", alg: "ECDH-ES+A256GCM" }
        },
        aft: "affinity-tag",
        meta: { key1: "value1", key2: 42 }
      };
      
      const envelope = FameEnvelopeSchema.parse(data);
      
      expect(envelope.version).toBe("2.0");
      expect(envelope.id).toBe("custom-id");
      expect(envelope.sid).toBe("source-id");
      expect(envelope.traceId).toBe("trace-123");
      expect(envelope.to).toBeInstanceOf(FameAddress);
      expect(envelope.to?.toString()).toBe("user@example.com");
      expect(envelope.replyTo).toBeInstanceOf(FameAddress);
      expect(envelope.replyTo?.toString()).toBe("sender@example.com");
      expect(envelope.capabilities).toEqual(["cap1", "cap2"]);
      expect(envelope.rtype).toBe(FameResponseType.ACK);
      expect(envelope.corrId).toBe("corr-123");
      expect(envelope.flowId).toBe("flow-456");
      expect(envelope.seqId).toBe(42);
      expect(envelope.flowFlags).toBe(FlowFlags.SYN);
      expect(envelope.ttl).toBe(10);
      expect(envelope.priority).toBe(Priority.HIGH);
      expect(envelope.ts).toEqual(now);
      expect(envelope.sec).toEqual({
        sig: { val: "signature", alg: "EdDSA" },
        enc: { val: "encrypted", alg: "ECDH-ES+A256GCM" }
      });
      expect(envelope.aft).toBe("affinity-tag");
      expect(envelope.meta).toEqual({ key1: "value1", key2: 42 });
    });
    
    // Test with Date object timestamp - schema expects Date objects
    it("should handle Date timestamp correctly", () => {
      const frame = createDataFrame();
      const timestamp = new Date("2023-12-01T10:30:00.000Z");
      
      const envelope = FameEnvelopeSchema.parse({
        frame,
        ts: timestamp
      });
      
      expect(envelope.ts).toBeInstanceOf(Date);
      expect(envelope.ts.toISOString()).toBe("2023-12-01T10:30:00.000Z");
    });
    
    it("should validate meta value types", () => {
      const frame = createDataFrame();
      
      // Valid meta values
      const validMeta = {
        stringValue: "hello",
        numberValue: 42,
        booleanValue: true,
        arrayValue: ["a", 1, true],
        objectValue: { nested: "value", count: 5 }
      };
      
      const envelope = FameEnvelopeSchema.parse({
        frame,
        meta: validMeta
      });
      
      expect(envelope.meta).toEqual(validMeta);
    });
    
    it("should reject invalid meta value types", () => {
      const frame = createDataFrame();
      
      // Invalid meta values - nested objects
      expect(() => {
        FameEnvelopeSchema.parse({
          frame,
          meta: {
            invalidNested: { deep: { nested: "value" } }
          }
        });
      }).toThrow();
      
      // Invalid meta values - functions
      expect(() => {
        FameEnvelopeSchema.parse({
          frame,
          meta: {
            invalidFunction: () => "test"
          }
        });
      }).toThrow();
    });
    
    it("should validate priority enum values", () => {
      const frame = createDataFrame();
      
      // Valid priority values
      Object.values(Priority).forEach(priority => {
        const envelope = FameEnvelopeSchema.parse({
          frame,
          priority
        });
        expect(envelope.priority).toBe(priority);
      });
      
      // Invalid priority value
      expect(() => {
        FameEnvelopeSchema.parse({
          frame,
          priority: "invalid"
        });
      }).toThrow();
    });
  });
  
  describe("Priority Enum", () => {
    it("should have all expected priority values", () => {
      expect(Priority.LOW).toBe("low");
      expect(Priority.NORMAL).toBe("normal");
      expect(Priority.HIGH).toBe("high");
      expect(Priority.SPECULATIVE).toBe("speculative");
    });
  });
  
  describe("createFameEnvelope Function", () => {
    
    it("should create envelope with minimal options", () => {
      const frame = createDataFrame();
      const options: CreateFameEnvelopeOptions = { frame };
      
      const envelope = createFameEnvelope(options);
      
      expect(envelope.frame).toEqual(frame);
      expect(envelope.id).toBeDefined();
      expect(envelope.traceId).toBeDefined();
      expect(envelope.ts).toBeInstanceOf(Date);
      expect(envelope.seqId).toBe(0);
      expect(envelope.flowFlags).toBe(FlowFlags.NONE);
    });
    
    it("should create envelope with string address", () => {
      const frame = createDataFrame();
      const options: CreateFameEnvelopeOptions = {
        frame,
        to: "user@example.com"
      };
      
      const envelope = createFameEnvelope(options);
      
      expect(envelope.to).toBeInstanceOf(FameAddress);
      expect(envelope.to?.toString()).toBe("user@example.com");
    });
    
    it("should create envelope with FameAddress object", () => {
      const frame = createDataFrame();
      const address = new FameAddress("user@example.com");
      const options: CreateFameEnvelopeOptions = {
        frame,
        to: address
      };
      
      const envelope = createFameEnvelope(options);
      
      expect(envelope.to).toBeInstanceOf(FameAddress);
      expect(envelope.to?.toString()).toBe("user@example.com");
    });
    
    it("should create envelope with replyTo address", () => {
      const frame = createDataFrame();
      const replyTo = new FameAddress("sender@example.com");
      const options: CreateFameEnvelopeOptions = {
        frame,
        replyTo
      };
      
      const envelope = createFameEnvelope(options);
      
      expect(envelope.replyTo).toBeInstanceOf(FameAddress);
      expect(envelope.replyTo?.toString()).toBe("sender@example.com");
    });
    
    it("should create envelope with all options", () => {
      const frame = createDataFrame();
      const timestamp = new Date();
      const options: CreateFameEnvelopeOptions = {
        frame,
        id: "custom-id",
        sid: "source-id",
        traceId: "trace-123",
        to: "user@example.com",
        capabilities: ["cap1", "cap2"],
        responseType: FameResponseType.ACK,
        replyTo: new FameAddress("sender@example.com"),
        flowId: "flow-456",
        windowId: 42,
        flags: FlowFlags.ACK,
        corrId: "corr-123",
        timestamp
      };
      
      const envelope = createFameEnvelope(options);
      
      expect(envelope.id).toBe("custom-id");
      expect(envelope.sid).toBe("source-id");
      expect(envelope.traceId).toBe("trace-123");
      expect(envelope.to).toBeInstanceOf(FameAddress);
      expect(envelope.to?.toString()).toBe("user@example.com");
      expect(envelope.capabilities).toEqual(["cap1", "cap2"]);
      expect(envelope.rtype).toBe(FameResponseType.ACK);
      expect(envelope.replyTo).toBeInstanceOf(FameAddress);
      expect(envelope.replyTo?.toString()).toBe("sender@example.com");
      expect(envelope.flowId).toBe("flow-456");
      expect(envelope.seqId).toBe(42);
      expect(envelope.flowFlags).toBe(FlowFlags.ACK);
      expect(envelope.corrId).toBe("corr-123");
      expect(envelope.ts).toBe(timestamp);
    });
    
    it("should generate default traceId when not provided", () => {
      const frame = createDataFrame();
      const options: CreateFameEnvelopeOptions = { frame };
      
      const envelope = createFameEnvelope(options);
      
      expect(envelope.traceId).toBeDefined();
      expect(envelope.traceId).not.toBe(envelope.id);
    });
  });
  
  describe("envelopeFromDict Function", () => {
    
    it("should create envelope from dictionary", () => {
      const data = {
        frame: createDataFrame(),
        id: "dict-id",
        traceId: "dict-trace"
      };
      
      const envelope = envelopeFromDict(data);
      
      expect(envelope.id).toBe("dict-id");
      expect(envelope.traceId).toBe("dict-trace");
      expect(envelope.frame).toEqual(createDataFrame());
    });
    
    it("should apply schema defaults for missing fields", () => {
      const data = {
        frame: createDataFrame()
      };
      
      const envelope = envelopeFromDict(data);
      
      expect(envelope.version).toBe(ENVELOPE_VERSION);
      expect(envelope.id).toBeDefined();
      expect(envelope.ts).toBeInstanceOf(Date);
      expect(envelope.seqId).toBe(0);
      expect(envelope.flowFlags).toBe(FlowFlags.NONE);
    });
    
    it("should validate data according to schema", () => {
      const invalidData = {
        frame: createDataFrame(),
        priority: "invalid-priority"
      };
      
      expect(() => envelopeFromDict(invalidData)).toThrow();
    });
  });
  
  describe("Envelope Serialization Functions", () => {
    
    describe("serializeEnvelope", () => {
      
      it("should serialize envelope with camelCase to snake_case conversion", () => {
        const envelope: FameEnvelope = {
          version: ENVELOPE_VERSION,
          id: "test-id",
          traceId: "trace-123",
          replyTo: "sender@example.com",
          corrId: "corr-123",
          flowId: "flow-456",
          seqId: 42,
          flowFlags: FlowFlags.RESET,
          frame: createDataFrame(),
          ts: new Date("2023-12-01T10:30:00.000Z")
        };
        
        const serialized = serializeEnvelope(envelope);
        
        expect(serialized.trace_id).toBe("trace-123");
        expect(serialized.reply_to).toBe("sender@example.com");
        expect(serialized.corr_id).toBe("corr-123");
        expect(serialized.flow_id).toBe("flow-456");
        expect(serialized.seq_id).toBe(42);
        expect(serialized.flow_flags).toBe(FlowFlags.RESET);
        expect(serialized.ts).toBe("2023-12-01T10:30:00.000Z");
      });
      
      it("should convert Date to ISO string", () => {
        const date = new Date("2023-12-01T10:30:00.123Z");
        const envelope: FameEnvelope = {
          version: ENVELOPE_VERSION,
          id: "test-id",
          frame: createDataFrame(),
          ts: date
        };
        
        const serialized = serializeEnvelope(envelope);
        
        expect(serialized.ts).toBe("2023-12-01T10:30:00.123Z");
      });
      
      it("should mask security header when safeLog is enabled", () => {
        const envelope: FameEnvelope = {
          version: ENVELOPE_VERSION,
          id: "test-id",
          frame: createDataFrame(),
          ts: new Date(),
          sec: { 
            sig: { val: "signature", alg: "EdDSA" },
            enc: { val: "encrypted", alg: "ECDH-ES+A256GCM" }
          }
        };
        
        const serialized = serializeEnvelope(envelope, { safeLog: true });
        
        expect(serialized.sec).toBe("<hidden>");
      });
      
      it("should not mask security header when safeLog is disabled", () => {
        const secHeader = { 
          sig: { val: "signature", alg: "EdDSA" },
          enc: { val: "encrypted", alg: "ECDH-ES+A256GCM" }
        };
        const envelope: FameEnvelope = {
          version: ENVELOPE_VERSION,
          id: "test-id",
          frame: createDataFrame(),
          ts: new Date(),
          sec: secHeader
        };
        
        const serialized = serializeEnvelope(envelope, { safeLog: false });
        
        expect(serialized.sec).toEqual(secHeader);
      });
      
      it("should handle envelope without security header safely", () => {
        const envelope: FameEnvelope = {
          version: ENVELOPE_VERSION,
          id: "test-id",
          frame: createDataFrame(),
          ts: new Date()
        };
        
        const serialized = serializeEnvelope(envelope, { safeLog: true });
        
        expect(serialized.sec).toBeUndefined();
      });
    });
    
    describe("deserializeEnvelope", () => {
      
      it("should deserialize envelope with snake_case to camelCase conversion", () => {
        const data = {
          version: ENVELOPE_VERSION,
          id: "test-id",
          trace_id: "trace-123",
          reply_to: "sender@example.com",
          corr_id: "corr-123",
          flow_id: "flow-456",
          seq_id: 42,
          flow_flags: FlowFlags.RESET,
          frame: createDataFrame(),
          ts: new Date("2023-12-01T10:30:00.000Z")
        };
        
        const envelope = deserializeEnvelope(data);
        
        expect(envelope.traceId).toBe("trace-123");
        expect(envelope.replyTo).toBeInstanceOf(FameAddress);
        expect(envelope.replyTo?.toString()).toBe("sender@example.com");
        expect(envelope.corrId).toBe("corr-123");
        expect(envelope.flowId).toBe("flow-456");
        expect(envelope.seqId).toBe(42);
        expect(envelope.flowFlags).toBe(FlowFlags.RESET);
        expect(envelope.ts).toBeInstanceOf(Date);
        expect(envelope.ts.toISOString()).toBe("2023-12-01T10:30:00.000Z");
      });
      
      it("should handle missing snake_case fields", () => {
        const data = {
          id: "test-id",
          frame: createDataFrame(),
          traceId: "camel-case-trace"  // Keep some camelCase
        };
        
        const envelope = deserializeEnvelope(data);
        
        expect(envelope.id).toBe("test-id");
        expect(envelope.traceId).toBe("camel-case-trace");
        expect(envelope.frame).toEqual(createDataFrame());
      });
      
      it("should validate deserialized data according to schema", () => {
        const invalidData = {
          frame: createDataFrame(),
          priority: "invalid-priority"
        };
        
        expect(() => deserializeEnvelope(invalidData)).toThrow();
      });
    });
  });
  
  describe("Envelope Round-trip Serialization", () => {
    
    it("should handle basic serialization operations", () => {
      // Create a simple envelope that we know will work
      const envelope = createFameEnvelope({
        frame: createDataFrame(),
        id: "test-id",
        traceId: "trace-123"
      });
      
      // Test basic serialization
      const serialized = serializeEnvelope(envelope);
      expect(serialized.id).toBe("test-id");
      expect(serialized.trace_id).toBe("trace-123");
      expect(typeof serialized.ts).toBe("string");
      
      // Test that serialization produces snake_case fields
      expect(serialized).toHaveProperty("trace_id");
      expect(serialized).not.toHaveProperty("traceId");
    });
  });
  
  describe("Edge Cases and Error Handling", () => {
    
    it("should handle missing frame field gracefully", () => {
      expect(() => {
        FameEnvelopeSchema.parse({});
      }).toThrow("Invalid input");
    });
    
    it("should handle invalid frame field", () => {
      expect(() => {
        FameEnvelopeSchema.parse({
          frame: null
        });
      }).toThrow();
    });
    
    it("should validate FameAddress strings in to and replyTo fields", () => {
      const frame = createDataFrame();
      
      // Invalid address format
      expect(() => {
        FameEnvelopeSchema.parse({
          frame,
          to: "invalid-address-format"
        });
      }).toThrow();
      
      expect(() => {
        FameEnvelopeSchema.parse({
          frame,
          replyTo: "invalid-address-format"
        });
      }).toThrow();
    });
    
    it("should handle array capabilities correctly", () => {
      const frame = createDataFrame();
      const capabilities = ["read", "write", "admin"];
      
      const envelope = FameEnvelopeSchema.parse({
        frame,
        capabilities
      });
      
      expect(envelope.capabilities).toEqual(capabilities);
    });
    
    it("should handle undefined to address in createFameEnvelope", () => {
      const frame = createDataFrame();
      const options: CreateFameEnvelopeOptions = {
        frame,
        to: undefined
      };
      
      const envelope = createFameEnvelope(options);
      
      expect(envelope.to).toBeUndefined();
    });
    
    it("should handle different frame types correctly", () => {
      // Test with different frame types
      const dataFrame = createDataFrame();
      const heartbeatFrame = createHeartbeatFrame();
      const heartbeatAckFrame = createHeartbeatAckFrame();
      
      const envelope1 = FameEnvelopeSchema.parse({ frame: dataFrame });
      const envelope2 = FameEnvelopeSchema.parse({ frame: heartbeatFrame });
      const envelope3 = FameEnvelopeSchema.parse({ frame: heartbeatAckFrame });
      
      expect(envelope1.frame.type).toBe("Data");
      expect(envelope2.frame.type).toBe("NodeHeartbeat");
      expect(envelope3.frame.type).toBe("NodeHeartbeatAck");
    });
    
    it("should handle flow flags correctly", () => {
      const frame = createDataFrame();
      
      // Test all flow flags
      Object.values(FlowFlags).forEach(flag => {
        if (typeof flag === "number") {
          const envelope = FameEnvelopeSchema.parse({
            frame,
            flowFlags: flag
          });
          expect(envelope.flowFlags).toBe(flag);
        }
      });
    });
    
    it("should validate security header structure", () => {
      const frame = createDataFrame();
      
      // Valid security header
      const validSec = {
        sig: { val: "signature", alg: "EdDSA", kid: "key1" },
        enc: { val: "encrypted", alg: "ECDH-ES+A256GCM", kid: "key2" }
      };
      
      const envelope = FameEnvelopeSchema.parse({
        frame,
        sec: validSec
      });
      
      expect(envelope.sec).toEqual(validSec);
    });
  });
});