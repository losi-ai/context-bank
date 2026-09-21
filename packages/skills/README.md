# @losi-ai/skills

Reusable, multi-step agent **skills** for [Losi Context Bank](https://github.com/marshmallow-studio/losi-context-bank). Define parameterized skills, install them, persist them to hosted Losi, and govern save/run.

```bash
npm install @losi-ai/core @losi-ai/skills @losi-ai/governance
```

## Example

```ts
import { SkillRunner, LosiSkillStore, GovernedSkillRunner, defineSkill } from "@losi-ai/skills";
import { PolicyManager } from "@losi-ai/governance";

const outreach = defineSkill({
  name: "lead-outreach",
  parameters: [{ name: "lead", required: true }],
  steps: [
    { type: "note", id: "plan", text: "Preparing outreach for {{lead}}" },
    { type: "tool", id: "draft", tool: "draft_email", arguments: { to: "{{lead}}" } },
    { type: "checkpoint", label: "review-before-send" },
  ],
});

const store = new LosiSkillStore({ apiKey: process.env.LOSI_API_KEY! });
const gov = new PolicyManager();
gov.setPolicy("agent-1", { allowedScopes: ["skills"] });

const runner = new GovernedSkillRunner(gov, {
  agentId: "agent-1",
  store,
  executeTool: async (tool, args) => callMyTool(tool, args),
});

await runner.save(outreach);
const result = await runner.run("lead-outreach", { lead: "Ada Lovelace" });
console.log(result.finalOutput);
```

- Step types: `tool`, `note`, `checkpoint`
- Hosted saves go to Losi `workspace_skills` (same store as the app)
- Prefer workspace-scoped API keys (no separate `workspaceId`)
- Wire tools to [`@losi-ai/mcp`](../mcp) or your own executor

MIT licensed.
