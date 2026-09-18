/**
 * Governance configuration and the in-memory enforcement engine.
 *
 * Governance is not optional in Losi Context Bank — every context access and
 * tool call flows through {@link GovernanceEngine.enforce}. The in-memory
 * engine here is fully functional; persistent audit storage stubs out to the
 * Losi platform API (see `@losi/governance`).
 *
 * @packageDocumentation
 */

import type { DataScope } from "./memory.js";
import { GovernanceError } from "./errors.js";

/** A governable action. */
export interface GovernanceAction {
  /** The agent taking the action. */
  agentId: string;
  /** Action verb, e.g. "complete", "tool_call", "context_read". */
  type: string;
  /** Estimated cost in USD for this action, if known. */
  costUsd?: number;
  /** Data scope this action touches, if any. */
  scope?: DataScope;
  /** Free-form details for the audit log. */
  details?: Record<string, unknown>;
}

/** Per-agent governance policy. */
export interface GovernanceConfig {
  /** Maximum cumulative spend in USD for this agent. */
  spendCapUsd?: number;
  /** Maximum requests allowed per minute. */
  rateLimitPerMinute?: number;
  /** Actions this agent may never take. */
  blockedActions?: string[];
  /** Data scopes this agent is allowed to access. Empty/undefined = all. */
  allowedScopes?: DataScope[];
  /** When true, all actions are immediately denied. */
  killSwitch?: boolean;
}

/** A recorded audit entry. */
export interface AuditEntry extends GovernanceAction {
  /** ISO timestamp of the decision. */
  timestamp: string;
  /** Whether the action was allowed. */
  allowed: boolean;
  /** Reason for a denial, if denied. */
  reason?: string;
}

/** The result of an enforcement check. */
export interface EnforcementResult {
  /** Whether the action is allowed to proceed. */
  allowed: boolean;
  /** Human-readable reason (present on denial). */
  reason?: string;
}

/** Default governance config: no limits. */
export const DEFAULT_GOVERNANCE_CONFIG: GovernanceConfig = {};

interface AgentState {
  spentUsd: number;
  requestTimestamps: number[];
}

/**
 * In-memory governance enforcement engine.
 *
 * Tracks spend and request rate per agent and evaluates each action against
 * the configured policy. Emits audit entries that a persistence layer (e.g.
 * `@losi/governance` backed by the Losi API) can flush.
 *
 * @example
 * ```ts
 * const gov = new GovernanceEngine({ spendCapUsd: 5, rateLimitPerMinute: 60 });
 * const { allowed, reason } = gov.enforce({ agentId: "a1", type: "complete", costUsd: 0.02 });
 * if (!allowed) throw new Error(reason);
 * ```
 */
export class GovernanceEngine {
  private readonly config: GovernanceConfig;
  private readonly agents = new Map<string, AgentState>();
  private readonly log: AuditEntry[] = [];
  private readonly onAudit?: (entry: AuditEntry) => void;

  /**
   * @param config - The policy to enforce.
   * @param onAudit - Optional hook called for every audit entry (use this to
   *   forward entries to the Losi platform API).
   */
  constructor(config: GovernanceConfig = {}, onAudit?: (entry: AuditEntry) => void) {
    this.config = config;
    this.onAudit = onAudit;
  }

  private stateFor(agentId: string): AgentState {
    let state = this.agents.get(agentId);
    if (!state) {
      state = { spentUsd: 0, requestTimestamps: [] };
      this.agents.set(agentId, state);
    }
    return state;
  }

  /**
   * Evaluate an action against the policy. Does not throw — returns a result.
   * On an allowed action, spend and rate counters are updated.
   */
  enforce(action: GovernanceAction): EnforcementResult {
    const result = this.evaluate(action);
    this.record({
      ...action,
      timestamp: new Date().toISOString(),
      allowed: result.allowed,
      reason: result.reason,
    });
    return result;
  }

  /**
   * Like {@link enforce} but throws a {@link GovernanceError} on denial.
   */
  enforceOrThrow(action: GovernanceAction): void {
    const result = this.enforce(action);
    if (!result.allowed) {
      throw new GovernanceError(result.reason ?? "Action blocked by governance policy");
    }
  }

  private evaluate(action: GovernanceAction): EnforcementResult {
    if (this.config.killSwitch) {
      return { allowed: false, reason: "Kill switch is engaged for all agents" };
    }

    if (this.config.blockedActions?.includes(action.type)) {
      return { allowed: false, reason: `Action "${action.type}" is blocked for this agent` };
    }

    if (
      action.scope &&
      this.config.allowedScopes &&
      this.config.allowedScopes.length > 0 &&
      !this.config.allowedScopes.includes(action.scope)
    ) {
      return { allowed: false, reason: `Scope "${action.scope}" is not permitted for this agent` };
    }

    const state = this.stateFor(action.agentId);

    if (this.config.rateLimitPerMinute != null) {
      const now = Date.now();
      const windowStart = now - 60_000;
      const recent = state.requestTimestamps.filter((t) => t >= windowStart);
      if (recent.length >= this.config.rateLimitPerMinute) {
        return { allowed: false, reason: "Rate limit exceeded" };
      }
    }

    if (this.config.spendCapUsd != null && action.costUsd != null) {
      if (state.spentUsd + action.costUsd > this.config.spendCapUsd) {
        return { allowed: false, reason: "Spend cap exceeded" };
      }
    }

    // Allowed — commit counters.
    if (action.costUsd != null) state.spentUsd += action.costUsd;
    state.requestTimestamps.push(Date.now());
    return { allowed: true };
  }

  private record(entry: AuditEntry): void {
    this.log.push(entry);
    this.onAudit?.(entry);
  }

  /** Return a copy of the in-memory audit log. */
  audit(): AuditEntry[] {
    return [...this.log];
  }

  /** Current cumulative spend for an agent in USD. */
  spentFor(agentId: string): number {
    return this.agents.get(agentId)?.spentUsd ?? 0;
  }

  /** Reset all per-agent counters and the audit log. */
  reset(): void {
    this.agents.clear();
    this.log.length = 0;
  }
}
