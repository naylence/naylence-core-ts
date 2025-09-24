import {
  FameFabric,
  createFameEnvelope,
  DataFrame,
  DeliveryAckFrame,
  FameEnvelope,
  FameMessageHandler,
  FameService,
  resetFabricStack,
  fabricStack
} from "../naylence/fame/core/fame-fabric";
import { FameAddress } from "../naylence/fame/core/address/address";

// Mock concrete implementation for testing
class MockFameFabric extends FameFabric {
  public startCalled = false;
  public stopCalled = false;
  public shouldThrowOnStart = false;
  public shouldThrowOnStop = false;

  async start(): Promise<void> {
    if (this.shouldThrowOnStart) {
      throw new Error("Start failed");
    }
    this.startCalled = true;
  }

  async stop(): Promise<void> {
    if (this.shouldThrowOnStop) {
      throw new Error("Stop failed");
    }
    this.stopCalled = true;
  }

  async send(envelope: FameEnvelope, timeoutMs?: number | null): Promise<DeliveryAckFrame | null> {
    return { success: true };
  }

  async invoke(
    address: FameAddress,
    method: string,
    params: Record<string, unknown>,
    timeoutMs?: number
  ): Promise<unknown> {
    return { result: "invoked" };
  }

  async invokeByCapability(
    capabilities: string[],
    method: string,
    params: Record<string, unknown>,
    timeoutMs?: number
  ): Promise<unknown> {
    return { result: "invoked by capability" };
  }

  async *invokeStream(
    address: FameAddress,
    method: string,
    params: Record<string, unknown>,
    timeoutMs?: number
  ): AsyncIterable<unknown> {
    yield { stream: "item1" };
    yield { stream: "item2" };
  }

  async *invokeByCapabilityStream(
    capabilities: string[],
    method: string,
    params: Record<string, unknown>,
    timeoutMs?: number
  ): AsyncIterable<unknown> {
    yield { capability: "stream1" };
    yield { capability: "stream2" };
  }

  async subscribe(
    sinkAddress: FameAddress,
    handler: FameMessageHandler,
    name?: string | null
  ): Promise<void> {
    // Mock implementation
  }

  async serve(
    service: FameService,
    serviceName?: string | null
  ): Promise<FameAddress> {
    return new FameAddress("served-service@mock.host");
  }

  resolveServiceByCapability(capability: string): FameService {
    return { name: `service-for-${capability}` };
  }
}

describe("Fame Fabric", () => {
  beforeEach(() => {
    resetFabricStack();
  });

  afterEach(() => {
    resetFabricStack();
  });

  describe("DataFrame", () => {
    it("should create DataFrame with payload", () => {
      const payload = { test: "data" };
      const frame = new DataFrame(payload);
      
      expect(frame.payload).toBe(payload);
    });
  });

  describe("createFameEnvelope", () => {
    it("should create envelope with address and frame", () => {
      const address = new FameAddress("test@mock.host");
      const frame = new DataFrame({ message: "test" });
      
      const envelope = createFameEnvelope({ to: address, frame });
      
      expect(envelope.to).toBe(address);
      expect(envelope.frame).toBe(frame);
    });
  });

  describe("resetFabricStack", () => {
    it("should clear the fabric stack", () => {
      const fabric = new MockFameFabric();
      fabricStack.push(fabric);
      expect(fabricStack.length).toBe(1);
      
      resetFabricStack();
      expect(fabricStack.length).toBe(0);
    });
  });

  describe("FameFabric lifecycle management", () => {
    let fabric: MockFameFabric;

    beforeEach(() => {
      fabric = new MockFameFabric();
    });

    describe("enter", () => {
      it("should add fabric to stack and call start", async () => {
        expect(fabricStack.length).toBe(0);
        
        const result = await fabric.enter();
        
        expect(result).toBe(fabric);
        expect(fabricStack.length).toBe(1);
        expect(fabricStack[0]).toBe(fabric);
        expect(fabric.startCalled).toBe(true);
      });

      it("should not call start if already started", async () => {
        await fabric.enter();
        fabric.startCalled = false; // Reset flag
        
        await fabric.exit();
        await fabric.enter();
        
        expect(fabric.startCalled).toBe(false);
      });

      it("should throw error when re-entering same instance", async () => {
        await fabric.enter();
        
        await expect(fabric.enter()).rejects.toThrow("Cannot re-enter the same FameFabric instance");
      });

      it("should handle start failure", async () => {
        fabric.shouldThrowOnStart = true;
        
        await expect(fabric.enter()).rejects.toThrow("Start failed");
      });
    });

    describe("exit", () => {
      it("should remove fabric from stack and call stop", async () => {
        await fabric.enter();
        expect(fabricStack.length).toBe(1);
        
        await fabric.exit();
        
        expect(fabricStack.length).toBe(0);
        expect(fabric.stopCalled).toBe(true);
      });

      it("should not call stop if already stopped", async () => {
        await fabric.enter();
        await fabric.exit();
        fabric.stopCalled = false; // Reset flag
        
        await fabric.enter();
        await fabric.exit();
        
        expect(fabric.stopCalled).toBe(false);
      });

      it("should handle stop failure without original error", async () => {
        await fabric.enter();
        fabric.shouldThrowOnStop = true;
        
        await expect(fabric.exit()).rejects.toThrow("Stop failed");
      });

      it("should chain stop failure with original error", async () => {
        await fabric.enter();
        fabric.shouldThrowOnStop = true;
        const originalError = new Error("Original error");
        
        try {
          await fabric.exit(originalError);
          fail("Should have thrown");
        } catch (error: any) {
          expect(error.message).toContain("Stop failed");
          expect(error.cause).toBe(originalError);
        }
      });

      it("should re-throw original error when stop succeeds", async () => {
        await fabric.enter();
        const originalError = new Error("Original error");
        
        await expect(fabric.exit(originalError)).rejects.toThrow("Original error");
      });

      it("should always clean up context token", async () => {
        await fabric.enter();
        const fabricWithStopError = new MockFameFabric();
        fabricWithStopError.shouldThrowOnStop = true;
        
        try {
          await fabricWithStopError.enter();
          await fabricWithStopError.exit();
        } catch {
          // Ignore the error
        }
        
        expect((fabricWithStopError as any)._ctxToken).toBe(null);
      });
    });

    describe("current", () => {
      it("should return current fabric from stack", async () => {
        await fabric.enter();
        
        const current = FameFabric.current();
        
        expect(current).toBe(fabric);
      });

      it("should throw error when no fabric active", () => {
        expect(() => FameFabric.current()).toThrow("No FameFabric active in this context");
      });

      it("should return top fabric when multiple fabrics on stack", async () => {
        const fabric1 = new MockFameFabric();
        const fabric2 = new MockFameFabric();
        
        await fabric1.enter();
        await fabric2.enter();
        
        const current = FameFabric.current();
        expect(current).toBe(fabric2);
      });
    });

    describe("use pattern", () => {
      it("should enter and exit fabric around function execution", async () => {
        const result = await fabric.use(async (f) => {
          expect(f).toBe(fabric);
          expect(fabricStack.length).toBe(1);
          return "test-result";
        });
        
        expect(result).toBe("test-result");
        expect(fabricStack.length).toBe(0);
        expect(fabric.startCalled).toBe(true);
        expect(fabric.stopCalled).toBe(true);
      });

      it("should exit fabric even when function throws", async () => {
        const testError = new Error("Function error");
        
        await expect(fabric.use(async () => {
          throw testError;
        })).rejects.toThrow("Function error");
        
        expect(fabricStack.length).toBe(0);
        expect(fabric.stopCalled).toBe(true);
      });
    });
  });

  describe("sendMessage", () => {
    let fabric: MockFameFabric;

    beforeEach(() => {
      fabric = new MockFameFabric();
    });

    it("should send message with string address", async () => {
      const result = await fabric.sendMessage("test@mock.host", { message: "hello" });
      
      expect(result).toEqual({ success: true });
    });

    it("should send message with FameAddress", async () => {
      const address = new FameAddress("test@mock.host");
      const result = await fabric.sendMessage(address, { message: "hello" });
      
      expect(result).toEqual({ success: true });
    });
  });

  describe("Factory methods", () => {
    describe("create", () => {
      it("should handle empty options", async () => {
        await expect(FameFabric.create()).rejects.toThrow("Factory resolution not yet implemented");
      });

      it("should handle options with FameConfig", async () => {
        const config = { fabric: { type: "mock" } };
        
        await expect(FameFabric.create({ rootConfig: config })).rejects.toThrow("Factory resolution not yet implemented");
      });

      it("should handle options with fabric property", async () => {
        const config = { fabric: { type: "mock" } };
        
        await expect(FameFabric.create({ rootConfig: config })).rejects.toThrow("Factory resolution not yet implemented");
      });

      it("should handle additional options", async () => {
        const options = { 
          rootConfig: { fabric: { type: "mock" } },
          additionalOption: "value"
        };
        
        await expect(FameFabric.create(options)).rejects.toThrow("Factory resolution not yet implemented");
      });
    });

    describe("fromConfig", () => {
      it("should throw not implemented error", async () => {
        await expect(FameFabric.fromConfig()).rejects.toThrow("Factory resolution not yet implemented");
      });

      it("should throw not implemented error with config", async () => {
        await expect(FameFabric.fromConfig({ type: "mock" })).rejects.toThrow("Factory resolution not yet implemented");
      });

      it("should throw not implemented error with kwargs", async () => {
        await expect(FameFabric.fromConfig({}, { option: "value" })).rejects.toThrow("Factory resolution not yet implemented");
      });
    });

    describe("getOrCreate", () => {
      it("should return existing fabric when stack not empty", async () => {
        const fabric = new MockFameFabric();
        await fabric.enter();
        
        const result = await FameFabric.getOrCreate();
        
        expect(result).toBe(fabric);
      });

      it("should delegate to create when stack empty", async () => {
        await expect(FameFabric.getOrCreate()).rejects.toThrow("Factory resolution not yet implemented");
      });

      it("should pass options to create when stack empty", async () => {
        const options = { test: "option" };
        
        await expect(FameFabric.getOrCreate(options)).rejects.toThrow("Factory resolution not yet implemented");
      });
    });
  });

  describe("Stack management edge cases", () => {
    it("should handle multiple fabrics entering and exiting in LIFO order", async () => {
      const fabric1 = new MockFameFabric();
      const fabric2 = new MockFameFabric();
      const fabric3 = new MockFameFabric();
      
      await fabric1.enter();
      await fabric2.enter();
      await fabric3.enter();
      
      expect(fabricStack.length).toBe(3);
      expect(FameFabric.current()).toBe(fabric3);
      
      // Exit in LIFO order (last in, first out)
      await fabric3.exit();
      expect(fabricStack.length).toBe(2);
      expect(FameFabric.current()).toBe(fabric2);
      
      await fabric2.exit();
      expect(fabricStack.length).toBe(1);
      expect(FameFabric.current()).toBe(fabric1);
      
      await fabric1.exit();
      expect(fabricStack.length).toBe(0);
    });

    it("should handle context token cleanup on exit", async () => {
      const fabric = new MockFameFabric();
      
      await fabric.enter();
      expect((fabric as any)._ctxToken).toBe(0);
      
      await fabric.exit();
      expect((fabric as any)._ctxToken).toBe(null);
    });

    it("should handle non-LIFO exit order (demonstrates stack behavior)", async () => {
      const fabric1 = new MockFameFabric();
      const fabric2 = new MockFameFabric();
      const fabric3 = new MockFameFabric();
      
      await fabric1.enter();
      await fabric2.enter();
      await fabric3.enter();
      
      expect(fabricStack.length).toBe(3);
      
      // Exit fabric2 from middle of stack
      await fabric2.exit();
      
      // Stack is disrupted but still functional
      expect(fabricStack.length).toBe(2);
      // Note: This test documents the current behavior, which may not be ideal
      // but is how the current implementation works
    });
  });

  describe("Abstract method implementation", () => {
    it("should verify all abstract methods are implemented in mock", () => {
      const fabric = new MockFameFabric();
      
      // These should not throw "not implemented" errors
      expect(() => fabric.send).not.toThrow();
      expect(() => fabric.invoke).not.toThrow();
      expect(() => fabric.invokeByCapability).not.toThrow();
      expect(() => fabric.invokeStream).not.toThrow();
      expect(() => fabric.invokeByCapabilityStream).not.toThrow();
      expect(() => fabric.subscribe).not.toThrow();
      expect(() => fabric.serve).not.toThrow();
      expect(() => fabric.resolveServiceByCapability).not.toThrow();
    });
  });
});