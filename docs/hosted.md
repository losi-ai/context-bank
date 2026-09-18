# Hosted Platform

The SDK is free and MIT-licensed. Live business data — real CRM, bookings,
workspace, and the cross-surface knowledge graph — comes from the hosted Losi
platform at [losi.ai](https://losi.ai). This is the open-core split: the SDK is
yours; the hosted context, governance UI, and data live on the platform.

## Connect

Create a workspace API key in Losi, then pass it to the bindings:

```ts
import { NexusBinding } from "@losi/nexus";
import { SpacesBinding } from "@losi/spaces";

const nexus = new NexusBinding({ apiKey: process.env.LOSI_API_KEY, workspaceId: "ws_123", crm: true, bookings: true });
const spaces = new SpacesBinding({ apiKey: process.env.LOSI_API_KEY, workspaceId: "ws_123", tasks: true, calendar: true });
```

Auth is a bearer token: `Authorization: Bearer losi-...`.

## The API surface

Base URL: `https://losi.ai/api/v1/context-bank` (override via `baseUrl`).

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/workspaces/{id}/nexus/{contacts\|bookings\|conversations}?q=&limit=` | CRM context |
| GET | `/workspaces/{id}/spaces/{tasks\|notes\|events\|sheets}?q=&limit=` | Workspace context |
| GET | `/workspaces/{id}/graph?nodeType=&search=&limit=` | Graph nodes (list) |
| GET | `/workspaces/{id}/graph?rootType=&rootId=&depth=` | Graph neighborhood (traverse) |
| POST | `/workspaces/{id}/governance/audit` | Ingest audit entries |

Every response maps directly onto the SDK types: `nexus/*` and `spaces/*`
return bare arrays of SDK records; `graph` returns
`{ nodes: GraphNode[], edges: GraphEdge[] }` matching `@losi/core`'s
`KnowledgeGraph`.

## Offline first

None of this is required to use the SDK. Every binding accepts a **local data
provider** so you can develop and ship entirely offline; connect the hosted
platform when you want live workspace data. See [Bindings](./guides/bindings.md).

## Enterprise

Self-hosted and private deployment are available for enterprise. Talk to us at
[losi.ai](https://losi.ai).
