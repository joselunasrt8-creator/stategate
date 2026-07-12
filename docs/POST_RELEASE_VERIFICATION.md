# StateGate Post-Release Verification

Use this checklist immediately after maintainers create or update the floating `v1` tag. These checks are intentionally consumer-facing and do not require rewriting historical `v1.0.0` provenance.

## Tag resolution

- Verify the exact and floating tags resolve to the same commit:

  ```bash
  git ls-remote --tags https://github.com/joselunasrt8-creator/stategate.git refs/tags/v1 refs/tags/v1.0.0
  ```

- Confirm both returned object IDs are identical. If `v1.0.0` is annotated, dereference with `refs/tags/v1.0.0^{}` and compare the commit object to `refs/tags/v1`.
- Confirm the target commit is the intended release commit and not merely the current development branch tip.

## Marketplace rendering

- Open the GitHub Marketplace listing and verify the name is exactly `Continufy StateGate`.
- Verify the Marketplace description is exactly `Govern repository state transitions. VALID | NULL | PROOF.`
- Search GitHub Marketplace for `StateGate`, `Continufy StateGate`, and `repository state transitions`; confirm the listing is visible and not shown under obsolete public-facing product branding.

## Independent consumer install

Create or use an unrelated repository and add the workflow from `examples/consumer-workflow.yml` without replacing the action reference. The install reference must remain:

```yaml
uses: joselunasrt8-creator/stategate@v1
```

Run the workflow manually and verify:

- The required check/job name is `stategate`.
- The VALID fixture step completes with `result=VALID`.
- The NULL fixture step is allowed to fail closed through `continue-on-error: true` and reports `result=NULL` with non-empty `null_reasons`.
- The VALID proof artifact is present as `stategate-valid-proof` and contains `MERGE_GUARD_PROOF.json`.
- The NULL proof artifact is present as `stategate-null-proof` and contains `MERGE_GUARD_PROOF.json`.

## Compatibility-sensitive proof identifiers

Inspect a downloaded proof artifact and confirm these compatibility identifiers remain unchanged unless a future major release deliberately changes proof semantics:

- `record_type`: `MERGE_GUARD_PROOF`
- Proof filename: `MERGE_GUARD_PROOF.json`
- Artifact name emitted by the action: `MERGE_GUARD_PROOF`
- Proof ID prefix: `MERGE_GUARD-`
- Canonical algorithm version: `merge-guard-v1`
- Environment variable/input compatibility surface: `MERGE_GUARD_*`

## Release metadata consistency

- Verify `action.yml` still renders the Marketplace name and description used above.
- Verify `release/validator-metadata.json` for the published release uses the intended semantic version and does not report `development`.
- Verify the release manifest source commit matches the exact tag target for any newly built patch release.
- Do not edit historical `v1.0.0` metadata to claim a newer StateGate rename commit if the immutable tag did not use that source.

## Rollback if `v1` points to the wrong commit

1. Stop recommending `@v1` until the pointer is corrected; temporarily instruct consumers to pin the known-good exact tag or full commit SHA.
2. Identify the intended target commit and verify its release manifest, validator metadata, changelog entry, and proof-contract tests.
3. Move only the floating `v1` tag back to the verified commit through the repository maintainer release process.
4. Re-run the tag-resolution, Marketplace, independent consumer install, VALID/NULL, proof artifact, and compatibility-sensitive identifier checks above.
5. Publish a corrective release note or advisory if consumers may have installed from the wrong `v1` target.
