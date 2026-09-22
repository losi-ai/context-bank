---
name: store-losi-context
description: >-
  Autonomously store durable facts, preferences, skills, and Space/workspace
  memories into the Losi Context Bank (MCP or REST). Use when the user teaches
  something that should persist, when closing a task with reusable knowledge, or
  when migrating notes into Losi context. Pull connect/use/migrate siblings from
  losi-ai/context-bank when missing.
---

# Store Losi Context Autonomously

Write into the user's Losi Context Bank so future sessions keep the knowledge.
Prefer MCP. Secrets stay in vault/env.

## Pack siblings (pull if missing)

```bash
npx skills add losi-ai/context-bank --all
```

- `connect-losi-context` — wire access
- `use-losi-context` — operate after store
- `migrate-to-losi-context` — bulk import path

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
| **Space Reference Memory** | Reference material for a Space | Space Reference Memory tools from `tools/list` |
| **Workspace memory** | Shared across workspace | `losiMemory__createWorkspace` |
| **Personal memory** | This user only | `losiMemory__createPersonal` |
| **Skill** | Reusable multi-step procedure | `POST /skills` (run: `POST /skills/{id}/run`) |
| **Nexus CRM** | Lead/contact/company truth | `losiNexus__run` (confirm mutations) |
| **Space note / task** | Working artifact, not a memory | `losiSpaces__createSpaceNote` / task tools |

Unsure Space vs workspace memory → **ask once**, then remember preference for the session.

Governed keys may pin `memoryScopes` (`personal` / `workspace` / `space` /
`space_reference`) and `spaceIds` — on 403 explain the pin.

## How to write

1. Confirm access (`tools/list` or `GET /session`).
2. Dedup: `losiContext__search` / list recent memories for the same fact.
3. Write smallest clear record (title + content, or skill steps).
4. Return: scope, id, one-line summary.
5. On 403: name the missing permission (`spaces:write`, `memories:*:write`, `nexus:write`) or governance pin.

### Examples

**Workspace memory:**

```json
{
  "name": "losiMemory__createWorkspace",
  "arguments": {
    "title": "Launch checklist owner",
    "content": "Marsh owns release checklist; ping #launch before flipping prod."
  }
}
```

**Space memory:**

```json
{
  "name": "losiSpaces__createSpaceMemory",
  "arguments": {
    "spaceId": "SPACE_UUID",
    "content": "Design reviews happen Tuesdays; attach Figma link on the task.",
    "memoryType": "general"
  }
}
```

**Skill (REST):**

```bash
curl -sS -X POST https://losi.ai/api/v1/context-bank/skills \
  -H "Authorization: Bearer $LOSI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "weekly-status",
    "description": "Draft a weekly status from open tasks",
    "steps": [{ "type": "note", "text": "Summarize open high-priority tasks" }],
    "parameters": []
  }'
```

## Autonomy rules

- Prefer **update** over duplicate create when an id exists.
- Nexus sends / bulk mutations: ask, then `confirmed=true`.
- Never echo the API key.
- After store: optional next step (link task, run skill, continue with `use-losi-context`).
