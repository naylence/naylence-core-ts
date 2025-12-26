import {
  type BytesLike,
  type GenerateIdOptions,
  decodeBase64Fallback,
  createBlacklist,
  generateRandomCandidate,
  normalizeHashAlgorithmNames,
  materialToBytes,
  rehashUntilCleanAsync,
  generateFingerprintSync,
  fallbackHash,
} from './id-generator.shared.js';

const textEncoder = ensureEncoder();

function ensureEncoder(): TextEncoder {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder();
  }

  const util = (globalThis as any).util;
  if (util?.TextEncoder) {
    return new util.TextEncoder();
  }

  const { TextEncoder: ImportedTextEncoder } = require('util') as typeof import('node:util');
  return new ImportedTextEncoder();
}

function decodeBase64(str: string): string {
  if (typeof atob === 'function') {
    return atob(str);
  }

  const bufferLike = (globalThis as any).Buffer;
  if (bufferLike) {
    return bufferLike.from(str, 'base64').toString('utf8');
  }

  return decodeBase64Fallback(str);
}

const BLACKLIST_ID_WORDS = createBlacklist(decodeBase64);

function getRandomBytes(length: number): Uint8Array {
  const cryptoRef = (globalThis as any).crypto;
  if (cryptoRef?.getRandomValues) {
    const bytes = new Uint8Array(length);
    cryptoRef.getRandomValues(bytes);
    return bytes;
  }

  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

async function hashAsync(data: Uint8Array, algorithm = 'sha256'): Promise<Uint8Array> {
  const { subtle } = normalizeHashAlgorithmNames(algorithm);
  const cryptoRef = (globalThis as any).crypto;

  if (cryptoRef?.subtle) {
    try {
      const buffer = new ArrayBuffer(data.length);
      const view = new Uint8Array(buffer);
      view.set(data);
      const digest = await cryptoRef.subtle.digest(subtle, buffer);
      return new Uint8Array(digest);
    } catch {
      // ignore
    }
  }

  return fallbackHash(data);
}

/**
 * Synchronous ID generation in the browser.
 * 
 * - mode: "random" → generates a random ID using crypto.getRandomValues when available
 * - mode: "fingerprint" → falls back to random behavior (fingerprinting requires async)
 * 
 * Note: In the browser, deterministic fingerprinting requires async operations.
 * Use generateIdAsync with explicit `material` for deterministic IDs.
 */
export function generateId(options: GenerateIdOptions = {}): string {
  const {
    length = 16,
    mode = 'random',
    blacklist = BLACKLIST_ID_WORDS,
  } = options;

  if (mode !== 'random' && mode !== 'fingerprint') {
    throw new Error("mode must be 'random' or 'fingerprint'");
  }

  // In the browser, both modes use random generation for the sync API
  // Fingerprinting requires async operations and explicit material
  return generateRandomCandidate(length, getRandomBytes, blacklist);
}

/**
 * Asynchronous ID generation in the browser.
 * 
 * - mode: "random" → generates a random ID using crypto.getRandomValues when available
 * - mode: "fingerprint" WITH explicit `material` → generates a deterministic ID by hashing the provided material
 * - mode: "fingerprint" WITHOUT `material` → falls back to random behavior (no implicit fingerprinting)
 * 
 * Note: This implementation does NOT create browser fingerprints or use localStorage/sessionStorage.
 * For deterministic IDs, you must explicitly provide `material` in fingerprint mode.
 */
export async function generateIdAsync(options: GenerateIdOptions = {}): Promise<string> {
  const {
    length = 16,
    mode = 'random',
    material,
    blacklist = BLACKLIST_ID_WORDS,
    hashAlg = 'sha256',
  } = options;

  if (mode !== 'random' && mode !== 'fingerprint') {
    throw new Error("mode must be 'random' or 'fingerprint'");
  }

  if (mode === 'random') {
    return generateRandomCandidate(length, getRandomBytes, blacklist);
  }

  // Fingerprint mode: only deterministic if material is explicitly provided
  if (material === undefined || material === null) {
    // No implicit fingerprinting - fall back to random
    return generateRandomCandidate(length, getRandomBytes, blacklist);
  }

  // Deterministic ID generation using explicit material
  const materialBytes = materialToBytes(material, textEncoder);
  const initialDigest = await hashAsync(materialBytes, hashAlg);
  return rehashUntilCleanAsync(
    initialDigest,
    length,
    (input) => hashAsync(input, hashAlg),
    blacklist
  );
}

export { decodeBase64Fallback, generateFingerprintSync, type BytesLike, type GenerateIdOptions };
