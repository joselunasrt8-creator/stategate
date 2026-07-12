# StateGate v1.0.0 Release Checklist

Release purpose: first canonical release under the StateGate identity. Do not create, move, or publish Git tags or GitHub releases until these manual checks are complete.

- [ ] All tests pass.
- [ ] Working tree clean before tagging.
- [ ] Change `release/validator-metadata.json` from `development` to the intended exact semantic version.
- [ ] `release/validator-metadata.json` version matches the intended exact tag.
- [ ] `CHANGELOG.md` includes the intended version.
- [ ] `node scripts/build-release-manifest.mjs` generated `release/RELEASE_MANIFEST.json`.
- [ ] `node scripts/verify-release.mjs --published --tag=vX.Y.Z` passes without rewriting the manifest.
- [ ] Source commit recorded in `release/RELEASE_MANIFEST.json`.
- [ ] Exact tag `vX.Y.Z` created at the recorded source commit.
- [ ] Release title exactly matches `StateGate vX.Y.Z` or the approved tag title convention.
- [ ] Release notes exactly match the tag and changelog entry.
- [ ] Major tag update is deliberate and verified.
- [ ] GitHub Marketplace rendering inspected and confirmed to read `StateGate` with `Govern repository state transitions. VALID | NULL | PROOF.`
- [ ] Fresh consumer install verified with `uses: joselunasrt8-creator/stategate@v1`.
- [ ] Exact-tag rollback verified.
- [ ] Issue #34 evidence recorded, including blocked criteria if any remain.
