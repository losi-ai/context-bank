/**
 * Snapshot serialization and pluggable storage.
 *
 * A {@link ContextSnapshot} is the unit that persists across model switches and
 * sessions. This module makes that persistence real: serialize a snapshot to a
 * portable string, restore it later, and plug in any {@link SnapshotStore}
 * (in-memory, disk, KV, Redis, ...) behind one small interface.
 *
 * @packageDocumentation
 */

import type { ContextSnapshot } from "./memory.js";
import { LosiError } from "./errors.js";

/** Current serialization format version. Bumped on breaking shape changes. */
export const SNAPSHOT_FORMAT_VERSION = 1 as const;

/** The on-the-wire shape produced by {@link serializeSnapshot}. */
export interface SerializedSnapshot {
  /** Format version for forward-compatible deserialization. */
  v: typeof SNAPSHOT_FORMAT_VERSION;
  /** The snapshot payload. */
  snapshot: ContextSnapshot;
}

/**
 * Serialize a snapshot to a portable JSON string.
 *
 * @param snapshot - The snapshot to serialize.
 * @param pretty - When true, pretty-print the JSON.
 */
export function serializeSnapshot(snapshot: ContextSnapshot, pretty = false): string {
  const payload: SerializedSnapshot = { v: SNAPSHOT_FORMAT_VERSION, snapshot };
  return JSON.stringify(payload, null, pretty ? 2 : undefined);
}

/**
 * Restore a snapshot from a string produced by {@link serializeSnapshot}.
 *
 * @throws {@link LosiError} if the input is not valid or is an unknown version.
 */
export function deserializeSnapshot(input: string): ContextSnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new LosiError("SNAPSHOT_PARSE_ERROR", "Snapshot is not valid JSON");
  }

  if (typeof parsed !== "object" || parsed === null || !("v" in parsed) || !("snapshot" in parsed)) {
    throw new LosiError("SNAPSHOT_INVALID", "Serialized snapshot is missing required fields");
  }

  const { v, snapshot } = parsed as { v: number; snapshot: ContextSnapshot };
  if (v !== SNAPSHOT_FORMAT_VERSION) {
    throw new LosiError(
      "SNAPSHOT_VERSION",
      `Unsupported snapshot version ${v}; this build supports v${SNAPSHOT_FORMAT_VERSION}`,
    );
  }
  if (!Array.isArray(snapshot.sections) || typeof snapshot.capturedAt !== "string") {
    throw new LosiError("SNAPSHOT_INVALID", "Serialized snapshot has an invalid shape");
  }
  return snapshot;
}

/**
 * Pluggable persistence for snapshots, keyed by an arbitrary string (e.g. a
 * user id, session id, or workspace id). Implement this to store snapshots in
 * disk, a KV store, Redis, or your database.
 *
 * @example
 * ```ts
 * class RedisSnapshotStore implements SnapshotStore {
 *   async load(key) { const s = await redis.get(key); return s ? deserializeSnapshot(s) : null; }
 *   async save(key, snap) { await redis.set(key, serializeSnapshot(snap)); }
 *   async delete(key) { await redis.del(key); }
 * }
 * ```
 */
export interface SnapshotStore {
  /** Load a snapshot by key, or `null` if none exists. */
  load(key: string): Promise<ContextSnapshot | null> | ContextSnapshot | null;
  /** Persist a snapshot under a key. */
  save(key: string, snapshot: ContextSnapshot): Promise<void> | void;
  /** Remove a snapshot by key. */
  delete(key: string): Promise<void> | void;
}

/**
 * A simple in-memory {@link SnapshotStore}. Great for tests and single-process
 * apps; swap for a durable store in production. Serializes on write so stored
 * snapshots are decoupled from the caller's object references.
 */
export class MemorySnapshotStore implements SnapshotStore {
  private readonly map = new Map<string, string>();

  load(key: string): ContextSnapshot | null {
    const raw = this.map.get(key);
    return raw ? deserializeSnapshot(raw) : null;
  }

  save(key: string, snapshot: ContextSnapshot): void {
    this.map.set(key, serializeSnapshot(snapshot));
  }

  delete(key: string): void {
    this.map.delete(key);
  }

  /** Number of stored snapshots (test/debug helper). */
  get size(): number {
    return this.map.size;
  }

  /** Clear all stored snapshots. */
  clear(): void {
    this.map.clear();
  }
}
