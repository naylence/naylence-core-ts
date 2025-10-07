import {
  ConnectorState,
  ConnectorStateHelper,
  ConnectorStateUtils,
} from '../naylence/fame/core/connector/connector-state';
import {
  FameConnector,
  BaseFameConnector,
  isFameConnector,
} from '../naylence/fame/core/connector/connector';
import {
  ReadChannel,
  WriteChannel,
  ReadWriteChannel,
} from '../naylence/fame/core/channel/channel';
import { Binding } from '../naylence/fame/core/channel/binding';
import { FameAddress } from '../naylence/fame/core/address/address';
import { FameEnvelopeHandler } from '../naylence/fame/core/handlers/handlers';
import { FameEnvelope } from '../naylence/fame/core/protocol/envelope';
import { FameChannelMessage } from '../naylence/fame/core/protocol/channel-message';
import { AuthorizationContext } from '../naylence/fame/core/protocol/delivery-context';

describe('ConnectorState', () => {
  describe('enum values', () => {
    it('should have correct enum values', () => {
      expect(ConnectorState.UNKNOWN).toBe('unknown');
      expect(ConnectorState.INITIALIZED).toBe('initialized');
      expect(ConnectorState.STARTED).toBe('started');
      expect(ConnectorState.STOPPED).toBe('stopped');
      expect(ConnectorState.CLOSED).toBe('closed');
    });
  });

  describe('ConnectorStateHelper', () => {
    describe('isActive', () => {
      it('should return true for STARTED state', () => {
        const helper = new ConnectorStateHelper(ConnectorState.STARTED);
        expect(helper.isActive).toBe(true);
      });

      it('should return false for non-STARTED states', () => {
        expect(new ConnectorStateHelper(ConnectorState.UNKNOWN).isActive).toBe(
          false
        );
        expect(
          new ConnectorStateHelper(ConnectorState.INITIALIZED).isActive
        ).toBe(false);
        expect(new ConnectorStateHelper(ConnectorState.STOPPED).isActive).toBe(
          false
        );
        expect(new ConnectorStateHelper(ConnectorState.CLOSED).isActive).toBe(
          false
        );
      });
    });

    describe('isInactive', () => {
      it('should return true for STOPPED and CLOSED states', () => {
        expect(
          new ConnectorStateHelper(ConnectorState.STOPPED).isInactive
        ).toBe(true);
        expect(new ConnectorStateHelper(ConnectorState.CLOSED).isInactive).toBe(
          true
        );
      });

      it('should return false for active states', () => {
        expect(
          new ConnectorStateHelper(ConnectorState.UNKNOWN).isInactive
        ).toBe(false);
        expect(
          new ConnectorStateHelper(ConnectorState.INITIALIZED).isInactive
        ).toBe(false);
        expect(
          new ConnectorStateHelper(ConnectorState.STARTED).isInactive
        ).toBe(false);
      });
    });

    describe('canStart', () => {
      it('should return true for INITIALIZED and STOPPED states', () => {
        expect(
          new ConnectorStateHelper(ConnectorState.INITIALIZED).canStart
        ).toBe(true);
        expect(new ConnectorStateHelper(ConnectorState.STOPPED).canStart).toBe(
          true
        );
      });

      it('should return false for other states', () => {
        expect(new ConnectorStateHelper(ConnectorState.UNKNOWN).canStart).toBe(
          false
        );
        expect(new ConnectorStateHelper(ConnectorState.STARTED).canStart).toBe(
          false
        );
        expect(new ConnectorStateHelper(ConnectorState.CLOSED).canStart).toBe(
          false
        );
      });
    });

    describe('canStop', () => {
      it('should return true for STARTED state', () => {
        expect(new ConnectorStateHelper(ConnectorState.STARTED).canStop).toBe(
          true
        );
      });

      it('should return false for other states', () => {
        expect(new ConnectorStateHelper(ConnectorState.UNKNOWN).canStop).toBe(
          false
        );
        expect(
          new ConnectorStateHelper(ConnectorState.INITIALIZED).canStop
        ).toBe(false);
        expect(new ConnectorStateHelper(ConnectorState.STOPPED).canStop).toBe(
          false
        );
        expect(new ConnectorStateHelper(ConnectorState.CLOSED).canStop).toBe(
          false
        );
      });
    });

    describe('canClose', () => {
      it('should return true for INITIALIZED, STARTED, and STOPPED states', () => {
        expect(
          new ConnectorStateHelper(ConnectorState.INITIALIZED).canClose
        ).toBe(true);
        expect(new ConnectorStateHelper(ConnectorState.STARTED).canClose).toBe(
          true
        );
        expect(new ConnectorStateHelper(ConnectorState.STOPPED).canClose).toBe(
          true
        );
      });

      it('should return false for UNKNOWN and CLOSED states', () => {
        expect(new ConnectorStateHelper(ConnectorState.UNKNOWN).canClose).toBe(
          false
        );
        expect(new ConnectorStateHelper(ConnectorState.CLOSED).canClose).toBe(
          false
        );
      });
    });

    describe('toString and value', () => {
      it('should return string representation and value', () => {
        const helper = new ConnectorStateHelper(ConnectorState.STARTED);
        expect(helper.toString()).toBe('started');
        expect(helper.value).toBe(ConnectorState.STARTED);
      });
    });
  });

  describe('ConnectorStateUtils', () => {
    describe('utility functions', () => {
      it('should check isActive correctly', () => {
        expect(ConnectorStateUtils.isActive(ConnectorState.STARTED)).toBe(true);
        expect(ConnectorStateUtils.isActive(ConnectorState.STOPPED)).toBe(
          false
        );
      });

      it('should check isInactive correctly', () => {
        expect(ConnectorStateUtils.isInactive(ConnectorState.STOPPED)).toBe(
          true
        );
        expect(ConnectorStateUtils.isInactive(ConnectorState.CLOSED)).toBe(
          true
        );
        expect(ConnectorStateUtils.isInactive(ConnectorState.STARTED)).toBe(
          false
        );
      });

      it('should check canStart correctly', () => {
        expect(ConnectorStateUtils.canStart(ConnectorState.INITIALIZED)).toBe(
          true
        );
        expect(ConnectorStateUtils.canStart(ConnectorState.STOPPED)).toBe(true);
        expect(ConnectorStateUtils.canStart(ConnectorState.STARTED)).toBe(
          false
        );
      });

      it('should check canStop correctly', () => {
        expect(ConnectorStateUtils.canStop(ConnectorState.STARTED)).toBe(true);
        expect(ConnectorStateUtils.canStop(ConnectorState.STOPPED)).toBe(false);
      });

      it('should check canClose correctly', () => {
        expect(ConnectorStateUtils.canClose(ConnectorState.INITIALIZED)).toBe(
          true
        );
        expect(ConnectorStateUtils.canClose(ConnectorState.STARTED)).toBe(true);
        expect(ConnectorStateUtils.canClose(ConnectorState.STOPPED)).toBe(true);
        expect(ConnectorStateUtils.canClose(ConnectorState.UNKNOWN)).toBe(
          false
        );
        expect(ConnectorStateUtils.canClose(ConnectorState.CLOSED)).toBe(false);
      });

      it('should get all states', () => {
        const allStates = ConnectorStateUtils.getAllStates();
        expect(allStates).toContain(ConnectorState.UNKNOWN);
        expect(allStates).toContain(ConnectorState.INITIALIZED);
        expect(allStates).toContain(ConnectorState.STARTED);
        expect(allStates).toContain(ConnectorState.STOPPED);
        expect(allStates).toContain(ConnectorState.CLOSED);
        expect(allStates).toHaveLength(5);
      });

      it('should parse valid state strings', () => {
        expect(ConnectorStateUtils.fromString('unknown')).toBe(
          ConnectorState.UNKNOWN
        );
        expect(ConnectorStateUtils.fromString('initialized')).toBe(
          ConnectorState.INITIALIZED
        );
        expect(ConnectorStateUtils.fromString('started')).toBe(
          ConnectorState.STARTED
        );
        expect(ConnectorStateUtils.fromString('stopped')).toBe(
          ConnectorState.STOPPED
        );
        expect(ConnectorStateUtils.fromString('closed')).toBe(
          ConnectorState.CLOSED
        );
      });

      it('should return null for invalid state strings', () => {
        expect(ConnectorStateUtils.fromString('invalid')).toBeNull();
        expect(ConnectorStateUtils.fromString('')).toBeNull();
        expect(ConnectorStateUtils.fromString('STARTED')).toBeNull(); // case sensitive
      });
    });
  });
});

describe('BaseFameConnector', () => {
  class TestConnector extends BaseFameConnector {
    protected async onStart(): Promise<void> {
      // Test implementation
    }

    protected async onStop(): Promise<void> {
      // Test implementation
    }

    protected async onClose(): Promise<void> {
      // Test implementation
    }

    protected async onHandlerReplaced(
      handler: FameEnvelopeHandler
    ): Promise<void> {
      // Test implementation
    }

    protected onError(error: Error): void {
      // Test implementation
    }

    async send(envelope: FameEnvelope): Promise<void> {
      // Test implementation
    }

    async pushToReceive(
      rawOrEnvelope: Uint8Array | FameEnvelope | FameChannelMessage
    ): Promise<void> {
      // Test implementation
    }
  }

  let connector: TestConnector;
  let mockHandler: jest.MockedFunction<FameEnvelopeHandler>;

  beforeEach(() => {
    connector = new TestConnector();
    mockHandler = jest.fn();
  });

  describe('initial state', () => {
    it('should start in UNKNOWN state', () => {
      expect(connector.state).toBe(ConnectorState.UNKNOWN);
    });

    it('should have undefined close code and reason initially', () => {
      expect(connector.closeCode).toBeUndefined();
      expect(connector.closeReason).toBeUndefined();
    });

    it('should have no last error initially', () => {
      expect(connector.lastError).toBeUndefined();
    });

    it('should have no authorization context initially', () => {
      expect(connector.authorizationContext).toBeUndefined();
    });
  });

  describe('start', () => {
    beforeEach(() => {
      // Set state to INITIALIZED to allow starting
      (connector as any)._state = ConnectorState.INITIALIZED;
    });

    it('should transition from INITIALIZED to STARTED', async () => {
      jest.spyOn(connector as any, 'onStart').mockResolvedValue(undefined);

      await connector.start(mockHandler);
      expect(connector.state).toBe(ConnectorState.STARTED);
      expect((connector as any)._handler).toBe(mockHandler);
    });

    it('should throw error if not in valid state to start', async () => {
      // Set to STARTED to make start invalid
      (connector as any)._state = ConnectorState.STARTED;

      await expect(connector.start(mockHandler)).rejects.toThrow(
        'Cannot start connector from state: started'
      );
    });

    it('should allow start from STOPPED state', async () => {
      (connector as any)._state = ConnectorState.STOPPED;
      jest.spyOn(connector as any, 'onStart').mockResolvedValue(undefined);

      await connector.start(mockHandler);
      expect(connector.state).toBe(ConnectorState.STARTED);
    });
  });

  describe('stop', () => {
    beforeEach(async () => {
      (connector as any)._state = ConnectorState.INITIALIZED;
      jest.spyOn(connector as any, 'onStart').mockResolvedValue(undefined);
      jest.spyOn(connector as any, 'onStop').mockResolvedValue(undefined);
      await connector.start(mockHandler);
    });

    it('should transition from STARTED to STOPPED', async () => {
      await connector.stop();
      expect(connector.state).toBe(ConnectorState.STOPPED);
    });

    it('should throw error if not in STARTED state', async () => {
      (connector as any)._state = ConnectorState.STOPPED;

      await expect(connector.stop()).rejects.toThrow(
        'Cannot stop connector from state: stopped'
      );
    });
  });

  describe('replaceHandler', () => {
    beforeEach(async () => {
      (connector as any)._state = ConnectorState.INITIALIZED;
      jest.spyOn(connector as any, 'onStart').mockResolvedValue(undefined);
      jest
        .spyOn(connector as any, 'onHandlerReplaced')
        .mockResolvedValue(undefined);
      await connector.start(mockHandler);
    });

    it('should replace handler', async () => {
      const newHandler = jest.fn();

      await connector.replaceHandler(newHandler);
      expect((connector as any)._handler).toBe(newHandler);
    });
  });

  describe('close', () => {
    beforeEach(async () => {
      (connector as any)._state = ConnectorState.INITIALIZED;
      jest.spyOn(connector as any, 'onStart').mockResolvedValue(undefined);
      jest.spyOn(connector as any, 'onClose').mockResolvedValue(undefined);
      await connector.start(mockHandler);
    });

    it('should close with code and reason', async () => {
      await connector.close(1000, 'Normal closure');
      expect(connector.closeCode).toBe(1000);
      expect(connector.closeReason).toBe('Normal closure');
      expect(connector.state).toBe(ConnectorState.CLOSED);
    });

    it('should close without code and reason', async () => {
      await connector.close();
      expect(connector.closeCode).toBeUndefined();
      expect(connector.closeReason).toBeUndefined();
      expect(connector.state).toBe(ConnectorState.CLOSED);
    });

    it('should not close again if already closed', async () => {
      await connector.close();
      const onCloseSpy = jest.spyOn(connector as any, 'onClose');
      onCloseSpy.mockClear();

      await connector.close();
      expect(onCloseSpy).not.toHaveBeenCalled();
    });
  });

  describe('handleError', () => {
    it('should set last error and call onError', () => {
      const error = new Error('Test error');
      const onErrorSpy = jest.spyOn(connector as any, 'onError');

      (connector as any).handleError(error);

      expect(connector.lastError).toBe(error);
      expect(onErrorSpy).toHaveBeenCalledWith(error);
    });
  });

  describe('authorizationContext', () => {
    it('should set and get authorization context', () => {
      const context: AuthorizationContext = {
        authenticated: true,
        authorized: true,
        claims: { role: 'admin' },
        grantedScopes: ['read', 'write'],
        restrictions: {},
        principal: 'test-user',
        authMethod: 'token',
      };

      connector.authorizationContext = context;
      expect(connector.authorizationContext).toBe(context);
    });

    it('should handle undefined authorization context', () => {
      connector.authorizationContext = undefined;
      expect(connector.authorizationContext).toBeUndefined();
    });
  });
});

describe('Channel interfaces', () => {
  class TestReadChannel implements ReadChannel {
    async receive(timeout?: number): Promise<any> {
      return { id: 'message-1', data: 'test message', timeout };
    }

    async acknowledge(messageId: string): Promise<void> {
      // Test implementation
    }
  }

  class TestWriteChannel implements WriteChannel {
    async send(message: unknown): Promise<void> {
      // Test implementation
    }
  }

  class TestReadWriteChannel implements ReadWriteChannel {
    async receive(timeout?: number): Promise<any> {
      return { id: 'message-1', data: 'test message', timeout };
    }

    async acknowledge(messageId: string): Promise<void> {
      // Test implementation
    }

    async send(message: unknown): Promise<void> {
      // Test implementation
    }
  }

  describe('ReadChannel', () => {
    let channel: TestReadChannel;

    beforeEach(() => {
      channel = new TestReadChannel();
    });

    it('should receive messages with timeout', async () => {
      const message = await channel.receive(5000);
      expect(message).toEqual({
        id: 'message-1',
        data: 'test message',
        timeout: 5000,
      });
    });

    it('should receive messages without timeout', async () => {
      const message = await channel.receive();
      expect(message).toEqual({
        id: 'message-1',
        data: 'test message',
        timeout: undefined,
      });
    });

    it('should acknowledge messages', async () => {
      const spy = jest.spyOn(channel, 'acknowledge');
      await channel.acknowledge('message-1');
      expect(spy).toHaveBeenCalledWith('message-1');
    });
  });

  describe('WriteChannel', () => {
    let channel: TestWriteChannel;

    beforeEach(() => {
      channel = new TestWriteChannel();
    });

    it('should send messages', async () => {
      const spy = jest.spyOn(channel, 'send');
      const message = { data: 'test message' };
      await channel.send(message);
      expect(spy).toHaveBeenCalledWith(message);
    });
  });

  describe('ReadWriteChannel', () => {
    let channel: TestReadWriteChannel;

    beforeEach(() => {
      channel = new TestReadWriteChannel();
    });

    it('should support both read and write operations', async () => {
      // Test read
      const message = await channel.receive(1000);
      expect(message).toEqual({
        id: 'message-1',
        data: 'test message',
        timeout: 1000,
      });

      // Test write
      const sendSpy = jest.spyOn(channel, 'send');
      await channel.send({ data: 'outbound message' });
      expect(sendSpy).toHaveBeenCalledWith({ data: 'outbound message' });

      // Test acknowledge
      const ackSpy = jest.spyOn(channel, 'acknowledge');
      await channel.acknowledge('message-1');
      expect(ackSpy).toHaveBeenCalledWith('message-1');
    });
  });
});

describe('Binding', () => {
  let mockChannel: ReadWriteChannel;
  let mockAddress: FameAddress;

  beforeEach(() => {
    mockChannel = {
      receive: jest.fn(),
      acknowledge: jest.fn(),
      send: jest.fn(),
    } as ReadWriteChannel;
    mockAddress = new FameAddress('service@example.com/test');
  });

  describe('constructor', () => {
    it('should create binding with channel and address', () => {
      const binding = new Binding(mockChannel, mockAddress);
      expect(binding.channel).toBe(mockChannel);
      expect(binding.address).toBe(mockAddress);
    });
  });

  describe('fromObject', () => {
    it('should create binding from object', () => {
      const obj = { channel: mockChannel, address: mockAddress };
      const binding = Binding.fromObject(obj);
      expect(binding.channel).toBe(mockChannel);
      expect(binding.address).toBe(mockAddress);
    });
  });

  describe('toObject', () => {
    it('should convert binding to object', () => {
      const binding = new Binding(mockChannel, mockAddress);
      const obj = binding.toObject();
      expect(obj).toEqual({ channel: mockChannel, address: mockAddress });
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const binding = new Binding(mockChannel, mockAddress);
      const str = binding.toString();
      expect(str).toContain('service@example.com/test');
    });
  });
});

describe('isFameConnector', () => {
  it('should return true for valid connector objects', () => {
    const connector = {
      start: jest.fn(),
      stop: jest.fn(),
      send: jest.fn(),
      close: jest.fn(),
      state: ConnectorState.UNKNOWN,
    };

    expect(isFameConnector(connector)).toBe(true);
  });

  it('should return false for objects missing required methods', () => {
    const invalidConnector1 = {
      start: jest.fn(),
      stop: jest.fn(),
      send: jest.fn(),
      // Missing close and state
    };

    const invalidConnector2 = {
      start: jest.fn(),
      stop: jest.fn(),
      close: jest.fn(),
      state: ConnectorState.UNKNOWN,
      // Missing send
    };

    expect(isFameConnector(invalidConnector1)).toBe(false);
    expect(isFameConnector(invalidConnector2)).toBe(false);
  });

  it('should return false for null/undefined', () => {
    expect(isFameConnector(null)).toBeFalsy();
    expect(isFameConnector(undefined)).toBeFalsy();
  });

  it('should return false for non-objects', () => {
    expect(isFameConnector('string')).toBe(false);
    expect(isFameConnector(123)).toBe(false);
    expect(isFameConnector(true)).toBe(false);
  });
});
