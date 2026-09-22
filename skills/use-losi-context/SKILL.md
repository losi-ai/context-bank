---
name: use-losi-context
description: >-
  Autonomously use the full Losi Context Bank once connected: Spaces (tasks,
  notes, sheets, events, Space memories), Nexus CRM, knowledge graph, skills,
  soul, and personal/workspace memories via MCP or REST. Use when the agent
  should read and act on live Losi workspace data without waiting for
  step-by-step instructions.
---

# Use Losi Context Autonomously

Operate on the user's **live Losi workspace** end-to-end. Prefer MCP tools from
`tools/list`. Fall back to Context Bank REST. Keep the API key in vault/env —
never paste it into chat.

## When this skill applies

- User asks you to work from their Losi Spaces / Nexus / memories / graph
- You already have (or can load) `connect-losi-context`
- You should **act**, not just explain how to connect

## Boot sequence (do this first, every session)

1. If MCP is configured: `tools/list` and cache the tool names.
2. Else REST: `GET /api/v1/context-bank/session` with `$LOSI_API_KEY`.
3. If 401/403: stop and guide them to Profile → API Access + vault/env (see
   `connect-losi-context`). Do **not** invent data.
4. On **first successful connect in a conversation**, run the migration check
   from `migrate-to-losi-context` (one short ask — then proceed either way).

## Tool map (MCP)

Only call names returned by `tools/list`. Typical families:

| Prefix | Use for |
| --- | --- |
| `losiSpaces__*` | Spaces CRUD: tasks, notes, sheets, events, files, **Space memories**, Space Reference Memories |
| `losiNexus__run` | Full Nexus CRM (leads, contacts, companies, opportunities, campaigns, …). Needs Nexus subscription + `nexus:*` on the key |
| `losiContext__session` | Confirm workspace binding |
| `losiContext__search` | **Whole-bank search** (Spaces, memories, graph, skills, soul, Nexus when allowed) — prefer this over per-resource scans |
| `losiContext__graph` | Knowledge graph search / neighborhood |
| `losiContext__soul` | Assistant soul / identity |
| `losiContext__skills_list` | List saved skills |
| `losiMemory__*` | Personal + workspace memories |

Mutations that ask for confirmation: pass `confirmed=true` only after the user
explicitly agrees (especially Nexus writes / sends).

## REST map

**Base:** `https://losi.ai/api/v1/context-bank`

- Session: `GET /session`
- **Search whole bank:** `GET /search?q=&limit=&types=` (prefer over scanning each resource)
- Spaces: `GET /spaces/{tasks|notes|events|sheets}`
- Nexus (needs `nexus:read` + Nexus subscription): `GET /nexus/{contacts|leads|companies|opportunities|activities|campaigns|bookings|conversations}`
- Graph: `GET /graph`
- Skills: `GET/POST /skills`, `POST /skills/{id}/run`
- Soul: `GET /soul`
- Memories: `GET /memories/{personal|workspace}`

Writes that MCP exposes (Space memories, CRM mutations, memory create) should
prefer MCP `tools/call` when available.

## Autonomy rules

1. **Pull before you guess.** Prefer live Losi data over assumptions.
2. **Search first.** Use `losiContext__search` / `GET /search?q=` before listing every resource type.
3. **Narrowest write.** Prefer Space / workspace memory over personal; prefer
   updating an existing record over creating duplicates.
4. **Stay in scope.** Respect governed keys (space pins, memory scopes, Nexus
   areas). If a tool 403s, explain the pin — don't loop.
5. **Batch reads.** List/search first, then get by id.
6. **Persist durable facts** using `store-losi-context` when the user teaches
   something that should survive this chat.
7. **Never print** the full API key.

## Done means

You verified session/tools, used live context for the task, wrote only what was
needed, and told the user what changed (ids + short summary).
