import fs from 'node:fs';
import crypto from 'node:crypto';

const ledgerPath = 'acceptance-ledger.v1.json';
const planPath = '06_PLAN_DE_COMMITS.md';
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const plan = fs.readFileSync(planPath, 'utf8');

const unique = values => [...new Set(values)];
// RFC 8785/JCS-compatible canonical JSON for the value types used by the
// frozen ledger.  Object member order must never depend on JavaScript insertion
// order: independent verifiers in other runtimes must reproduce every root.
function canonical(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Non-finite number is not valid JCS');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  throw new Error(`Unsupported JCS value type ${typeof value}`);
}
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const bytewise = (left, right) => Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
function candidateSet(kind, records, uniqueKey) {
  const copy = [...records].sort((a, b) => bytewise(uniqueKey(a), uniqueKey(b)));
  const keys = copy.map(uniqueKey);
  if (new Set(keys).size !== keys.length) throw new Error(`Duplicate ${kind} candidate-set key`);
  const preimage = { domain: 'solguard/candidate-set/v1', set_kind: kind, count: copy.length, records: copy };
  return { records: copy, count: copy.length, root: sha256(canonical(preimage)) };
}
const hard = id => ({ id, type: 'hard' });
const terminalObservation = id => ({
  id,
  type: 'terminal_observation',
  required_states: ['accepted', 'terminal_failed', 'terminal_invalid', 'insufficient_evidence', 'terminal_not_run'],
  evidence_root: 'required',
  pending_reopened_or_missing: 'reject'
});
const terminalDerivedObservation = id => ({
  id,
  type: 'terminal_derived_observation',
  required_computed_states: ['satisfied', 'unsatisfied'],
  evaluation_receipt_root: 'required',
  operand_state_hash: 'required',
  missing_or_stale_receipt: 'reject'
});
const historicalOrdering = id => ({
  id,
  type: 'historical_ordering',
  required_state: 'accepted',
  ordering_receipt_root: 'required',
  successor_release_closure_import: false
});
const contract = (id, contract_id, contract_version = 'v1') =>
  ({ id, type: 'contract', contract_id, contract_version });
const emptyAcceptance = () => ({
  evidence_root: null,
  verifier_root: null,
  accepted_ledger_revision: null,
  dependency_state_hash: null,
  reopened_by: []
});

const nodes = new Map(ledger.nodes.map(node => [node.id, node]));
for (const retiredBootstrapCap of ['GOV-001-CAP', 'GOV-003-CAP', 'GOV-004-CAP', 'LEDGER-001-CAP']) nodes.delete(retiredBootstrapCap);
for (const node of nodes.values()) {
  node.dependencies = (node.dependencies || []).filter(dep => !['GOV-001-CAP', 'GOV-003-CAP', 'GOV-004-CAP', 'LEDGER-001-CAP'].includes(dep.id));
  if (node.kind === 'derived' && node.formula?.operands) node.dependencies = node.formula.operands.map(hard);
}

// Implementation packages may reuse common implementation capabilities, but
// must never inherit all-scope aggregates or post-build operational freezes.
// Those remain operands of candidate evaluation/certification only.
for (const [consumerId, aggregateId, capabilityId] of [
  ['LANG-050A', 'LANG-010', 'LANG-010-HARNESS'],
  ['LANG-070', 'LANG-040', 'LANG-040-HARNESS'],
  ['PROOF-506', 'ISO-904', 'ISO-CAP-904'],
  ['DECIDE-603-E2E', 'ISO-904', 'ISO-CAP-904']
]) {
  const consumer = nodes.get(consumerId);
  if (!consumer || !nodes.has(capabilityId)) throw new Error(`Missing scope-isolation rewire ${consumerId}/${capabilityId}`);
  consumer.dependencies = consumer.dependencies.map(dep =>
    dep.type === 'hard' && dep.id === aggregateId ? hard(capabilityId) : dep
  );
}

function implementationEvidence(profile = 'primary_integration') {
  return {
    schema: 'solguard-implementation-transition-evidence.v1',
    profile,
    closed: true,
    required: [
      'task_manifest',
      'implementation_report',
      'verification_report',
      'changed_files',
      'commits',
      'commands_with_exit_codes',
      'negative_results',
      'contract_results',
      'e2e_root',
      'residual_risks',
      'immutable_evidence_root',
      'required_contribution_set_root'
    ],
    forbidden: [
      'campaign_context',
      'measurement_context',
      'freeze_attestation_context',
      'database_cutover_context',
      'release_pre_tag_context',
      'post_tag_terminal_context'
    ]
  };
}

const gitForbidden = [
  'implementation_report',
  'changed_files',
  'commits',
  'branch',
  'task_footer',
  'source_tree_writes',
  'changelog_update'
];

function operationalEvidence(mode) {
  const profiles = {
    bootstrap: {
      schema: 'solguard-bootstrap-transition-evidence.v1',
      required: ['genesis_batch_id', 'genesis_member_set', 'prior_ledger_absence_proof', 'role_policy_root', 'signatures', 'immutable_evidence_root']
    },
    validation: {
      schema: 'solguard-validation-record.v1',
      required: ['validation_id', 'validation_manifest_root', 'candidate_manifest_root', 'candidate_full_sha_tree_root', 'environment_root', 'denominator_root', 'command_execution_result_set_root', 'output_root', 'failure_predicate_results', 'assurance_verifier_root', 'immutable_evidence_root']
    },
    candidate_epoch: {
      schema: 'solguard-candidate-epoch-open-receipt.v1',
      required: ['candidate_epoch_context', 'candidate_epoch_artifact_ref', 'candidate_epoch_content_digest', 'candidate_epoch_root', 'candidate_epoch_id', 'candidate_epoch_kind', 'candidate_manifest_root', 'candidate_full_sha_tree_root', 'repository_revision_set_root', 'included_scope_ids', 'included_scope_count', 'excluded_scope_ids', 'excluded_scope_count', 'contract_version_set_root', 'release_train_closure_id_set_root', 'release_train_closure_id_count', 'planned_input_subject_set_root', 'planned_input_subject_count', 'accepted_input_membership_root', 'accepted_input_membership_count', 'planned_operational_gate_set_root', 'planned_operational_gate_count', 'claim_required_pass_set_root', 'claim_required_pass_count', 'evaluation_observation_set_root', 'evaluation_observation_count', 'allowed_next_action_set_root', 'allowed_next_action_count', 'freeze_reason', 'custodian_receipt_root', 'assurance_verifier_root', 'external_timestamp_receipt_set_root', 'immutable_evidence_root']
    },
    candidate_epoch_close: {
      schema: 'solguard-candidate-epoch-close-transition.v1',
      required: ['candidate_epoch_close_context', 'source_candidate_epoch_id', 'source_candidate_epoch_root', 'preclose_candidate_epoch_state_root', 'preclose_dossier_ref', 'preclose_dossier_content_digest', 'preclose_dossier_root', 'frozen_membership_root', 'frozen_membership_count', 'terminal_state_event_binding_set_root', 'terminal_state_event_binding_count', 'primary_observation_event_ids', 'primary_observation_evidence_roots', 'primary_observation_count', 'derived_observation_event_ids', 'derived_observation_evaluation_roots', 'derived_observation_operand_state_hashes', 'derived_observation_count', 'derived_claim_evaluation_event_id', 'derived_claim_result', 'derived_claim_evaluation_root', 'closure_outcome', 'planned_target_set_root', 'observed_target_set_root', 'target_coverage_count', 'target_coverage_denominator', 'attempt_set_root', 'output_set_root', 'reveal_set_root', 'adjudication_set_root', 'result_set_root', 'terminal_outcome_set_root', 'not_started_reason_set_root', 'policy_opening_set_root', 'finding_materiality_assessment_set_root', 'coverage_predicate_results', 'source_epoch_authority_root', 'acceptance_verifier_root', 'assurance_verifier_root', 'external_timestamp_receipt_set_root', 'immutable_evidence_root']
    },
    freeze_attestation: {
      schema: 'solguard-freeze-attestation.v1',
      required: ['freeze_attestation_context', 'prefreeze_validation_event_ids', 'prefreeze_validation_event_roots', 'candidate_full_sha_tree_root', 'candidate_manifest_root', 'instance_binding_root', 'assurance_verifier_root', 'immutable_evidence_root']
    },
    campaign: {
      schema: 'solguard-campaign-transition-evidence.v1',
      required: ['campaign_context', 'campaign_manifest_root', 'custodian_receipt_root', 'contamination_root_at_freeze', 'instance_binding_root', 'signatures', 'immutable_evidence_root']
    },
    measurement: {
      schema: 'solguard-measurement-transition-evidence.v1',
      required: ['measurement_context', 'measurement_report_root', 'campaign_manifest_root', 'denominator_root', 'instance_binding_root', 'assurance_verifier_root', 'immutable_evidence_root']
    },
    database_cutover: {
      schema: 'solguard-database-cutover-receipt.v1',
      required: ['database_cutover_context', 'legacy_backup_path', 'legacy_backup_digest', 'legacy_read_only_freeze_receipt', 'new_database_path', 'new_database_create_once_receipt', 'migration_counts', 'migration_roots', 'migration_provenance_root', 'shadow_equivalence_root', 'zero_legacy_writers_receipt', 'cutover_event_id', 'guard_retention_root', 'restore_rollback_receipt', 'forward_rollback_receipt', 'partial_failure_matrix_root', 'assurance_verifier_root', 'immutable_evidence_root']
    },
    final_evidence: {
      schema: 'solguard-final-evidence-transition.v1',
      required: ['final_evidence_context', 'dossier_entry_root', 'instance_binding_root', 'assurance_verifier_root', 'immutable_evidence_root']
    },
    release_pre_tag: {
      schema: 'solguard-release-pre-tag-transition.v1',
      required: ['release_pre_tag_context', 'release_decision_event_id', 'prepromotion_state_root', 'release_pre_tag_dossier_self_hash', 'dsse_envelope_root', 'threshold_signature_receipt', 'tag_absence_proof', 'assurance_verifier_root', 'immutable_evidence_root']
    },
    post_tag_terminal: {
      schema: 'solguard-post-tag-terminal-transition.v1',
      required: ['post_tag_terminal_context', 'final_006_event_id', 'final_006_dossier_self_hash', 'final_006_cumulative_root', 'tag_realization_receipt_15_of_15', 'post_tag_terminal_dossier_self_hash', 'pre_state_plus_transition_input_root', 'assurance_verifier_root', 'immutable_evidence_root']
    }
  };
  const profile = profiles[mode];
  if (!profile) throw new Error(`Unknown evidence mode ${mode}`);
  return { ...profile, profile: mode, closed: true, forbidden: gitForbidden };
}

function freezeEvidenceFor(node) {
  const common = ['freeze_attestation_context', 'attestation_kind', 'prefreeze_validation_event_ids', 'prefreeze_validation_event_roots', 'candidate_full_sha_tree_root', 'candidate_manifest_root', 'instance_binding_root', 'assurance_verifier_root'];
  if (node.id === 'SCOPE-900') return {
    ...closedOperationalProfile('solguard-freeze-attestation.v1', 'detection_scope_freeze', [...common, 'scope_manifest_set_root', 'scope_manifest_count', 'runtime_reachability_closure_root', 'forbidden_capability_absence_root'], ['scanner_runtime_bom_root', 'evaluator_bom_root', 'governance_bom_root', 'isolation_closure_root']),
    cardinality: { prefreeze_validation_event_ids: 7, prefreeze_validation_event_roots: 7, scope_manifest_count: 30 }
  };
  if (node.id === 'BOM-903') return {
    ...closedOperationalProfile('solguard-freeze-attestation.v1', 'three_bom_freeze', [...common, 'scanner_runtime_bom_root', 'evaluator_bom_root', 'governance_bom_root', 'bom_component_set_root', 'provenance_root'], ['scope_manifest_set_root', 'runtime_reachability_closure_root', 'isolation_closure_root']),
    cardinality: { prefreeze_validation_event_ids: 7, prefreeze_validation_event_roots: 7, scanner_runtime_bom_root: 1, evaluator_bom_root: 1, governance_bom_root: 1 }
  };
  if (node.id === 'ISO-904') return {
    ...closedOperationalProfile('solguard-freeze-attestation.v1', 'isolation_freeze', [...common, 'isolation_closure_root', 'network_closure_root', 'process_closure_root', 'filesystem_closure_root', 'key_role_map_root', 'sentinel_result_set_root'], ['scope_manifest_set_root', 'scanner_runtime_bom_root', 'evaluator_bom_root', 'governance_bom_root']),
    cardinality: { prefreeze_validation_event_ids: 7, prefreeze_validation_event_roots: 7, isolation_closure_root: 1, key_role_map_root: 1 }
  };
  if (node.id === 'VERTICAL-EVM-SCOPE-001') return {
    ...closedOperationalProfile('solguard-freeze-attestation.v1', 'vertical_detection_scope_freeze', [...common, 'scope_manifest_set_root', 'scope_manifest_count', 'runtime_reachability_closure_root', 'forbidden_capability_absence_root'], ['scanner_runtime_bom_root', 'evaluator_bom_root', 'governance_bom_root', 'isolation_closure_root']),
    cardinality: { prefreeze_validation_event_ids: 7, prefreeze_validation_event_roots: 7, scope_manifest_count: 1 }
  };
  if (node.id === 'VERTICAL-EVM-BOM-001') return {
    ...closedOperationalProfile('solguard-freeze-attestation.v1', 'vertical_three_bom_freeze', [...common, 'scanner_runtime_bom_root', 'evaluator_bom_root', 'governance_bom_root', 'bom_component_set_root', 'provenance_root'], ['scope_manifest_set_root', 'runtime_reachability_closure_root', 'isolation_closure_root']),
    cardinality: { prefreeze_validation_event_ids: 7, prefreeze_validation_event_roots: 7, scanner_runtime_bom_root: 1, evaluator_bom_root: 1, governance_bom_root: 1 }
  };
  if (node.id === 'VERTICAL-EVM-ISO-001') return {
    ...closedOperationalProfile('solguard-freeze-attestation.v1', 'vertical_isolation_freeze', [...common, 'isolation_closure_root', 'network_closure_root', 'process_closure_root', 'filesystem_closure_root', 'key_role_map_root', 'sentinel_result_set_root'], ['scope_manifest_set_root', 'scanner_runtime_bom_root', 'evaluator_bom_root', 'governance_bom_root']),
    cardinality: { prefreeze_validation_event_ids: 7, prefreeze_validation_event_roots: 7, isolation_closure_root: 1, key_role_map_root: 1 }
  };
  throw new Error(`Unclassified freeze node ${node.id}`);
}

function closedOperationalProfile(schema, profile, required, extraForbidden = []) {
  return {
    schema,
    profile,
    closed: true,
    required: unique([...required, 'immutable_evidence_root']),
    forbidden: unique([...gitForbidden, ...extraForbidden])
  };
}

function campaignEvidenceFor(node) {
  if (node.id === 'CORPUS-905' || node.id === 'VERTICAL-EVM-CORPUS-001') return closedOperationalProfile(
    'solguard-corpus-snapshot-transition.v1',
    'corpus_snapshot',
    ['campaign_context', ...(node.id === 'VERTICAL-EVM-CORPUS-001' ? ['claim_profile', 'scope_ids'] : []), 'corpus_manifest_root', 'truth_item_set_root', 'contamination_event_set_root', 'contamination_root_at_freeze', 'historical_reconciliation_root', 'instance_binding_root', 'signatures', 'assurance_verifier_root'],
    ['campaign_manifest_root', 'campaign_manifest_roots', 'measurement_report_root']
  );
  if (node.id === 'HOLDOUT-906') return closedOperationalProfile(
    'solguard-campaign-transition-evidence.v1',
    'h_gen_pair_seal',
    ['campaign_context', 'campaign_manifest_roots', 'campaign_pair_set_root', 'opaque_commitment_roots', 'power_analysis_root', 'custodian_receipt_root', 'contamination_root_at_freeze', 'instance_binding_root', 'signatures'],
    ['campaign_manifest_root', 'measurement_report_root']
  );
  if (node.id === 'NOVEL-907') return closedOperationalProfile(
    'solguard-campaign-transition-evidence.v1',
    'h_novel_pair_seal',
    ['campaign_context', 'campaign_manifest_roots', 'campaign_pair_set_root', 'novelty_authority_root', 'power_analysis_root', 'custodian_receipt_root', 'contamination_root_at_freeze', 'instance_binding_root', 'signatures'],
    ['campaign_manifest_root', 'measurement_report_root']
  );
  if (node.id === 'VERTICAL-EVM-HGEN-SEAL-001') return closedOperationalProfile(
    'solguard-campaign-transition-evidence.v1',
    'h_gen_pair_seal',
    ['campaign_context', 'vertical_profile_root', 'claim_profile', 'scope_ids', 'campaign_manifest_roots', 'campaign_pair_set_root', 'opaque_commitment_roots', 'power_analysis_root', 'custodian_receipt_root', 'contamination_root_at_freeze', 'instance_binding_root', 'signatures'],
    ['campaign_manifest_root', 'measurement_report_root']
  );
  if (node.id === 'VERTICAL-EVM-HNOVEL-SEAL-001') return closedOperationalProfile(
    'solguard-campaign-transition-evidence.v1',
    'h_novel_pair_seal',
    ['campaign_context', 'vertical_profile_root', 'claim_profile', 'scope_ids', 'campaign_manifest_roots', 'campaign_pair_set_root', 'novelty_authority_root', 'power_analysis_root', 'custodian_receipt_root', 'contamination_root_at_freeze', 'instance_binding_root', 'signatures'],
    ['campaign_manifest_root', 'measurement_report_root']
  );
  if (node.id === 'VERTICAL-EVM-PROFILE-001') return closedOperationalProfile(
    'solguard-vertical-profile-preregistration.v1',
    'bounty_vertical_preregistration',
    ['campaign_context', 'vertical_profile_manifest_root', 'scope_set_root', 'candidate_full_sha_tree_root', 'candidate_manifest_root', 'hgen_pair_id_set_root', 'hnovel_pair_id_set_root', 'power_analysis_root', 'threshold_policy_root', 'live_sampling_frame_root', 'live_authorization_policy_root', 'live_endpoint_set_root', 'live_stopping_abort_root', 'issuer_trust_policy_commitment_root', 'maximum_claim_digest', 'external_human_role_receipts', 'signatures'],
    ['measurement_report_root', 'measurement_report_roots', 'post_result_profile_edit']
  );
  throw new Error(`Unclassified campaign node ${node.id}`);
}

function measurementEvidenceFor(node) {
  if (/^VERTICAL-EVM-HGEN-[AB]-001$/.test(node.id)) return closedOperationalProfile(
    'solguard-measurement-transition-evidence.v1',
    'h_gen_scope_replica',
    ['measurement_context', 'vertical_profile_root', 'claim_profile', 'scope_ids', 'campaign_manifest_roots', 'campaign_manifest_count', 'replica_role', 'counterpart_campaign_id', 'campaign_pair_set_root', 'measurement_report_roots', 'measurement_report_count', 'denominator_root', 'target_policy_openings_root', 'finding_materiality_assessments_root', 'instance_binding_root', 'assurance_verifier_root'],
    ['campaign_manifest_root', 'measurement_report_root']
  );
  if (/-C5[AB]$/.test(node.id)) return closedOperationalProfile(
    'solguard-measurement-transition-evidence.v1',
    'h_gen_scope_replica',
    ['measurement_context', 'campaign_manifest_roots', 'campaign_manifest_count', 'replica_role', 'counterpart_campaign_id', 'campaign_pair_set_root', 'measurement_report_roots', 'measurement_report_count', 'denominator_root', 'target_policy_openings_root', 'finding_materiality_assessments_root', 'instance_binding_root', 'assurance_verifier_root'],
    ['campaign_manifest_root', 'measurement_report_root']
  );
  if (node.id === 'CANARY-909' || node.id === 'VERTICAL-EVM-CANARY-001') return closedOperationalProfile(
    'solguard-canary-validation-receipt.v1',
    'canary_validation',
    ['measurement_context', ...(node.id === 'VERTICAL-EVM-CANARY-001' ? ['claim_profile', 'scope_ids'] : []), 'canary_run_manifest_root', 'canary_result_root', 'candidate_manifest_root', 'database_cutover_event_id', 'failure_predicate_results', 'assurance_verifier_root'],
    ['campaign_manifest_root', 'campaign_manifest_roots', 'measurement_report_root', 'measurement_report_roots']
  );
  if (node.id === 'KNOWN-910' || node.id === 'VERTICAL-EVM-KNOWN-001') return closedOperationalProfile(
    'solguard-measurement-transition-evidence.v1',
    'known_campaign',
    ['measurement_context', ...(node.id === 'VERTICAL-EVM-KNOWN-001' ? ['claim_profile', 'scope_ids'] : []), 'known_run_manifest_root', 'corpus_manifest_root', 'truth_item_set_root', 'measurement_report_root', 'denominator_root', 'target_policy_openings_root', 'finding_materiality_assessments_root', 'instance_binding_root', 'assurance_verifier_root'],
    ['campaign_manifest_roots', 'measurement_report_roots', 'blind_claim_credit']
  );
  if (/^VERTICAL-EVM-HNOVEL-[AB]-001$/.test(node.id)) return closedOperationalProfile(
    'solguard-measurement-transition-evidence.v1',
    'h_novel_scope_replica',
    ['measurement_context', 'vertical_profile_root', 'claim_profile', 'scope_ids', 'campaign_manifest_roots', 'campaign_manifest_count', 'replica_role', 'counterpart_campaign_id', 'campaign_pair_set_root', 'measurement_report_roots', 'measurement_report_count', 'denominator_root', 'novelty_inventory_root', 'novelty_taxonomy_root', 'novelty_classification_set_root', 'target_policy_openings_root', 'finding_materiality_assessments_root', 'post_reveal_contamination_root', 'instance_binding_root', 'assurance_verifier_root'],
    ['campaign_manifest_root', 'measurement_report_root']
  );
  if (node.id === 'NOVELRUN-912') return closedOperationalProfile(
    'solguard-measurement-transition-evidence.v1',
    'h_novel_pair_aggregate',
    ['measurement_context', 'campaign_manifest_roots', 'campaign_manifest_count', 'campaign_pair_set_root', 'measurement_report_roots', 'measurement_report_count', 'measurement_report_set_root', 'denominator_roots', 'novelty_inventory_root', 'novelty_taxonomy_root', 'novelty_classification_set_root', 'target_policy_openings_root', 'finding_materiality_assessments_root', 'post_reveal_contamination_root', 'instance_binding_root', 'assurance_verifier_root'],
    ['campaign_manifest_root', 'measurement_report_root']
  );
  if (node.id === 'LIVE-913' || node.id === 'VERTICAL-EVM-LIVE-001') return closedOperationalProfile(
    'solguard-live-measurement-transition.v1',
    'live_auth_campaign',
    ['measurement_context', ...(node.id === 'VERTICAL-EVM-LIVE-001' ? ['vertical_profile_root', 'claim_profile', 'scope_ids'] : []), 'campaign_manifest_roots', 'campaign_manifest_count', 'measurement_report_roots', 'measurement_report_count', 'live_authorization_artifact_roots', 'live_authorization_artifact_count', 'live_authorization_status_root', 'attempt_authorization_check_set_root', 'target_policy_openings_root', 'finding_materiality_assessments_root', 'instance_binding_root', 'assurance_verifier_root'],
    ['campaign_manifest_root', 'measurement_report_root', 'live_authorization_artifact_root']
  );
  if (node.id === 'TEST-V5' || node.id === 'VERTICAL-EVM-V5-001') return closedOperationalProfile(
    'solguard-operational-validation-receipt.v1',
    'known_validation',
    ['measurement_context', ...(node.id === 'VERTICAL-EVM-V5-001' ? ['claim_profile', 'scope_ids'] : []), 'known_run_manifest_root', 'corpus_manifest_root', 'candidate_manifest_root', 'failure_predicate_results', 'assurance_verifier_root'],
    ['campaign_manifest_root', 'campaign_manifest_roots']
  );
  if (node.id === 'TEST-V6') return closedOperationalProfile(
    'solguard-operational-validation-receipt.v1',
    'h_gen_pair_aggregate',
    ['measurement_context', 'campaign_manifest_roots', 'campaign_manifest_count', 'campaign_pair_set_root', 'operand_measurement_event_ids', 'operand_measurement_event_set_root', 'measurement_report_roots', 'measurement_report_count', 'measurement_report_set_root', 'denominator_roots', 'failure_predicate_results', 'assurance_verifier_root'],
    ['campaign_manifest_root', 'measurement_report_root']
  );
  if (node.id === 'TEST-V7') return closedOperationalProfile(
    'solguard-operational-validation-receipt.v1',
    'h_novel_pair_aggregate',
    ['measurement_context', 'campaign_manifest_roots', 'campaign_manifest_count', 'campaign_pair_set_root', 'measurement_report_roots', 'measurement_report_count', 'truth_reveal_set_root', 'novelty_inventory_root', 'novelty_taxonomy_root', 'novelty_classification_set_root', 'target_policy_openings_root', 'finding_materiality_assessments_root', 'post_reveal_contamination_root', 'failure_predicate_results', 'assurance_verifier_root'],
    ['campaign_manifest_root', 'measurement_report_root']
  );
  if (node.id === 'TEST-V8') return closedOperationalProfile(
    'solguard-operational-validation-receipt.v1',
    'live_auth_campaign',
    ['measurement_context', 'live_authorization_artifact_roots', 'live_authorization_artifact_count', 'live_authorization_status_root', 'attempt_authorization_check_set_root', 'campaign_manifest_roots', 'campaign_manifest_count', 'measurement_report_roots', 'measurement_report_count', 'failure_predicate_results', 'assurance_verifier_root'],
    ['campaign_manifest_root', 'measurement_report_root', 'live_authorization_artifact_root']
  );
  if (node.id === 'TEST-CHAOS' || node.id === 'VERTICAL-EVM-CHAOS-001') return closedOperationalProfile(
    'solguard-chaos-validation-receipt.v1',
    'chaos_validation',
    ['measurement_context', ...(node.id === 'VERTICAL-EVM-CHAOS-001' ? ['vertical_profile_root', 'claim_profile', 'scope_ids'] : []), 'run_manifest_roots', 'run_manifest_count', 'run_manifest_set_root', 'declared_campaign_reference_roots', 'declared_campaign_reference_count', 'fault_injection_matrix_root', 'recovery_result_set_root', 'failure_predicate_results', 'assurance_verifier_root'],
    ['campaign_manifest_root', 'measurement_report_root']
  );
  throw new Error(`Unclassified measurement node ${node.id}`);
}

function verifier(type = 'independent_verification') {
  return {
    type,
    separation: 'different_context_identity_and_credentials',
    required_verdict: 'ACCEPT',
    forbidden: ['implementer_self_acceptance', 'waiver_as_pass', 'skipped_test_as_pass']
  };
}

function makePrimary(id, owner, dependencies, criteria, profile = 'capability_implementation') {
  return {
    id,
    kind: 'primary',
    counted: true,
    owner,
    state: 'pending',
    node_version: 1,
    operational: false,
    evidence_mode: 'implementation',
    dependencies,
    required_contribution_ids: [],
    formula: null,
    predicate: {
      type: 'work_package_acceptance',
      reference: '09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md',
      criteria_id: id,
      criteria_locator: 'heading_or_table_row',
      must_hold: criteria
    },
    evidence_descriptor: implementationEvidence(profile),
    verifier_descriptor: verifier(),
    acceptance: emptyAcceptance()
  };
}

function putPrimary(id, owner, dependencies, criteria, profile) {
  const prior = nodes.get(id);
  const next = makePrimary(id, owner, dependencies, criteria, profile);
  if (prior?.acceptance) next.acceptance = prior.acceptance;
  if (prior?.state) next.state = prior.state;
  if (prior?.node_version) next.node_version = prior.node_version;
  nodes.set(id, next);
}

// Capability code may be implemented and verified before any real campaign or
// freeze instance exists. Operational primaries depend on these capabilities.
putPrimary('SCOPE-CAP-900', 'solguard-deploy', [hard('GOV-001'), hard('GOV-003'), hard('GOV-008')], [
  'detection_only_closure_implementation', 'scope_manifest_verifiers_writer_off', 'negative_process_and_file_reachability', 'all_required_contributions_accepted', 'integration_e2e_passed'
]);
putPrimary('VALIDATION-CAP-900', 'solguard-agents', [hard('GOV-004'), hard('LEDGER-001')], [
  'record_validation_event_union_implemented', 'candidate_and_environment_binding_enforced', 'replay_swap_stale_and_reorder_rejected', 'all_required_contributions_accepted', 'integration_e2e_passed'
]);
putPrimary('BOM-CAP-903', 'solguard-deploy', [hard('SCOPE-CAP-900'), hard('PLAT-805')], [
  'bom_builder_and_verifier_implemented', 'full_sha_tree_and_image_digests_enforced', 'missing_extra_and_mutated_component_rejected', 'all_required_contributions_accepted', 'integration_e2e_passed'
]);
putPrimary('ISO-CAP-904', 'solguard-deploy', [hard('SCOPE-CAP-900'), hard('BOM-CAP-903')], [
  'clean_room_isolation_harness_implemented', 'forbidden_oracle_and_network_probes_fail_closed', 'snapshot_reproduction_verified', 'all_required_contributions_accepted', 'integration_e2e_passed'
]);
putPrimary('DB-CAP-902', 'solguard-database', [
  contract('PLAT-801', 'solguard-benchmark-database.v2', 'v2'), hard('PLAT-802'),
  contract('MEASURE-901', 'solguard-campaign-manifest.v1'),
  contract('MEASURE-901', 'solguard-contamination-event.v1'),
  contract('MEASURE-901', 'solguard-corpus-manifest.v1'),
  contract('MEASURE-901', 'solguard-truth-item.v1'),
  contract('MEASURE-901', 'solguard-match-decision.v1'),
  contract('MEASURE-901', 'solguard-adjudication-review.v1'),
  contract('MEASURE-901', 'solguard-metric-provenance.v1'),
  contract('MEASURE-901', 'solguard-measurement-report.v1')
], [
  'migration_schema_and_create_once_tooling', 'dry_run_shadow_and_rollback_tooling', 'legacy_writer_guard_implemented', 'no_real_cutover_receipt', 'all_required_contributions_accepted', 'integration_e2e_passed'
]);
putPrimary('CORPUS-CAP-905', 'solguard-deploy/evaluator', [hard('MEASURE-901'), hard('DB-CAP-902')], [
  'corpus_manifest_and_contamination_tooling_writer_off', 'truth_item_import_validation', 'tamper_and_lineage_tests', 'all_required_contributions_accepted', 'integration_e2e_passed'
]);
putPrimary('HOLDOUT-CAP-906', 'solguard-deploy/custodian', [hard('MEASURE-901'), hard('ISO-CAP-904'), hard('CORPUS-CAP-905')], [
  'holdout_generation_and_custody_tooling_writer_off', 'human_custodian_role_policy_enforced', 'leakage_probes_and_negative_tests', 'all_required_contributions_accepted', 'integration_e2e_passed'
]);
putPrimary('NOVEL-CAP-907', 'solguard-deploy/custodian', [hard('HOLDOUT-CAP-906'), hard('CORPUS-CAP-905'), hard('MEASURE-901')], [
  'novelty_attestation_and_collision_tooling_writer_off', 'post_reveal_contamination_accounting', 'no_blind_credit_for_postseal_collision', 'all_required_contributions_accepted', 'integration_e2e_passed'
]);
putPrimary('CANARY-CAP-909', 'solguard-deploy', [hard('RUN-208'), hard('DB-CAP-902'), hard('VALIDATION-CAP-900')], [
  'canary_runner_and_report_verifier_implemented', 'fixed_denominator_and_failure_predicates', 'writer_off_until_operational_event', 'all_required_contributions_accepted', 'integration_e2e_passed'
]);
putPrimary('KNOWN-CAP-910', 'solguard-deploy/evaluator', [hard('CORPUS-CAP-905'), hard('EVAL-908'), hard('VALIDATION-CAP-900')], [
  'known_corpus_runner_and_evaluator_implemented', 'known_labeling_cannot_be_published_as_blind', 'writer_off_until_operational_event', 'all_required_contributions_accepted', 'integration_e2e_passed'
]);
putPrimary('LIVE-CAP-913', 'solguard-deploy/operator', [hard('NOVEL-CAP-907'), hard('EVAL-908'), hard('VALIDATION-CAP-900')], [
  'authorized_live_manifest_and_fixed_frame_runner_implemented', 'per_attempt_authorization_and_retry_lineage', 'writer_off_until_operational_event', 'all_required_contributions_accepted', 'integration_e2e_passed'
]);
putPrimary('FINAL-002-CAP', 'solguard-agents', [hard('LEDGER-001'), hard('EVAL-908'), hard('LANG-200-HARNESS')], [
  'dossier_graph_link_schema_and_read_only_validator_implemented', 'tamper_replay_signature_and_root_failures_rejected', 'all_required_contributions_accepted', 'integration_e2e_passed'
]);
putPrimary('FINAL-003-CAP', 'solguard-deploy/clean-room-reproducer', [hard('FINAL-002-CAP'), hard('EVAL-908'), hard('LEDGER-001')], [
  'clean_room_reproduction_tooling_implemented', 'independent_identity_and_credentials_enforced', 'all_required_contributions_accepted', 'integration_e2e_passed'
]);

const capabilityBinding = new Map([
  ['SCOPE-900', 'SCOPE-CAP-900'],
  ['BOM-903', 'BOM-CAP-903'],
  ['ISO-904', 'ISO-CAP-904'],
  ['CORPUS-905', 'CORPUS-CAP-905'],
  ['HOLDOUT-906', 'HOLDOUT-CAP-906'],
  ['NOVEL-907', 'NOVEL-CAP-907'],
  ['CANARY-909', 'CANARY-CAP-909'],
  ['KNOWN-910', 'KNOWN-CAP-910'],
  ['LIVE-913', 'LIVE-CAP-913'],
  ['FINAL-002', 'FINAL-002-CAP'],
  ['FINAL-003', 'FINAL-003-CAP'],
  ['DB-902', 'DB-CAP-902']
]);

function addHard(node, id) {
  if (!node.dependencies.some(dep => dep.id === id && dep.type === 'hard')) node.dependencies.unshift(hard(id));
}

for (const [operationalId, capabilityId] of capabilityBinding) {
  const node = nodes.get(operationalId);
  if (!node) throw new Error(`Missing operational node ${operationalId}`);
  addHard(node, capabilityId);
}

// LIVE authorization is a governance/measurement contract. The writer remains
// disabled in LIVE-CAP and every operational consumer binds the signed nested
// artifact by content digest and root.
for (const id of ['LIVE-CAP-913', 'EVAL-908', 'TEST-V8', 'LIVE-913']) {
  const node = nodes.get(id);
  if (node && !node.dependencies.some(dep => dep.type === 'contract' && dep.contract_id === 'solguard-live-authorization.v1')) {
    node.dependencies.push(contract('MEASURE-901', 'solguard-live-authorization.v1'));
  }
}

const externalTimestampConsumers = [
  'SCOPE-900', 'BOM-903', 'ISO-904', 'DB-902',
  'CORPUS-905', 'HOLDOUT-906', 'NOVEL-907', 'VERTICAL-EVM-PROFILE-001',
  ...[...nodes.keys()].filter(id => /-C5[AB]$/.test(id)),
  'TEST-V6', 'TEST-V7', 'TEST-V8', 'NOVELRUN-912', 'LIVE-913',
  'VERTICAL-EVM-NOVEL-001', 'VERTICAL-EVM-LIVE-001',
  'FINAL-001', 'FINAL-002', 'FINAL-003', 'FINAL-004', 'FINAL-005', 'FINAL-006', 'FINAL-007'
];
for (const id of externalTimestampConsumers) {
  const node = nodes.get(id);
  if (!node) continue; // Vertical nodes are added below and receive the edge later.
  if (!node.dependencies.some(dep => dep.type === 'contract' && dep.contract_id === 'solguard-external-timestamp-receipt.v1')) {
    node.dependencies.push(contract('GOV-003', 'solguard-external-timestamp-receipt.v1'));
  }
  node.predicate.must_hold = unique([
    ...(node.predicate.must_hold || []),
    'external_timestamp_receipt_v1_base_and_union_valid',
    'external_timestamp_trust_policy_and_quorum_2_of_2',
    'timestamp_receipts_bind_exact_artifact_digest_and_role'
  ]);
}

// EVAL-908 is itself the prefreeze implementation capability. It owns schemas,
// readers, synthetic fixtures and writer-off evaluators, never real instances.
{
  const node = nodes.get('EVAL-908');
  node.evidence_mode = 'implementation';
  node.operational = false;
  node.dependencies = node.dependencies.filter(dep => !['ISO-904', 'CORPUS-905', 'HOLDOUT-906', 'NOVEL-907', 'DB-902'].includes(dep.id));
  node.evidence_descriptor = implementationEvidence('prefreeze_evaluator_capability');
  node.predicate.must_hold = unique([
    'schemas_readers_goldens_and_synthetic_evaluator_only',
    'writers_disabled_until_operational_events',
    'no_real_campaign_instance_dependency',
    'all_required_contributions_accepted',
    'integration_e2e_passed'
  ]);
}

// MEASURE-901 is a schema/evaluator capability and cannot wait for a real
// SCOPE-900 freeze. Governance scope authority is enough at implementation.
{
  const node = nodes.get('MEASURE-901');
  node.dependencies = node.dependencies.filter(dep => dep.id !== 'SCOPE-900');
  addHard(node, 'GOV-008');
}

// DB-902 is the real, one-time cutover state machine, not migration code.
{
  const node = nodes.get('DB-902');
  node.evidence_mode = 'database_cutover';
  node.operational = false;
  node.dependencies = [hard('DB-CAP-902'), hard('MEASURE-901'), hard('PLAT-802'), contract('PLAT-801', 'solguard-benchmark-database.v2', 'v2'), contract('GOV-003', 'solguard-external-timestamp-receipt.v1')];
  node.predicate = {
    type: 'database_cutover_acceptance',
    reference: '09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md',
    criteria_id: 'DB-902',
    criteria_locator: 'heading_or_table_row',
    must_hold: [
      'legacy_backup_path_digest_and_read_only_freeze',
      'create_once_new_benchmarks_sqlite',
      'migration_counts_roots_and_provenance',
      'shadow_equivalence_and_zero_legacy_writers',
      'atomic_cutover_event_and_retention_guards',
      'restore_and_forward_rollback_proved',
      'partial_failure_matrix_fails_closed',
      'external_timestamp_receipt_v1_base_and_union_valid',
      'external_timestamp_trust_policy_and_quorum_2_of_2',
      'timestamp_receipts_bind_exact_cutover_artifact_digest_and_role'
    ]
  };
}

nodes.get('GOV-001').predicate.must_hold = unique([
  ...(nodes.get('GOV-001').predicate.must_hold || []),
  'pinned_current_state_v1_v8_and_90_lab_replay_completed_before_program_baseline',
  'baseline_replay_classified_KNOWN_and_never_blind_credit',
  'first_observable_stage_loss_ledger_complete_without_missing_evidence_imputation',
  'baseline_artifacts_content_addressed_and_candidate_independent'
  , 'audit_baseline_root_pins_exact_03_audit_HEADs_and_repository_trees'
  , 'program_bootstrap_root_pins_versioned_plan_and_C0_101_through_C0_115'
  , 'baseline_to_bootstrap_delta_allowlisted_only_docs_and_changelogs'
  , 'zero_product_or_runtime_byte_delta_between_audit_baseline_and_program_bootstrap'
]);
nodes.get('MODEL-406').predicate.must_hold = unique([
  ...(nodes.get('MODEL-406').predicate.must_hold || []),
  'origin_class_enum_exact_semantic_generic_rule_pack_model_grounded_historical_retrieval_direct_tool_finding',
  'knowledge_taint_indelible_across_merge_rank_dedupe_validate_filter_and_serialization',
  'ablation_profiles_exact_semantic_core_only_generic_with_model_rule_pack_only_full_without_retrieval_known_retrieval_control',
  'known_retrieval_control_legal_only_in_KNOWN',
  'blind_campaign_historical_retrieval_physical_reachability_fails_closed',
  'novel_numerator_excludes_findings_supported_only_by_rule_pack_or_historical_retrieval'
]);

const prefreezeValidationIds = ['TEST-V0', 'TEST-V1', 'TEST-V2', 'TEST-V3', 'TEST-V4', 'TEST-NEG', 'TEST-META'];
for (const test of nodes.values()) {
  if (/^TEST-/.test(test.id)) addHard(test, 'VALIDATION-CAP-900');
}
for (const id of ['SCOPE-900', 'BOM-903', 'ISO-904']) {
  const node = nodes.get(id);
  for (const validationId of prefreezeValidationIds) addHard(node, validationId);
  node.predicate.must_hold = unique([
    ...(node.predicate.must_hold || []),
    'freeze_binds_exact_prefreeze_validation_event_id_and_root_set',
    'candidate_full_sha_tree_and_manifest_equal_prefreeze_candidate',
    'missing_swap_stale_reorder_or_candidate_mismatch_fails_closed'
  ]);
}

// Campaigns and every measurement admission are impossible before the actual
// DB cutover. The dependency is direct to make the invariant parser-visible.
for (const node of nodes.values()) {
  if (node.kind === 'primary' && (node.evidence_mode === 'campaign' || node.evidence_mode === 'measurement')) addHard(node, 'DB-902');
}

// Scope integration owners are explicit; C4 remains the deploy integrator.
for (const node of nodes.values()) {
  const match = node.id.match(/^(.*)-C([0-4])$/);
  if (!match || node.kind !== 'primary') continue;
  const gate = Number(match[2]);
  if (gate === 0) node.owner = 'solguard-deploy';
  if (gate === 1 || gate === 2) node.owner = 'solguard-map';
  if (gate === 3) node.owner = 'solguard-trace';
  if (gate === 4) node.owner = 'solguard-deploy';
}

// Language packages summarize several owner-unique contributions. The package
// is derived; a separate primary is the only integration transition.
const languagePackage = /^LANG-(SOL|VYP|RUST|GO|C|CPP|JS|TS|X)-(?!.*HARNESS)/;
for (const node of [...nodes.values()].filter(candidate => languagePackage.test(candidate.id) && !candidate.id.endsWith('-INTEGRATION'))) {
  const integrationId = `${node.id}-INTEGRATION`;
  let integration = nodes.get(integrationId);
  if (!integration) {
    const priorDeps = node.kind === 'primary' ? node.dependencies : [];
    const priorOwner = node.kind === 'primary' ? node.owner : 'solguard-deploy';
    integration = makePrimary(integrationId, priorOwner, priorDeps, [
      'all_exact_owner_unique_contributions_accepted',
      'language_package_integration_e2e_passed',
      'scope_and_toolchain_bindings_complete',
      'missing_extra_or_reused_contribution_rejected'
    ], 'language_package_integration');
    nodes.set(integrationId, integration);
  }
  node.kind = 'derived';
  node.owner = null;
  node.operational = false;
  delete node.evidence_mode;
  delete node.required_contribution_ids;
  node.dependencies = [hard(integrationId)];
  node.formula = { op: 'AND', operands: [integrationId] };
  node.predicate = {
    type: 'and_formula',
    reference: '09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md',
    criteria_id: node.id,
    criteria_locator: 'heading_or_table_row',
    operational: false,
    must_hold: ['integration_primary_accepted', 'formula_recomputed_not_written']
  };
  node.evidence_descriptor = {
    schema: 'solguard-derived-evaluation.v1',
    profile: 'non_operational_formula',
    closed: true,
    required: ['ledger_revision', 'formula_digest', 'operand_state_hash', 'generator_version'],
    forbidden: [...gitForbidden, 'operational_receipt']
  };
  node.verifier_descriptor = {
    type: 'deterministic_ledger_evaluator',
    implementation_gate: 'LEDGER-001',
    independent_receipt_required: false
  };
}

// Reset contribution bindings before regenerating the canonical set.
for (const node of nodes.values()) {
  if (node.kind === 'primary') node.required_contribution_ids = [];
}

function tableCells(line) {
  return line.split('|').slice(1, -1).map(cell => cell.trim());
}

const concreteRows = [];
for (const line of plan.split(/\r?\n/)) {
  if (!/^\|\s*`?C\d/.test(line)) continue;
  const cells = tableCells(line);
  const rowId = cells[0].replaceAll('`', '');
  const ownerRepo = cells[1].replaceAll('`', '');
  const commitCell = cells[2] || '';
  const subjectMatch = commitCell.match(/^`([^`]+)`/) || commitCell.match(/^([^<]+)<br>/);
  const parentMatch = commitCell.match(/Parent gate:\s*`([^`]+)`/);
  if (!subjectMatch || !parentMatch) continue; // C6 scope registry, not a commit.
  const subject = subjectMatch[1].trim().replace(/^`|`$/g, '');
  const taskMarkers = [...subject.matchAll(/\[([^\]]+)\]/g)].map(match => match[1]);
  if (taskMarkers.length !== 1 || taskMarkers[0] !== rowId) throw new Error(`Row ${rowId} bracket must equal contribution ID`);
  concreteRows.push({
    rowId,
    ownerRepo,
    subject,
    result: (cells[cells.length - 1] || '').replaceAll('`', ''),
    dependencyText: cells.length >= 5 ? (cells[3] || '').replaceAll('`', '') : '',
    declaredParentId: parentMatch[1],
    source: 'concrete_row',
    documentOrder: concreteRows.length
  });
}

const suffixRows = [];
const scopeRows = [];
for (const line of plan.split(/\r?\n/)) {
  const cells = tableCells(line);
  if (cells.length < 2) continue;
  const first = cells[0].replaceAll('`', '');
  if (/^-(PROFILE|FRONTEND|LOCAL-IR|TRACE|MODEL|ECONOMIC|INVARIANT|CORE|VALUE|VALIDATE|FILTER|DIFF|REPLAY|CANDIDATE|SCOPE)$/.test(first)) {
    suffixRows.push({ suffix: first.slice(1), ownerRepo: cells[1].replaceAll('`', ''), subjectTemplate: (cells[2] || '').replace(/^`|`$/g, ''), result: (cells[3] || '').replaceAll('`', '') });
  }
  if (/^C6-SCP-\d{2}$/.test(first)) scopeRows.push({ series: first, scopeId: cells[1].replaceAll('`', '') });
}
if (suffixRows.length !== 15 || scopeRows.length !== 30) throw new Error(`Expected 15 suffixes and 30 scopes, got ${suffixRows.length}/${scopeRows.length}`);

const suffixGate = {
  PROFILE: 'C0', FRONTEND: 'C1', 'LOCAL-IR': 'C2', TRACE: 'C3',
  MODEL: 'C4', ECONOMIC: 'C4', INVARIANT: 'C4', CORE: 'C4', VALUE: 'C4',
  VALIDATE: 'C4', FILTER: 'C4', DIFF: 'C4', REPLAY: 'C4', CANDIDATE: 'C4', SCOPE: 'C4'
};
for (const scope of scopeRows) {
  for (const suffix of suffixRows) {
    const declaredParentId = `${scope.scopeId}-${suffixGate[suffix.suffix]}`;
    const rowId = `${scope.series}-${suffix.suffix}`;
    const subject = suffix.subjectTemplate
      .replaceAll('<scope-id>', scope.scopeId)
      .replace(/\[[^\]]+\]/, `[${rowId}]`);
    concreteRows.push({ rowId, ownerRepo: suffix.ownerRepo, subject, result: suffix.result, dependencyText: '', declaredParentId, source: 'c6_scope_expansion', scopeId: scope.scopeId, suffix: suffix.suffix, documentOrder: concreteRows.length });
  }
}

function resolveIntegrationGate(declaredParentId) {
  const target = nodes.get(declaredParentId);
  if (!target) throw new Error(`Contribution references missing parent ${declaredParentId}`);
  if (target.kind === 'derived') {
    const integrationId = `${declaredParentId}-INTEGRATION`;
    if (!nodes.has(integrationId)) throw new Error(`Derived parent ${declaredParentId} lacks ${integrationId}`);
    return integrationId;
  }
  return declaredParentId;
}

const contributions = concreteRows.map(row => {
  const parentPrimaryId = resolveIntegrationGate(row.declaredParentId);
  const parent = nodes.get(parentPrimaryId);
  const genesisContributionIds = new Set(['C0-001', 'C0-001A', 'C0-001B', 'C0-003', 'C0-004', 'C0-012', 'C0-013', 'C0-014', 'C0-015', 'C0-016', 'C0-017']);
  const bootstrapException = genesisContributionIds.has(row.rowId) && ['GOV-001', 'GOV-003', 'GOV-004', 'LEDGER-001'].includes(parentPrimaryId);
  if (parent.kind !== 'primary' || (parent.evidence_mode !== 'implementation' && !bootstrapException)) {
    throw new Error(`Contribution ${row.rowId} targets non-implementation parent ${parentPrimaryId}/${parent.evidence_mode}`);
  }
  parent.required_contribution_ids.push(row.rowId);
  const dependencies = parent.dependencies
    .filter(dep => dep.id !== parentPrimaryId)
    .map(dep => ({ ...dep }));
  return {
    contribution_id: row.rowId,
    kind: 'contribution',
    counted: true,
    parent_primary_id: parentPrimaryId,
    parent_primary_ids: [parentPrimaryId],
    integration_gate: parentPrimaryId,
    declared_parent_id: row.declaredParentId,
    owner_repo: row.ownerRepo,
    state: 'pending',
    contribution_version: 1,
    operational: false,
    dependencies,
    hard_contribution_dependencies: [],
    source: {
      plan: planPath,
      row_id: row.rowId,
      row_kind: row.source,
      ...(row.scopeId ? { scope_id: row.scopeId, suffix: row.suffix } : {})
    },
    expected_commit: {
      commit_identity: row.rowId,
      planned_subject: row.subject,
      required_branch_prefix: `codex/${row.rowId.toLowerCase()}-`,
      required_task_footer: row.rowId,
      declared_parent_marker: row.declaredParentId,
      observable_result: row.result
    },
    predicate: {
      type: 'contribution_acceptance',
      reference: '09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md',
      criteria_id: row.rowId,
      criteria_locator: 'contribution_table_row',
      must_hold: ['exact_owner_repo', 'exact_single_commit_identity', 'files_within_disjoint_ownership', 'commands_and_negative_tests_pass', 'immutable_unique_evidence_root', 'cannot_accept_parent_or_claim']
    },
    evidence_descriptor: {
      schema: 'solguard-contribution-evidence.v1',
      profile: bootstrapException ? 'genesis_contribution_implementation' : 'contribution_implementation',
      closed: true,
      required: ['contribution_manifest', 'contribution_id', 'parent_primary_id', 'owner_repo', 'changed_files', 'commits', 'commands_with_exit_codes', 'negative_results', 'contract_results', 'immutable_evidence_root'],
      forbidden: ['primary_transition_proposal', 'claim_transition', 'campaign_context', 'measurement_context', 'release_pre_tag_context', 'post_tag_terminal_context']
    },
    verifier_descriptor: verifier('independent_contribution_verification'),
    acceptance: {
      evidence_root: null,
      verifier_root: null,
      accepted_ledger_revision: null,
      dependency_state_hash: null,
      accepted_implementation_ref: null,
      reopened_by: []
    }
  };
});

const contributionById = new Map(contributions.map(item => [item.contribution_id, item]));

function addContributionDependency(item, dependencyId, relation = 'hard') {
  if (!dependencyId || dependencyId === item.contribution_id || !contributionById.has(dependencyId)) return;
  if (item.hard_contribution_dependencies.some(dep => dep.contribution_id === dependencyId)) return;
  item.hard_contribution_dependencies.push({
    contribution_id: dependencyId,
    type: 'hard_contribution',
    ordering: relation === 'publication' ? 'publication' : 'hard',
    required_state: 'accepted',
    publication_receipt: 'required',
    publication_binding: 'exact_accepted_implementation_ref_and_evidence_root'
  });
}

function expandDependencyText(text) {
  if (!text) return [];
  const found = [];
  for (const token of text.match(/C\d(?:-[A-Z0-9]+)+(?:(?:\.\.[A-Z0-9]+)|(?:\/[A-Z0-9]+))?(?:@SHA)?/g) || []) {
    const clean = token.replace(/@SHA$/i, '');
    const range = clean.match(/^(C\d(?:-[A-Z0-9]+)*-)([A-Z]*)(\d+)([A-Z]*)\.\.([A-Z]*)(\d+)?([A-Z]*)$/);
    if (range) {
      const [, prefix, leadA, numA, tailA, leadB, numB, tailB] = range;
      if (numB) {
        const start = Number(numA), end = Number(numB);
        for (let value = start; value <= end; value++) found.push(`${prefix}${leadA}${String(value).padStart(numA.length, '0')}${tailA || tailB}`);
      }
      continue;
    }
    const alphaRange = clean.match(/^(.*?)([A-Z])\.\.([A-Z]+)$/);
    if (alphaRange && alphaRange[3].length === 1) {
      const start = alphaRange[2].charCodeAt(0), end = alphaRange[3].charCodeAt(0);
      for (let value = start; value <= end; value++) found.push(`${alphaRange[1]}${String.fromCharCode(value)}`);
      continue;
    }
    if (clean.includes('/')) {
      const [left, right] = clean.split('/');
      found.push(left);
      const prefix = left.slice(0, left.lastIndexOf('-') + 1);
      found.push(right.startsWith('C') ? right : `${prefix}${right}`);
      continue;
    }
    found.push(clean);
  }
  return unique(found.filter(id => contributionById.has(id)));
}

// Conservative exact order within every integration gate. Explicit `Depende
// de` references add cross-gate publication edges; serialization within one
// gate is intentional because a later writer must never race an earlier reader.
const previousByParent = new Map();
const previousByLanguageTrain = new Map();
for (const row of concreteRows.sort((a, b) => a.documentOrder - b.documentOrder)) {
  const item = contributionById.get(row.rowId);
  const priorParent = previousByParent.get(item.parent_primary_id);
  if (priorParent) addContributionDependency(item, priorParent, 'hard');
  previousByParent.set(item.parent_primary_id, item.contribution_id);

  const languageMatch = item.contribution_id.match(/^C6-(SOL|VYP|RST|GO|C|CPP|JS|TS|X)-/);
  if (languageMatch) {
    const group = languageMatch[1];
    const priorLanguage = previousByLanguageTrain.get(group);
    if (priorLanguage) addContributionDependency(item, priorLanguage, 'publication');
    previousByLanguageTrain.set(group, item.contribution_id);
  }
  for (const explicitId of expandDependencyText(row.dependencyText)) addContributionDependency(item, explicitId, 'publication');
}

// Exact C6 scope train. C4 providers may run after TRACE; integration replay
// waits for every provider, candidate waits for replay, disclosure waits for
// the frozen candidate.
for (const scope of scopeRows) {
  const id = suffix => `${scope.series}-${suffix}`;
  addContributionDependency(contributionById.get(id('FRONTEND')), id('PROFILE'), 'publication');
  addContributionDependency(contributionById.get(id('LOCAL-IR')), id('FRONTEND'), 'publication');
  addContributionDependency(contributionById.get(id('TRACE')), id('LOCAL-IR'), 'publication');
  addContributionDependency(contributionById.get(id('MODEL')), id('TRACE'), 'publication');
  for (const suffix of ['ECONOMIC', 'INVARIANT', 'DIFF']) addContributionDependency(contributionById.get(id(suffix)), id('MODEL'), 'publication');
  for (const dependency of ['MODEL', 'ECONOMIC', 'INVARIANT']) addContributionDependency(contributionById.get(id('CORE')), id(dependency), 'publication');
  for (const dependency of ['CORE', 'ECONOMIC']) addContributionDependency(contributionById.get(id('VALUE')), id(dependency), 'publication');
  for (const dependency of ['CORE', 'VALUE']) addContributionDependency(contributionById.get(id('VALIDATE')), id(dependency), 'publication');
  addContributionDependency(contributionById.get(id('FILTER')), id('VALIDATE'), 'publication');
  for (const dependency of ['MODEL', 'ECONOMIC', 'INVARIANT', 'CORE', 'VALUE', 'VALIDATE', 'FILTER', 'DIFF']) addContributionDependency(contributionById.get(id('REPLAY')), id(dependency), 'publication');
  addContributionDependency(contributionById.get(id('CANDIDATE')), id('REPLAY'), 'publication');
  addContributionDependency(contributionById.get(id('SCOPE')), id('CANDIDATE'), 'publication');
}

// Genesis has its own tentative-state topology. No ordinary event exists yet.
for (const [itemId, dependencyId] of [
  ['C0-001A', 'C0-001'], ['C0-001B', 'C0-001A'], ['C0-003', 'C0-001B'], ['C0-004', 'C0-003'], ['C0-012', 'C0-004'],
  ['C0-013', 'C0-012'], ['C0-014', 'C0-012'], ['C0-015', 'C0-013'],
  ['C0-015', 'C0-014'], ['C0-016', 'C0-015'], ['C0-017', 'C0-016']
]) addContributionDependency(contributionById.get(itemId), dependencyId, 'publication');

for (const [itemId, dependencyId] of [
  ['C3-016A', 'C3-015B'],
  ['C3-016B', 'C3-016'], ['C3-016B', 'C3-016A'],
  ['C3-016C', 'C3-016B'], ['C3-016C', 'C3-015C']
]) addContributionDependency(contributionById.get(itemId), dependencyId, 'publication');

for (const item of contributions) item.hard_contribution_dependencies.sort((a, b) => a.contribution_id.localeCompare(b.contribution_id));

for (const receiptId of ['C2-CON-RM-14', 'C2-CON-RM-15']) {
  const item = contributions.find(candidate => candidate.contribution_id === receiptId);
  if (!item) throw new Error(`Missing absence receipt contribution ${receiptId}`);
  item.contribution_type = 'absence_receipt_contribution';
  delete item.expected_commit;
  item.expected_receipt = {
    receipt_identity: receiptId,
    description: 'bounded read-only absence receipt',
    required_task_reference: receiptId,
    parent_gate: item.parent_primary_id
  };
  item.predicate = {
    type: 'absence_receipt_contribution_acceptance',
    reference: '09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md',
    criteria_id: receiptId,
    criteria_locator: 'contribution_table_row',
    must_hold: ['exact_owner_repo', 'bounded_inventory_complete', 'absence_predicate_true', 'repo_tree_digest_bound', 'commands_exit_zero', 'immutable_unique_receipt_root', 'assurance_verifier_accept', 'no_repository_write']
  };
  item.evidence_descriptor = {
    schema: 'solguard-absence-receipt-contribution.v1',
    profile: 'absence_receipt_contribution',
    closed: true,
    required: ['contribution_manifest', 'contribution_id', 'parent_primary_id', 'owner_repo', 'repo_tree_digest', 'bounded_inventory', 'absence_predicate', 'absence_report', 'commands_with_exit_codes', 'immutable_receipt_root', 'assurance_verifier_root'],
    forbidden: ['branch', 'commit', 'commits', 'changed_files', 'source_tree_writes', 'changelog_update', 'primary_transition_proposal', 'claim_transition']
  };
}

ledger.genesis_batch = {
  operation: 'genesis_batch',
  atomic: true,
  prior_state: 'ledger_absent',
  evaluation_state: 'single_tentative_post_state_with_intra_batch_dependencies',
  genesis_contribution_set: ['C0-001', 'C0-001A', 'C0-001B', 'C0-003', 'C0-004', 'C0-012', 'C0-013', 'C0-014', 'C0-015', 'C0-016', 'C0-017'],
  genesis_node_set: ['GOV-001', 'GOV-003', 'GOV-004', 'LEDGER-001'],
  topological_order: [
    'C0-001', 'C0-001A', 'C0-001B', 'GOV-001',
    'C0-003', 'GOV-003',
    'C0-004', 'GOV-004',
    'C0-012', 'C0-013', 'C0-014', 'C0-015', 'C0-016', 'C0-017', 'LEDGER-001'
  ],
  failure_semantics: 'persist_nothing_and_leave_ledger_absent',
  forbidden: ['accept_contribution_before_genesis', 'partial_genesis', 'ordinary_accept_primary_for_genesis_member', 'genesis_member_set_drift']
};

ledger.transition_contract = {
  closed: true,
  authoritative_event_object_pattern: 'ledger/events/<zero-padded-sequence>-<event_id>.json',
  authoritative_event_storage: 'create_once_external_evidence_store',
  jsonl_object_pattern: 'ledger/indexes/<ledger_revision>-<index_root>.jsonl',
  jsonl_role: 'regenerated_non_authoritative_view',
  snapshot_object_pattern: 'ledger/snapshots/<ledger_revision>-<ledger_root>.json',
  checklist_object_pattern: 'ledger/checklists/<ledger_revision>-<checklist_root>.md',
  commit_receipt: { required: ['event_object_ref', 'event_object_digest', 'snapshot_ref', 'snapshot_digest', 'checklist_ref', 'checklist_digest', 'ledger_revision', 'previous_ledger_root', 'ledger_root', 'signer_role', 'signer_key_id', 'signature'], self_reference_rule: 'receipt_not_in_event_or_snapshot_or_checklist_preimage_it_binds' },
  repository_write_policy: {
    scope: 'candidate_epoch_lineage',
    frozen_epoch: 'source writes and mutation of refs trees manifests evidence or receipts in that epoch lineage forbidden',
    successor_lineage: 'new implementation commits allowed only after predecessor contamination close and only for the declared successor candidate epoch',
    historical_epoch_effect: 'successor commits never reopen mutate or relabel closed predecessor evidence',
    after_RC_FULL_1_freeze: 'all in-scope product source writes forbidden until a separately governed successor epoch outside this plan'
  },
  operations: {
    genesis_batch: { mode: 'bootstrap', targets: 'exact_interleaved_topological_order_from_genesis_batch', atomic: true, dependency_evaluation: 'within_single_tentative_post_state_without_preexisting_intra_batch_acceptance' },
    accept_contribution: { mode: 'contribution_implementation_or_absence_receipt_contribution', target_kind: 'contribution', forbidden_for_genesis_members: true, requires: ['all_hard_contribution_dependencies_accepted', 'exact_publication_SHA_or_receipt_identity', 'dependency_evidence_roots_match', 'accepted_implementation_ref_materialized', 'assurance_verifier_accept'] },
    reopen_contribution: { mode: 'contribution_implementation_or_absence_receipt_contribution', target_kind: 'contribution', requires: ['previous_state_version_evidence_verifier_dependency_roots', 'typed_invalidation_reason'], propagation: { mutable_primary_or_contribution: 'set_reopened', derived: 'invalidate_materialization_receipt_and_recompute_unsatisfied_without_reopened_state' } },
    accept_primary: { mode: 'implementation', target_kind: 'primary', requires: ['exact_required_contribution_set_accepted', 'integration_e2e_root', 'assurance_verifier_accept'] },
    reopen_primary: { mode: 'implementation_or_active_epoch_only', target_kind: 'primary', forbidden: ['closed_candidate_epoch_operational_pass', 'closed_candidate_epoch_terminal_nonpass'], correction_for_closed_epoch: 'append_invalidation_and_create_successor_epoch_without_mutating_historical_event', propagation: { mutable_primary_or_contribution: 'set_reopened', active_epoch_derived: 'invalidate_materialization_receipt_and_recompute_unsatisfied_without_reopened_state', closed_epoch_boundary: 'stop_at_accepted_candidate_epoch_closure_receipt_and_preserve_historical_verdict' } },
    record_candidate_epoch_open: { mode: 'candidate_epoch', target_kind: 'primary', create_once: true, lifecycle_state: 'open', future_validation_or_freeze_event_ids: 'forbidden' },
    record_candidate_epoch_close: { mode: 'candidate_epoch_close', target_kind: 'primary', accepts_metric_outcome: 'pass_or_nonpass_but_only_evidence_complete_transition_is_accepted', preimage_rule: 'consumes_preclose_dossier_and_never_contains_own_event_or_postclose_root', post_persistence_receipt: 'create_once_solguard_candidate_epoch_closure_receipt_v1_binds_persisted_close_event_and_ledger_root' },
    record_upstream_nonpass: { mode: 'operational_terminalization_override', target_kind: 'primary', target_state: 'terminal_not_run', ordinary_dependency_readiness_bypass: 'only_for_nonpass_terminalization_never_for_acceptance', blocking_path_edge_union: ['hard', 'instance_bound_contract', 'integration_readiness'], pure_schema_contract_edge_rule: 'schema_producer_nonpass_blocks_only_when_contract_instance_is_required_for_this_target', requires: ['same_candidate_epoch_id_and_root', 'immutable_readiness_DAG_path_root', 'blocking_dependency_edge_set_root', 'blocking_ancestor_ids', 'blocking_terminal_event_ids', 'blocking_terminal_evidence_roots', 'reason_exact_upstream_nonpass', 'planned_denominator_or_frame_root', 'zero_attempt_receipt_root', 'assurance_verifier_accept'], rejects: ['target_still_runnable', 'blocking_ancestor_not_terminal_nonpass', 'path_mismatch', 'cross_epoch_target_or_ancestor', 'missing_or_reopened_ancestor', 'accepted_or_claim_satisfying_result'] },
    record_validation: { mode: 'validation', target_kind: 'primary', outcome_union: ['accepted', 'terminal_failed', 'terminal_invalid', 'insufficient_evidence'] },
    record_freeze_attestation: { mode: 'freeze_attestation', target_kind: 'primary', outcome_union: ['accepted', 'terminal_failed', 'terminal_invalid', 'insufficient_evidence'] },
    record_campaign: { mode: 'campaign', target_kind: 'primary', outcome_union: ['accepted', 'terminal_failed', 'terminal_invalid', 'insufficient_evidence'] },
    record_measurement: { mode: 'measurement', target_kind: 'primary', outcome_union: ['accepted', 'terminal_failed', 'terminal_invalid', 'insufficient_evidence'] },
    record_database_cutover: { mode: 'database_cutover', target_kind: 'primary' },
    record_final_evidence: { mode: 'final_evidence', target_kind: 'primary' },
    accept_release_pre_tag: { mode: 'release_pre_tag', target_kind: 'primary' },
    accept_post_tag_terminal: { mode: 'post_tag_terminal', target_kind: 'primary', atomic_tentative_post_state: true },
    materialize_derived: { target_kind: 'derived', writes_state: false, receipt_only: true, result_union: ['satisfied', 'unsatisfied'], unsatisfied_receipt_rule: 'records_false_formula_result_and_exact_operand_state_without_granting_readiness' }
  },
  common_event_required: ['schema_version', 'program_id', 'ledger_revision_before', 'event_id', 'sequence', 'operation', 'target_id', 'target_version', 'prior_event_hash', 'payload', 'payload_digest', 'role', 'signer_key_id', 'signature', 'trusted_timestamp'],
  common_rejections: ['unknown_operation', 'wrong_mode_dispatch', 'cross_branch_payload', 'replay', 'stale_revision', 'stale_dependency_state_hash', 'missing_signature', 'role_threshold_failure', 'mutable_or_overwritten_event_object']
};
ledger.transition_contract.dependency_readiness = {
  primary_node: 'state == accepted',
  derived_node: 'computed_state == satisfied at the same ledger revision',
  contribution: 'state == accepted and accepted_implementation_ref matches',
  terminal_observation: 'observed primary state in accepted|terminal_failed|terminal_invalid|insufficient_evidence|terminal_not_run with exact evidence root; pending|reopened|missing rejects',
  terminal_derived_observation: 'observed derived computed_state in satisfied|unsatisfied with exact same-revision operand_state_hash and immutable evaluation receipt; missing or stale receipt rejects and unsatisfied never grants claim readiness',
  historical_ordering: 'producer accepted with exact ordering receipt before consumer transition; edge is retained as audit history but is not imported into a successor candidate release pass quantifier',
  contract_dependency: 'producer readiness by producer kind plus exact schema version and artifact binding',
  dependency_state_hash_includes: ['primary_state_and_version', 'derived_formula_operand_state_hash_and_materialization_receipt_if_operational', 'contribution_state_version_accepted_implementation_ref_and_evidence_root', 'contract_artifact_ref_digest_root_and_version']
};
ledger.transition_contract.accepted_implementation_ref_union = {
  closed: true,
  commit_sha: { required: ['kind', 'commit_sha', 'repository_tree_sha', 'publication_receipt_root'], forbidden: ['absence_tree_digest', 'absence_receipt_root'] },
  absence_tree_receipt: { required: ['kind', 'absence_tree_digest', 'bounded_inventory_root', 'absence_receipt_root'], forbidden: ['commit_sha', 'repository_tree_sha'] },
  included_in: ['contribution_acceptance_state', 'dependency_state_hash', 'reopen_history']
};

ledger.operational_outcome_contract = {
  closed: true,
  pass: { state: 'accepted', requires: ['evidence_root', 'verifier_root', 'dependency_state_hash', 'terminal_outcome_root'], claim_readiness: true },
  observed_nonpass: { states: ['terminal_failed', 'terminal_invalid', 'insufficient_evidence'], requires: ['evidence_root', 'verifier_root', 'dependency_state_hash', 'terminal_outcome_root', 'terminal_reason_root', 'denominator_root'], claim_readiness: false },
  upstream_nonpass: { state: 'terminal_not_run', requires: ['upstream_nonpass_receipt_root', 'immutable_readiness_DAG_path_root', 'blocking_dependency_edge_set_root', 'blocking_ancestor_ids', 'blocking_terminal_event_ids', 'blocking_terminal_evidence_roots', 'planned_denominator_or_frame_root', 'zero_attempt_receipt_root', 'verifier_root'], claim_readiness: false },
  terminal_observation_readiness: ['accepted', 'terminal_failed', 'terminal_invalid', 'insufficient_evidence', 'terminal_not_run'],
  forbidden: ['nonpass_as_accepted', 'terminal_not_run_with_attempts', 'claim_satisfaction_from_nonpass', 'cross_epoch_blocker']
};

ledger.policy_commitment_contract = {
  policy_commitment_scheme: 'solguard-policy-set-commitment.v1',
  leaf_salt_bytes: 32,
  leaf_order: 'bytewise_ascending_UTF8_RFC8785_JCS_target_key',
  target_key: 'UTF8(RFC8785_JCS([target_ref,target_revision]))',
  leaf_domain: 'solguard/policy-leaf/v1',
  pad_domain: 'solguard/policy-pad/v1',
  node_domain: 'solguard/policy-node/v1',
  set_domain: 'solguard/policy-set/v1',
  membership_proof: 'bottom_up_exact_one_32_byte_sibling_per_level_side_from_target_index',
  required_opening_fields: ['policy_commitment_scheme', 'policy_set_commitment_root', 'leaf_salt_b64url', 'target_index', 'policy_leaf_hash', 'membership_proof', 'target_program_policy_root', 'policy_snapshot_content_digest', 'mapping_table_root', 'mapping_table_content_digest'],
  forbidden: ['legacy_scheme', 'alternate_sort', 'short_or_reused_salt', 'duplicate_target_key', 'empty_set', 'ambiguous_padding', 'truncated_proof', 'leaf_root_swap']
};

ledger.external_timestamp_contract = {
  schema: 'solguard-external-timestamp-receipt.v1',
  closed: true,
  base_required: ['schema_version', 'receipt_id', 'receipt_kind', 'subject_role', 'subject_artifact_id', 'subject_digest_algorithm', 'subject_digest', 'authority_id', 'trust_policy_id', 'trust_policy_root', 'authority_key_id', 'authority_signature_algorithm', 'issued_at', 'validity_status_snapshot_ref', 'validity_status_snapshot_content_digest', 'validity_status_snapshot_root', 'receipt_payload', 'signatures', 'self_hash'],
  base_constants: { subject_digest_algorithm: 'sha256' },
  base_forbidden: ['external_timestamp_receipts'],
  receipt_payload_union: {
    rfc3161: {
      required: ['message_imprint_algorithm', 'message_imprint', 'request_nonce', 'tsa_policy_oid', 'response_status', 'serial_number', 'gen_time', 'timestamp_token_ref', 'timestamp_token_content_digest', 'signer_certificate_fingerprint_sha256', 'certificate_chain_ref', 'certificate_chain_content_digest', 'certificate_chain_root'],
      constants: { message_imprint_algorithm: 'sha256', response_status: 'granted' },
      issued_at_rule: 'equals_authenticated_gen_time'
    },
    transparency_log: {
      required: ['log_id', 'log_protocol_id', 'log_protocol_version', 'log_specification_ref', 'log_specification_content_digest', 'entry_uuid', 'submitted_leaf_ref', 'submitted_leaf_content_digest', 'canonical_log_entry_ref', 'canonical_log_entry_content_digest', 'leaf_hash_algorithm', 'leaf_hash', 'leaf_index', 'inclusion_tree_size', 'inclusion_path', 'signed_checkpoint_ref', 'signed_checkpoint_content_digest', 'signed_checkpoint_root', 'checkpoint_tree_size', 'checkpoint_timestamp', 'checkpoint_key_id', 'checkpoint_signature', 'pinned_checkpoint_ref', 'pinned_checkpoint_content_digest', 'pinned_checkpoint_root', 'pinned_checkpoint_tree_size', 'consistency_path'],
      issued_at_rule: 'equals_authenticated_checkpoint_timestamp',
      canonicalization_rule: 'pinned_spec_digest_uniquely_defines_entry_leaf_domains_node_hashing_and_proof_order'
    }
  },
  decision_boundary_quorum: { required: '2-of-2', exact_kinds: ['rfc3161', 'transparency_log'], independent_authorities: true },
  reject: ['subject_role_artifact_or_digest_mismatch', 'nonce_replay', 'serial_reuse_for_other_subject', 'time_out_of_window', 'unknown_or_revoked_key_or_certificate', 'policy_or_log_not_allowlisted', 'stale_checkpoint', 'invalid_inclusion_or_consistency', 'split_view', 'incomplete_quorum', 'shared_authority_control', 'issued_at_not_authenticated_branch_time']
};

ledger.candidate_epoch_contract = {
  schema: 'solguard-candidate-epoch.v1',
  closed: true,
  semantics: 'immutable_candidate_epoch_definition_not_mutable_lifecycle_record',
  required: ['schema_version', 'candidate_epoch_id', 'program_id', 'program_version', 'candidate_manifest_id', 'candidate_root', 'repository_sha_tree_set_root', 'scope_id_set_root', 'scope_id_count', 'release_train_closure_id_set_root', 'release_train_closure_id_count', 'planned_input_subject_set_root', 'planned_input_subject_count', 'accepted_input_membership_root', 'accepted_input_membership_count', 'planned_operational_gate_set_root', 'planned_operational_gate_count', 'claim_required_pass_set_root', 'claim_required_pass_count', 'evaluation_observation_set_root', 'evaluation_observation_count', 'allowed_next_action_set_root', 'allowed_next_action_count', 'contamination_successor_required', 'created_at', 'signatures', 'external_timestamp_receipts', 'self_hash'],
  conditional_fields: {
    initial_vertical: { required: ['contamination_successor_required=true', 'planned_vertical_tooling_subject_set_root', 'planned_vertical_tooling_subject_count', 'vertical_tooling_set_root', 'vertical_tooling_set_count'], forbidden: ['parent_candidate_epoch_id', 'contamination_close_event_id', 'contamination_close_root', 'planned_full_tooling_subject_set_root', 'planned_full_tooling_subject_count', 'full_tooling_set_root', 'full_tooling_set_count'] },
    full_successor: { required: ['parent_candidate_epoch_id', 'contamination_close_event_id', 'contamination_close_root', 'contamination_successor_required=false', 'planned_full_tooling_subject_set_root', 'planned_full_tooling_subject_count', 'full_tooling_set_root', 'full_tooling_set_count'], forbidden: ['successor_candidate_epoch_id', 'successor_candidate_epoch_root', 'planned_vertical_tooling_subject_set_root', 'planned_vertical_tooling_subject_count', 'vertical_tooling_set_root', 'vertical_tooling_set_count'] }
  },
  optional_fields_omitted_not_null: true,
  planned_input_subject_record_required: ['member_kind', 'member_id', 'subject_version', 'dependency_binding_records', 'dependency_binding_count', 'dependency_binding_set_root'],
  dependency_binding_record_required: ['dependency_type', 'contract_id_if_applicable', 'contract_version_if_applicable'],
  accepted_input_member_record_required: ['member_kind', 'member_id', 'subject_version', 'dependency_binding_set_root', 'accepted_event_id', 'subject_content_root', 'operand_state_root'],
  planned_to_accepted_input_rule: 'bijection by unique member kind ID version and dependency binding root; accepted membership adds event content and operand roots without changing planned set identity',
  planned_operational_gate_record_required: ['node_id', 'node_version', 'predicate_digest', 'evidence_schema_digest'],
  allowed_next_action_record_required: ['operation', 'target_evidence_modes'],
  planned_tooling_subject_record_required: ['contribution_id', 'contribution_version', 'parent_primary_id', 'owner_repo', 'planned_commit_identity'],
  accepted_tooling_member_record_required: ['contribution_id', 'contribution_version', 'accepted_event_id', 'evidence_root', 'accepted_implementation_ref', 'repository_tree_sha', 'repository_sha_tree_membership_proof_root'],
  repository_sha_tree_membership_proof_rule: 'proof is verified against the already-computable repository_sha_tree_set_root, never against candidate_root or self_hash',
  tooling_set_rule: 'runtime tooling set has exact same contribution ID/version set as planned tooling subjects and every member is accepted before candidate open with repository tree proven in repository_sha_tree_set_root',
  candidate_set_root_algorithm: {
    digest: 'sha256',
    canonicalization: 'RFC8785_JCS',
    preimage: 'JCS({domain:"solguard/candidate-set/v1",set_kind,count,records})',
    order: 'bytewise_ascending_UTF8_explicit_unique_key',
    duplicate_policy: 'reject_before_hash',
    set_kinds_and_unique_keys: {
      release_train_closure_id: 'type_prefixed_id',
      claim_required_pass: 'type_prefixed_required_pass_id',
      evaluation_observation: 'observation_kind_colon_node_id_at_node_version',
      planned_operational_gate: 'node_id_at_node_version',
      planned_input_subject: 'member_kind_colon_member_id_at_subject_version',
      dependency_binding: 'dependency_type_colon_contract_id_at_contract_version_or_empty',
      allowed_next_action: 'operation',
      planned_tooling_subject: 'contribution_id_at_contribution_version'
    }
  },
  repository_sha_tree_set_contract: {
    record_required: ['repo_id', 'repository_revision_commit_sha', 'repository_tree_sha'],
    unique_key: 'repo_id',
    root_algorithm: 'candidate_set_root_algorithm_with_set_kind_repository_sha_tree',
    exact_repo_count: 15
  },
  candidate_root_algorithm: {
    digest: 'sha256',
    canonicalization: 'RFC8785_JCS',
    domain: 'solguard/candidate-epoch-root/v1',
    preimage_excludes: ['candidate_root', 'self_hash', 'signatures', 'external_timestamp_receipts'],
    preimage_includes: ['repository_sha_tree_set_root', 'planned_input_subject_set_root', 'accepted_input_membership_root', 'planned_operational_gate_set_root', 'claim_required_pass_set_root', 'evaluation_observation_set_root', 'allowed_next_action_set_root', 'planned_tooling_subject_set_root_by_epoch_kind', 'runtime_tooling_set_root_by_epoch_kind'],
    self_hash_rule: 'sha256_RFC8785_JCS_of_complete_artifact_excluding_only_self_hash_after_candidate_root_signatures_and_timestamp_receipts_are_materialized'
  },
  anti_self_reference_vectors: {
    accept: 'tooling membership proof binds repository_tree_sha to repository_sha_tree_set_root; candidate_root then commits repository_sha_tree_set_root and tooling_set_root',
    reject: ['membership_proof_target_equals_candidate_root', 'membership_proof_target_equals_self_hash', 'candidate_root_in_own_preimage', 'self_hash_in_own_preimage', 'timestamp_receipt_subject_equals_self_hash_when_receipt_is_inside_self_hash_preimage']
  },
  future_event_rule: 'future validation freeze campaign measurement acceptance event IDs and evidence roots forbidden in immutable definition',
  lifecycle_event_rule: 'open evaluating closed_pass closed_nonpass and superseded are derived from ordered ledger events at the single authoritative ledger head',
  mutation_rule: 'changing_any_set_root_or_closed_epoch_artifact_requires_new_candidate_epoch_id',
  epoch_write_policy: 'closed_epoch_refs_objects_manifests_and_evidence_are_create_once; later commits may exist only in successor_epoch_lineage',
  cross_epoch_reuse: {
    default: 'forbidden',
    permitted_candidate_independent_membership: {
      subject_kinds: ['implementation_primary', 'implementation_contribution', 'database_cutover_DB_902'],
      exact_identity: ['subject_id', 'subject_version', 'accepted_event_id', 'evidence_root', 'accepted_implementation_ref_if_applicable', 'repository_tree_sha_if_applicable'],
      conditions: ['same_bytes_and_version', 'accepted_before_each_candidate_open', 'read_only_membership_reference', 'repository_tree_proven_in_each_candidate_repository_sha_tree_set_root'],
      effect: 'membership_reference_only_never_operational_credit'
    },
    forbidden_epoch_local_modes: ['candidate_epoch', 'candidate_epoch_close', 'validation', 'freeze_attestation', 'campaign', 'measurement', 'final_evidence', 'release_pre_tag', 'post_tag_terminal'],
    forbidden_epoch_local_objects: ['target', 'finding', 'policy_opening', 'attempt', 'output', 'result', 'evaluation', 'measurement', 'campaign', 'freeze', 'validation', 'claim', 'closure_receipt']
  }
};

ledger.candidate_epoch_closure_receipt_contract = {
  schema: 'solguard-candidate-epoch-closure-receipt.v1',
  closed: true,
  common_required: ['schema_version', 'candidate_epoch_id', 'candidate_epoch_root', 'candidate_close_event_id', 'candidate_close_event_root', 'release_train_closure_id_set_root', 'release_train_closure_id_count', 'claim_required_pass_set_root', 'claim_required_pass_count', 'evaluation_observation_set_root', 'evaluation_observation_count', 'frozen_membership_root', 'frozen_membership_count', 'terminal_state_event_binding_set_root', 'terminal_state_event_binding_count', 'derived_observation_event_ids', 'derived_observation_evaluation_roots', 'derived_claim_evaluation_event_id', 'derived_claim_result', 'derived_claim_evaluation_root', 'closure_ledger_revision', 'closure_ledger_root', 'closure_outcome', 'signatures', 'external_timestamp_receipts', 'self_hash'],
  terminal_member_binding_required: ['member_kind', 'member_id', 'subject_version', 'terminal_state_or_computed_result', 'terminal_event_id', 'subject_content_root', 'evidence_or_evaluation_root', 'operand_state_root'],
  closure_outcomes: ['closed_pass', 'closed_nonpass'],
  exact_membership_rules: [
    'frozen_membership_root_and_count_equal_candidate_release_train_closure_id_set_root_and_count',
    'terminal_state_event_binding_set_has_exactly_one_binding_for_every_frozen_member_and_no_extra_or_duplicate_member',
    'binding_member_kind_ID_and_version_equal_frozen_candidate_definition',
    'every_primary_binding_uses_terminal_event_at_closure_ledger_revision_or_earlier_on_same_authoritative_history',
    'every_derived_binding_uses_same_revision_evaluation_receipt_and_exact_operand_state_hash',
    'claim_evaluation_is_an_exact_member_binding_not_an_unreceipted_boolean_recomputation'
  ],
  historical_boundary: 'after receipt acceptance later reopen or version bump never mutates reevaluates or propagates into this closed epoch; successor epochs bind fresh versions and roots',
  closed_union: {
    vertical_branch: { required: ['contamination_close_event_id', 'contamination_close_root', 'train_dev_contamination_import_root', 'train_dev_classification_root'], forbidden: ['full_terminal_close_event_id', 'full_terminal_close_root'], claim_result_union: ['true', 'false'] },
    full_terminal_branch: { required: ['full_terminal_close_event_id', 'full_terminal_close_root'], forbidden: ['contamination_close_event_id', 'contamination_close_root', 'train_dev_contamination_import_root', 'train_dev_classification_root', 'successor_candidate_epoch_id', 'successor_candidate_epoch_root'], contamination_successor_required: false, claim_result_union: ['true', 'false'] }
  },
  pass_rule: 'closed_pass iff every claim_required_pass member has strict pass state and derived_claim_result is true',
  nonpass_rule: 'closed_nonpass iff exact membership and observation coverage are complete but strict pass rule is false; it never authorizes release promotion or a positive claim',
  outcome_biconditional: 'exactly_one_of_closed_pass_or_closed_nonpass_is_derived_not_selected_by_caller',
  negative_vectors: ['omit_frozen_member', 'add_nonmember', 'duplicate_member', 'relabel_terminal_nonpass_as_accepted', 'stale_or_cross_revision_derived_receipt', 'claim_boolean_without_evaluation_receipt', 'closed_pass_when_any_required_member_nonpass_or_unsatisfied', 'closed_nonpass_when_strict_pass_rule_true']
};

ledger.candidate_epoch_close_transition_contract = {
  schema: 'solguard-candidate-epoch-close-transition.v1',
  closed: true,
  common_required: ['candidate_epoch_close_context', 'source_candidate_epoch_id', 'source_candidate_epoch_root', 'preclose_candidate_epoch_state_root', 'preclose_dossier_ref', 'preclose_dossier_content_digest', 'preclose_dossier_root', 'frozen_membership_root', 'frozen_membership_count', 'terminal_state_event_binding_set_root', 'terminal_state_event_binding_count', 'primary_observation_event_ids', 'primary_observation_evidence_roots', 'primary_observation_count', 'derived_observation_event_ids', 'derived_observation_evaluation_roots', 'derived_observation_operand_state_hashes', 'derived_observation_count', 'derived_claim_evaluation_event_id', 'derived_claim_result', 'derived_claim_evaluation_root', 'closure_outcome', 'coverage_predicate_results', 'assurance_verifier_root', 'immutable_evidence_root'],
  branch_union: {
    vertical_contamination_close: { required: ['train_dev_contamination_import_root', 'train_dev_classification_root'], forbidden: ['full_terminal_coverage_root'] },
    full_terminal_close: { required: ['full_terminal_coverage_root'], forbidden: ['train_dev_contamination_import_root', 'train_dev_classification_root'] }
  },
  outcome_derivation: 'same exact biconditional as solguard-candidate-epoch-closure-receipt.v1; caller-supplied mismatch rejects transition',
  membership_derivation: 'frozen membership and binding set are exact candidate release train closure with one same-history binding per member',
  preimage_forbidden: ['candidate_epoch_close_event_id', 'postclose_ledger_root', 'closure_receipt_root', 'self_referential_placeholder'],
  post_persistence: 'solguard-candidate-epoch-closure-receipt.v1 binds persisted close event and ledger root create-once'
};

ledger.upstream_nonpass_receipt_contract = {
  schema: 'solguard-upstream-nonpass-receipt.v1',
  closed: true,
  required: ['candidate_epoch_id', 'candidate_epoch_root', 'target_primary_id', 'target_primary_version', 'immutable_readiness_DAG_path_root', 'blocking_dependency_edge_set_root', 'blocking_ancestor_ids', 'blocking_terminal_event_ids', 'blocking_terminal_evidence_roots', 'reason', 'planned_denominator_or_frame_root', 'zero_attempt_receipt_root', 'assurance_verifier_root', 'self_hash'],
  constants: { reason: 'upstream_nonpass', target_state: 'terminal_not_run' },
  allowed_blocking_edges: ['hard', 'instance_bound_contract', 'integration_readiness'],
  forbidden: ['accepted_state', 'claim_satisfaction', 'nonzero_attempt_count', 'cross_epoch_ancestor', 'runnable_target']
};

ledger.live_authorization_contract = {
  schema: 'solguard-live-authorization.v1',
  nested_content_addressed_signed_artifact: true,
  required: ['artifact_ref', 'content_digest', 'authorization_root', 'issuer_id', 'issuer_key_id', 'signature', 'issuer_authority_chain_ref', 'issuer_authority_chain_digest', 'issuer_authority_chain_root', 'trust_policy_id', 'trust_policy_root', 'subject_id', 'target_ref', 'target_revision', 'program_set', 'target_ownership_binding_root', 'valid_from', 'valid_to', 'allowed_actions', 'allowed_probes', 'rate_limits', 'resource_limits', 'prohibited_actions', 'status', 'revocation_ref', 'revocation_digest', 'revocation_root', 'independent_authorization_attestor_id', 'independent_authorization_attestor_key_id', 'independent_authorization_attestation'],
  binding_consumers: ['campaign_manifest', 'measurement_report', 'acceptance_dossier_manifest', 'measurement_context', 'TEST-V8', 'LIVE-913', 'VERTICAL-EVM-PROFILE-001', 'VERTICAL-EVM-LIVE-001'],
  check_frequency: 'before_every_attempt_with_trusted_timestamp',
  abort_on: ['signature_mismatch', 'unknown_or_self_issued_authority_chain', 'trust_policy_mismatch', 'issuer_or_subject_mismatch', 'invalid_or_stale_target_ownership_binding', 'independent_attestor_overlap_or_invalid_attestation', 'target_revision_or_program_mismatch', 'not_yet_valid', 'expired', 'revoked', 'stale_or_invalid_status_or_revocation_proof', 'action_probe_rate_or_resource_out_of_scope']
};

ledger.terminal_transition_contract = {
  operation: 'accept_post_tag_terminal',
  target: 'FINAL-007',
  evaluation: 'tentative_post_state',
  require: ['accept_FINAL-007_tentatively', 'recompute_all_derived_in_release_train_closure', 'RC-FULL-1_release_train_closure_id_set_root_matches', 'all_primary_members_in_release_train_closure_accepted', 'all_derived_members_in_release_train_closure_satisfied', 'all_contribution_members_in_release_train_closure_accepted', 'zero_pending_across_primary_and_contribution_members_in_release_train_closure', 'zero_reopened_across_primary_and_contribution_members_in_release_train_closure', 'CLAIM-007_true'],
  on_success: 'persist_once',
  on_failure: 'persist_nothing_leave_exact_pre_state',
  dossier_forbidden: ['post_state_root', 'self_referential_terminal_root'],
  external_transparency: 'only_after_successful_persistence_and_not_a_ledger_operation'
};

for (const node of nodes.values()) {
  if (node.kind === 'primary') node.required_contribution_ids = unique(node.required_contribution_ids).sort();
}

// Closed evidence dispatch. Operational profiles can never inherit Git fields.
for (const node of nodes.values()) {
  if (node.kind !== 'primary') continue;
  if (node.evidence_mode === 'implementation') node.evidence_descriptor = implementationEvidence(node.id.endsWith('-INTEGRATION') ? 'language_package_integration' : (node.id.includes('-CAP') ? 'capability_implementation' : 'primary_integration'));
  else node.evidence_descriptor = operationalEvidence(node.evidence_mode);
}

// Each C5 A/B gate is a separate record_measurement transition. One accepted
// cohort cannot mask a pending/reopened sibling.
for (const node of nodes.values()) {
  if (!/-C5[AB]$/.test(node.id)) continue;
  node.transition_operation = 'record_measurement';
  node.predicate.must_hold = unique([
    ...(node.predicate.must_hold || []),
    'exact_single_cohort_measurement_report_A_or_B',
    'separate_record_measurement_event_for_this_gate',
    'partial_or_sibling_failure_keeps_this_or_sibling_pending',
    'policy_commitment_scheme_solguard_policy_set_commitment_v1',
    'policy_opening_salt_index_and_membership_proof_verified',
    'target_policy_openings_and_materiality_assessments_cardinality_rules',
    'conservative_negative_control_failure_rate_and_ucb_thresholds',
    'contamination_roots_bound_by_truth_mode'
  ]);
}

// BLIND-911 is derived but still requires a post-C5 materialization receipt.
{
  const node = nodes.get('BLIND-911');
  node.operational = true;
  node.materialization_operation = 'materialize_derived';
  node.predicate.must_hold = unique([
    ...(node.predicate.must_hold || []),
    'all_60_c5a_c5b_record_measurement_events_accepted',
    'test_v6_accepted_before_materialization',
    'formula_and_operand_roots_bound',
    'independent_materialization_verifier',
    'materialization_receipt_does_not_write_derived_state'
  ]);
  node.evidence_descriptor = {
    schema: 'solguard-derived-materialization-receipt.v1',
    profile: 'h_gen_pair_aggregate',
    closed: true,
    required: ['ledger_revision', 'formula_digest', 'operand_state_hash', 'generator_version', 'operand_event_ids', 'operand_evidence_roots', 'materialization_receipt', 'assurance_verifier_root'],
    forbidden: gitForbidden
  };
  node.measurement_subtype = 'h_gen_pair_aggregate';
  node.evidence_descriptor.cardinality = { operand_event_ids: 60, operand_evidence_roots: 60 };
}

function makeDerived(id, operands, mustHold, operational = false, profile = 'non_operational_formula') {
  return {
    id,
    kind: 'derived',
    counted: true,
    owner: null,
    state: 'pending',
    node_version: 1,
    operational,
    dependencies: operands.map(hard),
    formula: { op: 'AND', operands },
    predicate: {
      type: 'and_formula',
      reference: '09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md',
      criteria_id: id,
      criteria_locator: 'heading_or_table_row',
      operational,
      must_hold: mustHold
    },
    evidence_descriptor: operational ? {
      schema: 'solguard-derived-materialization-receipt.v1',
      profile,
      closed: true,
      required: ['ledger_revision', 'formula_digest', 'operand_state_hash', 'generator_version', 'computed_result', 'operand_event_ids', 'operand_evidence_roots', 'materialization_receipt', 'assurance_verifier_root'],
      forbidden: gitForbidden
    } : {
      schema: 'solguard-derived-evaluation.v1',
      profile,
      closed: true,
      required: ['ledger_revision', 'formula_digest', 'operand_state_hash', 'generator_version'],
      forbidden: [...gitForbidden, 'operational_receipt']
    },
    verifier_descriptor: {
      type: 'deterministic_ledger_evaluator',
      implementation_gate: 'LEDGER-001',
      independent_receipt_required: operational
    },
    acceptance: emptyAcceptance(),
    ...(operational ? { materialization_operation: 'materialize_derived' } : {})
  };
}

// Honest fast track. This is the only partial-scope profile admitted by this
// frozen snapshot; it is fixed before results and cannot imply eight-language
// or full-product readiness.
{
  const verticalCapabilityIds = [
    'SOL-EVM-DEFI-C4', 'MEASURE-901', 'EVAL-908',
    'VALIDATION-CAP-900', 'SCOPE-CAP-900', 'BOM-CAP-903', 'ISO-CAP-904',
    'CORPUS-CAP-905', 'CANARY-CAP-909', 'KNOWN-CAP-910',
    'HOLDOUT-CAP-906', 'NOVEL-CAP-907', 'LIVE-CAP-913'
  ];

  const makeCandidateEpoch = (id, kind, predecessorId, dependencyIds, scopeIds) => {
    const node = makePrimary(id, 'solguard-deploy/release-authority', dependencyIds.map(hard), [], 'unused');
    node.evidence_mode = 'candidate_epoch';
    node.operational = true;
    node.transition_operation = 'record_candidate_epoch_open';
    node.required_contribution_ids = [];
    node.candidate_epoch_id = id;
    node.candidate_epoch_kind = kind;
    node.predicate = {
      type: 'candidate_epoch_open',
      reference: '09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md',
      criteria_id: id,
      criteria_locator: 'heading_or_table_row',
      must_hold: [
        'candidate_epoch_schema_v1_exact_and_closed',
        'candidate_manifest_sha_tree_scope_and_closure_sets_content_addressed',
        'input_membership_contains_only_already_accepted_subject_version_event_content_and_operand_roots',
        'planned_operational_gate_set_contains_only_future_ID_version_predicate_and_schema_hashes',
        'future_acceptance_event_or_evidence_roots_forbidden_in_open_manifest',
        'planned_input_subject_set_matches_frozen_registry_constant',
        'accepted_input_membership_has_same_subject_ID_version_set_plus_runtime_event_content_operand_roots',
        'allowed_next_action_set_matches_exact_epoch_kind_registry_constant',
        'planned_tooling_subject_set_matches_frozen_epoch_registry_constant',
        'runtime_tooling_membership_exact_ID_version_set_all_accepted_before_open',
        'every_accepted_implementation_ref_repository_tree_proven_in_repository_sha_tree_set_root',
        'repository_membership_proof_never_targets_candidate_root_or_self_hash',
        'candidate_root_preimage_exclusions_and_domain_are_exact',
        'candidate_tree_and_manifest_are_per_epoch_and_create_once',
        'later_lifecycle_validation_freeze_and_close_events_append_without_mutating_manifest',
        'later_epoch_commits_cannot_mutate_reopen_or_relabel_prior_epoch',
        'cross_epoch_operational_artifact_or_evidence_root_reuse_fails_closed',
        'candidate_independent_implementation_membership_reuse_requires_exact_same_ID_version_event_evidence_commit_and_tree',
        'external_timestamp_quorum_2_of_2_before_first_epoch_target'
      ]
    };
    node.epoch_constants = {
      candidate_epoch_id: id,
      candidate_epoch_kind: kind,
      ...(predecessorId ? { parent_candidate_epoch_id: predecessorId } : {}),
      scope_ids: scopeIds,
      contamination_successor_required: id === 'RC-V-EVM-1'
    };
    node.evidence_descriptor = operationalEvidence('candidate_epoch');
    node.evidence_descriptor.forbidden = unique([
      ...node.evidence_descriptor.forbidden,
      'validation_event_ids', 'freeze_event_ids', 'campaign_context', 'measurement_context',
      'validation_outputs', 'freeze_outputs', 'campaign_outputs', 'measurement_outputs',
      'closed_at', 'contamination_close_event_id_runtime', 'contamination_close_root_runtime'
    ]);
    if (predecessorId) {
      node.evidence_descriptor.required = unique([...node.evidence_descriptor.required, 'parent_candidate_epoch_id', 'contamination_close_event_id', 'contamination_close_root', 'planned_full_tooling_subject_set_root', 'planned_full_tooling_subject_count', 'full_tooling_set_root', 'full_tooling_set_count']);
      node.evidence_descriptor.forbidden = unique([...node.evidence_descriptor.forbidden, 'planned_vertical_tooling_subject_set_root', 'planned_vertical_tooling_subject_count', 'vertical_tooling_set_root', 'vertical_tooling_set_count']);
    } else {
      node.evidence_descriptor.required = unique([...node.evidence_descriptor.required, 'planned_vertical_tooling_subject_set_root', 'planned_vertical_tooling_subject_count', 'vertical_tooling_set_root', 'vertical_tooling_set_count']);
      node.evidence_descriptor.forbidden = unique([...node.evidence_descriptor.forbidden, 'parent_candidate_epoch_id', 'contamination_close_event_id', 'contamination_close_root']);
      node.evidence_descriptor.forbidden = unique([...node.evidence_descriptor.forbidden, 'planned_full_tooling_subject_set_root', 'planned_full_tooling_subject_count', 'full_tooling_set_root', 'full_tooling_set_count']);
    }
    nodes.set(id, node);
    return node;
  };

  makeCandidateEpoch('RC-V-EVM-1', 'bounty_vertical', null, verticalCapabilityIds, ['SOL-EVM-DEFI']);

  const verticalValidationIds = ['V0', 'V1', 'V2', 'V3', 'V4', 'NEG', 'META'].map(suffix => `VERTICAL-EVM-TEST-${suffix}-001`);
  for (const id of verticalValidationIds) {
    const suiteId = id.slice('VERTICAL-EVM-TEST-'.length, -'-001'.length);
    const node = makePrimary(id, 'solguard-agents/independent-validator', [hard('VALIDATION-CAP-900'), hard('RC-V-EVM-1'), contract('RC-V-EVM-1', 'solguard-candidate-epoch.v1')], [], 'unused');
    node.evidence_mode = 'validation';
    node.operational = true;
    node.transition_operation = 'record_validation';
    node.candidate_epoch_id = 'RC-V-EVM-1';
    node.required_contribution_ids = [];
    node.terminal_outcomes = ['accepted', 'terminal_failed', 'terminal_invalid', 'insufficient_evidence', 'terminal_not_run'];
    node.predicate = {
      type: 'vertical_prefreeze_validation',
      reference: '09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md',
      criteria_id: id,
      criteria_locator: 'heading_or_table_row',
      must_hold: [`suite_id_exact_${suiteId}`, 'candidate_epoch_and_root_exact_RC_V_EVM_1', 'manifest_environment_commands_denominator_outputs_and_failures_complete', 'terminal_outcome_typed_and_never_coerced_to_accepted', 'assurance_verifier_accepts_evidence_integrity_not_metric_result']
    };
    node.evidence_descriptor = closedOperationalProfile(
      'solguard-validation-record.v1',
      `vertical_prefreeze_${suiteId.toLowerCase().replace('-', '_')}`,
      ['validation_id', 'validation_suite_id', 'validation_manifest_root', 'candidate_manifest_root', 'candidate_full_sha_tree_root', 'environment_root', 'denominator_root', 'command_execution_result_set_root', 'output_root', 'failure_predicate_results', 'terminal_outcome', 'terminal_reason_root', 'assurance_verifier_root'],
      ['campaign_context', 'measurement_context']
    );
    nodes.set(id, node);
  }

  const makeVerticalFreeze = (id, owner, dependencies, predicateType, mustHold) => {
    const node = makePrimary(id, owner, dependencies, [], 'unused');
    node.evidence_mode = 'freeze_attestation';
    node.operational = true;
    node.transition_operation = 'record_freeze_attestation';
    node.candidate_epoch_id = 'RC-V-EVM-1';
    node.required_contribution_ids = [];
    node.predicate = { type: predicateType, reference: '09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md', criteria_id: id, criteria_locator: 'heading_or_table_row', must_hold: mustHold };
    node.evidence_descriptor = freezeEvidenceFor(node);
    nodes.set(id, node);
  };
  const verticalValidationDeps = verticalValidationIds.map(hard);
  makeVerticalFreeze('VERTICAL-EVM-SCOPE-001', 'solguard-deploy/custodian', [hard('SCOPE-CAP-900'), hard('RC-V-EVM-1'), ...verticalValidationDeps, contract('RC-V-EVM-1', 'solguard-candidate-epoch.v1'), contract('SOL-EVM-DEFI-C0', 'solguard-language-scope-manifest.v1')], 'vertical_scope_freeze', ['scope_set_exact_SOL_EVM_DEFI_only', 'all_seven_vertical_validation_events_accepted_same_epoch', 'detection_only_runtime_reachability_and_forbidden_capability_absence_proved']);
  makeVerticalFreeze('VERTICAL-EVM-BOM-001', 'solguard-deploy/custodian', [hard('BOM-CAP-903'), hard('VERTICAL-EVM-SCOPE-001'), ...verticalValidationDeps, contract('RC-V-EVM-1', 'solguard-candidate-epoch.v1')], 'vertical_bom_freeze', ['three_distinct_BOM_roots_scanner_evaluator_governance', 'all_components_bind_exact_RC_V_EVM_1_tree', 'missing_extra_or_mutated_component_fails_closed']);
  makeVerticalFreeze('VERTICAL-EVM-ISO-001', 'solguard-deploy/custodian', [hard('ISO-CAP-904'), hard('VERTICAL-EVM-BOM-001'), ...verticalValidationDeps, contract('VERTICAL-EVM-SCOPE-001', 'solguard-scope-proof.v1'), contract('RC-V-EVM-1', 'solguard-candidate-epoch.v1')], 'vertical_isolation_freeze', ['clean_room_network_process_filesystem_and_key_role_closures_exact', 'all_sentinels_pass_on_RC_V_EVM_1', 'global_ISO_904_evidence_forbidden']);

  const dbCutover = nodes.get('DB-902');
  if (!dbCutover.dependencies.some(dep => dep.type === 'historical_ordering' && dep.id === 'VERTICAL-EVM-ISO-001')) dbCutover.dependencies.push(historicalOrdering('VERTICAL-EVM-ISO-001'));
  dbCutover.predicate.must_hold = unique([...(dbCutover.predicate.must_hold || []), 'vertical_epoch_freeze_ordering_receipt_accepted_before_cutover', 'historical_ordering_edge_not_imported_into_successor_release_pass_quantifier']);

  const verticalCorpus = makePrimary('VERTICAL-EVM-CORPUS-001', 'solguard-deploy/evaluator', [hard('CORPUS-CAP-905'), hard('MEASURE-901'), hard('DB-902'), hard('VERTICAL-EVM-ISO-001'), contract('RC-V-EVM-1', 'solguard-candidate-epoch.v1'), contract('MEASURE-901', 'solguard-corpus-manifest.v1')], [], 'unused');
  verticalCorpus.evidence_mode = 'campaign';
  verticalCorpus.operational = true;
  verticalCorpus.transition_operation = 'record_campaign';
  verticalCorpus.candidate_epoch_id = 'RC-V-EVM-1';
  verticalCorpus.required_contribution_ids = [];
  verticalCorpus.predicate = { type: 'vertical_corpus_snapshot', reference: '09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md', criteria_id: verticalCorpus.id, criteria_locator: 'heading_or_table_row', must_hold: ['corpus_truth_and_contamination_roots_epoch_local', 'scope_ids_exact_SOL_EVM_DEFI', 'writer_off_and_create_once_snapshot', 'no_global_CORPUS_905_reuse'] };
  verticalCorpus.evidence_descriptor = campaignEvidenceFor(verticalCorpus);
  nodes.set(verticalCorpus.id, verticalCorpus);

  const makeVerticalBaselineMeasurement = (id, owner, dependencies, predicateType, mustHold) => {
    const node = makePrimary(id, owner, dependencies, [], 'unused');
    node.evidence_mode = 'measurement';
    node.operational = true;
    node.transition_operation = 'record_measurement';
    node.candidate_epoch_id = 'RC-V-EVM-1';
    node.required_contribution_ids = [];
    node.terminal_outcomes = ['accepted', 'terminal_failed', 'terminal_invalid', 'insufficient_evidence', 'terminal_not_run'];
    node.predicate = { type: predicateType, reference: '09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md', criteria_id: id, criteria_locator: 'heading_or_table_row', must_hold: [...mustHold, 'terminal_outcome_typed_and_never_coerced_to_accepted'] };
    node.evidence_descriptor = measurementEvidenceFor(node);
    nodes.set(id, node);
    return node;
  };
  makeVerticalBaselineMeasurement('VERTICAL-EVM-CANARY-001', 'solguard-deploy/evaluator', [hard('CANARY-CAP-909'), hard('VERTICAL-EVM-ISO-001'), hard('DB-902'), contract('RC-V-EVM-1', 'solguard-candidate-epoch.v1')], 'vertical_canary_validation', ['canary_manifest_denominator_and_result_exact', 'no_global_CANARY_909_reuse']);
  makeVerticalBaselineMeasurement('VERTICAL-EVM-V5-001', 'solguard-deploy/evaluator', [hard('VALIDATION-CAP-900'), hard('EVAL-908'), hard('VERTICAL-EVM-CORPUS-001'), hard('VERTICAL-EVM-CANARY-001'), contract('RC-V-EVM-1', 'solguard-candidate-epoch.v1')], 'vertical_known_validation', ['known_validation_profile_exact_without_measurement_report', 'scope_ids_exact_SOL_EVM_DEFI', 'no_global_TEST_V5_reuse']);
  makeVerticalBaselineMeasurement('VERTICAL-EVM-KNOWN-001', 'solguard-deploy/evaluator', [hard('KNOWN-CAP-910'), hard('EVAL-908'), hard('VERTICAL-EVM-V5-001'), hard('VERTICAL-EVM-CORPUS-001'), contract('RC-V-EVM-1', 'solguard-candidate-epoch.v1')], 'vertical_known_campaign', ['known_measurement_report_and_truth_denominator_exact', 'known_credit_never_blind_credit', 'no_global_KNOWN_910_reuse']);

  const profile = makePrimary('VERTICAL-EVM-PROFILE-001', 'solguard-deploy/custodian', [
    hard('DB-902'), hard('VERTICAL-EVM-SCOPE-001'), hard('VERTICAL-EVM-BOM-001'), hard('VERTICAL-EVM-ISO-001'), hard('VERTICAL-EVM-CORPUS-001'), hard('VERTICAL-EVM-CANARY-001'), hard('VERTICAL-EVM-V5-001'), hard('VERTICAL-EVM-KNOWN-001'), hard('MEASURE-901'), hard('EVAL-908'), hard('HOLDOUT-CAP-906'), hard('NOVEL-CAP-907'), hard('LIVE-CAP-913'), hard('SOL-EVM-DEFI-C4'), hard('RC-V-EVM-1'),
    contract('RC-V-EVM-1', 'solguard-candidate-epoch.v1'),
    contract('MEASURE-901', 'solguard-campaign-manifest.v1'),
    contract('MEASURE-901', 'solguard-live-authorization.v1')
  ], [], 'unused');
  profile.evidence_mode = 'campaign';
  profile.operational = true;
  profile.transition_operation = 'record_campaign';
  profile.candidate_epoch_id = 'RC-V-EVM-1';
  profile.required_contribution_ids = [];
  profile.predicate = {
    type: 'vertical_profile_preregistration',
    reference: '09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md',
    criteria_id: 'VERTICAL-EVM-PROFILE-001',
    criteria_locator: 'heading_or_table_row',
    must_hold: [
      'profile_type_exact_bounty_vertical',
      'scope_set_exact_SOL_EVM_DEFI_only',
      'candidate_sha_tree_and_manifest_frozen',
      'hgen_pair_ids_exact_VERTICAL-EVM-HGEN-A-001_and_VERTICAL-EVM-HGEN-B-001',
      'hnovel_pair_ids_exact_VERTICAL-EVM-HNOVEL-A-001_and_VERTICAL-EVM-HNOVEL-B-001',
      'power_analysis_thresholds_limits_and_max_claim_frozen_before_results',
      'same_global_thresholds_without_relaxation',
      'vertical_epoch_canary_known_and_v5_accepted_before_preregistration',
      'live_sampling_frame_authorization_policy_endpoint_set_and_stopping_abort_roots_frozen',
      'issuer_and_trust_policy_commitment_frozen_without_future_authorization_status',
      'external_human_custodian_and_adjudicator',
      'no_post_result_profile_creation_or_scope_edit'
    ]
  };
  profile.profile_constants = {
    profile_type: 'bounty_vertical',
    scope_ids: ['SOL-EVM-DEFI'],
    hgen_pair_ids: ['VERTICAL-EVM-HGEN-A-001', 'VERTICAL-EVM-HGEN-B-001'],
    hnovel_pair_ids: ['VERTICAL-EVM-HNOVEL-A-001', 'VERTICAL-EVM-HNOVEL-B-001'],
    maximum_claim: 'bounty_detection_ready dentro del frame SOL-EVM-DEFI medido',
    forbidden_claims: ['full_eight_language', 'full_product', 'product_release', 'universal_bug_detection']
  };
  profile.evidence_descriptor = operationalEvidence('campaign');
  nodes.set(profile.id, profile);

  const makeVerticalCampaignSeal = (id, cap, pairKind) => {
    const node = makePrimary(id, 'solguard-deploy/custodian', [hard('VERTICAL-EVM-PROFILE-001'), hard(cap), hard('EVAL-908'), hard('VERTICAL-EVM-ISO-001'), hard('DB-902'), contract('MEASURE-901', 'solguard-campaign-manifest.v1')], [], 'unused');
    node.evidence_mode = 'campaign';
    node.required_contribution_ids = [];
    node.predicate = { type: 'vertical_pair_seal', reference: '09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md', criteria_id: id, criteria_locator: 'heading_or_table_row', must_hold: ['claim_profile_exact_bounty_vertical', 'scope_ids_exact_SOL_EVM_DEFI', 'vertical_profile_root_exact', `exact_${pairKind}_A_B_pair_ids_roots_and_power`, 'vertical_cohorts_targets_disjoint_from_global', 'outputs_not_yet_revealed', 'external_human_custodian_receipt'] };
    node.evidence_descriptor = campaignEvidenceFor(node);
    nodes.set(id, node);
  };
  makeVerticalCampaignSeal('VERTICAL-EVM-HGEN-SEAL-001', 'HOLDOUT-CAP-906', 'hgen');
  makeVerticalCampaignSeal('VERTICAL-EVM-HNOVEL-SEAL-001', 'NOVEL-CAP-907', 'hnovel');

  const makeVerticalReplica = (id, sealId, pairKind, role) => {
    const node = makePrimary(id, 'solguard-deploy/evaluator', [hard('VERTICAL-EVM-PROFILE-001'), hard(sealId), hard('SOL-EVM-DEFI-C4'), hard('EVAL-908'), hard('VALIDATION-CAP-900'), hard('VERTICAL-EVM-ISO-001'), hard('DB-902'), contract('MEASURE-901', 'solguard-campaign-manifest.v1'), contract('EVAL-908', 'solguard-measurement-report.v1')], [], 'unused');
    node.evidence_mode = 'measurement';
    node.required_contribution_ids = [];
    node.transition_operation = 'record_measurement';
    node.predicate = { type: 'vertical_scope_replica_measurement', reference: '09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md', criteria_id: id, criteria_locator: 'heading_or_table_row', must_hold: ['claim_profile_exact_bounty_vertical', 'scope_ids_exact_SOL_EVM_DEFI', 'vertical_profile_root_exact', `replica_role_exact_${role}`, `exact_vertical_${pairKind}_${role}_manifest_report_denominator_and_policy_roots`, 'counterpart_and_pair_set_root_exact', 'same_candidate_thresholds_power_and_fixed_denominators', 'vertical_cohorts_targets_disjoint_from_global', 'no_global_operational_or_test_event_reuse', 'assurance_verifier_accept'] };
    node.evidence_descriptor = measurementEvidenceFor(node);
    nodes.set(id, node);
  };
  makeVerticalReplica('VERTICAL-EVM-HGEN-A-001', 'VERTICAL-EVM-HGEN-SEAL-001', 'hgen', 'A');
  makeVerticalReplica('VERTICAL-EVM-HGEN-B-001', 'VERTICAL-EVM-HGEN-SEAL-001', 'hgen', 'B');
  makeVerticalReplica('VERTICAL-EVM-HNOVEL-A-001', 'VERTICAL-EVM-HNOVEL-SEAL-001', 'hnovel', 'A');
  makeVerticalReplica('VERTICAL-EVM-HNOVEL-B-001', 'VERTICAL-EVM-HNOVEL-SEAL-001', 'hnovel', 'B');

  nodes.set('VERTICAL-EVM-BLIND-001', makeDerived('VERTICAL-EVM-BLIND-001', ['VERTICAL-EVM-PROFILE-001', 'VERTICAL-EVM-HGEN-SEAL-001', 'VERTICAL-EVM-HGEN-A-001', 'VERTICAL-EVM-HGEN-B-001'], ['exact_vertical_hgen_pair_formula_and_receipt', 'same_vertical_profile_candidate_thresholds_and_power', 'no_global_C5_reuse'], true, 'h_gen_pair_aggregate'));
  nodes.get('VERTICAL-EVM-BLIND-001').measurement_subtype = 'h_gen_pair_aggregate';
  nodes.get('VERTICAL-EVM-BLIND-001').evidence_descriptor.cardinality = { operand_event_ids: 4, operand_evidence_roots: 4 };

  nodes.set('VERTICAL-EVM-NOVEL-001', makeDerived('VERTICAL-EVM-NOVEL-001', ['VERTICAL-EVM-PROFILE-001', 'VERTICAL-EVM-HNOVEL-SEAL-001', 'VERTICAL-EVM-HNOVEL-A-001', 'VERTICAL-EVM-HNOVEL-B-001'], ['exact_vertical_hnovel_pair_formula_and_receipt', 'post_reveal_contamination_and_collision_rules', 'no_global_NOVELRUN_or_TEST_V7_reuse'], true, 'h_novel_pair_aggregate'));
  nodes.get('VERTICAL-EVM-NOVEL-001').measurement_subtype = 'h_novel_pair_aggregate';
  nodes.get('VERTICAL-EVM-NOVEL-001').evidence_descriptor.cardinality = { operand_event_ids: 4, operand_evidence_roots: 4 };

  const chaos = makePrimary('VERTICAL-EVM-CHAOS-001', 'solguard-deploy/evaluator', [hard('VERTICAL-EVM-PROFILE-001'), hard('VERTICAL-EVM-BLIND-001'), hard('VERTICAL-EVM-NOVEL-001'), hard('RUN-206'), hard('PLAT-802'), hard('VALIDATION-CAP-900'), hard('DB-902')], [], 'unused');
  chaos.evidence_mode = 'measurement';
  chaos.required_contribution_ids = [];
  chaos.transition_operation = 'record_measurement';
  chaos.predicate = { type: 'vertical_chaos_validation', reference: '09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md', criteria_id: chaos.id, criteria_locator: 'heading_or_table_row', must_hold: ['claim_profile_exact_bounty_vertical', 'scope_ids_exact_SOL_EVM_DEFI', 'vertical_profile_root_exact', 'runtime_fault_matrix_complete', 'recovery_and_fail_closed_results', 'no_global_TEST_CHAOS_reuse'] };
  chaos.evidence_descriptor = measurementEvidenceFor(chaos);
  nodes.set(chaos.id, chaos);

  const live = makePrimary('VERTICAL-EVM-LIVE-001', 'solguard-deploy/operator', [
    hard('VERTICAL-EVM-PROFILE-001'), hard('VERTICAL-EVM-BLIND-001'), hard('VERTICAL-EVM-NOVEL-001'), hard('VERTICAL-EVM-CHAOS-001'), hard('LIVE-CAP-913'), hard('VALIDATION-CAP-900'), hard('EVAL-908'), hard('DB-902'),
    contract('MEASURE-901', 'solguard-live-authorization.v1'),
    contract('MEASURE-901', 'solguard-campaign-manifest.v1'),
    contract('EVAL-908', 'solguard-measurement-report.v1')
  ], [], 'unused');
  live.evidence_mode = 'measurement';
  live.required_contribution_ids = [];
  live.transition_operation = 'record_measurement';
  live.predicate = {
    type: 'vertical_live_measurement',
    reference: '09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md',
    criteria_id: 'VERTICAL-EVM-LIVE-001',
    criteria_locator: 'heading_or_table_row',
    must_hold: [
      'authorization_nested_content_addressed_and_signed',
      'claim_profile_exact_bounty_vertical_and_scope_ids_exact_SOL_EVM_DEFI',
      'vertical_profile_root_exact_and_no_global_TEST_V8_or_LIVE_reuse',
      'authorization_binds_issuer_key_signature_subject_target_revision_program_set_validity_actions_probes_rate_resources_prohibitions_and_revocation_status',
      'authorization_checked_before_every_attempt_with_trusted_timestamp',
      'mismatch_expired_revoked_stale_or_out_of_scope_aborts',
      'fixed_frame_and_all_retry_attempts_preserved',
      'program_severity_at_least_high_and_materiality_confirmed_independently',
      'target_policy_opening_and_materiality_assessment_exact',
      'maximum_claim_limited_to_measured_SOL_EVM_DEFI_frame'
    ]
  };
  live.evidence_descriptor = operationalEvidence('measurement');
  nodes.set(live.id, live);

  nodes.set('CLAIM-VERTICAL-EVM-001', makeDerived(
    'CLAIM-VERTICAL-EVM-001',
    ['VERTICAL-EVM-PROFILE-001', 'VERTICAL-EVM-BLIND-001', 'VERTICAL-EVM-NOVEL-001', 'VERTICAL-EVM-CHAOS-001', 'VERTICAL-EVM-LIVE-001'],
    ['wording_exact_bounty_detection_ready_within_measured_SOL_EVM_DEFI_frame', 'forbid_eight_language_full_product_product_release_or_universal_claim', 'claim_profile_and_all_operands_same_revision'],
    true,
    'vertical_claim_formula'
  ));

  // Epoch close is an evidence-completeness transition, never a campaign or a
  // metric pass. It can close an RC-V evaluation that passed, failed, was
  // invalid, or lacked sufficient evidence, while preserving every outcome.
  const verticalObservedPrimaryIds = [...nodes.values()]
    .filter(node => node.kind === 'primary' && node.id.startsWith('VERTICAL-EVM-') && node.id !== 'VERTICAL-EVM-CONTAMINATION-CLOSE-001')
    .map(node => node.id)
    .sort();
  const verticalObservedDerivedIds = ['VERTICAL-EVM-BLIND-001', 'VERTICAL-EVM-NOVEL-001', 'CLAIM-VERTICAL-EVM-001'];
  const contaminationClose = makePrimary('VERTICAL-EVM-CONTAMINATION-CLOSE-001', 'solguard-deploy/contamination-authority', [
    hard('RC-V-EVM-1'),
    ...verticalObservedPrimaryIds.map(terminalObservation),
    ...verticalObservedDerivedIds.map(terminalDerivedObservation),
    contract('RC-V-EVM-1', 'solguard-candidate-epoch.v1')
  ], [], 'unused');
  contaminationClose.evidence_mode = 'candidate_epoch_close';
  contaminationClose.operational = true;
  contaminationClose.transition_operation = 'record_candidate_epoch_close';
  contaminationClose.candidate_epoch_id = 'RC-V-EVM-1';
  contaminationClose.required_contribution_ids = [];
  contaminationClose.predicate = {
    type: 'candidate_epoch_contamination_close',
    reference: '09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md',
    criteria_id: contaminationClose.id,
    criteria_locator: 'heading_or_table_row',
    must_hold: [
      'source_epoch_exact_RC_V_EVM_1_and_successor_not_yet_open',
      'every_vertical_operational_primary_observed_in_a_terminal_state_with_exact_evidence_root',
      'blind_novel_and_claim_derived_results_observed_with_exact_evaluation_receipts_even_when_false',
      'every_planned_target_attempt_output_reveal_adjudication_and_result_accounted_for',
      'not_started_items_have_typed_precondition_reason_and_zero_hidden_attempts',
      'accepted_terminal_failed_terminal_invalid_insufficient_evidence_and_terminal_not_run_preserved_without_coercion',
      'all_policy_openings_and_materiality_assessments_sealed',
      'all_vertical_knowledge_classified_TRAIN_DEV_before_full_holdout_selection',
      'source_epoch_closure_authority_import_operator_contamination_verifier_and_acceptance_verifier_separated',
      'metric_nonpass_does_not_block_close_and_never_grants_vertical_claim'
    ]
  };
  contaminationClose.evidence_descriptor = {
    ...operationalEvidence('candidate_epoch_close'),
    required: unique([
      ...operationalEvidence('candidate_epoch_close').required,
      'train_dev_contamination_import_root', 'train_dev_classification_root',
      'contamination_import_operator_root', 'contamination_verifier_root'
    ]),
    cardinality: { primary_observation_event_ids: verticalObservedPrimaryIds.length, primary_observation_evidence_roots: verticalObservedPrimaryIds.length, primary_observation_count: verticalObservedPrimaryIds.length, derived_observation_event_ids: 3, derived_observation_evaluation_roots: 3, derived_observation_operand_state_hashes: 3, derived_observation_count: 3 },
    forbidden: unique([...gitForbidden, 'campaign_context', 'measurement_context', 'campaign_manifest_root', 'campaign_manifest_roots', 'live_authorization_artifact_root', 'live_authorization_artifact_roots', 'full_terminal_coverage_root'])
  };
  nodes.set(contaminationClose.id, contaminationClose);

  const fullCapabilityIds = unique([
    ...verticalCapabilityIds.filter(id => id !== 'SOL-EVM-DEFI-C4'),
    ...scopeRows.map(scope => `${scope.scopeId}-C4`),
    'FINAL-002-CAP', 'FINAL-003-CAP', 'VERTICAL-EVM-CONTAMINATION-CLOSE-001'
  ]);
  const fullEpoch = makeCandidateEpoch('RC-FULL-1', 'full_product', 'RC-V-EVM-1', fullCapabilityIds, scopeRows.map(scope => scope.scopeId).sort());
  fullEpoch.dependencies.push(contract('VERTICAL-EVM-CONTAMINATION-CLOSE-001', 'solguard-candidate-epoch-closure-receipt.v1'));
  fullEpoch.predicate.must_hold = unique([
    ...fullEpoch.predicate.must_hold,
    'parent_epoch_exact_RC_V_EVM_1',
    'vertical_contamination_close_accepted_before_full_epoch_open',
    'all_30_scope_C4_implementations_and_full_release_capabilities_bound',
    'fresh_full_validation_freeze_corpus_holdout_novel_chaos_and_live_instances_required',
    'no_vertical_target_finding_policy_output_or_measurement_credit_reused'
  ]);

  // RC-FULL has a terminal audit close that is deliberately separate from
  // FINAL-007. FINAL-007 remains atomic and pass-only; this node can persist a
  // complete closed_nonpass receipt after every remaining descendant has been
  // terminalized or every derived result has been materially evaluated.
  const fullClose = makePrimary('RC-FULL-EPOCH-CLOSE-001', 'solguard-deploy/release-authority', [
    hard('RC-FULL-1'),
    contract('RC-FULL-1', 'solguard-candidate-epoch.v1')
  ], [], 'unused');
  fullClose.evidence_mode = 'candidate_epoch_close';
  fullClose.operational = true;
  fullClose.transition_operation = 'record_candidate_epoch_close';
  fullClose.candidate_epoch_id = 'RC-FULL-1';
  fullClose.required_contribution_ids = [];
  fullClose.predicate = {
    type: 'candidate_epoch_full_terminal_close',
    reference: '09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md',
    criteria_id: fullClose.id,
    criteria_locator: 'heading_or_table_row',
    must_hold: [
      'source_epoch_exact_RC_FULL_1',
      'FINAL_007_remains_atomic_pass_only_and_is_never_forged_on_nonpass',
      'every_full_operational_primary_observed_in_accepted_or_typed_terminal_nonpass',
      'every_full_derived_member_has_same_revision_satisfied_or_unsatisfied_evaluation_receipt',
      'CLAIM_007_false_is_materialized_with_event_root_and_operand_state_hash_on_nonpass',
      'frozen_membership_and_terminal_binding_sets_equal_exact_release_train_closure',
      'closed_pass_iff_strict_release_quantifier_and_CLAIM_007_true_else_closed_nonpass',
      'closed_nonpass_never_authorizes_tag_release_or_positive_product_claim',
      'no_contamination_successor_fields_or_null_placeholders'
    ]
  };
  fullClose.evidence_descriptor = {
    ...operationalEvidence('candidate_epoch_close'),
    required: unique([...operationalEvidence('candidate_epoch_close').required, 'full_terminal_coverage_root']),
    forbidden: unique([...gitForbidden, 'campaign_context', 'measurement_context', 'train_dev_contamination_import_root', 'train_dev_classification_root', 'contamination_import_operator_root', 'contamination_verifier_root', 'successor_candidate_epoch_id', 'successor_candidate_epoch_root'])
  };
  nodes.set(fullClose.id, fullClose);
}

// Every operational artifact belongs to exactly one immutable candidate epoch.
// The DB cutover and implementation capabilities are candidate-independent.
const candidateBoundModes = new Set(['validation', 'freeze_attestation', 'campaign', 'measurement', 'candidate_epoch_close', 'final_evidence', 'release_pre_tag', 'post_tag_terminal']);
for (const node of nodes.values()) {
  if (node.kind !== 'primary' || !candidateBoundModes.has(node.evidence_mode)) continue;
  const epochId = node.id.startsWith('VERTICAL-EVM-') ? 'RC-V-EVM-1' : 'RC-FULL-1';
  node.candidate_epoch_id = epochId;
  node.closure_domain_id = epochId;
  node.acceptance.terminal_outcome_root = null;
  node.acceptance.terminal_reason_root = null;
  node.acceptance.upstream_nonpass_receipt_root = null;
  if (!node.dependencies.some(dep => dep.type === 'contract' && dep.id === epochId && dep.contract_id === 'solguard-candidate-epoch.v1')) {
    node.dependencies.push(contract(epochId, 'solguard-candidate-epoch.v1'));
  }
  if (node.id.startsWith('VERTICAL-EVM-') && node.id !== 'VERTICAL-EVM-CONTAMINATION-CLOSE-001') {
    node.terminal_outcomes = ['accepted', 'terminal_failed', 'terminal_invalid', 'insufficient_evidence', 'terminal_not_run'];
  }
}
nodes.get('RC-V-EVM-1').closure_domain_id = 'RC-V-EVM-1';
nodes.get('RC-FULL-1').closure_domain_id = 'RC-FULL-1';

// Global prefreeze validation is fresh for RC-FULL. None of these events may
// consume the historical RC-V validation roots.
for (const id of ['TEST-V0', 'TEST-V1', 'TEST-V2', 'TEST-V3', 'TEST-V4', 'TEST-NEG', 'TEST-META']) {
  const node = nodes.get(id);
  if (!node) throw new Error(`Missing global validation ${id}`);
  addHard(node, 'RC-FULL-1');
  node.predicate.must_hold = unique([...(node.predicate.must_hold || []), 'candidate_epoch_exact_RC_FULL_1', 'no_RC_V_validation_root_reuse']);
}

// Global bounty readiness cannot be unlocked by a single LIVE receipt. It
// requires the full language, blind and novel paths as well as LIVE.
{
  const node = nodes.get('CLAIM-006');
  const operands = ['CLAIM-003', 'CLAIM-004', 'CLAIM-005', 'LIVE-913', 'TEST-V8'];
  node.dependencies = operands.map(hard);
  node.formula = { op: 'AND', operands };
  node.predicate.must_hold = [
    'full_product_profile_preregistered',
    'all_30_scopes_language_certified',
    'sealed_blind_and_novel_claims_satisfied',
    'live_authorized_high_material_detection_confirmed',
    'no_live_only_shortcut'
  ];
}

for (const id of ['TEST-V8', 'LIVE-913', 'VERTICAL-EVM-LIVE-001']) {
  const node = nodes.get(id);
  node.predicate.must_hold = unique([
    ...(node.predicate.must_hold || []),
    'live_authorization_nested_artifact_exact_fields_and_content_roots',
    'per_attempt_trusted_timestamp_status_and_revocation_check',
    'authorization_mismatch_expired_revoked_stale_out_of_scope_fails_closed'
  ]);
}

for (const id of unique([
  'RC-V-EVM-1', 'RC-FULL-1', 'DB-902',
  ...[...nodes.keys()].filter(candidateId => candidateId.startsWith('VERTICAL-EVM-'))
])) {
  const node = nodes.get(id);
  if (node.kind !== 'primary') continue;
  if (!node.dependencies.some(dep => dep.type === 'contract' && dep.contract_id === 'solguard-external-timestamp-receipt.v1')) node.dependencies.push(contract('GOV-003', 'solguard-external-timestamp-receipt.v1'));
  node.predicate.must_hold = unique([...(node.predicate.must_hold || []), 'external_timestamp_receipt_v1_base_and_union_valid', 'external_timestamp_trust_policy_and_quorum_2_of_2', 'timestamp_receipts_bind_exact_artifact_digest_and_role']);
}

for (const node of nodes.values()) {
  if (node.kind !== 'primary') continue;
  if (node.evidence_mode === 'freeze_attestation') node.evidence_descriptor = freezeEvidenceFor(node);
  if (node.evidence_mode === 'campaign') node.evidence_descriptor = campaignEvidenceFor(node);
  if (node.evidence_mode === 'measurement') node.evidence_descriptor = measurementEvidenceFor(node);
  if (node.evidence_mode === 'campaign' && ['h_gen_pair_seal', 'h_novel_pair_seal'].includes(node.evidence_descriptor.profile)) {
    node.evidence_descriptor.required = unique([
      ...node.evidence_descriptor.required,
      'ablation_profile_set_root', 'ablation_profile_count', 'ablation_target_slot_count',
      'ablation_input_equivalence_root', 'ablation_runtime_allowlist_set_root',
      'ablation_cache_root_set_root', 'ablation_output_commitment_roots',
      'ablation_output_commitment_count', 'origin_policy_root',
      'historical_retrieval_absence_root'
    ]);
    node.evidence_descriptor.cardinality = {
      ...(node.evidence_descriptor.cardinality || {}),
      ablation_profile_count: 4,
      ablation_output_commitment_roots: '4_x_ablation_target_slot_count',
      ablation_output_commitment_count: 'equals_4_x_ablation_target_slot_count'
    };
    node.evidence_descriptor.forbidden = unique([
      ...(node.evidence_descriptor.forbidden || []),
      'known_retrieval_control', 'historical_retrieval_mount',
      'cross_profile_cache_reuse', 'cross_profile_output_reuse',
      'cross_profile_evidence_reuse'
    ]);
    node.predicate.must_hold = unique([
      ...(node.predicate.must_hold || []),
      'blind_ablation_profile_set_exact_four_without_known_retrieval_control',
      'same_target_inputs_seed_budget_stopping_and_evaluator_across_profiles',
      'profile_runtime_allowlists_cache_and_output_roots_disjoint',
      'historical_retrieval_physically_unreachable'
    ]);
  }
  if (node.evidence_mode === 'measurement') {
    node.measurement_subtype = node.evidence_descriptor.profile;
    if (node.measurement_subtype === 'h_gen_scope_replica') node.evidence_descriptor.cardinality = { campaign_manifest_roots: 1, campaign_manifest_count: 1, measurement_report_roots: 1, measurement_report_count: 1, counterpart_campaign_id: 1, campaign_pair_set_root: 1 };
    if (node.measurement_subtype === 'h_gen_pair_aggregate') node.evidence_descriptor.cardinality = node.id === 'VERTICAL-EVM-BLIND-001'
      ? { campaign_manifest_roots: 2, campaign_manifest_count: 2, campaign_pair_set_root: 1, operand_measurement_event_ids: 2, measurement_report_roots: 2, measurement_report_count: 2 }
      : { campaign_manifest_roots: 2, campaign_manifest_count: 2, campaign_pair_set_root: 1, operand_measurement_event_ids: 60, measurement_report_roots: 60, measurement_report_count: 60 };
    if (node.measurement_subtype === 'h_novel_pair_aggregate') node.evidence_descriptor.cardinality = { campaign_manifest_roots: 2, campaign_manifest_count: 2, measurement_report_roots: 2, measurement_report_count: 2, campaign_pair_set_root: 1, novelty_inventory_root: 1, novelty_taxonomy_root: 1, novelty_classification_set_root: 1, target_policy_openings_root: 1, finding_materiality_assessments_root: 1 };
    if (node.measurement_subtype === 'h_novel_scope_replica') node.evidence_descriptor.cardinality = { campaign_manifest_roots: 1, campaign_manifest_count: 1, measurement_report_roots: 1, measurement_report_count: 1, counterpart_campaign_id: 1, campaign_pair_set_root: 1, novelty_inventory_root: 1, novelty_taxonomy_root: 1, novelty_classification_set_root: 1, target_policy_openings_root: 1, finding_materiality_assessments_root: 1 };
    if (node.measurement_subtype === 'live_auth_campaign') node.evidence_descriptor.cardinality = { campaign_manifest_roots: 1, campaign_manifest_count: 1, measurement_report_roots: 1, measurement_report_count: 1, live_authorization_artifact_roots: 1, live_authorization_artifact_count: 1 };
    if (node.measurement_subtype === 'canary_validation') node.evidence_descriptor.cardinality = { canary_run_manifest_root: 1 };
    if (node.measurement_subtype === 'known_campaign') node.evidence_descriptor.cardinality = { known_run_manifest_root: 1, measurement_report_root: 1 };
    if (node.measurement_subtype === 'known_validation') node.evidence_descriptor.cardinality = { known_run_manifest_root: 1 };
    if (node.measurement_subtype === 'chaos_validation') node.evidence_descriptor.cardinality = { declared_campaign_reference_roots: 'exact_declared_set_may_be_empty', declared_campaign_reference_count: 'equals_array_length', run_manifest_roots: 'exact_preregistered_count', run_manifest_count: 'equals_array_length' };
    if (['h_gen_scope_replica', 'h_gen_pair_aggregate', 'h_novel_scope_replica', 'h_novel_pair_aggregate'].includes(node.measurement_subtype)) {
      node.evidence_descriptor.required = unique([
        ...node.evidence_descriptor.required,
        'ablation_profile_set_root', 'ablation_profile_count',
        'ablation_profile_report_roots', 'ablation_profile_report_count',
        'ablation_attempt_set_roots', 'ablation_result_set_roots',
        'ablation_input_equivalence_root', 'profile_runtime_allowlist_set_root',
        'profile_cache_root_set_root', 'profile_output_root_set_root',
        'paired_ablation_delta_root', 'origin_breakdown_root',
        'knowledge_taint_breakdown_root', 'historical_retrieval_absence_root'
      ]);
      node.evidence_descriptor.cardinality = {
        ...(node.evidence_descriptor.cardinality || {}),
        ablation_profile_count: 4,
        ablation_profile_report_roots: 4,
        ablation_profile_report_count: 4,
        ablation_attempt_set_roots: 4,
        ablation_result_set_roots: 4
      };
      node.evidence_descriptor.forbidden = unique([
        ...(node.evidence_descriptor.forbidden || []),
        'known_retrieval_control', 'historical_retrieval_mount',
        'cross_profile_cache_reuse', 'cross_profile_output_reuse',
        'cross_profile_evidence_reuse'
      ]);
      node.predicate.must_hold = unique([
        ...(node.predicate.must_hold || []),
        'all_four_blind_ablation_profile_reports_present_or_insufficient_evidence',
        'same_target_inputs_seed_budget_stopping_and_evaluator_across_profiles',
        'paired_deltas_and_origin_knowledge_taint_breakdowns_published'
      ]);
      if (node.measurement_subtype.startsWith('h_novel')) {
        node.evidence_descriptor.required = unique([...node.evidence_descriptor.required, 'novel_eligible_origin_numerator_root', 'rule_pack_retrieval_exclusion_root']);
        node.predicate.must_hold = unique([...(node.predicate.must_hold || []), 'novel_numerator_excludes_rule_pack_or_historical_retrieval_only_support']);
      }
    }
    if (node.measurement_subtype === 'known_campaign') {
      node.evidence_descriptor.required = unique([...node.evidence_descriptor.required, 'known_retrieval_control_output_root', 'known_ablation_profile_set_root', 'known_ablation_profile_count']);
      node.evidence_descriptor.cardinality = { ...(node.evidence_descriptor.cardinality || {}), known_ablation_profile_count: 5 };
      node.predicate.must_hold = unique([...(node.predicate.must_hold || []), 'known_retrieval_control_confined_to_KNOWN_and_never_blind_credit']);
    }
  }
  if (node.dependencies.some(dep => dep.type === 'contract' && dep.contract_id === 'solguard-external-timestamp-receipt.v1')) {
    node.evidence_descriptor.required = unique([...(node.evidence_descriptor.required || []), 'external_timestamp_receipt_set_root']);
  }
  if (node.id === 'GOV-001') {
    node.evidence_descriptor.required = unique([...(node.evidence_descriptor.required || []), 'audit_baseline_root', 'program_bootstrap_root', 'baseline_to_bootstrap_delta_manifest_root', 'baseline_to_bootstrap_allowed_path_set_root', 'zero_product_runtime_delta_receipt_root']);
  }
  if (node.id === 'DB-902') {
    node.evidence_descriptor.required = unique([...(node.evidence_descriptor.required || []), 'vertical_epoch_freeze_ordering_receipt_root']);
  }
  if (node.candidate_epoch_id && node.evidence_mode !== 'candidate_epoch') {
    node.evidence_descriptor.required = unique([...(node.evidence_descriptor.required || []), 'candidate_epoch_id', 'candidate_epoch_root']);
    node.predicate.must_hold = unique([...(node.predicate.must_hold || []), 'candidate_epoch_id_and_root_match_exact_contract_artifact', 'cross_epoch_operational_artifact_or_evidence_root_reuse_rejected', 'candidate_independent_implementation_membership_reuse_is_read_only_and_identity_exact']);
  }
}

// FINAL-007 is one tentative-state transaction. Failure persists nothing.
{
  const node = nodes.get('FINAL-007');
  node.predicate.must_hold = unique([
    ...(node.predicate.must_hold || []).filter(item => !/398|86|484|all_dynamic|dynamic_(primary|derived|contribution)_total|zero_pending_and_zero_reopened_across_(nodes_and_contributions|primary_and_contributions)/.test(item)),
    'accept_final_007_and_recompute_all_derived_in_one_tentative_post_state',
    'RC_FULL_1_release_train_closure_id_set_root_exact',
    'every_primary_member_of_release_train_closure_accepted',
    'every_derived_member_of_release_train_closure_satisfied',
    'every_contribution_member_of_release_train_closure_accepted',
    'zero_pending_and_zero_reopened_across_primary_and_contribution_release_train_members',
    'vertical_nonpass_history_preserved_but_not_in_full_pass_quantifier',
    'claim_007_true_in_same_tentative_post_state',
    'failure_leaves_exact_pre_state_unchanged',
    'dossier_has_no_post_state_root',
    'external_transparency_receipt_only_after_persisted_terminal_state'
  ]);
}

// Candidate-independent implementation aggregates remain in `common`. A
// derived formula becomes candidate-bound only when at least one operand is
// candidate-bound; vertical formulas are pinned explicitly to RC-V.
for (const node of nodes.values()) {
  if (node.kind !== 'derived') continue;
  delete node.closure_domain_id;
  delete node.candidate_epoch_id;
}
let unclassifiedDerived = new Set([...nodes.values()].filter(node => node.kind === 'derived').map(node => node.id));
while (unclassifiedDerived.size) {
  let progress = false;
  for (const id of [...unclassifiedDerived]) {
    const node = nodes.get(id);
    if (id.startsWith('VERTICAL-EVM-') || id === 'CLAIM-VERTICAL-EVM-001') {
      node.closure_domain_id = 'RC-V-EVM-1';
      node.candidate_epoch_id = 'RC-V-EVM-1';
      unclassifiedDerived.delete(id); progress = true; continue;
    }
    const operandDomains = node.formula.operands.map(operand => nodes.get(operand)?.closure_domain_id).filter(Boolean);
    if (operandDomains.length !== node.formula.operands.length) continue;
    if (operandDomains.every(domain => domain === 'common')) {
      node.closure_domain_id = 'common';
    } else {
      node.closure_domain_id = 'RC-FULL-1';
      node.candidate_epoch_id = 'RC-FULL-1';
    }
    unclassifiedDerived.delete(id); progress = true;
  }
  if (!progress) throw new Error(`Cannot classify derived domains: ${[...unclassifiedDerived].join(', ')}`);
}

for (const node of nodes.values()) {
  if (node.kind !== 'derived') continue;
  const priorSatisfied = node.computed_state === 'satisfied' || node.state === 'accepted';
  delete node.state;
  node.computed_state = priorSatisfied ? 'satisfied' : 'unsatisfied';
  if (node.operational) node.materialization_operation = 'materialize_derived';
  else delete node.materialization_operation;
  if (/-CERT$/.test(node.id)) {
    node.evidence_descriptor = {
      schema: 'solguard-scope-certification-materialization-receipt.v1',
      profile: 'scope_certification',
      closed: true,
      required: ['ledger_revision', 'scope_id', 'formula_digest', 'operand_state_hash', 'generator_version', 'operand_event_ids', 'operand_evidence_roots', 'candidate_manifest_root', 'scanner_runtime_bom_root', 'evaluator_bom_root', 'governance_bom_root', 'published_limits_root', 'certification_artifact_ref', 'certification_content_digest', 'certification_root', 'assurance_verifier_root', 'external_timestamp_receipt_set_root'],
      cardinality: { operand_event_ids: 8, operand_evidence_roots: 8, scanner_runtime_bom_root: 1, evaluator_bom_root: 1, governance_bom_root: 1, certification_root: 1 },
      forbidden: [...gitForbidden, 'campaign_context', 'measurement_context', 'primary_state_write', 'derived_state_write', 'tag_realization_receipt']
    };
  }
  if (node.id === 'RELEASE-914') {
    node.evidence_descriptor = {
      schema: 'solguard-release-decision-materialization-receipt.v1',
      profile: 'release_decision',
      closed: true,
      required: ['ledger_revision', 'release_decision_event_id', 'release_decision_event_hash', 'pre_promotion_ledger_root', 'formula_digest', 'operand_state_hash', 'generator_version', 'operand_event_ids', 'operand_evidence_roots', 'release_authority_id', 'release_authority_key_id', 'release_authority_signature', 'assurance_verifier_root', 'external_timestamp_receipt_set_root'],
      cardinality: { operand_event_ids: node.formula.operands.length, operand_evidence_roots: node.formula.operands.length },
      forbidden: [...gitForbidden, 'post_promotion_ledger_root', 'post_state_root', 'tag_realization_receipt', 'dsse_envelope_root', 'release_pre_tag_context', 'post_tag_terminal_context', 'primary_state_write', 'derived_state_write']
    };
  }
  if (node.id === 'CLAIM-VERTICAL-EVM-001') {
    node.evidence_descriptor.profile = 'vertical_claim_materialization';
    node.evidence_descriptor.required = unique([...node.evidence_descriptor.required, 'claim_wording_digest', 'claim_scope_frame_root', 'claim_result', 'release_train_closure_id_set_root', 'evaluation_event_id', 'evaluation_receipt_root', 'claim_authority_id', 'claim_authority_key_id', 'claim_authority_signature', 'external_timestamp_receipt_set_root']);
    node.evidence_descriptor.cardinality = { operand_event_ids: 5, operand_evidence_roots: 5 };
  }
  if (node.id === 'BLIND-911' || node.id === 'VERTICAL-EVM-BLIND-001' || node.id === 'VERTICAL-EVM-NOVEL-001') {
    node.evidence_descriptor.required = unique([...node.evidence_descriptor.required, 'ablation_profile_set_root', 'ablation_profile_count', 'ablation_aggregate_report_roots', 'paired_ablation_delta_root', 'origin_breakdown_root', 'knowledge_taint_breakdown_root', 'historical_retrieval_absence_root']);
    node.evidence_descriptor.cardinality = { ...(node.evidence_descriptor.cardinality || {}), ablation_profile_count: 4, ablation_aggregate_report_roots: 4 };
    node.predicate.must_hold = unique([...(node.predicate.must_hold || []), 'all_four_blind_ablation_profiles_materialized_same_epoch', 'origin_and_knowledge_taint_breakdowns_preserved', 'historical_retrieval_absent']);
    if (node.id === 'VERTICAL-EVM-NOVEL-001') {
      node.evidence_descriptor.required = unique([...node.evidence_descriptor.required, 'novel_eligible_origin_numerator_root', 'rule_pack_retrieval_exclusion_root']);
      node.predicate.must_hold = unique([...(node.predicate.must_hold || []), 'novel_numerator_excludes_rule_pack_or_historical_retrieval_only_support']);
    }
  }
  node.evidence_descriptor.required = (node.evidence_descriptor.required || []).filter(field => !['candidate_epoch_id', 'candidate_epoch_root'].includes(field));
  node.predicate.must_hold = (node.predicate.must_hold || []).filter(item => !['formula_operands_and_materialization_bound_to_exact_candidate_epoch', 'cross_epoch_operand_or_receipt_reuse_rejected'].includes(item));
  if (node.candidate_epoch_id) {
    node.evidence_descriptor.required = unique([...node.evidence_descriptor.required, 'candidate_epoch_id', 'candidate_epoch_root']);
    node.predicate.must_hold = unique([...node.predicate.must_hold, 'formula_operands_and_materialization_bound_to_exact_candidate_epoch', 'cross_epoch_operand_or_receipt_reuse_rejected']);
  }
  node.evidence_descriptor.closed = true;
  node.evidence_descriptor.profile ||= node.operational ? 'operational_formula_materialization' : 'non_operational_formula';
  node.evidence_descriptor.forbidden = unique([
    ...(node.evidence_descriptor.forbidden || []),
    ...gitForbidden,
    'campaign_context',
    'measurement_context',
    'release_pre_tag_context',
    'post_tag_terminal_context',
    'primary_state_write',
    'derived_state_write'
  ]);
}

{
  const node = nodes.get('LEDGER-001');
  node.predicate.must_hold = unique([
    ...(node.predicate.must_hold || []).filter(item => !/all_398_primary|evaluate_claim_and_authorize_release/.test(item)),
    'all_nodes_in_frozen_id_set_have_exact_closed_evidence_mode_dispatch',
    'materialize_derived_emits_receipt_without_mutable_derived_state',
    'terminal_observation_edges_legal_only_for_candidate_epoch_close',
    'candidate_epoch_and_release_train_closure_membership_frozen_before_results'
  ]);
}

for (const node of nodes.values()) {
  node.closure_domain_id ||= 'common';
}
for (const item of contributions) item.closure_domain_id = 'common';

// Deterministic ordering and frozen identity sets.
ledger.nodes = [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id));
ledger.contributions = contributions.sort((a, b) => a.contribution_id.localeCompare(b.contribution_id));
const nodeIds = ledger.nodes.map(node => node.id).sort();
const contributionIds = ledger.contributions.map(item => item.contribution_id).sort();
const closureIds = [
  ...nodeIds.map(id => `node:${id}`),
  ...contributionIds.map(id => `contribution:${id}`)
].sort();
ledger.node_id_set_sha256 = sha256(canonical(nodeIds));
ledger.contribution_id_set_sha256 = sha256(canonical(contributionIds));
ledger.id_set_sha256 = sha256(canonical(closureIds));
ledger.closure_id_set_sha256 = ledger.id_set_sha256;
ledger.id_set_hash_algorithm = 'sha256(utf8(canonical-json(sorted(type-prefixed-id-array))))';

const finalNodeById = new Map(ledger.nodes.map(node => [node.id, node]));
const finalContributionById = new Map(ledger.contributions.map(item => [item.contribution_id, item]));
function releaseTrainClosure(rootId) {
  const nodeSet = new Set();
  const contributionSet = new Set();
  const nodeStack = [rootId];
  const contributionStack = [];
  while (nodeStack.length || contributionStack.length) {
    while (nodeStack.length) {
      const id = nodeStack.pop();
      if (nodeSet.has(id)) continue;
      const node = finalNodeById.get(id);
      if (!node) throw new Error(`Closure references missing node ${id}`);
      nodeSet.add(id);
      for (const dep of node.dependencies || []) {
        // terminal_observation is fully sealed by the accepted epoch-close
        // receipt and intentionally does not import the historical vertical
        // pass/fail gates into the successor release pass quantifier.
        if (dep.type === 'terminal_observation' || dep.type === 'terminal_derived_observation' || dep.type === 'historical_ordering') continue;
        nodeStack.push(dep.id);
      }
      for (const contributionId of node.required_contribution_ids || []) contributionStack.push(contributionId);
    }
    while (contributionStack.length) {
      const id = contributionStack.pop();
      if (contributionSet.has(id)) continue;
      const item = finalContributionById.get(id);
      if (!item) throw new Error(`Closure references missing contribution ${id}`);
      contributionSet.add(id);
      for (const dep of item.dependencies || []) {
        if (dep.type !== 'terminal_observation') nodeStack.push(dep.id);
      }
      for (const dep of item.hard_contribution_dependencies || []) contributionStack.push(dep.contribution_id);
    }
  }
  const ids = [
    ...[...nodeSet].map(id => `node:${id}`),
    ...[...contributionSet].map(id => `contribution:${id}`)
  ].sort();
  return { ids, count: ids.length, root: sha256(canonical(ids)), node_count: nodeSet.size, contribution_count: contributionSet.size };
}

const verticalReleaseTrain = releaseTrainClosure('CLAIM-VERTICAL-EVM-001');
const fullReleaseTrain = releaseTrainClosure('FINAL-007');
const verticalCandidateInputClosure = releaseTrainClosure('RC-V-EVM-1');
const fullCandidateInputClosure = releaseTrainClosure('RC-FULL-1');
const requiredPassView = train => train.ids.map(id => `required_pass:${id}`).sort();
const verticalObservationDependencies = nodes.get('VERTICAL-EVM-CONTAMINATION-CLOSE-001').dependencies
  .filter(dep => dep.type === 'terminal_observation' || dep.type === 'terminal_derived_observation')
  .sort((a, b) => a.id.localeCompare(b.id));
const verticalObservationRecords = verticalObservationDependencies.map(dep => {
  const node = finalNodeById.get(dep.id);
  return dep.type === 'terminal_observation'
    ? { observation_kind: 'primary', node_id: dep.id, node_version: node.node_version, required_states: dep.required_states }
    : { observation_kind: 'derived', node_id: dep.id, node_version: node.node_version, required_computed_states: dep.required_computed_states, evaluation_receipt_root: 'required', operand_state_hash: 'required' };
});
const fullObservationRecords = ledger.nodes
  .filter(node => node.closure_domain_id === 'RC-FULL-1' && (node.operational || node.evidence_mode !== 'implementation'))
  .map(node => ({ observation_kind: node.kind, node_id: node.id, node_version: node.node_version, required_result: node.kind === 'primary' ? 'accepted' : 'satisfied' }))
  .sort((a, b) => a.node_id.localeCompare(b.node_id));
function plannedGateRecords(epochId) {
  return ledger.nodes
    .filter(node => node.closure_domain_id === epochId && node.id !== epochId)
    .map(node => ({
      node_id: node.id,
      node_version: node.node_version,
      predicate_digest: sha256(canonical(node.predicate)),
      evidence_schema_digest: sha256(canonical(node.evidence_descriptor))
    }))
    .sort((a, b) => a.node_id.localeCompare(b.node_id));
}
function inputSubjectRecords(epochId) {
  const epochNode = finalNodeById.get(epochId);
  const byMember = new Map();
  for (const dep of epochNode.dependencies
    .filter(dep => dep.type === 'hard' || dep.type === 'contract')
  ) {
    const subject = finalNodeById.get(dep.id);
    const key = `${dep.id}@${subject.node_version}`;
    if (!byMember.has(key)) byMember.set(key, { member_kind: 'node', member_id: dep.id, subject_version: subject.node_version, dependency_binding_records: [] });
    byMember.get(key).dependency_binding_records.push({ dependency_type: dep.type, ...(dep.contract_id ? { contract_id: dep.contract_id, contract_version: dep.contract_version } : {}) });
  }
  return [...byMember.values()].map(record => {
    record.dependency_binding_records.sort((a, b) => canonical(a).localeCompare(canonical(b)));
    record.dependency_binding_count = record.dependency_binding_records.length;
    record.dependency_binding_set_root = sha256(canonical(record.dependency_binding_records));
    return record;
  }).sort((a, b) => a.member_id.localeCompare(b.member_id));
}
function plannedToolingRecords(releaseTrain) {
  return releaseTrain.ids
    .filter(id => id.startsWith('contribution:'))
    .map(prefixedId => finalContributionById.get(prefixedId.slice('contribution:'.length)))
    .filter(item => Boolean(item.expected_commit))
    .map(item => ({
      contribution_id: item.contribution_id,
      contribution_version: item.contribution_version,
      parent_primary_id: item.parent_primary_id,
      owner_repo: item.owner_repo,
      planned_commit_identity: item.expected_commit?.commit_identity || item.expected_receipt?.receipt_identity
    }))
    .sort((a, b) => a.contribution_id.localeCompare(b.contribution_id));
}
function allowedNextActionRecords(epochId) {
  const common = [
    { operation: 'record_validation', target_evidence_modes: ['validation'] },
    { operation: 'record_freeze_attestation', target_evidence_modes: ['freeze_attestation'] },
    { operation: 'record_campaign', target_evidence_modes: ['campaign'] },
    { operation: 'record_measurement', target_evidence_modes: ['measurement'] },
    { operation: 'record_upstream_nonpass', target_evidence_modes: ['validation', 'freeze_attestation', 'campaign', 'measurement'] },
    { operation: 'materialize_derived', target_evidence_modes: ['derived_formula'] }
  ];
  const specific = epochId === 'RC-V-EVM-1'
    ? [
      { operation: 'record_database_cutover', target_evidence_modes: ['database_cutover'] },
      { operation: 'record_candidate_epoch_close', target_evidence_modes: ['candidate_epoch_close'] }
    ]
    : [
      { operation: 'record_final_evidence', target_evidence_modes: ['final_evidence'] },
      { operation: 'accept_release_pre_tag', target_evidence_modes: ['release_pre_tag'] },
      { operation: 'accept_post_tag_terminal', target_evidence_modes: ['post_tag_terminal'] }
    ];
  return [...common, ...specific].sort((a, b) => a.operation.localeCompare(b.operation));
}
const domainMembership = domainId => [
  ...ledger.nodes.filter(node => node.closure_domain_id === domainId).map(node => `node:${node.id}`),
  ...ledger.contributions.filter(item => item.closure_domain_id === domainId).map(item => `contribution:${item.contribution_id}`)
].sort();
ledger.closure_domain_contract = {
  membership_frozen_at_genesis: true,
  post_result_membership_edit: 'forbidden',
  domains: ['common', 'RC-V-EVM-1', 'RC-FULL-1'].map(domain_id => {
    const membership_ids = domainMembership(domain_id);
    return { domain_id, membership_ids, membership_count: membership_ids.length, membership_root: sha256(canonical(membership_ids)) };
  }),
  terminal_quantifier: 'exact_RC-FULL-1_release_train_closure_only',
  vertical_claim_quantifier: 'exact_RC-V-EVM-1_release_train_closure_only',
  claim_required_pass_semantics: 'every required_pass prefixed node/contribution member must be accepted or satisfied by kind',
  evaluation_observation_semantics: 'every observe prefixed operational member must have accepted or typed terminal nonpass evidence; observation never means pass',
  dependency_closed_rule: 'every hard contract and contribution producer is in the same release-train set or an immutable accepted common input; terminal observation and historical ordering edges are sealed boundary receipts',
  terminal_observation_boundary: 'epoch_close_receipt_is_in_successor_closure_but_observed_vertical_nodes_are_not_imported_into_successor_pass_quantifier'
};
ledger.candidate_epoch_registry = [
  (() => {
    const claim_required_pass_records = requiredPassView(verticalReleaseTrain);
    const evaluation_observation_records = verticalObservationRecords;
    const planned_operational_gate_records = plannedGateRecords('RC-V-EVM-1');
    const planned_input_subject_records = inputSubjectRecords('RC-V-EVM-1');
    const allowed_next_action_records = allowedNextActionRecords('RC-V-EVM-1');
    const planned_vertical_tooling_subject_records = plannedToolingRecords(verticalReleaseTrain);
    return {
    candidate_epoch_id: 'RC-V-EVM-1',
    candidate_epoch_kind: 'bounty_vertical',
    scope_ids: ['SOL-EVM-DEFI'],
    release_train_closure_ids: verticalReleaseTrain.ids,
    release_train_closure_id_count: verticalReleaseTrain.count,
    release_train_closure_id_set_root: verticalReleaseTrain.root,
    claim_required_pass_records,
    claim_required_pass_count: claim_required_pass_records.length,
    claim_required_pass_set_root: sha256(canonical(claim_required_pass_records)),
    evaluation_observation_records,
    evaluation_observation_count: evaluation_observation_records.length,
    evaluation_observation_set_root: sha256(canonical(evaluation_observation_records)),
    planned_operational_gate_records,
    planned_operational_gate_count: planned_operational_gate_records.length,
    planned_operational_gate_set_root: sha256(canonical(planned_operational_gate_records)),
    planned_input_subject_records,
    planned_input_subject_count: planned_input_subject_records.length,
    planned_input_subject_set_root: sha256(canonical(planned_input_subject_records)),
    allowed_next_action_records,
    allowed_next_action_count: allowed_next_action_records.length,
    allowed_next_action_set_root: sha256(canonical(allowed_next_action_records)),
    planned_vertical_tooling_subject_records,
    planned_vertical_tooling_subject_count: planned_vertical_tooling_subject_records.length,
    planned_vertical_tooling_subject_set_root: sha256(canonical(planned_vertical_tooling_subject_records)),
    node_count: verticalReleaseTrain.node_count,
    contribution_count: verticalReleaseTrain.contribution_count,
    required_terminal_target: 'CLAIM-VERTICAL-EVM-001',
    contamination_successor_required: true
    };
  })(),
  (() => {
    const claim_required_pass_records = requiredPassView(fullReleaseTrain);
    const evaluation_observation_records = fullObservationRecords;
    const planned_operational_gate_records = plannedGateRecords('RC-FULL-1');
    const planned_input_subject_records = inputSubjectRecords('RC-FULL-1');
    const allowed_next_action_records = allowedNextActionRecords('RC-FULL-1');
    const planned_full_tooling_subject_records = plannedToolingRecords(fullReleaseTrain);
    return {
    candidate_epoch_id: 'RC-FULL-1',
    candidate_epoch_kind: 'full_product',
    parent_candidate_epoch_id: 'RC-V-EVM-1',
    scope_ids: scopeRows.map(scope => scope.scopeId).sort(),
    release_train_closure_ids: fullReleaseTrain.ids,
    release_train_closure_id_count: fullReleaseTrain.count,
    release_train_closure_id_set_root: fullReleaseTrain.root,
    claim_required_pass_records,
    claim_required_pass_count: claim_required_pass_records.length,
    claim_required_pass_set_root: sha256(canonical(claim_required_pass_records)),
    evaluation_observation_records,
    evaluation_observation_count: evaluation_observation_records.length,
    evaluation_observation_set_root: sha256(canonical(evaluation_observation_records)),
    planned_operational_gate_records,
    planned_operational_gate_count: planned_operational_gate_records.length,
    planned_operational_gate_set_root: sha256(canonical(planned_operational_gate_records)),
    planned_input_subject_records,
    planned_input_subject_count: planned_input_subject_records.length,
    planned_input_subject_set_root: sha256(canonical(planned_input_subject_records)),
    allowed_next_action_records,
    allowed_next_action_count: allowed_next_action_records.length,
    allowed_next_action_set_root: sha256(canonical(allowed_next_action_records)),
    planned_full_tooling_subject_records,
    planned_full_tooling_subject_count: planned_full_tooling_subject_records.length,
    planned_full_tooling_subject_set_root: sha256(canonical(planned_full_tooling_subject_records)),
    node_count: fullReleaseTrain.node_count,
    contribution_count: fullReleaseTrain.contribution_count,
    required_terminal_target: 'FINAL-007',
    contamination_close_required: 'VERTICAL-EVM-CONTAMINATION-CLOSE-001',
    contamination_successor_required: false
    };
  })()
];
for (const epoch of ledger.candidate_epoch_registry) {
  const node = finalNodeById.get(epoch.candidate_epoch_id);
  node.epoch_constants.release_train_closure_id_set_root = epoch.release_train_closure_id_set_root;
  node.epoch_constants.release_train_closure_id_count = epoch.release_train_closure_id_count;
  node.epoch_constants.claim_required_pass_set_root = epoch.claim_required_pass_set_root;
  node.epoch_constants.claim_required_pass_count = epoch.claim_required_pass_count;
  node.epoch_constants.evaluation_observation_set_root = epoch.evaluation_observation_set_root;
  node.epoch_constants.evaluation_observation_count = epoch.evaluation_observation_count;
  node.epoch_constants.planned_operational_gate_set_root = epoch.planned_operational_gate_set_root;
  node.epoch_constants.planned_operational_gate_count = epoch.planned_operational_gate_count;
  node.epoch_constants.planned_input_subject_set_root = epoch.planned_input_subject_set_root;
  node.epoch_constants.planned_input_subject_count = epoch.planned_input_subject_count;
  node.epoch_constants.allowed_next_action_set_root = epoch.allowed_next_action_set_root;
  node.epoch_constants.allowed_next_action_count = epoch.allowed_next_action_count;
  if (epoch.candidate_epoch_id === 'RC-V-EVM-1') {
    node.epoch_constants.planned_vertical_tooling_subject_set_root = epoch.planned_vertical_tooling_subject_set_root;
    node.epoch_constants.planned_vertical_tooling_subject_count = epoch.planned_vertical_tooling_subject_count;
  } else {
    node.epoch_constants.planned_full_tooling_subject_set_root = epoch.planned_full_tooling_subject_set_root;
    node.epoch_constants.planned_full_tooling_subject_count = epoch.planned_full_tooling_subject_count;
  }
}
ledger.terminal_transition_contract.release_train_closure_id_set_root = fullReleaseTrain.root;
ledger.terminal_transition_contract.release_train_closure_id_count = fullReleaseTrain.count;
ledger.allowed_states = {
  implementation_primary_and_contribution: ['pending', 'accepted', 'reopened'],
  operational_primary: ['pending', 'accepted', 'reopened', 'terminal_failed', 'terminal_invalid', 'insufficient_evidence', 'terminal_not_run'],
  derived_computed: ['unsatisfied', 'satisfied']
};
ledger.state_counts = {
  primary_total: ledger.nodes.filter(node => node.kind === 'primary' && node.counted).length,
  primary_accepted: ledger.nodes.filter(node => node.kind === 'primary' && node.counted && node.state === 'accepted').length,
  derived_total: ledger.nodes.filter(node => node.kind === 'derived' && node.counted).length,
  derived_satisfied: ledger.nodes.filter(node => node.kind === 'derived' && node.counted && node.computed_state === 'satisfied').length,
  contribution_total: ledger.contributions.length,
  contribution_accepted: ledger.contributions.filter(item => item.state === 'accepted').length,
  operational_terminal_nonpass: ledger.nodes.filter(node => ['terminal_failed', 'terminal_invalid', 'insufficient_evidence', 'terminal_not_run'].includes(node.state)).length,
  reopened: ledger.nodes.filter(node => node.state === 'reopened').length + ledger.contributions.filter(item => item.state === 'reopened').length,
  counted_item_total: ledger.nodes.filter(node => node.counted).length + ledger.contributions.filter(item => item.counted).length
};

ledger.meta_states = {
  'FINAL-008': {
    counted: false,
    state: 'NOT_READY',
    formula: 'RC-FULL-1.release_train_closure_id_set_root matches AND every primary member accepted AND every derived member satisfied AND every contribution member accepted AND pending/reopened among mutable members == 0 AND CLAIM-007 true AND ID/DAG/contract hashes valid'
  }
};

fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
console.log(JSON.stringify({
  nodes: ledger.nodes.length,
  primary: ledger.state_counts.primary_total,
  derived: ledger.state_counts.derived_total,
  contributions: ledger.state_counts.contribution_total,
  nodeHash: ledger.node_id_set_sha256,
  contributionHash: ledger.contribution_id_set_sha256,
  closureHash: ledger.id_set_sha256,
  modes: Object.fromEntries(Object.entries(ledger.nodes.filter(n => n.kind === 'primary').reduce((acc, n) => { acc[n.evidence_mode] = (acc[n.evidence_mode] || 0) + 1; return acc; }, {})).sort())
}, null, 2));
