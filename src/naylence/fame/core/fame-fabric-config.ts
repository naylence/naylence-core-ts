import { z } from 'zod';

// Define our own ResourceConfig interface for now
export interface ResourceConfig {
  type: string;
  [key: string]: unknown;
}

export const FameFabricConfigSchema = z.object({
  type: z.string().default('FameFabric'),
  opts: z.record(z.string(), z.any()).optional().default({}).describe('Arbitrary kwargs forwarded to the fabric factory'),
});

export type FameFabricConfig = z.infer<typeof FameFabricConfigSchema> & ResourceConfig;