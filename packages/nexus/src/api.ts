/**
 * The Losi platform API boundary for Nexus data.
 *
 * Everything above this file is fully implemented and runs locally. This file
 * is the single, obvious place where live data is fetched from the hosted Losi
 * platform (https://losi.ai). Provide an `apiKey` + `workspaceId` to pull real
 * CRM, booking, and conversation data.
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
 * Thin client for the hosted Losi Nexus API. When no API key is configured,
 * calls throw {@link ApiBoundaryError} so the failure mode is explicit rather
 * than silently returning empty context.
 */
export class NexusApiClient {
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
   * Fetch a Nexus resource. This is the API boundary — wire it to your hosted
   * Losi workspace by supplying an apiKey + workspaceId.
   *
   * @param resource - Resource path segment, e.g. "bookings", "contacts".
   * @param query - Optional query params (e.g. a search string).
   */
  async fetchResource<T>(resource: string, query?: Record<string, string>): Promise<T> {
    if (!this.isConnected) {
      throw new ApiBoundaryError(
        `Nexus is not connected. Provide { apiKey, workspaceId } to fetch live "${resource}" data from the Losi platform.`,
      );
    }
    if (!this.fetchImpl) {
      throw new ApiBoundaryError("No fetch implementation available for the Losi API");
    }

    const url = new URL(`${this.baseUrl}/workspaces/${this.connection.workspaceId}/nexus/${resource}`);
    for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v);

    const res = await this.fetchImpl(url.toString(), {
      headers: { authorization: `Bearer ${this.connection.apiKey}` },
    });
    if (!res.ok) {
      throw new ApiBoundaryError(`Losi Nexus API returned ${res.status} for "${resource}"`);
    }
    return (await res.json()) as T;
  }
}
