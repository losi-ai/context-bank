# Prompt: Connect this chat to my Losi context

**Copy-paste** everything below the line into Claude, ChatGPT, Cursor, Gemini,
or any agent that can call HTTP or MCP tools.

**Key advice (not about the prompt):** do not paste your API key into the chat.
If this host has a secret vault / credential store / env vars, use
`LOSI_API_KEY` from there. Otherwise ask how to set it in settings / `.env` /
keychain — never echo the key back.

**Losi is free to get started** — a free account + API key is enough to try
Context Bank and MCP.

**Full agent skills (recommended):** `npx skills add losi-ai/context-bank --all`
installs `connect-losi-context`, `use-losi-context`, `store-losi-context`, and
`migrate-to-losi-context`. Skills + MCP:
`curl -fsSL https://raw.githubusercontent.com/losi-ai/context-bank/main/scripts/install-with-mcp.sh | bash`

---

You have permission to connect to my Losi workspace and use it as live context.

**Goal:** Answer using my real Losi data (Spaces tasks/notes/events/sheets,
Space memories, Nexus CRM, knowledge graph, skills, soul/identity,
personal/workspace memories) — not guesses.

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
- Only call tool names returned by `tools/list`. Families look like:
  - `losiSpaces__*` — Spaces + Space memories / Space Reference Memories
  - `losiNexus__run` — Nexus CRM (needs Nexus subscription)
  - `losiContext__search` — **whole-bank search** (prefer this first)
  - `losiContext__session` / `graph` / `soul` / `skills_list`
  - `losiMemory__*` — personal + workspace memories
- Configure auth from vault/env — e.g. `Authorization: Bearer ${LOSI_API_KEY}` —
  not a hard-coded key in the prompt.

**Otherwise use Context Bank REST**
- Base: `https://losi.ai/api/v1/context-bank`
- First: `GET /session`
- Prefer: `GET /search?q=&limit=&types=` for workspace-wide lookup
- Then as needed:
  - `GET /spaces/{tasks|notes|events|sheets}`
  - `GET /nexus/{contacts|leads|companies|opportunities|activities|campaigns|bookings|conversations}`
  - `GET /memories/{personal|workspace}`
  - `GET /graph`
  - `GET/POST /skills`, `POST /skills/{id}/run`
  - `GET /soul`

**Rules**
1. Verify connectivity before saying you are connected.
2. Prefer live fetches / search over guessing when I ask about my work, CRM, or tasks.
3. On first connect, ask once if I want to migrate notes/prefs into Context Bank.
4. Persist durable facts I teach you (memories/skills) when appropriate.
5. If you cannot make HTTP/MCP calls, give me the MCP JSON (with `${LOSI_API_KEY}`)
   or curl using `$LOSI_API_KEY` — never a filled-in secret.
6. Optional code path (only if I ask): `npm install @losi-ai/core @losi-ai/spaces @losi-ai/nexus @losi-ai/skills`
   — docs at https://losi.ai/docs/context-bank

Start by checking for `LOSI_API_KEY` in vault/env, then verify `GET /session`
(or MCP `tools/list` / `losiContext__search`), and summarize what you can access.
