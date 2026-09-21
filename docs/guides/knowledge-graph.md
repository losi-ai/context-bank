# Knowledge Graph & Relations

**Pick one on day 1:**

| Mode | Source | Needs Losi account? |
| --- | --- | --- |
| Local | You build (or bindings synthesize) nodes/edges into the snapshot | No |
| Hosted | Losi's live workspace graph via `GET …/graph` | Yes (`LOSI_API_KEY`) |

Same `KnowledgeGraph` shape either way — different source, not a second product
database. Hosted mode reads Losi's real cross-surface graph (CRM + Spaces +
memory + chat) and maps it into this type. Offline, `@losi-ai/core` ships the
type + helpers so you can build/test without an account.

Flat context is a list of facts. Relational context is entities plus typed
edges.

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

## Build one (local)

```ts
import { createGraph, addNode, addEdge, neighbors, renderGraph } from "@losi-ai/core";

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

`@losi-ai/nexus` and `@losi-ai/spaces` implement `resolveGraph()`:

- Nexus → `contact —works_at→ company`, `contact —booked→ booking`
- Spaces → `task —assigned_to→ person`, plus event nodes

Pass a binding into `LosiContext` and relations appear in the prompt. Local
`data:` providers work offline; a workspace API key pulls live Losi rows.
See [Bindings](./bindings.md).

## From the hosted platform

A connected Losi workspace exposes its cross-surface graph at
`GET /workspaces/{id}/graph` — list (`?nodeType=&search=&limit=`) or traverse
(`?rootType=&rootId=&depth=`). Response → `KnowledgeGraph`. See
[Hosted](../hosted.md).

When that path is live, the model sees **your** contacts, bookings, and tasks —
not a demo inventing relationships.

## Why it beats chat-derived graphs

Competitors infer triples from conversation logs — lossy and probabilistic.
Losi's hosted graph is built **top-down from real business objects**, so
`Ada —booked→ Demo` is a CRM fact, not a guess from a sentence. Next:
[Temporal reasoning](./temporal-reasoning.md).
