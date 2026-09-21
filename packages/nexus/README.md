# @losi-ai/nexus

Nexus context binding for [Losi Context Bank](https://github.com/marshmallow-studio/losi-context-bank). Inject **CRM, bookings, and conversation** context into any LLM prompt.

Works two ways: a **local data provider** (bring your own database or fixtures — fully offline, no account) or the **hosted Losi platform** (`apiKey` + `workspaceId` for live data).

```bash
npm install @losi-ai/core @losi-ai/nexus
```

## Local — no hosted account needed

```ts
import { LosiContext } from "@losi-ai/core";
import { OpenAIAdapter } from "@losi-ai/openai";
import { NexusBinding } from "@losi-ai/nexus";

const nexus = new NexusBinding({
  bookings: true,
  crm: true,
  data: {
    // static arrays or async functions of the prompt — your call
    bookings: [{ id: "1", title: "Demo call", startsAt: "2026-09-15T14:00", with: "Ada Lovelace" }],
    contacts: async (q) => myDb.searchContacts(q),
  },
});

const ctx = new LosiContext({
  adapter: new OpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY! }),
  bindings: [nexus],
});

const res = await ctx.complete("What meetings do I have tomorrow, and who with?");
```

## Hosted — live workspace data

```ts
const nexus = new NexusBinding({
  apiKey: process.env.LOSI_API_KEY,
  workspaceId: process.env.LOSI_WORKSPACE_ID,
  bookings: true,
  crm: true,
});
```

Or enrich a prompt directly, without the full orchestrator:

```ts
const enriched = await nexus.injectIntoPrompt("Who should I follow up with today?");
```

`nexus.isLocal` is true when a local provider is set; `nexus.isConnected` is true when a hosted connection is configured. With neither, hosted calls throw `ApiBoundaryError` — never a silent empty result. MIT licensed.
