/**
 * Memory configuration and context snapshots.
 *
 * A {@link MemoryConfig} declares *what* context to include. A
 * {@link ContextSnapshot} is the resolved payload that gets injected into a
 * prompt. Snapshots are the unit that persists across model switches — the
 * whole point of Losi Context Bank.
 *
 * @packageDocumentation
 */

import type { KnowledgeGraph } from "./graph.js";
import { renderGraph } from "./graph.js";

/**
 * Data scopes that describe categories of business context. Governance rules
 * and context bindings both key off these.
 */
export type DataScope =
  | "crm"
  | "bookings"
  | "conversations"
  | "workspace"
  | "tasks"
  | "notes"
  | "sheets"
  | "calendar"
  | "personal-memory"
  | "team-memory"
  | (string & {});

/**
 * Declares which categories of context should be pulled into a snapshot.
 *
 * Every field defaults to `false` (off) so nothing leaks into a prompt unless
 * you opt in.
 */
export interface MemoryConfig {
  /** Include CRM data: leads, contacts, companies, opportunities. */
  crm?: boolean;
  /** Include bookings and appointments. */
  bookings?: boolean;
  /** Include workspace execution data: tasks, notes, sheets, sprints. */
  workspace?: boolean;
  /** Include the user's personal, cross-session memory. */
  personalMemory?: boolean;
  /** Include shared team/workspace memory. */
  teamMemory?: boolean;
  /**
   * Explicit scope allow-list. When provided, only these scopes may appear in
   * a snapshot regardless of the boolean flags above.
   */
  scopes?: DataScope[];
  /** Soft cap on characters injected per section. Defaults to 4000. */
  maxCharsPerSection?: number;
}

/** A single named section of resolved context. */
export interface ContextSection {
  /** The scope this section belongs to. */
  scope: DataScope;
  /** Short human/model-readable label, e.g. "Upcoming bookings". */
  label: string;
  /** The rendered context text for this section. */
  content: string;
  /**
   * Optional provenance: where this section came from and why. Populated by
   * `annotateProvenance` from `@losi-ai/core`. Enables auditing why a piece of
   * context was in the prompt.
   */
  provenance?: {
    binding?: string;
    scope?: string;
    resolvedAt?: string;
    reason?: string;
  };
}

/**
 * The resolved context payload. This is what gets injected into a prompt and
 * what persists when you switch adapters.
 */
export interface ContextSnapshot {
  /** ISO timestamp when the snapshot was assembled. */
  capturedAt: string;
  /** Optional workspace this snapshot was resolved for. */
  workspaceId?: string;
  /** Resolved context sections. */
  sections: ContextSection[];
  /**
   * Optional relational context: entities and their typed relationships. This
   * is what makes context a graph, not just flat facts — e.g. a contact that
   * *booked* an appointment. Rendered into the prompt when present.
   */
  graph?: KnowledgeGraph;
  /** Free-form metadata (source adapter, request id, ...). */
  metadata?: Record<string, unknown>;
}

/** Default memory config: nothing enabled. */
export const DEFAULT_MEMORY_CONFIG: Required<Pick<MemoryConfig, "maxCharsPerSection">> = {
  maxCharsPerSection: 4000,
};

/**
 * Create an empty snapshot with a fresh timestamp.
 *
 * @param workspaceId - Optional workspace association.
 */
export function createEmptySnapshot(workspaceId?: string): ContextSnapshot {
  return {
    capturedAt: new Date().toISOString(),
    workspaceId,
    sections: [],
  };
}

/**
 * Render a snapshot into a single string suitable for a system prompt.
 * Sections are truncated to the config's `maxCharsPerSection`.
 *
 * @param snapshot - The snapshot to render.
 * @param maxCharsPerSection - Per-section character cap.
 */
export function renderSnapshot(
  snapshot: ContextSnapshot,
  maxCharsPerSection = DEFAULT_MEMORY_CONFIG.maxCharsPerSection,
): string {
  const graphText = snapshot.graph ? renderGraph(snapshot.graph) : "";
  if (snapshot.sections.length === 0 && !graphText) return "";
  const parts = snapshot.sections.map((section) => {
    const body =
      section.content.length > maxCharsPerSection
        ? `${section.content.slice(0, maxCharsPerSection)}…`
        : section.content;
    return `## ${section.label}\n${body}`;
  });
  if (graphText) parts.push(graphText);
  return `# Context (via Losi Context Bank)\n\n${parts.join("\n\n")}`;
}

/**
 * Merge additional sections into a snapshot, returning a new snapshot.
 * Existing sections with the same scope + label are replaced.
 */
export function mergeSections(
  snapshot: ContextSnapshot,
  sections: ContextSection[],
): ContextSnapshot {
  const key = (s: ContextSection): string => `${s.scope}::${s.label}`;
  const map = new Map<string, ContextSection>();
  for (const s of snapshot.sections) map.set(key(s), s);
  for (const s of sections) map.set(key(s), s);
  return { ...snapshot, sections: [...map.values()] };
}
