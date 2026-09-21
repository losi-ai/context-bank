/**
 * `@losi-ai/ollama` — local Ollama adapter for Losi Context Bank.
 *
 * Implements the {@link LLMAdapter} contract from `@losi-ai/core` on top of the
 * official `ollama` npm package. Talks to a local Ollama server (default
 * `http://127.0.0.1:11434`), so no cloud SDK or API key is required. Supports
 * chat completions and streaming.
 *
 * @packageDocumentation
 */

import { Ollama } from "ollama";
import type { Message as OllamaMessage } from "ollama";
import type {
  CompletionChunk,
  CompletionOptions,
  CompletionResult,
  LLMAdapter,
  Message,
} from "@losi-ai/core";

/** The default Ollama model used when none is specified. */
export const DEFAULT_OLLAMA_MODEL = "llama3.2";

/** The default host of a local Ollama server. */
export const DEFAULT_OLLAMA_HOST = "http://127.0.0.1:11434";

/** Options for constructing an {@link OllamaAdapter}. */
export interface OllamaAdapterOptions {
  /** Ollama server host. Defaults to {@link DEFAULT_OLLAMA_HOST}. */
  host?: string;
  /** Model id. Defaults to {@link DEFAULT_OLLAMA_MODEL}. */
  model?: string;
  /** Inject a pre-constructed Ollama client (useful for testing). */
  client?: Ollama;
}

function toOllamaMessages(messages: Message[], system?: string): OllamaMessage[] {
  const out: OllamaMessage[] = [];
  if (system) out.push({ role: "system", content: system });
  for (const m of messages) {
    // Ollama roles: system | user | assistant | tool. Losi roles map 1:1.
    out.push({ role: m.role, content: m.content });
  }
  return out;
}

/**
 * Ollama implementation of {@link LLMAdapter}. Runs entirely against a local
 * Ollama server, so no API key is needed.
 *
 * @example
 * ```ts
 * import { OllamaAdapter } from "@losi-ai/ollama";
 * const adapter = new OllamaAdapter({ model: "llama3.2" });
 * const res = await adapter.complete([{ role: "user", content: "Hi" }]);
 * console.log(res.content);
 * ```
 */
export class OllamaAdapter implements LLMAdapter {
  readonly provider = "ollama";
  readonly model: string;
  private readonly client: Ollama;

  constructor(options: OllamaAdapterOptions = {}) {
    this.model = options.model ?? DEFAULT_OLLAMA_MODEL;
    this.client =
      options.client ?? new Ollama({ host: options.host ?? DEFAULT_OLLAMA_HOST });
  }

  async complete(messages: Message[], options: CompletionOptions = {}): Promise<CompletionResult> {
    const response = await this.client.chat({
      model: this.model,
      messages: toOllamaMessages(messages, options.system),
      stream: false,
      options: {
        temperature: options.temperature,
        num_predict: options.maxTokens,
      },
    });

    const hasUsage =
      typeof response.prompt_eval_count === "number" ||
      typeof response.eval_count === "number";

    return {
      content: response.message?.content ?? "",
      model: response.model ?? this.model,
      usage: hasUsage
        ? {
            promptTokens: response.prompt_eval_count ?? 0,
            completionTokens: response.eval_count ?? 0,
            totalTokens: (response.prompt_eval_count ?? 0) + (response.eval_count ?? 0),
          }
        : undefined,
      finishReason: response.done_reason ?? (response.done ? "stop" : undefined),
    };
  }

  async *stream(
    messages: Message[],
    options: CompletionOptions = {},
  ): AsyncIterable<CompletionChunk> {
    const iterator = await this.client.chat({
      model: this.model,
      messages: toOllamaMessages(messages, options.system),
      stream: true,
      options: {
        temperature: options.temperature,
        num_predict: options.maxTokens,
      },
    });

    for await (const part of iterator) {
      yield { delta: part.message?.content ?? "", done: Boolean(part.done) };
    }
    yield { delta: "", done: true };
  }
}
