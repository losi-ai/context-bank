# Skills

`@losi-ai/skills` runs reusable, multi-step agent processes. A skill is a named,
parameterized sequence of steps; each step's output flows to the next.

> Note: this package is the **executable procedure** runner (tool/note/checkpoint
> steps). GitHub `SKILL.md` package installs in the Losi app live in
> `skill_integrations` and are installed via the Integrations / Tools UI.

## Define & run

```ts
import { SkillRunner, defineSkill } from "@losi-ai/skills";

const outreach = defineSkill({
  name: "lead-outreach",
  parameters: [{ name: "lead", required: true }],
  steps: [
    { type: "note", id: "plan", text: "Preparing outreach for {{lead}}" },
    { type: "tool", id: "draft", tool: "draft_email", arguments: { to: "{{lead}}" } },
    { type: "checkpoint", label: "review-before-send" },
  ],
});

const runner = new SkillRunner(async (tool, args) => callMyTool(tool, args));
runner.install(outreach);

const result = await runner.run("lead-outreach", { lead: "Ada Lovelace" });
result.finalOutput;
```

## Persist to hosted Losi (workspace_skills)

Prefer a **workspace-scoped** API key so you do not pass `workspaceId`:

```ts
import { SkillRunner, LosiSkillStore, defineSkill } from "@losi-ai/skills";

const store = new LosiSkillStore({ apiKey: process.env.LOSI_API_KEY! });
const runner = new SkillRunner({
  executeTool: (tool, args) => callMyTool(tool, args),
  store,
});

await runner.save(defineSkill({ name: "lead-outreach", steps: [...] }));
await runner.installFromStore();
```

Saved skills land in the same `workspace_skills` table as Nexus / AgentSkills.
Visibility is `private` (creator) or `workspace` (members).

## Govern save & run

```ts
import { PolicyManager, LosiAuditSink } from "@losi-ai/governance";
import { GovernedSkillRunner, LosiSkillStore } from "@losi-ai/skills";

const gov = new PolicyManager(
  new LosiAuditSink({ apiKey: process.env.LOSI_API_KEY!, workspaceId: "..." }),
);
gov.setPolicy("agent-1", {
  blockedActions: [],
  allowedScopes: ["skills", "crm"],
});

const runner = new GovernedSkillRunner(gov, {
  agentId: "agent-1",
  store: new LosiSkillStore({ apiKey: process.env.LOSI_API_KEY! }),
  executeTool: (tool, args) => callMyTool(tool, args),
});
```

## Inject skills into context

```ts
import { formatSkillsContextSection } from "@losi-ai/skills";

await ctx.remember(formatSkillsContextSection(await store.list()), {
  label: "Available skills",
  scope: "skills",
});
```

## Step types

- `tool` — invoke a named tool via the `ToolExecutor` you pass to `SkillRunner`.
- `note` — record interpolated text (no side effects).
- `checkpoint` — a named marker for pausing/branching.

## Interpolation

- `{{paramName}}` — a declared parameter.
- `{{steps.id}}` — the output of an earlier step by its `id`.

Required parameters are validated before the run starts (`resolveInputs`).

Next: [Governance](./governance.md).
