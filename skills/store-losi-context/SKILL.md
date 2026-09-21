---
name: store-losi-context
description: >-
  Autonomously store durable facts, preferences, skills, and Space/workspace
  memories into the Losi Context Bank (MCP or REST). Use when the user teaches
  something that should persist, when closing a task with reusable knowledge, or
  when migrating notes into Losi context.
---

# Store Losi Context Autonomously

Write into the user's Losi Context Bank so future sessions keep the knowledge.
Prefer MCP. Keep secrets in vault/env.

## When to store (default yes)

Store when **all** of these are true:

1. The fact is **durable** (preference, process, decision, identity, CRM truth,
   Space operating rule) — not a one-off transient status.
2. The user **taught** it, **approved** a summary, or asked you to remember /
   save / migrate it.
3. You know the **right scope** (see below).

Do **not** store secrets (API keys, passwords, tokens), raw PII dumps the user
did not ask to keep, or speculative guesses.

## Scope picker (use the narrowest)

| Scope | When | MCP / REST |
| --- | --- | --- |
| **Space memory** | Rule or fact for one Space | `losiSpaces__createSpaceMemory` / Space Reference Memory tools |
| **Workspace memory** | Shared across the workspace | `losiMemory__createWorkspace` |
| **Personal memory** | About this user only | `losiMemory__createPersonal` |
| **Skill** | Multi-step reusable procedure | `POST /skills` |
| **Nexus CRM** | Lead/contact/company truth | `losiNexus__run` (with confirmation for mutations) |
| **Space note / task** | Working artifact, not a memory | `losiSpaces__createSpaceNote` / task tools |

If unsure between Space vs workspace memory: **ask once**, then remember their
preference for the rest of the session.

## How to write (autonomous)

1. Confirm MCP/REST access (`tools/list` or `GET /session`).
2. Dedup: list recent memories / search notes for the same fact.
3. Write the smallest clear record (title + content, or skill steps).
4. Return: scope, id (if any), one-line summary of what was stored.
5. On 403: tell them which permission / governance pin blocked the write
   (`spaces:write`, `memories:*:write`, `nexus:write`, governed spaceIds).

### Examples

**Workspace memory (MCP):**

```json
{
  "name": "losiMemory__createWorkspace",
  "arguments": {
    "title": "Launch checklist owner",
    "content": "Marsh owns release checklist; ping #launch before flipping prod."
  }
}
```

**Space memory (MCP):**

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

- Prefer **update** over duplicate create when an id already exists.
- For Nexus sends / bulk mutations: ask for confirmation, then `confirmed=true`.
- Never echo the API key.
- After storing, offer one optional next step (e.g. link a task, run the skill).

## Related

- Connect: `connect-losi-context`
- Operate: `use-losi-context`
- First-use migrate ask: `migrate-to-losi-context`
