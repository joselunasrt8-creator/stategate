# Issue 76: StateGate ownership adjudication

## Determination

**STATEGATE_GAPS_ADJUDICATED**

This record adjudicates the representational gaps retained by Issue 71. It does
not change StateGate runtime semantics, make Issue 71 pass, or assert that the
broader Continufy execution-eligibility expression is StateGate's contract.

## Canonical identity and evidence

| Item | Identity |
| --- | --- |
| Supplied canonical repository state before mutation | commit `01e8a3b04aa9a8f2aa0f451fea7f6cb1bb937675`; tree `9c9f6b8499b44ccf83a2c6027eb20cc8136296b7`; clean `work` branch |
| Current-main observation | A fetch of `origin/main` was attempted before mutation, but the supplied environment's GitHub connection returned HTTP 403. No `main` ref was available locally. Consequently the supplied HEAD is the only verifiable current repository state, not an independently refreshed claim about GitHub main. |
| PR 75 canonical merge commit | `01e8a3b04aa9a8f2aa0f451fea7f6cb1bb937675`; present as HEAD and therefore in the inspected ancestry |
| Issue 71 frozen input identity | commit `b853fb8b3105e8241868fcc3d17ed4ad55fa10f5`; tree `1cd11ce5150274717bb1053e0ef773527c3cb9c7`; manifest SHA-256 `ca52a778eb414c888170ad13ff0744df842f088c8ce39ed511ae1958f69ec875` |
| Issue 71 result identity | `CONTROLLED_VALIDATION_INCONCLUSIVE`; 24 scenarios, 13 executed matches, 11 representational gaps, zero false accepts/rejects, two byte-equivalent normalized runs |
| Issue sources | The Issue 70/71/76 requirements supplied to this run and the retained Issue 71 artifacts. Direct GitHub reads were attempted but unavailable (web HTTP 401; CLI unauthenticated). No inaccessible issue text is treated as observed evidence. |

The evidence layers below are deliberately separate:

* **Experimental observation:** what the frozen Issue 71 campaign actually
  executed or marked unrepresentable.
* **Architectural interpretation:** which component should own a concept under
  the bounded roles in Issues 70 and 76.
* **Implementation requirement:** whether StateGate must change to state its
  existing canonical contract truthfully.

## Implemented contract and boundary

The canonical artifacts define StateGate as a dependency-free, single-run
validator of a supplied pull-request candidate. `validateMergeGuard` validates
required PR identity, evaluated head/base identity, canonical diff and
provenance, attribution evidence, enabled review policy, and optional replay
hashes. It returns `VALID` or fail-closed `NULL`. `proofFromDecision` projects a
proof from that decision; `check.mjs` acquires evidence, writes the proof and
outputs, and sets process status. The action uploads the proof.

Accordingly, `VALID` means that the supplied candidate and enabled policies are
internally consistent. It is eligibility evidence, not authorization, merge
authority, proof retention, execution, or confirmation that execution occurred.
The deterministic boundary begins after network acquisition. Git/GitHub own the
repository object graph and native merge controls; StateGate binds the acquired
candidate to explicit identities and evidence rather than replacing those
controls.

The following distinctions remain invariant:

```text
LLM          -> capability
MindShift    -> context/cognition governance -> intent candidates
ContinuityOS -> legitimacy infrastructure and lifecycle
StateGate    -> bounded validation/eligibility gate

Capability != Permission       Cognition != Legitimacy
Proposal   != Authority        Validation != Execution
Proof      != Execution        State tracking != Legitimacy
```

Mutation-capable surfaces remain outside this documentation change:
`check.mjs` writes `MERGE_GUARD_PROOF.json`, GitHub outputs, and exit status;
`action.yml` uploads the artifact; GitHub's merge machinery alone changes the
repository. This adjudication introduces no dependency, interface, execution
path, persistent store, authority source, ledger, registry, or reconciler.

## Complete classification matrix

Each gap has exactly one primary classification. Counts are **0
REQUIRED_BY_STATEGATE_CONTRACT**, **8 OWNED_BY_CONTINUITYOS**, **2
OUT_OF_SCOPE**, and **0 INSUFFICIENTLY_JUSTIFIED**.

| Gap | Issue 71 scenarios | Primary classification | Frozen implementation requirement |
| --- | --- | --- | --- |
| Authorization object validity/presence | KAT-02 | OWNED_BY_CONTINUITYOS | None in StateGate |
| Authorization expiry | KAT-03 | OWNED_BY_CONTINUITYOS | None in StateGate |
| Authorization scope binding | ADV-05 | OWNED_BY_CONTINUITYOS | None in StateGate |
| Authorization consumption/reuse | KAT-04, ADV-02 | OWNED_BY_CONTINUITYOS | None in StateGate |
| Duplicate execution detection | KAT-06; ADV-08 also exposes copied artifacts being counted independently | OWNED_BY_CONTINUITYOS | None in StateGate |
| Event-order validation | KAT-13 | OWNED_BY_CONTINUITYOS | None in StateGate |
| Policy freshness | ADV-09 | OUT_OF_SCOPE | No new freshness clock/registry; existing hash binding remains |
| Topology freshness | ADV-10 | OUT_OF_SCOPE | No global topology registry; existing SHA continuity remains |
| Terminal-state reconciliation history | KAT-11, ADV-11 | OWNED_BY_CONTINUITYOS | None in StateGate |
| Proof presence after decision projection | KAT-09 | OWNED_BY_CONTINUITYOS | None in StateGate |

The inventory includes every unrepresentable Issue 71 scenario. ADV-08 is not a
separate eleventh concept: detecting whether copied artifacts represent one or
multiple executions requires the same execution identity/history as duplicate
execution detection. The campaign's other freshness scenarios, ADV-09 and
ADV-10, were representable and passed; Issue 71 therefore observed no missing
StateGate representation for the bounded hash/SHA checks. The gap adjudicated
for each is only the broader, clock/registry-based freshness interpretation.

## Per-gap records

The numbered fields in every record correspond to the required adjudication
questions. “Persistent” means durable information across validation runs, not a
caller supplying an immutable snapshot for one run.

### 1. Authorization object validity/presence

1. **Scenario:** KAT-02, authorization absent.
2. **Current behavior (observation):** unrepresentable; StateGate can validate
   authorship and review evidence, but accepts no authorization object.
3. **Limitation:** it cannot parse, authenticate, or reject a missing legitimacy
   authorization.
4. **Claim requiring it:** every execution-eligible proposal must carry an
   authority-issued authorization.
5. **Nature:** legitimacy lifecycle, not validation of the PR candidate bytes.
6. **Minimum information:** issuer, subject, authorization ID, signed/attested
   claims, scope, validity interval, and verification rules/trust roots.
7. **Persistent state:** not necessarily for syntax, but required to establish
   authoritative issuance/revocation beyond a self-asserted object.
8. **Authority responsibility:** yes; accepting issuers defines legitimacy.
9. **Execution responsibility:** no by itself.
10. **Reconciliation responsibility:** no by itself.
11. **Native overlap:** GitHub permissions, reviews, rulesets, and branch
    protection already gate merge authority; StateGate intentionally does not
    replace them.
12. **Strongest inclusion case:** an explicit authorization could be immutable
    candidate evidence that a bounded validator checks.
13. **Strongest exclusion case:** StateGate's contract explicitly validates
    supplied PR state and enabled policies and says `VALID` grants no merge
    authority; defining trusted authorization would enlarge that contract.
14. **Classification:** **OWNED_BY_CONTINUITYOS**.
15. **Rationale:** legitimacy infrastructure must define and source authority;
    StateGate may later validate a bounded attestation only under a separately
    approved interface, but cannot own the authorization concept.

### 2. Authorization expiry

1. **Scenario:** KAT-03, expired authorization object.
2. **Behavior:** unrepresentable; no authorization or evaluation-time field.
3. **Limitation:** no validity interval, trusted time, renewal, or revocation
   semantics.
4. **Claim:** execution requires currently live authority.
5. **Nature:** authorization lifecycle.
6. **Minimum information:** authorization identity, `not_before`/`expires_at`,
   deterministic evaluation time and clock provenance, plus revocation status.
7. **Persistent state:** yes for revocation/renewal continuity; a bare timestamp
   alone cannot establish the full lifecycle claim.
8. **Authority:** yes, because the issuer defines and may revoke validity.
9. **Execution:** no.
10. **Reconciliation:** potentially, when expiry races with execution.
11. **Native overlap:** GitHub checks/reviews and merge queues can be invalidated
    or required against current state; StateGate already binds reviews to head.
12. **Inclusion case:** deterministic time plus an immutable signed grant could
    be checked as another candidate predicate.
13. **Exclusion case:** choosing trusted time and interpreting renewal/revocation
    makes a stateless validator an authorization lifecycle participant.
14. **Classification:** **OWNED_BY_CONTINUITYOS**.
15. **Rationale:** StateGate truthfully performs its existing job without an
    authorization clock; the required legitimacy lifecycle belongs above it.

### 3. Authorization scope binding

1. **Scenario:** ADV-05, valid authority attached to the wrong object scope.
2. **Behavior:** unrepresentable; current hashes bind StateGate proof/review
   evidence, not a legitimacy grant.
3. **Limitation:** no grant scope or issuer rules to compare with repo, PR, SHAs,
   diff, operation, or executor.
4. **Claim:** authority for one action/object cannot authorize another.
5. **Nature:** both candidate comparison and authority semantics; primary
   responsibility is legitimacy because only the authority owner defines scope.
6. **Minimum information:** authenticated grant plus canonical repository,
   object, operation, actor/executor, and validated-object identifiers.
7. **Persistent state:** not for a frozen scope comparison, but normally yes for
   authoritative issuance/revocation.
8. **Authority:** yes.
9. **Execution:** no; scope validation must not invoke the operation.
10. **Reconciliation:** no by itself.
11. **Native overlap:** GitHub tokens, repository permissions, rulesets, review
    binding, and target branch controls already scope native operations.
12. **Inclusion case:** StateGate already canonicalizes the precise candidate,
    so it is technically well placed to compare a supplied scope hash.
13. **Exclusion case:** comparison is meaningless until ContinuityOS owns the
    grant schema and trusted issuer; making StateGate define it creates authority.
14. **Classification:** **OWNED_BY_CONTINUITYOS**.
15. **Rationale:** ContinuityOS must own scope semantics. A future StateGate
    adapter, if separately justified, would remain only a validator of supplied
    legitimacy evidence.

### 4. Authorization consumption/reuse

1. **Scenarios:** KAT-04 and ADV-02, consumed/reused authorization.
2. **Behavior:** unrepresentable; evaluations are stateless and deterministic
   for their supplied inputs.
3. **Limitation:** no globally unique grant identity, atomic consume operation,
   usage count, revocation state, or cross-run lookup.
4. **Claim:** a single-use authorization can legitimate only one execution.
5. **Nature:** lifecycle/state orchestration.
6. **Minimum information:** authorization ID, allowed uses, authoritative use
   records, execution identity, and an atomic consume/compare-and-set protocol.
7. **Persistent state:** yes.
8. **Authority:** yes; consumption changes grant legitimacy.
9. **Execution:** yes-adjacent; consumption must be atomic with, or reconciled
   against, the authorized execution.
10. **Reconciliation:** yes for interrupted or disputed consumption.
11. **Native overlap:** GitHub merge APIs, idempotency, PR terminal state, merge
    queues, and commit ancestry already constrain repeat repository transitions.
12. **Inclusion case:** checking an authoritative “unused” snapshot before
    returning eligibility could fail closed.
13. **Exclusion case:** truthful single-use enforcement requires durable atomic
    mutation, converting StateGate from validator into lifecycle coordinator.
14. **Classification:** **OWNED_BY_CONTINUITYOS**.
15. **Rationale:** this is the clearest anti-expansion case; StateGate must not
    acquire a persistent authorization store.

### 5. Duplicate execution detection

1. **Scenarios:** KAT-06 (duplicate ledger entry) and ADV-08 (duplicate artifacts
   presented as independent evidence).
2. **Behavior:** unrepresentable; StateGate hashes one supplied candidate and
   emits one proof, without asserting execution or evidence independence.
3. **Limitation:** no execution ID, ledger, global uniqueness rule, artifact
   lineage, or terminal execution observation.
4. **Claim:** repeated execution/evidence must not be counted as a distinct
   legitimate transition.
5. **Nature:** execution history and lifecycle orchestration.
6. **Minimum information:** canonical execution identity, target transition,
   artifact lineage/content IDs, terminal outcome, and authoritative ledger.
7. **Persistent state:** yes.
8. **Authority:** indirectly, if duplicates affect continuing legitimacy.
9. **Execution:** yes; detection describes events beyond validation.
10. **Reconciliation:** yes when submitted, attempted, and completed states differ.
11. **Native overlap:** PR merge state, commit graph, check runs, workflow run IDs,
    artifacts, and deployment environments already provide partial identities.
12. **Inclusion case:** proof hashes can help name duplicate evidence.
13. **Exclusion case:** equal proofs show equal validation inputs, not whether an
    execution happened once, twice, or never; a ledger would create precisely
    the prohibited execution-history responsibility.
14. **Classification:** **OWNED_BY_CONTINUITYOS**.
15. **Rationale:** ContinuityOS may consume StateGate proof IDs/hashes as inputs,
    but StateGate cannot truthfully adjudicate execution uniqueness.

### 6. Event-order validation

1. **Scenario:** KAT-13, reordered state transitions.
2. **Behavior:** unrepresentable for lifecycle transitions. StateGate does sort
   supplied review evidence deterministically and detects stale/conflicting
   reviews, but it does not ingest a global transition history.
3. **Limitation:** no lifecycle event schema, causal predecessor, sequence,
   authoritative log, or state machine.
4. **Claim:** legitimacy depends on events occurring in an allowed causal order.
5. **Nature:** lifecycle/state orchestration.
6. **Minimum information:** event IDs/types, subjects, monotonic or causal order,
   predecessors, authoritative provenance, and transition rules.
7. **Persistent state:** yes to reject omissions, forks, and reordered histories.
8. **Authority:** yes if ordering determines legitimacy.
9. **Execution:** yes-adjacent because execution events inhabit that history.
10. **Reconciliation:** yes.
11. **Native overlap:** Git commit ancestry, GitHub event timestamps, workflow
    runs, check suites, merge queues, and PR state already encode partial order.
12. **Inclusion case:** a complete immutable event bundle could be validated
    deterministically.
13. **Exclusion case:** ensuring completeness and canonical order requires an
    authoritative state machine/log, not the supplied-candidate validator.
14. **Classification:** **OWNED_BY_CONTINUITYOS**.
15. **Rationale:** moving it into StateGate would add persistent lifecycle and
    reconciliation duties. Bounded review-event evaluation remains StateGate's
    existing, narrower policy function.

### 7. Policy freshness

1. **Scenario:** ADV-09, stale policy representation with an old review-evidence
   hash.
2. **Behavior:** representable and correctly `NULL` with
   `REVIEW_EVIDENCE_HASH_MISMATCH`; the experiment did not expose a missing
   bounded StateGate predicate.
3. **Limitation:** StateGate cannot prove that caller-supplied policy is the
   globally current repository/organization policy at wall-clock time.
4. **Claim:** eligibility must be evaluated against the latest external policy,
   even if that policy was not supplied to the run.
5. **Nature:** external governance/configuration acquisition, not an additional
   property of the frozen candidate.
6. **Minimum information:** authoritative policy ID/version/hash, target scope,
   effective interval, acquisition provenance, evaluation time, and supersession
   history.
7. **Persistent state:** yes for a global “latest” assertion; no for comparison
   to an explicit expected hash, which already exists.
8. **Authority:** yes if StateGate chooses which policy is governing.
9. **Execution:** no.
10. **Reconciliation:** potentially for policy changes racing with execution.
11. **Native overlap:** GitHub rulesets, branch protection, CODEOWNERS, required
    reviews/checks, and merge queues enforce current native policy.
12. **Inclusion case:** a trusted policy-version snapshot could be bound into the
    canonical payload just as review policy is today.
13. **Exclusion case:** the current contract explicitly starts after acquisition
    and enforces enabled, supplied policy; “latest globally” requires an authority
    and clock and duplicates native governance.
14. **Classification:** **OUT_OF_SCOPE**.
15. **Rationale:** bounded expected-hash mismatch is already StateGate-owned and
    passed. A global policy freshness service is required by neither StateGate's
    contract nor the legitimacy scenarios retained as unrepresentable here.

### 8. Topology freshness

1. **Scenario:** ADV-10, prior base SHA presented as current topology.
2. **Behavior:** representable and correctly `NULL` with `BASE_SHA_MISMATCH`;
   KAT-08 similarly rejects a head mismatch and ADV-07 rejects repository
   substitution through canonical-object mutation.
3. **Limitation:** StateGate does not maintain a global, temporal topology
   registry or guarantee that topology will remain unchanged after validation.
4. **Claim:** eligibility requires knowledge of the globally latest topology at
   decision or later execution time.
5. **Nature:** acquisition/execution coordination beyond validation of the
   supplied candidate.
6. **Minimum information:** authoritative repo/ref identities, current target
   SHAs, acquisition time/provenance, topology version, and execution-time
   compare-and-swap identity.
7. **Persistent state:** yes for a global registry; no for existing evaluated
   versus declared SHA comparison.
8. **Authority:** no for observation, but yes if the registry becomes canonical.
9. **Execution:** yes for guaranteeing no post-validation change.
10. **Reconciliation:** potentially after races or force-pushes.
11. **Native overlap:** Git object IDs, refs, protected branches, required
    up-to-date checks, and merge queues are the authoritative repository topology.
12. **Inclusion case:** exact head/base/diff identity is central to StateGate.
13. **Exclusion case:** that bounded duty is already implemented; a global
    registry or execution-time lock would duplicate Git/GitHub and widen the
    validator into orchestration.
14. **Classification:** **OUT_OF_SCOPE**.
15. **Rationale:** no missing StateGate feature was observed. The correct
    boundary is current SHA binding plus native atomic merge controls, not a new
    topology service.

### 9. Terminal-state reconciliation history

1. **Scenarios:** KAT-11 and ADV-11, incomplete/plausible-prefix reconciliation
   histories.
2. **Behavior:** unrepresentable; the proof records the validation decision, not
   a subsequent terminal outcome.
3. **Limitation:** no lifecycle state machine, expected terminal state, complete
   event history, execution observation, or recovery protocol.
4. **Claim:** eligibility depends on the complete prior lifecycle being
   reconciled, and/or validation must later reconcile to execution outcome.
5. **Nature:** lifecycle and reconciliation.
6. **Minimum information:** operation/transition ID, expected states, complete
   ordered history, authoritative observations, terminal outcome, and exception
   recovery semantics.
7. **Persistent state:** yes.
8. **Authority:** yes if reconciliation restores or denies legitimacy.
9. **Execution:** yes; terminal outcome exists only after an attempted operation.
10. **Reconciliation:** yes, intrinsically.
11. **Native overlap:** merged/closed PR state, merge commits, check conclusions,
    workflow logs, deployments, and audit logs provide native observations.
12. **Inclusion case:** the proof could serve as the intended-state half of a
    later comparison.
13. **Exclusion case:** projecting intent evidence does not make StateGate the
    observer or owner of terminal execution; doing so would create a
    reconciliation engine.
14. **Classification:** **OWNED_BY_CONTINUITYOS**.
15. **Rationale:** ContinuityOS should correlate StateGate proof with native
    outcome evidence and own incomplete-history handling.

### 10. Proof-presence validation after decision projection

1. **Scenario:** KAT-09, proof artifact absent after decision.
2. **Behavior:** unrepresentable inside `validateMergeGuard`; `check.mjs` writes
   the projected proof and the action requests upload, but the decision cannot
   inspect a future write/upload/retention result.
3. **Limitation:** no post-decision artifact acknowledgement, durable retention
   service, execution gate consuming proof, or terminal audit record.
4. **Claim:** execution is illegitimate unless its validation proof was durably
   retained and available.
5. **Nature:** post-validation orchestration and reconciliation.
6. **Minimum information:** proof ID/hash, write/upload acknowledgement, durable
   location and retention policy, execution ID, and consumer confirmation.
7. **Persistent state:** yes for durable presence and retention.
8. **Authority:** yes if absence withdraws execution legitimacy.
9. **Execution:** yes-adjacent; a downstream gate must require the retained proof.
10. **Reconciliation:** yes when validation succeeds but persistence fails.
11. **Native overlap:** GitHub Actions artifact upload/retention, check results,
    job dependencies, required checks, and audit logs.
12. **Inclusion case:** StateGate's adapter can fail if its local proof write
    fails, preserving immediate emission integrity.
13. **Exclusion case:** a decision cannot validate a future side effect without
    circularity; durable presence requires an external observer and lifecycle.
14. **Classification:** **OWNED_BY_CONTINUITYOS**.
15. **Rationale:** StateGate must continue projecting exact proof. ContinuityOS
    or native workflow controls must require, retain, and reconcile it before
    execution.

## Counterfactual pressure test and counterarguments

There are no `REQUIRED_BY_STATEGATE_CONTRACT` classifications to pressure-test:
StateGate can truthfully validate its existing, explicit single-run object
without any missing concept. This is not an assertion that those concepts are
unimportant; it is an ownership determination.

For every `OWNED_BY_CONTINUITYOS` item, moving the complete responsibility into
StateGate would add at least one prohibited role:

| Responsibility | Persistent lifecycle | Authority | Execution/history | Reconciliation |
| --- | ---: | ---: | ---: | ---: |
| Authorization validity | yes in a trustworthy system | yes | no | no |
| Authorization expiry | yes | yes | no | possible |
| Authorization scope | normally | yes | no | no |
| Consumption/reuse | yes | yes | yes | yes |
| Duplicate execution | yes | possible | yes | yes |
| Event order | yes | yes | yes | yes |
| Terminal history | yes | yes | yes | yes |
| Post-decision proof presence | yes | yes | yes | yes |

The strongest preserved counterargument is that StateGate already owns exact
candidate canonicalization and is therefore a natural *verification adapter*
for immutable, supplied legitimacy attestations. That does not make it the owner
of issuance, currentness, consumption, execution, retention, or reconciliation.
Any future adapter needs an independently approved contract from the owning
system and must remain stateless and non-authoritative.

## Frozen follow-up boundary

### StateGate-required changes

None. There is no implementation issue to open against StateGate from this
adjudication, and no dependency graph of StateGate changes. Issue 71's frozen
formula combined StateGate validation with authorization, unused-execution, and
reconciliation predicates belonging to a broader execution-legitimacy model.
Those assumptions exceeded the canonical StateGate contract.

### ContinuityOS-owned responsibilities

ContinuityOS owns the authoritative grant schema/trust model; validity,
effective time, scope, revocation and atomic consumption; execution identity and
deduplication; authoritative event ordering; proof-retention requirement;
terminal execution observation; and reconciliation. It should reuse Git/GitHub
identities and controls rather than mirror them without a demonstrated gap.

### Unresolved questions

These do not prevent ownership classification:

1. What is ContinuityOS's canonical authorization schema, issuer/trust-root
   model, revocation protocol, and atomic consumption boundary?
2. Which GitHub native event or identifier is authoritative for execution and
   terminal outcome, and what failures require a separate ledger?
3. What retention acknowledgement is sufficient before execution and who owns
   its service-level guarantee?
4. Does a future integration need StateGate merely to bind a supplied
   ContinuityOS attestation hash? If so, that interface requires a new issue and
   evidence; it is not implied by Issue 71.
5. Because GitHub was inaccessible in this environment, any Issue 70/71/76 text
   not present in the supplied task or retained repository evidence must be
   checked before relying on it in downstream design.

### Exact Issue 71 rerun condition

Do **not** rerun Issue 71 expecting all 24 scenarios to execute against
StateGate alone. Its StateGate-only result is final evidence that all 13
representable scenarios match deterministically and 11 scenarios are outside
the implemented input model.

Rerun only under one of these precisely labelled boundaries:

1. **StateGate conformance replay:** replay only the 13 scenarios marked
   `representable: true`, with unchanged expected outcomes. No StateGate feature
   is prerequisite.
2. **Continufy end-to-end legitimacy campaign:** rerun all 24 only after
   ContinuityOS has canonical, testable authorization lifecycle, execution
   identity/history, proof-retention, event-order, and reconciliation interfaces;
   the harness must identify which component evaluates each predicate and must
   not report ContinuityOS outcomes as StateGate decisions. ADV-09 and ADV-10
   continue to exercise StateGate's existing bounded hash/SHA binding, not a new
   freshness service.

Therefore **zero gaps must be implemented in StateGate before an Issue 71
StateGate conformance replay**. A full-model rerun depends on ContinuityOS, not a
StateGate revision.

## Downstream implication for MindShift Issue 79

MindShift may produce context-governed intent candidates, but must not infer
permission or legitimacy from cognition, from StateGate `VALID`, or from proof
presence. Issue 79 should pass the exact candidate identity to the legitimacy
boundary, consume a separately authoritative ContinuityOS decision, and treat
StateGate proof only as bounded validation evidence. MindShift must not issue or
consume authorizations, record execution as complete, or reconcile terminal
state. This preserves cognition != legitimacy and proposal != authority while
allowing StateGate's canonical hash to correlate the candidate across systems.

## Minimum mutation and validation plan

The only repository mutation for Issue 76 is this durable adjudication record.
Runtime, tests, schemas, workflows, release artifacts, and Issue 71 evidence are
unchanged. Correctness is demonstrated by conformance, deterministic Issue 71
replay, retained evidence hashes, release verification, rehearsal validation,
syntax checks, and whitespace validation. Rollback is deletion of this file.

## Terminal determination

**STATEGATE_GAPS_ADJUDICATED**
