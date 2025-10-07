const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Base64-encoded blacklist of forbidden substrings
const BLACKLIST_ID_WORDS_B64 = [
  'c2hpdA==',
  'ZnVj',
  'ZnVr',
  'ZGFtbg==',
  'Yml0Y2g=',
  'YmFzdGFy',
  'YXNzaG9s',
  'Y3JhcA==',
  'ZGljaw==',
  'cGlzcw==',
  'Ym9sbG9jaw==',
  'cHVzcw==',
  'YnVnZ2Vy',
  'Ymxvb2Q=',
  'ZmFnZw==',
  'Y3VudA==',
  'Y3Vt',
];

/**
 * Fallback base64 decoder for environments without Buffer or atob
 */
export function decodeBase64Fallback(str: string): string {
  // Fallback for environments without Buffer or atob
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  str = str.replace(/[^A-Za-z0-9+/]/g, '');
  
  while (i < str.length) {
    const encoded1 = chars.indexOf(str.charAt(i++));
    const encoded2 = chars.indexOf(str.charAt(i++));
    const encoded3 = chars.indexOf(str.charAt(i++));
    const encoded4 = chars.indexOf(str.charAt(i++));
    
    const bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;
    
    result += String.fromCharCode((bitmap >> 16) & 255);
    if (encoded3 !== 64) result += String.fromCharCode((bitmap >> 8) & 255);
    if (encoded4 !== 64) result += String.fromCharCode(bitmap & 255);
  }
  
  return result;
}

function decodeBase64(str: string): string {
  if (typeof atob !== 'undefined') {
    return atob(str);
  } else if (typeof globalThis !== 'undefined' && (globalThis as any).Buffer) {
    return (globalThis as any).Buffer.from(str, 'base64').toString('utf8');
  } else {
    return decodeBase64Fallback(str);
  }
}

const BLACKLIST_ID_WORDS = new Set(
  BLACKLIST_ID_WORDS_B64.map(b => decodeBase64(b).toLowerCase())
);

export type BytesLike = string | Uint8Array;

/**
 * Convert integer to Base-62 string (no leading zeros)
 */
function base62(n: bigint): string {
  if (n === 0n) {
    return '0';
  }
  const chars: string[] = [];
  while (n > 0n) {
    const rem = Number(n % 62n);
    n = n / 62n;
    const char = ALPHABET[rem];
    if (char === undefined) {
      throw new Error(`Invalid remainder ${rem} for base62 encoding`);
    }
    chars.push(char);
  }
  return chars.reverse().join('');
}

/**
 * Encode digest bytes to Base-62 string of specified length
 */
function encodeDigest(digest: Uint8Array, length: number): string {
  // Convert bytes to bigint
  let n = 0n;
  for (let i = 0; i < digest.length; i++) {
    const byte = digest[i];
    if (byte === undefined) {
      throw new Error(`Invalid digest byte at index ${i}`);
    }
    n = (n << 8n) + BigInt(byte);
  }
  const base62Value = base62(n);
  if (base62Value.length >= length) {
    return base62Value.slice(0, length);
  }
  return base62Value.padStart(length, ALPHABET[0]);
}

function normalizeHashAlgorithmNames(algorithm: string): { subtle: string; node: string } {
  const trimmed = algorithm.trim();
  const lower = trimmed.toLowerCase();
  const shaMatch = lower.match(/^(sha)([-_]?(\d{1,3}))$/);
  if (shaMatch) {
    const digits = shaMatch[3];
    return {
      subtle: `SHA-${digits}`,
      node: `sha${digits}`,
    };
  }
  return {
    subtle: trimmed.toUpperCase(),
    node: lower,
  };
}

/**
 * Get canonical representation of command-line arguments
 * In browser, this will be an empty string
 */
function getCanonicalArgv(): string {
  try {
    if (typeof globalThis !== 'undefined' && (globalThis as any).process?.argv) {
      const process = (globalThis as any).process;
      const argv = process.argv.slice(2) as string[];
      const stableArgs = argv
        .filter((arg: string) => arg.startsWith('--') && arg !== '--instance')
        .sort();
      
      const parts: string[] = [];
      if (stableArgs.length > 0) {
        parts.push(`flags:${stableArgs.join(' ')}`);
      }
      
      // Entry script path
      if (process.argv[1]) {
        parts.push(`entry:${process.argv[1]}`);
      }
      
      return parts.join('|');
    }
  } catch {
    // Ignore errors
  }
  
  return 'browser';
}

/**
 * Get host and environment fingerprint for deterministic node IDs
 */
async function getDefaultNodeFingerprint(extraMaterial?: BytesLike): Promise<Uint8Array> {
  let hostFp: string;
  
  // Try to get MAC address or hostname
  if (typeof navigator !== 'undefined' && navigator.userAgent) {
    // Browser environment - use a hash of user agent
    hostFp = `ua:${navigator.userAgent}`;
  } else {
    try {
      // Try Node.js environment
      const req = (globalThis as any).require;
      if (req) {
        const os = req('os');
        const networkInterfaces = os.networkInterfaces();
        
        // Try to find a MAC address
        let mac: string | null = null;
        for (const [, interfaces] of Object.entries(networkInterfaces)) {
          for (const iface of interfaces as any[]) {
            if (iface.mac && iface.mac !== '00:00:00:00:00:00') {
              mac = iface.mac;
              break;
            }
          }
          if (mac) break;
        }
        
        if (mac) {
          hostFp = `mac:${mac}`;
        } else {
          hostFp = `hn:${os.hostname()}`;
        }
      } else {
        hostFp = 'unknown';
      }
    } catch {
      hostFp = 'unknown';
    }
  }
  
  // Code + argv part
  const codeFp = getCanonicalArgv();
  
  // Optional extra material
  let blob: string;
  if (extraMaterial) {
    let salt: string;
    if (extraMaterial instanceof Uint8Array) {
      salt = new TextDecoder().decode(extraMaterial);
    } else {
      salt = String(extraMaterial);
    }
    blob = `${hostFp}|${codeFp}|salt:${salt}`;
  } else {
    blob = `${hostFp}|${codeFp}`;
  }
  
  return new TextEncoder().encode(blob);
}

/**
 * Generate cryptographically secure random bytes
 */
function getRandomBytes(length: number): Uint8Array {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    // Browser or modern Node.js
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
  } else {
    try {
      const nodeCrypto = (globalThis as any).require?.('crypto');
      if (nodeCrypto) {
        return new Uint8Array(nodeCrypto.randomBytes(length));
      }
    } catch {
      // Ignore
    }
    
    // Fallback to Math.random (not cryptographically secure)
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    return bytes;
  }
}

/**
 * Create hash digest
 */
function hash(data: Uint8Array, algorithm: string = 'sha256'): Uint8Array {
  const { node } = normalizeHashAlgorithmNames(algorithm);
  try {
    const nodeCrypto = (globalThis as any).require?.('crypto');
    if (nodeCrypto?.createHash) {
      const hash = nodeCrypto.createHash(node);
      hash.update(data);
      return new Uint8Array(hash.digest());
    }
  } catch {
    // Ignore
  }
  
  // Fallback - very basic hash (not cryptographically secure)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const byte = data[i];
    if (byte === undefined) {
      throw new Error(`Invalid data byte at index ${i}`);
    }
    hash = ((hash << 5) - hash + byte) & 0xffffffff;
  }
  const bytes = new Uint8Array(4);
  bytes[0] = (hash >>> 24) & 0xff;
  bytes[1] = (hash >>> 16) & 0xff;
  bytes[2] = (hash >>> 8) & 0xff;
  bytes[3] = hash & 0xff;
  return bytes;
}

/**
 * Create hash digest asynchronously (for browser compatibility)
 */
async function hashAsync(data: Uint8Array, algorithm: string = 'sha256'): Promise<Uint8Array> {
  const { subtle, node } = normalizeHashAlgorithmNames(algorithm);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      // Browser environment - create a copy to ensure ArrayBuffer type
      const buffer = new ArrayBuffer(data.length);
      const view = new Uint8Array(buffer);
      view.set(data);
      const hashBuffer = await crypto.subtle.digest(subtle, buffer);
      return new Uint8Array(hashBuffer);
    } catch {
      // Fallback if crypto.subtle fails
    }
  }
  
  try {
    const nodeCrypto = (globalThis as any).require?.('crypto');
    if (nodeCrypto?.createHash) {
      const hash = nodeCrypto.createHash(node);
      hash.update(data);
      return new Uint8Array(hash.digest());
    }
  } catch {
    // Ignore
  }
  
  // Fallback
  return hash(data, algorithm);
}

export interface GenerateIdOptions {
  length?: number;
  mode?: 'random' | 'fingerprint';
  material?: BytesLike | BytesLike[];
  blacklist?: Set<string>;
  hashAlg?: string;
}

/**
 * Generate ID synchronously (Node.js only for fingerprint mode)
 */
export function generateId(options: GenerateIdOptions = {}): string {
  const {
    length = 16,
    mode = 'random',
    material,
    blacklist = BLACKLIST_ID_WORDS,
    hashAlg = 'sha256'
  } = options;

  if (mode !== 'random' && mode !== 'fingerprint') {
    throw new Error("mode must be 'random' or 'fingerprint'");
  }

  if (mode === 'random') {
    while (true) {
      let candidate = '';
      const randomBytes = getRandomBytes(length);
      for (let i = 0; i < length; i++) {
        const byte = randomBytes[i];
        if (byte === undefined) {
          throw new Error(`Invalid random byte at index ${i}`);
        }
        candidate += ALPHABET[byte % ALPHABET.length];
      }
      
      if (!Array.from(blacklist).some(bad => candidate.toLowerCase().includes(bad))) {
        return candidate;
      }
    }
  }

  // Fingerprint mode - synchronous version (Node.js only)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    throw new Error('Browser environment requires async ID generation - use generateIdAsync instead');
  }

  let materialBytes: Uint8Array;
  if (material === undefined || material === null) {
    throw new Error('Fingerprint mode requires async operation in browser - use generateIdAsync instead');
  }

  if (Array.isArray(material)) {
    const parts = material.map(m => {
      if (typeof m === 'string') {
        return new TextEncoder().encode(m);
      }
      return new Uint8Array(m);
    });
    const totalLength = parts.reduce((sum, part) => sum + part.length + 1, 0) - 1;
    materialBytes = new Uint8Array(totalLength);
    let offset = 0;
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        materialBytes[offset++] = 124; // '|' character
      }
      const part = parts[i];
      if (part === undefined) {
        throw new Error(`Invalid part at index ${i}`);
      }
      materialBytes.set(part, offset);
      offset += part.length;
    }
  } else {
    if (typeof material === 'string') {
      materialBytes = new TextEncoder().encode(material);
    } else {
      materialBytes = new Uint8Array(material);
    }
  }

  let digest = hash(materialBytes, hashAlg);
  let candidate = encodeDigest(digest, length);

  // Check blacklist and re-hash if needed
  while (Array.from(blacklist).some(bad => candidate.toLowerCase().includes(bad))) {
    digest = hash(digest, hashAlg);
    candidate = encodeDigest(digest, length);
  }

  return candidate;
}

/**
 * Generate ID asynchronously (works in both browser and Node.js)
 */
export async function generateIdAsync(options: GenerateIdOptions = {}): Promise<string> {
  const {
    length = 16,
    mode = 'random',
    material,
    blacklist = BLACKLIST_ID_WORDS,
    hashAlg = 'sha256'
  } = options;

  if (mode !== 'random' && mode !== 'fingerprint') {
    throw new Error("mode must be 'random' or 'fingerprint'");
  }

  if (mode === 'random') {
    while (true) {
      let candidate = '';
      const randomBytes = getRandomBytes(length);
      for (let i = 0; i < length; i++) {
        const byte = randomBytes[i];
        if (byte === undefined) {
          throw new Error(`Invalid random byte at index ${i}`);
        }
        candidate += ALPHABET[byte % ALPHABET.length];
      }
      
      if (!Array.from(blacklist).some(bad => candidate.toLowerCase().includes(bad))) {
        return candidate;
      }
    }
  }

  // Fingerprint mode
  let materialBytes: Uint8Array;
  if (material === undefined || material === null) {
    const envSalt = (globalThis as any).process?.env?.FAME_NODE_ID_SALT || '';
    materialBytes = await getDefaultNodeFingerprint(envSalt);
  } else if (Array.isArray(material)) {
    const parts = material.map(m => {
      if (typeof m === 'string') {
        return new TextEncoder().encode(m);
      }
      return new Uint8Array(m);
    });
    const totalLength = parts.reduce((sum, part) => sum + part.length + 1, 0) - 1;
    materialBytes = new Uint8Array(totalLength);
    let offset = 0;
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        materialBytes[offset++] = 124; // '|' character
      }
      const part = parts[i];
      if (part === undefined) {
        throw new Error(`Invalid part at index ${i}`);
      }
      materialBytes.set(part, offset);
      offset += part.length;
    }
  } else {
    if (typeof material === 'string') {
      materialBytes = new TextEncoder().encode(material);
    } else {
      materialBytes = new Uint8Array(material);
    }
  }

  let digest = await hashAsync(materialBytes, hashAlg);
  let candidate = encodeDigest(digest, length);

  // Check blacklist and re-hash if needed
  while (Array.from(blacklist).some(bad => candidate.toLowerCase().includes(bad))) {
    digest = await hashAsync(digest, hashAlg);
    candidate = encodeDigest(digest, length);
  }

  return candidate;
}