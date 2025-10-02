import { FameAddress } from './address.js';

/**
 * Protocol for objects that have an address property
 */
export interface Addressable {
  address: FameAddress | null;
}