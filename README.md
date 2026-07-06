# ContinuityOS Merge Guard

![ContinuityOS Merge Guard](7894E300-3D37-45CC-BDA5-3B6C6D90E118.png)

> Deterministically validate pull request identity before merge.

ContinuityOS Merge Guard is a portable GitHub Action that validates canonical pull request identity, applies explicit author policy, emits a proof artifact, and exposes a load-bearing GitHub status check.

## Hero Architecture

```text
PR
↓
Canonical PR Identity
+ Explicit Author Policy
↓
Canonicalization
↓
VALID / NULL
↓
Proof
↓
Required Status Check
```

## Governance vocabulary

- `VALID` → Merge Eligible
- `NULL` → Blocked
- `PROOF` → Verifiable Evidence

## Repository Boundary

This action owns:

- canonical PR identity normalization
- explicit author-policy validation
- canonical hashing
- proof emission
- GitHub status reporting

This action does not own:

- code review
- security analysis
- CI validation
- repository approval policy
- runtime governance
- merge authorization

Merge Guard validates identity only. Final merge decisions remain the responsibility of GitHub branch protection and repository policy.

## What this proves

This proves the PR identity object and explicit author-policy scope are complete, canonicalized, hashed, and proof-bound before merge eligibility:

```text
validated_object == merge_guard_object
```

Boundary statements:

- The action does not inspect the PR diff.
- The action does not validate review approvals.
- The action does not classify humans or agents from hidden platform authority.
- The action does not bind the final merge commit.
- It is an identity legitimacy check, not a review system or policy engine.

## Installation

```yaml
name: ContinuityOS Merge Guard

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  merge-guard:
    runs-on: ubuntu-latest
    steps:
      - uses: joselunasrt8-creator/continuity-merge-guard@v1
        id: merge-guard
        with:
          repo: ${{ github.repository }}
          pr-number: ${{ github.event.pull_request.number }}
          head-sha: ${{ github.event.pull_request.head.sha }}
          base-sha: ${{ github.event.pull_request.base.sha }}
          actor: ${{ github.event.pull_request.user.login }}
```

## Enforce as a required check

After committing the workflow, configure branch protection to require the `merge-guard` job before merge. The action exits non-zero for `NULL`, so GitHub branch protection can use this job directly as the load-bearing required status check.

## Runtime

```text
Pull Request
        ↓
Canonical Identity
        ↓
Validation
        ↓
VALID / NULL
        ↓
Proof
        ↓
GitHub Status Check
```

The action evaluates canonical pull request identity, emits a proof artifact, and exposes a deterministic status check for branch protection.

## Output

Each run produces:

| Output | Description |
|--------|-------------|
| `result` | `VALID` or `NULL` |
| `proof_id` | `MERGE_GUARD-{pr_number}-{head_sha[:8]}` |
| `proof_hash` | sha256 of the canonical payload |
| `proof_url` | path to `MERGE_GUARD_PROOF.json` |
| `author_kind` | normalized `agent`, `human`, or `unknown` author scope |
| `null_reasons` | comma-separated NULL reason codes, empty for `VALID` |
| `attribution_status` | `identity_present`, `identity_missing`, or `identity_ambiguous` |
| `attribution_classification` | `AGENT_AUTHORED`, `AGENT_ASSISTED`, `HUMAN_AUTHORED`, or `UNKNOWN` |
| `actor_kind` | normalized actor kind `human`, `agent`, `bot`, or `unknown` |
| `attribution_evidence_hash` | sha256 of the canonicalized attribution evidence |

The proof is written to the job step summary and uploaded as a workflow artifact named `MERGE_GUARD_PROOF`.

## Read outputs in later steps

```yaml
      - uses: joselunasrt8-creator/continuity-merge-guard@v1
        id: merge-guard
        with:
          repo: ${{ github.repository }}
          pr-number: ${{ github.event.pull_request.number }}
          head-sha: ${{ github.event.pull_request.head.sha }}
          base-sha: ${{ github.event.pull_request.base.sha }}
          actor: ${{ github.event.pull_request.user.login }}

      - name: Show proof binding
        if: always()
        run: |
          echo "result=${{ steps.merge-guard.outputs.result }}"
          echo "proof_hash=${{ steps.merge-guard.outputs.proof_hash }}"
          echo "null_reasons=${{ steps.merge-guard.outputs.null_reasons }}"
```

## Agent-authored required lane

For an agent-authored PR lane, make the check load-bearing by setting `require-agent-authored: 'true'` and providing the explicit `author-kind` value from the workflow policy:

```yaml
      - uses: joselunasrt8-creator/continuity-merge-guard@v1
        id: merge-guard
        with:
          repo: ${{ github.repository }}
          pr-number: ${{ github.event.pull_request.number }}
          head-sha: ${{ github.event.pull_request.head.sha }}
          base-sha: ${{ github.event.pull_request.base.sha }}
          actor: ${{ github.event.pull_request.user.login }}
          author-kind: agent
          require-agent-authored: 'true'
```

## File manifest and verification

See [`docs/FILE_MANIFEST.md`](docs/FILE_MANIFEST.md) for the complete file manifest, intentional root-packaging adaptations, canonical source reference, and verification notes.

## Release Status

This repository has been prepared for human review only. No release, tag, or Marketplace listing has been created.
