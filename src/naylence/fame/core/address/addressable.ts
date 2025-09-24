import { FameAddress } from './address';

/**
 * Protocol for objects that have an address property
 */
export interface Addressable {
  address: FameAddress | null;
}