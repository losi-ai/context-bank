/**
 * @losi-ai/skills — MemorySkillStore + GovernedSkillRunner tests
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MemorySkillStore,
  SkillRunner,
  GovernedSkillRunner,
  defineSkill,
  formatSkillsContextSection,
} from "./index.js";

describe("MemorySkillStore", () => {
  it("roundtrips save/load/list/delete", () => {
    const store = new MemorySkillStore();
    const skill = defineSkill({
      name: "demo",
      steps: [{ type: "note", text: "hi" }],
    });
    store.save(skill);
    assert.equal(store.load("demo")?.name, "demo");
    assert.equal(store.list().length, 1);
    store.delete("demo");
    assert.equal(store.load("demo"), null);
  });
});

describe("GovernedSkillRunner", () => {
  it("blocks skill_run when policy denies it", async () => {
    const governance = {
      enforceOrThrow(action: { type: string }) {
        if (action.type === "skill_run") {
          throw new Error("blocked");
        }
      },
    };
    const runner = new GovernedSkillRunner(governance, {
      agentId: "a1",
      executeTool: async () => "ok",
    });
    runner.install(
      defineSkill({
        name: "x",
        steps: [{ type: "note", text: "n" }],
      }),
    );
    await assert.rejects(() => runner.run("x"), /blocked/);
  });

  it("allows run and tool_call when policy allows", async () => {
    const seen: string[] = [];
    const governance = {
      enforceOrThrow(action: { type: string }) {
        seen.push(action.type);
      },
    };
    const runner = new GovernedSkillRunner(governance, {
      agentId: "a1",
      executeTool: async () => "tool-out",
    });
    runner.install(
      defineSkill({
        name: "x",
        steps: [{ type: "tool", tool: "t", arguments: { a: "1" } }],
      }),
    );
    const result = await runner.run("x");
    assert.equal(result.finalOutput, "tool-out");
    assert.deepEqual(seen, ["skill_run", "tool_call"]);
  });
});

describe("formatSkillsContextSection", () => {
  it("formats installed skills for context injection", () => {
    const text = formatSkillsContextSection([
      defineSkill({ name: "a", description: "do a", steps: [] }),
    ]);
    assert.match(text, /- a: do a/);
  });
});

describe("SkillRunner store helpers", () => {
  it("save/installFromStore uses the store", async () => {
    const store = new MemorySkillStore();
    const runner = new SkillRunner({
      store,
      executeTool: async () => undefined,
    });
    await runner.save(
      defineSkill({
        name: "stored",
        steps: [{ type: "note", text: "n" }],
      }),
    );
    const other = new SkillRunner({ store });
    const names = await other.installFromStore();
    assert.ok(names.includes("stored"));
  });
});
