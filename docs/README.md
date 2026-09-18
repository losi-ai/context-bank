# Losi Context Bank — Documentation

Context infrastructure for LLMs. Switch models freely; your context stays.

Losi Context Bank is an open-source (MIT) TypeScript SDK that gives any LLM
**persistent, portable, governable business context** — CRM, bookings,
workspace, and a real **knowledge graph** of the relationships between them —
and keeps that context intact when you switch models.

## Start here

- [Quickstart](./quickstart.md) — running in 5 lines.
- [Concepts](./concepts.md) — the mental model: adapters, snapshots, bindings,
  governance, graph.

## Guides

- [Adapters](./guides/adapters.md) — OpenAI, Anthropic, Gemini, Mistral,
  Cohere, Groq, Ollama, and writing your own.
- [Knowledge graph & relations](./guides/knowledge-graph.md) — nodes, typed
  edges, and bi-temporal validity.
- [Temporal reasoning](./guides/temporal-reasoning.md) — fact invalidation and
  supersession (the "preference changed" problem).
- [Provenance & auditing](./guides/provenance.md) — why context was included,
  and diffing snapshots.
- [Persistence & storage](./guides/persistence.md) — serialize snapshots, plug
  in a store.
- [Resilience](./guides/resilience.md) — retry, backoff, and provider fallback.
- [Governance](./guides/governance.md) — spend caps, rate limits, scopes,
  kill switch, audit.
- [MCP tools](./guides/mcp.md) — connect MCP servers with per-tool data scopes.
- [Skills](./guides/skills.md) — reusable multi-step agent processes.
- [React](./guides/react.md) — provider + hooks for web apps.
- [Bindings: Nexus & Spaces](./guides/bindings.md) — live business context,
  local or hosted.

## Reference

- [Package map](./packages.md) — every `@losi/*` package at a glance.
- [Hosted platform](./hosted.md) — connecting to a Losi workspace for live data.

## Why this exists

Every LLM vendor wants to own your context. Losi Context Bank keeps it yours —
portable across GPT, Claude, Gemini, and local models, persistent across
sessions, and expressed as a **graph of real business relationships**, not a
pile of chat-derived facts. See [Concepts](./concepts.md).

License: MIT.
