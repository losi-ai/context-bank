/**
 * `@losi/mistral` — Mistral AI adapter for Losi Context Bank.
 *
 * Implements the {@link LLMAdapter} contract from `@losi/core` on top of the
 * official `@mistralai/mistralai` SDK (v1). Supports chat completions and
 * streaming, so you can give Mistral persistent business context and switch
 * models without losing it.
 *
 * @packageDocumentation
 */

import { Mistral } from "@mistralai/mistralai";
import type { ContentChunk } from "@mistralai/mistralai/models/components";
import type {
  CompletionChunk,
  CompletionOptions,
  CompletionResult,
  LLMAdapter,
  Message,
} from "@losi/core";
import { AdapterError } from "@losi/core";

/** The default Mistral model used when none is specified. */
export const DEFAULT_MISTRAL_MODEL = "mistral-large-latest";

/** Options for constructing a {@link MistralAdapter}. */
export interface MistralAdapterOptions {
  /** Mistral API key. Falls back to `process.env.MISTRAL_API_KEY`. */
  apiKey?: string;
  /** Model id. Defaults to {@link DEFAULT_MISTRAL_MODEL}. */
  model?: string;
  /** Inject a pre-constructed Mistral client (useful for testing). */
  client?: Mistral;
}

/** A Mistral chat message in the SDK's request shape. */
type MistralMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string }
  | { role: "tool"; content: string; toolCallId?: string };

function toMistralMessages(messages: Message[], system?: string): MistralMessage[] {
  const out: MistralMessage[] = [];
  if (system) out.push({ role: "system", content: system });
  for (const m of messages) {
    if (m.role === "tool") {
      out.push({ role: "tool", content: m.content, toolCallId: m.toolCallId });
    } else {
      out.push({ role: m.role, content: m.content });
    }
  }
  return out;
}

/**
 * Mistral SDK content may be a plain string or an array of content chunks.
 * Normalize either form to a single text string.
 */
function normalizeContent(content: string | ContentChunk[] | null | undefined): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((chunk) => (chunk.type === "text" ? chunk.text : ""))
      .join("");
  }
  return "";
}

/**
 * Mistral implementation of {@link LLMAdapter}.
 *
 * @example
 * ```ts
 * import { MistralAdapter } from "@losi/mistral";
 * const adapter = new MistralAdapter({ apiKey: process.env.MISTRAL_API_KEY! });
 * const res = await adapter.complete([{ role: "user", content: "Hi" }]);
 * console.log(res.content);
 * ```
 */
export class MistralAdapter implements LLMAdapter {
  readonly provider = "mistral";
  readonly model: string;
  private readonly client: Mistral;

  constructor(options: MistralAdapterOptions = {}) {
    this.model = options.model ?? DEFAULT_MISTRAL_MODEL;
    if (options.client) {
      this.client = options.client;
    } else {
      const apiKey = options.apiKey ?? process.env.MISTRAL_API_KEY;
      if (!apiKey) {
        throw new AdapterError("Mistral API key is required (set apiKey or MISTRAL_API_KEY)");
      }
      this.client = new Mistral({ apiKey });
    }
  }

  async complete(messages: Message[], options: CompletionOptions = {}): Promise<CompletionResult> {
    const response = await this.client.chat.complete(
      {
        model: this.model,
        messages: toMistralMessages(messages, options.system),
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      },
      { fetchOptions: { signal: options.signal } },
    );

    const choice = response.choices?.[0];
    const usage = response.usage;

    return {
      content: normalizeContent(choice?.message.content),
      model: response.model,
      usage: usage
        ? {
            promptTokens: usage.promptTokens ?? 0,
            completionTokens: usage.completionTokens ?? 0,
            totalTokens: usage.totalTokens ?? 0,
          }
        : undefined,
      finishReason: choice?.finishReason ?? undefined,
    };
  }

  async *stream(
    messages: Message[],
    options: CompletionOptions = {},
  ): AsyncIterable<CompletionChunk> {
    const stream = await this.client.chat.stream(
      {
        model: this.model,
        messages: toMistralMessages(messages, options.system),
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      },
      { fetchOptions: { signal: options.signal } },
    );

    for await (const event of stream) {
      const choice = event.data.choices?.[0];
      const delta = normalizeContent(choice?.delta.content);
      const finished = choice?.finishReason != null;
      yield { delta, done: finished };
    }
    yield { delta: "", done: true };
  }
}
