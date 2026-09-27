---
name: losi-migrate-context
description: >-
  On first Context Bank use in a conversation, ask whether to migrate existing
  notes, prefs, and agent memory into the Losi context engine (Context Bank:
  personal/workspace/Space memories, skills, CRM). Use when connecting to Losi
  for the first time, importing from another tool, or when the user mentions
  moving context into Losi. Pair with connect-losi-context, losi-use-context,
  and losi-store-context when those skills are already available in the session.
---

# Migrate to Losi Context Engine

On **first successful** Losi Context Bank / MCP connect in a conversation, ask
once whether to migrate existing material into Losi. Keep it short. Stay
autonomous after they answer.

## Related skills in this pack

- `connect-losi-context` — wire MCP/REST
- `losi-use-context` — operate after migrate
- `losi-store-context` — write each migrated item

Use a related skill only if it is already loaded in this session.

## When to ask (once per conversation)

Ask after session/`tools/list` succeeds **and** any of:

- First Losi connect in the thread
- User is new to Context Bank / context engine
- User mentions ChatGPT memory, Notion dumps, local notes, or another agent store

**Do not** re-ask every turn. Record: migrated / declined / later.

## The ask

> I can keep working against your live Losi workspace now. Want me to **migrate**
> useful notes, preferences, and procedures into the Losi context engine
> (Context Bank: workspace/Space/personal memories + skills) so they persist
> across chats and tools?
> Reply **yes** (I'll propose what to move), **no**, or **later**.

If they already have rich Losi data: "I'll only add net-new facts — no duplicates."

## If yes

1. Inventory candidates they pointed at (files, prefs, pasted docs). Do not scrape private stores without permission.
2. Plan scopes: **personal** / **workspace** / **Space memory** / **Space Reference Memory** / **skill** / **Nexus**.
3. One confirmation on the plan (bulk OK).
4. Dedup with `losiContext__search` / memory lists, then execute via **`losi-store-context`** if available.
5. Summarize counts by scope + notable ids. Continue with **`losi-use-context`** if available.

## If no / later

Continue with `losi-use-context` on live Losi data only when that skill is
available. They can say "migrate my notes into Losi" anytime.

## What "context engine" means

Losi **Context Bank**: hosted MCP + REST bound to a workspace-scoped key —
Spaces, Nexus (when subscribed), graph, skills, soul, memories — portable
across Claude, Cursor, Codex, and `@losi-ai/*`.

## Safety

- Never migrate secrets or paste API keys into chat.
- Prefer vault/env for `LOSI_API_KEY`.
- Respect governed pins and missing permissions.
- Don't wipe existing Losi memories unless explicitly asked to replace.

## Docs

- https://losi.ai/docs/context-bank
