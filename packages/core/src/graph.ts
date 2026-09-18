/**
 * Knowledge graph primitive — relations, not just flat facts.
 *
 * The rest of Losi Context Bank models context as {@link ContextSnapshot}
 * sections (flat text). Real business context is *relational*: a contact
 * *booked* an appointment, a task *blocks* another task. This module adds a
 * lightweight, portable graph — nodes + typed edges with optional temporal
 * validity — that can travel inside a snapshot and render into a prompt.
 *
 * The temporal fields (`validAt` / `invalidAt`) let a graph express that a
 * relationship was true for a period ("preferred Adidas until 2026-02"), which
 * is the state of the art for agent memory: a later fact can invalidate an
 * earlier edge instead of both coexisting and confusing the model.
 *
 * @packageDocumentation
 */

/** A node in the knowledge graph — an entity such as a contact, task, or booking. */
export interface GraphNode {
  /** Stable unique id within the graph. */
  id: string;
  /** Entity type, e.g. `"contact"`, `"booking"`, `"task"`. Free-form. */
  type: string;
  /** Human/model-readable label, e.g. the entity's name or title. */
  label: string;
  /** Optional short summary of the entity. */
  summary?: string;
  /** Free-form metadata (source ids, scores, ...). */
  metadata?: Record<string, unknown>;
}

/**
 * A typed, directed relationship between two nodes, with optional temporal
 * validity. `validAt`/`invalidAt` are ISO timestamps describing the window in
 * which the relationship held true.
 */
export interface GraphEdge {
  /** Source node id. */
  from: string;
  /** Target node id. */
  to: string;
  /** Relationship type, e.g. `"booked"`, `"blocks"`, `"mentions"`. */
  type: string;
  /** Optional relationship strength/confidence (0..1 or any scale). */
  weight?: number;
  /** ISO timestamp: when the relationship became true. */
  validAt?: string;
  /** ISO timestamp: when the relationship stopped being true. */
  invalidAt?: string;
  /** Free-form metadata. */
  metadata?: Record<string, unknown>;
}

/** A portable knowledge graph: nodes plus the edges relating them. */
export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** Create an empty {@link KnowledgeGraph}. */
export function createGraph(): KnowledgeGraph {
  return { nodes: [], edges: [] };
}

/**
 * Add (or replace, by id) a node. Returns the same graph for chaining.
 */
export function addNode(graph: KnowledgeGraph, node: GraphNode): KnowledgeGraph {
  const idx = graph.nodes.findIndex((n) => n.id === node.id);
  if (idx >= 0) graph.nodes[idx] = node;
  else graph.nodes.push(node);
  return graph;
}

/**
 * Add an edge. Duplicate edges (same from/to/type) are de-duplicated, keeping
 * the most recently added. Returns the same graph for chaining.
 */
export function addEdge(graph: KnowledgeGraph, edge: GraphEdge): KnowledgeGraph {
  const key = (e: GraphEdge): string => `${e.from}\u0000${e.to}\u0000${e.type}`;
  const idx = graph.edges.findIndex((e) => key(e) === key(edge));
  if (idx >= 0) graph.edges[idx] = edge;
  else graph.edges.push(edge);
  return graph;
}

/** Look up a node by id. */
export function getNode(graph: KnowledgeGraph, id: string): GraphNode | undefined {
  return graph.nodes.find((n) => n.id === id);
}

/** A neighbor: the edge and the node it points to. */
export interface GraphNeighbor {
  edge: GraphEdge;
  node: GraphNode | undefined;
}

/**
 * Return the outgoing neighbors of a node, optionally filtered by edge type.
 *
 * @param graph - The graph to query.
 * @param nodeId - The source node id.
 * @param edgeType - Optional edge-type filter.
 */
export function neighbors(
  graph: KnowledgeGraph,
  nodeId: string,
  edgeType?: string,
): GraphNeighbor[] {
  return graph.edges
    .filter((e) => e.from === nodeId && (edgeType == null || e.type === edgeType))
    .map((edge) => ({ edge, node: getNode(graph, edge.to) }));
}

/**
 * Whether an edge is valid at a given ISO instant. Edges with no temporal
 * bounds are always valid. `validAt` is inclusive; `invalidAt` is exclusive.
 *
 * @param edge - The edge to test.
 * @param iso - The instant to test, ISO 8601. Defaults to now.
 */
export function isEdgeValidAt(edge: GraphEdge, iso: string = new Date().toISOString()): boolean {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return true;
  if (edge.validAt) {
    const v = Date.parse(edge.validAt);
    if (!Number.isNaN(v) && t < v) return false;
  }
  if (edge.invalidAt) {
    const iv = Date.parse(edge.invalidAt);
    if (!Number.isNaN(iv) && t >= iv) return false;
  }
  return true;
}

/**
 * Render a graph into a compact, prompt-friendly text block of relationships,
 * e.g. `- Ada Lovelace —booked→ Demo call`. Only edges valid at `asOf` (default
 * now) are included, so stale relationships don't pollute the prompt.
 *
 * @param graph - The graph to render.
 * @param asOf - ISO instant used to filter temporally-invalid edges.
 */
export function renderGraph(graph: KnowledgeGraph, asOf: string = new Date().toISOString()): string {
  if (graph.edges.length === 0 && graph.nodes.length === 0) return "";
  const label = (id: string): string => getNode(graph, id)?.label ?? id;

  const lines = graph.edges
    .filter((e) => isEdgeValidAt(e, asOf))
    .map((e) => `- ${label(e.from)} —${e.type}→ ${label(e.to)}`);

  // Include any isolated nodes (no valid edges) so entities aren't lost.
  const connected = new Set<string>();
  for (const e of graph.edges) {
    if (isEdgeValidAt(e, asOf)) {
      connected.add(e.from);
      connected.add(e.to);
    }
  }
  const isolated = graph.nodes
    .filter((n) => !connected.has(n.id))
    .map((n) => `- ${n.label}${n.summary ? `: ${n.summary}` : ""}`);

  const body = [...lines, ...isolated].join("\n");
  return body ? `## Relationships\n${body}` : "";
}

/**
 * Return only the edges valid at a given instant. This is the portable,
 * MIT-licensed equivalent of the bi-temporal fact filtering that hosted
 * memory services (e.g. Zep) charge for — usable offline, in any model.
 *
 * @param graph - The graph to query.
 * @param asOf - ISO instant. Defaults to now.
 */
export function queryValidRelations(
  graph: KnowledgeGraph,
  asOf: string = new Date().toISOString(),
): GraphEdge[] {
  return graph.edges.filter((e) => isEdgeValidAt(e, asOf));
}

/**
 * Mark an edge invalid as of an instant (mutates matching edges in place).
 * Use this when a fact stops being true — e.g. a task is unassigned, a
 * preference changes. Later renders/queries will exclude it after `at`.
 *
 * @param graph - The graph to update.
 * @param match - Which edge(s) to invalidate (by from/to/type).
 * @param at - ISO instant the relationship became untrue. Defaults to now.
 * @returns The number of edges invalidated.
 */
export function invalidateEdge(
  graph: KnowledgeGraph,
  match: { from: string; to: string; type?: string },
  at: string = new Date().toISOString(),
): number {
  let count = 0;
  for (const e of graph.edges) {
    if (e.from === match.from && e.to === match.to && (match.type == null || e.type === match.type)) {
      e.invalidAt = at;
      count++;
    }
  }
  return count;
}

/**
 * Supersede an existing relationship with a new one: invalidate the old edge
 * at `at` and add the new edge valid from `at`. This is the "preference
 * changed" pattern — the old fact is preserved with a validity window, the new
 * fact takes over, and history stays queryable.
 *
 * @param graph - The graph to update.
 * @param oldEdge - The relationship to close (from/to/type).
 * @param newEdge - The replacement relationship (validAt defaults to `at`).
 * @param at - ISO instant of the switchover. Defaults to now.
 */
export function supersede(
  graph: KnowledgeGraph,
  oldEdge: { from: string; to: string; type?: string },
  newEdge: GraphEdge,
  at: string = new Date().toISOString(),
): KnowledgeGraph {
  invalidateEdge(graph, oldEdge, at);
  addEdge(graph, { ...newEdge, validAt: newEdge.validAt ?? at });
  return graph;
}
