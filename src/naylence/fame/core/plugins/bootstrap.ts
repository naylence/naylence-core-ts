import type { FameConfig } from '../fame-config.js';
import type { PluginSpec } from '@naylence/factory';
import {
  loadPluginsFromSpecs,
  readFactoryManifestIfAny,
} from '@naylence/factory';

let bootstrapped = false;

export async function ensurePluginsLoadedFromConfig(cfg?: FameConfig): Promise<void> {
  if (bootstrapped || cfg?.autoLoadPlugins === false) {
    return;
  }

  const specs = resolvePluginList(cfg);
  const logger = createLogger(cfg?.pluginLogLevel ?? 'warn');
  let loadedCount = 0;
  let source: 'config' | 'manifest' | 'auto' = 'auto';

  try {
    if (specs.length > 0) {
      await loadPluginsFromSpecs(specs);
      loadedCount = specs.length;
      source = 'config';
    } else {
      const manifest = readFactoryManifestIfAny();
      const manifestSpecs = manifest?.plugins ?? [];
      if (manifestSpecs.length) {
        await loadPluginsFromSpecs(manifestSpecs);
        loadedCount = manifestSpecs.length;
        source = 'manifest';
      }
    }

    bootstrapped = true;
    logger.info?.(`[plugins] loaded (${loadedCount}) via ${source}.`);
  } catch (error) {
    logger.error?.(`[plugins] bootstrap error: ${(error as Error)?.message ?? error}`);
    bootstrapped = true;
  }
}

function resolvePluginList(cfg?: FameConfig): PluginSpec[] {
  const fromCfg = normalizeSpecs(cfg?.plugins ?? []);
  const fromEnv = readEnvPlugins();
  return dedupe([...fromCfg, ...fromEnv]);
}

function readEnvPlugins(): PluginSpec[] {
  if (typeof process === 'undefined' || !process?.env?.FAME_PLUGINS) {
    return [];
  }

  const raw = String(process.env.FAME_PLUGINS);
  const parts = raw.split(/[\s,]+/).map((part) => part.trim()).filter(Boolean);
  return normalizeSpecs(parts);
}

function normalizeSpecs(
  list: Array<string | { name: string; export?: string | null | undefined }>
): PluginSpec[] {
  const out: PluginSpec[] = [];

  for (const entry of list) {
    let spec: PluginSpec;

    if (typeof entry === 'string') {
      const [name, exp] = entry.split(':');
      if (!name) {
        continue;
      }
      spec = { name, export: exp || 'default' } satisfies PluginSpec;
    } else {
      if (!entry?.name) {
        continue;
      }
      spec = {
        name: entry.name,
        export: entry.export ?? 'default',
      } satisfies PluginSpec;
    }

    out.push(spec);
  }

  return out;
}

function dedupe(list: PluginSpec[]): PluginSpec[] {
  const seen = new Set<string>();
  const out: PluginSpec[] = [];

  for (const spec of list) {
    const key = `${spec.name}:${spec.export ?? 'default'}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(spec);
    }
  }

  return out;
}

function createLogger(level: FameConfig['pluginLogLevel']) {
  const allow = (severity: 'error' | 'warn' | 'info' | 'debug'): boolean => {
    if (level === 'silent') {
      return false;
    }

    if (severity === 'error') {
      return true;
    }

    if (severity === 'warn') {
      return level === 'warn' || level === 'info' || level === 'debug';
    }

    if (severity === 'info') {
      return level === 'info' || level === 'debug';
    }

    if (severity === 'debug') {
      return level === 'debug';
    }

    return false;
  };

  return {
    error: allow('error') ? console.error.bind(console) : undefined,
    warn: allow('warn') ? console.warn.bind(console) : undefined,
    info: allow('info') ? console.info.bind(console) : undefined,
    debug: allow('debug') ? console.debug.bind(console) : undefined,
  } as const;
}

export function _resetBootstrapStateForTests(): void {
  bootstrapped = false;
}
