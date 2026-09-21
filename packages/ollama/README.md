# @losi-ai/ollama

Local [Ollama](https://ollama.com) adapter for [Losi Context Bank](https://github.com/losi-ai/context-bank). Give your local models persistent business context, then switch models without losing it — no cloud, no API key.

```bash
npm install @losi-ai/core @losi-ai/ollama ollama
```

## Example

```ts
import { LosiContext } from "@losi-ai/core";
import { OllamaAdapter } from "@losi-ai/ollama";

const ctx = new LosiContext({
  adapter: new OllamaAdapter({ model: "llama3.2" }),
});

const res = await ctx.complete("What should I prioritize this week?");
console.log(res.content);
```

- Default model: `llama3.2`
- Default host: `http://127.0.0.1:11434` (override with the `host` option)
- No API key required — talks to your local Ollama server
- Supports streaming via `ctx.stream(...)`

MIT licensed.
