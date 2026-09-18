# @losi/mistral

Mistral AI adapter for [Losi Context Bank](https://github.com/marshmallow-studio/losi-context-bank). Give Mistral persistent business context, then switch models without losing it.

```bash
npm install @losi/core @losi/mistral @mistralai/mistralai
```

## Example

```ts
import { LosiContext } from "@losi/core";
import { MistralAdapter } from "@losi/mistral";

const ctx = new LosiContext({
  adapter: new MistralAdapter({ apiKey: process.env.MISTRAL_API_KEY! }),
});

const res = await ctx.complete("What should I prioritize this week?");
console.log(res.content);
```

- Default model: `mistral-large-latest`
- API key from `apiKey` option or the `MISTRAL_API_KEY` env var
- Supports streaming via `ctx.stream(...)`

MIT licensed.
