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

export type BytesLike = string | Uint8Array;
export type TextEncoderLike = { encode: (input: string) => Uint8Array };

export interface GenerateIdOptions {
  length?: number;
  mode?: 'random' | 'fingerprint';
  material?: BytesLike | BytesLike[];
  blacklist?: Set<string>;
  hashAlg?: string;
}

/**
 * Fallback base64 decoder for environments without Buffer or atob
 */
export function decodeBase64Fallback(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  let sanitized = str.replace(/[^A-Za-z0-9+/]/g, '');

  while (i < sanitized.length) {
    const encoded1 = chars.indexOf(sanitized.charAt(i++));
    const encoded2 = chars.indexOf(sanitized.charAt(i++));
    const encoded3 = chars.indexOf(sanitized.charAt(i++));
    const encoded4 = chars.indexOf(sanitized.charAt(i++));

    const bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;

    result += String.fromCharCode((bitmap >> 16) & 255);
    if (encoded3 !== 64) result += String.fromCharCode((bitmap >> 8) & 255);
    if (encoded4 !== 64) result += String.fromCharCode(bitmap & 255);
  }

  return result;
}

export function createBlacklist(decoder: (str: string) => string): Set<string> {
  return new Set(BLACKLIST_ID_WORDS_B64.map((value) => decoder(value).toLowerCase()));
}

export function base62(n: bigint): string {
  if (n === 0n) {
    return '0';
  }

  const chars: string[] = [];
  let current = n;
  while (current > 0n) {
    const remainder = Number(current % 62n);
    current = current / 62n;
    const char = ALPHABET[remainder];
    if (char === undefined) {
      throw new Error(`Invalid remainder ${remainder} for base62 encoding`);
    }
    chars.push(char);
  }

  return chars.reverse().join('');
}

export function encodeDigest(digest: Uint8Array, length: number): string {
  let value = 0n;
  for (let i = 0; i < digest.length; i++) {
    const byte = digest[i];
    if (byte === undefined) {
      throw new Error(`Invalid digest byte at index ${i}`);
    }
    value = (value << 8n) + BigInt(byte);
  }

  const base62Value = base62(value);
  if (base62Value.length >= length) {
    return base62Value.slice(0, length);
  }

  return base62Value.padStart(length, ALPHABET[0]);
}

export function normalizeHashAlgorithmNames(algorithm: string): { subtle: string; node: string } {
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

export function materialToBytes(
  material: BytesLike | BytesLike[],
  encoder: TextEncoderLike
): Uint8Array {
  if (Array.isArray(material)) {
    const parts = material.map((value, index): Uint8Array => {
      if (value === undefined || value === null) {
        throw new Error(`Invalid material part at index ${index}`);
      }

      if (typeof value === 'string') {
        return encoder.encode(value);
      }

      return new Uint8Array(value);
    });

    const totalLength = parts.reduce((sum, part) => sum + part.length + 1, 0) - 1;
    const combined = new Uint8Array(totalLength > 0 ? totalLength : 0);

    let offset = 0;
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        combined[offset++] = 124; // '|' separator
      }
  const part = parts[i]!;
  combined.set(part, offset);
  offset += part.length;
    }

    return combined;
  }

  if (typeof material === 'string') {
    return encoder.encode(material);
  }

  return new Uint8Array(material);
}

export function candidateContainsBlacklist(candidate: string, blacklist: Set<string>): boolean {
  const lowered = candidate.toLowerCase();
  for (const forbidden of blacklist) {
    if (lowered.includes(forbidden)) {
      return true;
    }
  }
  return false;
}

export function generateRandomCandidate(
  length: number,
  getRandomBytes: (length: number) => Uint8Array,
  blacklist: Set<string>
): string {
  while (true) {
    const randomBytes = getRandomBytes(length);
    let candidate = '';

    for (let i = 0; i < length; i++) {
      const byte = randomBytes[i];
      if (byte === undefined) {
        throw new Error(`Invalid random byte at index ${i}`);
      }
      candidate += ALPHABET[byte % ALPHABET.length];
    }

    if (!candidateContainsBlacklist(candidate, blacklist)) {
      return candidate;
    }
  }
}

export function rehashUntilCleanSync(
  digest: Uint8Array,
  length: number,
  hash: (input: Uint8Array) => Uint8Array,
  blacklist: Set<string>
): string {
  let currentDigest = digest;
  let candidate = encodeDigest(currentDigest, length);

  while (candidateContainsBlacklist(candidate, blacklist)) {
    currentDigest = hash(currentDigest);
    candidate = encodeDigest(currentDigest, length);
  }

  return candidate;
}

export async function rehashUntilCleanAsync(
  digest: Uint8Array,
  length: number,
  hash: (input: Uint8Array) => Promise<Uint8Array>,
  blacklist: Set<string>
): Promise<string> {
  let currentDigest = digest;
  let candidate = encodeDigest(currentDigest, length);

  while (candidateContainsBlacklist(candidate, blacklist)) {
    currentDigest = await hash(currentDigest);
    candidate = encodeDigest(currentDigest, length);
  }

  return candidate;
}

export function fallbackHash(data: Uint8Array): Uint8Array {
  let hashValue = 0;
  for (let i = 0; i < data.length; i++) {
    const byte = data[i];
    if (byte === undefined) {
      throw new Error(`Invalid data byte at index ${i}`);
    }
    hashValue = ((hashValue << 5) - hashValue + byte) & 0xffffffff;
  }
  const bytes = new Uint8Array(4);
  bytes[0] = (hashValue >>> 24) & 0xff;
  bytes[1] = (hashValue >>> 16) & 0xff;
  bytes[2] = (hashValue >>> 8) & 0xff;
  bytes[3] = hashValue & 0xff;
  return bytes;
}

export { ALPHABET, BLACKLIST_ID_WORDS_B64 };
