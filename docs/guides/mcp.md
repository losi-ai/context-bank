# MCP Tools

`@losi/mcp` is a Model Context Protocol client with something the raw MCP spec
lacks: **per-tool data access scopes**. Every connection declares what it *can*
see (`accessScopes`) and what it *cannot* (`blockedScopes`), enforced before
any tool call.

## Connect a server

```ts
import { MCPClient } from "@losi/mcp";

const github = new MCPClient({
  name: "github",
  serverUrl: "https://mcp.example.com/rpc",
  accessScopes: ["workspace"], // may access
  blockedScopes: ["crm"],      // never — blockedScopes always wins
  authToken: process.env.GITHUB_MCP_TOKEN,
});

const tools = await github.listTools();          // scope-filtered
await github.callTool("create_issue", { title: "Bug" });
```

If a tool's declared scope is blocked (or not in the allow-list), `callTool`
throws `ScopeError` before contacting the server.

## Route across servers

```ts
import { MCPRegistry } from "@losi/mcp";

const registry = new MCPRegistry();
registry.connect({ name: "github", serverUrl: "..." });
registry.connect({ name: "linear", serverUrl: "...", blockedScopes: ["crm"] });

await registry.listAllTools();                    // tagged by connection
await registry.callTool("linear", "create_ticket", { title: "..." });
```

## Central policy hook

Pass a `PolicyHook` to check each call against centrally-managed Losi
governance policies — the clean boundary to a hosted policy service:

```ts
const client = new MCPClient(config, async ({ connection, tool, scope }) => {
  return await myPolicyService.allows({ connection, tool, scope });
});
```

Zero runtime dependencies (uses `fetch`). This competes at the **SDK layer**
with the enterprise MCP-gateway market — governance embedded in the client, not
just a reverse proxy. Next: [Skills](./skills.md).
