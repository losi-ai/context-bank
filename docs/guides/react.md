# React

`@losi/react` embeds Losi context in a React app: one provider, four hooks, all
backed by the `LosiContext` class.

## Provider

```tsx
import { LosiContext } from "@losi/core";
import { OpenAIAdapter } from "@losi/openai";
import { LosiProvider } from "@losi/react";

const ctx = new LosiContext({
  adapter: new OpenAIAdapter({ apiKey: process.env.NEXT_PUBLIC_OPENAI_KEY! }),
  memory: { crm: true },
});

export default function App() {
  return (
    <LosiProvider context={ctx}>
      <Chat />
    </LosiProvider>
  );
}
```

## Hooks

```tsx
import {
  useLosiContext,
  useLosiComplete,
  useLosiMemory,
  useLosiGovernance,
} from "@losi/react";

function Chat() {
  const { provider, model, snapshot } = useLosiContext();
  const { complete, result, loading, error } = useLosiComplete();
  const { refresh, setSnapshot } = useLosiMemory();
  const { enforce, spentFor } = useLosiGovernance();

  return (
    <>
      <span>{provider}/{model}</span>
      <button disabled={loading} onClick={() => complete("What's my day?")}>Ask</button>
      {result && <p>{result.content}</p>}
      {error && <p role="alert">{error.message}</p>}
    </>
  );
}
```

- `useLosiContext()` — the instance, current `provider`/`model`, and `snapshot`.
- `useLosiComplete()` — `complete(prompt)` with `result`/`loading`/`error`.
- `useLosiMemory()` — `snapshot`, `refresh(prompt)`, `setSnapshot(snapshot)`.
- `useLosiGovernance()` — `enforce(action)`, `spentFor(agentId)`.

Requires React 18+. Next: [Bindings](./bindings.md).
