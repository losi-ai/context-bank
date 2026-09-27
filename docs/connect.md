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
**Auth:** `Authorization: Bearer` + workspace-scoped `losi-…` key (vault/env).

Any host that can attach a **remote HTTPS MCP server** can use Losi. One
endpoint — Claude, ChatGPT (Developer Mode connectors), Cursor, Codex, Gemini
CLI / Enterprise, Windsurf, etc. Consumer Gemini web/app usually cannot; use
CLI/Enterprise or REST/skills instead.

| Host | How to add Losi |
| --- | --- |
| **Cursor** | Bundle installer, or paste into `.cursor/mcp.json` / Settings → MCP |
| **Claude Desktop / Claude.ai** | Settings → Connectors (or `claude_desktop_config.json` `mcpServers`) |
| **Claude Code** | `claude mcp add` / config JSON with the URL + Bearer header |
| **ChatGPT** | Settings → Apps → Developer mode → add connector/app with URL `https://losi.ai/api/mcp` + API key auth when prompted |
| **Gemini CLI** | `~/.gemini/settings.json` → `mcpServers.losi.httpUrl` (+ headers) |
| **Gemini Enterprise** | Admin adds remote MCP connector in Google Cloud (same URL) |
| **Codex / other MCP clients** | Same remote URL + Bearer header |
| **Web Gemini / plain chat UIs without MCP** | Use [REST](#2-context-bank-rest-api) or the [copy-paste prompt](#4-copy-paste-prompt) |

### Cursor / Claude Desktop style config

```json
{
  "mcpServers": {
    "losi": {
      "url": "https://losi.ai/api/mcp",
      "headers": {
        "Authorization": "Bearer ${env:LOSI_API_KEY}"
      }
    }
  }
}
```

Some hosts use `httpUrl` instead of `url`, or a UI field for “Connector URL”
plus a separate API-key / Authorization field — paste the same endpoint and
Bearer token. Never put the raw `losi-…` key in a skill prompt or shared doc.

Set `LOSI_API_KEY` in the host’s secret/env UI first. Tools appear as
`losiSpaces__…`, `losiNexus__run`, `losiContext__*`, `losiMemory__*`.
Workspace comes from the key.

### Skills vs MCP

- **MCP** = live tools against your workspace (any MCP-capable host).
- **skills.sh skills** = procedural playbooks (`connect` / `use` / `store` /
  `migrate`) — install where the agent supports skills (Cursor, Claude Code,
  Codex, …). They tell the model *how* to use MCP; they do not replace MCP.

Install skills from [skills.sh/losi-ai/context-bank](https://skills.sh/losi-ai/context-bank)
and paste the MCP JSON above into your host — do not pipe remote install scripts into a shell.

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
| GET | `/session` |
| GET | `/search?q=&limit=&types=` | Workspace-wide search | Workspace bound to the key |
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

## 3. Installable agent skills (+ MCP)

skills.sh installs **skills** (procedural agent knowledge). MCP registration is
a separate host config — paste the JSON from [§1 MCP](#1-mcp-recommended-for-agents).

Install the pack from the registry (run this yourself in a terminal — don't ask
the agent to fetch remote installers at runtime):

```bash
npx skills add losi-ai/context-bank --all
```

Optional helper that also merges MCP config into Cursor/Claude:

```bash
bash scripts/install-with-mcp.sh
# or clone the repo and run the script locally — avoid curl | bash when possible
```

| Skill | Purpose |
| --- | --- |
| [`connect-losi-context`](../skills/connect-losi-context/SKILL.md) | Wire MCP/REST + vault key; load siblings when missing |
| [`losi-use-context`](../skills/losi-use-context/SKILL.md) | Autonomously read Spaces / Nexus / graph / search / skills / soul / memories |
| [`losi-store-context`](../skills/losi-store-context/SKILL.md) | Autonomously write durable facts back into the bank |
| [`losi-migrate-context`](../skills/losi-migrate-context/SKILL.md) | On first use, ask whether to migrate local notes/prefs into Losi |

Pack: https://skills.sh/losi-ai/context-bank  

All prefer vault/env for `LOSI_API_KEY` — never paste the key into chat.

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
