/**
 * Helper functions for JSON-RPC 2.0 request/response framing, parsing, and serialization.
 */

import {
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCError,
  JSONRPCRequestSchema,
  JSONRPCResponseSchema,
  createJSONRPCRequest,
  createJSONRPCResponse,
  createJSONRPCErrorResponse,
} from './types.js';
import { generateId } from '../util/id-generator.js';

/**
 * Construct a JSON-RPC 2.0 request payload.
 */
export function makeRequest<P = any>(
  method: string,
  params?: P,
  id?: string | number
): Record<string, any> {
  const requestId = id ?? generateId();
  const req = createJSONRPCRequest(method, params, requestId);
  
  // Convert to plain object for serialization
  return {
    jsonrpc: req.jsonrpc,
    id: req.id,
    method: req.method,
    params: req.params,
  };
}

/**
 * Validate and parse a JSON-RPC 2.0 request payload into a typed object.
 */
export function parseRequest<P = any>(payload: Record<string, any>): JSONRPCRequest<P> {
  const validated = JSONRPCRequestSchema.parse(payload);
  return validated as JSONRPCRequest<P>;
}

/**
 * Construct a JSON-RPC 2.0 response payload, either successful or error.
 */
export function makeResponse(
  id: string | number | null,
  result?: any,
  error?: JSONRPCError | { code: number; message: string; data?: any }
): Record<string, any> {
  let response: JSONRPCResponse;
  
  if (error) {
    // Accept either a JSONRPCError instance or a raw object
    const errorObj = 'code' in error && 'message' in error 
      ? error as JSONRPCError
      : error;
    
    response = createJSONRPCErrorResponse(
      id,
      errorObj.code,
      errorObj.message,
      errorObj.data
    );
  } else {
    response = createJSONRPCResponse(id, result);
  }
  
  // Convert to plain object for serialization
  const result_obj: Record<string, any> = {
    jsonrpc: response.jsonrpc,
    id: response.id,
  };
  
  if (response.result !== undefined) {
    result_obj.result = response.result;
  }
  
  if (response.error !== undefined) {
    result_obj.error = response.error;
  }
  
  return result_obj;
}

/**
 * Validate and parse a JSON-RPC 2.0 response payload into a typed object.
 */
export function parseResponse(payload: Record<string, any>): JSONRPCResponse {
  return JSONRPCResponseSchema.parse(payload);
}

/**
 * Helper function to create a method not found error response
 */
export function makeMethodNotFoundError(id: string | number | null, method: string): Record<string, any> {
  return makeResponse(id, undefined, {
    code: -32601,
    message: 'Method not found',
    data: { method },
  });
}

/**
 * Helper function to create an invalid params error response
 */
export function makeInvalidParamsError(id: string | number | null, details?: string): Record<string, any> {
  return makeResponse(id, undefined, {
    code: -32602,
    message: 'Invalid params',
    data: details ? { details } : undefined,
  });
}

/**
 * Helper function to create an internal error response
 */
export function makeInternalError(id: string | number | null, message?: string): Record<string, any> {
  return makeResponse(id, undefined, {
    code: -32603,
    message: message || 'Internal error',
  });
}

/**
 * Helper function to create a parse error response
 */
export function makeParseError(): Record<string, any> {
  return makeResponse(null, undefined, {
    code: -32700,
    message: 'Parse error',
  });
}

/**
 * Helper function to create an invalid request error response
 */
export function makeInvalidRequestError(id: string | number | null = null): Record<string, any> {
  return makeResponse(id, undefined, {
    code: -32600,
    message: 'Invalid Request',
  });
}