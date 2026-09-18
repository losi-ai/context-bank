# Provenance & Auditing

Assembling context is easy. Explaining it — *why was this in the prompt?* and
*what changed between two runs?* — is what safety, compliance, and debugging
teams actually need. `@losi/core` makes both first-class and MIT-licensed.

## Provenance: why context was included

Annotate a snapshot's sections with where they came from:

```ts
import { annotateProvenance } from "@losi/core";

const annotated = annotateProvenance(snapshot, (section) => ({
  binding: "nexus",
  scope: section.scope,
  resolvedAt: new Date().toISOString(),
  reason: "matched the user's query",
}));

annotated.sections[0].provenance;
// { binding: "nexus", scope: "bookings", resolvedAt: "...", reason: "..." }
```

`ContextSection.provenance` is an optional, typed field, so a later audit can
answer "which binding produced this, and why" for every piece of the prompt.

## Diffing: what changed

Compare two snapshots — e.g. before and after a refresh, or across a model
switch — to see exactly which sections and relationships were added or removed.

```ts
import { diffSnapshots, renderDiff } from "@losi/core";

const diff = diffSnapshots(before, after);
diff.summary;            // { added: 2, removed: 1 }
renderDiff(diff);
// + [section] bookings::Upcoming
// - [section] crm::Leads
// + [edge] c1 -booked-> b1
```

## Why this matters

No competitor memory SDK exposes portable provenance + snapshot diffing at this
layer. Combined with the [governance](./governance.md) audit log, you get an
end-to-end answer to "what did the agent see, why, and what changed" — the
foundation for auditable, reviewable AI. Next: [Governance](./governance.md).
