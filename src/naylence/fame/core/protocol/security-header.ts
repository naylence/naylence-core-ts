import { z } from 'zod';

export const DEFAULT_SIGNATURE_ALGORITHM = 'EdDSA';
export const DEFAULT_ENC_ALG = 'ECDH-ES+A256GCM';

export const SignatureHeaderSchema = z.object({
  alg: z.string().optional(),
  kid: z.string().optional().describe('Key id'),
  val: z.string(),
});

export type SignatureHeader = z.infer<typeof SignatureHeaderSchema>;

export const EncryptionHeaderSchema = z.object({
  alg: z.string().default(DEFAULT_ENC_ALG),
  kid: z.string().optional().describe('Key id'),
  val: z.string(),
});

export type EncryptionHeader = z.infer<typeof EncryptionHeaderSchema>;

export const SecurityHeaderSchema = z.object({
  sig: SignatureHeaderSchema.optional().describe('Signature header'),
  enc: EncryptionHeaderSchema.optional().describe('Encryption header'),
});

export type SecurityHeader = z.infer<typeof SecurityHeaderSchema>;