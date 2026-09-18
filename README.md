# Losi Context Bank

**Context infrastructure for LLMs. Switch models freely. Your context stays.**

Every LLM vendor wants to own your context. Losi Context Bank keeps it yours — portable, persistent, and governable across GPT, Claude, Gemini, and any model you plug in.

```bash
npm install @losi/core @losi/openai @losi/anthropic
```

## 30-second example

Give a model your business context, then swap the model without losing any of it:

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

// Switch to Claude. The context snapshot persists — nothing is re-fetched or lost.
ctx.switchAdapter(new AnthropicAdapter({ apiKey: process.env.ANTHROPIC_API_KEY! }));
const b = await ctx.complete("Summarize those same meetings in one line.");

console.log(ctx.provider); // "anthropic" — but the context never changed.
```

That's the whole idea: **context belongs to the platform, not the model.**

## Try the demos (real models)

Three runnable demos prove the promise against **real models** through the real
adapters — no mocks. Provide a cloud key or run Ollama locally (keyless):

```bash
npm install
export OPENAI_API_KEY=sk-...   # or ANTHROPIC_API_KEY / GEMINI_API_KEY, or `ollama run llama3.2`
npm run demos
```

- **Model Switcher** — GPT → Claude → Gemini, all pull the same context.
- **Onboarding** — a fresh session (even a different model) restores full context on day one.
- **Switching Cost** — CRM + bookings survive a model/tool switch as a knowledge graph.

Each demo preflights the model and tells you exactly how to configure one if
none is reachable. See [examples/](examples/README.md).

## Relationships, not just facts

Losi context is a **knowledge graph** — entities and the typed relationships
between them, with optional bi-temporal validity — not a flat list. The model
sees `Ada Lovelace —booked→ Demo call`, and stale relationships are filtered
out by time.

```ts
import { createGraph, addNode, addEdge, supersede, queryValidRelations } from "@losi/core";

const g = createGraph();
addNode(g, { id: "u", type: "user", label: "User" });
addNode(g, { id: "adidas", type: "brand", label: "Adidas" });
addNode(g, { id: "puma", type: "brand", label: "Puma" });
addEdge(g, { from: "u", to: "adidas", type: "prefers", validAt: "2026-01-01T00:00:00Z" });

// Preference changed — supersede instead of overwrite. History stays queryable.
supersede(g, { from: "u", to: "adidas", type: "prefers" },
             { from: "u", to: "puma", type: "prefers" }, "2026-06-01T00:00:00Z");

queryValidRelations(g, "2026-09-01T00:00:00Z"); // prefers Puma (current)
queryValidRelations(g, "2026-02-01T00:00:00Z"); // prefers Adidas (historical)
```

Unlike memory tools that infer a graph from chat logs, Losi builds it
**top-down from real business objects** (CRM, bookings, workspace) — so the
relations are ground truth. Full guide: [docs/guides/knowledge-graph.md](docs/guides/knowledge-graph.md).

## Why this exists

LLM APIs are stateless. Every vendor's "memory" feature locks your context inside their product — switch models and you start from zero. That's fine for a chatbot demo. It's a dead end for real software that needs durable business context: your CRM, your bookings, your workspace, your team's knowledge.

Losi Context Bank makes context a first-class, portable layer:

- **Persistent** — snapshots survive across sessions and model switches.
- **Portable** — one context, any model. Adapters are thin translators.
- **Relational** — a real knowledge graph with bi-temporal validity, not flat facts.
- **Governable** — spend caps, rate limits, blocked actions, data scopes, kill switch, audit log — built into the architecture, not bolted on.
- **Auditable** — provenance on every section + snapshot diffing. Know why context was included and what changed.
- **Business-aware** — bind live CRM, bookings, and workspace data straight into prompts.

📚 **Full documentation: [docs/](docs/README.md)** — quickstart, concepts, and guides for every package and feature.

## Packages

**Core & framework**

| Package | Description | Status |
| --- | --- | --- |
| [`@losi/core`](packages/core) | Context engine, `LLMAdapter` contract, snapshots, storage, resilience, memory + governance config | 🟢 Live |
| [`@losi/mcp`](packages/mcp) | MCP client with per-tool data access scopes | 🟢 Live |
| [`@losi/skills`](packages/skills) | Define, install, and run reusable multi-step agent skills | 🟢 Live |
| [`@losi/governance`](packages/governance) | Per-agent policy engine, audit log, kill switch | 🟢 Live |
| [`@losi/react`](packages/react) | React provider + hooks for embedding Losi context | 🟢 Live |

**Model adapters** — every one implements the same `LLMAdapter` contract, so switching is a one-liner:

| Package | Provider | Default model | Status |
| --- | --- | --- | --- |
| [`@losi/openai`](packages/openai) | OpenAI (GPT) | `gpt-4o` | 🟢 Live |
| [`@losi/anthropic`](packages/anthropic) | Anthropic (Claude) | `claude-sonnet-4-20250514` | 🟢 Live |
| [`@losi/gemini`](packages/gemini) | Google Gemini | `gemini-1.5-pro` | 🟢 Live |
| [`@losi/mistral`](packages/mistral) | Mistral AI | `mistral-large-latest` | 🟢 Live |
| [`@losi/cohere`](packages/cohere) | Cohere | `command-r-plus` | 🟢 Live |
| [`@losi/groq`](packages/groq) | Groq | `llama-3.3-70b-versatile` | 🟢 Live |
| [`@losi/ollama`](packages/ollama) | Ollama (local, no key) | `llama3.2` | 🟢 Live |

**Context bindings** — inject live business data. Use a local data provider (offline) or connect a hosted [Losi](https://losi.ai) workspace:

| Package | Description | Status |
| --- | --- | --- |
| [`@losi/nexus`](packages/nexus) | CRM, bookings, and conversation context | 🟢 Live |
| [`@losi/spaces`](packages/spaces) | Tasks, notes, sheets, and calendar context | 🟢 Live |

🟢 Live · 🟡 Preview · 🔴 Coming soon

## Never go down: retry + provider fallback

```ts
import { LosiContext, FallbackAdapter } from "@losi/core";
import { OpenAIAdapter } from "@losi/openai";
import { AnthropicAdapter } from "@losi/anthropic";
import { GroqAdapter } from "@losi/groq";

// Retries each provider, then fails over to the next — transparently.
const adapter = new FallbackAdapter(
  [
    new OpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY! }),
    new AnthropicAdapter({ apiKey: process.env.ANTHROPIC_API_KEY! }),
    new GroqAdapter({ apiKey: process.env.GROQ_API_KEY! }),
  ],
  { retry: { maxAttempts: 3 } },
);

const ctx = new LosiContext({ adapter });
```

## Persist context across sessions

```ts
import { LosiContext, MemorySnapshotStore, serializeSnapshot } from "@losi/core";

const store = new MemorySnapshotStore(); // or your own disk/Redis SnapshotStore
const ctx = new LosiContext({ adapter, store, persistKey: "user-42" });

await ctx.complete("Remember I prefer concise answers.");
await ctx.persist();          // save the snapshot
// ...later, new process...
await ctx.restore();          // context is back, no re-fetch

const portable = serializeSnapshot(ctx.getSnapshot()); // send it anywhere
```

## Governance in one snippet

```ts
import { PolicyManager } from "@losi/governance";

const gov = new PolicyManager();
gov.setPolicy("support-bot", { spendCapUsd: 10, rateLimitPerMinute: 30, blockedActions: ["delete"] });

const decision = gov.enforce({ agentId: "support-bot", type: "complete", costUsd: 0.02 });
if (!decision.allowed) throw new Error(decision.reason);

gov.kill("support-bot"); // emergency stop — every future action is denied
```

## MCP with data scopes

```ts
import { MCPClient } from "@losi/mcp";

const github = new MCPClient({
  name: "github",
  serverUrl: "https://mcp.example.com/rpc",
  accessScopes: ["workspace"],   // what this tool CAN see
  blockedScopes: ["crm"],        // what it CANNOT — enforced before every call
});

const tools = await github.listTools();          // scope-filtered
await github.callTool("create_issue", { title: "Bug" });
```

## vs LangChain

LangChain **orchestrates** model calls — chains, agents, and tool routing. Losi Context Bank **persists** business context across them.

|  | LangChain | Losi Context Bank |
| --- | --- | --- |
| Orchestration / chains | ✅ | Bring your own |
| Model switching keeps context | ❌ | ✅ |
| Persistent business context | ❌ | ✅ |
| Built-in CRM / bookings | ❌ | ✅ (via Nexus) |
| Built-in workspace (tasks/notes/sheets) | ❌ | ✅ (via Spaces) |
| Per-agent governance + audit | ❌ | ✅ |
| MCP tools with data scopes | Partial | ✅ |

They're complementary: orchestrate with LangChain, persist and govern context with Losi.

## Hosted platform

The SDK is free and MIT licensed. Full context persistence, the governance UI, Nexus CRM, bookings, voice agents, and Spaces live on the hosted platform at **[losi.ai](https://losi.ai)**.

- **Free SDK** — everything in this repo.
- **Hosted** — connect an API key + workspace id and the `@losi/nexus` / `@losi/spaces` bindings pull live data.
- **Enterprise** — self-hosted and private deployment available. [Talk to us](https://losi.ai).

## Roadmap

See [ROADMAP.md](ROADMAP.md). Short version: adapters + core now → full streaming + implementations → governance + MCP scopes + audit → cross-org context + private deployment.

## Contributing

New adapters and context bindings are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) — adding an adapter is one interface (`LLMAdapter`) and a few methods.

## License

[MIT](LICENSE) © Marshmallow Studio
