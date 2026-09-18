/**
 * Demo 2 — The Onboarding Shortcut
 *
 * "My new hire knew our entire product roadmap, every major decision, and our
 *  top customers on day one. Not because I briefed them. Because Losi did."
 *
 * Calls REAL models. Provide OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY,
 * or run Ollama locally as a keyless real-model fallback.
 *
 *   npm run demo:onboarding -w @losi/examples
 */

import { LosiContext, MemorySnapshotStore, serializeSnapshot, deserializeSnapshot } from "@losi/core";
import { realAdapter, preflight, backendNote, firstAvailableProvider } from "./_shared/adapters.js";

async function main() {
  console.log("=== Losi Context Bank — Onboarding demo ===\n");
  console.log("Backends:");
  console.log(backendNote());
  console.log("");

  // Shared store (real app: disk / Redis / the hosted Losi platform).
  const store = new MemorySnapshotStore();

  // --- Founder's session: context accumulates here ---
  const founder = new LosiContext({
    adapter: realAdapter("openai"),
    store,
    persistKey: "acme-workspace"
  });
  founder.setSnapshot({
    capturedAt: new Date().toISOString(),
    workspaceId: "acme-workspace",
    sections: [
      { scope: "workspace", label: "Product roadmap", content: "Q4: Context Bank GA, SDK v1, private deploy." },
      { scope: "workspace", label: "Key decisions", content: "Open-core model. MIT SDK. Hosted platform paid." },
      { scope: "crm", label: "Top customers", content: "Acme Corp, Globex, Initech." }
    ]
  });
  await founder.persist();
  console.log("Founder session: context saved to the bank.\n");

  // --- New hire, day one: a FRESH session on a real model ---
  const hireProvider = firstAvailableProvider() ?? "anthropic";
  const newHire = new LosiContext({
    adapter: realAdapter(hireProvider),
    store,
    persistKey: "acme-workspace"
  });

  const pfError = await preflight(realAdapter(hireProvider));
  if (pfError) {
    console.error(pfError);
    process.exit(1);
  }

  const before = newHire.getSnapshot().sections.length;
  const restored = await newHire.restore();
  const after = newHire.getSnapshot().sections.length;

  console.log(`New hire opens Losi for the first time on ${newHire.provider} (${newHire.model})…`);
  console.log(`  sections before restore: ${before}`);
  console.log(`  sections after restore:  ${after}\n`);

  const answer = await newHire.complete(
    "You are briefing a new hire. From the provided context only, list our roadmap, key decisions, and top customers.",
    { refreshContext: false }
  );
  console.log(`Day-one briefing →\n  ${answer.content.trim().replace(/\n/g, "\n  ")}\n`);

  // Proof: the restore is real (round-trips through serialize/deserialize) and
  // the fresh session recovered the founder's context.
  const roundTrip = deserializeSnapshot(serializeSnapshot(newHire.getSnapshot()));
  const recovered =
    restored !== null &&
    after === 3 &&
    roundTrip.sections.some((s) => s.content.includes("Context Bank GA"));

  console.log("---");
  console.log(`New hire started fully briefed (context restored): ${recovered ? "✅ YES" : "❌ NO"}`);
  console.log("\nNot because you briefed them. Because Losi did.");

  if (!recovered) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
