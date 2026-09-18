# @losi/skills

Reusable, multi-step agent **skills** for [Losi Context Bank](https://github.com/marshmallow-studio/losi-context-bank). Define parameterized skills, install them, and run them — each step's output flows to the next.

```bash
npm install @losi/core @losi/skills
```

## Example

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
console.log(result.finalOutput);
```

- Step types: `tool`, `note`, `checkpoint`
- Reference parameters with `{{param}}` and prior step outputs with `{{steps.id}}`
- Wire the `ToolExecutor` to [`@losi/mcp`](../mcp) or your own tools

MIT licensed.
