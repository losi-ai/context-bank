/**
 * `@losi/gemini` — Google Gemini adapter for Losi Context Bank.
 *
 * Implements the {@link LLMAdapter} contract from `@losi/core` on top of the
 * official `@google/generative-ai` SDK. Supports content generation and
 * streaming.
 *
 * @packageDocumentation
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Content } from "@google/generative-ai";
import type {
  CompletionChunk,
  CompletionOptions,
  CompletionResult,
  LLMAdapter,
  Message,
} from "@losi/core";
import { AdapterError } from "@losi/core";

/** The default Gemini model used when none is specified. */
export const DEFAULT_GEMINI_MODEL = "gemini-1.5-pro";

/** Options for constructing a {@link GeminiAdapter}. */
export interface GeminiAdapterOptions {
  /** Google AI API key. Falls back to `process.env.GEMINI_API_KEY`. */
  apiKey?: string;
  /** Model id. Defaults to {@link DEFAULT_GEMINI_MODEL}. */
  model?: string;
  /** Inject a pre-constructed client (useful for testing). */
  client?: GoogleGenerativeAI;
}

function toGeminiContents(messages: Message[]): Content[] {
  const out: Content[] = [];
  for (const m of messages) {
    if (m.role === "system") continue; // handled via systemInstruction
    const role = m.role === "assistant" ? "model" : "user";
    out.push({ role, parts: [{ text: m.content }] });
  }
  return out;
}

function extractSystem(messages: Message[], override?: string): string | undefined {
  const fromMessages = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const parts = [override, fromMessages].filter(
    (p): p is string => typeof p === "string" && p.length > 0,
  );
  return parts.length > 0 ? parts.join("\n\n") : undefined;
}

/**
 * Gemini implementation of {@link LLMAdapter}.
 *
 * @example
 * ```ts
 * import { GeminiAdapter } from "@losi/gemini";
 * const adapter = new GeminiAdapter({ apiKey: process.env.GEMINI_API_KEY! });
 * const res = await adapter.complete([{ role: "user", content: "Hi" }]);
 * ```
 */
export class GeminiAdapter implements LLMAdapter {
  readonly provider = "gemini";
  readonly model: string;
  private readonly client: GoogleGenerativeAI;

  constructor(options: GeminiAdapterOptions = {}) {
    this.model = options.model ?? DEFAULT_GEMINI_MODEL;
    if (options.client) {
      this.client = options.client;
    } else {
      const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new AdapterError("Gemini API key is required (set apiKey or GEMINI_API_KEY)");
      }
      this.client = new GoogleGenerativeAI(apiKey);
    }
  }

  async complete(messages: Message[], options: CompletionOptions = {}): Promise<CompletionResult> {
    const model = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: extractSystem(messages, options.system),
      generationConfig: {
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
      },
    });

    const result = await model.generateContent({ contents: toGeminiContents(messages) });
    const response = result.response;
    const usage = response.usageMetadata;

    return {
      content: response.text(),
      model: this.model,
      usage: usage
        ? {
            promptTokens: usage.promptTokenCount,
            completionTokens: usage.candidatesTokenCount,
            totalTokens: usage.totalTokenCount,
          }
        : undefined,
      finishReason: response.candidates?.[0]?.finishReason,
    };
  }

  async *stream(
    messages: Message[],
    options: CompletionOptions = {},
  ): AsyncIterable<CompletionChunk> {
    const model = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: extractSystem(messages, options.system),
      generationConfig: {
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
      },
    });

    const result = await model.generateContentStream({ contents: toGeminiContents(messages) });
    for await (const chunk of result.stream) {
      yield { delta: chunk.text(), done: false };
    }
    yield { delta: "", done: true };
  }
}
