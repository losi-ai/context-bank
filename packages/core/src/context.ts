/**
 * {@link LosiContext} — the heart of Losi Context Bank.
 *
 * A `LosiContext` holds your memory + governance config, the set of context
 * bindings, and the currently-active {@link LLMAdapter}. Its defining feature:
 * calling {@link LosiContext.switchAdapter} swaps the model while keeping the
 * context snapshot intact. Context belongs to the platform, not the model.
 *
 * @packageDocumentation
 */

import type {
  CompletionChunk,
  CompletionOptions,
  CompletionResult,
  LLMAdapter,
  Message,
} from "./types.js";
import type { MemoryConfig, ContextSnapshot, DataScope, ContextSection } from "./memory.js";
import {
  createEmptySnapshot,
  mergeSections,
  renderSnapshot,
  DEFAULT_MEMORY_CONFIG,
} from "./memory.js";
import type { GovernanceConfig } from "./governance.js";
import { GovernanceEngine } from "./governance.js";
import type { ContextBinding } from "./binding.js";
import { AdapterError } from "./errors.js";
import type { SnapshotStore } from "./storage.js";
import { addNode, addEdge } from "./graph.js";

/** Options for constructing a {@link LosiContext}. */
export interface LosiContextConfig {
  /** The initial model adapter. */
  adapter: LLMAdapter;
  /** What context to include. */
  memory?: MemoryConfig;
  /** Governance policy for the default agent. */
  governance?: GovernanceConfig;
  /** Context bindings (Nexus, Spaces, custom). */
  bindings?: ContextBinding[];
  /** Workspace this context is scoped to (used by bindings and snapshots). */
  workspaceId?: string;
  /** Identifier for the acting agent, used in governance. Defaults to "default". */
  agentId?: string;
  /**
   * Optional pluggable store for persisting the context snapshot across
   * sessions. When set, use {@link LosiContext.persist} and
   * {@link LosiContext.restore}.
   */
  store?: SnapshotStore;
  /**
   * Key used with {@link LosiContextConfig.store}. Defaults to the
   * `workspaceId`, then the `agentId`.
   */
  persistKey?: string;
}

/** Options for {@link LosiContext.complete}. */
export interface ContextCompletionOptions extends CompletionOptions {
  /**
   * When true (default), the current snapshot is refreshed from bindings
   * before completing. Set false to reuse the existing snapshot.
   */
  refreshContext?: boolean;
}

/**
 * Orchestrates context resolution, governance, and model calls.
 *
 * @example
 * ```ts
 * import { LosiContext } from "@losi-ai/core";
 * import { OpenAIAdapter } from "@losi-ai/openai";
 * import { AnthropicAdapter } from "@losi-ai/anthropic";
 *
 * const ctx = new LosiContext({
 *   adapter: new OpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY! }),
 *   memory: { crm: true, bookings: true },
 * });
 *
 * const a = await ctx.complete("What meetings do I have tomorrow?");
 *
 * // Switch models — the context snapshot stays.
 * ctx.switchAdapter(new AnthropicAdapter({ apiKey: process.env.ANTHROPIC_API_KEY! }));
 * const b = await ctx.complete("Summarize the same meetings in one line.");
 * ```
 */
export class LosiContext {
  private adapter: LLMAdapter;
  private readonly memory: MemoryConfig;
  private readonly bindings: ContextBinding[];
  private readonly workspaceId?: string;
  private readonly agentId: string;
  private snapshot: ContextSnapshot;
  private readonly governance: GovernanceEngine;
  private readonly store?: SnapshotStore;
  private readonly persistKey: string;

  constructor(config: LosiContextConfig) {
    this.adapter = config.adapter;
    this.memory = config.memory ?? {};
    this.bindings = config.bindings ?? [];
    this.workspaceId = config.workspaceId;
    this.agentId = config.agentId ?? "default";
    this.governance = new GovernanceEngine(config.governance ?? {});
    this.snapshot = createEmptySnapshot(this.workspaceId);
    this.store = config.store;
    this.persistKey = config.persistKey ?? config.workspaceId ?? this.agentId;
  }

  /** The provider id of the active adapter. */
  get provider(): string {
    return this.adapter.provider;
  }

  /** The model id of the active adapter. */
  get model(): string {
    return this.adapter.model;
  }

  /** The governance engine backing this context. */
  get governanceEngine(): GovernanceEngine {
    return this.governance;
  }

  /**
   * Swap the active model adapter. The context snapshot is preserved.
   *
   * @param adapter - The new adapter to use for subsequent calls.
   * @returns `this`, for chaining.
   */
  switchAdapter(adapter: LLMAdapter): this {
    this.adapter = adapter;
    return this;
  }

  /** Return the current (immutable) context snapshot. */
  getSnapshot(): ContextSnapshot {
    return this.snapshot;
  }

  /** Replace the current snapshot (e.g. one restored from storage). */
  setSnapshot(snapshot: ContextSnapshot): void {
    this.snapshot = snapshot;
  }

  /**
   * Remember a fact. This is the high-level memory verb (parity with Mem0's
   * `add` and Cognee's `remember`): it appends a memory section to the current
   * snapshot and, if a {@link SnapshotStore} is configured, persists it so the
   * fact survives across sessions and model switches.
   *
   * @param fact - The thing to remember, e.g. "The user prefers concise answers."
   * @param options - Optional label, scope, and whether to auto-persist (default true when a store exists).
   * @returns The updated snapshot.
   *
   * @example
   * ```ts
   * await ctx.remember("Acme Corp signed a 2-year contract in Q3.");
   * ```
   */
  async remember(
    fact: string,
    options: { label?: string; scope?: DataScope; persist?: boolean } = {},
  ): Promise<ContextSnapshot> {
    this.governance.enforceOrThrow({
      agentId: this.agentId,
      type: "memory_write",
      scope: options.scope,
    });
    const section: ContextSection = {
      scope: options.scope ?? "personal-memory",
      label: options.label ?? "Remembered",
      content: fact,
      provenance: { binding: "remember", resolvedAt: new Date().toISOString(), reason: "explicitly remembered" },
    };
    this.snapshot = mergeSections(this.snapshot, [section]);
    const shouldPersist = options.persist ?? Boolean(this.store);
    if (shouldPersist && this.store) {
      await this.store.save(this.persistKey, this.snapshot);
    }
    return this.snapshot;
  }

  /**
   * Recall context relevant to a query — the high-level retrieval verb (parity
   * with Mem0's `search` and Cognee's `recall`). Refreshes from bindings when
   * present, then returns the rendered context (sections + relationships) that
   * would be injected for this query.
   *
   * @param query - What to recall context for.
   * @returns The rendered context string (empty if nothing relevant).
   *
   * @example
   * ```ts
   * const context = await ctx.recall("What do I know about Acme Corp?");
   * ```
   */
  async recall(query: string): Promise<string> {
    if (this.bindings.length > 0) {
      await this.refresh(query);
    }
    return renderSnapshot(
      this.snapshot,
      this.memory.maxCharsPerSection ?? DEFAULT_MEMORY_CONFIG.maxCharsPerSection,
    );
  }

  /**
   * Persist the current snapshot to the configured {@link SnapshotStore}.
   *
   * @param key - Optional override for the storage key.
   * @throws {@link AdapterError} if no store was configured.
   */
  async persist(key?: string): Promise<void> {
    if (!this.store) {
      throw new AdapterError("No SnapshotStore configured; pass `store` to LosiContext");
    }
    await this.store.save(key ?? this.persistKey, this.snapshot);
  }

  /**
   * Restore a snapshot from the configured {@link SnapshotStore}, replacing the
   * current one. Returns the restored snapshot, or `null` if none was stored.
   *
   * @param key - Optional override for the storage key.
   * @throws {@link AdapterError} if no store was configured.
   */
  async restore(key?: string): Promise<ContextSnapshot | null> {
    if (!this.store) {
      throw new AdapterError("No SnapshotStore configured; pass `store` to LosiContext");
    }
    const restored = await this.store.load(key ?? this.persistKey);
    if (restored) this.snapshot = restored;
    return restored;
  }

  /** The scopes currently permitted by the memory config. */
  private allowedScopes(): DataScope[] | undefined {
    if (this.memory.scopes && this.memory.scopes.length > 0) return this.memory.scopes;
    const scopes: DataScope[] = [];
    if (this.memory.crm) scopes.push("crm");
    if (this.memory.bookings) scopes.push("bookings");
    if (this.memory.workspace) scopes.push("workspace", "tasks", "notes", "sheets", "calendar");
    if (this.memory.personalMemory) scopes.push("personal-memory");
    if (this.memory.teamMemory) scopes.push("team-memory");
    return scopes.length > 0 ? scopes : undefined;
  }

  /**
   * Refresh the snapshot by resolving all bindings for the given prompt.
   * Sections outside the allowed scopes are dropped.
   *
   * @param prompt - Prompt used by bindings to select relevant context.
   * @returns The refreshed snapshot.
   */
  async refresh(prompt: string): Promise<ContextSnapshot> {
    const allowed = this.allowedScopes();
    let snapshot = createEmptySnapshot(this.workspaceId);

    for (const binding of this.bindings) {
      // Skip bindings that can only produce disallowed scopes.
      if (allowed && !binding.scopes.some((s) => allowed.includes(s))) continue;

      this.governance.enforceOrThrow({
        agentId: this.agentId,
        type: "context_read",
        details: { binding: binding.name },
      });

      const sections = await binding.resolve(prompt);
      const filtered = allowed
        ? sections.filter((s) => allowed.includes(s.scope))
        : sections;
      snapshot = mergeSections(snapshot, filtered);

      // Merge any relational context this binding can provide.
      if (binding.resolveGraph) {
        const g = await binding.resolveGraph(prompt);
        if (g && (g.nodes.length > 0 || g.edges.length > 0)) {
          const base = snapshot.graph ?? { nodes: [], edges: [] };
          for (const n of g.nodes) addNode(base, n);
          for (const e of g.edges) addEdge(base, e);
          snapshot = { ...snapshot, graph: base };
        }
      }
    }

    this.snapshot = snapshot;
    return snapshot;
  }

  /**
   * Build the system prompt for a call: caller-provided system text plus the
   * rendered context snapshot.
   */
  private buildSystem(options?: ContextCompletionOptions): string | undefined {
    const rendered = renderSnapshot(
      this.snapshot,
      this.memory.maxCharsPerSection ?? DEFAULT_MEMORY_CONFIG.maxCharsPerSection,
    );
    const parts = [options?.system, rendered].filter(
      (p): p is string => typeof p === "string" && p.length > 0,
    );
    return parts.length > 0 ? parts.join("\n\n") : undefined;
  }

  private toMessages(prompt: string | Message[]): Message[] {
    return typeof prompt === "string" ? [{ role: "user", content: prompt }] : prompt;
  }

  /**
   * Complete a prompt with the active adapter, injecting the context snapshot
   * as a system prompt. Refreshes context from bindings first unless
   * `refreshContext` is false.
   *
   * @param prompt - A user prompt string, or a full message array.
   * @param options - Completion + refresh options.
   */
  async complete(
    prompt: string | Message[],
    options?: ContextCompletionOptions,
  ): Promise<CompletionResult> {
    const messages = this.toMessages(prompt);
    const refresh = options?.refreshContext ?? true;
    if (refresh && this.bindings.length > 0) {
      const firstUser = messages.find((m) => m.role === "user");
      await this.refresh(firstUser?.content ?? "");
    }

    this.governance.enforceOrThrow({ agentId: this.agentId, type: "complete" });

    const system = this.buildSystem(options);
    return this.adapter.complete(messages, { ...options, system });
  }

  /**
   * Stream a completion with injected context. Throws {@link AdapterError} if
   * the active adapter does not support streaming.
   *
   * @param prompt - A user prompt string, or a full message array.
   * @param options - Completion + refresh options.
   */
  async *stream(
    prompt: string | Message[],
    options?: ContextCompletionOptions,
  ): AsyncIterable<CompletionChunk> {
    if (!this.adapter.stream) {
      throw new AdapterError(
        `Adapter "${this.adapter.provider}" does not support streaming`,
      );
    }
    const messages = this.toMessages(prompt);
    const refresh = options?.refreshContext ?? true;
    if (refresh && this.bindings.length > 0) {
      const firstUser = messages.find((m) => m.role === "user");
      await this.refresh(firstUser?.content ?? "");
    }

    this.governance.enforceOrThrow({ agentId: this.agentId, type: "stream" });

    const system = this.buildSystem(options);
    yield* this.adapter.stream(messages, { ...options, system });
  }
}
