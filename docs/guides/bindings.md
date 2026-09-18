# Bindings: Nexus & Spaces

Bindings pull live business context into a snapshot. Both `@losi/nexus`
(CRM/bookings/conversations) and `@losi/spaces` (tasks/notes/events/sheets)
work two ways: a **local data provider** (offline, bring your own data) or the
**hosted Losi platform** (`apiKey` + `workspaceId`).

## Local (offline)

```ts
import { NexusBinding } from "@losi/nexus";

const nexus = new NexusBinding({
  crm: true,
  bookings: true,
  data: {
    contacts: async (q) => myDb.searchContacts(q),      // fn or static array
    bookings: [{ id: "1", title: "Demo", startsAt: "2026-09-20T14:00", with: "Ada" }],
  },
});
nexus.isLocal;      // true
```

## Hosted

```ts
const nexus = new NexusBinding({
  apiKey: process.env.LOSI_API_KEY,
  workspaceId: process.env.LOSI_WORKSPACE_ID,
  crm: true,
  bookings: true,
});
nexus.isConnected;  // true
```

Without either, hosted calls throw `ApiBoundaryError` — never a silent empty
result. See [Hosted platform](../hosted.md).

## Flat context and relations

Each binding provides both:

- `resolve(prompt)` → `ContextSection[]` (flat text sections).
- `resolveGraph(prompt)` → a `KnowledgeGraph` of relations.

Nexus relations: `contact —works_at→ company`, `contact —booked→ booking`.
Spaces relations: `task —assigned_to→ person`, plus event nodes.

Add the binding to a `LosiContext` and both flow into the prompt automatically:

```ts
const ctx = new LosiContext({ adapter, bindings: [nexus, spaces] });
await ctx.complete("Who am I meeting tomorrow and what tasks are blocked?");
```

## Inline (no orchestrator)

```ts
const enriched = await nexus.injectIntoPrompt("Who should I follow up with?");
```

## Write your own binding

Implement `ContextBinding`: a `name`, the `scopes` it produces, `resolve()`,
and optionally `resolveGraph()`. Keep any live fetch behind a single, explicit
API-boundary module that throws `ApiBoundaryError` when unconfigured — see
`packages/nexus/src/api.ts` for the reference pattern.
