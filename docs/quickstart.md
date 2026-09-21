# Quickstart

**Day 1 = portable snapshots + model switching.** Live CRM / Spaces / graph
need a workspace API key — optional. See [Hosted](./hosted.md).

## Install

```bash
npm install @losi-ai/core @losi-ai/openai @losi-ai/anthropic
```

## 1. One context, any model

```ts
import { LosiContext, MemorySnapshotStore } from "@losi-ai/core";
import { OpenAIAdapter } from "@losi-ai/openai";
import { AnthropicAdapter } from "@losi-ai/anthropic";

const ctx = new LosiContext({
  adapter: new OpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY! }),
  store: new MemorySnapshotStore(),
  persistKey: "demo",
});

await ctx.remember("User prefers short answers.");
const a = await ctx.complete("Draft a one-line status update.");

// Switch models — the snapshot (and remember()) stays.
ctx.switchAdapter(new AnthropicAdapter({ apiKey: process.env.ANTHROPIC_API_KEY! }));
const b = await ctx.complete("Say that again even shorter.");
```

`remember()` appends facts into the snapshot. It is **not** a Mem0-style
embed/search engine — just durable context you control.

## 2. Never go down (fallback + retry)

```ts
import { FallbackAdapter } from "@losi-ai/core";
import { OpenAIAdapter } from "@losi-ai/openai";
import { GroqAdapter } from "@losi-ai/groq";

const adapter = new FallbackAdapter(
  [new OpenAIAdapter({ apiKey: a }), new GroqAdapter({ apiKey: b })],
  { retry: { maxAttempts: 3 } },
);
const ctx = new LosiContext({ adapter });
```

## 3. Optional: live Losi data (hosted)

With a workspace-scoped `LOSI_API_KEY`, bindings pull **your** CRM / Spaces rows
(same data as the Losi app). Without a key, pass a local `data:` provider for
demos — see [Bindings](./guides/bindings.md).

```ts
import { LosiContext } from "@losi-ai/core";
import { OpenAIAdapter } from "@losi-ai/openai";
import { NexusBinding } from "@losi-ai/nexus";

const nexus = new NexusBinding({
  apiKey: process.env.LOSI_API_KEY!, // workspace implied by the key
  crm: true,
  bookings: true,
});

const ctx = new LosiContext({
  adapter: new OpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY! }),
  bindings: [nexus],
});

await ctx.complete("What meetings do I have tomorrow?");
```

## 4. Optional: knowledge graph

Same `KnowledgeGraph` shape offline or hosted — different source. Full guide:
[Knowledge graph](./guides/knowledge-graph.md).

## 5. Optional: govern it

```ts
import { PolicyManager } from "@losi-ai/governance";

const gov = new PolicyManager();
gov.setPolicy("support-bot", { spendCapUsd: 10, rateLimitPerMinute: 30, blockedActions: ["delete"] });
const decision = gov.enforce({ agentId: "support-bot", type: "complete", costUsd: 0.02 });
if (!decision.allowed) throw new Error(decision.reason);
```

Next: [Concepts](./concepts.md) · [Hosted](./hosted.md)
