import { FameFabric } from './fame-fabric.js';

export async function runWithFabric<T>(fabric: FameFabric, fn: (f: FameFabric) => Promise<T>): Promise<T> {
  return fabric.scope(fn);
}
