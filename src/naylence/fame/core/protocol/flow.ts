import { z } from 'zod';

export const CreditUpdateFrameSchema = z.object({
  type: z.literal('CreditUpdate').default('CreditUpdate'),
  flowId: z.string().describe('Which flow to refill'),
  credits: z.number().int().describe('Number of new credits granted'),
});

export type CreditUpdateFrame = z.infer<typeof CreditUpdateFrameSchema>;

export enum FlowFlags {
  NONE = 0,
  SYN = 1 << 0,  // initial window open
  ACK = 1 << 1,  // credit update
  RESET = 1 << 2,  // flow teardown
}