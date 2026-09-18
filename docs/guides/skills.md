# Skills

`@losi/skills` runs reusable, multi-step agent processes. A skill is a named,
parameterized sequence of steps; each step's output flows to the next.

## Define & run

```ts
import { SkillRunner, defineSkill } from "@losi/skills";

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

## Step types

- `tool` — invoke a named tool via the `ToolExecutor` you pass to `SkillRunner`.
- `note` — record interpolated text (no side effects).
- `checkpoint` — a named marker for pausing/branching.

## Interpolation

- `{{paramName}}` — a declared parameter.
- `{{steps.id}}` — the output of an earlier step by its `id`.

Required parameters are validated before the run starts (`resolveInputs`).

## Wire tools to MCP

The `ToolExecutor` is just `(tool, args) => result`, so point it at
[`@losi/mcp`](./mcp.md):

```ts
import { MCPRegistry } from "@losi/mcp";
const registry = new MCPRegistry();
// ...connect servers...
const runner = new SkillRunner((tool, args) => registry.callTool("github", tool, args));
```

Next: [React](./react.md).
