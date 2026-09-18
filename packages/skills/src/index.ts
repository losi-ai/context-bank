/**
 * `@losi/skills` — reusable, multi-step agent skills.
 *
 * A skill is a named, parameterized sequence of steps. A step can be a tool
 * call, a note, or a checkpoint. Steps run in order and each step's output is
 * passed forward, so later steps can reference earlier results. Parameters are
 * referenced with `{{paramName}}` syntax and interpolated at run time.
 *
 * @packageDocumentation
 */

import { LosiError } from "@losi/core";

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

/**
 * Runs skills. Tool steps are executed via a supplied {@link ToolExecutor}
 * (wire this to `@losi/mcp` or your own tools). Note and checkpoint steps run
 * locally.
 *
 * @example
 * ```ts
 * const runner = new SkillRunner(async (tool, args) => callMyTool(tool, args));
 * const result = await runner.run(skill, { topic: "pricing" });
 * console.log(result.finalOutput);
 * ```
 */
export class SkillRunner {
  private readonly registry = new Map<string, Skill>();

  constructor(private readonly executeTool: ToolExecutor = () => undefined) {}

  /** Install a skill into the runner's registry. */
  install(skill: Skill): void {
    this.registry.set(skill.name, skill);
  }

  /** Install many skills at once (e.g. from a fetched registry). */
  installAll(skills: Skill[]): void {
    for (const s of skills) this.install(s);
  }

  /** List installed skill names. */
  list(): string[] {
    return [...this.registry.keys()];
  }

  /** Get an installed skill by name. */
  get(name: string): Skill | undefined {
    return this.registry.get(name);
  }

  /**
   * Run a skill (by name or by definition) with the given inputs. Steps run in
   * order; each step's output is available to later steps as `{{steps.id}}`.
   */
  async run(
    skillOrName: Skill | string,
    inputs: Record<string, string> = {},
  ): Promise<SkillRunResult> {
    const skill = typeof skillOrName === "string" ? this.registry.get(skillOrName) : skillOrName;
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

/** Type-safe helper to author a {@link Skill}. */
export function defineSkill(skill: Skill): Skill {
  return skill;
}
