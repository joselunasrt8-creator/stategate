# StateGate

StateGate is a deterministic GitHub Action for validating an explicitly identified pull request state and emitting replayable evidence of that validation.

Its narrow determination is:

> **Did this exact pull request object satisfy the validation rules enabled for this StateGate run?**

```text
Validation ≠ authorization
VALID ≠ permission
Proof ≠ legitimacy
Required check ≠ StateGate-granted authority
```

## Purpose

CI can test repository contents without necessarily binding a result to the exact pull request state later considered for merge. Reviews can also become stale when the head commit changes.

StateGate addresses that evidence-binding problem by evaluating one explicit pull request object and returning:

- `VALID` — the supplied object and enabled StateGate validation rules passed.
- `NULL` — required data is missing, malformed, stale, unavailable, inconsistent, or violates an enabled rule.

Each action or CLI evaluation writes `MERGE_GUARD_PROOF.json`, binding the result to the evaluated head SHA, base SHA, canonical diff, attribution evidence, and enabled review policy. Incomplete required evidence produces `NULL`, not inferred success.

A repository owner may separately configure GitHub to require the StateGate workflow before merge. That external configuration can make StateGate operationally load-bearing; StateGate itself does not grant merge authority.

## Getting Started

Create `.github/workflows/stategate.yml` in the consuming repository:

```yaml
name: StateGate
on:
  pull_request:
    types: [opened, synchronize, reopened]
permissions:
  contents: read
  pull-requests: read
  actions: write
jobs:
  stategate:
    name: stategate
    runs-on: ubuntu-latest
    steps:
      - name: Validate pull request state
        uses: joselunasrt8-creator/stategate@v1
        with:
          repo: ${{ github.repository }}
          pr-number: ${{ github.event.pull_request.number }}
          head-sha: ${{ github.event.pull_request.head.sha }}
          base-sha: ${{ github.event.pull_request.base.sha }}
          actor: ${{ github.event.pull_request.user.login }}
```

For reproducible installations, pin an exact release or full commit SHA rather than relying on a moving major-version reference.

## Determination boundary

`VALID` means the required validated-object fields were present, identity checks passed, canonicalization completed, enabled attribution/review rules passed, and supplied replay guards matched.

It does **not** mean the pull request is correct, secure, authorized, organizationally permitted, desirable, or required to merge.

`NULL` means StateGate could not produce `VALID` under the supplied object and enabled rules. It is a fail-closed validation result, not a universal determination that the proposed change is illegitimate or must never merge.

Repository governance determines what operational consequence follows from either result.

## Relationship to GitHub governance

GitHub provides branch protection, required checks, CODEOWNERS, merge queues, repository rules, identity/access controls, and the merge operation itself.

StateGate complements those mechanisms by producing deterministic evidence about an exact evaluated pull request state.

```text
Pull request state
        ↓
StateGate validation
        ↓
VALID / NULL + proof
        ↓
Repository-defined governance
        ↓
Possible merge eligibility
        ↓
GitHub merge operation
```

The arrows do not transfer authority from StateGate. Repository-defined governance decides whether StateGate is required and what other conditions must hold.

## Scope

StateGate validates the state supplied to a single run. Its boundary includes repository/PR identity, head/base SHAs, canonical diff bytes and provenance, actor/attribution evidence, optional review evidence bound to the current head SHA, and optional expected hashes used for replay checks.

The deterministic boundary begins after external evidence has been acquired. Network retrieval is not deterministic; acquired values and provenance become inputs to the deterministic validator.

## Runtime

```text
GitHub pull request event
          ↓
      action.yml
          ↓
      check.mjs
          ↓
      guard.mjs
       ↙     ↘
    VALID    NULL
       ↘     ↙
 MERGE_GUARD_PROOF.json
```

`guard.mjs` is the canonical decision surface. Action, CLI, tests, and library exports enter `validateMergeGuard(input)`. Canonicalization and SHA-256 hashing live in `canonical.mjs`; attribution normalization lives in `attribution.mjs`.

## Key concepts

| Term | Meaning |
| --- | --- |
| **Validated object** | Normalized identity, diff, attribution, policy, and review fields evaluated in one run. |
| **Canonical diff** | Normalized unified diff used for deterministic hashing. |
| **Proof** | `MERGE_GUARD_PROOF.json`, the serialized record projected from the decision. |
| **Replay guard** | An expected hash that must match the current evaluation. |
| **Attribution evidence** | Explicit and heuristic signals used to classify authorship. |
| **Review binding** | Optional validation that normalized approval evidence applies to the evaluated head SHA. |
| **`VALID`** | The exact supplied object passed StateGate's enabled validation rules. |
| **`NULL`** | StateGate failed closed for one or more bounded reasons. |

Compatibility identifiers such as `MERGE_GUARD_PROOF.json`, `MERGE_GUARD_*`, and `merge-guard-v1` remain part of the replay-sensitive v1 contract.

## Responsibilities

StateGate validates required pull request identity, checks acquired SHAs, canonicalizes and hashes diff content, binds attribution evidence, evaluates enabled authorship/review rules, compares optional replay hashes, emits outputs/proof, and returns non-zero status for `NULL`.

## Non-responsibilities

StateGate does not:

- determine whether code is correct, secure, tested, useful, or deployable;
- authenticate asserted identity beyond supplied/acquired evidence;
- create organizational authority or decide who may merge;
- grant merge permission or perform the merge;
- configure branch protection, rulesets, merge queues, or required checks;
- replace CODEOWNERS, CI, security scanning, or deployment controls;
- establish that StateGate is necessary for a repository;
- establish independent adoption or customer value; or
- provide general-purpose Continufy execution legitimacy.

## Making StateGate load-bearing

A repository owner can configure GitHub governance so the `stategate` check is required before merge.

That creates a dependency of the repository's merge policy on the check. Authority still originates in the repository's configured governance and authorized actors, not in StateGate's `VALID` output.

```text
StateGate: this object passed these validation rules.
Repository governance: this check is required before merge.
GitHub: configured merge conditions are or are not satisfied.
Authorized actor/system: performs the merge.
```

## Evidence and claim boundary

StateGate can support claims about deterministic validation, exact pull-request-state binding, replay-sensitive hashes, stale-review rejection when enabled, bounded fail-closed behavior, and reproducible proof generation under its declared semantics.

StateGate alone cannot establish that requiring it improves repository outcomes, prevents meaningful incidents better than GitHub-native controls, is needed by external users, is economically justified, or should be generalized into broader execution governance.

Those are empirical questions.

## Evaluation questions

Further validation should compare StateGate with strong baselines such as appropriately configured GitHub-native controls and simpler state-binding checks:

1. What failure classes does StateGate detect that the baseline misses?
2. Are those failures consequential in realistic workflows?
3. What false-block or operational burden does it introduce?
4. Can the same guarantee be achieved more simply?
5. Does an independent repository choose to retain it after testing?
6. Which proof fields are actually necessary downstream?

Negative results may justify simplification, narrowing, replacement, or retirement rather than feature expansion.

## Local verification

With Node.js available:

```bash
node --check canonical.mjs
node --check attribution.mjs
node --check guard.mjs
node --check check.mjs
node test.mjs
```

See `examples/consumer-workflow.yml` for deterministic `VALID` and bounded `NULL` examples and `docs/ARCHITECTURE.md` for the execution-path audit and determinism boundary.

## Current boundary

StateGate is currently best treated as a specific deterministic repository-state validator whose broader operational value remains an empirical question.

Its strongest current claim is that, for its declared input contract and enabled rules, it can bind a deterministic `VALID`/`NULL` determination and replayable proof to an exact pull request state.
