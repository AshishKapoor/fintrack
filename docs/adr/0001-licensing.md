# ADR-0001: Licensing — MIT now, open-core boundary decided before monetisation

- **Status:** Accepted
- **Date:** 2026-08-13
- **Deciders:** Maintainer

## Context

FinTrack is MIT-licensed today. The project intends to (a) grow an outside
contributor base, and (b) eventually fund maintenance through a commercial
offering (see the strategy memo: open core, with hosted and team/enterprise
tiers).

Licence changes become progressively harder as contributors accumulate:
without a CLA, relicensing requires the agreement of every copyright holder.
That makes "decide later" a decision in itself — and the wrong one. Recent
history (Elastic, HashiCorp, Redis) also shows that switching an established
project *away* from an open licence burns community goodwill at exactly the
moment a project depends on it.

The options considered:

| Option | Effect | Assessment |
|---|---|---|
| MIT everywhere (status quo) | Maximum adoption; no protection against a hosted clone | Right for now; risk is theoretical until the project has traction worth cloning |
| AGPL-3.0 for the server | Hosted forks must publish source | Deters some corporate adoption; does not actually stop a determined competitor |
| BSL / Elastic-style | Blocks competing hosted offerings | Not open source by OSI's definition; goodwill cost exceeds today's revenue at risk (zero) |
| Open core | Core stays MIT; enterprise modules (SSO/SAML, SCIM, audit export, multi-entity consolidation) are commercially licensed | Compatible with all of the above later; requires the boundary to be stated early |

## Decision

1. **The core remains MIT.** "Core" means: the ledger and every invariant, all
   importers and exporters, the API, the SDKs, the web UI, and self-hosting
   with unlimited users, accounts and transactions. This list is a public
   promise (README/strategy memo) and items do not quietly move off it.
2. **The open-core boundary is organisational, not functional.** If a future
   commercial module exists, it will be of the shape "your company as an
   entity" — SSO/SAML/SCIM, compliance artefacts, consolidated multi-entity
   reporting, support contracts — never a cap that makes the free product feel
   broken for an individual.
3. **Contributions are accepted under the DCO** (Developer Certificate of
   Origin, `Signed-off-by` line), not a CLA. This is deliberate: it keeps the
   contribution barrier low *and* it intentionally makes a future move to a
   non-open licence require community consent. We are binding ourselves to the
   mast on purpose.
4. Any commercial module lives in a **separately licensed directory or
   repository**, clearly marked, so the licence of any given file is never
   ambiguous.

## Consequences

- A competitor may host FinTrack commercially without contributing back. We
  accept this; at the current stage, distribution is worth more than
  protection, and the moat is intended to be correctness, community and
  cadence rather than the licence.
- The DCO requirement needs enforcement in CI (a `Signed-off-by` check) and a
  note in CONTRIBUTING.md.
- Revisit this ADR when the first commercial module is about to be built —
  not to change the core licence, but to define the enterprise module licence
  text. A new ADR should record that decision.
