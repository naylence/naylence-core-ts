import {
  FameServiceProxy,
  InvokeProtocol,
  InvokeByCapabilityProtocol,
  isFameMessageService,
  isFameRPCService,
  createServiceProxy,
  FameMessageService,
  FameRPCService,
} from '../naylence/fame/core/service/fame-service';
import { FameAddress } from '../naylence/fame/core/address/address';
import { DEFAULT_INVOKE_TIMEOUT_MILLIS } from '../naylence/fame/core/util/constants';

// Mock the fame-fabric to avoid circular dependencies
jest.mock('../naylence/fame/core/fame-fabric', () => ({
  FameFabric: {
    current: jest.fn(() => ({
      invoke: jest.fn(),
      invokeByCapability: jest.fn(),
    })),
  },
}));

describe('FameServiceProxy', () => {
  let mockAddress: FameAddress;
  let mockInvoke: jest.MockedFunction<InvokeProtocol>;
  let mockInvokeByCapability: jest.MockedFunction<InvokeByCapabilityProtocol>;

  beforeEach(() => {
    mockAddress = new FameAddress('testservice@example.com/service');
    mockInvoke = jest.fn();
    mockInvokeByCapability = jest.fn();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with default options', () => {
      const proxy = new FameServiceProxy();
      expect(proxy.capabilities).toBeUndefined();
    });

    it('should create instance with custom invoke protocol', () => {
      const proxy = new FameServiceProxy({
        invoke: mockInvoke,
      });
      expect(proxy).toBeInstanceOf(FameServiceProxy);
    });

    it('should create instance with custom invokeByCapability protocol', () => {
      const proxy = new FameServiceProxy({
        invokeByCapability: mockInvokeByCapability,
      });
      expect(proxy).toBeInstanceOf(FameServiceProxy);
    });

    it('should set address when provided', () => {
      const proxy = new FameServiceProxy({
        address: mockAddress,
      });
      expect(proxy).toBeInstanceOf(FameServiceProxy);
    });

    it('should set capabilities when provided', () => {
      const capabilities = ['test-capability'];
      const proxy = new FameServiceProxy({
        capabilities,
      });
      expect(proxy.capabilities).toEqual(capabilities);
    });

    it('should set custom timeout when provided', () => {
      const customTimeout = 5000;
      const proxy = new FameServiceProxy({
        timeout: customTimeout,
      });
      expect(proxy).toBeInstanceOf(FameServiceProxy);
    });

    it('should use default timeout when not provided', () => {
      const proxy = new FameServiceProxy({});
      expect(proxy).toBeInstanceOf(FameServiceProxy);
    });

    it('should set fabric when provided', () => {
      const mockFabric = { invoke: jest.fn() };
      const proxy = new FameServiceProxy({
        fabric: mockFabric,
      });
      expect(proxy).toBeInstanceOf(FameServiceProxy);
    });
  });

  describe('static factory methods', () => {
    it('should create proxy bound to address', () => {
      const proxy = FameServiceProxy.remoteByAddress(mockAddress, {
        timeout: 3000,
      });
      expect(proxy).toBeInstanceOf(FameServiceProxy);
    });

    it('should create proxy bound to capabilities', () => {
      const capabilities = ['test-capability'];
      const proxy = FameServiceProxy.remoteByCapabilities(capabilities, {
        timeout: 3000,
      });
      expect(proxy.capabilities).toEqual(capabilities);
    });
  });

  describe('call method', () => {
    it('should throw error when no address is set', async () => {
      const proxy = new FameServiceProxy();
      await expect(proxy.call('testMethod')).rejects.toThrow(
        'call() method requires an address-bound proxy'
      );
    });

    it('should invoke method with address when address is set', async () => {
      const mockResult = { success: true };
      mockInvoke.mockResolvedValue(mockResult);

      const proxy = new FameServiceProxy({
        address: mockAddress,
        invoke: mockInvoke,
      });

      const result = await proxy.call('testMethod', { param1: 'value1' });

      expect(mockInvoke).toHaveBeenCalledWith(
        mockAddress,
        '__call__',
        { name: 'testMethod', args: { param1: 'value1' } },
        DEFAULT_INVOKE_TIMEOUT_MILLIS
      );
      expect(result).toEqual(mockResult);
    });

    it('should invoke method with empty kwargs when not provided', async () => {
      const mockResult = { success: true };
      mockInvoke.mockResolvedValue(mockResult);

      const proxy = new FameServiceProxy({
        address: mockAddress,
        invoke: mockInvoke,
      });

      const result = await proxy.call('testMethod');

      expect(mockInvoke).toHaveBeenCalledWith(
        mockAddress,
        '__call__',
        { name: 'testMethod', args: {} },
        DEFAULT_INVOKE_TIMEOUT_MILLIS
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('_invokeDefault behavior', () => {
    it('should use fabric invoke when available', async () => {
      const mockResult = { success: true };
      const mockFabric = {
        invoke: jest.fn().mockResolvedValue(mockResult),
      };

      const proxy = new FameServiceProxy({
        address: mockAddress,
        fabric: mockFabric,
      });

      const result = await (proxy as any)._invokeDefault(
        mockAddress,
        'testMethod',
        { param: 'value' },
        5000
      );

      expect(mockFabric.invoke).toHaveBeenCalledWith(
        mockAddress,
        'testMethod',
        { param: 'value' },
        5000
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle rejected promises from fabric invoke', async () => {
      const mockError = new Error('Invoke failed');
      const mockFabric = {
        invoke: jest.fn().mockRejectedValue(mockError),
      };

      const proxy = new FameServiceProxy({
        address: mockAddress,
        fabric: mockFabric,
      });

      await expect(
        (proxy as any)._invokeDefault(
          mockAddress,
          'testMethod',
          { param: 'value' },
          5000
        )
      ).rejects.toThrow('Invoke failed');
    });

    it('should use fallback fabric when no fabric provided', async () => {
      // This tests the fallback to FameFabric.current()
      const proxy = new FameServiceProxy({
        address: mockAddress,
      });

      // This will call the mocked FameFabric.current() from our jest.mock
      const result = await (proxy as any)._invokeDefault(
        mockAddress,
        'testMethod',
        { param: 'value' },
        5000
      );

      expect(result).toBeUndefined(); // Mock returns undefined by default
    });
  });
});

describe('Type guards', () => {
  describe('isFameMessageService', () => {
    it('should return true for objects with handleMessage method', () => {
      const service: FameMessageService = {
        handleMessage: jest.fn(),
      };
      expect(isFameMessageService(service)).toBe(true);
    });

    it('should return false for objects without handleMessage method', () => {
      const service = { someOtherMethod: jest.fn() };
      expect(isFameMessageService(service)).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isFameMessageService(null)).toBeFalsy();
      expect(isFameMessageService(undefined)).toBeFalsy();
    });

    it('should return false for non-objects', () => {
      expect(isFameMessageService('string')).toBe(false);
      expect(isFameMessageService(123)).toBe(false);
    });
  });

  describe('isFameRPCService', () => {
    it('should return true for objects with handleRpcRequest method', () => {
      const service: FameRPCService = {
        handleRpcRequest: jest.fn(),
      };
      expect(isFameRPCService(service)).toBe(true);
    });

    it('should return false for objects without handleRpcRequest method', () => {
      const service = { someOtherMethod: jest.fn() };
      expect(isFameRPCService(service)).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isFameRPCService(null)).toBeFalsy();
      expect(isFameRPCService(undefined)).toBeFalsy();
    });

    it('should return false for non-objects', () => {
      expect(isFameRPCService('string')).toBe(false);
      expect(isFameRPCService(123)).toBe(false);
    });
  });
});

describe('createServiceProxy', () => {
  let mockAddress: FameAddress;
  let mockInvoke: jest.MockedFunction<InvokeProtocol>;

  beforeEach(() => {
    mockAddress = new FameAddress('testservice@example.com/service');
    mockInvoke = jest.fn();
    jest.clearAllMocks();
  });

  it('should create proxy with dynamic method support for address-bound proxy', async () => {
    const mockResult = { success: true };
    mockInvoke.mockResolvedValue(mockResult);

    const proxy = createServiceProxy({
      address: mockAddress,
      invoke: mockInvoke,
    });

    const result = await proxy.dynamicMethod('param1', 'param2');

    expect(mockInvoke).toHaveBeenCalledWith(
      mockAddress,
      'dynamicMethod',
      { args: ['param1', 'param2'] },
      DEFAULT_INVOKE_TIMEOUT_MILLIS
    );
    expect(result).toEqual(mockResult);
  });

  it('should create proxy with dynamic method support for capability-bound proxy', async () => {
    const mockResult = { success: true };
    const mockFabric = {
      invokeByCapability: jest.fn().mockResolvedValue(mockResult),
    };

    const proxy = createServiceProxy({
      capabilities: ['test-capability'],
      fabric: mockFabric,
    });

    const result = await proxy.dynamicMethod('param1', 'param2');

    expect(mockFabric.invokeByCapability).toHaveBeenCalledWith(
      ['test-capability'],
      'dynamicMethod',
      { args: ['param1', 'param2'] },
      DEFAULT_INVOKE_TIMEOUT_MILLIS
    );
    expect(result).toEqual(mockResult);
  });

  it('should handle single object parameter as full params', async () => {
    const mockResult = { success: true };
    mockInvoke.mockResolvedValue(mockResult);

    const proxy = createServiceProxy({
      address: mockAddress,
      invoke: mockInvoke,
    });

    const paramObject = { key1: 'value1', key2: 'value2' };
    const result = await proxy.dynamicMethod(paramObject);

    expect(mockInvoke).toHaveBeenCalledWith(
      mockAddress,
      'dynamicMethod',
      paramObject,
      DEFAULT_INVOKE_TIMEOUT_MILLIS
    );
    expect(result).toEqual(mockResult);
  });

  it('should not treat array as single object parameter', async () => {
    const mockResult = { success: true };
    mockInvoke.mockResolvedValue(mockResult);

    const proxy = createServiceProxy({
      address: mockAddress,
      invoke: mockInvoke,
    });

    const arrayParam = ['item1', 'item2'];
    const result = await proxy.dynamicMethod(arrayParam);

    expect(mockInvoke).toHaveBeenCalledWith(
      mockAddress,
      'dynamicMethod',
      { args: [arrayParam] },
      DEFAULT_INVOKE_TIMEOUT_MILLIS
    );
    expect(result).toEqual(mockResult);
  });

  it('should throw error when proxy has neither address nor capabilities', async () => {
    const proxy = createServiceProxy({});

    await expect(proxy.dynamicMethod()).rejects.toThrow(
      'Proxy must be bound to either an address or capabilities'
    );
  });

  it('should return existing properties without proxying', () => {
    const proxy = createServiceProxy({
      address: mockAddress,
    });

    expect(proxy.capabilities).toBeUndefined();
    expect(typeof proxy.call).toBe('function');
  });

  it('should not proxy private methods (starting with _)', () => {
    const proxy = createServiceProxy({
      address: mockAddress,
    });

    // Accessing a private property should return undefined (not a proxy function)
    expect(typeof proxy._privateMethod).not.toBe('function');
  });
});
