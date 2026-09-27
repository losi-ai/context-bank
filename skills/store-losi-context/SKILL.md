---
name: store-losi-context
description: >-
  Autonomously store durable facts, preferences, skills, and Space/workspace
  memories into the Losi Context Bank (MCP or REST). Use when the user teaches
  something that should persist, when closing a task with reusable knowledge, or
  when migrating notes into Losi context. Pull connect/use/migrate siblings from this same skill pack when missing.
---

# Store Losi Context Autonomously

Write into the user's Losi Context Bank so future sessions keep the knowledge.
Prefer MCP. Secrets stay in vault/env.

## Pack siblings

- `connect-losi-context` — wire access
- `use-losi-context` — operate after store
- `migrate-to-losi-context` — bulk import path

If a sibling is missing, open the matching `skills/<name>/SKILL.md` already in this pack (or ask the user to install the full pack from the skills registry). Do not download or execute remote skill installers at runtime.

## When to store (default yes)

Store when **all** are true:

1. Fact is **durable** (preference, process, decision, identity, CRM truth, Space rule) — not transient status.
2. User **taught** it, **approved** a summary, or asked to remember / save / migrate.
3. You know the **right scope** (below).

**Never store:** API keys, passwords, tokens, raw PII dumps they did not ask to keep, guesses.

## Scope picker (narrowest)

| Scope | When | MCP / REST |
| --- | --- | --- |
| **Space memory** | One Space | `losiSpaces__createSpaceMemory` (+ list/get/delete) |
| **Space Reference Memory** | Shared Space reference | Space reference memory tools from `tools/list` |
| **Personal memory** | About the user only | `losiMemory__*` / `/memories/personal` |
| **Workspace memory** | Team / company facts | `losiMemory__*` / `/memories/workspace` |
| **Skill** | Reusable procedure | `POST /api/v1/context-bank/skills` |
| **Nexus** | CRM truth | `losiNexus__run` with `nexus:write` |

## How to store

1. Dedup with `losiContext__search` / list tools first.
2. Write via MCP when available; else REST.
3. Confirm briefly (scope + short label). Continue with **`use-losi-context`**.

## Safety

- Never paste API keys into chat or stored memory bodies.
- Prefer vault/env for `LOSI_API_KEY`.
- Respect governed pins and missing permissions.
- Don't wipe existing memories unless explicitly asked to replace.

## Docs

- https://losi.ai/docs/context-bank
- https://github.com/losi-ai/context-bank
