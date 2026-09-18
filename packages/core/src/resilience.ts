/**
 * Resilience utilities: retry with exponential backoff, and a provider
 * fallback chain.
 *
 * Model APIs fail — rate limits, timeouts, transient 5xxs. {@link withRetry}
 * retries any async operation with jittered exponential backoff.
 * {@link FallbackAdapter} wraps an ordered list of adapters and moves to the
 * next provider when one fails, so a hiccup at one vendor doesn't take you down.
 *
 * @packageDocumentation
 */

import type {
  CompletionChunk,
  CompletionOptions,
  CompletionResult,
  LLMAdapter,
  Message,
} from "./types.js";
import { LosiError } from "./errors.js";

/** Options controlling {@link withRetry}. */
export interface RetryOptions {
  /** Maximum attempts (including the first). Defaults to 3. */
  maxAttempts?: number;
  /** Base delay in ms for the first backoff. Defaults to 250. */
  baseDelayMs?: number;
  /** Maximum delay in ms between attempts. Defaults to 8000. */
  maxDelayMs?: number;
  /** Multiplier applied each attempt. Defaults to 2 (exponential). */
  factor?: number;
  /** Add random jitter (0..delay) to avoid thundering herds. Defaults to true. */
  jitter?: boolean;
  /**
   * Decide whether an error is retryable. Defaults to retrying everything.
   * Return false to fail fast (e.g. on a 400/auth error).
   */
  isRetryable?: (error: unknown) => boolean;
  /** Called before each retry with the upcoming attempt number and delay. */
  onRetry?: (info: { attempt: number; delayMs: number; error: unknown }) => void;
  /** Abort signal to cancel between attempts. */
  signal?: AbortSignal;
}

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new LosiError("ABORTED", "Operation aborted"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new LosiError("ABORTED", "Operation aborted"));
      },
      { once: true },
    );
  });

/**
 * Run an async operation with exponential backoff.
 *
 * @param operation - The async function to attempt. Receives the attempt number (1-based).
 * @param options - Retry configuration.
 * @returns The operation's resolved value.
 * @throws The last error if all attempts fail (or immediately if not retryable).
 *
 * @example
 * ```ts
 * const res = await withRetry(() => adapter.complete(messages), { maxAttempts: 4 });
 * ```
 */
export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 250;
  const maxDelayMs = options.maxDelayMs ?? 8000;
  const factor = options.factor ?? 2;
  const jitter = options.jitter ?? true;
  const isRetryable = options.isRetryable ?? (() => true);

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !isRetryable(error)) break;

      const exp = baseDelayMs * factor ** (attempt - 1);
      const capped = Math.min(exp, maxDelayMs);
      const delayMs = jitter ? Math.random() * capped : capped;
      options.onRetry?.({ attempt: attempt + 1, delayMs, error });
      await sleep(delayMs, options.signal);
    }
  }
  throw lastError;
}

/** Options for {@link FallbackAdapter}. */
export interface FallbackAdapterOptions {
  /** Retry options applied to each adapter before falling through. */
  retry?: RetryOptions;
  /** Called when one adapter fails and the chain advances to the next. */
  onFallback?: (info: { from: string; to: string; error: unknown }) => void;
}

/**
 * An {@link LLMAdapter} that tries a chain of adapters in order, moving to the
 * next when one fails (optionally retrying each first). Presents itself as the
 * first adapter's provider/model but transparently fails over.
 *
 * @example
 * ```ts
 * const adapter = new FallbackAdapter([
 *   new OpenAIAdapter({ apiKey }),
 *   new AnthropicAdapter({ apiKey }),
 *   new GeminiAdapter({ apiKey }),
 * ], { retry: { maxAttempts: 2 } });
 *
 * const ctx = new LosiContext({ adapter });
 * // If OpenAI is down, this silently falls over to Claude, then Gemini.
 * ```
 */
export class FallbackAdapter implements LLMAdapter {
  readonly provider: string;
  readonly model: string;
  private readonly adapters: LLMAdapter[];
  private readonly options: FallbackAdapterOptions;

  constructor(adapters: LLMAdapter[], options: FallbackAdapterOptions = {}) {
    if (adapters.length === 0) {
      throw new LosiError("FALLBACK_EMPTY", "FallbackAdapter requires at least one adapter");
    }
    this.adapters = adapters;
    this.options = options;
    const primary = adapters[0]!;
    this.provider = `fallback(${adapters.map((a) => a.provider).join(">")})`;
    this.model = primary.model;
  }

  async complete(messages: Message[], options?: CompletionOptions): Promise<CompletionResult> {
    let lastError: unknown;
    for (let i = 0; i < this.adapters.length; i++) {
      const adapter = this.adapters[i]!;
      try {
        return await withRetry(() => adapter.complete(messages, options), this.options.retry);
      } catch (error) {
        lastError = error;
        const next = this.adapters[i + 1];
        if (next) {
          this.options.onFallback?.({ from: adapter.provider, to: next.provider, error });
        }
      }
    }
    throw lastError;
  }

  async *stream(
    messages: Message[],
    options?: CompletionOptions,
  ): AsyncIterable<CompletionChunk> {
    let lastError: unknown;
    for (let i = 0; i < this.adapters.length; i++) {
      const adapter = this.adapters[i]!;
      if (!adapter.stream) {
        lastError = new LosiError(
          "NO_STREAM",
          `Adapter "${adapter.provider}" does not support streaming`,
        );
        continue;
      }
      try {
        // Probe by starting the stream; if it throws synchronously we fall through.
        const iterator = adapter.stream(messages, options);
        yield* iterator;
        return;
      } catch (error) {
        lastError = error;
        const next = this.adapters[i + 1];
        if (next) {
          this.options.onFallback?.({ from: adapter.provider, to: next.provider, error });
        }
      }
    }
    throw lastError;
  }
}
