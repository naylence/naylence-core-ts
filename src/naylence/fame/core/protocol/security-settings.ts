/**
 * Security profile definitions for negotiating cryptographic settings between nodes.
 */

import { z } from 'zod';

/**
 * Types of cryptographic evidence used for signing envelopes.
 */
export enum SigningMaterial {
  RAW_KEY = 'raw-key',     // Default: JWK-based signing
  X509_CHAIN = 'x509-chain', // CA-signed certificate chain for signing
}

/**
 * Negotiated security settings for node signing material.
 * This model is extensible - new fields can be added without breaking compatibility.
 */
export const SecuritySettingsSchema = z.object({
  signingMaterial: z.nativeEnum(SigningMaterial)
    .default(SigningMaterial.RAW_KEY)
    .describe('Type of cryptographic evidence used for signing envelopes'),
}).passthrough(); // Allow additional properties for future extensions

export type SecuritySettings = z.infer<typeof SecuritySettingsSchema>;