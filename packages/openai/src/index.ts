/**
 * `@losi-ai/openai` — OpenAI adapter for Losi Context Bank.
 *
 * Implements the {@link LLMAdapter} contract from `@losi-ai/core` on top of the
 * official `openai` SDK. Supports chat completions, function/tool calling, and
 * streaming.
 *
 * @packageDocumentation
 */

import OpenAI from "openai";
import type {
  CompletionChunk,
  CompletionOptions,
  CompletionResult,
  LLMAdapter,
  Message,
  ToolCall,
} from "@losi-ai/core";
import { AdapterError } from "@losi-ai/core";

/** The default OpenAI model used when none is specified. */
export const DEFAULT_OPENAI_MODEL = "gpt-5.6-sol";

/** Options for constructing an {@link OpenAIAdapter}. */
export interface OpenAIAdapterOptions {
  /** OpenAI API key. Falls back to `process.env.OPENAI_API_KEY`. */
  apiKey?: string;
  /** Model id. Defaults to {@link DEFAULT_OPENAI_MODEL}. */
  model?: string;
  /** Optional base URL for Azure/OpenAI-compatible endpoints. */
  baseURL?: string;
  /** Inject a pre-constructed OpenAI client (useful for testing). */
  client?: OpenAI;
}

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

function toOpenAIMessages(messages: Message[], system?: string): ChatMessage[] {
  const out: ChatMessage[] = [];
  if (system) out.push({ role: "system", content: system });
  for (const m of messages) {
    if (m.role === "tool") {
      out.push({ role: "tool", content: m.content, tool_call_id: m.toolCallId ?? "" });
    } else {
      out.push({ role: m.role, content: m.content } as ChatMessage);
    }
  }
  return out;
}

function parseArguments(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * OpenAI implementation of {@link LLMAdapter}.
 *
 * @example
 * ```ts
 * import { OpenAIAdapter } from "@losi-ai/openai";
 * const adapter = new OpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY! });
 * const res = await adapter.complete([{ role: "user", content: "Hi" }]);
 * console.log(res.content);
 * ```
 */
export class OpenAIAdapter implements LLMAdapter {
  readonly provider = "openai";
  readonly model: string;
  private readonly client: OpenAI;

  constructor(options: OpenAIAdapterOptions = {}) {
    this.model = options.model ?? DEFAULT_OPENAI_MODEL;
    if (options.client) {
      this.client = options.client;
    } else {
      const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new AdapterError("OpenAI API key is required (set apiKey or OPENAI_API_KEY)");
      }
      this.client = new OpenAI({ apiKey, baseURL: options.baseURL });
    }
  }

  async complete(messages: Message[], options: CompletionOptions = {}): Promise<CompletionResult> {
    const response = await this.client.chat.completions.create(
      {
        model: this.model,
        messages: toOpenAIMessages(messages, options.system),
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        tools: options.tools?.map((t) => ({
          type: "function" as const,
          function: { name: t.name, description: t.description, parameters: t.parameters },
        })),
      },
      { signal: options.signal },
    );

    const choice = response.choices[0];
    const toolCalls: ToolCall[] | undefined = choice?.message.tool_calls?.map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: parseArguments(tc.function.arguments),
    }));

    return {
      content: choice?.message.content ?? "",
      toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
      model: response.model,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
      finishReason: choice?.finish_reason ?? undefined,
    };
  }

  async *stream(
    messages: Message[],
    options: CompletionOptions = {},
  ): AsyncIterable<CompletionChunk> {
    const stream = await this.client.chat.completions.create(
      {
        model: this.model,
        messages: toOpenAIMessages(messages, options.system),
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        stream: true,
      },
      { signal: options.signal },
    );

    for await (const part of stream) {
      const delta = part.choices[0]?.delta?.content ?? "";
      const finished = part.choices[0]?.finish_reason != null;
      yield { delta, done: finished };
    }
    yield { delta: "", done: true };
  }
}
