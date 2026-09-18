# Governance

Every context read and model call in Losi Context Bank is governable. The
in-memory engine lives in `@losi/core` (`GovernanceEngine`); the multi-agent
policy manager and audit sink live in `@losi/governance`.

## Policy fields

```ts
interface GovernanceConfig {
  spendCapUsd?: number;        // cumulative USD cap per agent
  rateLimitPerMinute?: number; // requests/min
  blockedActions?: string[];   // action types the agent may never take
  allowedScopes?: DataScope[]; // data scopes it may access (empty = all)
  killSwitch?: boolean;        // deny everything immediately
}
```

## Single agent (core)

```ts
import { GovernanceEngine } from "@losi/core";

const gov = new GovernanceEngine({ spendCapUsd: 5, rateLimitPerMinute: 60 });
const { allowed, reason } = gov.enforce({ agentId: "a1", type: "complete", costUsd: 0.02 });
if (!allowed) throw new Error(reason);
gov.audit();          // every decision, recorded
gov.spentFor("a1");   // cumulative spend
```

`LosiContext` runs `enforce` automatically on `context_read`, `complete`, and
`stream`, using the `governance` config you pass it.

## Many agents (`@losi/governance`)

```ts
import { PolicyManager } from "@losi/governance";

const gov = new PolicyManager();
gov.setPolicy("support-bot", { spendCapUsd: 10, rateLimitPerMinute: 30, blockedActions: ["delete"] });

gov.enforce({ agentId: "support-bot", type: "complete", costUsd: 0.01 });
gov.kill("support-bot");    // emergency stop
gov.revive("support-bot");
gov.audit("support-bot");   // per-agent audit trail
```

## Persisting the audit log

`LosiAuditSink` forwards audit entries to a hosted Losi workspace; without a
connection it buffers locally so nothing is lost.

```ts
import { PolicyManager, LosiAuditSink } from "@losi/governance";

const sink = new LosiAuditSink({ apiKey: process.env.LOSI_API_KEY, workspaceId: "..." });
const gov = new PolicyManager(sink);
```

Pair this with [provenance & diffing](./provenance.md) for an end-to-end
audit story. Next: [MCP tools](./mcp.md).
