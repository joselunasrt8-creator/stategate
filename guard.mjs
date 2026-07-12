// actions/stategate/guard.mjs
// Canonical StateGate validation surface. Every execution path (library,
// CLI, and GitHub Action) must enter through validateMergeGuard() so the
// validated object, proof object, and emitted decision share one canonical flow.

import { readFileSync } from 'node:fs'
import { canonicalize, sha256Hex, diffHash } from './canonical.mjs'
import { classifyAttribution } from './attribution.mjs'

export const REQUIRED_FIELDS = ['repo', 'pr_number', 'head_sha', 'base_sha', 'actor']
export const AUTHOR_KINDS = ['agent', 'human', 'unknown']
export const REQUIRE_AGENT_VALUES = ['true', 'false']
export const DIFF_CANONICALIZATION = 'line_endings_lf_terminal_lf_preserve_order_and_patch_text'
export const RECORD_TYPE = 'MERGE_GUARD_PROOF'

export const REVIEW_STATES = ['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED', 'COMMENTED', 'PENDING']
export const REVIEW_STATUS_DISABLED = 'not_required'

const DEVELOPMENT_VALIDATOR = {
  validator_name: 'stategate',
  validator_version: 'development',
  validator_commit: process.env.MERGE_GUARD_BUILD_COMMIT || 'unknown',
  validator_release_hash: null,
  canonical_algorithm_version: 'merge-guard-v1',
  proof_schema_version: '1.0.0',
  compatibility_range: '>=1.0.0 <2.0.0',
}

function readJsonFile(path) {
  try { return JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) } catch { return null }
}

export function validatorIdentity() {
  const metadata = readJsonFile('./release/validator-metadata.json')
  if (!metadata) return { ...DEVELOPMENT_VALIDATOR }
  const manifest = readJsonFile('./release/RELEASE_MANIFEST.json')
  const version = metadata.validator_version || 'development'
  const published = version !== 'development'
  return {
    validator_name: metadata.validator_name || DEVELOPMENT_VALIDATOR.validator_name,
    validator_version: version,
    validator_commit: published ? (manifest?.source_commit || 'unknown') : (process.env.MERGE_GUARD_BUILD_COMMIT || manifest?.source_commit || 'unknown'),
    validator_release_hash: published ? (manifest?.release_hash || null) : null,
    canonical_algorithm_version: metadata.canonical_algorithm_version || DEVELOPMENT_VALIDATOR.canonical_algorithm_version,
    proof_schema_version: metadata.proof_schema_version || DEVELOPMENT_VALIDATOR.proof_schema_version,
    compatibility_range: metadata.compatibility_range || DEVELOPMENT_VALIDATOR.compatibility_range,
  }
}

function normalizeMinimumApprovals(v) {
  if (v === undefined || v === null || v === '') return 1
  const n = Number(v)
  return Number.isInteger(n) && n > 0 ? n : null
}

function normalizeReviewState(v) {
  return normalizeString(v).toUpperCase()
}

export function normalizeReviewEvidence(raw) {
  if (raw === undefined || raw === null || raw === '') return { ok: false, reason: 'REVIEW_EVIDENCE_MISSING', evidence: null }
  let obj = raw
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw) } catch { return { ok: false, reason: 'REVIEW_EVIDENCE_MALFORMED', evidence: null } }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, reason: 'REVIEW_EVIDENCE_MALFORMED', evidence: null }
  const head_sha = normalizeString(obj.head_sha)
  if (!head_sha || !Array.isArray(obj.reviews)) return { ok: false, reason: 'REVIEW_EVIDENCE_MALFORMED', evidence: null }
  const reviews = []
  for (const r of obj.reviews) {
    if (!r || typeof r !== 'object' || Array.isArray(r)) return { ok: false, reason: 'REVIEW_EVIDENCE_MALFORMED', evidence: null }
    const reviewer = normalizeString(r.reviewer).toLowerCase()
    const state = normalizeReviewState(r.state)
    const submitted_at = normalizeString(r.submitted_at)
    const commit_id = normalizeString(r.commit_id || r.head_sha)
    if (!reviewer || !state || !submitted_at || !commit_id || !REVIEW_STATES.includes(state)) {
      return { ok: false, reason: 'REVIEW_EVIDENCE_MALFORMED', evidence: null }
    }
    reviews.push({ reviewer, state, submitted_at, commit_id })
  }
  reviews.sort((a, b) =>
    a.reviewer.localeCompare(b.reviewer) ||
    a.submitted_at.localeCompare(b.submitted_at) ||
    a.commit_id.localeCompare(b.commit_id) ||
    a.state.localeCompare(b.state)
  )
  return { ok: true, reason: null, evidence: { head_sha, reviews } }
}

function evaluateReviewPolicy(input) {
  const review_required = boolInput(input.require_review_approval)
  if (!review_required) {
    return {
      policy: { review_required: false, minimum_approvals: null },
      result: { review_status: REVIEW_STATUS_DISABLED, approval_count: 0, review_head_sha: null, review_evidence_hash: null },
      null_reasons: [],
    }
  }
  const minimum_approvals = normalizeMinimumApprovals(input.minimum_approvals)
  const policy = { review_required, minimum_approvals: minimum_approvals ?? null }
  if (minimum_approvals === null) {
    return { policy, result: { review_status: 'malformed', approval_count: 0, review_head_sha: null, review_evidence_hash: null }, null_reasons: ['REVIEW_EVIDENCE_MALFORMED'] }
  }
  if (boolInput(input.review_acquisition_failed)) {
    return { policy, result: { review_status: 'acquisition_failed', approval_count: 0, review_head_sha: null, review_evidence_hash: null }, null_reasons: ['REVIEW_ACQUISITION_FAILED'] }
  }
  const normalized = normalizeReviewEvidence(input.review_evidence)
  if (!normalized.ok) {
    return { policy, result: { review_status: normalized.reason === 'REVIEW_EVIDENCE_MISSING' ? 'missing' : 'malformed', approval_count: 0, review_head_sha: null, review_evidence_hash: null }, null_reasons: [normalized.reason] }
  }
  const evidence = normalized.evidence
  const review_evidence_hash = `sha256:${sha256Hex(canonicalize(evidence))}`
  const head = normalizeString(input.head_sha)
  const reasons = []
  if (evidence.head_sha !== head) reasons.push('REVIEW_HEAD_SHA_MISMATCH')
  const latest = new Map()
  const latestOverall = new Map()
  const conflicts = new Set()
  for (const r of evidence.reviews) {
    const prevOverall = latestOverall.get(r.reviewer)
    if (!prevOverall || r.submitted_at > prevOverall.submitted_at || (r.submitted_at === prevOverall.submitted_at && canonicalize(r) > canonicalize(prevOverall))) latestOverall.set(r.reviewer, r)
    if (r.commit_id !== evidence.head_sha) continue
    const prev = latest.get(r.reviewer)
    if (!prev || r.submitted_at > prev.submitted_at || (r.submitted_at === prev.submitted_at && canonicalize(r) > canonicalize(prev))) latest.set(r.reviewer, r)
  }
  for (const r of latestOverall.values()) {
    if (r.commit_id !== evidence.head_sha) reasons.push('REVIEW_STALE')
  }
  const byTime = new Map()
  for (const r of evidence.reviews.filter(r => r.commit_id === evidence.head_sha)) {
    const key = `${r.reviewer}\0${r.submitted_at}`
    const seen = byTime.get(key)
    if (seen && seen.state !== r.state) conflicts.add(r.reviewer)
    byTime.set(key, r)
  }
  if (conflicts.size > 0) reasons.push('REVIEW_CONFLICT')
  let approval_count = 0
  let status = 'approved'
  for (const r of latest.values()) {
    if (r.state === 'CHANGES_REQUESTED') reasons.push('REVIEW_CONFLICT')
    if (r.state === 'DISMISSED') reasons.push('REVIEW_DISMISSED')
    if (r.state === 'APPROVED') approval_count++
  }
  if (approval_count === 0) reasons.push('REVIEW_APPROVAL_REQUIRED')
  if (approval_count < minimum_approvals) reasons.push('INSUFFICIENT_APPROVALS')
  if (reasons.length > 0) status = reasons.includes('REVIEW_HEAD_SHA_MISMATCH') ? 'head_mismatch' : reasons.includes('REVIEW_STALE') ? 'stale' : reasons.includes('REVIEW_DISMISSED') ? 'dismissed' : reasons.includes('REVIEW_CONFLICT') ? 'conflict' : 'insufficient'
  return { policy, result: { review_status: status, approval_count, review_head_sha: evidence.head_sha, review_evidence_hash, review_evidence: evidence }, null_reasons: [...new Set(reasons)] }
}

export function normalizeString(v) {
  return typeof v === 'string' ? v.trim() : ''
}

function normalizeAuthorKind(v) {
  return normalizeString(v).toLowerCase() || 'unknown'
}

function normalizeRequireAgentAuthored(v) {
  return normalizeString(v).toLowerCase() || 'false'
}

export function boolInput(v) {
  return v === true || normalizeString(v).toLowerCase() === 'true'
}

function canonicalPayload(input, diff_hash, diff_source, author_kind, require_agent_authored, attribution, review_policy, review_result) {
  const payload = REQUIRED_FIELDS.reduce((o, f) => {
    o[f] = input[f] ?? null
    return o
  }, {})
  payload.diff_hash = diff_hash
  payload.diff_source = diff_source
  payload.author_kind = author_kind
  payload.require_agent_authored = require_agent_authored
  payload.attribution_status = attribution.attribution_status
  payload.attribution_classification = attribution.attribution_classification
  payload.attribution_evidence_hash = attribution.attribution_evidence_hash
  if (review_policy.review_required) {
    payload.review_policy = review_policy
    payload.review_result = {
      review_status: review_result.review_status,
      approval_count: review_result.approval_count,
      review_head_sha: review_result.review_head_sha,
      review_evidence_hash: review_result.review_evidence_hash,
    }
  }
  return payload
}

function proofId(input) {
  const head_sha = input.head_sha ?? ''
  return `MERGE_GUARD-${input.pr_number ?? 'unknown'}-${head_sha.slice(0, 8) || 'unknown'}`
}

export function validateMergeGuard(input = {}) {
  const missing_fields = REQUIRED_FIELDS.filter(f => {
    const v = input[f]
    return v === undefined || v === null || v === ''
  })
  const author_kind = normalizeAuthorKind(input.author_kind)
  const require_agent_authored = normalizeRequireAgentAuthored(input.require_agent_authored)
  const invalid_fields = []
  if (!AUTHOR_KINDS.includes(author_kind)) invalid_fields.push('author_kind')
  if (!REQUIRE_AGENT_VALUES.includes(require_agent_authored)) invalid_fields.push('require_agent_authored')

  const null_reasons = []
  if (missing_fields.length > 0) null_reasons.push('MISSING_REQUIRED_FIELD')
  if (invalid_fields.length > 0) null_reasons.push('INVALID_POLICY_FIELD')
  if (boolInput(input.diff_acquisition_failed)) null_reasons.push('DIFF_ACQUISITION_FAILED')

  const evaluated_head_sha = normalizeString(input.evaluated_head_sha || input.head_sha)
  if (normalizeString(input.head_sha) && evaluated_head_sha && normalizeString(input.head_sha) !== evaluated_head_sha) {
    null_reasons.push('HEAD_SHA_MISMATCH')
  }
  const evaluated_base_sha = normalizeString(input.evaluated_base_sha || input.base_sha)
  if (normalizeString(input.base_sha) && evaluated_base_sha && normalizeString(input.base_sha) !== evaluated_base_sha) {
    null_reasons.push('BASE_SHA_MISMATCH')
  }

  const diff = diffHash(input.pr_diff)
  if (!diff.ok) null_reasons.push(diff.reason)

  const diff_source = normalizeString(input.diff_source) || 'github_pull_request_diff'
  const expected_diff_hash = normalizeString(input.expected_diff_hash)
  if (expected_diff_hash && diff.diff_hash && expected_diff_hash !== diff.diff_hash) null_reasons.push('DIFF_HASH_MISMATCH')

  const agent_author_required = require_agent_authored === 'true'
  if (agent_author_required && author_kind !== 'agent') null_reasons.push('AGENT_AUTHOR_REQUIRED')

  const attribution = classifyAttribution({
    actor: input.actor,
    pr_author: input.pr_author ?? input.actor,
    head_ref: input.head_ref,
    pr_body: input.pr_body,
    pr_labels: input.pr_labels,
    commit_trailers: input.commit_trailers,
    operator_id: input.operator_id,
  })
  if (attribution.attribution_status === 'identity_ambiguous') null_reasons.push('ATTRIBUTION_AMBIGUOUS')

  const review = evaluateReviewPolicy(input)
  null_reasons.push(...review.null_reasons)
  const expected_review_evidence_hash = normalizeString(input.expected_review_evidence_hash)
  if (expected_review_evidence_hash && expected_review_evidence_hash !== review.result.review_evidence_hash) null_reasons.push('REVIEW_EVIDENCE_HASH_MISMATCH')

  const canonical_payload = canonicalPayload(input, diff.diff_hash, diff_source, author_kind, require_agent_authored, attribution, review.policy, review.result)
  const canonical_hash = sha256Hex(canonicalize(canonical_payload))
  const expected_proof_hash = normalizeString(input.expected_proof_hash)
  if (expected_proof_hash && expected_proof_hash !== canonical_hash) null_reasons.push('PROOF_HASH_MISMATCH')
  const expected_validated_object_hash = normalizeString(input.expected_validated_object_hash)
  if (expected_validated_object_hash && expected_validated_object_hash !== canonical_hash) null_reasons.push('VALIDATED_OBJECT_MUTATION')

  const result = null_reasons.length === 0 ? 'VALID' : 'NULL'
  return {
    proof_id: proofId(input),
    repo: input.repo ?? null,
    canonical_payload,
    canonical_hash,
    diff_hash: diff.diff_hash,
    diff_source,
    diff_canonicalization: DIFF_CANONICALIZATION,
    result,
    missing_fields,
    invalid_fields,
    author_kind,
    require_agent_authored,
    agent_author_required,
    null_reasons,
    actor_attribution: attribution.actor_attribution,
    attribution_classification: attribution.attribution_classification,
    attribution_status: attribution.attribution_status,
    attribution_evidence_hash: attribution.attribution_evidence_hash,
    review_required: review.policy.review_required,
    minimum_approvals: review.policy.minimum_approvals,
    approval_count: review.result.approval_count,
    review_evidence_hash: review.result.review_evidence_hash,
    review_head_sha: review.result.review_head_sha,
    review_status: review.result.review_status,
    review_evidence: review.result.review_evidence,
    record_type: RECORD_TYPE,
  }
}

export function proofFromDecision(decision) {
  return {
    proof_id: decision.proof_id,
    repo: decision.repo,
    validator: validatorIdentity(),
    canonical_payload: decision.canonical_payload,
    canonical_hash: decision.canonical_hash,
    diff_hash: decision.diff_hash,
    diff_source: decision.diff_source,
    diff_canonicalization: decision.diff_canonicalization,
    result: decision.result,
    missing_fields: decision.missing_fields,
    invalid_fields: decision.invalid_fields,
    author_kind: decision.author_kind,
    require_agent_authored: decision.require_agent_authored,
    agent_author_required: decision.agent_author_required,
    null_reasons: decision.null_reasons,
    actor_attribution: decision.actor_attribution,
    attribution_classification: decision.attribution_classification,
    attribution_status: decision.attribution_status,
    attribution_evidence_hash: decision.attribution_evidence_hash,
    review_required: decision.review_required,
    minimum_approvals: decision.minimum_approvals,
    approval_count: decision.approval_count,
    review_evidence_hash: decision.review_evidence_hash,
    review_head_sha: decision.review_head_sha,
    review_status: decision.review_status,
    record_type: decision.record_type,
  }
}
