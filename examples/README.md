# Losi Context Bank — Demos

Runnable proof of the core promise: **switch models freely, your context stays.**
All three demos call **real models** through the real `@losi/*` adapters — no
mocks. Provide a cloud key, or run Ollama locally as a keyless real-model
fallback.

## Set up a model

Provide any of these (the demos use whichever is available):

```bash
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
export GEMINI_API_KEY=...
```

…or run a local model with **no key** (https://ollama.com):

```bash
ollama run llama3.2      # then the demos use it automatically
```

## Run

```bash
# from the repo root
npm install
npm run demos        # builds packages, runs all three against real models

# or individually
npm run demo:switch          -w @losi/examples
npm run demo:onboarding      -w @losi/examples
npm run demo:switching-cost  -w @losi/examples
```

Each demo runs a **preflight** call first: if no model is reachable it prints
exactly how to fix it (set a key or start Ollama) instead of failing cryptically.

## The three demos

### 1. The Model Switcher — [`model-switcher.ts`](./model-switcher.ts)
> "I use GPT for writing, Claude for code, and Gemini for research. All three
> know exactly who I am — because they pull context from the same place."

Asks the same question to GPT → Claude → Gemini (real calls) through one
`LosiContext`. The load-bearing proof is that the **same context snapshot
object** is fed to every model across each `switchAdapter()`; the real answers
show each model is grounded in it.

### 2. The Onboarding Shortcut — [`onboarding.ts`](./onboarding.ts)
> "My new hire knew our roadmap, decisions, and top customers on day one."

Persists a workspace snapshot in one session, then a **fresh** context (a new
hire on a real model) restores it via `SnapshotStore` and answers a day-one
briefing. The restore round-trips through `serializeSnapshot` /
`deserializeSnapshot` — real persistence, not a shared in-memory variable.

### 3. The Switching Cost Eliminator — [`switching-cost.ts`](./switching-cost.ts)
> "We switched tools and didn't lose a single customer relationship."

Binds CRM + bookings via `@losi/nexus`, then switches models. The resolved
knowledge graph (`contact —booked→ appointment`, `contact —works_at→ company`)
is bound into every model's prompt and verified after the switch.

## Live CRM/booking data

The switching-cost demo uses a local data provider so it runs without a hosted
account. For **live** data, pass `{ apiKey, workspaceId }` to `NexusBinding`
instead of `{ data }` — see [../docs/hosted.md](../docs/hosted.md).
