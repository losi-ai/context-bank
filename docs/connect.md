# Connect Losi context to any LLM

You do **not** need the TypeScript SDK to use Losi context. Pick a path:

| Path | Best for | Needs |
| --- | --- | --- |
| **MCP** | Claude Desktop, Cursor, Codex, other MCP clients | Workspace API key |
| **REST API** | Any model/tool that can `fetch` / `curl` | Workspace API key |
| **Agent skill** | Cursor / Claude Code skill installs | This repo’s `SKILL.md` |
| **Copy-paste prompt** | ChatGPT / Claude / Gemini web chats | Paste + key |
| **SDK (`@losi-ai/*`)** | Apps you ship in Node/React | npm install |

Create a **workspace-scoped** key: [losi.ai](https://losi.ai) → Profile → API Access.  
Format `losi-…`. The workspace is implied — no `workspaceId` in normal calls.

Public product docs: https://losi.ai/docs/context-bank

---

## 1. MCP (recommended for agents)

**URL:** `https://losi.ai/api/mcp`  
**Auth:** `Authorization: Bearer losi-…`

### Cursor / Claude Desktop

```json
{
  "mcpServers": {
    "losi": {
      "url": "https://losi.ai/api/mcp",
      "headers": {
        "Authorization": "Bearer losi-YOUR_KEY"
      }
    }
  }
}
```

Then ask the agent to list tools and use `losiSpaces__*` actions (tasks, notes,
files, etc.). The server injects the key’s workspace automatically.

### Raw JSON-RPC sketch

```bash
curl -sS https://losi.ai/api/mcp \
  -H "Authorization: Bearer $LOSI_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

---

## 2. Context Bank REST API

**Base:** `https://losi.ai/api/v1/context-bank`

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/session` | Workspace bound to the key |
| GET | `/spaces/{tasks\|notes\|events\|sheets}` | Spaces data |
| GET | `/nexus/{contacts\|bookings\|conversations}` | CRM data |
| GET | `/graph` | Knowledge graph |
| GET/POST | `/skills` | List / save skills |
| GET/PATCH/DELETE | `/skills/{id}` | Manage a skill |
| POST | `/skills/{id}/run` | Run a skill |
| GET | `/soul` | Losi identity / soul for the workspace |

```bash
export LOSI_API_KEY=losi-…
curl -sS https://losi.ai/api/v1/context-bank/session \
  -H "Authorization: Bearer $LOSI_API_KEY"
curl -sS 'https://losi.ai/api/v1/context-bank/spaces/tasks?limit=10' \
  -H "Authorization: Bearer $LOSI_API_KEY"
```

Same payloads the `@losi-ai/spaces` / `@losi-ai/nexus` / `@losi-ai/skills`
packages consume — you can drive them from Python, Go, shell, or a custom agent.

---

## 3. Installable agent skill

Skill path in this repo:

[`skills/connect-losi-context/SKILL.md`](../skills/connect-losi-context/SKILL.md)

Install into Cursor / compatible skill hosts (examples):

```bash
# From GitHub (after clone or via skills CLI if you publish the path)
npx skills add losi-ai/context-bank/skills/connect-losi-context
```

Or copy the folder into your project’s `.cursor/skills/connect-losi-context/`.

The skill teaches the agent to prefer MCP, fall back to REST, verify `/session`,
and never leak the API key.

---

## 4. One-shot prompt (any chat LLM)

Open [`prompts/connect-losi-context.md`](../prompts/connect-losi-context.md),
paste into the chat, replace `losi-YOUR_KEY`, and send.

If the model can call tools/HTTP, it will connect itself. If not, it should
return the MCP JSON or curl commands for you to run.

---

## 5. SDK (optional)

```bash
npm install @losi-ai/core @losi-ai/spaces @losi-ai/nexus @losi-ai/skills
```

See the [README](../README.md) and [hosted.md](./hosted.md).
