# Resilience

Model APIs fail — rate limits, timeouts, transient 5xxs. `@losi/core` ships
retry with backoff and a provider fallback chain.

## Retry any operation

```ts
import { withRetry } from "@losi/core";

const res = await withRetry(() => adapter.complete(messages), {
  maxAttempts: 4,
  baseDelayMs: 250,
  factor: 2,          // exponential
  jitter: true,       // avoid thundering herds
  isRetryable: (e) => !String(e).includes("401"), // fail fast on auth errors
  onRetry: ({ attempt, delayMs }) => console.warn(`retry ${attempt} in ${delayMs}ms`),
});
```

## Provider fallback chain

`FallbackAdapter` implements `LLMAdapter`, so it drops into a `LosiContext`
anywhere an adapter goes. It tries adapters in order, retrying each, and fails
over to the next on error — transparently.

```ts
import { LosiContext, FallbackAdapter } from "@losi/core";
import { OpenAIAdapter } from "@losi/openai";
import { AnthropicAdapter } from "@losi/anthropic";
import { GroqAdapter } from "@losi/groq";

const adapter = new FallbackAdapter(
  [
    new OpenAIAdapter({ apiKey: a }),
    new AnthropicAdapter({ apiKey: b }),
    new GroqAdapter({ apiKey: c }),
  ],
  {
    retry: { maxAttempts: 2 },
    onFallback: ({ from, to, error }) => console.warn(`${from} failed → ${to}`, error),
  },
);

const ctx = new LosiContext({ adapter });
// If OpenAI is down, this silently fails over to Claude, then Groq.
// The context snapshot is unchanged across the failover.
```

Because fallback is just another adapter, the context, governance, and graph
all behave identically no matter which provider ultimately answers. Next:
[Governance](./governance.md).
