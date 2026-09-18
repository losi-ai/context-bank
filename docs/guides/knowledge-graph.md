# Knowledge Graph & Relations

Flat context is a list of facts. **Relational context is a graph** — entities
and the typed relationships between them. This is the single biggest thing that
separates modern agent memory from RAG, and Losi Context Bank makes it a
first-class, MIT-licensed primitive in `@losi/core`.

## The shape

```ts
interface GraphNode {
  id: string;
  type: string;      // "contact", "booking", "task", ...
  label: string;     // display name
  summary?: string;
  metadata?: Record<string, unknown>;
}

interface GraphEdge {
  from: string;      // node id
  to: string;        // node id
  type: string;      // "booked", "works_at", "blocks", ...
  weight?: number;
  validAt?: string;  // ISO — when the relationship became true
  invalidAt?: string;// ISO — when it stopped being true
  metadata?: Record<string, unknown>;
}

interface KnowledgeGraph { nodes: GraphNode[]; edges: GraphEdge[] }
```

## Build one

```ts
import { createGraph, addNode, addEdge, neighbors, renderGraph } from "@losi/core";

const g = createGraph();
addNode(g, { id: "c1", type: "contact", label: "Ada Lovelace" });
addNode(g, { id: "b1", type: "booking", label: "Demo call" });
addEdge(g, { from: "c1", to: "b1", type: "booked", validAt: "2026-09-20T14:00:00Z" });

neighbors(g, "c1", "booked");   // [{ edge, node: {label:"Demo call"} }]
renderGraph(g);                 // "## Relationships\n- Ada Lovelace —booked→ Demo call"
```

## It travels inside a snapshot

`ContextSnapshot` carries an optional `graph`. When present, `renderSnapshot()`
appends a `## Relationships` block to the system prompt — so the model sees the
relations, not just the entities. Because the graph lives in the snapshot, it
**persists across model switches** like everything else.

## Bindings produce graphs automatically

`@losi/nexus` and `@losi/spaces` implement `resolveGraph()`:

- Nexus → `contact —works_at→ company`, `contact —booked→ booking`
- Spaces → `task —assigned_to→ person`, plus event nodes

Add the binding to a `LosiContext` and relations appear in the prompt with no
extra work. See [Bindings](./bindings.md).

## From the hosted platform

A connected Losi workspace exposes its cross-surface graph (CRM + Spaces +
memory + chat) at `GET /workspaces/{id}/graph` — list mode
(`?nodeType=&search=&limit=`) or traverse mode (`?rootType=&rootId=&depth=`).
The response maps directly onto `KnowledgeGraph`. See [Hosted](../hosted.md).

## Why it beats chat-derived graphs

Competitors infer a graph by extracting triples from conversation logs — lossy
and probabilistic. Losi's graph is built **top-down from real business
objects**, so `Ada —booked→ Demo` is a fact from the CRM, not a guess from a
sentence. Next: [Temporal reasoning](./temporal-reasoning.md).
