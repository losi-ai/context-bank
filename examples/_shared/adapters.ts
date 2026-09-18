/**
 * Real adapter factory for the demos.
 *
 * These demos call REAL models. Provide the relevant API key(s) via env:
 *   OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY
 *
 * Ollama needs no key — if you have Ollama running locally it is used as a
 * zero-config fallback so the demos can run end-to-end against a real model
 * even without cloud keys.
 */

import type { LLMAdapter } from "@losi/core";
import { OpenAIAdapter } from "@losi/openai";
import { AnthropicAdapter } from "@losi/anthropic";
import { GeminiAdapter } from "@losi/gemini";
import { OllamaAdapter } from "@losi/ollama";

export type Provider = "openai" | "anthropic" | "gemini";

/** True when at least one cloud key is configured. */
export function hasAnyCloudKey(): boolean {
  return Boolean(
    process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY
  );
}

/** Env var name for a provider's cloud key. */
const KEY_ENV: Record<Provider, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GEMINI_API_KEY"
};

/** Whether a provider has a real cloud key set (not the Ollama fallback). */
export function hasCloudKey(provider: Provider): boolean {
  return Boolean(process.env[KEY_ENV[provider]]);
}

/**
 * The first provider that has a real cloud key, else null. Used to pick a
 * provider that is guaranteed to hit a real cloud model for preflight.
 */
export function firstAvailableProvider(): Provider | null {
  const order: Provider[] = ["openai", "anthropic", "gemini"];
  return order.find((p) => hasCloudKey(p)) ?? null;
}

/**
 * Build a real adapter for the requested provider. Falls back to a local
 * Ollama model when that provider's key is absent, so every call in the demo
 * hits a real model. Set OLLAMA_MODEL to pick the local model (default llama3.2).
 */
export function realAdapter(provider: Provider): LLMAdapter {
  const ollamaModel = process.env.OLLAMA_MODEL || "llama3.2";
  switch (provider) {
    case "openai":
      return process.env.OPENAI_API_KEY
        ? new OpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY })
        : new OllamaAdapter({ model: ollamaModel });
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY
        ? new AnthropicAdapter({ apiKey: process.env.ANTHROPIC_API_KEY })
        : new OllamaAdapter({ model: ollamaModel });
    case "gemini":
      return process.env.GEMINI_API_KEY
        ? new GeminiAdapter({ apiKey: process.env.GEMINI_API_KEY })
        : new OllamaAdapter({ model: ollamaModel });
  }
}

/** Human-readable note about which backend each provider will use. */
export function backendNote(): string {
  const line = (p: Provider, env: string) =>
    `  ${p.padEnd(10)} → ${process.env[env] ? "real " + p + " API" : "local Ollama (no " + env + ")"}`;
  return [
    line("openai", "OPENAI_API_KEY"),
    line("anthropic", "ANTHROPIC_API_KEY"),
    line("gemini", "GEMINI_API_KEY")
  ].join("\n");
}

/**
 * Verify the active adapter can actually reach a model. Returns null on
 * success, or an error message explaining how to make the demo runnable.
 */
export async function preflight(adapter: LLMAdapter): Promise<string | null> {
  try {
    const res = await adapter.complete([{ role: "user", content: "Reply with the single word: ready" }], {
      maxTokens: 16
    });
    return res.content.length > 0 ? null : "Model returned an empty response.";
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return (
      `Could not reach a real model via "${adapter.provider}" (${adapter.model}).\n` +
      `Reason: ${msg}\n\n` +
      `To run this demo, EITHER set a cloud key (OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY)\n` +
      `OR run Ollama locally (https://ollama.com) with:  ollama run ${process.env.OLLAMA_MODEL || "llama3.2"}`
    );
  }
}
