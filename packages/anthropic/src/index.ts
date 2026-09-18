/**
 * `@losi/anthropic` — Anthropic Claude adapter for Losi Context Bank.
 *
 * Implements the {@link LLMAdapter} contract from `@losi/core` on top of the
 * official `@anthropic-ai/sdk`. Supports messages, tool use, and streaming.
 *
 * @packageDocumentation
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  CompletionChunk,
  CompletionOptions,
  CompletionResult,
  LLMAdapter,
  Message,
  ToolCall,
} from "@losi/core";
import { AdapterError } from "@losi/core";

/** The default Claude model used when none is specified. */
export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

/** Options for constructing an {@link AnthropicAdapter}. */
export interface AnthropicAdapterOptions {
  /** Anthropic API key. Falls back to `process.env.ANTHROPIC_API_KEY`. */
  apiKey?: string;
  /** Model id. Defaults to {@link DEFAULT_ANTHROPIC_MODEL}. */
  model?: string;
  /** Default max tokens (Anthropic requires this). Defaults to 1024. */
  maxTokens?: number;
  /** Inject a pre-constructed client (useful for testing). */
  client?: Anthropic;
}

/** Anthropic requires system as a top-level field, and non-system messages. */
function toAnthropicMessages(messages: Message[]): Anthropic.MessageParam[] {
  const out: Anthropic.MessageParam[] = [];
  for (const m of messages) {
    if (m.role === "system") continue;
    const role = m.role === "assistant" ? "assistant" : "user";
    out.push({ role, content: m.content });
  }
  return out;
}

function extractSystem(messages: Message[], override?: string): string | undefined {
  const systemFromMessages = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const parts = [override, systemFromMessages].filter(
    (p): p is string => typeof p === "string" && p.length > 0,
  );
  return parts.length > 0 ? parts.join("\n\n") : undefined;
}

/**
 * Anthropic implementation of {@link LLMAdapter}.
 *
 * @example
 * ```ts
 * import { AnthropicAdapter } from "@losi/anthropic";
 * const adapter = new AnthropicAdapter({ apiKey: process.env.ANTHROPIC_API_KEY! });
 * const res = await adapter.complete([{ role: "user", content: "Hi" }]);
 * ```
 */
export class AnthropicAdapter implements LLMAdapter {
  readonly provider = "anthropic";
  readonly model: string;
  private readonly client: Anthropic;
  private readonly defaultMaxTokens: number;

  constructor(options: AnthropicAdapterOptions = {}) {
    this.model = options.model ?? DEFAULT_ANTHROPIC_MODEL;
    this.defaultMaxTokens = options.maxTokens ?? 1024;
    if (options.client) {
      this.client = options.client;
    } else {
      const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new AdapterError(
          "Anthropic API key is required (set apiKey or ANTHROPIC_API_KEY)",
        );
      }
      this.client = new Anthropic({ apiKey });
    }
  }

  async complete(messages: Message[], options: CompletionOptions = {}): Promise<CompletionResult> {
    const system = extractSystem(messages, options.system);
    const response = await this.client.messages.create(
      {
        model: this.model,
        max_tokens: options.maxTokens ?? this.defaultMaxTokens,
        temperature: options.temperature,
        system,
        messages: toAnthropicMessages(messages),
        tools: options.tools?.map((t) => ({
          name: t.name,
          description: t.description,
          input_schema: t.parameters as Anthropic.Tool.InputSchema,
        })),
      },
      { signal: options.signal },
    );

    let content = "";
    const toolCalls: ToolCall[] = [];
    for (const block of response.content) {
      if (block.type === "text") {
        content += block.text;
      } else if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: (block.input as Record<string, unknown>) ?? {},
        });
      }
    }

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      model: response.model,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      finishReason: response.stop_reason ?? undefined,
    };
  }

  async *stream(
    messages: Message[],
    options: CompletionOptions = {},
  ): AsyncIterable<CompletionChunk> {
    const system = extractSystem(messages, options.system);
    const stream = this.client.messages.stream(
      {
        model: this.model,
        max_tokens: options.maxTokens ?? this.defaultMaxTokens,
        temperature: options.temperature,
        system,
        messages: toAnthropicMessages(messages),
      },
      { signal: options.signal },
    );

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield { delta: event.delta.text, done: false };
      }
    }
    yield { delta: "", done: true };
  }
}
