import { z } from 'zod';
import { ensurePluginsLoadedFromConfig } from './plugins/bootstrap.js';

const PluginEntrySchema = z.union([
  z.string(),
  z.object({
    name: z.string(),
    export: z.string().optional(),
  }),
]);

export const FameConfigSchema = z
  .object({
    fabric: z.any().optional().describe('Fame fabric config'),
    plugins: z.array(PluginEntrySchema).optional().default([]),
    autoLoadPlugins: z.boolean().optional().default(true),
    pluginLogLevel: z
      .enum(['silent', 'error', 'warn', 'info', 'debug'])
      .optional()
      .default('warn'),
  })
  .loose();

export type FameConfig = z.infer<typeof FameConfigSchema>;
export type FameConfigInput = z.input<typeof FameConfigSchema>;

export async function normalizeFameConfig(
  input?: FameConfigInput | null
): Promise<FameConfig> {
  const prepared = prepareConfigInput(input);
  const parsed = FameConfigSchema.parse(prepared);
  await ensurePluginsLoadedFromConfig(parsed);
  return parsed;
}

function prepareConfigInput(input?: FameConfigInput | null): FameConfigInput {
  const base: Record<string, unknown> = {};

  if (input && typeof input === 'object') {
    Object.assign(base, input as Record<string, unknown>);
  }

  const plugins = base.plugins;

  if (plugins === undefined || plugins === null) {
    delete base.plugins;
  } else if (!Array.isArray(plugins)) {
    base.plugins = [plugins];
  }

  return base as FameConfigInput;
}