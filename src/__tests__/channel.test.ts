import {
  Channel,
  ReadChannel,
  WriteChannel,
  ReadWriteChannel,
  BaseChannel,
  isReadChannel,
  isWriteChannel,
  isReadWriteChannel,
  DEFAULT_CHANNEL_TIMEOUT
} from "../naylence/fame/core/channel/channel";

// Mock implementations for testing
class MockReadChannel implements ReadChannel {
  private messages: unknown[] = [];
  
  async receive(timeout?: number): Promise<any> {
    return this.messages.shift() || null;
  }
  
  async acknowledge(messageId: string): Promise<void> {
    // Mock acknowledgment
  }
  
  addMessage(message: unknown) {
    this.messages.push(message);
  }
}

class MockWriteChannel implements WriteChannel {
  public sentMessages: unknown[] = [];
  
  async send(message: unknown): Promise<void> {
    this.sentMessages.push(message);
  }
}

class MockReadWriteChannel implements ReadWriteChannel {
  private messages: unknown[] = [];
  public sentMessages: unknown[] = [];
  
  async receive(timeout?: number): Promise<any> {
    return this.messages.shift() || null;
  }
  
  async acknowledge(messageId: string): Promise<void> {
    // Mock acknowledgment
  }
  
  async send(message: unknown): Promise<void> {
    this.sentMessages.push(message);
  }
  
  addMessage(message: unknown) {
    this.messages.push(message);
  }
}

class MockBaseChannel extends BaseChannel {
  // Concrete implementation for testing
}

class MockChannel implements Channel {
  // Basic channel implementation
}

class MockChannelWithReceive implements Channel {
  async receive(timeout?: number): Promise<any> {
    return { id: "test", data: "message" };
  }
}

class MockChannelWithSend implements Channel {
  async send(message: unknown): Promise<void> {
    // Mock send
  }
}

class MockChannelWithBoth implements Channel {
  async receive(timeout?: number): Promise<any> {
    return { id: "test", data: "message" };
  }
  
  async send(message: unknown): Promise<void> {
    // Mock send
  }
}

describe("Channel", () => {
  describe("Type Guards", () => {
    describe("isReadChannel", () => {
      it("should return true for channels with receive method", () => {
        const readChannel = new MockReadChannel();
        expect(isReadChannel(readChannel)).toBe(true);
      });

      it("should return true for read-write channels", () => {
        const readWriteChannel = new MockReadWriteChannel();
        expect(isReadChannel(readWriteChannel)).toBe(true);
      });

      it("should return true for basic channel with receive method", () => {
        const channelWithReceive = new MockChannelWithReceive();
        expect(isReadChannel(channelWithReceive)).toBe(true);
      });

      it("should return false for channels without receive method", () => {
        const writeChannel = new MockWriteChannel();
        expect(isReadChannel(writeChannel)).toBe(false);
      });

      it("should return false for basic channel without receive method", () => {
        const basicChannel = new MockChannel();
        expect(isReadChannel(basicChannel)).toBe(false);
      });
    });

    describe("isWriteChannel", () => {
      it("should return true for channels with send method", () => {
        const writeChannel = new MockWriteChannel();
        expect(isWriteChannel(writeChannel)).toBe(true);
      });

      it("should return true for read-write channels", () => {
        const readWriteChannel = new MockReadWriteChannel();
        expect(isWriteChannel(readWriteChannel)).toBe(true);
      });

      it("should return true for basic channel with send method", () => {
        const channelWithSend = new MockChannelWithSend();
        expect(isWriteChannel(channelWithSend)).toBe(true);
      });

      it("should return false for channels without send method", () => {
        const readChannel = new MockReadChannel();
        expect(isWriteChannel(readChannel)).toBe(false);
      });

      it("should return false for basic channel without send method", () => {
        const basicChannel = new MockChannel();
        expect(isWriteChannel(basicChannel)).toBe(false);
      });
    });

    describe("isReadWriteChannel", () => {
      it("should return true for channels with both receive and send methods", () => {
        const readWriteChannel = new MockReadWriteChannel();
        expect(isReadWriteChannel(readWriteChannel)).toBe(true);
      });

      it("should return true for basic channel with both methods", () => {
        const channelWithBoth = new MockChannelWithBoth();
        expect(isReadWriteChannel(channelWithBoth)).toBe(true);
      });

      it("should return false for read-only channels", () => {
        const readChannel = new MockReadChannel();
        expect(isReadWriteChannel(readChannel)).toBe(false);
      });

      it("should return false for write-only channels", () => {
        const writeChannel = new MockWriteChannel();
        expect(isReadWriteChannel(writeChannel)).toBe(false);
      });

      it("should return false for basic channels without methods", () => {
        const basicChannel = new MockChannel();
        expect(isReadWriteChannel(basicChannel)).toBe(false);
      });

      it("should return false for channels with only receive method", () => {
        const channelWithReceive = new MockChannelWithReceive();
        expect(isReadWriteChannel(channelWithReceive)).toBe(false);
      });

      it("should return false for channels with only send method", () => {
        const channelWithSend = new MockChannelWithSend();
        expect(isReadWriteChannel(channelWithSend)).toBe(false);
      });
    });
  });

  describe("BaseChannel", () => {
    let channel: MockBaseChannel;

    beforeEach(() => {
      channel = new MockBaseChannel();
    });

    describe("closed property", () => {
      it("should return false initially", () => {
        expect(channel.closed).toBe(false);
      });

      it("should return true after closing", async () => {
        await channel.close();
        expect(channel.closed).toBe(true);
      });
    });

    describe("close method", () => {
      it("should set closed state to true", async () => {
        expect(channel.closed).toBe(false);
        
        await channel.close();
        
        expect(channel.closed).toBe(true);
      });

      it("should be idempotent", async () => {
        await channel.close();
        expect(channel.closed).toBe(true);
        
        await channel.close();
        expect(channel.closed).toBe(true);
      });
    });

    describe("checkNotClosed method", () => {
      it("should not throw when channel is open", () => {
        expect(() => (channel as unknown).checkNotClosed()).not.toThrow();
      });

      it("should throw when channel is closed", async () => {
        await channel.close();
        
        expect(() => (channel as unknown).checkNotClosed()).toThrow("Channel is closed");
      });
    });
  });

  describe("Channel Interface Implementations", () => {
    describe("MockReadChannel", () => {
      let channel: MockReadChannel;

      beforeEach(() => {
        channel = new MockReadChannel();
      });

      it("should receive null when no messages available", async () => {
        const message = await channel.receive();
        expect(message).toBeNull();
      });

      it("should receive messages in order", async () => {
        channel.addMessage({ id: "1", data: "first" });
        channel.addMessage({ id: "2", data: "second" });
        
        const first = await channel.receive();
        const second = await channel.receive();
        const third = await channel.receive();
        
        expect(first).toEqual({ id: "1", data: "first" });
        expect(second).toEqual({ id: "2", data: "second" });
        expect(third).toBeNull();
      });

      it("should support timeout parameter in receive", async () => {
        const message = await channel.receive(1000);
        expect(message).toBeNull();
      });

      it("should acknowledge messages by ID", async () => {
        await expect(channel.acknowledge("test-id")).resolves.not.toThrow();
      });
    });

    describe("MockWriteChannel", () => {
      let channel: MockWriteChannel;

      beforeEach(() => {
        channel = new MockWriteChannel();
      });

      it("should send messages", async () => {
        const message = { data: "test message" };
        
        await channel.send(message);
        
        expect(channel.sentMessages).toContain(message);
      });

      it("should send multiple messages", async () => {
        const message1 = { data: "first" };
        const message2 = { data: "second" };
        
        await channel.send(message1);
        await channel.send(message2);
        
        expect(channel.sentMessages).toEqual([message1, message2]);
      });
    });

    describe("MockReadWriteChannel", () => {
      let channel: MockReadWriteChannel;

      beforeEach(() => {
        channel = new MockReadWriteChannel();
      });

      it("should support both reading and writing", async () => {
        // Test writing
        const sentMessage = { data: "sent" };
        await channel.send(sentMessage);
        expect(channel.sentMessages).toContain(sentMessage);
        
        // Test reading
        channel.addMessage({ id: "1", data: "received" });
        const receivedMessage = await channel.receive();
        expect(receivedMessage).toEqual({ id: "1", data: "received" });
      });

      it("should support acknowledgment", async () => {
        await expect(channel.acknowledge("test-id")).resolves.not.toThrow();
      });
    });
  });

  describe("Constants", () => {
    it("should export DEFAULT_CHANNEL_TIMEOUT", () => {
      expect(DEFAULT_CHANNEL_TIMEOUT).toBe(5000);
      expect(typeof DEFAULT_CHANNEL_TIMEOUT).toBe("number");
    });
  });

  describe("Edge Cases", () => {
    it("should handle channels with undefined methods gracefully", () => {
      const channelWithUndefined = {} as Channel;
      
      expect(isReadChannel(channelWithUndefined)).toBe(false);
      expect(isWriteChannel(channelWithUndefined)).toBe(false);
      expect(isReadWriteChannel(channelWithUndefined)).toBe(false);
    });

    it("should handle channels with non-function properties", () => {
      const channelWithProps = {
        receive: "not a function",
        send: "also not a function"
      } as unknown;
      
      expect(isReadChannel(channelWithProps)).toBe(false);
      expect(isWriteChannel(channelWithProps)).toBe(false);
      expect(isReadWriteChannel(channelWithProps)).toBe(false);
    });

    it("should handle null channel objects", () => {
      const nullChannel = null as unknown;
      
      expect(() => isReadChannel(nullChannel)).toThrow();
      expect(() => isWriteChannel(nullChannel)).toThrow();
      expect(() => isReadWriteChannel(nullChannel)).toThrow();
    });
  });
});