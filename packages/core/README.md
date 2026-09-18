# @losi/core

The context engine at the heart of [Losi Context Bank](https://github.com/marshmallow-studio/losi-context-bank). Portable context for any LLM — switch models freely, your context stays.

```bash
npm install @losi/core
```

## What's in here

- **`LLMAdapter`** — the interface every model adapter implements.
- **`LosiContext`** — holds memory + governance config and the active adapter. `switchAdapter()` swaps the model while keeping the context snapshot.
- **`MemoryConfig` / `ContextSnapshot`** — declare what context to include; the snapshot is what gets injected and persisted.
- **`GovernanceEngine` / `GovernanceConfig`** — in-memory spend caps, rate limits, blocked actions, data scopes, kill switch, audit log.
- **`ContextBinding`** — the interface `@losi/nexus` and `@losi/spaces` implement.
- **Storage** — `serializeSnapshot` / `deserializeSnapshot` and a pluggable `SnapshotStore` (`MemorySnapshotStore` included) for persisting context across sessions.
- **Resilience** — `withRetry` (exponential backoff + jitter) and `FallbackAdapter` (try a chain of providers, fail over transparently).
- **Knowledge graph** — `KnowledgeGraph` of nodes + typed edges with optional bi-temporal validity (`addNode`/`addEdge`/`neighbors`/`renderGraph`), plus temporal reasoning (`queryValidRelations`/`invalidateEdge`/`supersede`). Carried inside `ContextSnapshot` and rendered into the prompt.
- **Provenance & auditing** — `annotateProvenance` (why context was included) and `diffSnapshots` (what changed between runs).

## Example

```ts
import { LosiContext } from "@losi/core";
import { OpenAIAdapter } from "@losi/openai";

const ctx = new LosiContext({
  adapter: new OpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY! }),
  memory: { crm: true, bookings: true },
  governance: { spendCapUsd: 5, rateLimitPerMinute: 60 },
});

const res = await ctx.complete("What's on my plate today?");
console.log(res.content);
```

## Remember & recall

High-level memory verbs (familiar from Mem0/Cognee), backed by the same
portable snapshot — so what you remember persists across sessions **and** model
switches:

```ts
await ctx.remember("Acme Corp signed a 2-year contract in Q3.", { scope: "crm" });
await ctx.remember("The user prefers concise answers.");

const context = await ctx.recall("What do I know about Acme?");
// → rendered context (sections + relationships) ready to inject
```

`remember()` persists automatically when a `SnapshotStore` is configured;
`recall()` refreshes from bindings and returns the injectable context.

Zero runtime dependencies. MIT licensed.
