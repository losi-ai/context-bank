# @losi-ai/cohere

Cohere adapter for [Losi Context Bank](https://github.com/marshmallow-studio/losi-context-bank). Give Cohere persistent business context, then switch models without losing it.

```bash
npm install @losi-ai/core @losi-ai/cohere cohere-ai
```

## Example

```ts
import { LosiContext } from "@losi-ai/core";
import { CohereAdapter } from "@losi-ai/cohere";

const ctx = new LosiContext({
  adapter: new CohereAdapter({ apiKey: process.env.COHERE_API_KEY! }),
});

const res = await ctx.complete("What should I prioritize this week?");
console.log(res.content);
```

- Default model: `command-a-plus-05-2026`
- API key from `apiKey` option or the `COHERE_API_KEY` env var
- System messages map to Cohere's `preamble`; prior turns map to `chatHistory`
- Supports streaming via `ctx.stream(...)`

MIT licensed.
