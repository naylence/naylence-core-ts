import { FameFabric } from './fame-fabric.js';
import { FameFabricConfig } from './fame-fabric-config.js';

// Define our own ResourceFactory interface for now
export interface ResourceFactory<T = unknown, C = unknown> {
  readonly type: string;
  readonly isDefault?: boolean;
  readonly priority?: number;
  create(config?: C | Record<string, unknown> | null, ...kwargs: unknown[]): Promise<T>;
}

/**
 * Entry-point base-class for concrete fabric factories.
 */
export abstract class FameFabricFactory implements ResourceFactory<FameFabric, FameFabricConfig> {
  public abstract readonly type: string;
  public readonly isDefault: boolean = false;
  public readonly priority: number = 0;
  
  public abstract create(
    config?: FameFabricConfig | Record<string, unknown> | null,
    ...kwargs: unknown[]
  ): Promise<FameFabric>;
}