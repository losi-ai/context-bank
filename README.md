# Losi Context Bank

**Context infrastructure for LLMs. Switch models freely. Your context stays.**

Day one: keep a snapshot of what the model knows, swap GPT ↔ Claude ↔ Gemini, and nothing resets. Everything else (CRM, graph, skills, governance) is opt-in.

```bash
npm  install @losi-ai/core @losi-ai/openai @losi-ai/ollama
yarn add     @losi-ai/core @losi-ai/openai @losi-ai/ollama
pnpm add     @losi-ai/core @losi-ai/openai @losi-ai/ollama
bun  add     @losi-ai/core @losi-ai/openai @losi-ai/ollama
```

Published to **npmjs.org** (one registry → every package manager). Optional GitHub
Packages mirror: see [docs/publishing.md](docs/publishing.md).

## Free vs hosted (honest)

| | No Losi account | Workspace-scoped `LOSI_API_KEY` |
| --- | --- | --- |
| Adapters + `LosiContext` + snapshots | ✅ | ✅ |
| Local / your own `SnapshotStore` | ✅ | ✅ |
| Live CRM / Spaces / graph from Losi | ❌ | ✅ |
| Save/run skills on Losi (`workspace_skills`) | ❌ | ✅ |
| Governance audit ingest | local only | ✅ hosted sink |

Prefer a **workspace-scoped** API key — pick the workspace when you create the
key. After that, **never pass `workspaceId` again**. MCP and Context Bank imply
it from the key (`GET /session`, `/graph`, `/spaces/*`, `/nexus/*`, `/skills`).
See [Hosted](docs/hosted.md).

## 30-second example

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

ctx.switchAdapter(new AnthropicAdapter({ apiKey: process.env.ANTHROPIC_API_KEY! }));
const b = await ctx.complete("Say that again even shorter.");
// Snapshot (and remember()) survived the switch.
```

That's the whole day-1 idea: **context belongs to you, not the model.**

## Try the demos (real models)

```bash
npm install
export OPENAI_API_KEY=sk-...   # or ANTHROPIC_API_KEY / GEMINI_API_KEY, or `ollama run llama3.2`
npm run demos
```

- **Model Switcher** — GPT → Claude → Gemini, same context.
- **Onboarding** — restore a snapshot on a fresh session.
- **Switching Cost** — CRM + bookings as a knowledge graph (needs bindings / hosted data).

See [examples/](examples/README.md).

## Going further (opt-in)

Don't start here. When you need them:

- **Live Losi data** — [`@losi-ai/nexus`](packages/nexus) (CRM) and [`@losi-ai/spaces`](packages/spaces) (tasks/notes). Same data as the Losi app when an API key is attached.
- **Knowledge graph** — Losi's real graph via hosted `/graph`, or a local portable graph in `@losi-ai/core`. Guide: [knowledge-graph.md](docs/guides/knowledge-graph.md).
- **Skills (executable procedures)** — `@losi-ai/skills` saves/runs multi-step tool workflows into Losi `workspace_skills`. (GitHub `SKILL.md` installs in the Losi app are a different surface: Integrations → Install skill.)
- **Governance** — `@losi-ai/governance` spend caps, scopes, kill switch, audit.

📚 **Docs: [docs/](docs/README.md)**

## Packages

**Start here**

| Package | Description | Status |
| --- | --- | --- |
| [`@losi-ai/core`](packages/core) | `LosiContext`, adapters contract, snapshots, storage | 🟢 Live |
| [`@losi-ai/openai`](packages/openai) / [`anthropic`](packages/anthropic) / … | Model adapters (same `LLMAdapter` interface) | 🟢 Live |
| [`@losi-ai/ollama`](packages/ollama) | Local models, no cloud key | 🟢 Live |

**When you need them**

| Package | Description | Status |
| --- | --- | --- |
| [`@losi-ai/nexus`](packages/nexus) | CRM / bookings context | 🟢 Live |
| [`@losi-ai/spaces`](packages/spaces) | Tasks / notes / calendar context | 🟢 Live |
| [`@losi-ai/skills`](packages/skills) | Save/run multi-step procedures | 🟢 Live |
| [`@losi-ai/governance`](packages/governance) | Policy + audit | 🟢 Live |
| [`@losi-ai/mcp`](packages/mcp) | MCP client with data scopes | 🟢 Live |
| [`@losi-ai/react`](packages/react) | React hooks | 🟢 Live |

**Adapter defaults** (override with `model:` anytime):

| Package | Default model |
| --- | --- |
| `@losi-ai/openai` | `gpt-5.6-sol` |
| `@losi-ai/anthropic` | `claude-sonnet-5` |
| `@losi-ai/gemini` | `gemini-3.8-flash` |
| `@losi-ai/mistral` | `mistral-large-latest` |
| `@losi-ai/cohere` | `command-a-plus-05-2026` |
| `@losi-ai/groq` | `openai/gpt-oss-120b` |
| `@losi-ai/ollama` | `llama3.2` |

🟢 Live · 🟡 Preview · 🔴 Coming soon

## Never go down: retry + provider fallback

```ts
import { LosiContext, FallbackAdapter } from "@losi-ai/core";
import { OpenAIAdapter } from "@losi-ai/openai";
import { AnthropicAdapter } from "@losi-ai/anthropic";
import { GroqAdapter } from "@losi-ai/groq";

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
import { LosiContext, MemorySnapshotStore, serializeSnapshot } from "@losi-ai/core";

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
import { PolicyManager } from "@losi-ai/governance";

const gov = new PolicyManager();
gov.setPolicy("support-bot", { spendCapUsd: 10, rateLimitPerMinute: 30, blockedActions: ["delete"] });

const decision = gov.enforce({ agentId: "support-bot", type: "complete", costUsd: 0.02 });
if (!decision.allowed) throw new Error(decision.reason);

gov.kill("support-bot"); // emergency stop — every future action is denied
```

## MCP with data scopes

```ts
import { MCPClient } from "@losi-ai/mcp";

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

LangChain **orchestrates** model calls. Context Bank **persists** a portable
snapshot across them. Complementary, not a replacement.

|  | LangChain | Losi Context Bank |
| --- | --- | --- |
| Orchestration / chains | ✅ | Bring your own |
| Model switching keeps context | ❌ | ✅ (free SDK) |
| Snapshot / `remember()` persistence | DIY | ✅ (free SDK) |
| Live CRM / Spaces / graph | DIY | Optional hosted (`LOSI_API_KEY`) |
| Per-agent governance + audit | DIY | ✅ (local; hosted audit sink) |
| MCP tools with data scopes | Partial | ✅ |

## Hosted platform

The SDK is MIT. Live CRM, Spaces, graph, and skill persistence run on **[losi.ai](https://losi.ai)** behind a workspace-scoped API key.

- **Free SDK** — adapters, snapshots, local stores — everything in this repo without an account.
- **Hosted** — same Losi workspace data the product uses; see [docs/hosted.md](docs/hosted.md).
- **Enterprise** — private deployment. [Talk to us](https://losi.ai).

## Roadmap

See [ROADMAP.md](ROADMAP.md). Short version: adapters + core now → full streaming + implementations → governance + MCP scopes + audit → cross-org context + private deployment.

## Contributing

New adapters and context bindings are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) — adding an adapter is one interface (`LLMAdapter`) and a few methods.

## License

[MIT](LICENSE) © Marshmallow Studio
