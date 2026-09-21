# @losi-ai/groq

Groq adapter for [Losi Context Bank](https://github.com/losi-ai/context-bank). Give Groq-hosted models persistent business context, then switch models without losing it.

```bash
npm install @losi-ai/core @losi-ai/groq groq-sdk
```

## Example

```ts
import { LosiContext } from "@losi-ai/core";
import { GroqAdapter } from "@losi-ai/groq";

const ctx = new LosiContext({
  adapter: new GroqAdapter({ apiKey: process.env.GROQ_API_KEY! }),
});

const res = await ctx.complete("What should I prioritize this week?");
console.log(res.content);
```

- Default model: `openai/gpt-oss-120b`
- API key from `apiKey` option or the `GROQ_API_KEY` env var
- The Groq SDK is OpenAI-compatible (chat completions + tool calling)
- Supports streaming via `ctx.stream(...)`

MIT licensed.
