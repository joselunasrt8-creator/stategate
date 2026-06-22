# ContinuityOS Merge Guard

Govern AI-generated pull requests before they merge.

## Governance vocabulary

- `VALID` → Merge Eligible
- `NULL` → Blocked
- `PROOF` → Verifiable Evidence

## Installation

```yaml
name: ContinuityOS Merge Guard

on:
  pull_request:
    types: [opened, edited, synchronize, reopened]

jobs:
  merge-guard:
    runs-on: ubuntu-latest
    steps:
      - uses: joselunasrt8-creator/continuity-merge-guard@v1
```

## Standalone action layout

This repository is structured as a standalone GitHub Action. The action metadata lives at the repository root so consumers and GitHub Marketplace validation can resolve it directly.

## File manifest

See [`docs/FILE_MANIFEST.md`](docs/FILE_MANIFEST.md) for the complete file manifest prepared for review.

## Publishing status

This repository has been prepared for human review only. No release, tag, or Marketplace listing has been created.
