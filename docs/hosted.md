# Hosted Platform

The SDK is free and MIT-licensed. **Losi is free to get started** — create an
account at [losi.ai](https://losi.ai), make a workspace-scoped API key, and pull
live CRM, bookings, Spaces, skills, and the knowledge graph. The open-core
split: the SDK is yours; hosted context and data live on the platform.

## Connect

Create a **workspace-scoped** API key in Losi. The key is bound to a workspace,
so you normally only pass the key — not a separate workspace id:

```ts
import { NexusBinding } from "@losi-ai/nexus";
import { SpacesBinding } from "@losi-ai/spaces";
import { LosiSkillStore } from "@losi-ai/skills";

const nexus = new NexusBinding({ apiKey: process.env.LOSI_API_KEY, crm: true, bookings: true });
const spaces = new SpacesBinding({ apiKey: process.env.LOSI_API_KEY, tasks: true, calendar: true });
const skills = new LosiSkillStore({ apiKey: process.env.LOSI_API_KEY! });
```

Auth is a bearer token from vault/env (`Authorization: Bearer` + `LOSI_API_KEY`).
Do not paste keys into chat transcripts.

Resolve the bound workspace explicitly if needed:

```http
GET /api/v1/context-bank/session
Authorization: Bearer <LOSI_API_KEY from vault/env>
```

Legacy user-scoped keys (no `workspace_id` on the key) still require a path
workspace id. Prefer workspace-scoped keys for new integrations.

## The API surface

Base URL: `https://losi.ai/api/v1/context-bank` (override via `baseUrl`).

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/session` |
| GET | `/search?q=` | Workspace-wide search | Optional: return the workspace bound to the key |
| GET | `/nexus/{contacts\|bookings\|conversations}?q=&limit=` | CRM context (key-implied workspace) |
| GET | `/spaces/{tasks\|notes\|events\|sheets}?q=&limit=` | Workspace context (key-implied workspace) |
| GET | `/graph?nodeType=&search=&limit=` | Graph nodes (key-implied workspace) |
| GET | `/graph?rootType=&rootId=&depth=` | Graph neighborhood (key-implied workspace) |
| GET/POST | `/skills` | List / save executable skills |
| GET/PATCH/DELETE | `/skills/{skillId}` | Read / update / delete a skill |
| POST | `/skills/{skillId}/run` | Run a skill through the hosted tool executor |
| GET | `/soul` | Losi soul.md, traits, memory, and evolution for the key’s workspace |
| POST | `/workspaces/{id}/governance/audit` | Ingest audit entries |

Legacy `/workspaces/{id}/…` paths still work; `{id}` must match the key’s bound
workspace. Prefer the pathless routes — no workspaceId to pass.

Every response maps directly onto the SDK types: `nexus/*` and `spaces/*`
return bare arrays of SDK records; `graph` returns
`{ nodes: GraphNode[], edges: GraphEdge[] }` matching `@losi-ai/core`'s
`KnowledgeGraph`; `skills` returns SDK skill objects.

## Offline first

None of this is required to use the SDK. Every binding accepts a **local data
provider** so you can develop and ship entirely offline; connect the hosted
platform when you want live workspace data. See [Bindings](./guides/bindings.md).

## Enterprise

Self-hosted and private deployment are available for enterprise. Talk to us at
[losi.ai](https://losi.ai).
