# Roadmap

Losi Context Bank ships in phases. The through-line: make business context portable, persistent, and governable across every model.

## Phase 1 — Foundation (shipped)

- ✅ `@losi/core`: `LLMAdapter` contract, `LosiContext`, snapshots, memory + governance config
- ✅ Provider adapters: `@losi/openai`, `@losi/anthropic`, `@losi/gemini`, `@losi/mistral`, `@losi/cohere`, `@losi/groq`, `@losi/ollama` (local)
- ✅ `@losi/mcp` client with per-tool data access scopes
- ✅ `@losi/skills` runner and `@losi/governance` policy engine
- ✅ `@losi/react` provider + hooks
- ✅ Retry / backoff (`withRetry`) and provider fallback chains (`FallbackAdapter`)
- ✅ Snapshot serialization (`serializeSnapshot` / `deserializeSnapshot`) + pluggable `SnapshotStore` (`MemorySnapshotStore`, bring-your-own disk/KV/Redis)
- ✅ `@losi/nexus` and `@losi/spaces` bindings with local data providers (offline-capable) and a hosted-platform path
- ✅ Published to npm under the `@losi` scope

## Phase 2 — Deeper model features (Oct 2026)

- Streaming tool-call assembly across all adapters
- Token-accurate cost estimation feeding governance spend caps automatically
- Built-in disk and Redis `SnapshotStore` implementations
- Structured output / JSON-mode helpers shared across adapters
- More adapters as the community requests them

## Phase 3 — Governance, MCP scopes & audit (Nov 2026)

- Centrally-managed governance policies synced from the Losi platform
- Full MCP scope enforcement against workspace policies
- Durable, queryable audit log with export
- Policy simulation / dry-run mode
- Fine-grained data-scope redaction inside snapshots

## Phase 4 — Cross-org context & private deployment (Q1 2027)

- Cross-organization context sharing with consent boundaries
- Private / self-hosted deployment of the context + governance backend
- Live hosted `@losi/nexus` and `@losi/spaces` data at GA
- Team + workspace memory graduated to Live
- Enterprise SSO, RBAC, and compliance tooling

Dates are targets, not commitments. Have a request? Open an adapter or feature issue.
