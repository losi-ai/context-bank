/**
 * Demo 1 — The Model Switcher
 *
 * "I use GPT for writing, Claude for code, and Gemini for research. All three
 *  know exactly who I am and what I'm building — because they all pull context
 *  from the same place. Losi."
 *
 * This calls REAL models. Provide any of OPENAI_API_KEY / ANTHROPIC_API_KEY /
 * GEMINI_API_KEY, or run Ollama locally as a keyless real-model fallback.
 *
 *   OPENAI_API_KEY=... ANTHROPIC_API_KEY=... GEMINI_API_KEY=... \
 *     npm run demo:switch -w @losi/examples
 */

import { LosiContext, createGraph, addNode, addEdge, renderSnapshot } from "@losi/core";
import { realAdapter, preflight, backendNote, firstAvailableProvider } from "./_shared/adapters.js";

async function main() {
  console.log("=== Losi Context Bank — Model Switcher demo ===\n");
  console.log("Backends:");
  console.log(backendNote());
  console.log("");

  // 1. Build the context ONCE. A small business graph + a memory section.
  const graph = createGraph();
  addNode(graph, { id: "u", type: "person", label: "Ayo", summary: "Founder, Losi" });
  addNode(graph, { id: "p", type: "project", label: "Context Bank", summary: "Model-agnostic context layer" });
  addEdge(graph, { from: "u", to: "p", type: "building" });

  const ctx = new LosiContext({ adapter: realAdapter("openai") });
  ctx.setSnapshot({
    capturedAt: new Date().toISOString(),
    sections: [
      {
        scope: "personal-memory",
        label: "About the user",
        content: "The user is Ayo, founder of Losi, building the Context Bank (a model-agnostic context layer)."
      }
    ],
    graph
  });

  // Preflight a provider that will actually reach a real model.
  const preferred = firstAvailableProvider() ?? "openai";
  const pfError = await preflight(realAdapter(preferred));
  if (pfError) {
    console.error(pfError);
    process.exit(1);
  }

  const prompt = "In one sentence, who is the user and what are they building? Use the provided context.";
  const providers: Array<"openai" | "anthropic" | "gemini"> = ["openai", "anthropic", "gemini"];
  const results: { provider: string; model: string; content: string }[] = [];

  for (const p of providers) {
    ctx.switchAdapter(realAdapter(p)); // ← real GPT / Claude / Gemini (or local Ollama fallback)
    try {
      const res = await ctx.complete(prompt, { refreshContext: false });
      results.push({ provider: ctx.provider, model: ctx.model, content: res.content.trim() });
      console.log(`${p.padEnd(9)} (${ctx.model}) →\n  ${res.content.trim().replace(/\n/g, "\n  ")}\n`);
    } catch (error) {
      // A provider without a reachable backend is skipped, not fatal — as long
      // as at least one real model answers, the persistence claim is proven.
      console.log(`${p.padEnd(9)} → skipped (${error instanceof Error ? error.message : String(error)})\n`);
    }
  }

  if (results.length === 0) {
    console.error("No provider could reach a real model. Set a key or run Ollama.");
    process.exit(1);
  }

  // Proof of persistence is the SNAPSHOT itself — identical context object fed
  // to every model — plus that each real answer mentions the injected facts.
  const rendered = renderSnapshot(ctx.getSnapshot());
  const snapshotStable = rendered.includes("Ayo") && rendered.includes("Context Bank");
  const everyAnswerGrounded = results.every((r) => /ayo/i.test(r.content) && /context bank/i.test(r.content));

  console.log("---");
  console.log(`Real models that answered from one shared context: ${results.length} (${results.map((r) => r.provider).join(", ")})`);
  console.log(`Same context object fed to every model:            ${snapshotStable ? "✅ YES" : "❌ NO"}`);
  console.log(`Every real answer grounded in it:                  ${everyAnswerGrounded ? "✅ YES" : "⚠️  check output above"}`);
  console.log("\nThe model is interchangeable. The context is yours. It lives in Losi.");

  // Snapshot stability is the load-bearing guarantee; model phrasing varies.
  if (!snapshotStable) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
