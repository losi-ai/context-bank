# @losi-ai/openai

OpenAI (GPT) adapter for [Losi Context Bank](https://github.com/marshmallow-studio/losi-context-bank). Give GPT persistent business context, then switch to any other model without losing it.

```bash
npm install @losi-ai/core @losi-ai/openai openai
```

## Example

```ts
import { LosiContext } from "@losi-ai/core";
import { OpenAIAdapter } from "@losi-ai/openai";

const ctx = new LosiContext({
  adapter: new OpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY!, model: "gpt-5.6-sol" }),
});

const res = await ctx.complete("Draft a follow-up email to my last lead.");
console.log(res.content);
```

- Default model: `gpt-5.6-sol`
- Supports chat completions, function/tool calling, and streaming (`ctx.stream(...)`)
- API key from `apiKey` option or the `OPENAI_API_KEY` env var

MIT licensed.
