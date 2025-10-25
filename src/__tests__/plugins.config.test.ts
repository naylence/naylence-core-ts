import path from 'node:path';
import { jest } from '@jest/globals';
import { normalizeFameConfig } from '../naylence/fame/core/fame-config';
import { FameFabricFactory } from '../naylence/fame/core/fame-fabric-factory';
import { FameFabric } from '../naylence/fame/core/fame-fabric';
import { _resetBootstrapStateForTests } from '../naylence/fame/core/plugins/bootstrap';
import { ExtensionManager } from '@naylence/factory';
import { registerFactoryManifest } from '@naylence/factory';
import type { FactoryManifest } from '../../../naylence-factory-ts/src/manifest';

type PluginHandler = jest.MockedFunction<() => Promise<void>>;

declare global {
  var __testPluginHandlers: Map<string, PluginHandler> | undefined;
}

const pluginHandlers = new Map<string, PluginHandler>();

function pluginModule(name: string): string {
  return path.resolve(__dirname, '__plugins', name);
}

const CONFIG_PLUGIN_MODULE = pluginModule('test-plugin-config.js');
const ENV_PLUGIN_MODULE = pluginModule('test-plugin-env.js');
const MANIFEST_PLUGIN_MODULE = pluginModule('test-plugin-manifest.js');
const IDEMPOTENT_PLUGIN_MODULE = pluginModule('test-plugin-idempotent.js');

function usePluginHandler(
  key: string,
  impl?: () => Promise<void> | void
): PluginHandler {
  const handler = jest.fn(async () => {
    if (impl) {
      await impl();
    }
  }) as PluginHandler;
  pluginHandlers.set(key, handler);
  return handler;
}

beforeEach(() => {
  pluginHandlers.clear();
  globalThis.__testPluginHandlers = pluginHandlers;
  _resetBootstrapStateForTests();
  registerFactoryManifest(null);
  delete process.env.FAME_PLUGINS;
});

afterEach(() => {
  pluginHandlers.clear();
  globalThis.__testPluginHandlers = undefined;
});

describe('FameConfig plugin bootstrapping', () => {
  it('skips plugin loading when autoLoadPlugins is false', async () => {
    const handler = usePluginHandler('config-default');

    await normalizeFameConfig({
      plugins: [CONFIG_PLUGIN_MODULE],
      autoLoadPlugins: false,
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('loads plugins declared in FameConfig and registers their factories', async () => {
    const factoryType = 'plugin-config-fabric';

    const handler = usePluginHandler('config-plugin', async () => {
      class PluginFabricFactory extends FameFabricFactory {
        public readonly type = factoryType;
        public readonly isDefault = true;
        public readonly priority = 5;

        public async create(): Promise<FameFabric> {
          return {} as FameFabric;
        }
      }

      ExtensionManager.registerGlobalFactory(
        'FameFabricFactory',
        factoryType,
        PluginFabricFactory
      );
    });

    await normalizeFameConfig({
      plugins: [`${CONFIG_PLUGIN_MODULE}:plugin`],
    });

    expect(handler).toHaveBeenCalledTimes(1);

    const registry =
      ExtensionManager.getExtensionsByType<FameFabric>('FameFabricFactory');
    expect(Array.from(registry.keys())).toContain(factoryType);

    ExtensionManager.unregisterGlobalFactory('FameFabricFactory', factoryType);
  });

  it('loads plugins from FAME_PLUGINS environment variable', async () => {
    const handler = usePluginHandler('env-default');
    process.env.FAME_PLUGINS = ENV_PLUGIN_MODULE;

    await normalizeFameConfig();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('falls back to manifest plugins when config is empty', async () => {
    const handler = usePluginHandler('manifest-plugin');

    const manifest: FactoryManifest = {
      plugins: [{ name: MANIFEST_PLUGIN_MODULE, export: 'plugin' }],
    };

    registerFactoryManifest(manifest);

    await normalizeFameConfig({ plugins: [] });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('is safe when process.env is unavailable (browser environments)', async () => {
    const handler = usePluginHandler('env-default');
    process.env.FAME_PLUGINS = ENV_PLUGIN_MODULE;

    const originalProcess = globalThis.process;
    (globalThis as unknown as { process?: unknown }).process = undefined;

    try {
      await normalizeFameConfig({ plugins: [] });

      // process.env should be ignored when process is undefined
      expect(handler).not.toHaveBeenCalled();
    } finally {
      (globalThis as unknown as { process?: unknown }).process =
        originalProcess;
    }
  });

  it('initializes plugins only once even when normalizeFameConfig is called multiple times', async () => {
    const handler = usePluginHandler('idempotent-plugin');

    await normalizeFameConfig({ plugins: [IDEMPOTENT_PLUGIN_MODULE] });
    await normalizeFameConfig({ plugins: [IDEMPOTENT_PLUGIN_MODULE] });

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
