# Persistence & Storage

A `ContextSnapshot` is the unit that persists across sessions and model
switches. `@losi/core` gives you serialization and a pluggable store.

## Serialize

```ts
import { serializeSnapshot, deserializeSnapshot } from "@losi/core";

const wire = serializeSnapshot(ctx.getSnapshot());   // versioned JSON string
const restored = deserializeSnapshot(wire);          // throws on bad/old input
```

`serializeSnapshot` embeds a format version; `deserializeSnapshot` validates it
and the snapshot shape, throwing a typed `LosiError` on mismatch.

## Pluggable store

Implement `SnapshotStore` to persist snapshots anywhere — disk, KV, Redis, your
DB:

```ts
import { SnapshotStore, serializeSnapshot, deserializeSnapshot } from "@losi/core";

class RedisSnapshotStore implements SnapshotStore {
  async load(key: string) { const s = await redis.get(key); return s ? deserializeSnapshot(s) : null; }
  async save(key: string, snap) { await redis.set(key, serializeSnapshot(snap)); }
  async delete(key: string) { await redis.del(key); }
}
```

`MemorySnapshotStore` is included for tests and single-process apps.

## Wire it into a context

```ts
import { LosiContext, MemorySnapshotStore } from "@losi/core";

const ctx = new LosiContext({ adapter, store: new MemorySnapshotStore(), persistKey: "user-42" });

await ctx.complete("Remember I prefer concise answers.");
await ctx.persist();     // save under persistKey (or persist(key))
// ...new process / new session...
await ctx.restore();     // snapshot is back — no re-fetch
```

The stored graph, sections, and provenance all round-trip. Next:
[Resilience](./resilience.md).
