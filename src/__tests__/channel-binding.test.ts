import { Binding } from "../naylence/fame/core/channel/binding";
import { FameAddress } from "../naylence/fame/core/address/address";
import { ReadWriteChannel } from "../naylence/fame/core/channel/channel";

describe("Channel Binding", () => {
  
  // Mock ReadWriteChannel for testing
  class MockReadWriteChannel implements ReadWriteChannel {
    private closed = false;
    
    constructor(public id: string = "test-channel") {}
    
    receive(timeout?: number): Promise<any> {
      return Promise.resolve({ id: "msg-1", data: "test" });
    }
    
    acknowledge(messageId: string): Promise<void> {
      return Promise.resolve();
    }
    
    send(message: unknown): Promise<void> {
      return Promise.resolve();
    }
    
    close(): Promise<void> {
      this.closed = true;
      return Promise.resolve();
    }
    
    isClosed(): boolean {
      return this.closed;
    }
    
    toString(): string {
      return `MockChannel(${this.id})`;
    }
  }
  
  describe("Binding Class", () => {
    
    it("should create binding with channel and address", () => {
      const channel = new MockReadWriteChannel("test-channel-1");
      const address = new FameAddress("user@example.com");
      
      const binding = new Binding(channel, address);
      
      expect(binding.channel).toBe(channel);
      expect(binding.address).toBe(address);
    });
    
    it("should create binding from object", () => {
      const channel = new MockReadWriteChannel("test-channel-2");
      const address = new FameAddress("user@example.com");
      const obj = { channel, address };
      
      const binding = Binding.fromObject(obj);
      
      expect(binding).toBeInstanceOf(Binding);
      expect(binding.channel).toBe(channel);
      expect(binding.address).toBe(address);
    });
    
    it("should convert binding to object", () => {
      const channel = new MockReadWriteChannel("test-channel-3");
      const address = new FameAddress("user@example.com");
      const binding = new Binding(channel, address);
      
      const obj = binding.toObject();
      
      expect(obj).toEqual({
        channel: channel,
        address: address
      });
      expect(obj.channel).toBe(channel);
      expect(obj.address).toBe(address);
    });
    
    it("should provide string representation", () => {
      const channel = new MockReadWriteChannel("test-channel-4");
      const address = new FameAddress("user@example.com");
      const binding = new Binding(channel, address);
      
      const str = binding.toString();
      
      expect(str).toContain("Binding");
      expect(str).toContain("channel=");
      expect(str).toContain("address=");
      expect(str).toContain("MockChannel(test-channel-4)");
      expect(str).toContain("user@example.com");
    });
    
    it("should close binding and its channel", async () => {
      const channel = new MockReadWriteChannel("test-channel-5");
      const address = new FameAddress("user@example.com");
      const binding = new Binding(channel, address);
      
      expect(channel.isClosed()).toBe(false);
      
      await binding.close();
      
      expect(channel.isClosed()).toBe(true);
    });
    
    it("should handle channel without close method", async () => {
      // Create a channel-like object without close method
      const channelWithoutClose: ReadWriteChannel = {
        receive(timeout?: number): Promise<any> { return Promise.resolve({ id: "msg", data: "test" }); },
        acknowledge(messageId: string): Promise<void> { return Promise.resolve(); },
        send(message: unknown): Promise<void> { return Promise.resolve(); }
      } as ReadWriteChannel;
      
      const address = new FameAddress("user@example.com");
      const binding = new Binding(channelWithoutClose, address);
      
      // This should not throw even though the channel doesn't have a close method
      await expect(binding.close()).resolves.toBeUndefined();
    });
    
    it("should handle channel with close method that exists", async () => {
      const channel = new MockReadWriteChannel("test-channel-6");
      const address = new FameAddress("user@example.com");
      const binding = new Binding(channel, address);
      
      // Verify the channel has the close method
      expect("close" in channel).toBe(true);
      expect(typeof channel.close).toBe("function");
      
      await binding.close();
      expect(channel.isClosed()).toBe(true);
    });
  });
  
  describe("Binding Integration", () => {
    
    it("should work with different address formats", () => {
      const channel = new MockReadWriteChannel("test-channel-7");
      const pathOnlyAddress = new FameAddress("user@/api/v1");
      const hostOnlyAddress = new FameAddress("user@example.com");
      const wildcardAddress = new FameAddress("user@*.example.com");
      
      const binding1 = new Binding(channel, pathOnlyAddress);
      const binding2 = new Binding(channel, hostOnlyAddress);
      const binding3 = new Binding(channel, wildcardAddress);
      
      expect(binding1.address).toBe(pathOnlyAddress);
      expect(binding2.address).toBe(hostOnlyAddress);
      expect(binding3.address).toBe(wildcardAddress);
    });
    
    it("should maintain object identity through operations", () => {
      const channel = new MockReadWriteChannel("test-channel-8");
      const address = new FameAddress("user@example.com");
      
      const binding = new Binding(channel, address);
      const obj = binding.toObject();
      const reconstructed = Binding.fromObject(obj);
      
      expect(reconstructed.channel).toBe(channel);
      expect(reconstructed.address).toBe(address);
      expect(reconstructed.toString()).toBe(binding.toString());
    });
  });
});