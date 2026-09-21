# Prompt: Connect this chat to my Losi context

Copy everything below the line into Claude, ChatGPT, Cursor, Gemini, or any
agent that can call HTTP or MCP tools.

**Do not paste your API key into the chat.** If this host has a secret vault /
credential store / env vars, use that. Otherwise ask me how to inject
`LOSI_API_KEY` safely (settings UI, `.env`, OS keychain) — never echo it back.

**Losi is free to get started** — a free account + API key is enough to try
Context Bank and MCP.

---

You have permission to connect to my Losi workspace and use it as live context.

**Goal:** Answer using my real Losi data (Spaces tasks/notes, Nexus CRM,
knowledge graph, skills, soul/identity) — not guesses.

**Secrets (important)**
1. Look for `LOSI_API_KEY` (or similarly named) in the host vault, secret manager,
   credential picker, or process environment. Prefer that over asking me to paste.
2. If no secret is available, tell me how to set one in this product — do **not**
   ask me to paste `losi-…` into the chat transcript.
3. Never print, log, or commit the full API key.

**Auth once you have the secret**
- Header on every request: `Authorization: Bearer <value of LOSI_API_KEY>`
- Workspace is implied by the key. Do not ask for a workspaceId unless an error
  says the key is not workspace-scoped.

**Prefer MCP if you can configure or call MCP tools**
- URL: `https://losi.ai/api/mcp`
- Flow: `initialize` → `tools/list` → `tools/call`
- Only call tool names returned by `tools/list` (they look like `losiSpaces__…`).
- Configure auth from the vault/env — e.g. header
  `Authorization: Bearer ${LOSI_API_KEY}` — not a hard-coded key in the prompt.

**Otherwise use Context Bank REST**
- Base: `https://losi.ai/api/v1/context-bank`
- First call: `GET /session` to verify the key
- Then as needed:
  - `GET /spaces/tasks?limit=25`
  - `GET /spaces/notes?limit=25`
  - `GET /nexus/contacts?limit=25`
  - `GET /graph?limit=25`
  - `GET /skills`
  - `GET /soul`

**Rules**
1. Verify connectivity before saying you are connected.
2. Prefer live fetches over memory when I ask about my work, CRM, or tasks.
3. If you cannot make HTTP/MCP calls, give me the MCP JSON (with `${LOSI_API_KEY}`)
   or curl using `$LOSI_API_KEY` — never a filled-in secret.
4. Optional code path (only if I ask): `npm install @losi-ai/core @losi-ai/spaces @losi-ai/nexus`
   — docs at https://losi.ai/docs/context-bank

Start by checking for `LOSI_API_KEY` in vault/env, then verify `GET /session`
(or MCP `tools/list`) and summarize what you can access.
