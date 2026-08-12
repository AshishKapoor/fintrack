# ADR-0000: Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-08-13

## Context

Architectural reasoning currently lives in commit messages, pull request
descriptions and one contributor's head. The next maintainer inherits
archaeology instead of reasoning, and recurring debates ("why two API
surfaces?", "why MIT?") get re-litigated because nothing records why the
decision went the way it did.

## Decision

Significant architectural decisions are recorded as Architecture Decision
Records in `docs/adr/`, numbered sequentially, in the format used by this file:
Status, Date, Context, Decision, Consequences.

"Significant" means: anything that changes the data model, the public API
surface, the licence, the security model, or a load-bearing dependency.
Renames, refactors and feature work do not need an ADR.

An ADR is proposed as a pull request. Discussion happens on the PR; merging it
marks the decision **Accepted**. A superseded ADR is not edited — a new ADR
references and supersedes it, so the history of reversals stays readable.

For larger changes that need design discussion *before* a decision (the
data-model consolidation, the monorepo restructure), open a GitHub Discussion
first and distil the outcome into the ADR.

## Consequences

- `docs/adr/` becomes the first stop for "why is it like this?".
- Decisions cost one markdown file of overhead, which is the point: cheap
  enough to actually write, permanent enough to matter.
