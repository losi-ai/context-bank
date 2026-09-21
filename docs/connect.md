# Connect Losi context to any LLM

**Losi is free to get started.** Create an account at [losi.ai](https://losi.ai),
make a workspace-scoped API key (Profile → API Access), and connect — no paid
plan required to try MCP, Context Bank REST, or the open-source SDK.

You do **not** need the TypeScript SDK to use Losi context. Pick a path:

| Path | Best for | Needs |
| --- | --- | --- |
| **MCP** | Claude Desktop, Cursor, Codex, other MCP clients | Key in vault / env |
| **REST API** | Any model/tool that can `fetch` / `curl` | Key in vault / env |
| **Agent skill** | Cursor / Claude Code skill installs | This repo’s `SKILL.md` |
| **Copy-paste prompt** | ChatGPT / Claude / Gemini web chats | Copy the prompt in; key from vault/env |
| **SDK (`@losi-ai/*`)** | Apps you ship in Node/React | `process.env.LOSI_API_KEY` |

## Secrets (read this)

**Do not paste `losi-…` keys into chat prompts, tickets, or README examples that
get copied into LLMs.**

1. Store the key in the host **vault** / secret manager when available (Cursor
   Private vault, Claude project secrets, 1Password, OS keychain, etc.).
2. Otherwise use the environment variable **`LOSI_API_KEY`**.
3. Wire MCP / CLI to `${LOSI_API_KEY}` / `$LOSI_API_KEY` — never a literal key.

Create a **workspace-scoped** key (free to start): [losi.ai](https://losi.ai) →
Profile → API Access. Format `losi-…`. The workspace is implied — no
`workspaceId` in normal calls.

Public product docs: https://losi.ai/docs/context-bank

---

## 1. MCP (recommended for agents)

**URL:** `https://losi.ai/api/mcp`  
**Auth:** `Authorization: Bearer` + value from vault/env.

### Cursor / Claude Desktop

```json
{
  "mcpServers": {
    "losi": {
      "url": "https://losi.ai/api/mcp",
      "headers": {
        "Authorization": "Bearer ${LOSI_API_KEY}"
      }
    }
  }
}
```

Set `LOSI_API_KEY` in the host’s secret/env UI first. Tools are listed as
`losiSpaces__…`. Workspace comes from the key.

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
| GET | `/soul` | Losi identity for the workspace |

```bash
# Key from env / vault — not from the chat transcript
curl -sS https://losi.ai/api/v1/context-bank/session \
  -H "Authorization: Bearer $LOSI_API_KEY"
curl -sS 'https://losi.ai/api/v1/context-bank/spaces/tasks?limit=10' \
  -H "Authorization: Bearer $LOSI_API_KEY"
```

---

## 3. Installable agent skill

```bash
npx skills add losi-ai/context-bank --skill connect-losi-context
```

- Page: https://skills.sh/losi-ai/context-bank/connect-losi-context  
- Source: [`skills/connect-losi-context/SKILL.md`](../skills/connect-losi-context/SKILL.md)

The skill prefers vault/env, then MCP, then REST — and never asks you to paste
the key into chat.

---

## 4. Copy-paste prompt (any chat LLM)

Copy-paste [`prompts/connect-losi-context.md`](../prompts/connect-losi-context.md)
into the chat — that’s the point.

Keep the **API key** out of the message: vault / `LOSI_API_KEY` only. The prompt
already instructs the model that way. If it cannot call tools/HTTP, it should
return MCP JSON / curl using `$LOSI_API_KEY` placeholders.

---

## 5. SDK (optional)

```bash
npm install @losi-ai/core @losi-ai/spaces @losi-ai/nexus @losi-ai/skills
```

Pass `apiKey: process.env.LOSI_API_KEY` (or your vault bridge) — see the
[README](../README.md) and [hosted.md](./hosted.md).
