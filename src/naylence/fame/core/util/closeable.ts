/**
 * Protocol for objects that can be closed asynchronously
 */
export interface Closeable {
  close(): Promise<void>;
}