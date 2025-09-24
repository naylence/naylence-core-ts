import { z } from 'zod';

export const FameConfigSchema = z.object({
  fabric: z.any().optional().describe('Fame fabric config'),
});

export type FameConfig = z.infer<typeof FameConfigSchema>;