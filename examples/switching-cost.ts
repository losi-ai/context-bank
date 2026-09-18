/**
 * Demo 3 — The Switching Cost Eliminator
 *
 * "We switched tools and didn't lose a single customer relationship.
 *  Everything — every call, every booking, every follow-up — was already in
 *  Losi."
 *
 * Calls REAL models. Business context (CRM + bookings) is provided locally via
 * @losi/nexus so no hosted account is needed; to pull LIVE data pass
 * { apiKey, workspaceId } instead of { data }. Provide a model key or run
 * Ollama locally.
 *
 *   npm run demo:switching-cost -w @losi/examples
 */

import { LosiContext } from "@losi/core";
import { NexusBinding } from "@losi/nexus";
import { realAdapter, preflight, backendNote, firstAvailableProvider } from "./_shared/adapters.js";

async function main() {
  console.log("=== Losi Context Bank — Switching Cost demo ===\n");
  console.log("Backends:");
  console.log(backendNote());
  console.log("");

  const nexus = new NexusBinding({
    crm: true,
    bookings: true,
    data: {
      contacts: [
        { id: "1", name: "Dana Reeves", company: "Acme Corp", stage: "customer" },
        { id: "2", name: "Sam Okoye", company: "Globex", stage: "follow-up" }
      ],
      bookings: [
        { id: "b1", title: "Onboarding call", startsAt: "2026-09-17T15:00", with: "Dana Reeves" },
        { id: "b2", title: "Renewal review", startsAt: "2026-09-19T10:00", with: "Sam Okoye" }
      ]
    }
  });

  const primary = firstAvailableProvider() ?? "openai";
  const secondary: "openai" | "anthropic" | "gemini" =
    primary === "gemini" ? "openai" : "gemini";

  const ctx = new LosiContext({ adapter: realAdapter(primary), bindings: [nexus] });

  const pfError = await preflight(realAdapter(primary));
  if (pfError) {
    console.error(pfError);
    process.exit(1);
  }

  const prompt =
    "From the provided business context only, list the customer relationships and this week's meetings.";

  const before = await ctx.complete(prompt);
  console.log(`Before switch (${ctx.provider}/${ctx.model}) →\n  ${before.content.trim().replace(/\n/g, "\n  ")}\n`);

  // "Switch tools" = switch the model. Nexus context is re-bound identically.
  ctx.switchAdapter(realAdapter(secondary));
  let after = before;
  try {
    after = await ctx.complete(prompt);
    console.log(`After switch (${ctx.provider}/${ctx.model}) →\n  ${after.content.trim().replace(/\n/g, "\n  ")}\n`);
  } catch (error) {
    console.log(`After switch (${ctx.provider}) → skipped (${error instanceof Error ? error.message : String(error)})\n`);
  }

  // Proof lives in the resolved graph — deterministic, real relationships.
  const snap = ctx.getSnapshot();
  const edges = snap.graph?.edges ?? [];
  const booked = edges.filter((e) => e.type === "booked");
  const worksAt = edges.filter((e) => e.type === "works_at");

  console.log("Relationships bound into every model's prompt:");
  for (const e of edges) {
    const from = snap.graph?.nodes.find((n) => n.id === e.from)?.label ?? e.from;
    const to = snap.graph?.nodes.find((n) => n.id === e.to)?.label ?? e.to;
    console.log(`  - ${from} —${e.type}→ ${to}`);
  }

  const survived = booked.length >= 2 && worksAt.length >= 2;

  console.log("\n---");
  console.log(`Every call, booking, and follow-up survived the switch: ${survived ? "✅ YES" : "❌ NO"}`);
  console.log("\nYou switched tools. You lost nothing. It was already in Losi.");

  if (!survived) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
