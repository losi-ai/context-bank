# Package Map

Every `@losi/*` package. All MIT-licensed, ESM + CJS + type declarations.

## Core & framework

| Package | What it is | Key exports |
| --- | --- | --- |
| `@losi/core` | The engine. Zero runtime deps. | `LosiContext`, `LLMAdapter`, `ContextSnapshot`, `renderSnapshot`, `KnowledgeGraph` (+`addNode`/`addEdge`/`neighbors`/`isEdgeValidAt`/`renderGraph`/`queryValidRelations`/`invalidateEdge`/`supersede`), `serializeSnapshot`/`SnapshotStore`/`MemorySnapshotStore`, `withRetry`/`FallbackAdapter`, `GovernanceEngine`, `annotateProvenance`/`diffSnapshots`, `ContextBinding` |
| `@losi/mcp` | MCP client with per-tool data scopes | `MCPClient`, `MCPRegistry`, `PolicyHook` |
| `@losi/skills` | Multi-step agent skills | `SkillRunner`, `defineSkill`, `interpolate` |
| `@losi/governance` | Multi-agent policy + audit | `PolicyManager`, `AuditSink`, `LosiAuditSink` |
| `@losi/react` | React provider + hooks | `LosiProvider`, `useLosiContext/Complete/Memory/Governance` |

## Model adapters

| Package | Provider | Default model |
| --- | --- | --- |
| `@losi/openai` | OpenAI | `gpt-5.6-sol` |
| `@losi/anthropic` | Anthropic | `claude-sonnet-5` |
| `@losi/gemini` | Google Gemini | `gemini-3.8-flash` |
| `@losi/mistral` | Mistral | `mistral-large-latest` |
| `@losi/cohere` | Cohere | `command-a-plus-05-2026` |
| `@losi/groq` | Groq | `openai/gpt-oss-120b` |
| `@losi/ollama` | Ollama (local) | `llama3.2` |

## Context bindings

| Package | What it binds |
| --- | --- |
| `@losi/nexus` | CRM contacts, companies, bookings, conversations (+ `works_at`/`booked` relations) |
| `@losi/spaces` | Tasks, notes, events, sheets (+ `assigned_to` relations) |

## Dependency rules

- `@losi/core` has **zero runtime dependencies**.
- Adapters depend only on their provider SDK + `@losi/core` (peer).
- No circular dependencies between packages.
