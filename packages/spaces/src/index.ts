/**
 * `@losi-ai/spaces` — workspace execution context for LLMs.
 *
 * Spaces binds tasks, notes, sheets, and calendar context into a
 * {@link ContextSnapshot}. Two ways to feed it data:
 *
 * 1. **Local data provider** — supply a {@link SpacesDataProvider} and it works
 *    fully offline, no hosted account required.
 * 2. **Hosted Losi platform** — supply `{ apiKey, workspaceId }` and it pulls
 *    live workspace data from https://losi.ai via {@link SpacesApiClient}.
 *
 * A local provider always takes precedence when present.
 *
 * @packageDocumentation
 */

import type { ContextBinding, ContextSection, DataScope, KnowledgeGraph } from "@losi-ai/core";
import { createGraph, addNode, addEdge } from "@losi-ai/core";
import { SpacesApiClient } from "./api.js";
import type { LosiConnection } from "./api.js";

export * from "./api.js";

/** A task or subtask record. */
export interface Task {
  id: string;
  title: string;
  status?: string;
  assignee?: string;
  dueAt?: string;
}

/** A note or document record. */
export interface Note {
  id: string;
  title: string;
  excerpt?: string;
}

/** A calendar event record. */
export interface SpaceEvent {
  id: string;
  title: string;
  startsAt: string;
}

/** A sheet (spreadsheet) summary record. */
export interface Sheet {
  id: string;
  name: string;
  summary?: string;
}

/**
 * A local source of Spaces data. Each field may be a static array or a function
 * (sync or async) that receives the prompt and returns matching records.
 *
 * @example
 * ```ts
 * const data: SpacesDataProvider = {
 *   tasks: async (q) => db.searchTasks(q),
 *   events: [{ id: "1", title: "Sprint review", startsAt: "2026-09-19T15:00" }],
 * };
 * ```
 */
export interface SpacesDataProvider {
  tasks?: Task[] | ((prompt: string) => Task[] | Promise<Task[]>);
  notes?: Note[] | ((prompt: string) => Note[] | Promise<Note[]>);
  events?: SpaceEvent[] | ((prompt: string) => SpaceEvent[] | Promise<SpaceEvent[]>);
  sheets?: Sheet[] | ((prompt: string) => Sheet[] | Promise<Sheet[]>);
}

/** What Spaces context to include, plus how to source it. */
export interface SpacesConfig extends LosiConnection {
  /** Include tasks and subtasks. */
  tasks?: boolean;
  /** Include notes and documents. */
  notes?: boolean;
  /** Include calendar events. */
  calendar?: boolean;
  /** Include sheet (spreadsheet) summaries. */
  sheets?: boolean;
  /**
   * A local data provider. When set, Spaces resolves entirely from it and never
   * calls the hosted API — fully usable offline.
   */
  data?: SpacesDataProvider;
}

async function resolveField<T>(
  source: T[] | ((prompt: string) => T[] | Promise<T[]>) | undefined,
  prompt: string,
): Promise<T[]> {
  if (!source) return [];
  return typeof source === "function" ? source(prompt) : source;
}

function renderTasks(tasks: Task[]): string {
  return tasks
    .map(
      (t) =>
        `- [${t.status ?? "open"}] ${t.title}` +
        `${t.assignee ? ` (@${t.assignee})` : ""}${t.dueAt ? ` due ${t.dueAt}` : ""}`,
    )
    .join("\n");
}

/**
 * Spaces context binding. Add it to a {@link LosiContext} to enrich prompts
 * with workspace data — from a local provider or the hosted Losi platform.
 *
 * @example
 * ```ts
 * // Fully local:
 * const spaces = new SpacesBinding({
 *   tasks: true,
 *   data: { tasks: [{ id: "1", title: "Ship SDK", status: "in-progress" }] },
 * });
 * const ctx = new LosiContext({ adapter, bindings: [spaces] });
 * ```
 */
export class SpacesBinding implements ContextBinding {
  readonly name = "spaces";
  readonly scopes: DataScope[];
  private readonly config: SpacesConfig;
  private readonly api: SpacesApiClient;
  private readonly data?: SpacesDataProvider;

  constructor(config: SpacesConfig = {}) {
    this.config = config;
    this.data = config.data;
    this.api = new SpacesApiClient(config);
    const scopes: DataScope[] = ["workspace"];
    if (config.tasks) scopes.push("tasks");
    if (config.notes) scopes.push("notes");
    if (config.calendar) scopes.push("calendar");
    if (config.sheets) scopes.push("sheets");
    this.scopes = scopes;
  }

  /** True when data is sourced locally (offline-capable). */
  get isLocal(): boolean {
    return this.data != null;
  }

  /** True when a hosted Losi connection is configured. */
  get isConnected(): boolean {
    return this.api.isConnected;
  }

  private async fetchTasks(prompt: string): Promise<Task[]> {
    if (this.data) return resolveField(this.data.tasks, prompt);
    return this.api.fetchResource<Task[]>("tasks", { q: prompt });
  }

  private async fetchNotes(prompt: string): Promise<Note[]> {
    if (this.data) return resolveField(this.data.notes, prompt);
    return this.api.fetchResource<Note[]>("notes", { q: prompt });
  }

  private async fetchEvents(prompt: string): Promise<SpaceEvent[]> {
    if (this.data) return resolveField(this.data.events, prompt);
    return this.api.fetchResource<SpaceEvent[]>("events", { q: prompt });
  }

  private async fetchSheets(prompt: string): Promise<Sheet[]> {
    if (this.data) return resolveField(this.data.sheets, prompt);
    return this.api.fetchResource<Sheet[]>("sheets", { q: prompt });
  }

  async resolve(prompt: string): Promise<ContextSection[]> {
    const sections: ContextSection[] = [];

    if (this.config.tasks) {
      const tasks = await this.fetchTasks(prompt);
      if (tasks.length > 0) {
        sections.push({ scope: "tasks", label: "Relevant tasks", content: renderTasks(tasks) });
      }
    }

    if (this.config.notes) {
      const notes = await this.fetchNotes(prompt);
      if (notes.length > 0) {
        sections.push({
          scope: "notes",
          label: "Relevant notes",
          content: notes.map((n) => `- ${n.title}${n.excerpt ? `: ${n.excerpt}` : ""}`).join("\n"),
        });
      }
    }

    if (this.config.calendar) {
      const events = await this.fetchEvents(prompt);
      if (events.length > 0) {
        sections.push({
          scope: "calendar",
          label: "Upcoming events",
          content: events.map((e) => `- ${e.startsAt}: ${e.title}`).join("\n"),
        });
      }
    }

    if (this.config.sheets) {
      const sheets = await this.fetchSheets(prompt);
      if (sheets.length > 0) {
        sections.push({
          scope: "sheets",
          label: "Relevant sheets",
          content: sheets.map((s) => `- ${s.name}${s.summary ? `: ${s.summary}` : ""}`).join("\n"),
        });
      }
    }

    return sections;
  }

  /**
   * Enrich a raw prompt with Spaces context inline, returning a single string.
   *
   * @param prompt - The user prompt.
   * @returns The prompt prefixed with a rendered Spaces context block.
   */
  async injectIntoPrompt(prompt: string): Promise<string> {
    const sections = await this.resolve(prompt);
    if (sections.length === 0) return prompt;
    const context = sections.map((s) => `## ${s.label}\n${s.content}`).join("\n\n");
    return `# Workspace context (Spaces)\n\n${context}\n\n# Request\n${prompt}`;
  }

  /**
   * Resolve relational context: tasks and events as nodes, with `assigned_to`
   * and `scheduled_as` edges. Surfaces workspace structure as a graph the model
   * can reason over, not just a flat task list.
   *
   * @param prompt - The user prompt used to select relevant records.
   * @returns A {@link KnowledgeGraph}, or `undefined` if nothing relevant.
   */
  async resolveGraph(prompt: string): Promise<KnowledgeGraph | undefined> {
    const graph = createGraph();
    let has = false;

    if (this.config.tasks) {
      const tasks = await this.fetchTasks(prompt);
      for (const t of tasks) {
        const taskId = `task:${t.id}`;
        addNode(graph, {
          id: taskId,
          type: "task",
          label: t.title,
          summary: t.status,
          metadata: { dueAt: t.dueAt },
        });
        has = true;
        if (t.assignee) {
          const personId = `person:${t.assignee}`;
          addNode(graph, { id: personId, type: "person", label: t.assignee });
          addEdge(graph, { from: taskId, to: personId, type: "assigned_to" });
        }
      }
    }

    if (this.config.calendar) {
      const events = await this.fetchEvents(prompt);
      for (const e of events) {
        const eventId = `event:${e.id}`;
        addNode(graph, {
          id: eventId,
          type: "event",
          label: e.title,
          metadata: { startsAt: e.startsAt },
        });
        has = true;
      }
    }

    return has ? graph : undefined;
  }
}
