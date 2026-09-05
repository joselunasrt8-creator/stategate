# First Independent Economic-Value Pilot

Status: `BLOCKED_BY_EXTERNAL_PARTICIPANT`

This is the frozen execution record for Issue #64. It does not report a pilot result. No qualifying participant, participant-controlled repository, or prospective pull-request observation has been supplied. The nearest legitimate boundary is therefore recruitment and qualification; baseline collection must not start until every qualification field below is evidenced.

The pilot tests whether StateGate produces positive **observed** net value in one real, independently controlled GitHub workflow. StateGate is allowed to lose. Installation, architecture, synthetic runs, same-owner repositories, evaluator-created repositories, hypothetical avoided losses, and estimated market value are not outcomes.

## Existing-artifact audit

| Acceptance area | State | Existing evidence or exact gap |
| --- | --- | --- |
| Independent qualification | Partial | `EXTERNAL_ADOPTION_PROTOCOL.md` defines control classes, including `INDEPENDENT_EXTERNAL_MAINTAINER`; no qualifying participant is recorded. |
| Recruitment | Absent/blocked | No candidate, consent, or repository-access record exists. Use the bounded invitation below. |
| Strong native-GitHub baseline | Absent/blocked | No participant workflow is available. The controls and prospective unit definition are frozen below. |
| At least 8 baseline PR units | Absent/blocked | Zero observed qualifying units. |
| Materiality threshold | Satisfied for execution | Frozen below before observations: terminal economic success requires `net_observed_value > 0`; zero is not success. |
| Experiment protocol | Satisfied for execution | Sequence, unit rules, exclusions, freeze point, intervention, stop rules, and terminal rules are below. |
| Evidence schema | Satisfied for execution | The unit and cost ledgers below are the required fields. Existing adoption evidence remains governed by `schemas/external-adoption-evidence.schema.json`; do not duplicate it here. |
| Economic calculation | Satisfied for execution | Formula, time valuation, allowed evidence, and missing-data treatment are below. |
| Controlled VALID / NULL checks | Partial/blocked | `examples/consumer-workflow.yml` supplies deterministic check shapes; participant-authorized executions and retained run/proof identifiers do not exist. |
| Artifact retention | Satisfied for execution | Required immutable inputs, outputs, identifiers, hashes, and retention layout are below. |
| At least 8 intervention PR units | Absent/blocked | Cannot begin before baseline is frozen and controlled checks pass. |
| Terminal determination | Satisfied for execution | Mechanical classifications are below; no determination may be made yet. |

## 1. Recruitment and qualification gate

Send only this invitation; it does not promise benefit:

> We are seeking one maintainer to test StateGate on a real GitHub workflow. You retain repository administration, workflow, merge-policy, participation, withdrawal, and publication authority. The study records at least 8 normal PRs under your existing strong native-GitHub controls, then—only with your approval—at least 8 normal PRs with StateGate pinned to an immutable commit. StateGate may add cost or show no value. No synthetic PRs or hypothetical savings count. May we assess eligibility and evidence-publication boundaries?

Before baseline observation, store a qualification record containing:

- candidate and repository URL; contact date; operator identity and affirmative participation consent;
- evidence that the operator—not the evaluator or a StateGate/Continufy owner—controls repository administration, branch/ruleset policy, workflow retention, merges, and permission to publish the agreed evidence;
- `trust_boundary_class: INDEPENDENT_EXTERNAL_MAINTAINER`, with the evaluator relationship stated;
- confirmation that the repository is pre-existing, non-sandbox, not evaluator-created, and uses real contributor work;
- expected volume sufficient to observe 8 baseline and 8 intervention PRs without manufacturing work;
- permission scope for run metadata, PR metadata, timing, cost evidence, and redacted artifacts; and explicit prohibited data;
- the native controls already in routine use and confirmation that they will remain enabled in both phases;
- participant approval of the controlled VALID and NULL verification and a safe branch/PR surface for it.

Any missing field fails qualification. Shared ownership, collaborator-only authority, a fork/demo/test repository, evaluator-directed PR creation, or fabricated volume fails qualification. Rejection records contain only candidate, date, failed criterion, and public/non-sensitive evidence reference.

## 2. Frozen design

### Unit and sequence

A prospective unit is one naturally occurring, non-draft PR first opened after its phase start, targeting the predeclared protected branch, and reaching a terminal state (`merged` or `closed_without_merge`). Reopened PRs, bot-only dependency PRs, controlled-check PRs, PRs created to fill the sample, and PRs whose work began under the other phase are excluded with a reason before economics are calculated. Consecutive eligible units are included; do not cherry-pick.

Execute strictly in this order:

1. Qualify one independent participant and record consent and native controls.
2. Record the repository default branch, ruleset/branch-protection export, workflow files, the simplest plausible small export script, time-valuation method, and phase start. Commit or hash this baseline manifest **before inspecting later outcomes**.
3. Observe at least 8 consecutive eligible baseline units under the strong native controls. StateGate must be absent. Freeze the completed baseline ledger and its SHA-256 hashes.
4. Select one StateGate commit and record the full 40-character commit SHA. All `uses:` entries must pin that SHA; tags and branches are forbidden. Native controls and the small export-script counterfactual remain enabled and unchanged.
5. On participant-approved non-sample PRs, run one expected `VALID` and one intentionally bounded `NULL`. Retain PR/run URLs, exact inputs, `MERGE_GUARD_PROOF.json`, SHA-256 hashes, conclusions, and NULL reason. Do not proceed if either result differs from expectation.
6. Observe at least 8 consecutive eligible intervention units. Do not backfill, reinterpret, or delete baseline fields.
7. Calculate observed economics and evidence completeness from the frozen ledgers.
8. Apply exactly one terminal determination below.

If native controls, workflow, valuation method, eligibility rules, or the StateGate SHA change, stop. Record the deviation; do not pool incomparable units. Security or operator withdrawal stops collection immediately.

### Strong native-GitHub counterfactual

Before baseline, the operator enumerates each enabled control and retains its configuration: protected target branch/ruleset, required reviews, required status checks, conversation resolution, CODEOWNERS enforcement if used, merge method, and relevant permissions. The baseline also records the simplest plausible small export script that could export the state/evidence needed by the operator, including its source hash and measured execution/maintenance time. Do not weaken these controls when StateGate is introduced and do not credit StateGate for capabilities already supplied by them or by the export script.

### Prospective unit ledger

Use one append-only CSV or JSON record per unit with these fields:

`phase`, `ordinal`, `repository`, `pr_number`, `pr_url`, `opened_at`, `terminal_at`, `terminal_state`, `head_sha`, `base_sha`, `eligible`, `exclusion_reason`, `native_controls_manifest_hash`, `workflow_hash`, `stategate_full_sha` (blank for baseline), `run_urls`, `proof_sha256` (blank when absent), `valid_or_null`, `null_reason`, `author_kind`, `reviewer_count`, `review_minutes`, `operator_minutes`, `setup_minutes`, `maintenance_minutes`, `rework_or_incident_id`, `observed_rework_or_incident_cost`, `ci_billable_minutes`, `ci_cost`, `false_block_minutes`, `merge_delay_minutes`, `notes`, and `evidence_refs`.

Timestamps and monetary amounts must come from GitHub/API records, participant contemporaneous time records, invoices/billing exports, or linked incident/rework records. Preserve raw values; corrections are new append-only entries that identify the superseded record. Blank means unobserved and is never converted to a benefit.

### Cost ledger and calculation

Before baseline, record one valuation rule per person: evidenced loaded hourly cost supplied by the participant, or the participant's predeclared internal standard rate. If neither is available, labor-derived terms are `UNOBSERVED`, not estimated. For each phase calculate observed totals with identical rules:

```text
labor_cost_saved = baseline_observed_labor_cost - intervention_observed_labor_cost
observed_rework_or_incident_cost_avoided = baseline_observed_cost - intervention_observed_cost

net_observed_value =
  labor_cost_saved
  + observed_rework_or_incident_cost_avoided
  - setup_cost
  - maintenance_cost
  - added_review_cost
  - CI_cost
  - false_block_cost
  - merge_delay_cost
```

Normalize phase totals per eligible PR before comparing because a phase may contain more than 8 units. `setup_cost` is charged in full to this pilot, not amortized into hypothetical future use. `added_review_cost` and `merge_delay_cost` are intervention increments over the baseline per-PR observation, never negative deductions. `false_block_cost` requires a participant-confirmed incorrect StateGate block and contemporaneous remediation time. An avoided rework or incident cost requires an observed intervention event where the operator identifies the otherwise merge-eligible change, the native controls/export counterfactual would not have prevented it, and an existing participant record establishes actual remediation cost for the same bounded event; otherwise record zero observed avoided cost and describe the missing counterfactual evidence. Do not extrapolate beyond observed units.

Material economic success is frozen as `net_observed_value > 0` in the participant's recorded currency, with every nonzero benefit supported by admissible evidence. Zero, an unknown result, or a positive result dependent on missing/inferred evidence is not success.

## 3. Artifact retention

Store evidence in a participant-approved location using `pilot-64/<repository-id>/qualification`, `/baseline`, `/controlled-checks`, `/intervention`, and `/determination`. Retain manifests, ledgers, raw exports, workflow files, export script, consent/publication scope, run and PR URLs, proof files, billing/time/incident evidence, deviation records, and a `SHA256SUMS` file. Record retrieval date and source for every export. Use immutable Git commit IDs and content hashes; URLs alone are insufficient. Redact only as agreed and hash both the retained original (if permitted) and published redaction. Repository commits may contain approved redacted evidence, but secrets and private participant data must not be committed.

## 4. Terminal determination

After both phases contain at least 8 eligible units and all required artifacts are retained, record exactly one:

- `VALIDATED_POSITIVE`: complete admissible evidence and `net_observed_value > 0`.
- `VALIDATED_NON_POSITIVE`: complete admissible evidence and `net_observed_value <= 0`.
- `INCONCLUSIVE_MISSING_EVIDENCE`: a required cost, benefit, unit, control, or provenance field is missing or disputed.
- `INVALIDATED_PROTOCOL_DEVIATION`: independence, prospective ordering, frozen controls/SHA, consecutive-unit selection, or controlled checks were violated.
- `TERMINATED`: consent withdrawal, security concern, insufficient natural workflow volume, or another recorded stop condition prevented completion.

Report unit counts, formula inputs, result, evidence hashes, exclusions, deviations, and limitations. Never relabel an inconclusive, invalidated, or terminated pilot as validation.

## Current boundary and next action

No evidence in this repository identifies a qualifying independent participant. The single nearest blocker is an external maintainer with a pre-existing real repository, sufficient natural PR volume, necessary authority, and willingness to consent to prospective evidence collection. The highest-leverage next action is to send the frozen invitation to one candidate and obtain a completed qualification record. Do not install StateGate or observe intervention outcomes first.
