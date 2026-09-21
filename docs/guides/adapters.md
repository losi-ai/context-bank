# Adapters

An adapter implements `LLMAdapter` from `@losi/core` — a thin translator
between the portable Losi format and a provider's API. Because every adapter
shares one interface, switching models is `ctx.switchAdapter(...)`.

## Available adapters

| Package | Provider | Default model | Env var |
| --- | --- | --- | --- |
| `@losi/openai` | OpenAI | `gpt-5.6-sol` | `OPENAI_API_KEY` |
| `@losi/anthropic` | Anthropic | `claude-sonnet-5` | `ANTHROPIC_API_KEY` |
| `@losi/gemini` | Google Gemini | `gemini-3.8-flash` | `GEMINI_API_KEY` |
| `@losi/mistral` | Mistral | `mistral-large-latest` | `MISTRAL_API_KEY` |
| `@losi/cohere` | Cohere | `command-a-plus-05-2026` | `COHERE_API_KEY` |
| `@losi/groq` | Groq | `openai/gpt-oss-120b` | `GROQ_API_KEY` |
| `@losi/ollama` | Ollama (local) | `llama3.2` | none (host `127.0.0.1:11434`) |

All accept `{ apiKey?, model?, client? }` (Ollama: `{ host?, model?, client? }`)
and support `complete()` + `stream()`. Defaults above were refreshed against
official provider docs (OpenAI, Anthropic, Google AI, Mistral, Cohere, Groq)
as of 2026-09-20. Pass `model:` to override anytime.

## Use one

```ts
import { LosiContext } from "@losi/core";
import { GroqAdapter } from "@losi/groq";

const ctx = new LosiContext({ adapter: new GroqAdapter({ apiKey: process.env.GROQ_API_KEY! }) });
await ctx.complete("Hello");
```

## Local, no key (Ollama)

```ts
import { OllamaAdapter } from "@losi/ollama";
const ctx = new LosiContext({ adapter: new OllamaAdapter({ model: "llama3.2" }) });
```

## Write your own

Implement three things: `provider`, `model`, and `complete()` (add `stream()`
if the provider supports it).

```ts
import type { LLMAdapter, Message, CompletionOptions, CompletionResult } from "@losi/core";
import { AdapterError } from "@losi/core";

export class MyAdapter implements LLMAdapter {
  readonly provider = "my-provider";
  readonly model: string;
  constructor(opts: { apiKey?: string; model?: string } = {}) {
    this.model = opts.model ?? "my-default";
    if (!(opts.apiKey ?? process.env.MY_API_KEY)) throw new AdapterError("API key required");
  }
  async complete(messages: Message[], options?: CompletionOptions): Promise<CompletionResult> {
    // 1. map messages + options.system → provider request
    // 2. call the provider SDK
    // 3. map response → { content, model, usage?, finishReason? }
    return { content: "...", model: this.model };
  }
}
```

See CONTRIBUTING.md for the full adapter checklist. Adapters depend only on
their provider SDK + `@losi/core`.
