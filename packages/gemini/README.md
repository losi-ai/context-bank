# @losi-ai/gemini

Google Gemini adapter for [Losi Context Bank](https://github.com/marshmallow-studio/losi-context-bank). Give Gemini persistent business context, then switch models without losing it.

```bash
npm install @losi-ai/core @losi-ai/gemini @google/generative-ai
```

## Example

```ts
import { LosiContext } from "@losi-ai/core";
import { GeminiAdapter } from "@losi-ai/gemini";

const ctx = new LosiContext({
  adapter: new GeminiAdapter({ apiKey: process.env.GEMINI_API_KEY! }),
});

const res = await ctx.complete("What should I prioritize this week?");
console.log(res.content);
```

- Default model: `gemini-3.8-flash`
- Supports content generation and streaming (`ctx.stream(...)`)
- API key from `apiKey` option or the `GEMINI_API_KEY` env var
- System messages are mapped to Gemini's `systemInstruction`

MIT licensed.
