---
name: migrate-to-losi-context
description: >-
  On first Context Bank use in a conversation, ask whether to migrate existing
  notes, prefs, and agent memory into the Losi context engine (Context Bank).
  Use when connecting to Losi for the first time, importing from another tool,
  or when the user mentions moving context into Losi.
---

# Migrate to Losi Context Engine

On **first successful Losi Context Bank / MCP connect** in a conversation, ask
once whether to migrate existing material into Losi. Keep it short. Stay
autonomous after they answer.

## When to ask (exactly once per conversation)

Ask after session/`tools/list` succeeds **and** any of:

- This is the first Losi connect in the thread
- User says they are new to Context Bank / context engine
- User mentions ChatGPT memory, Notion dumps, local notes, or another agent
  store they want Losi to own

**Do not** re-ask every turn. Record their answer in-session (“migrated” /
“declined” / “later”).

## The ask (copy tone, adapt lightly)

> I can keep working against your live Losi workspace now. Want me to **migrate**
> useful notes, preferences, and procedures into the Losi context engine
> (Context Bank: workspace/Space/personal memories + skills) so they persist
> across chats and tools?  
> Reply **yes** (I’ll propose what to move), **no**, or **later**.

If they already have rich Losi data, add: “I’ll only add net-new facts — no
duplicates.”

## If they say yes

1. Inventory candidates (local files they pointed at, prior chat prefs, pasted
   docs, exported JSON/Markdown). Do **not** scrape private stores without
   permission.
2. Propose a short plan: what goes to **personal** vs **workspace** vs **Space**
   vs **skill** vs **Nexus**.
3. Get a single confirmation on the plan (bulk OK).
4. Execute with `store-losi-context` (dedup first).
5. Summarize: counts by scope + notable ids. Offer `use-losi-context` next.

## If they say no / later

Continue with `use-losi-context` using live Losi data only. Mention they can
revisit migration anytime (“migrate my notes into Losi”).

## What “context engine” means here

Losi **Context Bank**: hosted MCP + REST that binds a workspace-scoped key to
Spaces, Nexus (when subscribed), graph, skills, soul, and memories — portable
across Claude, Cursor, Codex, and apps via `@losi-ai/*`.

## Safety

- Never migrate secrets or paste API keys into chat.
- Prefer vault/env for `LOSI_API_KEY`.
- Respect governed key pins and missing permissions (explain blockers).
- Don’t wipe existing Losi memories unless the user explicitly asks to replace.

## Related

- `connect-losi-context` — wire MCP/REST
- `use-losi-context` — operate autonomously after connect
- `store-losi-context` — write memories/skills/CRM facts
