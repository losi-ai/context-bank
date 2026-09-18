/**
 * `@losi/mcp` — Model Context Protocol client adapter with governance.
 *
 * Connects to an MCP server over JSON-RPC, lists tools, and calls them — but
 * every connection carries `accessScopes` (what the tool CAN see) and
 * `blockedScopes` (what it CANNOT). Scope checks run *before* any tool call.
 *
 * The client-side MCP transport is fully implemented against the public MCP
 * JSON-RPC spec. Enforcement against centrally-managed Losi platform policies
 * is delegated to an optional policy hook — the clean boundary to the hosted
 * Losi governance API.
 *
 * @packageDocumentation
 */

import type { DataScope, ToolDefinition, ToolCall } from "@losi/core";
import { ScopeError, LosiError } from "@losi/core";

/** Configuration for a single MCP tool connection. */
export interface MCPConnectionConfig {
  /** Friendly connection name, e.g. "github". */
  name: string;
  /** MCP server URL (HTTP JSON-RPC endpoint). */
  serverUrl: string;
  /** Data scopes this connection is permitted to access. */
  accessScopes?: DataScope[];
  /** Data scopes this connection must never access (takes precedence). */
  blockedScopes?: DataScope[];
  /** Optional bearer token for the MCP server. */
  authToken?: string;
  /** Custom fetch (for tests or non-standard runtimes). Defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

/** A tool advertised by an MCP server, tagged with the scope it touches. */
export interface MCPTool extends ToolDefinition {
  /** The data scope this tool accesses, if declared by the server or config. */
  scope?: DataScope;
}

/**
 * Optional hook to check a tool call against centrally-managed Losi policies.
 * Return `false` (or throw) to deny. This is the boundary to the hosted Losi
 * governance API — wire it to a real policy service in production.
 */
export type PolicyHook = (input: {
  connection: string;
  tool: string;
  scope?: DataScope;
}) => boolean | Promise<boolean>;

interface JsonRpcResponse<T> {
  jsonrpc: "2.0";
  id: number | string;
  result?: T;
  error?: { code: number; message: string };
}

/**
 * A governed MCP client for a single server connection.
 *
 * @example
 * ```ts
 * const client = new MCPClient({
 *   name: "github",
 *   serverUrl: "https://mcp.example.com/rpc",
 *   accessScopes: ["workspace"],
 *   blockedScopes: ["crm"],
 * });
 * const tools = await client.listTools();
 * const result = await client.callTool("create_issue", { title: "Bug" });
 * ```
 */
export class MCPClient {
  readonly name: string;
  private readonly serverUrl: string;
  private readonly accessScopes?: DataScope[];
  private readonly blockedScopes: DataScope[];
  private readonly authToken?: string;
  private readonly fetchImpl: typeof fetch;
  private readonly policyHook?: PolicyHook;
  private nextId = 1;
  private toolScopes = new Map<string, DataScope>();

  constructor(config: MCPConnectionConfig, policyHook?: PolicyHook) {
    this.name = config.name;
    this.serverUrl = config.serverUrl;
    this.accessScopes = config.accessScopes;
    this.blockedScopes = config.blockedScopes ?? [];
    this.authToken = config.authToken;
    this.fetchImpl = config.fetchImpl ?? globalThis.fetch;
    this.policyHook = policyHook;
    if (!this.fetchImpl) {
      throw new LosiError(
        "NO_FETCH",
        "No fetch implementation available; pass fetchImpl in MCPConnectionConfig",
      );
    }
  }

  private async rpc<T>(method: string, params?: Record<string, unknown>): Promise<T> {
    const id = this.nextId++;
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (this.authToken) headers.authorization = `Bearer ${this.authToken}`;

    const res = await this.fetchImpl(this.serverUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    });
    if (!res.ok) {
      throw new LosiError("MCP_HTTP_ERROR", `MCP server returned ${res.status}`);
    }
    const body = (await res.json()) as JsonRpcResponse<T>;
    if (body.error) {
      throw new LosiError("MCP_RPC_ERROR", `MCP error ${body.error.code}: ${body.error.message}`);
    }
    return body.result as T;
  }

  /**
   * Check whether a given scope is permitted for this connection.
   * `blockedScopes` always wins; if `accessScopes` is set, the scope must be in it.
   */
  isScopeAllowed(scope?: DataScope): boolean {
    if (!scope) return true;
    if (this.blockedScopes.includes(scope)) return false;
    if (this.accessScopes && this.accessScopes.length > 0) {
      return this.accessScopes.includes(scope);
    }
    return true;
  }

  /**
   * List tools advertised by the MCP server. Tools whose scope is blocked for
   * this connection are filtered out.
   */
  async listTools(): Promise<MCPTool[]> {
    const result = await this.rpc<{ tools: Array<Record<string, unknown>> }>("tools/list");
    const tools: MCPTool[] = (result.tools ?? []).map((t) => {
      const scope = (t.scope as DataScope | undefined) ?? undefined;
      const name = String(t.name);
      if (scope) this.toolScopes.set(name, scope);
      return {
        name,
        description: String(t.description ?? ""),
        parameters: (t.inputSchema as Record<string, unknown>) ?? {},
        scope,
      };
    });
    return tools.filter((t) => this.isScopeAllowed(t.scope));
  }

  /**
   * Call a tool by name. Enforces scope restrictions and the optional policy
   * hook *before* contacting the server.
   *
   * @throws {@link ScopeError} if the tool's scope is blocked or not allowed.
   */
  async callTool(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
    const scope = this.toolScopes.get(name);

    if (!this.isScopeAllowed(scope)) {
      throw new ScopeError(
        `Tool "${name}" accesses scope "${scope}" which is not permitted for connection "${this.name}"`,
      );
    }

    if (this.policyHook) {
      const ok = await this.policyHook({ connection: this.name, tool: name, scope });
      if (!ok) {
        throw new ScopeError(
          `Tool "${name}" was denied by the governance policy for connection "${this.name}"`,
        );
      }
    }

    return this.rpc<unknown>("tools/call", { name, arguments: args });
  }

  /** Build a {@link ToolCall} record without executing it (useful for logging). */
  describeCall(id: string, name: string, args: Record<string, unknown>): ToolCall {
    return { id, name, arguments: args };
  }
}

/**
 * A registry of multiple named MCP connections. Route a tool call to the right
 * connection while keeping per-connection scope governance intact.
 */
export class MCPRegistry {
  private readonly clients = new Map<string, MCPClient>();

  /** Register (or replace) a connection. */
  connect(config: MCPConnectionConfig, policyHook?: PolicyHook): MCPClient {
    const client = new MCPClient(config, policyHook);
    this.clients.set(config.name, client);
    return client;
  }

  /** Get a connection by name. */
  get(name: string): MCPClient | undefined {
    return this.clients.get(name);
  }

  /** List tools across all connections, tagged with their connection name. */
  async listAllTools(): Promise<Array<MCPTool & { connection: string }>> {
    const out: Array<MCPTool & { connection: string }> = [];
    for (const [name, client] of this.clients) {
      const tools = await client.listTools();
      for (const t of tools) out.push({ ...t, connection: name });
    }
    return out;
  }

  /** Call a tool on a named connection. */
  async callTool(
    connection: string,
    tool: string,
    args: Record<string, unknown> = {},
  ): Promise<unknown> {
    const client = this.clients.get(connection);
    if (!client) {
      throw new LosiError("MCP_NO_CONNECTION", `No MCP connection named "${connection}"`);
    }
    return client.callTool(tool, args);
  }
}
