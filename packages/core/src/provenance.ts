/**
 * Provenance and snapshot diffing — auditable context.
 *
 * Every competitor can *assemble* context. None expose, at the SDK level, a
 * portable answer to two questions auditors and safety teams actually ask:
 *
 * 1. **Why was this in the prompt?** (provenance: which binding/scope produced
 *    each section, and when).
 * 2. **What changed between two context snapshots?** (diffing: added/removed
 *    sections and relationships across a model switch or a refresh).
 *
 * This module makes both first-class and MIT-licensed. It is pure and
 * dependency-free.
 *
 * @packageDocumentation
 */

import type { ContextSnapshot, ContextSection } from "./memory.js";
import type { GraphEdge } from "./graph.js";

/** Where a piece of context came from. */
export interface Provenance {
  /** The binding that produced it, e.g. `"nexus"`. */
  binding?: string;
  /** The scope/category, e.g. `"bookings"`. */
  scope?: string;
  /** ISO timestamp when it was resolved. */
  resolvedAt?: string;
  /** Optional human-readable reason it was included. */
  reason?: string;
}

/**
 * Annotate a snapshot's sections with provenance metadata, returning a new
 * snapshot. Records why each section is present so a later audit can explain
 * the prompt.
 *
 * @param snapshot - The snapshot to annotate.
 * @param provenanceFor - Maps a section to its provenance.
 */
export function annotateProvenance(
  snapshot: ContextSnapshot,
  provenanceFor: (section: ContextSection) => Provenance,
): ContextSnapshot {
  return {
    ...snapshot,
    sections: snapshot.sections.map((s) => ({
      ...s,
      provenance: provenanceFor(s),
    })),
  };
}

/** A single difference between two snapshots. */
export interface SnapshotChange {
  kind: "section" | "edge";
  op: "added" | "removed";
  /** For sections: `scope::label`. For edges: `from -type-> to`. */
  key: string;
}

/** The result of {@link diffSnapshots}. */
export interface SnapshotDiff {
  changes: SnapshotChange[];
  /** Convenience counts. */
  summary: { added: number; removed: number };
}

function sectionKey(s: ContextSection): string {
  return `${s.scope}::${s.label}`;
}

function edgeKey(e: GraphEdge): string {
  return `${e.from} -${e.type}-> ${e.to}`;
}

/**
 * Diff two context snapshots: which sections and relationships were added or
 * removed going from `before` to `after`. Useful for auditing what a refresh
 * or a model switch changed about the injected context.
 *
 * @param before - The earlier snapshot.
 * @param after - The later snapshot.
 */
export function diffSnapshots(before: ContextSnapshot, after: ContextSnapshot): SnapshotDiff {
  const changes: SnapshotChange[] = [];

  const beforeSections = new Set(before.sections.map(sectionKey));
  const afterSections = new Set(after.sections.map(sectionKey));
  for (const k of afterSections) {
    if (!beforeSections.has(k)) changes.push({ kind: "section", op: "added", key: k });
  }
  for (const k of beforeSections) {
    if (!afterSections.has(k)) changes.push({ kind: "section", op: "removed", key: k });
  }

  const beforeEdges = new Set((before.graph?.edges ?? []).map(edgeKey));
  const afterEdges = new Set((after.graph?.edges ?? []).map(edgeKey));
  for (const k of afterEdges) {
    if (!beforeEdges.has(k)) changes.push({ kind: "edge", op: "added", key: k });
  }
  for (const k of beforeEdges) {
    if (!afterEdges.has(k)) changes.push({ kind: "edge", op: "removed", key: k });
  }

  const added = changes.filter((c) => c.op === "added").length;
  const removed = changes.filter((c) => c.op === "removed").length;
  return { changes, summary: { added, removed } };
}

/**
 * Render a {@link SnapshotDiff} into a compact, human-readable audit line list.
 */
export function renderDiff(diff: SnapshotDiff): string {
  if (diff.changes.length === 0) return "No context changes.";
  return diff.changes
    .map((c) => `${c.op === "added" ? "+" : "-"} [${c.kind}] ${c.key}`)
    .join("\n");
}
