# @losi-ai/mcp

MCP (Model Context Protocol) client for [Losi Context Bank](https://github.com/marshmallow-studio/losi-context-bank) with per-tool **data access scopes**. Every connection declares what it can and cannot see — enforced before any tool call.

```bash
npm install @losi-ai/core @losi-ai/mcp
```

## Example

```ts
import { MCPClient } from "@losi-ai/mcp";

const github = new MCPClient({
  name: "github",
  serverUrl: "https://mcp.example.com/rpc",
  accessScopes: ["workspace"], // what this tool CAN access
  blockedScopes: ["crm"],      // what it CANNOT — blockedScopes always wins
});

const tools = await github.listTools();           // scope-filtered
await github.callTool("create_issue", { title: "Bug" });
```

Route across many servers with `MCPRegistry`:

```ts
import { MCPRegistry } from "@losi-ai/mcp";

const registry = new MCPRegistry();
registry.connect({ name: "github", serverUrl: "..." });
registry.connect({ name: "linear", serverUrl: "...", blockedScopes: ["crm"] });

await registry.callTool("linear", "create_ticket", { title: "..." });
```

Pass a `PolicyHook` to a connection to check calls against centrally-managed Losi governance policies. Zero runtime dependencies (uses `fetch`). MIT licensed.
