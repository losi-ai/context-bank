# Temporal Reasoning

The canonical failure of vector/RAG memory: a user loved Adidas, then switched
to Puma. Ask "what sneakers should I buy?" and RAG returns the Adidas fact —
it's the most *semantically similar*, even though it's *stale*. The fix is
temporal validity on relationships, and Losi Context Bank ships it in
`@losi/core` — portable and MIT, not locked behind a hosted service.

## Bi-temporal edges

Every `GraphEdge` may carry `validAt` and `invalidAt` (ISO timestamps). An edge
is "valid at" an instant when that instant is within the window.

```ts
import { isEdgeValidAt } from "@losi/core";

isEdgeValidAt({ from: "u", to: "adidas", type: "prefers", validAt: "2026-01-01T00:00:00Z", invalidAt: "2026-06-01T00:00:00Z" }, "2026-09-01T00:00:00Z");
// false — the preference ended in June
```

## Supersede a fact

When a fact changes, don't delete the old one — **supersede** it. The old edge
gets an `invalidAt`; the new edge starts at the switchover. History stays
queryable.

```ts
import { createGraph, addNode, addEdge, supersede, queryValidRelations } from "@losi/core";

const g = createGraph();
addNode(g, { id: "u", type: "user", label: "User" });
addNode(g, { id: "adidas", type: "brand", label: "Adidas" });
addNode(g, { id: "puma", type: "brand", label: "Puma" });
addEdge(g, { from: "u", to: "adidas", type: "prefers", validAt: "2026-01-01T00:00:00Z" });

// Preference changed on 2026-06-01:
supersede(g, { from: "u", to: "adidas", type: "prefers" },
             { from: "u", to: "puma", type: "prefers" },
             "2026-06-01T00:00:00Z");

queryValidRelations(g, "2026-09-01T00:00:00Z"); // → prefers Puma
queryValidRelations(g, "2026-02-01T00:00:00Z"); // → prefers Adidas (historical)
```

## Query and invalidate

```ts
import { queryValidRelations, invalidateEdge } from "@losi/core";

queryValidRelations(g);                          // edges valid now
invalidateEdge(g, { from: "t1", to: "p1", type: "assigned_to" }); // fact ended now
```

## What renders

`renderGraph()` (and therefore `renderSnapshot()`) only includes edges valid at
the render instant. Stale relationships never reach the prompt — the model sees
current truth, and history remains available for "what was true in February?"
queries.

This is the same bi-temporal model hosted services like Zep charge for; here it
is open, offline-capable, and works with any adapter. Next:
[Provenance & auditing](./provenance.md).
