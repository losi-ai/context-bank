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

## Pack siblings (pull if missing)

```bash
npx skills add losi-ai/context-bank --all
```

| Skill | Role |
| --- | --- |
| `connect-losi-context` | Wire MCP/REST if not connected |
| `store-losi-context` | Persist durable facts after learning |
| `migrate-to-losi-context` | First-connect migration ask |

## Boot (every session)

1. MCP: `tools/list`. Else REST: `GET /api/v1/context-bank/session`.
2. 401/403 → stop; guide to Profile → API Access + vault (`connect-losi-context`).
   Do **not** invent data.
3. First successful connect in the thread → run **`migrate-to-losi-context`** once.

## Capability map (use what's live)

### Search first

| MCP | REST |
| --- | --- |
| `losiContext__search` `{ q, limit?, types? }` | `GET /search?q=&limit=&types=` |

Prefer search over listing every resource. `types` filter:
`space,task,note,event,space_memory,space_reference_memory,graph_node,skill,soul,personal_memory,workspace_memory,contact,booking`.

### Context helpers

| MCP | REST |
| --- | --- |
| `losiContext__session` | `GET /session` |
| `losiContext__graph` | `GET /graph` (search/nodeType **or** rootType+rootId+depth) |
| `losiContext__soul` | `GET /soul` |
| `losiContext__skills_list` | `GET /skills` |

Skills run/save: `POST /skills`, `POST /skills/{id}/run`, PATCH/DELETE by id
(REST; MCP list is read today).

### Spaces

| Surface | Notes |
| --- | --- |
| `losiSpaces__*` | Tasks, notes, sheets, events, files, members — only names from `tools/list` |
| `losiSpaces__listSpaceMemories` / `get` / `create` / `delete` | Durable **Space memories** |
| Space Reference Memory tools | Distinct from Space memories — use when listed |
| REST reads | `GET /spaces/{tasks\|notes\|events\|sheets}` |

Needs `spaces:read` (writes: `spaces:write`).

### Memories (personal / workspace)

| MCP | REST |
| --- | --- |
| `losiMemory__listPersonal` / `createPersonal` / `deletePersonal` | `GET/POST… /memories/personal` |
| `losiMemory__listWorkspace` / `createWorkspace` / `deleteWorkspace` | `GET/POST… /memories/workspace` |

Needs matching `memories:personal:*` / `memories:workspace:*`. Writes → prefer
**`store-losi-context`** for scope rules.

### Nexus CRM

| MCP | REST / other |
| --- | --- |
| `losiNexus__run` | Full CRM mutations (confirm dangerous sends) |
| — | Context Bank reads: `GET /nexus/{contacts\|leads\|companies\|opportunities\|activities\|campaigns\|bookings\|conversations}` |

Needs Nexus **subscription** + `nexus:read` / `nexus:write`. Mutations:
`confirmed=true` only after explicit user OK.

## Autonomy rules

1. **Pull before you guess** — live Losi over assumptions.
2. **Search first** — `losiContext__search` / `GET /search`.
3. **Narrowest write** — Space memory → workspace → personal; update before duplicate create.
4. **Stay in scope** — honor governed pins (`spaceIds`, `memoryScopes`, `nexusAreas`, `allowedTools`).
5. **Batch reads** — search/list, then get by id.
6. **Persist durable facts** via `store-losi-context`.
7. **Never print** the full API key.

## Done means

Verified session/tools, used live context, wrote only what was needed, summarized
changes (ids + one line).
