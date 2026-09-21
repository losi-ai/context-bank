/**
 * Core message and adapter types for Losi Context Bank.
 *
 * Every LLM provider (OpenAI, Anthropic, Gemini, ...) is wrapped in an
 * {@link LLMAdapter}. Adapters are intentionally thin: they translate between
 * the portable Losi context format and a provider's native API. All business
 * logic — memory, governance, context snapshots — lives in `@losi-ai/core`.
 *
 * @packageDocumentation
 */

/** Role of a single message in a conversation. */
export type MessageRole = "system" | "user" | "assistant" | "tool";

/**
 * A single chat message in the portable Losi format.
 *
 * Adapters map this to and from their provider's native message shape.
 */
export interface Message {
  /** Who produced the message. */
  role: MessageRole;
  /** The text content of the message. */
  content: string;
  /** Optional name for a tool/function message. */
  name?: string;
  /** Optional identifier used to correlate tool calls and results. */
  toolCallId?: string;
}

/**
 * A tool (a.k.a. function) an adapter may expose to the model.
 * The JSON schema describes the tool's parameters.
 */
export interface ToolDefinition {
  /** Unique tool name. */
  name: string;
  /** Human-readable description of what the tool does. */
  description: string;
  /** JSON Schema object describing the tool's input parameters. */
  parameters: Record<string, unknown>;
}

/** A tool invocation requested by the model. */
export interface ToolCall {
  /** Identifier used to correlate the call with its result. */
  id: string;
  /** Name of the tool being called. */
  name: string;
  /** Parsed arguments the model wants to pass to the tool. */
  arguments: Record<string, unknown>;
}

/** Token usage reported by a provider, when available. */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Options passed to {@link LLMAdapter.complete} and
 * {@link LLMAdapter.stream}. These are provider-agnostic; adapters map the
 * subset each provider supports.
 */
export interface CompletionOptions {
  /** Sampling temperature (0–2). */
  temperature?: number;
  /** Maximum number of tokens to generate. */
  maxTokens?: number;
  /** Tools the model is allowed to call. */
  tools?: ToolDefinition[];
  /** A system prompt to prepend. Merged with any injected context. */
  system?: string;
  /** Provider-specific escape hatch. Use sparingly. */
  providerOptions?: Record<string, unknown>;
  /** Abort signal for cancelling in-flight requests. */
  signal?: AbortSignal;
}

/** The result of a non-streaming completion. */
export interface CompletionResult {
  /** The generated assistant text. */
  content: string;
  /** Any tool calls the model requested. */
  toolCalls?: ToolCall[];
  /** The model identifier that produced the result. */
  model: string;
  /** Token usage, if the provider reported it. */
  usage?: TokenUsage;
  /** Why generation stopped (provider-specific string). */
  finishReason?: string;
}

/** A single chunk emitted while streaming a completion. */
export interface CompletionChunk {
  /** Incremental text delta. May be an empty string. */
  delta: string;
  /** Set on the final chunk when a tool call is fully assembled. */
  toolCall?: ToolCall;
  /** True on the terminal chunk. */
  done: boolean;
}

/**
 * The contract every model adapter implements.
 *
 * Implement this interface to add a new provider. See `@losi-ai/openai` for a
 * reference implementation and CONTRIBUTING.md for the full guide.
 *
 * @example
 * ```ts
 * class MyAdapter implements LLMAdapter {
 *   readonly provider = "my-provider";
 *   readonly model = "my-model-v1";
 *   async complete(messages, options) {  ...  }
 * }
 * ```
 */
export interface LLMAdapter {
  /** Stable provider identifier, e.g. `"openai"`. */
  readonly provider: string;
  /** The default model this adapter targets, e.g. `"gpt-5.6-sol"`. */
  readonly model: string;

  /**
   * Run a single non-streaming completion.
   *
   * @param messages - Conversation history in Losi format.
   * @param options - Provider-agnostic completion options.
   * @returns The assistant response and any tool calls.
   */
  complete(messages: Message[], options?: CompletionOptions): Promise<CompletionResult>;

  /**
   * Run a streaming completion.
   *
   * @param messages - Conversation history in Losi format.
   * @param options - Provider-agnostic completion options.
   * @returns An async iterable of {@link CompletionChunk}s.
   */
  stream?(
    messages: Message[],
    options?: CompletionOptions,
  ): AsyncIterable<CompletionChunk>;
}
