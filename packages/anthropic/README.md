# @losi-ai/anthropic

Anthropic (Claude) adapter for [Losi Context Bank](https://github.com/marshmallow-studio/losi-context-bank). Give Claude persistent business context, then switch models without losing it.

```bash
npm install @losi-ai/core @losi-ai/anthropic @anthropic-ai/sdk
```

## Example

```ts
import { LosiContext } from "@losi-ai/core";
import { AnthropicAdapter } from "@losi-ai/anthropic";

const ctx = new LosiContext({
  adapter: new AnthropicAdapter({ apiKey: process.env.ANTHROPIC_API_KEY! }),
});

const res = await ctx.complete("Summarize my open opportunities.");
console.log(res.content);
```

- Default model: `claude-sonnet-5`
- Supports messages, tool use, and streaming (`ctx.stream(...)`)
- API key from `apiKey` option or the `ANTHROPIC_API_KEY` env var
- System messages are automatically hoisted to Anthropic's top-level `system` field

MIT licensed.
