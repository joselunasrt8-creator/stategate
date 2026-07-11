# Changelog

Stable format: each release records semantic version, release date, source commit, canonical algorithm version, proof schema version, added, changed, fixed, compatibility impact, and replay impact.

## [1.0.0] - 2026-07-11

- Source commit: see `release/RELEASE_MANIFEST.json` `source_commit` for the reproducible release commit recorded by the manifest builder.
- Canonical algorithm version: `merge-guard-v1`
- Proof schema version: `1.0.0`

### Added
- Initial GitHub Action, CLI, tests, and library entrypoints using the canonical `validateMergeGuard(input) -> VALID | NULL -> proofFromDecision(decision) -> MERGE_GUARD_PROOF.json` runtime path.
- Deterministic release metadata, manifest hashing, and local release verification tooling for the existing `v1.0.0` release line.

### Changed
- Proofs now include a validator identity envelope that identifies the validator implementation without changing the canonical decision hash boundary.

### Fixed
- Release-governance documentation now distinguishes validator version, canonical algorithm version, and proof schema version.

### Compatibility impact
- Compatible within `>=1.0.0 <2.0.0`; no Merge Guard validation outcome changes are intended.

### Replay impact
- Historical canonical decision hashes remain bound to the validated merge object and enabled policies. New proofs add validator identity for implementation provenance.
