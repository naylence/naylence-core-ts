import type { FameConfigInput } from './fame-config.js';

export type FameConfigResolver = () =>
  | FameConfigInput
  | Record<string, unknown>
  | null
  | undefined
  | Promise<FameConfigInput | Record<string, unknown> | null | undefined>;

let currentResolver: FameConfigResolver | null = null;

export function setDefaultFameConfigResolver(resolver: FameConfigResolver | null): void {
  currentResolver = resolver ?? null;
}

export function getDefaultFameConfigResolver(): FameConfigResolver | null {
  return currentResolver;
}

export async function resolveDefaultFameConfig(): Promise<
  FameConfigInput | Record<string, unknown> | null
> {
  if (!currentResolver) {
    return null;
  }

  const result = await currentResolver();
  if (result == null) {
    return null;
  }

  if (typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('Default Fame config resolver must return an object, null, or undefined');
  }

  return result as FameConfigInput | Record<string, unknown>;
}
