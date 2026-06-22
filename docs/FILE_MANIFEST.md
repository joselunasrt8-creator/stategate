# File Manifest

## Copied / prepared action files

| Path | Purpose |
| --- | --- |
| `action.yml` | Root GitHub Action metadata for Marketplace discovery and action execution. |
| `README.md` | Root documentation with title, tagline, vocabulary, installation example, and review status. |
| `LICENSE` | Root Apache-2.0 license already present in the repository. |
| `src/merge-guard.sh` | Composite action executable used by `action.yml`. |
| `docs/FILE_MANIFEST.md` | Review manifest and dependency notes. |

## Dependency notes

- Runtime shell: `bash` on the GitHub-hosted runner.
- Runtime parser: `python3` on the GitHub-hosted runner for reading the pull request event payload.
- No npm, package manager, compiled `dist`, or external network dependency is required.

## Source reconciliation note

The requested source path was `ContinuityOS-/actions/continuity-merge-guard/`. That source tree was not present under `/workspace` during preparation, and direct `git ls-remote` attempts to likely GitHub source locations were blocked by the environment. Human review should reconcile this standalone tree against the canonical source repository before publishing.
