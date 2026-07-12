#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

const allowed = {
  trust_boundary_class: ['SAME_OWNER','SAME_ORGANIZATION_SHARED_CONTROL','COLLABORATOR_CONTROLLED','INDEPENDENT_EXTERNAL_MAINTAINER','SANDBOX_OR_TEST','UNKNOWN'],
  adoption_stage: ['STAGE_0_NOT_INSTALLED','STAGE_1_EXTERNAL_INSTALLATION','STAGE_2_FIRST_VALID_RUN','STAGE_3_FIRST_NULL_BLOCK','STAGE_4_REQUIRED_CHECK_ENABLED','STAGE_5_REPEAT_USAGE','STAGE_6_OPERATOR_RETAIN','STAGE_7_REMOVAL_DEGRADATION','STAGE_8_INDEPENDENT_DEPENDENCY_CONFIRMED'],
  status: ['OBSERVED','UNOBSERVED','BLOCKED','NOT_APPLICABLE','DISPUTED'],
  evidence_status: ['OBSERVED','UNOBSERVED','BLOCKED','NOT_APPLICABLE','DISPUTED'],
  condition: ['REMOVED','DISABLED','BYPASSED','UNAVAILABLE','RETURNED_NULL','NOT_APPLICABLE'],
  decision: ['RETAIN','REMOVE','UNDECIDED','NOT_APPLICABLE']
}
const stageRank = Object.fromEntries(allowed.adoption_stage.map((s, i) => [s, i]))
const required = ['evidence_schema_version','evidence_id','observed_at','repository','repository_owner','operator','trust_boundary_class','evaluator_relationship','stategate_version','stategate_ref','workflow_path','required_check_name','adoption_stage','evidence_status','installation_evidence','valid_run_evidence','null_run_evidence','repeat_usage_evidence','retention_evidence','removal_experiment','degradation_observation','proof_artifact_hashes','limitations','attestation']
function err(path, msg) { return `${path}: ${msg}` }
function hasObserved(o) { return o?.status === 'OBSERVED' }
function validate(e) {
  const errors = []
  for (const k of required) if (!(k in e)) errors.push(err(k, 'required field missing'))
  if (e.evidence_schema_version !== '1.0.0') errors.push(err('evidence_schema_version', 'must be 1.0.0'))
  for (const k of ['trust_boundary_class','adoption_stage','evidence_status']) if (k in e && !allowed[k].includes(e[k])) errors.push(err(k, `unsupported value ${JSON.stringify(e[k])}`))
  for (const [p, o] of Object.entries({ installation_evidence:e.installation_evidence, valid_run_evidence:e.valid_run_evidence, null_run_evidence:e.null_run_evidence, repeat_usage_evidence:e.repeat_usage_evidence, retention_evidence:e.retention_evidence, removal_experiment:e.removal_experiment, degradation_observation:e.degradation_observation })) {
    if (!o || typeof o !== 'object' || Array.isArray(o)) { errors.push(err(p, 'must be object')); continue }
    if (!allowed.status.includes(o.status)) errors.push(err(`${p}.status`, `unsupported value ${JSON.stringify(o.status)}`))
  }
  if (e.removal_experiment && !allowed.condition.includes(e.removal_experiment.condition)) errors.push(err('removal_experiment.condition', `unsupported value ${JSON.stringify(e.removal_experiment.condition)}`))
  if (e.retention_evidence && !allowed.decision.includes(e.retention_evidence.operator_decision)) errors.push(err('retention_evidence.operator_decision', `unsupported value ${JSON.stringify(e.retention_evidence.operator_decision)}`))
  if (!Array.isArray(e.proof_artifact_hashes)) errors.push(err('proof_artifact_hashes', 'must be array'))
  else e.proof_artifact_hashes.forEach((h, i) => { if (!/^sha256:[0-9a-f]{64}$/.test(h)) errors.push(err(`proof_artifact_hashes[${i}]`, 'must be sha256:<64 lowercase hex>')) })
  if (!Array.isArray(e.limitations)) errors.push(err('limitations', 'must be array'))

  const r = stageRank[e.adoption_stage] ?? -1
  if (r >= 1 && !hasObserved(e.installation_evidence)) errors.push(err('installation_evidence.status', 'must be OBSERVED for stage >= STAGE_1'))
  if (r >= 2 && !hasObserved(e.valid_run_evidence)) errors.push(err('valid_run_evidence.status', 'must be OBSERVED for stage >= STAGE_2'))
  if (r >= 3 && !hasObserved(e.null_run_evidence)) errors.push(err('null_run_evidence.status', 'must be OBSERVED for stage >= STAGE_3'))
  if (r >= 4 && !e.required_check_name) errors.push(err('required_check_name', 'must be populated for stage >= STAGE_4'))
  if (r >= 5 && !(hasObserved(e.repeat_usage_evidence) && e.repeat_usage_evidence.run_count >= 2 && (e.repeat_usage_evidence.pull_request_count >= 2 || e.repeat_usage_evidence.time_separated))) errors.push(err('repeat_usage_evidence', 'must show multiple PRs or time-separated repeated runs for stage >= STAGE_5'))
  if (r >= 6 && !(hasObserved(e.retention_evidence) && e.retention_evidence.operator_decision === 'RETAIN')) errors.push(err('retention_evidence', 'operator RETAIN decision required for stage >= STAGE_6'))
  if (r >= 7) {
    if (!(hasObserved(e.removal_experiment) && e.removal_experiment.operator_approved && e.removal_experiment.baseline_recorded && e.removal_experiment.restored && e.removal_experiment.restoration_confirmed)) errors.push(err('removal_experiment', 'approved baseline, restore, and restoration confirmation required for stage >= STAGE_7'))
    if (!(hasObserved(e.degradation_observation) && e.degradation_observation.materially_weaker)) errors.push(err('degradation_observation', 'observable material degradation required for stage >= STAGE_7'))
  }
  if (e.adoption_stage === 'STAGE_8_INDEPENDENT_DEPENDENCY_CONFIRMED') {
    if (e.trust_boundary_class !== 'INDEPENDENT_EXTERNAL_MAINTAINER') errors.push(err('trust_boundary_class', 'must be INDEPENDENT_EXTERNAL_MAINTAINER for independent dependency'))
    if (!e.installation_evidence?.voluntary_install) errors.push(err('installation_evidence.voluntary_install', 'must be true for independent dependency'))
    if (!e.null_run_evidence?.bounded) errors.push(err('null_run_evidence.bounded', 'bounded NULL block required for independent dependency'))
    if (e.evidence_status === 'DISPUTED' || [e.installation_evidence,e.valid_run_evidence,e.null_run_evidence,e.repeat_usage_evidence,e.retention_evidence,e.removal_experiment,e.degradation_observation].some(x => x?.status === 'DISPUTED')) errors.push(err('evidence_status', 'no unresolved evidence dispute allowed for independent dependency'))
    if (!(e.degradation_observation?.validation_property_lost && e.degradation_observation?.proof_property_lost && e.degradation_observation?.merge_eligibility_property_lost)) errors.push(err('degradation_observation', 'validation, proof, and merge-eligibility loss must all be observed'))
  }
  return errors.sort()
}

if (process.argv.length < 3) { console.error('usage: validate-external-adoption-evidence.mjs <evidence.json> [...]'); process.exit(2) }
let failed = false
for (const file of process.argv.slice(2)) {
  let evidence
  try { evidence = JSON.parse(readFileSync(file, 'utf8')) } catch (e) { console.error(`${basename(file)}: invalid JSON: ${e.message}`); failed = true; continue }
  const errors = validate(evidence)
  if (errors.length) { failed = true; console.error(`${basename(file)}: INVALID`); for (const e of errors) console.error(`  - ${e}`) }
  else console.log(`${basename(file)}: VALID`)
}
process.exit(failed ? 1 : 0)
