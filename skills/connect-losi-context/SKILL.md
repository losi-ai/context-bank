---
name: connect-losi-context
description: >-
  Connect any LLM or agent to the user's Losi workspace context (CRM, Spaces
  tasks/notes, knowledge graph, skills, soul) via Losi MCP or the Context Bank
  REST API. Use when the user wants Losi context in Claude, Cursor, ChatGPT,
  Codex, or another tool without writing SDK code.
---

# Connect Losi Context

Give the current agent access to the user's **real Losi workspace** (same data
as losi.ai): Spaces, Nexus CRM, knowledge graph, skills, and soul/identity.

## Prerequisites

1. A **workspace-scoped** API key from [losi.ai](https://losi.ai) → Profile → API Access  
   Format: `losi-…`  
   The workspace is implied by the key — do **not** ask for a workspace ID unless
   the API returns an error saying the key is user-scoped.
2. Prefer **MCP** when the host supports it. Fall back to **REST** (`curl` /
   `fetch`) when MCP is unavailable.

## Preferred: Losi MCP

**Endpoint:** `https://losi.ai/api/mcp`  
(also `https://www.losi.one/api/mcp`)

**Auth:** `Authorization: Bearer <LOSI_API_KEY>`

### Cursor / Claude Desktop style config

```json
{
  "mcpServers": {
    "losi": {
      "url": "https://losi.ai/api/mcp",
      "headers": {
        "Authorization": "Bearer losi-YOUR_KEY"
      }
    }
  }
}
```

After connecting, call `tools/list`, then use `losiSpaces__*` tools for tasks,
notes, files, and related workspace actions. Workspace is injected from the key.

### MCP handshake (if configuring manually)

1. `initialize`
2. `tools/list`
3. `tools/call` with `{ "name": "losiSpaces__…", "arguments": { … } }`

Do not invent tool names — only call tools returned by `tools/list`.

## Fallback: Context Bank REST API

**Base:** `https://losi.ai/api/v1/context-bank`  
**Auth:** `Authorization: Bearer <LOSI_API_KEY>`

| Method | Path | Use |
| --- | --- | --- |
| GET | `/session` | Confirm key → workspace binding |
| GET | `/spaces/tasks?limit=25` | Tasks |
| GET | `/spaces/notes?limit=25` | Notes |
| GET | `/nexus/contacts?limit=25` | CRM contacts |
| GET | `/graph?limit=25` | Knowledge graph nodes |
| GET | `/skills` | Saved executable skills |
| GET | `/soul` | Losi identity / soul.md for the workspace |

Example:

```bash
curl -sS https://losi.ai/api/v1/context-bank/session \
  -H "Authorization: Bearer $LOSI_API_KEY"
```

## How to behave once connected

1. **Verify** with `/session` or MCP `tools/list` before claiming access.
2. **Use live data** for answers about the user's CRM, tasks, notes, or graph —
   do not guess.
3. **Never print the full API key** in replies, commits, or logs.
4. If auth fails (401/403), tell the user to create a workspace-scoped key at
   losi.ai and retry.
5. Optional: install `@losi-ai/*` from npm only when they want code integration;
   MCP/REST are enough for chat agents.

## Docs

- Hosted API: https://losi.ai/docs/context-bank
- GitHub: https://github.com/losi-ai/context-bank
- npm: https://www.npmjs.com/org/losi-ai
