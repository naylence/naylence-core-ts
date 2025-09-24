/**
 * Standard Fame capability constants
 */

export const SINK_CAPABILITY = 'fame.capability.sink';
export const AGENT_CAPABILITY = 'fame.capability.agent';
export const MCP_HOST_CAPABILITY = 'fame.capability.mcp-host';

/**
 * All standard Fame capabilities
 */
export const STANDARD_CAPABILITIES = [
  SINK_CAPABILITY,
  AGENT_CAPABILITY,
  MCP_HOST_CAPABILITY,
] as const;

/**
 * Type for standard capability names
 */
export type StandardCapability = typeof STANDARD_CAPABILITIES[number];