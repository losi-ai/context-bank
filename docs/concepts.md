# Concepts

Losi Context Bank has a small mental model. Six pieces, one idea: **context
belongs to the platform, not the model.**

## Adapter (`LLMAdapter`)

A thin translator between the portable Losi format and a provider's API. Every
model — OpenAI, Anthropic, Gemini, Mistral, Cohere, Groq, Ollama — implements
the same `LLMAdapter` interface (`complete`, optional `stream`). Because they
share one interface, `ctx.switchAdapter(...)` swaps models in one line.

## Context snapshot (`ContextSnapshot`)

The resolved context payload: a set of `sections` (flat text) plus an optional
`graph` (relations). This is the unit that **persists** across model switches
and sessions. `renderSnapshot()` turns it into a system prompt.

## Binding (`ContextBinding`)

A source of business context. `@losi/nexus` (CRM/bookings) and `@losi/spaces`
(tasks/notes/events) implement it. A binding's `resolve()` returns sections;
its optional `resolveGraph()` returns relationships. Bindings work from a
**local data provider** (offline) or the **hosted Losi platform**.

## Knowledge graph (`KnowledgeGraph`)

Nodes (entities) + typed, directed edges (relationships), each edge optionally
carrying **bi-temporal validity** (`validAt` / `invalidAt`). This is what makes
Losi context *relational* — "Ada —booked→ Demo" — instead of a flat list. See
[Knowledge graph](./guides/knowledge-graph.md).

## Governance (`GovernanceEngine`, `@losi/governance`)

Every context read and model call is governable: spend caps, rate limits,
blocked actions, allowed data scopes, a kill switch, and an audit log. It is
built into the architecture, not bolted on.

## Orchestrator (`LosiContext`)

Ties it together: holds the memory + governance config, the bindings, and the
active adapter. `complete()` / `stream()` refresh context from bindings, apply
governance, inject the snapshot, and call the model. `switchAdapter()` swaps
the model while keeping the snapshot.

## The data flow

```
prompt
  → bindings.resolve() + resolveGraph()      (gather sections + relations)
  → governance.enforce()                     (allowed? spend/rate/scope)
  → renderSnapshot()                          (sections + "## Relationships")
  → adapter.complete()                        (the model call)
```

Switch the adapter at any point; everything to the left is unchanged.

## How this differs from the field

- **vs vector/RAG memory** — RAG returns the most *similar* fact, which is often
  the *stale* one. A graph with temporal validity returns the fact that is
  *currently true*. See [Temporal reasoning](./guides/temporal-reasoning.md).
- **vs chat-derived graphs (Zep, Cognee)** — they infer a graph from
  conversation logs. Losi's graph comes **top-down from real business objects**
  (CRM, bookings, workspace), so the relations are ground truth, not guesses.
- **vs orchestration (LangChain/LangGraph)** — they orchestrate model calls;
  Losi persists and governs the context across them. Use both.
