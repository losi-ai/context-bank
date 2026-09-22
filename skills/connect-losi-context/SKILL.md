---
name: connect-losi-context
description: >-
  Connect any LLM or agent to the user's Losi workspace context (CRM, Spaces
  tasks/notes, knowledge graph, skills, soul, memories) via Losi MCP or the
  Context Bank REST API. Use when the user wants Losi context in Claude, Cursor,
  ChatGPT, Codex, or another tool without writing SDK code. Prefer vault/env for
  the API key — never ask them to paste losi-… into chat. After connect, load
  sibling skills use-losi-context, store-losi-context, and migrate-to-losi-context
  from the same pack when missing.
---

# Connect Losi Context

Wire the current agent to the user's **live Losi workspace** (same data as
losi.ai): Spaces, Nexus CRM, knowledge graph, skills, soul, and memories.

## Full pack — pull siblings autonomously

This skill is the **on-ramp**. Same pack ships three more — load them when the
job needs them (do not wait for the user to name each one):

| Skill | When |
| --- | --- |
| `migrate-to-losi-context` | First successful connect in a conversation |
| `use-losi-context` | Read/act on live Spaces / Nexus / graph / memories / search |
| `store-losi-context` | Persist durable facts, skills, Space/workspace memories |

If only this skill is installed:

```bash
npx skills add losi-ai/context-bank --all
```

Skills + MCP config:

```bash
curl -fsSL https://raw.githubusercontent.com/losi-ai/context-bank/main/scripts/install-with-mcp.sh | bash
```

Pack: https://skills.sh/losi-ai/context-bank

## Prerequisites

1. Free Losi account — [losi.ai](https://losi.ai)
2. **Workspace-scoped** API key (Profile → API Access, `losi-…`). Workspace is
   implied — do not ask for `workspaceId` unless the API says the key is user-scoped.
3. Prefer **MCP**; fall back to **REST**.

## Secrets — vault first

**Never ask the user to paste an API key into chat.**

1. Host vault / credential store
2. `LOSI_API_KEY` env
3. Existing MCP config that already injects the header
4. Tell them how to **set** the secret in settings — still without pasting it

Never print, log, or commit the full key.

## Key permissions (create with what you need)

| Permission | Unlocks |
| --- | --- |
| `spaces:read` / `spaces:write` / `spaces:admin` | Spaces MCP + Space memories + Spaces tools |
| `nexus:read` / `nexus:write` | Nexus MCP + CRM tools (**needs active Nexus subscription**) |
| `memories:personal:*` / `memories:workspace:*` | Personal / workspace memory MCP + REST |
| `spaces:read` **or** `nexus:read` **or** `tools` **or** memory scopes | `losiContext__*` helpers (session, search, graph, soul, skills_list) |

**Governed keys** may pin `spaceIds`, `memoryScopes` (`personal` / `workspace` /
`space` / `space_reference`), `nexusAreas`, and `allowedTools`. Respect 403s —
explain the pin; do not loop.

## Preferred: Losi MCP

**URL:** `https://losi.ai/api/mcp` (also `https://www.losi.one/api/mcp`)  
**Auth:** `Authorization: Bearer` + vault/env (`LOSI_API_KEY`)

| Host | Where |
| --- | --- |
| Cursor | `.cursor/mcp.json` / Settings → MCP |
| Claude | Connectors / `mcpServers` |
| ChatGPT | Developer mode → connector URL |
| Gemini CLI | `httpUrl` in settings |
| Codex / Windsurf / others | Remote MCP URL + Bearer |

```json
{
  "mcpServers": {
    "losi": {
      "url": "https://losi.ai/api/mcp",
      "headers": {
        "Authorization": "Bearer ${env:LOSI_API_KEY}"
      }
    }
  }
}
```

After connect: `tools/list`. Families (permission-dependent):

| Family | Surface |
| --- | --- |
| `losiSpaces__*` | Spaces CRUD + **Space memories** + Space Reference Memories |
| `losiNexus__run` | Full Nexus CRM (subscription + `nexus:*`) |
| `losiContext__session` | Key → workspace binding |
| `losiContext__search` | **Whole-bank search** — prefer over per-resource scans |
| `losiContext__graph` | Knowledge graph list / neighborhood |
| `losiContext__soul` | Assistant soul / identity |
| `losiContext__skills_list` | Saved workspace skills |
| `losiMemory__*` | `list/create/delete` Personal + Workspace memories |

Handshake if configuring manually: `initialize` → `tools/list` → `tools/call`.
Only call names returned by `tools/list`.

## Fallback: Context Bank REST

**Base:** `https://losi.ai/api/v1/context-bank`  
**Auth:** Bearer from vault/env.

| Method | Path | Use |
| --- | --- | --- |
| GET | `/session` | Confirm workspace binding |
| GET | `/search?q=&limit=&types=` | Workspace-wide search |
| GET | `/spaces/{tasks\|notes\|events\|sheets}` | Spaces reads |
| GET | `/nexus/{contacts\|leads\|companies\|opportunities\|activities\|campaigns\|bookings\|conversations}` | CRM reads (Nexus plan + `nexus:read`) |
| GET | `/memories/{personal\|workspace}` | Memories |
| GET | `/graph` | Graph nodes / neighborhood |
| GET/POST | `/skills` | List / save skills |
| GET/PATCH/DELETE | `/skills/{id}` | Manage skill |
| POST | `/skills/{id}/run` | Run skill |
| GET | `/soul` | Soul / identity |

`types=` for search: `space,task,note,event,space_memory,space_reference_memory,graph_node,skill,soul,personal_memory,workspace_memory,contact,booking`.

CRM **writes**: MCP `losiNexus__run` or `POST /api/v1/nexus/tools` with `nexus:write`.

```bash
curl -sS https://losi.ai/api/v1/context-bank/session \
  -H "Authorization: Bearer $LOSI_API_KEY"
```

## After connect

1. Verify `/session` or `tools/list`.
2. If siblings missing → `npx skills add losi-ai/context-bank --all`.
3. Run **`migrate-to-losi-context`** once.
4. Operate with **`use-losi-context`**; persist with **`store-losi-context`**.
5. Never print the full API key.
6. On 401/403: guide to workspace-scoped key + vault — do not collect the key in chat.

## Docs

- https://losi.ai/docs/context-bank
- https://github.com/losi-ai/context-bank
- https://www.npmjs.com/org/losi-ai
