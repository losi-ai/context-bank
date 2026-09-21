/**
 * Live smoke test against deployed Context Bank + MCP.
 *
 * Usage:
 *   LOSI_API_KEY=losi_... node --import tsx scripts/live-smoke.mts
 *
 * Never prints the API key.
 */

import { LosiSkillStore, defineSkill } from "../packages/skills/src/index.ts";
import { NexusApiClient, NexusBinding } from "../packages/nexus/src/index.ts";
import { SpacesApiClient, SpacesBinding } from "../packages/spaces/src/index.ts";

type Result = { name: string; ok: boolean; detail: string };

const apiKey = process.env.LOSI_API_KEY?.trim();
const baseUrl =
  process.env.BASE_URL?.trim() || "https://losi.ai/api/v1/context-bank";
const mcpUrl = process.env.MCP_URL?.trim() || "https://www.losi.one/api/mcp";

if (!apiKey) {
  console.error("FAIL: LOSI_API_KEY is required (workspace-scoped key)");
  process.exit(2);
}

const results: Result[] = [];

function record(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} — ${detail}`);
}

async function httpJson(
  path: string,
  init: RequestInit = {}
): Promise<{ status: number; body: any; text: string }> {
  const url = path.startsWith("http") ? path : `${baseUrl}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  return { status: res.status, body, text: text.slice(0, 400) };
}

function summarizeBody(body: any): string {
  if (!body || typeof body !== "object") return typeof body;
  const keys = Object.keys(body).slice(0, 8).join(",");
  if (Array.isArray(body.skills)) return `skills=${body.skills.length}`;
  if (Array.isArray(body.items)) return `items=${body.items.length}`;
  if (Array.isArray(body.nodes)) return `nodes=${body.nodes.length}`;
  if (Array.isArray(body.contacts)) return `contacts=${body.contacts.length}`;
  if (Array.isArray(body.tasks)) return `tasks=${body.tasks.length}`;
  return `keys=${keys}`;
}

async function main() {
  console.log(`baseUrl=${baseUrl}`);
  console.log(`mcpUrl=${mcpUrl}`);
  console.log(`keyPresent=true keyLen=${apiKey!.length}`);

  // 1) Session — workspace implied by key
  {
    const { status, body, text } = await httpJson("/session");
    const ws =
      body?.workspaceId || body?.workspace_id || body?.workspace?.id || null;
    record(
      "GET /session",
      status === 200 && Boolean(ws),
      status === 200 ? `workspace=${ws}` : `HTTP ${status} ${text}`
    );
  }

  // 2) Pathless spaces / nexus / graph / soul / skills
  for (const [name, path] of [
    ["GET /spaces/tasks", "/spaces/tasks?limit=5"],
    ["GET /nexus/contacts", "/nexus/contacts?limit=5"],
    ["GET /graph", "/graph?limit=5"],
    ["GET /soul", "/soul"],
    ["GET /skills", "/skills"],
  ] as const) {
    const { status, body, text } = await httpJson(path);
    record(
      name,
      status === 200,
      status === 200 ? summarizeBody(body) : `HTTP ${status} ${text}`
    );
  }

  // 3) SDK LosiSkillStore list + save + delete roundtrip
  const store = new LosiSkillStore({ apiKey: apiKey!, baseUrl });
  try {
    const before = await store.list();
    record("LosiSkillStore.list", true, `count=${before.length}`);

    const smokeName = `cb-smoke-${Date.now()}`;
    const saved = await store.save(
      defineSkill({
        name: smokeName,
        description: "Temporary smoke skill — safe to delete",
        parameters: [{ name: "x", required: false }],
        steps: [{ type: "note", id: "n1", text: "hello {{x}}" }],
      })
    );
    record(
      "LosiSkillStore.save",
      Boolean(saved?.id || saved?.name),
      `name=${saved?.name} id=${saved?.id ?? "none"}`
    );

    const loaded = await store.load(smokeName);
    record(
      "LosiSkillStore.load",
      Boolean(loaded),
      loaded ? `found id=${loaded.id ?? "none"}` : "not found"
    );

    if (saved?.id || loaded?.id) {
      const id = (saved.id || loaded!.id)!;
      await store.delete(id);
      const after = await store.load(smokeName);
      record("LosiSkillStore.delete", after == null, after ? "still present" : "gone");
    } else if (saved?.name) {
      await store.delete(saved.name);
      record("LosiSkillStore.delete", true, "deleted by name");
    }
  } catch (err: any) {
    record("LosiSkillStore.roundtrip", false, err?.message || String(err));
  }

  // 4) SDK API clients (pathless)
  try {
    const nexus = new NexusApiClient({ apiKey: apiKey!, baseUrl });
    const data = await nexus.fetchResource<{ contacts?: unknown[] }>("contacts", {
      limit: "3",
    });
    record(
      "NexusApiClient.contacts",
      true,
      `contacts=${Array.isArray(data?.contacts) ? data.contacts.length : summarizeBody(data)}`
    );
  } catch (err: any) {
    record("NexusApiClient.contacts", false, err?.message || String(err));
  }

  try {
    const spaces = new SpacesApiClient({ apiKey: apiKey!, baseUrl });
    const data = await spaces.fetchResource<{ tasks?: unknown[] }>("tasks", {
      limit: "3",
    });
    record(
      "SpacesApiClient.tasks",
      true,
      `tasks=${Array.isArray(data?.tasks) ? data.tasks.length : summarizeBody(data)}`
    );
  } catch (err: any) {
    record("SpacesApiClient.tasks", false, err?.message || String(err));
  }

  // 5) Bindings resolve without workspaceId
  try {
    const nexus = new NexusBinding({
      apiKey: apiKey!,
      baseUrl,
      crm: true,
      bookings: false,
    });
    const sections = await nexus.resolve("smoke");
    record(
      "NexusBinding.resolve",
      Array.isArray(sections),
      `sections=${sections.length}`
    );
  } catch (err: any) {
    record("NexusBinding.resolve", false, err?.message || String(err));
  }

  try {
    const spaces = new SpacesBinding({
      apiKey: apiKey!,
      baseUrl,
      tasks: true,
    });
    const sections = await spaces.resolve("smoke");
    record(
      "SpacesBinding.resolve",
      Array.isArray(sections),
      `sections=${sections.length}`
    );
  } catch (err: any) {
    record("SpacesBinding.resolve", false, err?.message || String(err));
  }

  // 6) MCP tools/list without workspaceId
  try {
    const res = await fetch(mcpUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      }),
    });
    const text = await res.text();
    let body: any = null;
    try {
      body = JSON.parse(text);
    } catch {
      // SSE framing — pull first data line if present
      const dataLine = text
        .split("\n")
        .find((l) => l.startsWith("data: "));
      if (dataLine) {
        try {
          body = JSON.parse(dataLine.slice(6));
        } catch {
          body = { raw: text.slice(0, 300) };
        }
      } else {
        body = { raw: text.slice(0, 300) };
      }
    }
    const tools = body?.result?.tools || body?.tools;
    record(
      "MCP tools/list",
      res.status === 200 && Array.isArray(tools),
      res.status === 200
        ? `tools=${Array.isArray(tools) ? tools.length : "n/a"}`
        : `HTTP ${res.status} ${text.slice(0, 200)}`
    );
  } catch (err: any) {
    record("MCP tools/list", false, err?.message || String(err));
  }

  const failed = results.filter((r) => !r.ok);
  console.log("\n--- summary ---");
  console.log(`pass=${results.length - failed.length} fail=${failed.length}`);
  if (failed.length) {
    for (const f of failed) console.log(`  • ${f.name}: ${f.detail}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("UNCAUGHT", err);
  process.exit(1);
});
