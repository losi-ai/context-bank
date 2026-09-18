/**
 * `@losi/react` — React hooks and provider for Losi Context Bank.
 *
 * Wrap your app in {@link LosiProvider}, then use the hooks to read the current
 * context snapshot, send prompts, and inspect governance — all backed by the
 * `LosiContext` class from `@losi/core`.
 *
 * @packageDocumentation
 */

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  CompletionResult,
  ContextSnapshot,
  GovernanceAction,
  EnforcementResult,
  LosiContext,
} from "@losi/core";

interface LosiReactValue {
  context: LosiContext;
}

const LosiReactContext = createContext<LosiReactValue | null>(null);

/** Props for {@link LosiProvider}. */
export interface LosiProviderProps {
  /** A configured `LosiContext` instance from `@losi/core`. */
  context: LosiContext;
  /** Your application tree. */
  children: ReactNode;
}

/**
 * Provides a {@link LosiContext} to descendant components.
 *
 * @example
 * ```tsx
 * const ctx = new LosiContext({ adapter: new OpenAIAdapter({ apiKey }) });
 *
 * export default function App() {
 *   return (
 *     <LosiProvider context={ctx}>
 *       <Chat />
 *     </LosiProvider>
 *   );
 * }
 * ```
 */
export function LosiProvider({ context, children }: LosiProviderProps): ReactNode {
  const value = useMemo<LosiReactValue>(() => ({ context }), [context]);
  return createElement(LosiReactContext.Provider, { value }, children);
}

function useLosi(): LosiReactValue {
  const value = useContext(LosiReactContext);
  if (!value) {
    throw new Error("useLosi* hooks must be used inside a <LosiProvider>");
  }
  return value;
}

/**
 * Access the underlying `LosiContext` instance and its current provider/model.
 */
export function useLosiContext(): {
  context: LosiContext;
  provider: string;
  model: string;
  snapshot: ContextSnapshot;
} {
  const { context } = useLosi();
  return {
    context,
    provider: context.provider,
    model: context.model,
    snapshot: context.getSnapshot(),
  };
}

/** State returned by {@link useLosiComplete}. */
export interface UseLosiCompleteState {
  /** Send a prompt through the current context + adapter. */
  complete: (prompt: string) => Promise<CompletionResult>;
  /** The most recent result, if any. */
  result: CompletionResult | null;
  /** Whether a request is in flight. */
  loading: boolean;
  /** The most recent error, if any. */
  error: Error | null;
}

/**
 * Send prompts with the current context injected. Tracks loading, result, and
 * error state for you.
 *
 * @example
 * ```tsx
 * const { complete, result, loading } = useLosiComplete();
 * <button onClick={() => complete("What meetings do I have?")}>Ask</button>
 * ```
 */
export function useLosiComplete(): UseLosiCompleteState {
  const { context } = useLosi();
  const [result, setResult] = useState<CompletionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const complete = useCallback(
    async (prompt: string): Promise<CompletionResult> => {
      setLoading(true);
      setError(null);
      try {
        const res = await context.complete(prompt);
        setResult(res);
        return res;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [context],
  );

  return { complete, result, loading, error };
}

/**
 * Read and write the current context snapshot. `setSnapshot` replaces the
 * stored snapshot (e.g. one restored from your own storage).
 */
export function useLosiMemory(): {
  snapshot: ContextSnapshot;
  refresh: (prompt: string) => Promise<ContextSnapshot>;
  setSnapshot: (snapshot: ContextSnapshot) => void;
} {
  const { context } = useLosi();
  const [snapshot, setLocal] = useState<ContextSnapshot>(() => context.getSnapshot());

  const refresh = useCallback(
    async (prompt: string) => {
      const next = await context.refresh(prompt);
      setLocal(next);
      return next;
    },
    [context],
  );

  const setSnapshot = useCallback(
    (next: ContextSnapshot) => {
      context.setSnapshot(next);
      setLocal(next);
    },
    [context],
  );

  return { snapshot, refresh, setSnapshot };
}

/**
 * Inspect and exercise the governance engine backing the current context.
 */
export function useLosiGovernance(): {
  enforce: (action: GovernanceAction) => EnforcementResult;
  spentFor: (agentId: string) => number;
} {
  const { context } = useLosi();
  const engine = context.governanceEngine;

  const enforce = useCallback(
    (action: GovernanceAction) => engine.enforce(action),
    [engine],
  );
  const spentFor = useCallback((agentId: string) => engine.spentFor(agentId), [engine]);

  return { enforce, spentFor };
}
