/**
 * `@losi/nexus` — business operations context for LLMs.
 *
 * Nexus binds CRM, bookings, and conversation context into a
 * {@link ContextSnapshot} so any model has full business awareness. There are
 * two ways to feed it data:
 *
 * 1. **Local data provider** — supply a {@link NexusDataProvider} (a plain
 *    object or async functions) and it works fully offline, no hosted account
 *    required. Great for bringing your own database or a static dataset.
 * 2. **Hosted Losi platform** — supply `{ apiKey, workspaceId }` and it pulls
 *    live data from https://losi.ai via {@link NexusApiClient}.
 *
 * A local provider always takes precedence when present.
 *
 * @packageDocumentation
 */

import type { ContextBinding, ContextSection, DataScope, KnowledgeGraph } from "@losi/core";
import { createGraph, addNode, addEdge } from "@losi/core";
import { NexusApiClient } from "./api.js";
import type { LosiConnection } from "./api.js";

export * from "./api.js";

/** A CRM contact record. */
export interface Contact {
  id: string;
  name: string;
  email?: string;
  company?: string;
  stage?: string;
}

/** A booking / appointment record. */
export interface Booking {
  id: string;
  title: string;
  startsAt: string;
  with?: string;
}

/** A conversation summary record. */
export interface Conversation {
  id: string;
  summary: string;
  channel?: string;
}

/**
 * A local source of Nexus data. Each field may be a static array or a function
 * (sync or async) that receives the prompt and returns matching records. Bring
 * your own database, CRM export, or fixtures — no hosted Losi account needed.
 *
 * @example
 * ```ts
 * const data: NexusDataProvider = {
 *   contacts: async (q) => db.searchContacts(q),
 *   bookings: [{ id: "1", title: "Standup", startsAt: "2026-09-15T09:00" }],
 * };
 * ```
 */
export interface NexusDataProvider {
  contacts?: Contact[] | ((prompt: string) => Contact[] | Promise<Contact[]>);
  bookings?: Booking[] | ((prompt: string) => Booking[] | Promise<Booking[]>);
  conversations?:
    | Conversation[]
    | ((prompt: string) => Conversation[] | Promise<Conversation[]>);
}

/** What Nexus context to include, plus how to source it. */
export interface NexusConfig extends LosiConnection {
  /** Include CRM contacts/leads/companies. */
  crm?: boolean;
  /** Include bookings and appointments. */
  bookings?: boolean;
  /** Include recent conversation logs. */
  conversations?: boolean;
  /**
   * A local data provider. When set, Nexus resolves entirely from it and never
   * calls the hosted API — so the package is fully usable offline.
   */
  data?: NexusDataProvider;
}

async function resolveField<T>(
  source: T[] | ((prompt: string) => T[] | Promise<T[]>) | undefined,
  prompt: string,
): Promise<T[]> {
  if (!source) return [];
  return typeof source === "function" ? source(prompt) : source;
}

function renderContacts(contacts: Contact[]): string {
  return contacts
    .map((c) => `- ${c.name}${c.company ? ` (${c.company})` : ""}${c.stage ? ` — ${c.stage}` : ""}`)
    .join("\n");
}

function renderBookings(bookings: Booking[]): string {
  return bookings
    .map((b) => `- ${b.startsAt}: ${b.title}${b.with ? ` with ${b.with}` : ""}`)
    .join("\n");
}

function renderConversations(convos: Conversation[]): string {
  return convos
    .map((c) => `- ${c.summary}${c.channel ? ` (${c.channel})` : ""}`)
    .join("\n");
}

/**
 * Nexus context binding. Add it to a {@link LosiContext} to enrich prompts
 * with business data — from a local provider or the hosted Losi platform.
 *
 * @example
 * ```ts
 * // Fully local — no hosted account needed:
 * const nexus = new NexusBinding({
 *   bookings: true,
 *   data: { bookings: [{ id: "1", title: "Demo", startsAt: "2026-09-15T14:00", with: "Ada" }] },
 * });
 * const ctx = new LosiContext({ adapter, bindings: [nexus] });
 * ```
 */
export class NexusBinding implements ContextBinding {
  readonly name = "nexus";
  readonly scopes: DataScope[];
  private readonly config: NexusConfig;
  private readonly api: NexusApiClient;
  private readonly data?: NexusDataProvider;

  constructor(config: NexusConfig = {}) {
    this.config = config;
    this.data = config.data;
    this.api = new NexusApiClient(config);
    const scopes: DataScope[] = [];
    if (config.crm) scopes.push("crm");
    if (config.bookings) scopes.push("bookings");
    if (config.conversations) scopes.push("conversations");
    this.scopes = scopes.length > 0 ? scopes : ["crm", "bookings", "conversations"];
  }

  /** True when data is sourced locally (offline-capable). */
  get isLocal(): boolean {
    return this.data != null;
  }

  /** True when a hosted Losi connection is configured. */
  get isConnected(): boolean {
    return this.api.isConnected;
  }

  private async fetchContacts(prompt: string): Promise<Contact[]> {
    if (this.data) return resolveField(this.data.contacts, prompt);
    return this.api.fetchResource<Contact[]>("contacts", { q: prompt });
  }

  private async fetchBookings(prompt: string): Promise<Booking[]> {
    if (this.data) return resolveField(this.data.bookings, prompt);
    return this.api.fetchResource<Booking[]>("bookings", { q: prompt });
  }

  private async fetchConversations(prompt: string): Promise<Conversation[]> {
    if (this.data) return resolveField(this.data.conversations, prompt);
    return this.api.fetchResource<Conversation[]>("conversations", { q: prompt });
  }

  async resolve(prompt: string): Promise<ContextSection[]> {
    const sections: ContextSection[] = [];

    if (this.config.crm) {
      const contacts = await this.fetchContacts(prompt);
      if (contacts.length > 0) {
        sections.push({
          scope: "crm",
          label: "Relevant CRM contacts",
          content: renderContacts(contacts),
        });
      }
    }

    if (this.config.bookings) {
      const bookings = await this.fetchBookings(prompt);
      if (bookings.length > 0) {
        sections.push({
          scope: "bookings",
          label: "Upcoming bookings",
          content: renderBookings(bookings),
        });
      }
    }

    if (this.config.conversations) {
      const convos = await this.fetchConversations(prompt);
      if (convos.length > 0) {
        sections.push({
          scope: "conversations",
          label: "Recent conversations",
          content: renderConversations(convos),
        });
      }
    }

    return sections;
  }

  /**
   * Enrich a raw prompt with Nexus context inline, returning a single string.
   * Useful when you are not using the full {@link LosiContext} orchestrator.
   *
   * @param prompt - The user prompt.
   * @returns The prompt prefixed with a rendered Nexus context block.
   */
  async injectIntoPrompt(prompt: string): Promise<string> {
    const sections = await this.resolve(prompt);
    if (sections.length === 0) return prompt;
    const context = sections.map((s) => `## ${s.label}\n${s.content}`).join("\n\n");
    return `# Business context (Nexus)\n\n${context}\n\n# Request\n${prompt}`;
  }

  /**
   * Resolve relational context: contacts, companies, and bookings as nodes,
   * with `works_at` and `booked` edges between them. This turns flat CRM lists
   * into a real graph — a contact that *booked* an appointment — which is the
   * relational context competitors only infer from chat logs.
   *
   * @param prompt - The user prompt used to select relevant records.
   * @returns A {@link KnowledgeGraph}, or `undefined` if nothing relevant.
   */
  async resolveGraph(prompt: string): Promise<KnowledgeGraph | undefined> {
    const graph = createGraph();
    let has = false;

    if (this.config.crm) {
      const contacts = await this.fetchContacts(prompt);
      for (const c of contacts) {
        const nodeId = `contact:${c.id}`;
        addNode(graph, {
          id: nodeId,
          type: "contact",
          label: c.name,
          summary: c.stage,
          metadata: { email: c.email },
        });
        has = true;
        if (c.company) {
          const companyId = `company:${c.company}`;
          addNode(graph, { id: companyId, type: "company", label: c.company });
          addEdge(graph, { from: nodeId, to: companyId, type: "works_at" });
        }
      }
    }

    if (this.config.bookings) {
      const bookings = await this.fetchBookings(prompt);
      for (const b of bookings) {
        const bookingId = `booking:${b.id}`;
        addNode(graph, {
          id: bookingId,
          type: "booking",
          label: b.title,
          metadata: { startsAt: b.startsAt },
        });
        has = true;
        if (b.with) {
          // Best-effort link to a contact by matching label.
          const contact = graph.nodes.find(
            (n) => n.type === "contact" && n.label === b.with,
          );
          const contactId = contact?.id ?? `contact:${b.with}`;
          if (!contact) {
            addNode(graph, { id: contactId, type: "contact", label: b.with });
          }
          addEdge(graph, {
            from: contactId,
            to: bookingId,
            type: "booked",
            validAt: b.startsAt,
          });
        }
      }
    }

    return has ? graph : undefined;
  }
}
