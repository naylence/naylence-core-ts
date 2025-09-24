import { FameAddress } from '../address/address';
import { FameRPCHandler, FameEnvelopeHandler } from '../handlers/handlers';
import { FameEnvelope } from '../protocol/envelope';
import { FameDeliveryContext } from '../protocol/delivery-context';
import { DEFAULT_INVOKE_TIMEOUT_MILLIS } from '../util/constants';

/**
 * Protocol for invoking methods on a specific address
 */
export interface InvokeProtocol {
  (
    targetAddr: FameAddress,
    method: string,
    params: Record<string, any>,
    timeoutMs?: number
  ): Promise<any>;
}

/**
 * Protocol for invoking methods by capability
 */
export interface InvokeByCapabilityProtocol {
  (
    capabilities: string[],
    method: string,
    params: Record<string, any>,
    timeoutMs?: number
  ): Promise<any>;
}

/**
 * Base Fame service interface
 */
export interface FameService {
  readonly capabilities?: string[] | undefined;
}

/**
 * Factory interface for creating Fame services
 */
export interface FameServiceFactory<T extends FameService = FameService> {
  create(config: any): T;
}

/**
 * Fame service that handles messages
 */
export interface FameMessageService extends FameService {
  handleMessage(envelope: FameEnvelope, context?: FameDeliveryContext): Promise<void>;
}

/**
 * Fame service that handles RPC requests
 */
export interface FameRPCService extends FameService {
  handleRpcRequest(method: string, params: any): Promise<any>;
}

/**
 * Protocol for serving message handlers
 */
export interface ServeProtocol {
  (
    serviceName: string,
    handler: FameEnvelopeHandler,
    options?: {
      capabilities?: string[];
      pollTimeoutMs?: number;
    }
  ): Promise<FameAddress>;
}

/**
 * Protocol for serving RPC handlers
 */
export interface ServeRPCProtocol {
  (
    serviceName: string,
    handler: FameRPCHandler,
    options?: {
      capabilities?: string[];
      pollTimeoutMs?: number;
    }
  ): Promise<FameAddress>;
}

/**
 * Proxy configuration options
 */
export interface FameServiceProxyOptions {
  address?: FameAddress;
  capabilities?: string[];
  fabric?: any;
  invoke?: InvokeProtocol;
  invokeByCapability?: InvokeByCapabilityProtocol;
  timeout?: number;
}

/**
 * Generic service proxy that enables typed remote method calls
 */
export class FameServiceProxy implements FameService {
  private _invoke: InvokeProtocol;
  private _invokeByCapability: InvokeByCapabilityProtocol;
  private _fabric?: any;
  private _address?: FameAddress | undefined;
  private _capabilities?: string[] | undefined;
  private _timeout: number;

  constructor(options: FameServiceProxyOptions = {}) {
    this._invoke = options.invoke || this._invokeDefault.bind(this);
    this._invokeByCapability = options.invokeByCapability || this._invokeByCapabilityDefault.bind(this);
    this._fabric = options.fabric;
    if (options.address !== undefined) this._address = options.address;
    if (options.capabilities !== undefined) this._capabilities = options.capabilities;
    this._timeout = options.timeout || DEFAULT_INVOKE_TIMEOUT_MILLIS;
  }

  get capabilities(): string[] | undefined {
    return this._capabilities;
  }

  /**
   * Create a proxy bound to a specific address
   */
  static remoteByAddress(
    address: FameAddress,
    options: Omit<FameServiceProxyOptions, 'address'> = {}
  ): FameServiceProxy {
    return new FameServiceProxy({ ...options, address });
  }

  /**
   * Create a proxy bound to capabilities
   */
  static remoteByCapabilities(
    capabilities: string[],
    options: Omit<FameServiceProxyOptions, 'capabilities'> = {}
  ): FameServiceProxy {
    return new FameServiceProxy({ ...options, capabilities });
  }

  private _invokeDefault(
    targetAddr: FameAddress,
    method: string,
    params: Record<string, any>,
    timeoutMs: number = this._timeout
  ): Promise<any> {
    // Import here to avoid circular dependency
    const { FameFabric } = require('../fame-fabric');
    const fabric = this._fabric || FameFabric.current();
    
    try {
      return fabric.invoke(targetAddr, method, params, timeoutMs);
    } catch (error) {
      // Fallback to capability-based invoke if direct invoke fails
      if (this._invokeByCapability && this._capabilities?.length) {
        return this._invokeByCapability(this._capabilities, method, params, timeoutMs);
      }
      throw error;
    }
  }

  private _invokeByCapabilityDefault(
    capabilities: string[],
    method: string,
    params: Record<string, any>,
    timeoutMs: number = this._timeout
  ): Promise<any> {
    // Import here to avoid circular dependency
    const { FameFabric } = require('../fame-fabric');
    const fabric = this._fabric || FameFabric.current();
    return fabric.invokeByCapability(capabilities, method, params, timeoutMs);
  }

  /**
   * Dynamic method invocation using Proxy - this would be implemented in a subclass
   * or used through createServiceProxy function
   */

  /**
   * Generic RPC-by-name: invokes the special "__call__" RPC on the service
   */
  async call(name: string, kwargs: Record<string, any> = {}): Promise<any> {
    if (!this._address) {
      throw new Error('call() method requires an address-bound proxy');
    }
    
    const params = { name, args: kwargs };
    return this._invoke(this._address, '__call__', params, this._timeout);
  }
}

/**
 * Type guards for service interfaces
 */
export function isFameMessageService(service: any): service is FameMessageService {
  return service && typeof service.handleMessage === 'function';
}

export function isFameRPCService(service: any): service is FameRPCService {
  return service && typeof service.handleRpcRequest === 'function';
}

/**
 * Helper function to create a service proxy with dynamic method support
 */
export function createServiceProxy(
  options: FameServiceProxyOptions
): any {
  const proxy = new FameServiceProxy(options);
  
  return new Proxy(proxy, {
    get: (target, prop: string | symbol) => {
      if (typeof prop === 'string' && !prop.startsWith('_') && !(prop in target)) {
        return async (...args: any[]) => {
          let params: Record<string, any>;
          
          // If you passed exactly one dict, treat it as the full params
          if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
            params = args[0];
          } else {
            // Otherwise, wrap posargs + kwargs in a single object
            params = { args };
          }

          if ((target as any)._address) {
            return (target as any)._invoke((target as any)._address, prop, params, (target as any)._timeout);
          } else if ((target as any)._capabilities) {
            return (target as any)._invokeByCapabilityDefault((target as any)._capabilities, prop, params, (target as any)._timeout);
          } else {
            throw new Error('Proxy must be bound to either an address or capabilities');
          }
        };
      }
      return (target as any)[prop];
    },
  });
}