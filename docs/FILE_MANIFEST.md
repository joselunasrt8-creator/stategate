# File Manifest

## Canonical source

- Repository: historical upstream package
- Source path: `actions/stategate/`
- Source ref inspected: `main`
- Canonical source commit SHA: `0f31d1dbb1ea7a3b786ca848edef03c263536e66` (latest path-history commit inspected for `actions/stategate/` on `main`).

## Files copied / packaged

| Standalone path | Canonical source path | Purpose |
| --- | --- | --- |
| `action.yml` | `actions/stategate/action.yml` | Root GitHub Action metadata for Marketplace discovery and action execution. |
| `check.mjs` | `actions/stategate/check.mjs` | Runtime adapter, pull-request diff acquisition, proof artifact writer, outputs, and fail-closed CLI entrypoint. |
| `guard.mjs` | New canonical enforcement module | Single canonical StateGate validation implementation and proof projection used by CLI, action, tests, and library imports. |
| `canonical.mjs` | `actions/stategate/canonical.mjs` | Deterministic JSON canonicalization, canonical diff normalization, and SHA-256 implementation. |
| `attribution.mjs` | `actions/stategate/attribution.mjs` | Canonical Agent Identity attribution metadata classification. |
| `test.mjs` | `actions/stategate/test.mjs` | Canonical fixture-based conformance test harness. |
| `fixtures/*.json` | `actions/stategate/fixtures/*.json` | Local conformance fixtures for VALID/NULL, policy, attribution, and deterministic hash checks. |
| `README.md` | `actions/stategate/README.md` plus Marketplace adaptation | Root documentation with required Marketplace install path. |
| `LICENSE` | Existing standalone repository root | Root Apache-2.0 license. |
| `docs/FILE_MANIFEST.md` | New standalone packaging document | Extraction manifest and verification notes. |

## Intentional adaptations

- `action.yml` is kept at repository root for GitHub Marketplace compatibility.
- Runtime path is adapted from nested source execution to root execution: `node "${{ github.action_path }}/check.mjs"`.
- Marketplace metadata is preserved at root: action name, description, branding, and README install example using `joselunasrt8-creator/stategate@v1`.
- The previous invented `src/merge-guard.sh` keyword heuristic was removed; runtime behavior is Node-based canonical identity evaluation.

## Dependency notes

- Runtime: Node.js on the GitHub-hosted runner.
- Action dependency: `actions/upload-artifact@v4` for `MERGE_GUARD_PROOF` artifact upload.
- No npm package install, package manager, compiled `dist`, or external network dependency is required by the action logic.
- The action uses the GitHub REST API only to fetch pull-request JSON, the exact GitHub pull-request diff when a caller does not provide `pr-diff`, and pull-request reviews when `require-review-approval` is true and `review-evidence` is omitted; unavailable or mismatched diff/review provenance fails closed to `NULL`.

## Verification

- Canonical source path located in the public repository browser view at the historical upstream package path used before standalone StateGate packaging.
- Runtime files reconciled to a single canonical Node validation implementation (`guard.mjs`) with `check.mjs` limited to runtime adaptation, diff/review acquisition, proof emission, and GitHub outputs.
- Tests run locally:
  - `ruby -e 'require "yaml"; data=YAML.load_file("action.yml"); raise unless data["runs"]["using"] == "composite"; raise unless data["name"] == "StateGate"'`
  - `node --check check.mjs`
  - `node --check canonical.mjs`
  - `node --check attribution.mjs`
  - `node --check guard.mjs`
  - `node test.mjs`
  - root action CLI smoke checks for `VALID` and `NULL` paths.

## Repository audit notes

- Duplicate StateGate decision logic was consolidated into `guard.mjs`; `evaluate` remains only as a compatibility alias.
- The proof object is projected by `proofFromDecision()` so proof emission cannot diverge from validation output.
- Diff provenance, attribution evidence, and optional review evidence semantics are explicitly bound and documented: `diff_source` affects proof identity, attribution status/classification/evidence hash are included in the canonical payload, and review policy/result/evidence hash are included when review binding is enabled.
- No obsolete shell runtime, package manager artifacts, or compiled distribution files are present in this standalone action package.
