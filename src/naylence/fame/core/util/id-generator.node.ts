import {
  type BytesLike,
  type GenerateIdOptions,
  type TextEncoderLike,
  decodeBase64Fallback,
  createBlacklist,
  generateRandomCandidate,
  normalizeHashAlgorithmNames,
  materialToBytes,
  rehashUntilCleanSync,
  rehashUntilCleanAsync,
  fallbackHash,
} from './id-generator.shared.js';

const textEncoder = getTextEncoder();
const textDecoder = getTextDecoder();
function getTextEncoder(): TextEncoderLike {
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

function getTextDecoder(): TextDecoder {
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

const BLACKLIST_ID_WORDS = createBlacklist(decodeBase64);

let cachedCryptoModule: any | null | undefined;
let cachedOsModule: any | null | undefined;

function decodeBase64(str: string): string {
  const BufferRef = (globalThis as any).Buffer;
  if (BufferRef) {
    return BufferRef.from(str, 'base64').toString('utf8');
  }
  return decodeBase64Fallback(str);
}

function getCanonicalArgv(): string {
  try {
    const processRef = (globalThis as any).process;
    if (processRef?.argv) {
      const argv = processRef.argv.slice(2) as string[];
      const stableArgs = argv
        .filter((arg: string) => arg.startsWith('--') && arg !== '--instance')
        .sort();

      const parts: string[] = [];
      if (stableArgs.length > 0) {
        parts.push(`flags:${stableArgs.join(' ')}`);
      }

      if (processRef.argv[1]) {
        parts.push(`entry:${processRef.argv[1]}`);
      }

      return parts.join('|');
    }
  } catch {
    // ignore
  }

  return 'browser';
}

function getNodeCryptoSync(): any | null {
  const runtimeRequire = (globalThis as any).require;
  if (typeof runtimeRequire === 'function') {
    try {
      cachedCryptoModule = runtimeRequire('crypto');
      return cachedCryptoModule;
    } catch {
      // ignore and fall back to cached/global crypto
    }
  }

  if (cachedCryptoModule !== undefined && cachedCryptoModule !== null) {
    return cachedCryptoModule;
  }

  cachedCryptoModule = null;
  const globalCrypto = (globalThis as any).crypto;
  if (globalCrypto) {
    cachedCryptoModule = { webcrypto: globalCrypto };
  }

  return cachedCryptoModule;
}

async function loadNodeCryptoAsync(): Promise<any | null> {
  const cached = getNodeCryptoSync();
  if (cached) {
    return cached;
  }

  const specifier = ['node', 'crypto'].join(':');
  try {
    const dynamicImport = new Function(
      'specifier',
      'return import(specifier);'
    ) as (value: string) => Promise<any>;
    const module = await dynamicImport(specifier);
    cachedCryptoModule = module;
    return module;
  } catch {
    return null;
  }
}

async function loadOsModule(): Promise<any | null> {
  if (cachedOsModule !== undefined) {
    return cachedOsModule;
  }

  cachedOsModule = null;
  const runtimeRequire = (globalThis as any).require;
  if (typeof runtimeRequire === 'function') {
    try {
      cachedOsModule = runtimeRequire('os');
      return cachedOsModule;
    } catch {
      cachedOsModule = null;
    }
  }

  const specifier = ['node', 'os'].join(':');
  try {
    const dynamicImport = new Function(
      'specifier',
      'return import(specifier);'
    ) as (value: string) => Promise<any>;
    const module = await dynamicImport(specifier);
    cachedOsModule = module;
    return module;
  } catch {
    cachedOsModule = null;
    return null;
  }
}

function getRandomBytes(length: number): Uint8Array {
  const cryptoRef = (globalThis as any).crypto;
  if (cryptoRef?.getRandomValues) {
    const bytes = new Uint8Array(length);
    cryptoRef.getRandomValues(bytes);
    return bytes;
  }

  try {
    const nodeCrypto = getNodeCryptoSync();
    if (nodeCrypto?.randomBytes) {
      return new Uint8Array(nodeCrypto.randomBytes(length));
    }
  } catch {
    // ignore
  }

  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

function hashSync(data: Uint8Array, algorithm = 'sha256'): Uint8Array {
  const { node } = normalizeHashAlgorithmNames(algorithm);

  try {
    const nodeCrypto = getNodeCryptoSync();
    if (nodeCrypto?.createHash) {
      const hashInstance = nodeCrypto.createHash(node);
      hashInstance.update(data);
      return new Uint8Array(hashInstance.digest());
    }
  } catch {
    // ignore
  }

  return fallbackHash(data);
}

async function hashAsync(data: Uint8Array, algorithm = 'sha256'): Promise<Uint8Array> {
  const { subtle, node } = normalizeHashAlgorithmNames(algorithm);
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

  try {
    const nodeCrypto = getNodeCryptoSync();
    if (nodeCrypto?.createHash) {
      const hashInstance = nodeCrypto.createHash(node);
      hashInstance.update(data);
      return new Uint8Array(hashInstance.digest());
    }
  } catch {
    // ignore
  }

  const importedCrypto = await loadNodeCryptoAsync();
  if (importedCrypto?.webcrypto?.subtle) {
    try {
      const buffer = new ArrayBuffer(data.length);
      const view = new Uint8Array(buffer);
      view.set(data);
      const digest = await importedCrypto.webcrypto.subtle.digest(subtle, buffer);
      return new Uint8Array(digest);
    } catch {
      // ignore
    }
  }

  return fallbackHash(data);
}

async function getDefaultNodeFingerprint(extraMaterial?: BytesLike): Promise<Uint8Array> {
  let hostFingerprint: string;
  const processRef = (globalThis as any).process;

  if (processRef?.versions?.node) {
    try {
      const osModule = await loadOsModule();
      if (osModule) {
        const interfaces = osModule.networkInterfaces();
        let mac: string | null = null;

        for (const [, ifaceList] of Object.entries(interfaces)) {
          if (!Array.isArray(ifaceList)) {
            continue;
          }
          for (const iface of ifaceList) {
            if (iface && iface.mac && iface.mac !== '00:00:00:00:00:00') {
              mac = iface.mac;
              break;
            }
          }
          if (mac) {
            break;
          }
        }

        if (mac) {
          const normalizedMac = mac.replace(/:/g, '').toLowerCase();
          hostFingerprint = `mac:${normalizedMac}`;
        } else if (typeof osModule.hostname === 'function') {
          hostFingerprint = `hn:${osModule.hostname()}`;
        } else {
          hostFingerprint = 'unknown';
        }
      } else {
        hostFingerprint = 'unknown';
      }
    } catch {
      hostFingerprint = 'unknown';
    }
  } else if (typeof navigator !== 'undefined' && navigator.userAgent) {
    hostFingerprint = `ua:${navigator.userAgent}`;
  } else {
    hostFingerprint = 'unknown';
  }

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

export function generateId(options: GenerateIdOptions = {}): string {
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

  const cryptoRef = (globalThis as any).crypto;
  if (cryptoRef?.subtle && !getNodeCryptoSync()?.createHash) {
    throw new Error('Browser environment requires async ID generation - use generateIdAsync instead');
  }

  if (material === undefined || material === null) {
    throw new Error('Fingerprint mode requires async operation in browser - use generateIdAsync instead');
  }

  const materialBytes = materialToBytes(material, textEncoder);
  const initialDigest = hashSync(materialBytes, hashAlg);

  return rehashUntilCleanSync(
    initialDigest,
    length,
    (input) => hashSync(input, hashAlg),
    blacklist
  );
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
    materialBytes = await getDefaultNodeFingerprint(envSalt ?? '');
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
