import fs from 'node:fs';
import crypto from 'node:crypto';

const j = JSON.parse(fs.readFileSync('acceptance-ledger.v1.json', 'utf8'));
const canonical = value => JSON.stringify(value);
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const unique = values => [...new Set(values)];
const nodes = new Map(j.nodes.map(node => [node.id, node]));
const contributions = new Map(j.contributions.map(item => [item.contribution_id, item]));

check(nodes.size === j.nodes.length, 'duplicate node IDs');
check(contributions.size === j.contributions.length, 'duplicate contribution IDs');
check(j.nodes.length === 565, `unexpected node count ${j.nodes.length}`);
check(j.state_counts.primary_total === 437, `unexpected primary count ${j.state_counts.primary_total}`);
check(j.state_counts.derived_total === 128, `unexpected derived count ${j.state_counts.derived_total}`);
check(j.contributions.length === 1064, `unexpected contribution count ${j.contributions.length}`);

const nodeIds = [...nodes.keys()].sort();
const contributionIds = [...contributions.keys()].sort();
const closureIds = [...nodeIds.map(id => `node:${id}`), ...contributionIds.map(id => `contribution:${id}`)].sort();
check(j.node_id_set_sha256 === sha256(canonical(nodeIds)), 'node ID hash mismatch');
check(j.contribution_id_set_sha256 === sha256(canonical(contributionIds)), 'contribution ID hash mismatch');
check(j.id_set_sha256 === sha256(canonical(closureIds)), 'closure ID hash mismatch');

const allowedDependencyTypes = new Set(['hard', 'contract', 'terminal_observation', 'terminal_derived_observation', 'historical_ordering']);
for (const node of j.nodes) {
  check(node.evidence_descriptor?.closed === true, `${node.id}: descriptor not closed`);
  for (const key of Object.keys(node.evidence_descriptor?.cardinality || {})) {
    check(node.evidence_descriptor.required.includes(key), `${node.id}: cardinality key ${key} absent from required`);
  }
  for (const dep of node.dependencies || []) {
    check(allowedDependencyTypes.has(dep.type), `${node.id}: unknown dependency type ${dep.type}`);
    check(nodes.has(dep.id), `${node.id}: missing dependency ${dep.id}`);
    if (dep.type === 'contract') {
      check(/^solguard-[a-z0-9-]+\.v\d+$/.test(dep.contract_id), `${node.id}: malformed contract ${dep.contract_id}`);
      check(dep.contract_version === dep.contract_id.match(/\.(v\d+)$/)?.[1], `${node.id}: contract version mismatch ${dep.contract_id}/${dep.contract_version}`);
    }
    if (dep.type === 'terminal_observation') {
      check(node.id === 'VERTICAL-EVM-CONTAMINATION-CLOSE-001', `${node.id}: illegal terminal_observation`);
      check(nodes.get(dep.id)?.kind === 'primary', `${node.id}: terminal_observation target not primary ${dep.id}`);
      check(canonical(dep.required_states) === canonical(['accepted', 'terminal_failed', 'terminal_invalid', 'insufficient_evidence', 'terminal_not_run']), `${node.id}: terminal observation states drift ${dep.id}`);
    }
    if (dep.type === 'terminal_derived_observation') {
      check(node.id === 'VERTICAL-EVM-CONTAMINATION-CLOSE-001', `${node.id}: illegal terminal_derived_observation`);
      check(nodes.get(dep.id)?.kind === 'derived', `${node.id}: terminal_derived target not derived ${dep.id}`);
      check(canonical(dep.required_computed_states) === canonical(['satisfied', 'unsatisfied']), `${node.id}: derived observation states drift ${dep.id}`);
    }
    if (dep.type === 'historical_ordering') {
      check(node.id === 'DB-902' && dep.id === 'VERTICAL-EVM-ISO-001', `${node.id}: illegal historical ordering ${dep.id}`);
      check(dep.successor_release_closure_import === false, `${node.id}: historical edge imported into successor closure`);
    }
  }
  if (node.kind === 'derived') {
    check(!Object.hasOwn(node, 'state'), `${node.id}: derived has mutable state`);
    check(['satisfied', 'unsatisfied'].includes(node.computed_state), `${node.id}: invalid computed state`);
    const hardIds = (node.dependencies || []).filter(dep => dep.type === 'hard').map(dep => dep.id);
    check(canonical(hardIds) === canonical(node.formula?.operands || []), `${node.id}: formula/dependency mismatch`);
    check((node.dependencies || []).every(dep => dep.type === 'hard'), `${node.id}: derived has non-formula dependency`);
    if (node.operational) check(node.materialization_operation === 'materialize_derived', `${node.id}: operational derived lacks materialization op`);
  } else {
    check(Object.hasOwn(node, 'state'), `${node.id}: primary lacks state`);
    check(!Object.hasOwn(node, 'computed_state'), `${node.id}: primary has computed_state`);
  }
  if (node.candidate_epoch_id && node.evidence_mode !== 'candidate_epoch') {
    check(node.evidence_descriptor.required.includes('candidate_epoch_id'), `${node.id}: missing candidate_epoch_id evidence`);
    check(node.evidence_descriptor.required.includes('candidate_epoch_root'), `${node.id}: missing candidate_epoch_root evidence`);
  }
}

const adjacency = new Map(j.nodes.map(node => [node.id, (node.dependencies || []).map(dep => dep.id)]));
const visiting = new Set();
const visited = new Set();
function visit(id, trail = []) {
  if (visiting.has(id)) { failures.push(`node DAG cycle ${[...trail, id].join(' -> ')}`); return; }
  if (visited.has(id)) return;
  visiting.add(id);
  for (const dep of adjacency.get(id) || []) visit(dep, [...trail, id]);
  visiting.delete(id);
  visited.add(id);
}
for (const id of adjacency.keys()) visit(id);

for (const node of j.nodes.filter(node => node.kind === 'primary' && node.evidence_mode === 'implementation')) {
  const seen = new Set(); const stack = (node.dependencies || []).map(dep => dep.id);
  while (stack.length) {
    const id = stack.pop(); if (seen.has(id)) continue; seen.add(id);
    const dependency = nodes.get(id); if (!dependency) continue;
    check(dependency.closure_domain_id === 'common', `${node.id}: implementation transitively depends candidate-bound ${id}/${dependency.closure_domain_id}`);
    for (const dep of dependency.dependencies || []) stack.push(dep.id);
  }
}

for (const item of j.contributions) {
  check(nodes.has(item.parent_primary_id), `${item.contribution_id}: missing parent`);
  check(nodes.get(item.parent_primary_id)?.required_contribution_ids?.includes(item.contribution_id), `${item.contribution_id}: parent reverse mapping missing`);
  check(item.evidence_descriptor?.closed === true, `${item.contribution_id}: contribution descriptor not closed`);
  for (const dep of item.hard_contribution_dependencies || []) {
    check(contributions.has(dep.contribution_id), `${item.contribution_id}: missing contribution dep ${dep.contribution_id}`);
    check(dep.type === 'hard_contribution', `${item.contribution_id}: contribution dep type drift`);
    check(['hard', 'publication'].includes(dep.ordering), `${item.contribution_id}: contribution ordering drift`);
    check(dep.required_state === 'accepted' && dep.publication_receipt === 'required' && dep.publication_binding === 'exact_accepted_implementation_ref_and_evidence_root', `${item.contribution_id}: contribution edge fields drift`);
  }
}
for (const node of j.nodes.filter(node => node.kind === 'primary')) {
  for (const id of node.required_contribution_ids || []) check(contributions.get(id)?.parent_primary_id === node.id, `${node.id}: reverse contribution ${id} mismatch`);
}

const contributionAdj = new Map(j.contributions.map(item => [item.contribution_id, item.hard_contribution_dependencies.map(dep => dep.contribution_id)]));
visiting.clear(); visited.clear();
function visitContribution(id, trail = []) {
  if (visiting.has(id)) { failures.push(`contribution DAG cycle ${[...trail, id].join(' -> ')}`); return; }
  if (visited.has(id)) return;
  visiting.add(id);
  for (const dep of contributionAdj.get(id) || []) visitContribution(dep, [...trail, id]);
  visiting.delete(id); visited.add(id);
}
for (const id of contributionAdj.keys()) visitContribution(id);

for (const id of ['C2-CON-RM-14', 'C2-CON-RM-15']) {
  const item = contributions.get(id);
  check(item?.contribution_type === 'absence_receipt_contribution', `${id}: absence type missing`);
  check(!Object.hasOwn(item || {}, 'expected_commit'), `${id}: expected_commit forbidden`);
  check(item?.evidence_descriptor?.profile === 'absence_receipt_contribution', `${id}: absence descriptor profile`);
}

const expectedGenesis = ['C0-001', 'C0-001A', 'C0-001B', 'C0-003', 'C0-004', 'C0-012', 'C0-013', 'C0-014', 'C0-015', 'C0-016', 'C0-017'];
check(canonical(j.genesis_batch.genesis_contribution_set) === canonical(expectedGenesis), 'genesis contribution set drift');
for (const [child, parent] of [['C0-001A','C0-001'],['C0-001B','C0-001A'],['C0-003','C0-001B'],['C3-016A','C3-015B'],['C3-016B','C3-016'],['C3-016B','C3-016A'],['C3-016C','C3-016B'],['C3-016C','C3-015C']]) {
  check(contributions.get(child)?.hard_contribution_dependencies.some(dep => dep.contribution_id === parent), `${child}: missing exact dep ${parent}`);
}

function releaseClosure(rootId) {
  const nodeSet = new Set(), contributionSet = new Set(), nodeStack = [rootId], contributionStack = [];
  while (nodeStack.length || contributionStack.length) {
    while (nodeStack.length) {
      const id = nodeStack.pop(); if (nodeSet.has(id)) continue; nodeSet.add(id);
      const node = nodes.get(id); if (!node) { failures.push(`closure missing node ${id}`); continue; }
      for (const dep of node.dependencies || []) if (!['terminal_observation','terminal_derived_observation','historical_ordering'].includes(dep.type)) nodeStack.push(dep.id);
      for (const contributionId of node.required_contribution_ids || []) contributionStack.push(contributionId);
    }
    while (contributionStack.length) {
      const id = contributionStack.pop(); if (contributionSet.has(id)) continue; contributionSet.add(id);
      const item = contributions.get(id); if (!item) { failures.push(`closure missing contribution ${id}`); continue; }
      for (const dep of item.dependencies || []) nodeStack.push(dep.id);
      for (const dep of item.hard_contribution_dependencies || []) contributionStack.push(dep.contribution_id);
    }
  }
  const ids = [...[...nodeSet].map(id => `node:${id}`), ...[...contributionSet].map(id => `contribution:${id}`)].sort();
  return { ids, root: sha256(canonical(ids)), count: ids.length, nodeCount: nodeSet.size, contributionCount: contributionSet.size };
}
for (const [epochId, rootId] of [['RC-V-EVM-1','CLAIM-VERTICAL-EVM-001'],['RC-FULL-1','FINAL-007']]) {
  const expected = releaseClosure(rootId); const epoch = j.candidate_epoch_registry.find(item => item.candidate_epoch_id === epochId);
  check(canonical(epoch.release_train_closure_ids) === canonical(expected.ids), `${epochId}: release closure IDs drift`);
  check(epoch.release_train_closure_id_set_root === expected.root && epoch.release_train_closure_id_count === expected.count, `${epochId}: release closure commitment drift`);
  check(epoch.claim_required_pass_count === epoch.claim_required_pass_records.length, `${epochId}: pass count drift`);
  check(epoch.claim_required_pass_set_root === sha256(canonical(epoch.claim_required_pass_records)), `${epochId}: pass root drift`);
  check(epoch.evaluation_observation_count === epoch.evaluation_observation_records.length, `${epochId}: observation count drift`);
  check(epoch.evaluation_observation_set_root === sha256(canonical(epoch.evaluation_observation_records)), `${epochId}: observation root drift`);
  check(epoch.planned_operational_gate_count === epoch.planned_operational_gate_records.length, `${epochId}: planned gate count drift`);
  check(epoch.planned_operational_gate_set_root === sha256(canonical(epoch.planned_operational_gate_records)), `${epochId}: planned gate root drift`);
  check(epoch.planned_input_subject_count === epoch.planned_input_subject_records.length, `${epochId}: planned input count drift`);
  check(epoch.planned_input_subject_set_root === sha256(canonical(epoch.planned_input_subject_records)), `${epochId}: planned input root drift`);
  check(epoch.allowed_next_action_count === epoch.allowed_next_action_records.length, `${epochId}: allowed action count drift`);
  check(epoch.allowed_next_action_set_root === sha256(canonical(epoch.allowed_next_action_records)), `${epochId}: allowed action root drift`);
  const toolingPrefix = epochId === 'RC-V-EVM-1' ? 'vertical' : 'full';
  const records = epoch[`planned_${toolingPrefix}_tooling_subject_records`];
  check(epoch[`planned_${toolingPrefix}_tooling_subject_count`] === records.length, `${epochId}: tooling subject count drift`);
  check(epoch[`planned_${toolingPrefix}_tooling_subject_set_root`] === sha256(canonical(records)), `${epochId}: tooling subject root drift`);
  const epochNode = nodes.get(epochId);
  check(epochNode.epoch_constants[`planned_${toolingPrefix}_tooling_subject_set_root`] === epoch[`planned_${toolingPrefix}_tooling_subject_set_root`], `${epochId}: tooling constant root drift`);
}
const verticalEpoch = j.candidate_epoch_registry.find(item => item.candidate_epoch_id === 'RC-V-EVM-1');
const verticalIds = new Set(verticalEpoch.release_train_closure_ids);
for (const forbidden of ['node:RC-FULL-1','node:SCOPE-900','node:BOM-903','node:ISO-904','node:CORPUS-905','node:CANARY-909','node:TEST-V5','node:KNOWN-910']) check(!verticalIds.has(forbidden), `RC-V imports global ${forbidden}`);
const foreignScopes = (j.scope_matrix?.scopes || []).map(scope => scope.scope_id).filter(id => id !== 'SOL-EVM-DEFI');
for (const scope of foreignScopes) for (const suffix of ['C0','C1','C2','C3','C4','C5A','C5B','CERT']) check(!verticalIds.has(`node:${scope}-${suffix}`), `RC-V imports foreign scope ${scope}-${suffix}`);
const fullEpoch = j.candidate_epoch_registry.find(item => item.candidate_epoch_id === 'RC-FULL-1');
check(fullEpoch.release_train_closure_ids.includes('node:VERTICAL-EVM-CONTAMINATION-CLOSE-001'), 'RC-FULL missing contamination close');
for (const id of fullEpoch.release_train_closure_ids.filter(id => id.startsWith('node:VERTICAL-EVM-'))) check(id === 'node:VERTICAL-EVM-CONTAMINATION-CLOSE-001', `RC-FULL imports observed vertical gate ${id}`);

const profile = nodes.get('VERTICAL-EVM-PROFILE-001');
for (const field of ['live_sampling_frame_root','live_authorization_policy_root','live_endpoint_set_root','live_stopping_abort_root','issuer_trust_policy_commitment_root']) check(profile.evidence_descriptor.required.includes(field), `profile missing precomputable ${field}`);
for (const stale of ['per_attempt_trusted_timestamp_status_and_revocation_check','authorization_mismatch_expired_revoked_stale_out_of_scope_fails_closed']) check(!profile.predicate.must_hold.includes(stale), `profile contains future runtime predicate ${stale}`);

for (const id of ['VERTICAL-EVM-HNOVEL-A-001','VERTICAL-EVM-HNOVEL-B-001','NOVELRUN-912','TEST-V7']) {
  const node = nodes.get(id);
  for (const field of ['target_policy_openings_root','finding_materiality_assessments_root','novelty_inventory_root','novelty_taxonomy_root','novelty_classification_set_root','novel_eligible_origin_numerator_root','rule_pack_retrieval_exclusion_root']) check(node.evidence_descriptor.required.includes(field), `${id}: missing ${field}`);
}
for (const node of j.nodes.filter(node => ['h_gen_scope_replica','h_gen_pair_aggregate','h_novel_scope_replica','h_novel_pair_aggregate'].includes(node.measurement_subtype))) {
  check(node.evidence_descriptor.required.includes('ablation_profile_set_root'), `${node.id}: missing ablation root`);
  check(node.evidence_descriptor.cardinality.ablation_profile_count === 4, `${node.id}: ablation profile count not 4`);
}

const testV8 = nodes.get('TEST-V8');
for (const field of Object.keys(testV8.evidence_descriptor.cardinality)) check(testV8.evidence_descriptor.required.includes(field), `TEST-V8 cardinality field missing ${field}`);
check(testV8.measurement_subtype === 'live_auth_campaign', 'TEST-V8 subtype drift');
check(nodes.get('TEST-V5').measurement_subtype === 'known_validation', 'TEST-V5 must be known_validation');
check(nodes.get('VERTICAL-EVM-V5-001').measurement_subtype === 'known_validation', 'vertical V5 must be known_validation');

const db = nodes.get('DB-902');
check(db.dependencies.some(dep => dep.type === 'contract' && dep.contract_id === 'solguard-external-timestamp-receipt.v1'), 'DB missing timestamp contract');
check(db.dependencies.some(dep => dep.type === 'historical_ordering' && dep.id === 'VERTICAL-EVM-ISO-001'), 'DB missing vertical freeze order receipt');
check(db.evidence_descriptor.required.includes('external_timestamp_receipt_set_root') && db.evidence_descriptor.required.includes('vertical_epoch_freeze_ordering_receipt_root'), 'DB evidence missing timestamp/order root');

for (const field of ['log_protocol_id','log_protocol_version','log_specification_ref','log_specification_content_digest','submitted_leaf_ref','submitted_leaf_content_digest','canonical_log_entry_ref','canonical_log_entry_content_digest']) check(j.external_timestamp_contract.receipt_payload_union.transparency_log.required.includes(field), `timestamp contract missing ${field}`);
check(j.transition_contract.operations.record_upstream_nonpass?.target_state === 'terminal_not_run', 'upstream nonpass operation missing');
check(!j.transition_contract.operations.record_terminal_nonpass, 'deprecated record_terminal_nonpass exists');
check(j.transition_contract.operations.record_candidate_epoch_open && j.transition_contract.operations.record_candidate_epoch_close, 'candidate epoch operations missing');
check(j.allowed_states.operational_primary.includes('terminal_not_run'), 'terminal_not_run missing from allowed states');
check(nodes.get('CLAIM-VERTICAL-EVM-001').operational === true, 'vertical claim not operational');
check(nodes.get('CLAIM-VERTICAL-EVM-001').evidence_descriptor.profile === 'vertical_claim_materialization', 'vertical claim receipt profile drift');

const staleText = JSON.stringify(j);
for (const stale of ['campaign_transition_context','release_ceremony_context','tentative_post_state_root','all_398_primary','primary_accepted == 398','zero_pending_and_zero_reopened_across_nodes_and_contributions']) check(!staleText.includes(stale), `stale alias/count remains: ${stale}`);

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failure_count: failures.length, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  nodes: j.nodes.length,
  primary: j.state_counts.primary_total,
  derived: j.state_counts.derived_total,
  contributions: j.contributions.length,
  node_hash: j.node_id_set_sha256,
  contribution_hash: j.contribution_id_set_sha256,
  closure_hash: j.id_set_sha256,
  vertical_closure: { count: verticalEpoch.release_train_closure_id_count, node_count: verticalEpoch.node_count, contribution_count: verticalEpoch.contribution_count, root: verticalEpoch.release_train_closure_id_set_root },
  full_closure: { count: fullEpoch.release_train_closure_id_count, node_count: fullEpoch.node_count, contribution_count: fullEpoch.contribution_count, root: fullEpoch.release_train_closure_id_set_root }
}, null, 2));
