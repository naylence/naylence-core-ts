import {
  type BytesLike,
  type GenerateIdOptions,
  decodeBase64Fallback,
  createBlacklist,
  generateRandomCandidate,
  normalizeHashAlgorithmNames,
  materialToBytes,
  rehashUntilCleanAsync,
  fallbackHash,
} from './id-generator.shared.js';

const textEncoder = ensureEncoder();
const textDecoder = ensureDecoder();

const STORAGE_SEED_KEY = 'naylence:fame:seed';
let cachedBrowserSeed: string | null = null;

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

function ensureDecoder(): TextDecoder {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder();
  }

  const util = (globalThis as any).util;
  if (util?.TextDecoder) {
    return new util.TextDecoder();
  }

  const { TextDecoder: ImportedTextDecoder } = require('util') as typeof import('node:util');
  return new ImportedTextDecoder() as unknown as TextDecoder;
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

function getCanonicalArgv(): string {
  return 'browser';
}

async function getDefaultBrowserFingerprint(extraMaterial?: BytesLike): Promise<Uint8Array> {
  const hostFingerprint = `seed:${getStableBrowserSeed()}`;
  const codeFingerprint = getCanonicalArgv();
  const parts = [`${hostFingerprint}`, `${codeFingerprint}`];

  if (extraMaterial !== undefined && extraMaterial !== null) {
    let salt: string;
    if (typeof extraMaterial === 'string') {
      salt = extraMaterial;
    } else if (extraMaterial instanceof Uint8Array) {
      salt = textDecoder.decode(extraMaterial);
    } else {
      salt = String(extraMaterial);
    }
    parts.push(`salt:${salt}`);
  }

  const payload = parts.join('|');
  return textEncoder.encode(payload);
}

function getStableBrowserSeed(): string {
  if (cachedBrowserSeed) {
    return cachedBrowserSeed;
  }

  const storages = getWritableStorages();
  for (const storage of storages) {
    const stored = readSeed(storage);
    if (stored) {
      cachedBrowserSeed = stored;
      return stored;
    }
  }

  const seed = generateSeed();
  for (const storage of storages) {
    if (writeSeed(storage, seed)) {
      cachedBrowserSeed = seed;
      return seed;
    }
  }

  cachedBrowserSeed = seed;
  return seed;
}

function readSeed(storage: Storage): string | null {
  try {
    return storage.getItem(STORAGE_SEED_KEY);
  } catch {
    return null;
  }
}

function writeSeed(storage: Storage, seed: string): boolean {
  try {
    storage.setItem(STORAGE_SEED_KEY, seed);
    return true;
  } catch {
    return false;
  }
}

function getWritableStorages(): Storage[] {
  const storages: Storage[] = [];

  const storageNames: Array<'localStorage' | 'sessionStorage'> = [
    'localStorage',
    'sessionStorage',
  ];

  for (const name of storageNames) {
    const storage = resolveStorage(name);
    if (storage) {
      storages.push(storage);
    }
  }

  return storages;
}

function resolveStorage(name: 'localStorage' | 'sessionStorage'): Storage | null {
  try {
    const storage = (globalThis as any)[name] as Storage | undefined;
    if (!storage) {
      return null;
    }

    const probeKey = `${STORAGE_SEED_KEY}:probe`;
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return storage;
  } catch {
    return null;
  }
}

function generateSeed(): string {
  const bytes = getRandomBytes(16);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function generateId(options: GenerateIdOptions = {}): string {
  const {
    length = 16,
    mode = 'random',
    blacklist = BLACKLIST_ID_WORDS,
  } = options;

  if (mode !== 'random' && mode !== 'fingerprint') {
    throw new Error("mode must be 'random' or 'fingerprint'");
  }

  if (mode === 'random') {
    return generateRandomCandidate(length, getRandomBytes, blacklist);
  }

  throw new Error('Browser environment requires async ID generation - use generateIdAsync instead');
}

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

  let materialBytes: Uint8Array;
  if (material === undefined || material === null) {
    const envSalt = (globalThis as any).process?.env?.FAME_NODE_ID_SALT;
    materialBytes = await getDefaultBrowserFingerprint(envSalt ?? '');
  } else {
    materialBytes = materialToBytes(material, textEncoder);
  }

  const initialDigest = await hashAsync(materialBytes, hashAlg);
  return rehashUntilCleanAsync(
    initialDigest,
    length,
    (input) => hashAsync(input, hashAlg),
    blacklist
  );
}

export { decodeBase64Fallback, type BytesLike, type GenerateIdOptions };
