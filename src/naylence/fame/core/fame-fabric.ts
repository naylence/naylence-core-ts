import { FameAddress } from './address/address.js';
import { type FameConfig, normalizeFameConfig } from './fame-config.js';
import type { FameFabricConfig } from './fame-fabric-config.js';
import { createFameEnvelope, type FameEnvelope } from './protocol/envelope.js';
import { type DataFrame, type DeliveryAckFrame } from './protocol/frames.js';
import { type FameMessageHandler } from './handlers/handlers.js';
import { type FameService } from './service/fame-service.js';
import {
  type CreateResourceOptions,
  ExtensionManager,
  createDefaultResource,
  createResource,
} from 'naylence-factory';
import { resolveDefaultFameConfig } from './default-fame-config-resolver.js';

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
    const target = typeof address === 'string' ? new FameAddress(address) : address;
    const frame: DataFrame = {
      type: 'Data',
      payload: message,
    };

    return await this.send(
      createFameEnvelope({
        to: target,
        frame,
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
  ): Promise<AsyncIterable<unknown>>;

  abstract invokeByCapabilityStream(
    capabilities: string[],
    method: string,
    params: Record<string, unknown>,
    timeoutMs?: number
  ): Promise<AsyncIterable<unknown>>;

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
    const fabric = fabricStack[fabricStack.length - 1];
    if (!fabric) {
      throw new Error('No FameFabric active in this context');
    }
    return fabric;
  }

  // ----- async factory -------------------------------------------------------

  /**
   * Create a FameFabric instance from configuration
   */
  static async create(options: {
    rootConfig?: Record<string, unknown> | FameConfig;
    [key: string]: unknown;
  } = {}): Promise<FameFabric> {
    const { rootConfig: rootConfigInput, ...rest } = options;
    const candidate =
      rootConfigInput && typeof rootConfigInput === 'object' && !Array.isArray(rootConfigInput)
        ? (rootConfigInput as FameConfig)
        : undefined;

    let resolvedRootConfig: FameConfig | Record<string, unknown> | null = candidate ?? null;

    if (!resolvedRootConfig) {
      const defaultConfig = await resolveDefaultFameConfig();
      if (defaultConfig) {
        resolvedRootConfig = defaultConfig as FameConfig | Record<string, unknown>;
      }
    }

    const normalized = await normalizeFameConfig(resolvedRootConfig ?? undefined);
    const nextOptions = {
      ...rest,
      rootConfig: normalized,
      rawRootConfig: resolvedRootConfig ?? null,
    };

    return FameFabric.fromConfig(normalized.fabric, nextOptions);
  }

  static async fromConfig(
    _cfg?: unknown,
    _kwargs: Record<string, unknown> = {}
  ): Promise<FameFabric> {
    /**
     * Build and manage a FameFabric using the `ResourceFactory` registry
     * (see `createResource`).
     */
    
    const kwargs = { ..._kwargs } as CreateResourceOptions & {
      rootConfig?: Record<string, unknown> | FameConfig | null;
      rawRootConfig?: Record<string, unknown> | FameConfig | null;
    };
    const configInput = _cfg;

    const rootConfig = kwargs.rootConfig ?? null;
    if ('rootConfig' in kwargs) {
      delete (kwargs as Record<string, unknown>).rootConfig;
    }

    const rawRootConfig = kwargs.rawRootConfig ?? null;
    if ('rawRootConfig' in kwargs) {
      delete (kwargs as Record<string, unknown>).rawRootConfig;
    }

    if (rootConfig !== null && rootConfig !== undefined) {
      const existingArgs = Array.isArray(kwargs.factoryArgs) ? [...kwargs.factoryArgs] : [];
      existingArgs.push(rootConfig);
      if (rawRootConfig !== null && rawRootConfig !== undefined) {
        existingArgs.push(rawRootConfig);
      }
      kwargs.factoryArgs = existingArgs;
    } else if (rawRootConfig !== null && rawRootConfig !== undefined) {
      const existingArgs = Array.isArray(kwargs.factoryArgs) ? [...kwargs.factoryArgs] : [];
      existingArgs.push(rawRootConfig);
      kwargs.factoryArgs = existingArgs;
    }

    if (
      configInput !== undefined &&
      configInput !== null &&
      (typeof configInput !== 'object' || Array.isArray(configInput))
    ) {
      throw new Error('FameFabric.fromConfig expects configuration to be an object');
    }

    const baseTypeName = 'FameFabricFactory';

    // Ensure the extension manager for fabrics is initialised so manual registrations are honoured.
    ExtensionManager.getExtensionManager<FameFabric, FameFabricConfig | Record<string, unknown>>(
      'naylence.fabric',
      baseTypeName
    );

    const config =
      configInput && typeof configInput === 'object' && !Array.isArray(configInput)
        ? (configInput as FameFabricConfig | Record<string, unknown>)
        : null;

    const fabric = config
      ? await createResource<FameFabric>(baseTypeName, config, kwargs)
      : await createDefaultResource<FameFabric>(baseTypeName, null, kwargs);

    if (!fabric) {
      throw new Error('No default FameFabricFactory registered');
    }

    return fabric;
  }

  /**
   * Get or create a fabric instance.
   * If there's already a Fabric on the stack, return it without starting or stopping.
   * Otherwise, delegate to create() as before.
   */
  static async getOrCreate(options: Record<string, unknown> = {}): Promise<FameFabric> {
    if (fabricStack.length > 0) {
      // Return the existing fabric
      const fabric = fabricStack[fabricStack.length - 1];
      if (!fabric) {
        throw new Error('No FameFabric active in this context');
      }
      return fabric;
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

// If create() takes an options arg, this resolves to it; otherwise it's never | undefined.
type FabricOpts = Parameters<typeof FameFabric.create>[0];

export async function withFabric<T>(
  fn: (fabric: FameFabric) => Promise<T>,
): Promise<T>;

export async function withFabric<T>(
  opts: FabricOpts,
  fn: (fabric: FameFabric) => Promise<T>,
): Promise<T>;

export async function withFabric<T>(
  optsOrFn: FabricOpts | ((fabric: FameFabric) => Promise<T>),
  maybeFn?: (fabric: FameFabric) => Promise<T>,
): Promise<T> {
  const fn = (typeof optsOrFn === "function" ? optsOrFn : maybeFn)!;
  const opts = typeof optsOrFn === "function" ? undefined : optsOrFn;

  // If create() has no params, the extra arg is ignored at compile time
  // because FabricOpts will be never|undefined and opts will be undefined.
  const fabric = await (opts === undefined
    ? (FameFabric.create as () => Promise<FameFabric>)()
    : (FameFabric.create as (o: FabricOpts) => Promise<FameFabric>)(opts));

  await fabric.enter();
  try {
    return await fn(fabric);
  } finally {
    await fabric.exit?.();
  }
}


// Export the fabric stack for testing
export { fabricStack };
export { createFameEnvelope };
export type { FameEnvelope };
export type { DeliveryAckFrame };
export type { FameMessageHandler };
export type { FameService };