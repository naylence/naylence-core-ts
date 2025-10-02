jest.mock('../plugins/bootstrap.js', () => ({
  ensurePluginsLoadedFromConfig: jest.fn().mockResolvedValue(undefined),
}));

import { normalizeFameConfig } from '../fame-config.js';

describe('FameConfig normalization', () => {
  it('wraps single plugin string into an array', async () => {
    const config = await normalizeFameConfig({ plugins: '@naylence/plugin-example' } as any);
    expect(config.plugins).toEqual(['@naylence/plugin-example']);
  });

  it('wraps single plugin object into an array', async () => {
    const config = await normalizeFameConfig({
      plugins: { name: '@naylence/plugin-example', export: 'bootstrap' },
    } as any);

    expect(config.plugins).toEqual([
      { name: '@naylence/plugin-example', export: 'bootstrap' },
    ]);
  });

  it('retains unknown attributes for extended configs', async () => {
    const config = await normalizeFameConfig({
      node: { transport: 'in-memory' },
    } as any);

    expect((config as Record<string, unknown>).node).toEqual({ transport: 'in-memory' });
  });
});
