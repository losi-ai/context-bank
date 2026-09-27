---
name: use-losi-context
description: >-
  Autonomously use the full Losi Context Bank once connected: Spaces (tasks,
  notes, sheets, events, Space memories), Nexus CRM, knowledge graph, skills,
  soul, personal/workspace memories, and workspace-wide search via MCP or REST.
  Use when the agent should read and act on live Losi workspace data without
  waiting for step-by-step instructions. Pull connect/store/migrate siblings
  from losi-ai/context-bank when missing.
---

# Use Losi Context Autonomously

Operate on the user's **live Losi workspace**. Prefer MCP from `tools/list`.
Fall back to Context Bank REST. Key stays in vault/env — never paste into chat.

## Pack siblings

| Skill | Role |
| --- | --- |
| `connect-losi-context` | Wire MCP/REST if not connected |
| `store-losi-context` | Persist durable facts after learning |
| `migrate-to-losi-context` | First-connect migration ask |

If a sibling is missing, ask the user to install the pack from
[skills.sh/losi-ai/context-bank](https://skills.sh/losi-ai/context-bank)
or open the matching `skills/<name>/SKILL.md` in this repo.
**Do not** run remote installers or package managers to fetch skills at runtime.

## Boot (every session)

1. MCP: `tools/list`. Else REST: `GET /api/v1/context-bank/session`.
2. 401/403 → stop; guide to Profile → API Access + vault (`connect-losi-context`).
   Do **not** invent data.
3. First successful connect in the thread → run **`migrate-to-losi-context`** once.

## Capability map (use what's live)

### Search first

| MCP | REST |
| --- | --- |
| `losiContext__search` | `GET /api/v1/context-bank/search?q=&limit=&types=` |

Prefer search before scanning individual collections.

### Spaces

Use `losiSpaces__*` tools from `tools/list` (tasks, notes, events, sheets, Space
memories, Space Reference Memories). REST mirrors under `/api/v1/context-bank/spaces/…`.

### Nexus CRM

`losiNexus__run` (needs Nexus subscription + `nexus:*`). REST under
`/api/v1/context-bank/nexus/…`.

### Graph / soul / skills / memories

| MCP | REST |
| --- | --- |
| `losiContext__graph` | `GET /api/v1/context-bank/graph` |
| `losiContext__soul` | `GET /api/v1/context-bank/soul` |
| `losiContext__skills_list` | `GET /api/v1/context-bank/skills` |
| `losiMemory__*` | `GET/POST /api/v1/context-bank/memories/{personal\|workspace}` |

## Operating rules

1. Act on live data — don't wait for step-by-step prompts once connected.
2. After learning durable facts, hand off to **`store-losi-context`**.
3. Respect governed pins / 403s; explain missing scopes.
4. Never print the full API key.

## Docs

- https://losi.ai/docs/context-bank
- https://github.com/losi-ai/context-bank
