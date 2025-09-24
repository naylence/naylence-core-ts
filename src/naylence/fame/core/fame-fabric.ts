import { FameAddress } from './address/address';
import { FameConfig } from './fame-config';

// Forward declarations - these will be implemented in their respective modules
export interface FameMessageHandler {
  handle(message: unknown): Promise<void>;
}

export interface FameEnvelope {
  to: FameAddress;
  frame: DataFrame;
}

export function createFameEnvelope(options: { to: FameAddress; frame: DataFrame }): FameEnvelope {
  return {
    to: options.to,
    frame: options.frame,
  };
}

export class DataFrame {
  constructor(public readonly payload: unknown) {}
}

export interface DeliveryAckFrame {
  success: boolean;
}

export interface FameService {
  name?: string;
}

// Context variable stack for fabric instances
let fabricStack: FameFabric[] = [];

/**
 * Testing utility: clear the stack for the current task.
 */
export function resetFabricStack(): void {
  fabricStack = [];
}

/**
 * Abstract base class for Fame Fabric implementations
 */
export abstract class FameFabric {
  // ----- abstract interface --------------------------------------------------

  abstract send(
    envelope: FameEnvelope,
    timeoutMs?: number | null
  ): Promise<DeliveryAckFrame | null>;

  async sendMessage(
    address: FameAddress | string,
    message: unknown
  ): Promise<DeliveryAckFrame | null> {
    return await this.send(
      createFameEnvelope({
        to: typeof address === 'string' ? new FameAddress(address) : address,
        frame: new DataFrame({ payload: message }),
      })
    );
  }

  abstract invoke(
    address: FameAddress,
    method: string,
    params: Record<string, unknown>,
    timeoutMs?: number
  ): Promise<unknown>;

  abstract invokeByCapability(
    capabilities: string[],
    method: string,
    params: Record<string, unknown>,
    timeoutMs?: number
  ): Promise<unknown>;

  abstract invokeStream(
    address: FameAddress,
    method: string,
    params: Record<string, unknown>,
    timeoutMs?: number
  ): AsyncIterable<unknown>;

  abstract invokeByCapabilityStream(
    capabilities: string[],
    method: string,
    params: Record<string, unknown>,
    timeoutMs?: number
  ): AsyncIterable<unknown>;

  abstract subscribe(
    sinkAddress: FameAddress,
    handler: FameMessageHandler,
    name?: string | null
  ): Promise<void>;

  abstract serve(
    service: FameService,
    serviceName?: string | null
  ): Promise<FameAddress>;

  abstract resolveServiceByCapability(capability: string): FameService;

  // ----- optional lifecycle hooks -------------------------------------------

  async start(): Promise<void> {
    // Default implementation does nothing
  }

  async stop(): Promise<void> {
    // Default implementation does nothing
  }

  // ----- internal state ------------------------------------------------------

  private _started: boolean = false;
  private _stopped: boolean = false;
  private _ctxToken: number | null = null; // Stack index

  // ----- async-context-manager ----------------------------------------------

  async enter(): Promise<FameFabric> {
    if (this._ctxToken !== null) {
      throw new Error('Cannot re-enter the same FameFabric instance');
    }

    // push-on-stack
    const currentLength = fabricStack.length;
    fabricStack.push(this);
    this._ctxToken = currentLength;

    // start (idempotent)
    if (!this._started) {
      await this.start();
      this._started = true;
    }

    return this;
  }

  async exit(error?: Error): Promise<void> {
    const originalError = error; // preserve body exception, if any
    try {
      if (!this._stopped) {
        await this.stop();
        this._stopped = true;
      }
    } catch (error) {
      // Chain shutdown failure onto the original body error if both exist
      if (originalError) {
        const stopError = new Error(`Stop failed: ${error}`);
        (stopError as any).cause = originalError;
        throw stopError;
      }
      throw error;
    } finally {
      if (this._ctxToken !== null) {
        // Remove from stack
        fabricStack.splice(this._ctxToken, 1);
        this._ctxToken = null;
      }
    }
    // Re-throw original error if it exists
    if (originalError) {
      throw originalError;
    }
  }

  /**
   * Return the FameFabric at the top of the task-local stack, or throw.
   */
  static current(): FameFabric {
    if (fabricStack.length === 0) {
      throw new Error('No FameFabric active in this context');
    }
    return fabricStack[fabricStack.length - 1];
  }

  // ----- async factory -------------------------------------------------------

  /**
   * Create a FameFabric instance from configuration
   */
  static async create(options: {
    rootConfig?: Record<string, unknown> | FameConfig;
    [key: string]: unknown;
  } = {}): Promise<FameFabric> {
    // 1️⃣  canonicalise opts → FameFabricConfig
    let fabricConfig: unknown = null;
    let fameConfig: FameConfig | null = null;
    
    if (options.rootConfig) {
      if (typeof options.rootConfig === 'object' && 'fabric' in options.rootConfig) {
        fameConfig = options.rootConfig as FameConfig;
        fabricConfig = fameConfig.fabric;
      } else {
        fameConfig = options.rootConfig as FameConfig;
        fabricConfig = fameConfig.fabric;
      }
    }

    // 2️⃣  delegate to the real constructor
    return FameFabric.fromConfig(fabricConfig, options);
  }

  static async fromConfig(
    _cfg?: unknown,
    _kwargs: Record<string, unknown> = {}
  ): Promise<FameFabric> {
    /**
     * Build and manage a FameFabric using the `ResourceFactory` registry
     * (see `createResource`).
     */
    
    // For now, we'll need to implement factory resolution
    // This would normally use the factory registry from naylence-factory
    throw new Error('Factory resolution not yet implemented - requires naylence-factory integration');
  }

  /**
   * Get or create a fabric instance.
   * If there's already a Fabric on the stack, return it without starting or stopping.
   * Otherwise, delegate to create() as before.
   */
  static async getOrCreate(options: Record<string, unknown> = {}): Promise<FameFabric> {
    if (fabricStack.length > 0) {
      // Return the existing fabric
      return fabricStack[fabricStack.length - 1];
    }
    return FameFabric.create(options);
  }

  /**
   * Async context manager pattern
   */
  async use<T>(fn: (fabric: FameFabric) => Promise<T>): Promise<T> {
    await this.enter();
    try {
      return await fn(this);
    } finally {
      await this.exit();
    }
  }
}

// Export the fabric stack for testing
export { fabricStack };