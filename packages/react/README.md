# @losi-ai/react

React provider and hooks for [Losi Context Bank](https://github.com/marshmallow-studio/losi-context-bank). Embed persistent LLM context, memory, and governance in any React app.

```bash
npm install @losi-ai/core @losi-ai/react react
```

## Example

```tsx
import { LosiContext } from "@losi-ai/core";
import { OpenAIAdapter } from "@losi-ai/openai";
import { LosiProvider, useLosiComplete } from "@losi-ai/react";

const ctx = new LosiContext({
  adapter: new OpenAIAdapter({ apiKey: process.env.NEXT_PUBLIC_OPENAI_KEY! }),
  memory: { crm: true },
});

function Chat() {
  const { complete, result, loading } = useLosiComplete();
  return (
    <div>
      <button disabled={loading} onClick={() => complete("What's my day look like?")}>
        Ask
      </button>
      {result && <p>{result.content}</p>}
    </div>
  );
}

export default function App() {
  return (
    <LosiProvider context={ctx}>
      <Chat />
    </LosiProvider>
  );
}
```

## Hooks

- `useLosiContext()` — the context instance, current `provider`, `model`, and `snapshot`
- `useLosiComplete()` — `complete(prompt)` plus `result`, `loading`, `error`
- `useLosiMemory()` — `snapshot`, `refresh(prompt)`, `setSnapshot(snapshot)`
- `useLosiGovernance()` — `enforce(action)`, `spentFor(agentId)`

Requires React 18+. MIT licensed.
