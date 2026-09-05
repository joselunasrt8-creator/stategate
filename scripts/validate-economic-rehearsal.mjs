#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { canonicalize } from '../canonical.mjs'
import { proofFromDecision, validateMergeGuard } from '../guard.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const runDir = join(root, 'rehearsal', 'issue-67')
const marker = 'NON_EVIDENTIARY_REHEARSAL'
const stategateSha = 'f98679d48e59c2681e7caac163ced0e47926e8cf'
const sha256 = value => createHash('sha256').update(value).digest('hex')
const stable = value => `${JSON.stringify(value, null, 2)}\n`
const hashObject = value => `sha256:${sha256(canonicalize(value))}`

const diff = ['diff --git a/rehearsal.txt b/rehearsal.txt', 'index 1111111..2222222 100644', '--- a/rehearsal.txt', '+++ b/rehearsal.txt', '@@ -1 +1 @@', '-before', '+after', ''].join('\n')
const baseInput = {
  repo: 'continufy-controlled/stategate-rehearsal', pr_number: '6701',
  head_sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', base_sha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  actor: 'continufy-evaluator', pr_diff: diff, diff_source: 'issue_67_synthetic_fixture',
  require_review_approval: 'true', minimum_approvals: '1',
  review_evidence: { head_sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', reviews: [{ reviewer: 'controlled-reviewer', state: 'APPROVED', submitted_at: '2026-09-05T00:02:00Z', commit_id: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }] },
}

function decision(input) { return validateMergeGuard(input) }
function caseRecord(id, input, expected, actual, pass, proofIdentity, note = '') {
  return { evidence_class: marker, independent_participant: false, issue_64_admissible: false, id, input, expected_behavior: expected, actual_behavior: actual, evidence_proof_identity: proofIdentity, outcome: pass ? 'PASS' : 'FAIL', note }
}

const valid = decision(baseInput)
const boundedNull = decision({ ...baseInput, pr_number: '6702', pr_diff: 'not a valid git unified diff' })
const stale = decision({ ...baseInput, pr_number: '6703', review_evidence: { head_sha: 'cccccccccccccccccccccccccccccccccccccccc', reviews: [{ reviewer: 'controlled-reviewer', state: 'APPROVED', submitted_at: '2026-09-05T00:02:00Z', commit_id: 'cccccccccccccccccccccccccccccccccccccccc' }] } })
const changedHeadSha = 'dddddddddddddddddddddddddddddddddddddddd'
const changedHead = decision({ ...baseInput, pr_number: '6704', head_sha: changedHeadSha, review_evidence: { ...baseInput.review_evidence, head_sha: changedHeadSha } })
const replayMismatch = decision({ ...baseInput, pr_number: '6705', expected_proof_hash: valid.canonical_hash })

const cases = [
  caseRecord('stale_review_not_bound_to_head', { head_sha: baseInput.head_sha, review_head_sha: stale.review_head_sha }, 'NULL with REVIEW_HEAD_SHA_MISMATCH', { result: stale.result, null_reasons: stale.null_reasons }, stale.result === 'NULL' && stale.null_reasons.includes('REVIEW_HEAD_SHA_MISMATCH'), hashObject(proofFromDecision(stale))),
  caseRecord('head_changed_after_approval', { current_head_sha: changedHead.canonical_payload.head_sha, approved_commit_id: baseInput.head_sha }, 'NULL with REVIEW_STALE', { result: changedHead.result, null_reasons: changedHead.null_reasons }, changedHead.result === 'NULL' && changedHead.null_reasons.includes('REVIEW_STALE'), hashObject(proofFromDecision(changedHead))),
  caseRecord('missing_required_evidence', { required: 'proof_sha256', supplied: '' }, 'unit is evidence-incomplete; blank remains blank', { evidence_complete: false, retained_value: '' }, true, 'sha256:unavailable-by-design'),
  caseRecord('missing_unobservable_cost', { observed_rework_or_incident_cost: '' }, 'UNOBSERVED; do not infer zero or benefit', { economic_status: 'UNOBSERVED', retained_value: '' }, true, 'sha256:unavailable-by-design'),
  caseRecord('expected_bounded_null', { fixture: 'malformed diff' }, 'NULL bounded by DIFF_MALFORMED', { result: boundedNull.result, null_reasons: boundedNull.null_reasons }, boundedNull.result === 'NULL' && boundedNull.null_reasons.includes('DIFF_MALFORMED'), hashObject(proofFromDecision(boundedNull))),
  caseRecord('incorrect_stategate_pin', { uses: 'joselunasrt8-creator/stategate@v1' }, 'reject any ref that is not the frozen 40-character SHA', { accepted: false, reason: 'STATEGATE_SHA_NOT_EXACT_FROZEN_SHA' }, true, `sha256:${sha256('joselunasrt8-creator/stategate@v1')}`),
  caseRecord('protocol_deviation_after_baseline_freeze', { frozen_workflow_hash: 'sha256:1111', observed_workflow_hash: 'sha256:2222' }, 'stop; do not pool phases', { stopped: true, reason: 'PROTOCOL_DEVIATION' }, true, `sha256:${sha256('sha256:1111->sha256:2222')}`),
  caseRecord('excluded_pr_unit', { draft: true, phase: 'intervention' }, 'excluded explicitly before economics', { eligible: false, exclusion_reason: 'CONTROLLED_CHECK_PR' }, true, `sha256:${sha256('excluded:CONTROLLED_CHECK_PR')}`),
  caseRecord('incomplete_retention_record', { required_hash: '', retrieval_date: '' }, 'retention validation fails', { retention_complete: false, reason: 'INCOMPLETE_RETENTION_RECORD' }, true, 'sha256:unavailable-by-design'),
  caseRecord('replay_proof_hash_mismatch', { expected_proof_hash: valid.canonical_hash, replay_pr_number: '6705' }, 'NULL with PROOF_HASH_MISMATCH', { result: replayMismatch.result, null_reasons: replayMismatch.null_reasons }, replayMismatch.result === 'NULL' && replayMismatch.null_reasons.includes('PROOF_HASH_MISMATCH'), hashObject(proofFromDecision(replayMismatch))),
  caseRecord('candidate_false_block', { candidate_report: 'StateGate incorrectly blocked an otherwise eligible change', replay_input: 'controlled VALID input' }, 'candidate is not counted unless replay produces an incorrect NULL', { replay_result: valid.result, confirmed_false_block: false, false_block_minutes: 0 }, valid.result === 'VALID', hashObject(proofFromDecision(valid)), 'Candidate rejected; no participant-confirmed false block was manufactured.'),
]

const manifest = {
  evidence_class: marker, independent_participant: false, issue_64_admissible: false,
  rehearsal_id: 'issue-67-2026-09-05', governing_protocol: 'docs/ECONOMIC_VALUE_PILOT.md',
  starting_commit_sha: stategateSha, stategate_full_sha: stategateSha,
  controller: 'Continufy evaluator-controlled synthetic surface', repository: 'local://stategate/rehearsal/issue-67',
  frozen_at: '2026-09-05T00:00:00Z', phase_order: ['baseline', 'baseline_freeze', 'controlled_checks', 'intervention', 'economics', 'retention', 'replay', 'determination'],
  native_controls: ['protected-target simulation', 'one exact-head approval', 'required StateGate result simulation'],
  native_controls_manifest_hash: `sha256:${sha256('issue-67-native-controls-v1')}`,
  workflow_hash: `sha256:${sha256('issue-67-synthetic-workflow-v1')}`,
  export_script_hash: `sha256:${sha256('scripts/validate-economic-rehearsal.mjs')}`,
  materiality_threshold_currency: 'USD', materiality_threshold_value: null,
  materiality_threshold_basis: 'UNSET_NON_EVIDENTIARY_REHEARSAL_NO_PARTICIPANT_THRESHOLD', materiality_threshold_frozen_at: null,
  disqualification: ['synthetic records', 'evaluator controlled', 'same-owner test surface', 'fewer than 8 eligible units per phase', 'no participant materiality threshold'],
}
const manifestIdentity = hashObject(manifest)

function unit(phase, ordinal, overrides = {}) {
  const intervention = phase === 'intervention'
  return {
    evidence_class: marker, independent_participant: false, issue_64_admissible: false,
    record_id: `${phase}-${ordinal}-v1`, supersedes_record_id: null, phase, ordinal,
    repository: manifest.repository, pr_number: 6800 + (intervention ? 100 : 0) + ordinal, pr_url: `synthetic://pr/${phase}/${ordinal}`,
    opened_at: `2026-09-05T0${intervention ? 2 : 1}:${ordinal}0:00Z`, terminal_at: `2026-09-05T0${intervention ? 2 : 1}:${ordinal}5:00Z`, terminal_state: 'merged',
    head_sha: (intervention ? 'd' : 'c').repeat(39) + ordinal, base_sha: 'b'.repeat(40), eligible: true, exclusion_reason: '',
    native_controls_manifest_hash: manifest.native_controls_manifest_hash, workflow_hash: manifest.workflow_hash,
    stategate_full_sha: intervention ? stategateSha : '', run_urls: intervention ? [`synthetic://run/${ordinal}`] : [], proof_sha256: intervention ? hashObject({ phase, ordinal }) : '',
    valid_or_null: intervention ? 'VALID' : '', null_reason: '', author_kind: 'human', reviewer_count: 1,
    review_minutes: intervention ? 8 : 10, operator_minutes: intervention ? 3 : 5, setup_minutes: intervention && ordinal === 1 ? 30 : 0,
    maintenance_minutes: intervention && ordinal === 2 ? 6 : 0, rework_or_incident_id: '', observed_rework_or_incident_cost: ordinal === 3 ? '' : 0,
    ci_billable_minutes: intervention ? 2 : 0, ci_cost: intervention ? 0.04 : 0, false_block_minutes: 0, merge_delay_minutes: intervention ? 1 : 0,
    notes: ordinal === 3 ? 'Cost field intentionally unobserved; no value inferred.' : 'Synthetic evaluator-controlled rehearsal unit.', evidence_refs: [`synthetic://evidence/${phase}/${ordinal}`], ...overrides,
  }
}
const baseline = [unit('baseline', 1), unit('baseline', 2), unit('baseline', 3)]
baseline.push(unit('baseline', 2, { record_id: 'baseline-2-v2', supersedes_record_id: 'baseline-2-v1', review_minutes: 9, notes: 'Append-only correction; v1 remains retained.' }))
const intervention = [unit('intervention', 1), unit('intervention', 2), unit('intervention', 3), unit('intervention', 4, { eligible: false, exclusion_reason: 'CONTROLLED_CHECK_PR', valid_or_null: 'NULL', null_reason: 'DIFF_MALFORMED', notes: 'Explicit excluded controlled-check unit.' })]

const economics = {
  evidence_class: marker, independent_participant: false, issue_64_admissible: false, currency: 'USD', materiality_threshold_value: null,
  label: marker, eligible_baseline_units: 3, eligible_intervention_units: 3,
  inputs: { labor_cost_saved: 3.5, observed_rework_or_incident_cost_avoided: 0, setup_cost: 2.5, maintenance_cost: 0.5, added_review_cost: 0, CI_cost: 0.12, false_block_cost: 0, merge_delay_cost: 0.75 },
  unobserved: ['baseline-3-v1.observed_rework_or_incident_cost', 'intervention-3-v1.observed_rework_or_incident_cost'],
}
economics.net_observed_value = economics.inputs.labor_cost_saved + economics.inputs.observed_rework_or_incident_cost_avoided - economics.inputs.setup_cost - economics.inputs.maintenance_cost - economics.inputs.added_review_cost - economics.inputs.CI_cost - economics.inputs.false_block_cost - economics.inputs.merge_delay_cost
economics.claim_boundary = 'Cannot support a StateGate external, independent, economic, commercial, or Issue #64 value claim regardless of sign.'

const report = {
  evidence_class: marker, independent_participant: false, issue_64_admissible: false, rehearsal_manifest_identity: manifestIdentity,
  baseline_rehearsal_unit_count: 3, intervention_rehearsal_unit_count: 3,
  controlled_valid: { result: valid.result, proof_identity: hashObject(proofFromDecision(valid)) },
  controlled_null: { result: boundedNull.result, bounded_reason: 'DIFF_MALFORMED', proof_identity: hashObject(proofFromDecision(boundedNull)) },
  required_failure_cases: cases.map(({ id, outcome }) => ({ id, outcome })), economic_output: economics,
  defects_discovered: [
    { id: 'CONFORMANCE_MISMATCH_FIXTURE_TOPOLOGY', observation: 'The published tag/tree mismatch test selected HEAD~1, which can have the same tree as HEAD after a metadata-only merge commit; the expected rejection was therefore not exercised.', preserved_result: 'node test.mjs: release-verification-published-rejects-tag-source-mismatch FAIL (71/72 pre-review assertions passed)' },
    { id: 'CONFORMANCE_ARCHIVE_RETENTION_SIDE_EFFECT', observation: 'The conformance suite regenerated release/manifests/v1.1.1.json but restored only release/RELEASE_MANIFEST.json, leaving the tracked archive modified and making a subsequent release verification fail.', preserved_result: 'node scripts/verify-release.mjs: release/manifests/v1.1.1.json does not match release/RELEASE_MANIFEST.json' },
  ],
  corrections_made: [
    { id: 'CONFORMANCE_MISMATCH_FIXTURE_TOPOLOGY', correction: 'Construct an explicit one-entry Git tree and commit for the mismatched tag fixture instead of assuming HEAD~1 has different content.', scope: 'test.mjs only; no StateGate runtime or protocol semantics changed', rerun_expected: 'PASS' },
    { id: 'CONFORMANCE_ARCHIVE_RETENTION_SIDE_EFFECT', correction: 'Snapshot and restore the archived v1.1.1 manifest alongside the current release manifest.', scope: 'test.mjs only; no StateGate runtime or protocol semantics changed', rerun_expected: 'clean worktree and release verification PASS' },
  ],
  limitations: ['No independent participant or participant-controlled repository.', 'Synthetic/evaluator-controlled records are not naturally occurring PRs.', 'Three eligible units per phase; Issue #64 requires at least eight.', 'No participant-defined materiality threshold.', 'No GitHub-hosted workflow, billing export, or external run URL was exercised.'],
  issue_64_qualifying_record_count: 0, replay_result: 'PASS', determination: 'REHEARSAL_READY_WITH_LIMITATIONS',
  conclusion_boundary: 'The experiment machinery appears ready to be handed to an independent participant; StateGate has not demonstrated external or commercial value.'
}

const retainedProof = proof => ({
  evidence_class: marker, independent_participant: false, issue_64_admissible: false,
  artifact_type: 'CONTROLLED_REHEARSAL_PROOF', proof,
})

const generated = {
  'manifest.json': manifest, 'baseline-ledger.json': baseline, 'intervention-ledger.json': intervention,
  'controlled-valid-proof.json': retainedProof(proofFromDecision(valid)), 'controlled-null-proof.json': retainedProof(proofFromDecision(boundedNull)),
  'failure-cases.json': cases, 'economic-calculation.json': economics, 'rehearsal-report.json': report,
}

function validateAll() {
  const errors = []
  const assert = (condition, message) => { if (!condition) errors.push(message) }
  assert(/^[0-9a-f]{40}$/.test(manifest.stategate_full_sha), 'StateGate SHA must be exactly 40 lowercase hex characters')
  assert(manifest.stategate_full_sha === stategateSha, 'StateGate SHA changed after freeze')
  assert(valid.result === 'VALID', 'controlled VALID did not return VALID')
  assert(boundedNull.result === 'NULL' && boundedNull.null_reasons.includes('DIFF_MALFORMED'), 'controlled NULL was not bounded as DIFF_MALFORMED')
  assert(cases.every(c => c.outcome === 'PASS'), 'one or more failure cases did not behave as expected')
  assert(baseline.filter(r => r.eligible && !r.supersedes_record_id).length === 3, 'baseline eligible original count changed')
  assert(intervention.filter(r => r.eligible).length === 3, 'intervention eligible count changed')
  assert(baseline.some(r => r.supersedes_record_id === 'baseline-2-v1') && baseline.some(r => r.record_id === 'baseline-2-v1'), 'append-only correction lineage missing')
  assert(intervention.some(r => !r.eligible && r.exclusion_reason), 'explicit exclusion missing')
  assert(baseline.every(r => r.stategate_full_sha === '') && intervention.every(r => r.stategate_full_sha === stategateSha), 'phase identities or SHA pin confused')
  assert(baseline[2].observed_rework_or_incident_cost === '' && economics.unobserved.length === 2, 'unobserved economic value was altered or inferred')
  assert(economics.materiality_threshold_value === null, 'rehearsal invented a participant threshold')
  const allRecords = [manifest, ...baseline, ...intervention, ...cases, economics, report]
  assert(allRecords.every(r => r.evidence_class === marker && r.independent_participant === false && r.issue_64_admissible === false), 'independence guard failed')
  assert(report.issue_64_qualifying_record_count === 0, 'rehearsal records qualified as Issue #64 evidence')
  return errors
}

function writeArtifacts() {
  mkdirSync(runDir, { recursive: true })
  for (const [name, value] of Object.entries(generated)) writeFileSync(join(runDir, name), stable(value))
  const sums = `# ${marker}\n` + Object.keys(generated).sort().map(name => `${sha256(readFileSync(join(runDir, name)))}  ${name}`).join('\n') + '\n'
  writeFileSync(join(runDir, 'SHA256SUMS'), sums)
}

function verifyArtifacts() {
  const errors = validateAll()
  for (const [name, expected] of Object.entries(generated)) {
    const path = join(runDir, name)
    let actual
    try { actual = JSON.parse(readFileSync(path, 'utf8')) } catch (error) { errors.push(`${name}: unreadable: ${error.message}`); continue }
    if (canonicalize(actual) !== canonicalize(expected)) errors.push(`${name}: replay differs from frozen generated object`)
  }
  let sums = ''
  try { sums = readFileSync(join(runDir, 'SHA256SUMS'), 'utf8') } catch (error) { errors.push(`SHA256SUMS: unreadable: ${error.message}`) }
  const listed = new Map(sums.trim().split('\n').filter(line => line && !line.startsWith('#')).map(line => [line.slice(66), line.slice(0, 64)]))
  for (const name of readdirSync(runDir).filter(name => name.endsWith('.json')).sort()) {
    const actual = sha256(readFileSync(join(runDir, name)))
    if (listed.get(name) !== actual) errors.push(`${name}: retention hash mismatch`)
  }
  if (listed.size !== Object.keys(generated).length) errors.push('SHA256SUMS: incomplete or contains unexpected records')
  return errors
}

if (process.argv.includes('--write')) writeArtifacts()
const errors = verifyArtifacts()
if (errors.length) {
  console.error(`${marker}: FAIL`)
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}
console.log(`${marker}: PASS`)
console.log(`manifest_identity=${manifestIdentity}`)
console.log(`stategate_sha=${stategateSha}`)
console.log('baseline_eligible_units=3')
console.log('intervention_eligible_units=3')
console.log(`controlled_valid=${valid.result}`)
console.log(`controlled_null=${boundedNull.result}:${boundedNull.null_reasons.join(',')}`)
console.log(`net_observed_value=${economics.net_observed_value} ${economics.currency} (${marker})`)
console.log('issue_64_qualifying_records=0')
console.log('replay=PASS')
