import { ConnectorState } from './connector-state';
import { FameEnvelopeHandler } from '../handlers/handlers';
import { FameChannelMessage } from '../protocol/channel-message';
import { AuthorizationContext } from '../protocol/delivery-context';
import { FameEnvelope } from '../protocol/envelope';

/**
 * Protocol interface for Fame connectors
 */
export interface FameConnector {
  /**
   * Start the connector with an inbound message handler
   */
  start(inboundHandler: FameEnvelopeHandler): Promise<void>;

  /**
   * Stop the connector
   */
  stop(): Promise<void>;

  /**
   * Replace the current message handler
   */
  replaceHandler(handler: FameEnvelopeHandler): Promise<void>;

  /**
   * Send an envelope through the connector
   */
  send(envelope: FameEnvelope): Promise<void>;

  /**
   * Close the connector with optional close code and reason
   */
  close(code?: number, reason?: string): Promise<void>;

  /**
   * Push raw data, envelope, or channel message to the receive pipeline
   */
  pushToReceive(rawOrEnvelope: Uint8Array | FameEnvelope | FameChannelMessage): Promise<void>;

  /**
   * Current state of the connector
   */
  readonly state: ConnectorState;

  /**
   * Close code if the connector was closed
   */
  readonly closeCode: number | undefined;

  /**
   * Close reason if the connector was closed  
   */
  readonly closeReason: string | undefined;

  /**
   * Last error that occurred in the connector
   */
  readonly lastError: Error | undefined;

  /**
   * Authorization context for the connector
   */
  authorizationContext: AuthorizationContext | undefined;
}

/**
 * Base implementation of a Fame connector
 */
export abstract class BaseFameConnector implements FameConnector {
  protected _state: ConnectorState = ConnectorState.UNKNOWN;
  protected _closeCode?: number;
  protected _closeReason?: string;
  protected _lastError?: Error;
  protected _authorizationContext?: AuthorizationContext | undefined;
  protected _handler?: FameEnvelopeHandler;

  get state(): ConnectorState {
    return this._state;
  }

  get closeCode(): number | undefined {
    return this._closeCode;
  }

  get closeReason(): string | undefined {
    return this._closeReason;
  }

  get lastError(): Error | undefined {
    return this._lastError;
  }

  get authorizationContext(): AuthorizationContext | undefined {
    return this._authorizationContext;
  }

  set authorizationContext(context: AuthorizationContext | undefined) {
    if (context !== undefined) {
      this._authorizationContext = context;
    } else {
      this._authorizationContext = undefined;
    }
  }

  /**
   * Start the connector
   */
  async start(inboundHandler: FameEnvelopeHandler): Promise<void> {
    if (this._state !== ConnectorState.INITIALIZED && this._state !== ConnectorState.STOPPED) {
      throw new Error(`Cannot start connector from state: ${this._state}`);
    }

    this._handler = inboundHandler;
    this._state = ConnectorState.STARTED;
    await this.onStart();
  }

  /**
   * Stop the connector
   */
  async stop(): Promise<void> {
    if (this._state !== ConnectorState.STARTED) {
      throw new Error(`Cannot stop connector from state: ${this._state}`);
    }

    this._state = ConnectorState.STOPPED;
    await this.onStop();
  }

  /**
   * Replace the handler
   */
  async replaceHandler(handler: FameEnvelopeHandler): Promise<void> {
    this._handler = handler;
    await this.onHandlerReplaced(handler);
  }

  /**
   * Close the connector
   */
  async close(code?: number, reason?: string): Promise<void> {
    if (this._state === ConnectorState.CLOSED) {
      return; // Already closed
    }

    if (code !== undefined) this._closeCode = code;
    if (reason !== undefined) this._closeReason = reason;
    this._state = ConnectorState.CLOSED;
    await this.onClose();
  }

  /**
   * Handle errors
   */
  protected handleError(error: Error): void {
    this._lastError = error;
    this.onError(error);
  }

  // Abstract methods for subclasses to implement
  protected abstract onStart(): Promise<void>;
  protected abstract onStop(): Promise<void>;
  protected abstract onClose(): Promise<void>;
  protected abstract onHandlerReplaced(handler: FameEnvelopeHandler): Promise<void>;
  protected abstract onError(error: Error): void;

  // Abstract methods that must be implemented
  abstract send(envelope: FameEnvelope): Promise<void>;
  abstract pushToReceive(rawOrEnvelope: Uint8Array | FameEnvelope | FameChannelMessage): Promise<void>;
}

/**
 * Type guard to check if an object is a Fame connector
 */
export function isFameConnector(obj: any): obj is FameConnector {
  return obj &&
    typeof obj.start === 'function' &&
    typeof obj.stop === 'function' &&
    typeof obj.send === 'function' &&
    typeof obj.close === 'function' &&
    'state' in obj;
}

/**
 * Connector factory interface
 */
export interface ConnectorFactory<T extends FameConnector = FameConnector> {
  create(config: any): T;
  readonly connectorType: string;
}