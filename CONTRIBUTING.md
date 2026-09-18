# Contributing to Losi Context Bank

Thanks for helping build portable context infrastructure for LLMs. The two most valuable contributions are **new model adapters** and **new context bindings** — both are small, well-scoped additions.

## Setup

```bash
git clone https://github.com/marshmallow-studio/losi-context-bank.git
cd losi-context-bank
npm install
npm run build      # builds every package (ESM + CJS + type declarations)
npm run typecheck  # strict type-check across the monorepo
```

The repo is a TypeScript monorepo using npm workspaces. Each package lives in `packages/*`, extends the shared `tsconfig.base.json`, and builds with `tsup`.

## Adding a model adapter

An adapter is a thin translator between the portable Losi context format and a provider's API. All business logic lives in `@losi/core` — keep adapters small.

1. Create `packages/<provider>/` with a `package.json` (copy an existing adapter like `packages/gemini`), `tsup.config.ts`, and `tsconfig.json`.
2. Implement the [`LLMAdapter`](packages/core/src/types.ts) interface from `@losi/core`:

   ```ts
   import type { LLMAdapter, Message, CompletionOptions, CompletionResult } from "@losi/core";

   export class MyAdapter implements LLMAdapter {
     readonly provider = "my-provider";
     readonly model: string;

     constructor(options: { apiKey?: string; model?: string } = {}) {
       this.model = options.model ?? "my-default-model";
       // read apiKey from options or an env var; throw AdapterError if missing
     }

     async complete(messages: Message[], options?: CompletionOptions): Promise<CompletionResult> {
       // 1. map Losi `messages` + `options.system` to your provider's request shape
       // 2. call the provider SDK
       // 3. map the response back into CompletionResult
     }

     // optional but encouraged:
     async *stream(messages, options) { /* yield CompletionChunk, done:true at the end */ }
   }
   ```

3. Depend only on your provider SDK plus `@losi/core` (as a `peerDependency` + `devDependency`).
4. Add a `README.md` with install + a quick example.
5. Add the package to the table in the root `README.md`.

## Adding a context binding

Bindings (like `@losi/nexus` and `@losi/spaces`) resolve live data into context sections. Follow their pattern:

1. Implement the [`ContextBinding`](packages/core/src/binding.ts) interface: a `name`, the `scopes` it produces, and a `resolve(prompt)` that returns `ContextSection[]`.
2. Keep the live data fetch behind a single, obvious API-boundary module (see `packages/nexus/src/api.ts`). Throw `ApiBoundaryError` when the platform connection isn't configured — never silently return empty context.
3. Add an `injectIntoPrompt(prompt)` convenience method for users who aren't using the full `LosiContext` orchestrator.

## Code style

- **TypeScript strict mode** — no `any` escapes; prefer precise types.
- **JSDoc** on every exported function, class, and interface.
- **No circular dependencies** between packages.
- `@losi/core` has **zero runtime dependencies** — keep it that way.
- Adapters depend only on their provider SDK + `@losi/core`.
- Every package ships an `exports` map for ESM + CJS and emits `.d.ts`.

## Pull request process

1. Fork and branch from `main` (`feat/...` or `fix/...`).
2. Run `npm run build` and `npm run typecheck` — both must pass.
3. Update or add the relevant package `README.md` and the root package table.
4. Open a PR with a clear title (< 70 chars) and a description covering **what changed**, **what you tested**, and **anything blocked**.
5. For a new adapter or binding, note which provider/platform features are supported and which are not yet.

## Reporting bugs & requesting adapters

Use the issue templates:
- **Adapter request** — propose a new provider adapter.
- **Bug report** — package, version, repro steps, expected vs actual.

## License

By contributing, you agree your contributions are licensed under the [MIT License](LICENSE).
