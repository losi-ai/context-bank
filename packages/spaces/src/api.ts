/**
 * The Losi platform API boundary for Spaces data.
 *
 * Everything above this file runs locally. This is the single, obvious place
 * where live workspace data is fetched from the hosted Losi platform. Provide
 * an `apiKey` + `workspaceId` to pull real tasks, notes, sheets, and events.
 *
 * @packageDocumentation
 */

import { ApiBoundaryError } from "@losi/core";

/** Connection settings for the hosted Losi platform. */
export interface LosiConnection {
  /** Losi API key (from your workspace settings at https://losi.ai). */
  apiKey?: string;
  /** Workspace id to scope data to. */
  workspaceId?: string;
  /** Override the API base URL. Defaults to the public Losi API. */
  baseUrl?: string;
  /** Custom fetch (tests / non-standard runtimes). Defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

/** Default hosted Losi API base URL. */
export const DEFAULT_LOSI_API = "https://losi.ai/api/v1/context-bank";

/**
 * Thin client for the hosted Losi Spaces API. Throws {@link ApiBoundaryError}
 * when no live connection is configured so the failure mode is explicit.
 */
export class SpacesApiClient {
  private readonly connection: LosiConnection;
  private readonly baseUrl: string;
  private readonly fetchImpl?: typeof fetch;

  constructor(connection: LosiConnection = {}) {
    this.connection = connection;
    this.baseUrl = connection.baseUrl ?? DEFAULT_LOSI_API;
    this.fetchImpl = connection.fetchImpl ?? globalThis.fetch;
  }

  /** Whether a live connection is configured. */
  get isConnected(): boolean {
    return Boolean(this.connection.apiKey && this.connection.workspaceId);
  }

  /**
   * Fetch a Spaces resource. This is the API boundary — wire it to your hosted
   * Losi workspace by supplying an apiKey + workspaceId.
   */
  async fetchResource<T>(resource: string, query?: Record<string, string>): Promise<T> {
    if (!this.isConnected) {
      throw new ApiBoundaryError(
        `Spaces is not connected. Provide { apiKey, workspaceId } to fetch live "${resource}" data from the Losi platform.`,
      );
    }
    if (!this.fetchImpl) {
      throw new ApiBoundaryError("No fetch implementation available for the Losi API");
    }

    const url = new URL(
      `${this.baseUrl}/workspaces/${this.connection.workspaceId}/spaces/${resource}`,
    );
    for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v);

    const res = await this.fetchImpl(url.toString(), {
      headers: { authorization: `Bearer ${this.connection.apiKey}` },
    });
    if (!res.ok) {
      throw new ApiBoundaryError(`Losi Spaces API returned ${res.status} for "${resource}"`);
    }
    return (await res.json()) as T;
  }
}
