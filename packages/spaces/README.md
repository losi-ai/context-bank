# @losi-ai/spaces

Spaces context binding for [Losi Context Bank](https://github.com/losi-ai/context-bank). Inject **tasks, notes, sheets, and calendar** context into any LLM prompt.

Works two ways: a **local data provider** (bring your own data — fully offline, no account) or the **hosted Losi platform** (`apiKey` + `workspaceId` for live data).

```bash
npm install @losi-ai/core @losi-ai/spaces
```

## Local — no hosted account needed

```ts
import { LosiContext } from "@losi-ai/core";
import { AnthropicAdapter } from "@losi-ai/anthropic";
import { SpacesBinding } from "@losi-ai/spaces";

const spaces = new SpacesBinding({
  tasks: true,
  calendar: true,
  data: {
    tasks: [{ id: "1", title: "Ship the SDK", status: "in-progress", dueAt: "2026-09-16" }],
    events: async (q) => myCalendar.search(q),
  },
});

const ctx = new LosiContext({
  adapter: new AnthropicAdapter({ apiKey: process.env.ANTHROPIC_API_KEY! }),
  bindings: [spaces],
});

const res = await ctx.complete("What are my overdue tasks and today's events?");
```

## Hosted — live workspace data

```ts
const spaces = new SpacesBinding({
  apiKey: process.env.LOSI_API_KEY,
  workspaceId: process.env.LOSI_WORKSPACE_ID,
  tasks: true,
  calendar: true,
});
```

Or inline:

```ts
const enriched = await spaces.injectIntoPrompt("Plan my afternoon around open tasks.");
```

`spaces.isLocal` is true with a local provider; `spaces.isConnected` is true with a hosted connection. MIT licensed.
