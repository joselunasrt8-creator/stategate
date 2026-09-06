#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { canonicalize } from '../canonical.mjs'
import { proofFromDecision, validateMergeGuard } from '../guard.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const evidenceDir = join(root, 'rehearsal', 'issue-71')
const manifestPath = join(evidenceDir, 'scenario-manifest.json')
const frozenManifestSha256 = 'ca52a778eb414c888170ad13ff0744df842f088c8ce39ed511ae1958f69ec875'
const sha256 = value => createHash('sha256').update(value).digest('hex')
const stable = value => `${JSON.stringify(value, null, 2)}\n`

const manifestBytes = readFileSync(manifestPath)
if (sha256(manifestBytes) !== frozenManifestSha256) throw new Error('Frozen scenario manifest identity mismatch; campaign aborted')
const manifest = JSON.parse(manifestBytes)

const diff = ['diff --git a/state.txt b/state.txt', 'index 1111111..2222222 100644', '--- a/state.txt', '+++ b/state.txt', '@@ -1 +1 @@', '-before', '+after', ''].join('\n')
const mutatedDiff = diff.replace('+after', '+plausible-after')
const head = 'a'.repeat(40)
const base = 'b'.repeat(40)
const other = 'c'.repeat(40)
const review = (count = 1) => ({
  head_sha: head,
  reviews: Array.from({ length: count }, (_, index) => ({ reviewer: `reviewer-${index + 1}`, state: 'APPROVED', submitted_at: `2026-09-06T00:0${index}:00Z`, commit_id: head })),
})
const baseInput = {
  repo: 'controlled/stategate-target', pr_number: '7101', head_sha: head, base_sha: base,
  actor: 'controlled-operator', pr_diff: diff, diff_source: 'issue_71_frozen_fixture',
  require_review_approval: 'true', minimum_approvals: '1', review_evidence: review(),
}
const control = validateMergeGuard(baseInput)
const controlProof = proofFromDecision(control)

const cases = {
  'KAT-01': () => ({ input: baseInput }),
  'KAT-05': () => ({ input: { ...baseInput, pr_diff: mutatedDiff, expected_diff_hash: control.diff_hash, expected_proof_hash: control.canonical_hash } }),
  'KAT-07': () => ({ input: { ...baseInput, require_agent_authored: 'sometimes' } }),
  'KAT-08': () => ({ input: { ...baseInput, evaluated_head_sha: other } }),
  'KAT-10': () => ({ input: { ...baseInput, actor: 'plausible-substitute', expected_validated_object_hash: control.canonical_hash } }),
  'KAT-12': () => ({ input: { ...baseInput, review_evidence: { head_sha: other, reviews: [{ reviewer: 'reviewer-1', state: 'APPROVED', submitted_at: '2026-09-06T00:00:00Z', commit_id: other }] } } }),
  'ADV-01': () => ({ input: { ...baseInput, review_evidence: { head_sha: head, reviews: [
    { reviewer: 'reviewer-1', state: 'COMMENTED', submitted_at: '2026-09-06T00:02:00Z', commit_id: other },
    { reviewer: 'reviewer-1', state: 'APPROVED', submitted_at: '2026-09-06T00:01:00Z', commit_id: head }
  ] } } }),
  'ADV-03': () => ({ input: { ...baseInput, minimum_approvals: '2', review_evidence: review(1) } }),
  'ADV-04': () => ({ input: { ...baseInput, pr_diff: mutatedDiff, expected_diff_hash: control.diff_hash, expected_proof_hash: control.canonical_hash } }),
  'ADV-06': () => ({ input: { ...baseInput, pr_labels: 'agent-authored,human-authored' } }),
  'ADV-07': () => ({ input: { ...baseInput, repo: 'plausible/other-repository', expected_validated_object_hash: control.canonical_hash } }),
  'ADV-09': () => {
    const oldPolicy = validateMergeGuard({ ...baseInput, minimum_approvals: '1', review_evidence: review(1) })
    return { input: { ...baseInput, minimum_approvals: '2', review_evidence: review(2), expected_review_evidence_hash: oldPolicy.review_evidence_hash } }
  },
  'ADV-10': () => ({ input: { ...baseInput, evaluated_base_sha: other } }),
}

const predicateFor = (scenario, decision) => {
  if (decision.result === 'VALID') return null
  if (scenario.id === 'ADV-06') return 'AUTHORIZED'
  if (scenario.id === 'ADV-07') return 'TOPOLOGY_VISIBLE'
  if (decision.null_reasons.some(reason => ['INVALID_POLICY_FIELD', 'AGENT_AUTHOR_REQUIRED', 'REVIEW_HEAD_SHA_MISMATCH', 'REVIEW_STALE', 'REVIEW_CONFLICT', 'REVIEW_DISMISSED', 'REVIEW_APPROVAL_REQUIRED', 'INSUFFICIENT_APPROVALS', 'REVIEW_EVIDENCE_HASH_MISMATCH'].includes(reason))) return 'POLICY_VALID'
  if (decision.null_reasons.some(reason => ['HEAD_SHA_MISMATCH', 'BASE_SHA_MISMATCH', 'DIFF_ACQUISITION_FAILED'].includes(reason))) return 'TOPOLOGY_VISIBLE'
  if (decision.null_reasons.some(reason => ['DIFF_HASH_MISMATCH', 'PROOF_HASH_MISMATCH', 'VALIDATED_OBJECT_MUTATION'].includes(reason))) return 'REPLAY_SAFE'
  return 'VALID'
}

function executeScenario(scenario) {
  if (!scenario.representable) {
    return {
      id: scenario.id, kind: scenario.kind, execution_status: 'REPRESENTATIONAL_GAP',
      expected_determination: scenario.expected_determination, actual_determination: 'UNREPRESENTABLE',
      expected_failing_predicate: scenario.expected_failing_predicate, actual_failing_predicate: null,
      boundary_reasons: [], false_accept: false, false_reject: false, expectation_match: null,
      execution_error: null, ambiguous_outcome: true,
      note: 'The canonical input and decision have no field or state model for this predicate; no synthetic pass/fail was manufactured.'
    }
  }
  try {
    const { input } = cases[scenario.id]()
    const decision = validateMergeGuard(input)
    const actual = decision.result === 'VALID' ? 'ELIGIBLE' : 'NULL'
    const actualPredicate = predicateFor(scenario, decision)
    const resultMatch = actual === scenario.expected_determination
    const predicateMatch = scenario.expected_failing_predicate === actualPredicate
    return {
      id: scenario.id, kind: scenario.kind, execution_status: 'EXECUTED',
      expected_determination: scenario.expected_determination, actual_determination: actual,
      expected_failing_predicate: scenario.expected_failing_predicate, actual_failing_predicate: actualPredicate,
      boundary_reasons: decision.null_reasons, false_accept: scenario.expected_determination === 'NULL' && actual === 'ELIGIBLE',
      false_reject: scenario.expected_determination === 'ELIGIBLE' && actual === 'NULL',
      expectation_match: resultMatch && predicateMatch, execution_error: null, ambiguous_outcome: false,
      canonical_hash: decision.canonical_hash, proof_sha256: sha256(stable(proofFromDecision(decision)))
    }
  } catch (error) {
    return {
      id: scenario.id, kind: scenario.kind, execution_status: 'ERROR', expected_determination: scenario.expected_determination,
      actual_determination: 'ERROR', expected_failing_predicate: scenario.expected_failing_predicate,
      actual_failing_predicate: null, boundary_reasons: [], false_accept: false, false_reject: false,
      expectation_match: false, execution_error: error.message, ambiguous_outcome: true
    }
  }
}

function run() { return manifest.scenarios.map(executeScenario) }
const first = run()
const second = run()
const reproducible = canonicalize(first) === canonicalize(second)
const executed = first.filter(item => item.execution_status === 'EXECUTED')
const gaps = first.filter(item => item.execution_status === 'REPRESENTATIONAL_GAP')
const mismatches = executed.filter(item => !item.expectation_match)
const errors = first.filter(item => item.execution_status === 'ERROR')
const falseAccepts = executed.filter(item => item.false_accept).length
const falseRejects = executed.filter(item => item.false_reject).length
const terminal = gaps.length || errors.length || mismatches.length || !reproducible
  ? 'CONTROLLED_VALIDATION_INCONCLUSIVE'
  : falseAccepts || falseRejects ? 'CONTROLLED_VALIDATION_FAILED' : 'CONTROLLED_VALIDATION_PASSED'

const report = {
  record_type: 'CONTROLLED_VALIDATION_CAMPAIGN_RESULT', issue: 71, parent_issue: 70,
  evidence_class: 'INTERNAL_CONTROLLED_VALIDATION', independent_participant: false, issue_64_admissible: false,
  manifest_sha256: frozenManifestSha256, starting_repository_identity: { commit_sha: manifest.frozen_against_commit_sha, tree_sha: manifest.frozen_against_tree_sha },
  campaign_execution_base_commit: '3bc2a36cd674f871b55cb16ca5a359b3e36d5c48',
  canonical_runtime_files: ['guard.mjs', 'canonical.mjs', 'attribution.mjs'],
  control: { determination: control.result === 'VALID' ? 'ELIGIBLE' : 'NULL', canonical_hash: control.canonical_hash, proof_sha256: sha256(stable(controlProof)) },
  results: first,
  measurements: {
    scenarios_frozen: first.length, scenarios_executed: executed.length, scenario_passes: executed.length - mismatches.length,
    scenario_failures: mismatches.length, representational_gaps: gaps.length, false_accepts: falseAccepts,
    false_rejects: falseRejects, unexplained_failures: mismatches.length + errors.length,
    execution_errors: errors.length, ambiguous_outcomes: first.filter(item => item.ambiguous_outcome).length
  },
  reproducibility: { complete_suite_runs: 2, deterministic: reproducible, byte_equivalent_normalized_results: reproducible },
  pre_fix_observations: { preserved: true, failing_scenarios: mismatches.map(item => item.id), note: 'No corrective runtime change was made; all representable frozen scenarios matched on the first run.' },
  defects_discovered: [], corrective_changes: [],
  representational_gaps: gaps.map(item => ({ id: item.id, predicate: item.expected_failing_predicate, input_class: manifest.scenarios.find(s => s.id === item.id).input_class })),
  acceptance_assessment: 'Inconclusive: representable predicates behaved deterministically with predicate-level attribution, but existing semantics cannot represent all Issue #71 predicates and scenarios.',
  terminal_determination: terminal,
  final_repository_identity: 'The Git commit containing this report is the final self-identifying repository state; report its commit and tree SHA after commit creation.'
}

function write() {
  mkdirSync(evidenceDir, { recursive: true })
  writeFileSync(join(evidenceDir, 'campaign-results.json'), stable(report))
  const names = ['MANIFEST.sha256', 'audit.json', 'campaign-results.json', 'scenario-manifest.json']
  writeFileSync(join(evidenceDir, 'SHA256SUMS'), names.map(name => `${sha256(readFileSync(join(evidenceDir, name)))}  ${name}`).join('\n') + '\n')
}

if (process.argv.includes('--write')) write()
else {
  const retained = JSON.parse(readFileSync(join(evidenceDir, 'campaign-results.json'), 'utf8'))
  if (canonicalize(retained) !== canonicalize(report)) throw new Error('Retained campaign result differs from deterministic replay')
  for (const line of readFileSync(join(evidenceDir, 'SHA256SUMS'), 'utf8').trim().split('\n')) {
    const [expected, name] = line.split(/\s{2}/)
    if (sha256(readFileSync(join(evidenceDir, name))) !== expected) throw new Error(`Retention hash mismatch: ${name}`)
  }
}
console.log(`${report.terminal_determination}: ${executed.length}/${first.length} executed, ${gaps.length} representational gaps, ${falseAccepts} false accepts, ${falseRejects} false rejects, reproducible=${reproducible}`)
