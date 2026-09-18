# @losi/governance

Per-agent **governance policy engine** for [Losi Context Bank](https://github.com/marshmallow-studio/losi-context-bank). Spend caps, rate limits, blocked actions, data scopes, an audit log, and a kill switch.

```bash
npm install @losi/core @losi/governance
```

## Example

```ts
import { PolicyManager } from "@losi/governance";

const gov = new PolicyManager();

gov.setPolicy("support-bot", {
  spendCapUsd: 10,
  rateLimitPerMinute: 30,
  blockedActions: ["delete", "refund"],
  allowedScopes: ["crm", "bookings"],
});

const decision = gov.enforce({ agentId: "support-bot", type: "complete", costUsd: 0.02 });
if (!decision.allowed) console.warn(decision.reason);

gov.kill("support-bot");            // emergency stop
console.log(gov.spentFor("support-bot"));
console.log(gov.audit("support-bot")); // every decision, recorded
```

## Persisting the audit log

`LosiAuditSink` forwards audit entries to the hosted Losi governance API. Without a connection it buffers locally so nothing is lost:

```ts
import { PolicyManager, LosiAuditSink } from "@losi/governance";

const sink = new LosiAuditSink({ apiKey: process.env.LOSI_API_KEY, workspaceId: "..." });
const gov = new PolicyManager(sink);
```

MIT licensed.
