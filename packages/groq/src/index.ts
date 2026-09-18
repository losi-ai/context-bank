/**
 * `@losi/groq` — Groq adapter for Losi Context Bank.
 *
 * Implements the {@link LLMAdapter} contract from `@losi/core` on top of the
 * official `groq-sdk`. The Groq SDK mirrors the OpenAI `chat.completions` API,
 * so this adapter follows the same shape as `@losi/openai`. Supports chat
 * completions, function/tool calling, and streaming.
 *
 * @packageDocumentation
 */

import Groq from "groq-sdk";
import type {
  CompletionChunk,
  CompletionOptions,
  CompletionResult,
  LLMAdapter,
  Message,
  ToolCall,
} from "@losi/core";
import { AdapterError } from "@losi/core";

/** The default Groq model used when none is specified. */
export const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

/** Options for constructing a {@link GroqAdapter}. */
export interface GroqAdapterOptions {
  /** Groq API key. Falls back to `process.env.GROQ_API_KEY`. */
  apiKey?: string;
  /** Model id. Defaults to {@link DEFAULT_GROQ_MODEL}. */
  model?: string;
  /** Inject a pre-constructed Groq client (useful for testing). */
  client?: Groq;
}

type ChatMessage = Groq.Chat.Completions.ChatCompletionMessageParam;

function toGroqMessages(messages: Message[], system?: string): ChatMessage[] {
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
 * Groq implementation of {@link LLMAdapter}.
 *
 * @example
 * ```ts
 * import { GroqAdapter } from "@losi/groq";
 * const adapter = new GroqAdapter({ apiKey: process.env.GROQ_API_KEY! });
 * const res = await adapter.complete([{ role: "user", content: "Hi" }]);
 * console.log(res.content);
 * ```
 */
export class GroqAdapter implements LLMAdapter {
  readonly provider = "groq";
  readonly model: string;
  private readonly client: Groq;

  constructor(options: GroqAdapterOptions = {}) {
    this.model = options.model ?? DEFAULT_GROQ_MODEL;
    if (options.client) {
      this.client = options.client;
    } else {
      const apiKey = options.apiKey ?? process.env.GROQ_API_KEY;
      if (!apiKey) {
        throw new AdapterError("Groq API key is required (set apiKey or GROQ_API_KEY)");
      }
      this.client = new Groq({ apiKey });
    }
  }

  async complete(messages: Message[], options: CompletionOptions = {}): Promise<CompletionResult> {
    const response = await this.client.chat.completions.create(
      {
        model: this.model,
        messages: toGroqMessages(messages, options.system),
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
        messages: toGroqMessages(messages, options.system),
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
