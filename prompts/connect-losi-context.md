# Prompt: Connect this chat to my Losi context

Copy everything below the line into Claude, ChatGPT, Cursor, Gemini, or any
agent that can call HTTP or MCP tools. Replace `losi-YOUR_KEY` with a
**workspace-scoped** key from https://losi.ai (Profile → API Access).

**Losi is free to get started** — a free account + API key is enough to try
Context Bank and MCP.

---

You have permission to connect to my Losi workspace and use it as live context.

**Goal:** Answer using my real Losi data (Spaces tasks/notes, Nexus CRM,
knowledge graph, skills, soul/identity) — not guesses.

**Auth**
- API key: `losi-YOUR_KEY`
- Header on every request: `Authorization: Bearer losi-YOUR_KEY`
- Workspace is implied by the key. Do not ask me for a workspaceId unless an
  error says the key is not workspace-scoped.

**Prefer MCP if you can configure or call MCP tools**
- URL: `https://losi.ai/api/mcp`
- Flow: `initialize` → `tools/list` → `tools/call`
- Only call tool names returned by `tools/list` (they look like `losiSpaces__…`).

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
3. Never echo or store my full API key in your reply.
4. If you cannot make HTTP/MCP calls, tell me clearly and give me the Cursor /
   Claude MCP JSON config or the curl commands instead.
5. Optional code path (only if I ask): `npm install @losi-ai/core @losi-ai/spaces @losi-ai/nexus`
   — docs at https://losi.ai/docs/context-bank

Start by verifying `GET /session` (or MCP `tools/list`) and summarize what you
can access.
