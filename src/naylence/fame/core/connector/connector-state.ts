/**
 * Connector state management for Fame connectors.
 * 
 * This module defines the states that connectors can be in throughout their lifecycle.
 */

/**
 * Enumeration of possible connector states.
 * 
 * Represents the lifecycle states that a Fame connector can be in:
 * - UNKNOWN: Initial or indeterminate state
 * - INITIALIZED: Connector has been created and configured
 * - STARTED: Connector is actively running and processing messages
 * - STOPPED: Connector has been stopped but may be restartable
 * - CLOSED: Connector has been permanently closed and cannot be restarted
 */
export enum ConnectorState {
  UNKNOWN = 'unknown',
  INITIALIZED = 'initialized',
  STARTED = 'started',
  STOPPED = 'stopped',
  CLOSED = 'closed',
}

/**
 * Helper class for connector state operations
 */
export class ConnectorStateHelper {
  constructor(private state: ConnectorState) {}

  /**
   * Return true if the connector is in an active state
   */
  get isActive(): boolean {
    return this.state === ConnectorState.STARTED;
  }

  /**
   * Return true if the connector is in an inactive state
   */
  get isInactive(): boolean {
    return this.state === ConnectorState.STOPPED || this.state === ConnectorState.CLOSED;
  }

  /**
   * Return true if the connector can be started from this state
   */
  get canStart(): boolean {
    return this.state === ConnectorState.INITIALIZED || this.state === ConnectorState.STOPPED;
  }

  /**
   * Return true if the connector can be stopped from this state
   */
  get canStop(): boolean {
    return this.state === ConnectorState.STARTED;
  }

  /**
   * Return true if the connector can be closed from this state
   */
  get canClose(): boolean {
    return (
      this.state === ConnectorState.INITIALIZED ||
      this.state === ConnectorState.STARTED ||
      this.state === ConnectorState.STOPPED
    );
  }

  /**
   * Get a string representation of the state
   */
  toString(): string {
    return this.state;
  }

  /**
   * Get the current state
   */
  get value(): ConnectorState {
    return this.state;
  }
}

/**
 * Utility functions for connector states
 */
export const ConnectorStateUtils = {
  /**
   * Check if a state is active
   */
  isActive(state: ConnectorState): boolean {
    return new ConnectorStateHelper(state).isActive;
  },

  /**
   * Check if a state is inactive
   */
  isInactive(state: ConnectorState): boolean {
    return new ConnectorStateHelper(state).isInactive;
  },

  /**
   * Check if a connector can be started from the given state
   */
  canStart(state: ConnectorState): boolean {
    return new ConnectorStateHelper(state).canStart;
  },

  /**
   * Check if a connector can be stopped from the given state
   */
  canStop(state: ConnectorState): boolean {
    return new ConnectorStateHelper(state).canStop;
  },

  /**
   * Check if a connector can be closed from the given state
   */
  canClose(state: ConnectorState): boolean {
    return new ConnectorStateHelper(state).canClose;
  },

  /**
   * Get all possible states
   */
  getAllStates(): ConnectorState[] {
    return Object.values(ConnectorState);
  },

  /**
   * Parse a string into a ConnectorState
   */
  fromString(value: string): ConnectorState | null {
    const state = Object.values(ConnectorState).find(s => s === value);
    return state || null;
  },
};