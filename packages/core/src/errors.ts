/**
 * Typed errors used across Losi Context Bank. All extend {@link LosiError} so
 * callers can `catch (e) { if (e instanceof LosiError) ... }`.
 *
 * @packageDocumentation
 */

/** Base class for all errors thrown by Losi packages. */
export class LosiError extends Error {
  /** Stable machine-readable error code. */
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "LosiError";
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when a governance policy blocks an action. */
export class GovernanceError extends LosiError {
  constructor(message: string) {
    super("GOVERNANCE_BLOCKED", message);
    this.name = "GovernanceError";
  }
}

/** Thrown when a data scope is not permitted for a context access. */
export class ScopeError extends LosiError {
  constructor(message: string) {
    super("SCOPE_DENIED", message);
    this.name = "ScopeError";
  }
}

/** Thrown when the Losi platform API is required but not configured. */
export class ApiBoundaryError extends LosiError {
  constructor(message: string) {
    super("API_NOT_CONFIGURED", message);
    this.name = "ApiBoundaryError";
  }
}

/** Thrown when an adapter is misconfigured (e.g. missing API key). */
export class AdapterError extends LosiError {
  constructor(message: string) {
    super("ADAPTER_ERROR", message);
    this.name = "AdapterError";
  }
}
