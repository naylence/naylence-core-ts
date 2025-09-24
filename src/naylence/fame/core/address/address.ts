import { z } from 'zod';

const PARTICIPANT_RE = /^[A-Za-z0-9_-]+$/;
const SEGMENT_RE = /^[A-Za-z0-9._-]+$/;
const HOST_SEGMENT_RE = /^[A-Za-z0-9.-]+$/; // Allow dots for host parts
const POOL_WILDCARD = '*'; // Only * allowed for pool definitions

/**
 * A validated Fame address string.
 */
export class FameAddress extends String {
  constructor(value: string) {
    // Validate the address format by parsing it (this will raise if invalid)
    parseAddress(value);
    super(value);
  }

  toString(): string {
    return super.toString();
  }

  valueOf(): string {
    return super.valueOf();
  }

  static create(value: string): FameAddress {
    return new FameAddress(value);
  }
}

/**
 * Zod schema for FameAddress validation
 */
export const FameAddressSchema = z.string().transform((val: string, ctx: z.RefinementCtx) => {
  try {
    return new FameAddress(val);
  } catch (error) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: error instanceof Error ? error.message : 'Invalid FameAddress',
    });
    return z.NEVER;
  }
});

export type ValidatedFameAddress = z.infer<typeof FameAddressSchema>;

function validateParticipant(name: string): void {
  if (!PARTICIPANT_RE.test(name)) {
    throw new Error(`Participant must match [A-Z a-z 0-9 _ -]+ : ${JSON.stringify(name)}`);
  }
}

function validateHost(host: string, allowWildcards: boolean = false): void {
  if (!host) {
    return;
  }

  // Split host into segments separated by dots
  const segments = host.split('.');
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (!segment) {
      // Empty segment
      throw new Error(`Empty host segment in ${JSON.stringify(host)}`);
    }

    // Check wildcards
    if (segment === POOL_WILDCARD) {
      if (!allowWildcards) {
        throw new Error(`Wildcards not allowed in host: ${JSON.stringify(host)}`);
      }
      // Allow wildcards in leftmost position for pool addresses like math@*.fame.fabric
      if (i !== 0) {
        throw new Error(`Wildcard '*' must be leftmost segment in: ${JSON.stringify(host)}`);
      }
      continue;
    }

    if (!HOST_SEGMENT_RE.test(segment)) {
      throw new Error(`Bad host segment ${JSON.stringify(segment)} - use A-Za-z0-9.-`);
    }
  }
}

function validatePath(path: string): void {
  if (!path) {
    return;
  }

  if (path === '/') {
    return;
  }

  let normalizedPath = path;
  if (!normalizedPath.startsWith('/')) {
    normalizedPath = '/' + normalizedPath;
  }

  const stripped = normalizedPath.substring(1);
  const parts = stripped ? stripped.split('/') : [];

  // Check segments - no wildcards allowed in paths
  for (const seg of parts) {
    if (seg === POOL_WILDCARD) {
      throw new Error(`Wildcards not allowed in path segments: ${JSON.stringify(path)}`);
    }
    if (!SEGMENT_RE.test(seg)) {
      throw new Error(`Bad segment ${JSON.stringify(seg)} - use A-Za-z0-9._-`);
    }
  }
}

/**
 * Parse a FAME address supporting both host-like and path-like notation.
 *
 * Formats supported:
 * - 'participant@/path'           (traditional path-only)
 * - 'participant@host.name'       (host-only)
 * - 'participant@host.name/path'  (host with path)
 * - 'participant@*.host.name'     (pool address with leftmost wildcard)
 *
 * Rules:
 * - participant: [A-Z a-z 0-9 _ -]+
 * - host: dot-separated segments [A-Za-z0-9.-]+, wildcards (*) allowed in leftmost position only
 * - path: '/' seg ('/' seg)*, NO wildcards allowed in path segments
 * - At least one of host or path must be present
 *
 * Returns:
 *     Tuple of [participant, combined_location] where combined_location
 *     preserves the original format for backward compatibility.
 */
export function parseAddress(address: string): [string, string] {
  const atIndex = address.lastIndexOf('@');
  if (atIndex === -1) {
    throw new Error(`Missing '@' in address: ${JSON.stringify(address)}`);
  }

  const name = address.substring(0, atIndex);
  const location = address.substring(atIndex + 1);
  
  validateParticipant(name);

  if (!location) {
    throw new Error('Location part cannot be empty');
  }

  // Determine if this is host-only, path-only, or host+path
  if (location.startsWith('/')) {
    // Traditional path-only format: participant@/path
    validatePath(location);
  } else if (location.includes('/')) {
    // Host with path format: participant@host.name/path
    const slashIndex = location.indexOf('/');
    const hostPart = location.substring(0, slashIndex);
    const pathPart = location.substring(slashIndex);
    validateHost(hostPart, true);
    validatePath(pathPart);
  } else {
    // Host-only format: participant@host.name or participant@*.host.name
    validateHost(location, true);
  }

  return [name, location];
}

/**
 * Parse a FAME address into its constituent components.
 *
 * Returns:
 *     Tuple of [participant, host, path] where:
 *     - participant: always present
 *     - host: present if host-like notation used
 *     - path: present if path-like notation used
 *     - At least one of host or path will be non-null
 */
export function parseAddressComponents(address: string): [string, string | null, string | null] {
  const atIndex = address.lastIndexOf('@');
  if (atIndex === -1) {
    throw new Error(`Missing '@' in address: ${JSON.stringify(address)}`);
  }

  const name = address.substring(0, atIndex);
  const location = address.substring(atIndex + 1);
  
  validateParticipant(name);

  if (!location) {
    throw new Error('Location part cannot be empty');
  }

  // Determine format and extract components
  if (location.startsWith('/')) {
    // Traditional path-only format: participant@/path
    validatePath(location);
    return [name, null, location];
  } else if (location.includes('/')) {
    // Host with path format: participant@host.name/path
    const slashIndex = location.indexOf('/');
    const hostPart = location.substring(0, slashIndex);
    let pathPart = location.substring(slashIndex);
    if (!pathPart.startsWith('/')) {
      pathPart = '/' + pathPart; // Restore leading slash
    }
    validateHost(hostPart, true);
    validatePath(pathPart);
    return [name, hostPart, pathPart];
  } else {
    // Host-only format: participant@host.name or participant@*.host.name
    validateHost(location, true);
    return [name, location, null];
  }
}

/**
 * Create a FAME address from participant and location.
 *
 * Args:
 *     name: participant name
 *     location: either path (/path), host (host.name), or host/path (host.name/path)
 *              Wildcards allowed in host part only (*.host.name)
 */
export function formatAddress(name: string, location: string): FameAddress {
  validateParticipant(name);

  // Validate the location part based on its format
  if (location.startsWith('/')) {
    // Path-only format
    validatePath(location);
  } else if (location.includes('/')) {
    // Host with path format
    const slashIndex = location.indexOf('/');
    const hostPart = location.substring(0, slashIndex);
    const pathPart = location.substring(slashIndex);
    validateHost(hostPart, true);
    validatePath(pathPart);
  } else {
    // Host-only format
    validateHost(location, true);
  }

  return new FameAddress(`${name}@${location}`);
}

/**
 * Create a FAME address from separate components.
 *
 * Args:
 *     name: participant name
 *     host: optional host part (e.g., "fame.fabric", "child.fame.fabric", "*.fame.fabric")
 *     path: optional path part (e.g., "/", "/api/v1") - NO wildcards allowed in paths
 *
 * At least one of host or path must be provided.
 */
export function formatAddressFromComponents(
  name: string,
  host?: string | null,
  path?: string | null
): FameAddress {
  validateParticipant(name);

  if (!host && !path) {
    throw new Error('At least one of host or path must be provided');
  }

  if (host) {
    validateHost(host, true);
  }
  if (path) {
    validatePath(path);
  }

  let location: string;
  if (host && path) {
    // Both present: host/path format
    location = `${host}${path}`;
  } else if (host) {
    // Host only
    location = host;
  } else {
    // Path only
    location = path!;
  }

  return new FameAddress(`${name}@${location}`);
}

/**
 * Create a FameAddress instance with validation
 */
export function makeFameAddress(raw: string): FameAddress {
  // validation happens inside
  const [name, location] = parseAddress(raw);
  return new FameAddress(`${name}@${location}`);
}