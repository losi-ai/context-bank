/**
 * `@losi/governance` — multi-agent policy engine and audit layer.
 *
 * Wraps the in-memory {@link GovernanceEngine} from `@losi/core` with a
 * per-agent policy registry, a kill switch, and an audit sink. The in-memory
 * enforcement is fully functional; persistent audit storage is delegated to an
 * {@link AuditSink} — the clean boundary to the hosted Losi platform.
 *
 * @packageDocumentation
 */

import type { AuditEntry, GovernanceAction, GovernanceConfig, EnforcementResult } from "@losi/core";
import { GovernanceEngine, GovernanceError } from "@losi/core";

export type {
  AuditEntry,
  GovernanceAction,
  GovernanceConfig,
  EnforcementResult,
} from "@losi/core";

/**
 * A destination for audit entries. Implement this to persist entries to the
 * hosted Losi platform, a database, or a log pipeline.
 */
export interface AuditSink {
  /** Persist a single audit entry. May be async. */
  write(entry: AuditEntry): void | Promise<void>;
}

/**
 * An {@link AuditSink} that forwards entries to the hosted Losi governance API.
 * This is the API boundary — with no API key it buffers locally and can be
 * flushed later.
 */
export class LosiAuditSink implements AuditSink {
  private readonly buffer: AuditEntry[] = [];
  private readonly baseUrl: string;
  private readonly fetchImpl?: typeof fetch;

  constructor(
    private readonly options: {
      apiKey?: string;
      workspaceId?: string;
      baseUrl?: string;
      fetchImpl?: typeof fetch;
    } = {},
  ) {
    this.baseUrl = options.baseUrl ?? "https://losi.ai/api/v1/context-bank";
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
  }

  /** Whether a live connection is configured. */
  get isConnected(): boolean {
    return Boolean(this.options.apiKey && this.options.workspaceId);
  }

  async write(entry: AuditEntry): Promise<void> {
    if (!this.isConnected || !this.fetchImpl) {
      // No live connection — buffer for later flush.
      this.buffer.push(entry);
      return;
    }
    await this.fetchImpl(
      `${this.baseUrl}/workspaces/${this.options.workspaceId}/governance/audit`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify(entry),
      },
    );
  }

  /** Return and clear the local buffer of un-persisted entries. */
  drain(): AuditEntry[] {
    const out = [...this.buffer];
    this.buffer.length = 0;
    return out;
  }
}

/**
 * Manages governance policies across many agents.
 *
 * @example
 * ```ts
 * const gov = new PolicyManager();
 * gov.setPolicy("support-bot", { spendCapUsd: 10, rateLimitPerMinute: 30 });
 *
 * const decision = gov.enforce({ agentId: "support-bot", type: "complete", costUsd: 0.01 });
 * if (!decision.allowed) console.warn(decision.reason);
 *
 * gov.kill("support-bot"); // emergency stop
 * console.log(gov.audit("support-bot"));
 * ```
 */
export class PolicyManager {
  private readonly engines = new Map<string, GovernanceEngine>();
  private readonly policies = new Map<string, GovernanceConfig>();
  private readonly killed = new Set<string>();
  private readonly sink?: AuditSink;

  /**
   * @param sink - Optional audit sink; every audit entry is forwarded to it.
   */
  constructor(sink?: AuditSink) {
    this.sink = sink;
  }

  /** Set (or replace) the policy for an agent. */
  setPolicy(agentId: string, config: GovernanceConfig): void {
    this.policies.set(agentId, config);
    const engine = new GovernanceEngine(
      { ...config, killSwitch: config.killSwitch || this.killed.has(agentId) },
      (entry) => {
        void this.sink?.write(entry);
      },
    );
    this.engines.set(agentId, engine);
  }

  /** Get the policy for an agent, if set. */
  getPolicy(agentId: string): GovernanceConfig | undefined {
    return this.policies.get(agentId);
  }

  private engineFor(agentId: string): GovernanceEngine {
    let engine = this.engines.get(agentId);
    if (!engine) {
      this.setPolicy(agentId, {});
      engine = this.engines.get(agentId)!;
    }
    return engine;
  }

  /** Evaluate an action against the acting agent's policy. Does not throw. */
  enforce(action: GovernanceAction): EnforcementResult {
    if (this.killed.has(action.agentId)) {
      return { allowed: false, reason: "Agent has been killed" };
    }
    return this.engineFor(action.agentId).enforce(action);
  }

  /** Like {@link enforce} but throws {@link GovernanceError} on denial. */
  enforceOrThrow(action: GovernanceAction): void {
    const result = this.enforce(action);
    if (!result.allowed) {
      throw new GovernanceError(result.reason ?? "Action blocked by governance policy");
    }
  }

  /** Immediately stop an agent. All future actions are denied. */
  kill(agentId: string): void {
    this.killed.add(agentId);
    const existing = this.policies.get(agentId) ?? {};
    this.setPolicy(agentId, { ...existing, killSwitch: true });
  }

  /** Reverse a kill switch for an agent. */
  revive(agentId: string): void {
    this.killed.delete(agentId);
    const existing = this.policies.get(agentId) ?? {};
    this.setPolicy(agentId, { ...existing, killSwitch: false });
  }

  /** Whether an agent is currently killed. */
  isKilled(agentId: string): boolean {
    return this.killed.has(agentId);
  }

  /** Current cumulative spend for an agent in USD. */
  spentFor(agentId: string): number {
    return this.engines.get(agentId)?.spentFor(agentId) ?? 0;
  }

  /** Return the audit log for one agent, or all agents when omitted. */
  audit(agentId?: string): AuditEntry[] {
    if (agentId) return this.engines.get(agentId)?.audit() ?? [];
    const all: AuditEntry[] = [];
    for (const engine of this.engines.values()) all.push(...engine.audit());
    return all.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }
}
