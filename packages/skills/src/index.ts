/**
 * `@losi-ai/skills` — reusable, multi-step agent skills.
 *
 * A skill is a named, parameterized sequence of steps. A step can be a tool
 * call, a note, or a checkpoint. Steps run in order and each step's output is
 * passed forward. Parameters use `{{paramName}}` interpolation.
 *
 * Persistence: pass a {@link SkillStore} (in-memory or hosted Losi) so skills
 * survive process restarts. Governance: wrap with {@link GovernedSkillRunner}
 * to enforce spend/rate/blocked-action policies on save and run.
 *
 * @packageDocumentation
 */

import { LosiError } from "@losi-ai/core";

/** A declared parameter for a skill. */
export interface SkillParameter {
  /** Parameter name, referenced as `{{name}}` inside steps. */
  name: string;
  /** Human-readable description. */
  description?: string;
  /** Whether the parameter must be supplied at run time. */
  required?: boolean;
  /** Default value used when not supplied. */
  default?: string;
}

/** A tool-call step: invokes a named tool with interpolated arguments. */
export interface ToolStep {
  type: "tool";
  /** Optional step id, used to reference this step's output later. */
  id?: string;
  /** Name of the tool to call. */
  tool: string;
  /** Arguments; string values support `{{param}}` and `{{steps.id}}` refs. */
  arguments?: Record<string, string>;
}

/** A note step: records a message (no side effects). */
export interface NoteStep {
  type: "note";
  id?: string;
  /** Note text; supports interpolation. */
  text: string;
}

/** A checkpoint step: a named marker, useful for pausing/branching. */
export interface CheckpointStep {
  type: "checkpoint";
  id?: string;
  /** Checkpoint label. */
  label: string;
}

/** Any skill step. */
export type SkillStep = ToolStep | NoteStep | CheckpointStep;

/** Library-style visibility when persisted on the hosted platform. */
export type SkillVisibility = "private" | "workspace";

/** A full skill definition. */
export interface Skill {
  /** Unique skill name. */
  name: string;
  /** Short description of what the skill does. */
  description?: string;
  /** Semver-ish version string. */
  version?: string;
  /** Declared parameters. */
  parameters?: SkillParameter[];
  /** Ordered steps. */
  steps: SkillStep[];
  /** Hosted id when loaded from Losi. */
  id?: string;
  /** Hosted visibility (private = creator; workspace = members). */
  visibility?: SkillVisibility;
}

/** Executes a tool call requested by a {@link ToolStep}. */
export type ToolExecutor = (
  tool: string,
  args: Record<string, unknown>,
) => Promise<unknown> | unknown;

/** The result of a single executed step. */
export interface StepResult {
  /** The step that ran. */
  step: SkillStep;
  /** The output produced (tool return value, note text, or checkpoint label). */
  output: unknown;
}

/** The result of running a skill. */
export interface SkillRunResult {
  /** The skill that ran. */
  skill: string;
  /** Results for each step, in order. */
  steps: StepResult[];
  /** Convenience: the output of the final step. */
  finalOutput: unknown;
}

/** Pluggable persistence for skills (memory or hosted Losi). */
export interface SkillStore {
  save(skill: Skill): Promise<Skill> | Skill;
  load(nameOrId: string): Promise<Skill | null> | Skill | null;
  list(): Promise<Skill[]> | Skill[];
  delete(nameOrId: string): Promise<void> | void;
}

/** In-process skill registry. Default when no hosted store is configured. */
export class MemorySkillStore implements SkillStore {
  private readonly byName = new Map<string, Skill>();

  save(skill: Skill): Skill {
    this.byName.set(skill.name, skill);
    return skill;
  }

  load(nameOrId: string): Skill | null {
    if (this.byName.has(nameOrId)) return this.byName.get(nameOrId)!;
    for (const skill of this.byName.values()) {
      if (skill.id === nameOrId) return skill;
    }
    return null;
  }

  list(): Skill[] {
    return [...this.byName.values()];
  }

  delete(nameOrId: string): void {
    if (this.byName.delete(nameOrId)) return;
    for (const [name, skill] of this.byName) {
      if (skill.id === nameOrId) {
        this.byName.delete(name);
        return;
      }
    }
  }
}

type LosiSkillStoreOptions = {
  apiKey: string;
  /** @deprecated Workspace is implied by the API key. */
  workspaceId?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

/**
 * Hosted skill store. Saves into Losi `workspace_skills` via the context-bank
 * API. Workspace is implied by a workspace-scoped API key.
 */
export class LosiSkillStore implements SkillStore {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: LosiSkillStoreOptions) {
    this.baseUrl = options.baseUrl ?? "https://losi.ai/api/v1/context-bank";
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  private skillsUrl(suffix = ""): string {
    return `${this.baseUrl}/skills${suffix}`;
  }

  private headers(): HeadersInit {
    return {
      authorization: `Bearer ${this.options.apiKey}`,
      "content-type": "application/json",
    };
  }

  async save(skill: Skill): Promise<Skill> {
    if (skill.id) {
      const res = await this.fetchImpl(this.skillsUrl(`/${skill.id}`), {
        method: "PATCH",
        headers: this.headers(),
        body: JSON.stringify(skill),
      });
      if (!res.ok) {
        throw new LosiError("SKILL_STORE_SAVE", `Failed to update skill (HTTP ${res.status})`);
      }
      const body = (await res.json()) as { skill: Skill };
      return body.skill;
    }

    const res = await this.fetchImpl(this.skillsUrl(), {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(skill),
    });
    if (!res.ok) {
      throw new LosiError("SKILL_STORE_SAVE", `Failed to save skill (HTTP ${res.status})`);
    }
    const body = (await res.json()) as { skill: Skill };
    return body.skill;
  }

  async load(nameOrId: string): Promise<Skill | null> {
    const skills = await this.list();
    return skills.find((s) => s.name === nameOrId || s.id === nameOrId) ?? null;
  }

  async list(): Promise<Skill[]> {
    const res = await this.fetchImpl(this.skillsUrl(), {
      headers: this.headers(),
    });
    if (!res.ok) {
      throw new LosiError("SKILL_STORE_LIST", `Failed to list skills (HTTP ${res.status})`);
    }
    const body = (await res.json()) as { skills: Skill[] };
    return body.skills ?? [];
  }

  async delete(nameOrId: string): Promise<void> {
    const skill = await this.load(nameOrId);
    if (!skill?.id) return;
    const res = await this.fetchImpl(this.skillsUrl(`/${skill.id}`), {
      method: "DELETE",
      headers: this.headers(),
    });
    if (!res.ok) {
      throw new LosiError("SKILL_STORE_DELETE", `Failed to delete skill (HTTP ${res.status})`);
    }
  }
}

/** Minimal governance surface used by {@link GovernedSkillRunner}. */
export interface SkillGovernance {
  enforceOrThrow(action: {
    agentId: string;
    type: string;
    scope?: string;
    details?: Record<string, unknown>;
  }): void;
}

const TEMPLATE_RE = /\{\{\s*([\w.]+)\s*\}\}/g;

/**
 * Interpolate `{{param}}` and `{{steps.id}}` references in a string against the
 * provided inputs and prior step outputs.
 */
export function interpolate(
  template: string,
  inputs: Record<string, string>,
  stepOutputs: Record<string, unknown>,
): string {
  return template.replace(TEMPLATE_RE, (_match, ref: string) => {
    if (ref.startsWith("steps.")) {
      const id = ref.slice("steps.".length);
      const value = stepOutputs[id];
      return value == null ? "" : String(value);
    }
    return inputs[ref] ?? "";
  });
}

/**
 * Resolve and validate inputs against a skill's declared parameters.
 *
 * @throws {@link LosiError} if a required parameter is missing.
 */
export function resolveInputs(
  skill: Skill,
  provided: Record<string, string> = {},
): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const param of skill.parameters ?? []) {
    const value = provided[param.name] ?? param.default;
    if (value == null && param.required) {
      throw new LosiError("SKILL_MISSING_PARAM", `Missing required parameter "${param.name}"`);
    }
    if (value != null) resolved[param.name] = value;
  }
  // Allow extra inputs not declared as params.
  return { ...provided, ...resolved };
}

export type SkillRunnerOptions = {
  executeTool?: ToolExecutor;
  store?: SkillStore;
  agentId?: string;
};

/**
 * Runs skills. Tool steps are executed via a supplied {@link ToolExecutor}.
 * Optional {@link SkillStore} enables save/load/installFromStore.
 */
export class SkillRunner {
  private readonly registry = new Map<string, Skill>();
  protected readonly executeTool: ToolExecutor;
  private readonly store?: SkillStore;
  protected readonly agentId: string;

  constructor(executeToolOrOptions: ToolExecutor | SkillRunnerOptions = () => undefined) {
    if (typeof executeToolOrOptions === "function") {
      this.executeTool = executeToolOrOptions;
      this.agentId = "default";
    } else {
      this.executeTool = executeToolOrOptions.executeTool ?? (() => undefined);
      this.store = executeToolOrOptions.store;
      this.agentId = executeToolOrOptions.agentId ?? "default";
    }
  }

  /** Install a skill into the runner's in-memory registry. */
  install(skill: Skill): void {
    this.registry.set(skill.name, skill);
  }

  /** Install many skills at once (e.g. from a fetched registry). */
  installAll(skills: Skill[]): void {
    for (const s of skills) this.install(s);
  }

  /** List installed skill names in the local registry. */
  list(): string[] {
    return [...this.registry.keys()];
  }

  /** Get an installed skill by name. */
  get(name: string): Skill | undefined {
    return this.registry.get(name);
  }

  /** Persist a skill through the configured store and install it locally. */
  async save(skill: Skill): Promise<Skill> {
    if (!this.store) {
      this.install(skill);
      return skill;
    }
    const saved = await this.store.save(skill);
    this.install(saved);
    return saved;
  }

  /** Load a skill from the store into the local registry. */
  async load(nameOrId: string): Promise<Skill | null> {
    if (!this.store) return this.registry.get(nameOrId) ?? null;
    const skill = await this.store.load(nameOrId);
    if (skill) this.install(skill);
    return skill;
  }

  /** Install every skill currently in the store. */
  async installFromStore(): Promise<string[]> {
    if (!this.store) return this.list();
    const skills = await this.store.list();
    this.installAll(skills);
    return skills.map((s) => s.name);
  }

  /**
   * Run a skill (by name or by definition) with the given inputs. Steps run in
   * order; each step's output is available to later steps as `{{steps.id}}`.
   */
  async run(
    skillOrName: Skill | string,
    inputs: Record<string, string> = {},
  ): Promise<SkillRunResult> {
    let skill =
      typeof skillOrName === "string" ? this.registry.get(skillOrName) : skillOrName;

    if (!skill && typeof skillOrName === "string" && this.store) {
      skill = (await this.store.load(skillOrName)) ?? undefined;
      if (skill) this.install(skill);
    }

    if (!skill) {
      throw new LosiError("SKILL_NOT_FOUND", `Skill "${String(skillOrName)}" is not installed`);
    }

    const resolvedInputs = resolveInputs(skill, inputs);
    const stepOutputs: Record<string, unknown> = {};
    const results: StepResult[] = [];

    for (const [index, step] of skill.steps.entries()) {
      const id = step.id ?? String(index);
      let output: unknown;

      switch (step.type) {
        case "tool": {
          const args: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(step.arguments ?? {})) {
            args[k] = interpolate(v, resolvedInputs, stepOutputs);
          }
          output = await this.executeTool(step.tool, args);
          break;
        }
        case "note": {
          output = interpolate(step.text, resolvedInputs, stepOutputs);
          break;
        }
        case "checkpoint": {
          output = step.label;
          break;
        }
      }

      stepOutputs[id] = output;
      results.push({ step, output });
    }

    return {
      skill: skill.name,
      steps: results,
      finalOutput: results.length > 0 ? results[results.length - 1]?.output : undefined,
    };
  }
}

/**
 * Skill runner that enforces governance on save/run and each tool step.
 * Pass a {@link PolicyManager} (or any object with `enforceOrThrow`) from
 * `@losi-ai/governance`.
 */
export class GovernedSkillRunner extends SkillRunner {
  constructor(
    private readonly governance: SkillGovernance,
    options: SkillRunnerOptions = {},
  ) {
    super(options);
  }

  override async save(skill: Skill): Promise<Skill> {
    this.governance.enforceOrThrow({
      agentId: this.agentId,
      type: "skill_save",
      scope: "skills",
      details: { skillName: skill.name },
    });
    return super.save(skill);
  }

  override async run(
    skillOrName: Skill | string,
    inputs: Record<string, string> = {},
  ): Promise<SkillRunResult> {
    const name = typeof skillOrName === "string" ? skillOrName : skillOrName.name;
    this.governance.enforceOrThrow({
      agentId: this.agentId,
      type: "skill_run",
      scope: "skills",
      details: { skillName: name },
    });

    let skill: Skill | null | undefined =
      typeof skillOrName === "string" ? this.get(skillOrName) : skillOrName;
    if (!skill && typeof skillOrName === "string") {
      skill = await this.load(skillOrName);
    }
    if (!skill) {
      throw new LosiError("SKILL_NOT_FOUND", `Skill "${name}" is not installed`);
    }

    const parentExecute = this.executeTool;
    const executeTool: ToolExecutor = async (tool, args) => {
      this.governance.enforceOrThrow({
        agentId: this.agentId,
        type: "tool_call",
        scope: "skills",
        details: { skillName: skill!.name, tool },
      });
      return parentExecute(tool, args);
    };

    const runner = new SkillRunner({ executeTool, agentId: this.agentId });
    runner.install(skill);
    return runner.run(skill, inputs);
  }
}

/** Type-safe helper to author a {@link Skill}. */
export function defineSkill(skill: Skill): Skill {
  return skill;
}

/**
 * Render a short "Available skills" context section for `LosiContext.remember`.
 * Use scope `"skills"` so governance data scopes can allow/deny it.
 */
export function formatSkillsContextSection(skills: Skill[]): string {
  if (skills.length === 0) return "No skills installed.";
  return skills
    .map((s) => `- ${s.name}${s.description ? `: ${s.description}` : ""}`)
    .join("\n");
}
