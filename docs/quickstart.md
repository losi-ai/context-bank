# Quickstart

## Install

```bash
npm install @losi/core @losi/openai @losi/anthropic
```

## 1. One context, any model

```ts
import { LosiContext } from "@losi/core";
import { OpenAIAdapter } from "@losi/openai";
import { AnthropicAdapter } from "@losi/anthropic";

const ctx = new LosiContext({
  adapter: new OpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY! }),
  memory: { crm: true, bookings: true },
});

// Ask GPT-4o — context is injected automatically.
const a = await ctx.complete("What meetings do I have tomorrow?");

// Switch to Claude. The context snapshot persists — nothing is re-fetched.
ctx.switchAdapter(new AnthropicAdapter({ apiKey: process.env.ANTHROPIC_API_KEY! }));
const b = await ctx.complete("Summarize those same meetings in one line.");
```

## 2. Add real business relations (the knowledge graph)

```ts
import { LosiContext } from "@losi/core";
import { OpenAIAdapter } from "@losi/openai";
import { NexusBinding } from "@losi/nexus";

const nexus = new NexusBinding({
  crm: true,
  bookings: true,
  data: {
    contacts: [{ id: "1", name: "Ada Lovelace", company: "Analytical Engines" }],
    bookings: [{ id: "9", title: "Demo", startsAt: "2026-09-20T14:00", with: "Ada Lovelace" }],
  },
});

const ctx = new LosiContext({
  adapter: new OpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY! }),
  bindings: [nexus],
});

// The model receives a "## Relationships" block:
//   - Ada Lovelace —works_at→ Analytical Engines
//   - Ada Lovelace —booked→ Demo
await ctx.complete("Who am I meeting and where do they work?");
```

## 3. Never go down (fallback + retry)

```ts
import { FallbackAdapter } from "@losi/core";
import { OpenAIAdapter } from "@losi/openai";
import { GroqAdapter } from "@losi/groq";

const adapter = new FallbackAdapter(
  [new OpenAIAdapter({ apiKey: a }), new GroqAdapter({ apiKey: b })],
  { retry: { maxAttempts: 3 } },
);
const ctx = new LosiContext({ adapter });
```

## 4. Govern it

```ts
import { PolicyManager } from "@losi/governance";

const gov = new PolicyManager();
gov.setPolicy("support-bot", { spendCapUsd: 10, rateLimitPerMinute: 30, blockedActions: ["delete"] });
const decision = gov.enforce({ agentId: "support-bot", type: "complete", costUsd: 0.02 });
if (!decision.allowed) throw new Error(decision.reason);
```

Next: [Concepts](./concepts.md) · [Knowledge graph](./guides/knowledge-graph.md)
