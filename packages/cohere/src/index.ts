/**
 * `@losi-ai/cohere` — Cohere adapter for Losi Context Bank.
 *
 * Implements the {@link LLMAdapter} contract from `@losi-ai/core` on top of the
 * official `cohere-ai` SDK (v7). Supports chat completions and streaming, so
 * you can give Cohere persistent business context and switch models without
 * losing it.
 *
 * The Cohere v1 Chat API models a conversation as a single current `message`
 * plus prior turns in `chatHistory`, and a top-level `preamble` for system
 * instructions. This adapter translates the portable Losi {@link Message}
 * array into that shape.
 *
 * @packageDocumentation
 */

import { CohereClient } from "cohere-ai";
import type { Cohere } from "cohere-ai";
import type {
  CompletionChunk,
  CompletionOptions,
  CompletionResult,
  LLMAdapter,
  Message,
} from "@losi-ai/core";
import { AdapterError } from "@losi-ai/core";

/** The default Cohere model used when none is specified. */
export const DEFAULT_COHERE_MODEL = "command-a-plus-05-2026";

/** Options for constructing a {@link CohereAdapter}. */
export interface CohereAdapterOptions {
  /** Cohere API key. Falls back to `process.env.COHERE_API_KEY`. */
  apiKey?: string;
  /** Model id. Defaults to {@link DEFAULT_COHERE_MODEL}. */
  model?: string;
  /** Inject a pre-constructed Cohere client (useful for testing). */
  client?: CohereClient;
}

interface CohereChatInput {
  message: string;
  chatHistory: Cohere.Message[];
  preamble?: string;
}

/**
 * Translate Losi messages into the Cohere v1 chat shape:
 * - system messages are merged into `preamble`
 * - the final user message becomes `message`
 * - all earlier user/assistant turns become `chatHistory`
 */
function toCohereChat(messages: Message[], system?: string): CohereChatInput {
  const systemParts: string[] = [];
  if (system) systemParts.push(system);

  const chatHistory: Cohere.Message[] = [];
  let message = "";

  const nonSystem = messages.filter((m) => {
    if (m.role === "system") {
      systemParts.push(m.content);
      return false;
    }
    return true;
  });

  // The last user message is the current turn; everything before is history.
  const lastUserIndex = (() => {
    for (let i = nonSystem.length - 1; i >= 0; i--) {
      if (nonSystem[i]!.role === "user") return i;
    }
    return -1;
  })();

  nonSystem.forEach((m, i) => {
    if (i === lastUserIndex) {
      message = m.content;
      return;
    }
    if (m.role === "assistant") {
      chatHistory.push({ role: "CHATBOT", message: m.content });
    } else if (m.role === "user") {
      chatHistory.push({ role: "USER", message: m.content });
    } else if (m.role === "tool") {
      chatHistory.push({ role: "USER", message: m.content });
    }
  });

  return {
    message,
    chatHistory,
    preamble: systemParts.length > 0 ? systemParts.join("\n\n") : undefined,
  };
}

/**
 * Cohere implementation of {@link LLMAdapter}.
 *
 * @example
 * ```ts
 * import { CohereAdapter } from "@losi-ai/cohere";
 * const adapter = new CohereAdapter({ apiKey: process.env.COHERE_API_KEY! });
 * const res = await adapter.complete([{ role: "user", content: "Hi" }]);
 * console.log(res.content);
 * ```
 */
export class CohereAdapter implements LLMAdapter {
  readonly provider = "cohere";
  readonly model: string;
  private readonly client: CohereClient;

  constructor(options: CohereAdapterOptions = {}) {
    this.model = options.model ?? DEFAULT_COHERE_MODEL;
    if (options.client) {
      this.client = options.client;
    } else {
      const apiKey = options.apiKey ?? process.env.COHERE_API_KEY;
      if (!apiKey) {
        throw new AdapterError("Cohere API key is required (set apiKey or COHERE_API_KEY)");
      }
      this.client = new CohereClient({ token: apiKey });
    }
  }

  async complete(messages: Message[], options: CompletionOptions = {}): Promise<CompletionResult> {
    const { message, chatHistory, preamble } = toCohereChat(messages, options.system);

    const response = await this.client.chat(
      {
        model: this.model,
        message,
        chatHistory,
        preamble,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      },
      { abortSignal: options.signal },
    );

    const tokens = response.meta?.tokens;
    const promptTokens = tokens?.inputTokens;
    const completionTokens = tokens?.outputTokens;
    const hasUsage = promptTokens != null || completionTokens != null;

    return {
      content: response.text,
      model: this.model,
      usage: hasUsage
        ? {
            promptTokens: promptTokens ?? 0,
            completionTokens: completionTokens ?? 0,
            totalTokens: (promptTokens ?? 0) + (completionTokens ?? 0),
          }
        : undefined,
      finishReason: response.finishReason ?? undefined,
    };
  }

  async *stream(
    messages: Message[],
    options: CompletionOptions = {},
  ): AsyncIterable<CompletionChunk> {
    const { message, chatHistory, preamble } = toCohereChat(messages, options.system);

    const stream = await this.client.chatStream(
      {
        model: this.model,
        message,
        chatHistory,
        preamble,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      },
      { abortSignal: options.signal },
    );

    for await (const event of stream) {
      if (event.eventType === "text-generation") {
        yield { delta: event.text, done: false };
      } else if (event.eventType === "stream-end") {
        yield { delta: "", done: true };
      }
    }
    yield { delta: "", done: true };
  }
}
