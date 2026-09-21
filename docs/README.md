# Losi Context Bank — Documentation

Portable model-switch context. Losi workspace data is optional.

Day 1 (no account): adapters, snapshots, `remember()`, local stores.
Hosted (workspace API key): **your** Losi CRM, Spaces, graph, and skills —
same data as the product, not a parallel invention.

## Start here

- [Quickstart](./quickstart.md) — snapshot + switch models in minutes.
- [Connect any LLM](./connect.md) — MCP, REST API, installable skill, copy-paste prompt (no SDK required).
- [Concepts](./concepts.md) — adapters, snapshots, bindings, governance.
- [Hosted platform](./hosted.md) — free vs live workspace data.

## Guides

- [Adapters](./guides/adapters.md) — OpenAI, Anthropic, Gemini, Mistral,
  Cohere, Groq, Ollama, and writing your own.
- [Persistence & storage](./guides/persistence.md) — serialize snapshots, plug
  in a store.
- [Resilience](./guides/resilience.md) — retry, backoff, and provider fallback.
- [Bindings: Nexus & Spaces](./guides/bindings.md) — live business context,
  local or hosted.
- [Knowledge graph & relations](./guides/knowledge-graph.md) — local portable
  type vs hosted Losi graph (same shape).
- [Temporal reasoning](./guides/temporal-reasoning.md) — fact invalidation and
  supersession.
- [Provenance & auditing](./guides/provenance.md) — why context was included,
  and diffing snapshots.
- [Governance](./guides/governance.md) — spend caps, rate limits, scopes,
  kill switch, audit.
- [MCP tools](./guides/mcp.md) — connect MCP servers with per-tool data scopes.
- [Skills](./guides/skills.md) — reusable multi-step agent processes
  (`workspace_skills`; not GitHub `SKILL.md` installs).
- [React](./guides/react.md) — provider + hooks for web apps.

## Reference

- [Package map](./packages.md) — every `@losi-ai/*` package at a glance.
- [Publishing](./publishing.md) — npmjs + GitHub Packages; npm/yarn/pnpm/bun install.
- [Hosted platform](./hosted.md) — connecting to a Losi workspace for live data.
- [Changelog](../CHANGELOG.md) · [Roadmap](../ROADMAP.md) · [Contributing](../CONTRIBUTING.md)
