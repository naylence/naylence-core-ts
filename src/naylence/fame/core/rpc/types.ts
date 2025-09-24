import { z } from 'zod';
import { generateId } from '../util/id-generator';

// JSON-RPC Error schema
export const JSONRPCErrorSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: z.any().optional(),
});

export type JSONRPCError = z.infer<typeof JSONRPCErrorSchema>;

// Base JSON-RPC Message schema
export const JSONRPCMessageSchema = z.object({
  jsonrpc: z.literal('2.0').default('2.0'),
  id: z.union([z.number(), z.string(), z.null()]).default(() => generateId()),
});

export type JSONRPCMessage = z.infer<typeof JSONRPCMessageSchema>;

// JSON-RPC Request schema (generic)
export const JSONRPCRequestSchema = JSONRPCMessageSchema.extend({
  method: z.any(),
  params: z.any().default({}),
});

export type JSONRPCRequest<P = any> = Omit<z.infer<typeof JSONRPCRequestSchema>, 'params'> & {
  params: P;
};

// JSON-RPC Response schema
export const JSONRPCResponseSchema = JSONRPCMessageSchema.extend({
  result: z.any().optional(),
  error: JSONRPCErrorSchema.optional(),
});

export type JSONRPCResponse = z.infer<typeof JSONRPCResponseSchema>;

/**
 * Create a JSON-RPC request with typed parameters
 */
export function createJSONRPCRequest<P = any>(
  method: string,
  params?: P,
  id?: string | number | null
): JSONRPCRequest<P> {
  return {
    jsonrpc: '2.0',
    id: id ?? generateId(),
    method,
    params: params ?? ({} as P),
  };
}

/**
 * Create a JSON-RPC response
 */
export function createJSONRPCResponse(
  id: string | number | null,
  result?: any,
  error?: JSONRPCError
): JSONRPCResponse {
  return {
    jsonrpc: '2.0',
    id,
    result,
    error,
  };
}

/**
 * Create a JSON-RPC error response
 */
export function createJSONRPCErrorResponse(
  id: string | number | null,
  code: number,
  message: string,
  data?: any
): JSONRPCResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      data,
    },
  };
}

/**
 * Standard JSON-RPC error codes
 */
export const JSONRPCErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  SERVER_ERROR_START: -32099,
  SERVER_ERROR_END: -32000,
} as const;

/**
 * Type guard to check if a message is a JSON-RPC request
 */
export function isJSONRPCRequest(message: any): message is JSONRPCRequest {
  return (
    message &&
    typeof message === 'object' &&
    message.jsonrpc === '2.0' &&
    typeof message.method !== 'undefined' &&
    'id' in message
  );
}

/**
 * Type guard to check if a message is a JSON-RPC response
 */
export function isJSONRPCResponse(message: any): message is JSONRPCResponse {
  return (
    message &&
    typeof message === 'object' &&
    message.jsonrpc === '2.0' &&
    'id' in message &&
    ('result' in message || 'error' in message)
  );
}

/**
 * Type guard to check if a response contains an error
 */
export function isJSONRPCErrorResponse(response: JSONRPCResponse): response is JSONRPCResponse & { error: JSONRPCError } {
  return response.error !== undefined;
}

/**
 * Type guard to check if a response contains a result
 */
export function isJSONRPCSuccessResponse(response: JSONRPCResponse): response is JSONRPCResponse & { result: any } {
  return response.error === undefined && response.result !== undefined;
}