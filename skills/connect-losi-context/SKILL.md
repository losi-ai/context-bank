---
name: connect-losi-context
description: >-
  Connect any LLM or agent to the user's Losi workspace context (CRM, Spaces
  tasks/notes, knowledge graph, skills, soul, memories) via Losi MCP or the
  Context Bank REST API. Use when the user wants Losi context in Claude, Cursor,
  ChatGPT, Codex, or another tool without writing SDK code. Prefer vault/env for
  the API key — never ask them to paste losi-… into chat.
---

# Connect Losi Context

Give the current agent access to the user's **real Losi workspace** (same data
as losi.ai): Spaces, Nexus CRM, knowledge graph, skills, soul/identity, and
memories.

## Prerequisites

1. **Losi is free to get started** — sign up at [losi.ai](https://losi.ai) if needed.
2. A **workspace-scoped** API key from Profile → API Access (format `losi-…`).
   The workspace is implied by the key — do **not** ask for a workspace ID unless
   the API returns an error saying the key is user-scoped.
3. Prefer **MCP** when the host supports it. Fall back to **REST** when MCP is
   unavailable.

## Secrets — vault first

**Never ask the user to paste an API key into the chat.**

Resolve the key in this order:

1. Host **vault / credential store / secret picker** (Cursor Private vault,
   Claude secrets, IDE secret manager, etc.)
2. Process environment: `LOSI_API_KEY`
3. Existing MCP server config that already injects the header
4. Only then: tell the user how to **set** the secret in settings / `.env` /
   keychain — still without pasting it into the transcript

Never print, log, or commit the full key.

## Preferred: Losi MCP

**Endpoint:** `https://losi.ai/api/mcp`  
(also `https://www.losi.one/api/mcp`)

**Auth:** `Authorization: Bearer` + value from vault/env (`LOSI_API_KEY`).

### Cursor / Claude Desktop style config

Use env substitution — do not hard-code the secret in files you paste into chat:

```json
{
  "mcpServers": {
    "losi": {
      "url": "https://losi.ai/api/mcp",
      "headers": {
        "Authorization": "Bearer ${LOSI_API_KEY}"
      }
    }
  }
}
```

After connecting, call `tools/list`. Typical families (permission-dependent):

- `losiSpaces__*` — Spaces + Space memories
- `losiNexus__run` — Nexus CRM (needs Nexus subscription on the key)
- `losiContext__*` — session, graph, soul, skills list
- `losiMemory__*` — personal + workspace memories

Workspace is injected from the key.

### MCP handshake (if configuring manually)

1. `initialize`
2. `tools/list`
3. `tools/call` with `{ "name": "…", "arguments": { … } }`

Do not invent tool names — only call tools returned by `tools/list`.

## Fallback: Context Bank REST API

**Base:** `https://losi.ai/api/v1/context-bank`  
**Auth:** `Authorization: Bearer` + vault/env secret.

| Method | Path | Use |
| --- | --- | --- |
| GET | `/session` | Confirm key → workspace binding |
| GET | `/spaces/tasks?limit=25` | Tasks |
| GET | `/spaces/notes?limit=25` | Notes |
| GET | `/nexus/contacts?limit=25` | CRM (needs `nexus:read` + Nexus plan) |
| GET | `/graph?limit=25` | Knowledge graph nodes |
| GET | `/skills` | Saved executable skills |
| GET | `/soul` | Losi identity / soul.md |
| GET | `/memories/personal` | Personal memories |
| GET | `/memories/workspace` | Workspace memories |

Example (shell — secret from env, not the prompt):

```bash
curl -sS https://losi.ai/api/v1/context-bank/session \
  -H "Authorization: Bearer $LOSI_API_KEY"
```

## After connect — stay autonomous

1. **Verify** with `/session` or MCP `tools/list` before claiming access.
2. Run **`migrate-to-losi-context`** once (ask whether to migrate existing
   notes/prefs into the context engine).
3. Operate with **`use-losi-context`**; persist durable facts with
   **`store-losi-context`**.
4. **Never print the full API key**.
5. If auth fails (401/403), guide them to create/rotate a workspace-scoped key
   in losi.ai settings and store it in the host vault — do not collect the key
   in chat.

## Install

```bash
npx skills add losi-ai/context-bank --skill connect-losi-context
npx skills add losi-ai/context-bank --skill use-losi-context
npx skills add losi-ai/context-bank --skill store-losi-context
npx skills add losi-ai/context-bank --skill migrate-to-losi-context
```

Or the pack page: https://www.skills.sh/losi-ai/context-bank/connect-losi-context

## Docs

- Hosted API: https://losi.ai/docs/context-bank
- GitHub: https://github.com/losi-ai/context-bank
- npm: https://www.npmjs.com/org/losi-ai
