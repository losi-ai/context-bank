/**
 * The {@link ContextBinding} interface. Bindings (like `@losi-ai/nexus` and
 * `@losi-ai/spaces`) resolve live business context into {@link ContextSection}s
 * that get merged into a {@link ContextSnapshot}.
 *
 * @packageDocumentation
 */

import type { ContextSection, DataScope } from "./memory.js";
import type { KnowledgeGraph } from "./graph.js";

/**
 * A source of business context. Implement this to teach `LosiContext` how to
 * pull a new category of data (CRM, workspace, custom systems, ...).
 *
 * @example
 * ```ts
 * const binding: ContextBinding = {
 *   name: "nexus",
 *   scopes: ["crm", "bookings"],
 *   async resolve(prompt) {
 *     return [{ scope: "bookings", label: "Upcoming", content: "..." }];
 *   },
 * };
 * ```
 */
export interface ContextBinding {
  /** Stable binding name, e.g. `"nexus"`. */
  readonly name: string;
  /** Scopes this binding can produce. */
  readonly scopes: DataScope[];
  /**
   * Resolve context sections relevant to a prompt.
   *
   * @param prompt - The user prompt being enriched. Bindings may use it to
   *   select which context is relevant.
   * @returns Sections to merge into the snapshot.
   */
  resolve(prompt: string): Promise<ContextSection[]>;

  /**
   * Optionally resolve relational context (entities + typed relationships) for
   * a prompt. Bindings that can express relations — e.g. a contact that
   * *booked* an appointment — return a {@link KnowledgeGraph} that is merged
   * into the snapshot's `graph`. Bindings without relations omit this.
   *
   * @param prompt - The user prompt being enriched.
   * @returns A knowledge graph to merge, or `undefined`.
   */
  resolveGraph?(prompt: string): Promise<KnowledgeGraph | undefined>;
}
