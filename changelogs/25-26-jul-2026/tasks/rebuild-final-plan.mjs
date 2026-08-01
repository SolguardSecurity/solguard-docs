import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const P = (name) => join(DIR, name);
const VERSION = 'solguard-detection-maturity-2026-07-25.4';
const SET_SCHEMA = 'solguard-canonical-set-commitment.v1';
const BT = String.fromCharCode(96);
const RESOURCE_PROFILE_REQUIRED_FIELDS = [
  'resource_profile_id','resource_profile_version','hardware_class','runtime_class',
  'hardware_root','runtime_root','wall_time_p95_ms_max','wall_time_ms_max',
  'cpu_time_ms_max','peak_ram_bytes_max','peak_disk_bytes_max','solver_time_ms_max',
  'model_calls_max','model_tokens_max','model_cost_minor_units_max','retry_count_max',
  'throughput_targets_per_hour_min','concurrency_limit','queue_limit','candidate_limit',
  'continuation_limit','model_timeout_rate_max','schema_failure_rate_max',
  'model_failure_rate_max','schema_or_model_failure_rate_max','filter_failure_count_max',
  'control_oom_count_max','control_disk_exhaustion_count_max','control_noncompletion_count_max'
];
const RESOURCE_PROFILE_HARD_RATES = {
  model_timeout_rate_max: 0.02,
  schema_failure_rate_max: 0.01,
  model_failure_rate_max: 0.01,
  schema_or_model_failure_rate_max: 0.01,
  filter_failure_count_max: 0,
  control_oom_count_max: 0,
  control_disk_exhaustion_count_max: 0,
  control_noncompletion_count_max: 0
};
const RESOURCE_PROFILE_WORKLOAD_LIMITS = {
  review_median_max: 10,
  review_p95_max: 25,
  raw_pass_median_max: 15,
  raw_pass_p95_max: 40,
  inconclusive_median_max: 10,
  inconclusive_p95_max: 25,
  candidate_median_max: 50,
  candidate_p95_max: 100,
  proof_debt_median_max: 10,
  proof_debt_p95_max: 25
};

function ok(value, message) {
  if (!value) throw new Error(message);
}
function copy(value) {
  return JSON.parse(JSON.stringify(value));
}
function unique(values) {
  return [...new Set(values)];
}
function cmp(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}
function keyParts(...values) {
  return values.map(String).join('\0');
}
function sorted(values) {
  return unique(values).sort(cmp);
}
function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}
function jcs(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    ok(Number.isFinite(value), 'JCS rejects non-finite number');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return '[' + value.map(jcs).join(',') + ']';
  ok(value && typeof value === 'object', 'JCS rejects unsupported value');
  return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + jcs(value[key])).join(',') + '}';
}
function domainHash(domain, value) {
  const h = createHash('sha256');
  h.update(Buffer.from(domain, 'utf8'));
  h.update(Buffer.from([0]));
  h.update(Buffer.from(jcs(value), 'utf8'));
  return h.digest('hex');
}
function committedSet(ledger, subject, setKind, members, keyFn, programSet) {
  const keyed = new Map();
  for (const member of members) {
    const key = keyFn(member);
    ok(!keyed.has(key), subject + '/' + setKind + ': duplicate logical member ' + key);
    keyed.set(key, member);
  }
  const ordered = [...keyed.entries()].sort(([a], [b]) => cmp(a, b)).map((entry) => entry[1]);
  const payload = {
    schema_version: SET_SCHEMA,
    program_id: ledger.program_id,
    program_version: ledger.program_version
  };
  if (programSet) payload.subject = subject;
  else payload.candidate_epoch_id = subject;
  payload.set_kind = setKind;
  payload.member_count = ordered.length;
  payload.members = ordered;
  const prefix = programSet ? 'solguard:program-set:' : 'solguard:candidate-set:';
  return {
    members: ordered,
    count: ordered.length,
    root: domainHash(prefix + setKind + ':v1', payload)
  };
}
const cset = (ledger, candidate, kind, members, keyFn = jcs) =>
  committedSet(ledger, candidate, kind, members, keyFn, false);
const pset = (ledger, subject, kind, members, keyFn = jcs) =>
  committedSet(ledger, subject, kind, members, keyFn, true);

function deepVersion(value) {
  if (typeof value === 'string') {
    return value
      .replaceAll('solguard-detection-maturity-2026-07-25.2', VERSION)
      .replaceAll('solguard-detection-maturity-2026-07-25.3', VERSION);
  }
  if (Array.isArray(value)) return value.map(deepVersion);
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) value[key] = deepVersion(value[key]);
  }
  return value;
}
const LEGACY_NAMES = new Map([
  ['evaluation_closure_id_set_root','evaluation_closure_member_set_root'],
  ['evaluation_closure_id_count','evaluation_closure_member_count'],
  ['evaluation_closure_ids','evaluation_closure_member_records'],
  ['release_train_closure_id_set_root','release_train_closure_member_set_root'],
  ['release_train_closure_id_count','release_train_closure_member_count'],
  ['release_train_closure_ids','release_train_closure_member_records'],
  ['claim_required_pass_set_root','required_pass_member_set_root'],
  ['claim_required_pass_count','required_pass_member_count'],
  ['claim_required_pass_records','required_pass_member_records']
]);
function replaceLegacyString(value) {
  let result = value;
  for (const [from, to] of LEGACY_NAMES) result = result.replaceAll(from, to);
  return result;
}
function normalizeLegacyNames(value) {
  if (typeof value === 'string') return replaceLegacyString(value);
  if (Array.isArray(value)) {
    const mapped = value.map(normalizeLegacyNames);
    return mapped.every((item) => typeof item === 'string') ? unique(mapped) : mapped;
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      const renamed = replaceLegacyString(key);
      const child = normalizeLegacyNames(value[key]);
      if (renamed !== key) {
        if (!(renamed in value)) value[renamed] = child;
        delete value[key];
      } else value[key] = child;
    }
  }
  return value;
}
function dep(id, type = 'hard', extra = {}) {
  return { id, type, ...extra };
}
function addDep(node, value) {
  node.dependencies ??= [];
  if (!node.dependencies.some((item) => jcs(item) === jcs(value))) node.dependencies.push(value);
}
function hardContribution(id) {
  return {
    contribution_id: id,
    type: 'hard_contribution',
    ordering: 'hard',
    required_state: 'accepted',
    publication_receipt: 'required',
    publication_binding: 'exact_accepted_implementation_ref_and_evidence_root'
  };
}
function setContributionDeps(item, ids) {
  item.hard_contribution_dependencies = sorted(ids).map(hardContribution);
}
function addContributionDeps(item, ids) {
  setContributionDeps(item, [...(item.hard_contribution_dependencies || []).map((x) => x.contribution_id), ...ids]);
}
function addRequired(node, ids) {
  node.required_contribution_ids = sorted([...(node.required_contribution_ids || []), ...ids]);
}
function parseRows(markdown) {
  const rows = [];
  const pattern = new RegExp(
    '^\\|\\s*(C[A-Za-z0-9-]+)\\s*\\|\\s*' + BT + '([^' + BT + ']+)' + BT +
    '\\s*\\|\\s*(.*?)<br>Parent gate:\\s*' + BT + '([^' + BT + ']+)' + BT +
    '\\s*\\|(.*)$'
  );
  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(pattern);
    if (!match) continue;
    const result = match[5].trim().replace(/\|\s*$/, '').trim();
    rows.push({
      id: match[1],
      owner: match[2],
      subject: match[3].replaceAll(BT, '').trim(),
      parent: match[4],
      result: result.replaceAll('<br>', ' ')
    });
  }
  ok(rows.length === 653, 'expected 653 explicit rows, got ' + rows.length);
  ok(new Set(rows.map((x) => x.id)).size === rows.length, 'duplicate explicit row');
  return rows;
}
function parentMap() {
  const map = new Map();
  const put = (ids, parent) => ids.forEach((id) => map.set(id, parent));
  put(['C3-005A','C3-005B','C3-005C','C3-005D','C3-005E','C3-005F','C3-005G','C3-005H'], 'IR-303');
  put(['C3-013C','C3-013D','C3-013E','C3-013F','C3-013G','C3-013H','C3-013I'], 'MODEL-404');
  put(['C3-013J','C3-013K','C3-013L','C3-013M','C3-013N','C3-013O','C3-013P'], 'MODEL-411');
  put(['C3-016D','C3-016E','C3-016F'], 'MODEL-406');
  put(['C4-011A','C4-011B','C4-011C','C4-011D','C4-011E'], 'PROOF-506');
  put(['C6-C-05B'], 'LANG-C-03-INTEGRATION');
  put(['C6-C-06A'], 'LANG-C-04-INTEGRATION');
  put(['C6-C-08A'], 'LANG-C-05-INTEGRATION');
  put(['C6-CPP-05B','C6-CPP-06A'], 'LANG-CPP-02-INTEGRATION');
  put(['C6-CPP-09A'], 'LANG-CPP-03-INTEGRATION');
  put(['C7-001I','C7-002P','C7-002Q'], 'MEASURE-901');
  return map;
}
function newDeps() {
  return new Map([
    ['C3-005A',['C3-005']],['C3-005B',['C3-005A']],['C3-005C',['C3-005B']],
    ['C3-005D',['C3-005C']],['C3-005E',['C3-005D']],['C3-005F',['C3-005E']],
    ['C3-005G',['C3-005F']],['C3-005H',['C3-005G']],
    ['C3-013C',['C3-013','C3-013A']],['C3-013D',['C3-013C']],['C3-013E',['C3-013D']],
    ['C3-013F',['C3-013E']],['C3-013G',['C3-013F']],['C3-013H',['C3-013G']],['C3-013I',['C3-013H']],
    ['C3-013J',[]],['C3-013K',['C3-013J']],['C3-013L',['C3-013J']],['C3-013M',['C3-013J']],
    ['C3-013N',['C3-013K','C3-013L','C3-013M']],['C3-013O',['C3-013N']],['C3-013P',['C3-013O']],
    ['C3-016D',['C3-016B']],['C3-016E',['C3-016D']],['C3-016F',['C3-016E']],
    ['C4-011A',['C4-011']],['C4-011B',['C4-011A']],['C4-011C',['C4-011B']],
    ['C4-011D',['C4-011C']],['C4-011E',['C4-011A','C4-011B','C4-011C','C4-011D']],
    ['C6-C-05B',['C6-C-05A']],['C6-C-06A',['C6-C-06']],['C6-C-08A',['C6-C-07A']],
    ['C6-CPP-05B',['C6-CPP-05A']],['C6-CPP-06A',['C6-CPP-06']],['C6-CPP-09A',['C6-CPP-08']],
    ['C7-001I',['C7-001H']],['C7-002P',['C7-002O','C7-001I']],['C7-002Q',['C7-002P']]
  ]);
}
function updateRow(item, row) {
  item.owner_repo = row.owner;
  item.declared_parent_id = row.parent;
  item.source = { plan: '06_PLAN_DE_COMMITS.md', row_id: row.id, row_kind: 'concrete_row' };
  item.expected_commit = {
    ...(item.expected_commit || {}),
    commit_identity: row.id,
    planned_subject: row.subject,
    required_branch_prefix: 'codex/' + row.id.toLowerCase() + '-',
    required_task_footer: row.id,
    declared_parent_marker: row.parent,
    observable_result: row.result || row.subject
  };
  item.predicate.criteria_id = row.id;
}
function makeContribution(template, row, parent) {
  const item = copy(template);
  item.contribution_id = row.id;
  item.parent_primary_id = parent;
  item.parent_primary_ids = [parent];
  item.integration_gate = parent;
  item.state = 'pending';
  item.contribution_version = 1;
  item.operational = false;
  item.dependencies = [];
  item.hard_contribution_dependencies = [];
  item.acceptance = {
    evidence_root: null,
    verifier_root: null,
    accepted_ledger_revision: null,
    dependency_state_hash: null,
    accepted_implementation_ref: null,
    reopened_by: []
  };
  item.closure_domain_id = 'common';
  updateRow(item, row);
  return item;
}
function makePrimary(template, id, owner, dependencies, contributions) {
  const node = copy(template);
  Object.assign(node, {
    id,
    kind: 'primary',
    counted: true,
    owner,
    state: 'pending',
    node_version: 1,
    operational: false,
    terminalizable: false,
    evidence_mode: 'implementation',
    dependencies,
    formula: null,
    closure_domain_id: 'common'
  });
  node.predicate = {
    type: 'work_package_acceptance',
    reference: '02_PROGRAMA_ESTRUCTURAL.md',
    criteria_id: id,
    criteria_locator: 'heading_or_table_row',
    must_hold: [
      'criteria:' + id + ':observable_result',
      'criteria:' + id + ':negative_and_adversarial_tests',
      'criteria:' + id + ':contract_and_e2e_tests',
      'criteria:' + id + ':zero_open_p0_p1_p2'
    ]
  };
  node.required_contribution_ids = sorted(contributions);
  node.acceptance = {
    evidence_root: null,
    verifier_root: null,
    accepted_ledger_revision: null,
    dependency_state_hash: null,
    reopened_by: []
  };
  return node;
}
function obs(node) {
  if (node.kind === 'derived') {
    return {
      observation_kind: 'derived',
      node_id: node.id,
      node_version: node.node_version,
      required_computed_states: ['satisfied','unsatisfied'],
      evaluation_receipt_root: 'required',
      operand_state_hash: 'required'
    };
  }
  return {
    observation_kind: 'primary',
    node_id: node.id,
    node_version: node.node_version,
    required_states: ['accepted','terminal_failed','terminal_invalid','insufficient_evidence','terminal_not_run']
  };
}
function inputRecords(ledger, candidate) {
  const subjects = new Map();
  for (const node of ledger.nodes) subjects.set(node.id, node);
  for (const item of ledger.contributions) subjects.set(item.contribution_id, item);
  const records = new Map();
  for (const edge of candidate.dependencies || []) {
    const subject = subjects.get(edge.id);
    ok(subject, candidate.id + ': missing input ' + edge.id);
    const version = subject.node_version || subject.contribution_version;
    const key = subject.kind + ':' + edge.id + ':' + version;
    if (!records.has(key)) {
      records.set(key, {
        member_kind: subject.kind,
        member_id: edge.id,
        subject_version: version,
        dependency_bindings: []
      });
    }
    const record = records.get(key);
    const sourceBindings = edge.dependency_bindings || [{
      dependency_type: edge.type,
      ...(edge.contract_id ? { contract_id: edge.contract_id } : {}),
      ...(edge.contract_version ? { contract_version: edge.contract_version } : {})
    }];
    for (const binding of sourceBindings) {
      if (!record.dependency_bindings.some((x) => jcs(x) === jcs(binding))) {
        record.dependency_bindings.push(binding);
      }
    }
    record.dependency_bindings.sort((a, b) => cmp(jcs(a), jcs(b)));
  }
  return [...records.values()];
}
function toolingRecords(ledger, releaseIds) {
  const set = new Set(releaseIds.map((value) =>
    typeof value === 'string' ? value : value.member_kind + ':' + value.member_id
  ));
  return ledger.contributions.filter((item) => set.has('contribution:' + item.contribution_id)).map((item) => ({
    contribution_id: item.contribution_id,
    contribution_version: item.contribution_version,
    parent_primary_id: item.parent_primary_id,
    owner_repo: item.owner_repo,
    planned_commit_identity: item.expected_commit?.commit_identity || item.contribution_id
  }));
}
function closureMemberRecords(ledger, ids) {
  const nodes = new Map(ledger.nodes.map((node) => [node.id, node]));
  const contributions = new Map(ledger.contributions.map((item) => [item.contribution_id, item]));
  return ids.map((ref) => {
    const split = ref.indexOf(':');
    const prefix = ref.slice(0, split);
    const id = ref.slice(split + 1);
    if (prefix === 'node') {
      const node = nodes.get(id);
      ok(node, 'unknown closure node ' + id);
      return {
        member_kind: node.kind,
        member_id: id,
        subject_version: node.node_version
      };
    }
    const item = contributions.get(id);
    ok(prefix === 'contribution' && item, 'unknown closure contribution ' + id);
    return {
      member_kind: 'contribution',
      member_id: id,
      subject_version: item.contribution_version
    };
  });
}
function gateRecords(nodes) {
  return nodes.map((node) => ({
    node_id: node.id,
    node_version: node.node_version,
    predicate_digest: hash(Buffer.from(jcs(node.predicate), 'utf8')),
    evidence_schema_digest: hash(Buffer.from(jcs(node.evidence_descriptor || { schema: 'solguard-derived-evaluation.v1' }), 'utf8'))
  }));
}

function makeFullClose(template, evaluationNodes, claimNodes) {
  const node = copy(template);
  Object.assign(node, {
    id: 'RC-FULL-1-CLOSE',
    owner: 'solguard-deploy/release-authority',
    state: 'pending',
    node_version: 1,
    operational: true,
    terminalizable: false,
    evidence_mode: 'candidate_epoch_close',
    transition_operation: 'record_candidate_epoch_close',
    candidate_epoch_id: 'RC-FULL-1',
    closure_domain_id: 'RC-FULL-1'
  });
  node.dependencies = [dep('RC-FULL-1')];
  for (const target of [...evaluationNodes].sort((a, b) => cmp(a.id, b.id))) {
    node.dependencies.push(target.kind === 'derived' ? {
      id: target.id,
      type: 'terminal_derived_observation',
      required_computed_states: ['satisfied','unsatisfied'],
      evaluation_receipt_root: 'required',
      operand_state_hash: 'required',
      missing_or_stale_receipt: 'reject'
    } : {
      id: target.id,
      type: 'terminal_observation',
      required_states: ['accepted','terminal_failed','terminal_invalid','insufficient_evidence','terminal_not_run'],
      evidence_root: 'required',
      pending_reopened_or_missing: 'reject'
    });
  }
  for (const target of [...claimNodes].sort((a, b) => cmp(a.id, b.id))) {
    node.dependencies.push({
      id: target.id,
      type: 'claim_observation',
      required_computed_states: ['satisfied','unsatisfied'],
      evaluation_receipt_root: 'required',
      operand_state_hash: 'required',
      missing_or_stale_receipt: 'reject'
    });
  }
  node.dependencies.push(
    dep('RC-FULL-1', 'contract', {
      contract_id: 'solguard-candidate-epoch.v1',
      contract_version: 'v1'
    }),
    dep('GOV-003', 'contract', {
      contract_id: 'solguard-external-timestamp-receipt.v1',
      contract_version: 'v1'
    })
  );
  node.required_contribution_ids = [];
  node.formula = null;
  node.predicate = {
    type: 'candidate_epoch_full_close',
    reference: '09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md',
    criteria_id: 'RC-FULL-1-CLOSE',
    criteria_locator: 'heading_or_table_row',
    must_hold: [
      'source_epoch_exact_RC_FULL_1',
      'terminal_bindings_equal_evaluation_closure_minus_pass_claim_targets',
      'claim_observations_equal_exact_pass_claim_target_set',
      'one_binding_per_logical_member_and_no_overlap',
      'closed_pass_iff_required_pass_members_pass_and_all_pass_claims_true',
      'closed_nonpass_iff_all_members_terminal_and_closed_pass_predicate_false',
      'close_receipt_accepted_for_evidence_complete_pass_or_nonpass',
      'only_closed_pass_enables_FINAL_001',
      'external_timestamp_quorum_2_of_2'
    ]
  };
  const primaryCount = evaluationNodes.filter((x) => x.kind === 'primary').length;
  const derivedCount = evaluationNodes.filter((x) => x.kind === 'derived').length;
  node.evidence_descriptor = {
    schema: 'solguard-candidate-epoch-close-transition.v1',
    profile: 'candidate_epoch_close',
    closed: true,
    required: [
      'candidate_epoch_close_context','source_candidate_epoch_id','source_candidate_epoch_root',
      'preclose_candidate_epoch_state_root','evaluation_closure_member_set_root','evaluation_closure_member_count',
      'release_train_closure_member_set_root','release_train_closure_member_count',
      'terminal_state_binding_set_root','terminal_state_binding_count',
      'claim_observation_records','claim_observation_count','claim_observation_set_root',
      'required_pass_member_set_root','required_pass_member_count',
      'pass_claim_target_set_root','pass_claim_target_count',
      'proposed_closure_outcome','assurance_verifier_root',
      'external_timestamp_receipt_set_root','immutable_evidence_root',
      'candidate_epoch_id','candidate_epoch_root'
    ],
    forbidden: [
      'implementation_report','changed_files','commits','branch','task_footer',
      'source_tree_writes','changelog_update','campaign_context','measurement_context',
      'DSSE_release_manifest','tag_realization_receipt'
    ],
    cardinality: {
      primary_terminal_state_bindings: primaryCount,
      derived_terminal_state_bindings: derivedCount,
      claim_observation_records: claimNodes.length,
      claim_observation_count: claimNodes.length
    }
  };
  node.acceptance = {
    evidence_root: null,
    verifier_root: null,
    accepted_ledger_revision: null,
    dependency_state_hash: null,
    reopened_by: [],
    closure_outcome: null,
    closure_receipt_root: null
  };
  return node;
}

function buildRegistry(ledger, nodeById, config) {
  const candidate = config.candidate;
  const closureKey = (record) => keyParts(record.member_kind, record.member_id, record.subject_version);
  const evaluation = cset(
    ledger,
    candidate.id,
    'evaluation_closure',
    closureMemberRecords(ledger, config.evaluationIds),
    closureKey
  );
  const release = cset(
    ledger,
    candidate.id,
    'release_train_closure',
    closureMemberRecords(ledger, config.releaseIds),
    closureKey
  );
  const passClaimIds = new Set(config.claimNodes.map((node) => node.id));
  const requiredPass = cset(
    ledger,
    candidate.id,
    'required_pass_member',
    evaluation.members.filter((member) => !passClaimIds.has(member.member_id)).map((member) => ({
      member_kind: member.member_kind,
      member_id: member.member_id,
      subject_version: member.subject_version,
      ...(member.member_kind === 'derived'
        ? { required_computed_state: 'satisfied' }
        : { required_state: 'accepted' })
    })),
    closureKey
  );
  const claimTargets = cset(
    ledger,
    candidate.id,
    'pass_claim_target',
    config.claimNodes.map((node) => ({
      node_id: node.id,
      node_version: node.node_version,
      required_computed_state: 'satisfied'
    })),
    (record) => keyParts(record.node_id, record.node_version)
  );
  const observations = cset(
    ledger,
    candidate.id,
    'evaluation_observation',
    config.evaluationNodes.map(obs),
    (record) => keyParts(record.observation_kind, record.node_id, record.node_version)
  );
  const gates = cset(
    ledger,
    candidate.id,
    'planned_operational_gate',
    gateRecords([...config.evaluationNodes, ...config.claimNodes, nodeById.get(config.closeTarget)]),
    (record) => keyParts(record.node_id, record.node_version)
  );
  const inputs = cset(
    ledger,
    candidate.id,
    'planned_input_subject',
    inputRecords(ledger, candidate),
    (record) => keyParts(record.member_kind, record.member_id, record.subject_version)
  );
  const vertical = candidate.id === 'RC-V-EVM-1';
  const actions = [
    { operation: 'materialize_derived', target_evidence_modes: ['derived_formula'] },
    { operation: 'record_campaign', target_evidence_modes: ['campaign'] },
    { operation: 'record_candidate_epoch_close', target_evidence_modes: ['candidate_epoch_close'] },
    ...(vertical ? [{ operation: 'record_database_cutover', target_evidence_modes: ['database_cutover'] }] : []),
    { operation: 'record_freeze_attestation', target_evidence_modes: ['freeze_attestation'] },
    { operation: 'record_measurement', target_evidence_modes: ['measurement'] },
    {
      operation: 'record_upstream_nonpass',
      target_evidence_modes: ['validation','freeze_attestation','campaign','measurement',...(vertical ? ['database_cutover'] : [])]
    },
    { operation: 'record_validation', target_evidence_modes: ['validation'] }
  ];
  const allowed = cset(ledger, candidate.id, 'allowed_next_action', actions, (record) => record.operation);
  const tooling = cset(
    ledger,
    candidate.id,
    'planned_tooling_subject',
    toolingRecords(ledger, config.releaseIds),
    (record) => keyParts(record.contribution_id, record.contribution_version)
  );
  const resourcePolicy = buildResourceProfilePolicy(ledger, vertical);
  const resourcePolicyRoot = resourcePolicy.policy_root;
  const evalNodeCount = evaluation.members.filter((record) => record.member_kind !== 'contribution').length;
  const releaseNodeCount = release.members.filter((record) => record.member_kind !== 'contribution').length;
  const evalContributionCount = evaluation.count - evalNodeCount;
  const releaseContributionCount = release.count - releaseNodeCount;
  return {
    candidate_epoch_id: candidate.id,
    candidate_epoch_kind: candidate.candidate_epoch_kind,
    ...(config.parent ? { parent_candidate_epoch_id: config.parent } : {}),
    scope_ids: candidate.epoch_constants.scope_ids,
    evaluation_closure_member_records: evaluation.members,
    evaluation_closure_member_count: evaluation.count,
    evaluation_closure_member_set_root: evaluation.root,
    release_train_closure_member_records: release.members,
    release_train_closure_member_count: release.count,
    release_train_closure_member_set_root: release.root,
    required_pass_member_records: requiredPass.members,
    required_pass_member_count: requiredPass.count,
    required_pass_member_set_root: requiredPass.root,
    pass_claim_target_records: claimTargets.members,
    pass_claim_target_count: claimTargets.count,
    pass_claim_target_set_root: claimTargets.root,
    evaluation_observation_records: observations.members,
    evaluation_observation_count: observations.count,
    evaluation_observation_set_root: observations.root,
    planned_operational_gate_records: gates.members,
    planned_operational_gate_count: gates.count,
    planned_operational_gate_set_root: gates.root,
    planned_input_subject_records: inputs.members,
    planned_input_subject_count: inputs.count,
    planned_input_subject_set_root: inputs.root,
    allowed_next_action_records: allowed.members,
    allowed_next_action_count: allowed.count,
    allowed_next_action_set_root: allowed.root,
    planned_tooling_subject_records: tooling.members,
    planned_tooling_subject_count: tooling.count,
    planned_tooling_subject_set_root: tooling.root,
    resource_profile_policy_id: resourcePolicy.policy_id,
    resource_profile_policy_version: resourcePolicy.policy_version,
    resource_profile_policy_root: resourcePolicyRoot,
    evaluation_node_count: evalNodeCount,
    release_train_node_count: releaseNodeCount,
    evaluation_contribution_count: evalContributionCount,
    release_train_contribution_count: releaseContributionCount,
    closure_transition_target_id: config.closeTarget,
    ...(config.releaseTerminal ? { release_terminal_target_id: config.releaseTerminal } : {}),
    contamination_successor_required: config.contaminationSuccessor
  };
}

function buildResourceProfilePolicy(ledger, vertical) {
  const payload = {
    schema_version: 'solguard-resource-profile-policy.v1',
    program_id: ledger.program_id,
    program_version: ledger.program_version,
    policy_id: vertical ? 'solguard-resource-profile-policy-vertical-v1' : 'solguard-resource-profile-policy-full-v1',
    policy_version: 1,
    required_profile_fields: [...RESOURCE_PROFILE_REQUIRED_FIELDS],
    hard_rates: { ...RESOURCE_PROFILE_HARD_RATES },
    rate_comparison_semantics:
      'actual_rate_strictly_less_than_configured_max; actual_count_lte_configured_max',
    workload_burden_limits: { ...RESOURCE_PROFILE_WORKLOAD_LIMITS }
  };
  return {
    ...payload,
    policy_root: domainHash('solguard:resource-profile-policy:v1', payload)
  };
}

function applyEpoch(node, registry) {
  node.epoch_constants = {
    candidate_epoch_id: node.id,
    candidate_epoch_kind: node.candidate_epoch_kind,
    ...(registry.parent_candidate_epoch_id ? { parent_candidate_epoch_id: registry.parent_candidate_epoch_id } : {}),
    scope_ids: registry.scope_ids,
    contamination_successor_required: registry.contamination_successor_required,
    evaluation_closure_member_set_root: registry.evaluation_closure_member_set_root,
    evaluation_closure_member_count: registry.evaluation_closure_member_count,
    release_train_closure_member_set_root: registry.release_train_closure_member_set_root,
    release_train_closure_member_count: registry.release_train_closure_member_count,
    required_pass_member_set_root: registry.required_pass_member_set_root,
    required_pass_member_count: registry.required_pass_member_count,
    pass_claim_target_set_root: registry.pass_claim_target_set_root,
    pass_claim_target_count: registry.pass_claim_target_count,
    evaluation_observation_set_root: registry.evaluation_observation_set_root,
    evaluation_observation_count: registry.evaluation_observation_count,
    planned_operational_gate_set_root: registry.planned_operational_gate_set_root,
    planned_operational_gate_count: registry.planned_operational_gate_count,
    planned_input_subject_set_root: registry.planned_input_subject_set_root,
    planned_input_subject_count: registry.planned_input_subject_count,
    allowed_next_action_set_root: registry.allowed_next_action_set_root,
    allowed_next_action_count: registry.allowed_next_action_count,
    planned_tooling_subject_set_root: registry.planned_tooling_subject_set_root,
    planned_tooling_subject_count: registry.planned_tooling_subject_count,
    resource_profile_policy_id: registry.resource_profile_policy_id,
    resource_profile_policy_version: registry.resource_profile_policy_version,
    resource_profile_policy_root: registry.resource_profile_policy_root
  };
  const required = new Set(node.evidence_descriptor.required || []);
  [
    'evaluation_closure_member_set_root','evaluation_closure_member_count',
    'release_train_closure_member_set_root','release_train_closure_member_count',
    'required_pass_member_set_root','required_pass_member_count',
    'pass_claim_target_set_root','pass_claim_target_count',
    'planned_tooling_subject_set_root','planned_tooling_subject_count',
    'accepted_tooling_membership_root','accepted_tooling_membership_count',
    'resource_profile_policy_id','resource_profile_policy_version','resource_profile_policy_root',
    'resource_profile_id','resource_profile_version','resource_profile_root',
    'resource_profile_policy_compliance_root',
    'run_input_membership_root','run_input_membership_count'
  ].forEach((field) => required.add(field));
  node.evidence_descriptor.required = [...required].filter((field) =>
    ![
      'claim_required_pass_set_root','claim_required_pass_count',
      'claim_observation_set_root','claim_observation_count',
      'evaluation_closure_id_set_root','evaluation_closure_id_count',
      'release_train_closure_id_set_root','release_train_closure_id_count'
    ].includes(field)
  );
}

async function rebuild() {
  const [raw, commits] = await Promise.all([
    readFile(P('acceptance-ledger.v1.json'), 'utf8'),
    readFile(P('06_PLAN_DE_COMMITS.md'), 'utf8')
  ]);
  const ledger = deepVersion(JSON.parse(raw));
  ledger.program_version = VERSION;
  ledger.assurance_mode = 'development';
  ledger.assurance_level = 'single-custodian';
  const rows = parseRows(commits);
  const contributions = new Map(ledger.contributions.map((item) => [item.contribution_id, item]));
  const template = ledger.contributions.find((item) =>
    item.source?.row_kind === 'concrete_row' &&
    item.evidence_descriptor?.profile === 'contribution_implementation'
  );
  ok(template, 'contribution template missing');
  const parents = parentMap();
  const missing = rows.filter((row) => !contributions.has(row.id));
  ok(
    missing.length === 39 || missing.length === 0,
    'expected migration state with 39 missing or rebuilt state with 0 missing, got ' + missing.length
  );
  for (const row of rows) {
    let item = contributions.get(row.id);
    if (!item) {
      ok(parents.has(row.id), 'parent mapping missing for ' + row.id);
      item = makeContribution(template, row, parents.get(row.id));
      ledger.contributions.push(item);
      contributions.set(row.id, item);
    } else updateRow(item, row);
  }
  for (const [id, ids] of newDeps()) setContributionDeps(contributions.get(id), ids);
  const downstream = new Map([
    ['C3-006',['C3-005H']],['C4-012',['C4-011E']],
    ['C6-C-06',['C6-C-05B']],['C6-C-07',['C6-C-06A']],['C6-C-08',['C6-C-08A']],
    ['C6-CPP-06',['C6-CPP-05B']],['C6-CPP-07',['C6-CPP-06A']],['C6-CPP-09',['C6-CPP-09A']],
    ['C7-002',['C7-001I']]
  ]);
  for (const [id, ids] of downstream) addContributionDeps(contributions.get(id), ids);
  // Genesis cannot depend on the post-genesis replay/loss gate.
  setContributionDeps(contributions.get('C0-003'), ['C0-001']);

  const nodes = new Map(ledger.nodes.map((node) => [node.id, node]));
  const primaryTemplate = nodes.get('MODEL-410');
  const gov = nodes.get('GOV-001');
  gov.required_contribution_ids = ['C0-001'];
  const oldBaselineCriteria = new Set([
    'pinned_current_state_v1_v8_and_90_lab_replay_completed_before_program_baseline',
    'baseline_replay_classified_KNOWN_and_never_blind_credit',
    'first_observable_stage_loss_ledger_complete_without_missing_evidence_imputation',
    'baseline_artifacts_content_addressed_and_candidate_independent'
  ]);
  gov.predicate.must_hold = gov.predicate.must_hold.filter((criterion) => !oldBaselineCriteria.has(criterion));
  for (const id of ['C0-001A','C0-001B']) {
    const item = contributions.get(id);
    item.parent_primary_id = 'BASELINE-009';
    item.parent_primary_ids = ['BASELINE-009'];
    item.integration_gate = 'BASELINE-009';
    item.declared_parent_id = 'BASELINE-009';
    item.expected_commit.declared_parent_marker = 'BASELINE-009';
    item.evidence_descriptor.profile = 'contribution_implementation';
  }
  let baseline = nodes.get('BASELINE-009');
  if (!baseline) {
    baseline = makePrimary(primaryTemplate, 'BASELINE-009', 'solguard-deploy', [dep('GOV-001')], ['C0-001A','C0-001B']);
    baseline.predicate.must_hold.push(
      'pinned_current_state_v1_v8_and_complete_90_lab_manifest_replayed_without_product_mutation',
      'baseline_classified_KNOWN_and_never_credited_as_blind',
      'first_observable_stage_loss_ledger_has_no_missing_evidence_imputation',
      'audit_and_program_roots_are_immutable_candidate_independent_snapshots'
    );
    ledger.nodes.push(baseline);
    nodes.set(baseline.id, baseline);
  }
  let model411 = nodes.get('MODEL-411');
  if (!model411) {
    model411 = makePrimary(primaryTemplate, 'MODEL-411', 'solguard-economic', [
      dep('MODEL-403'),dep('MODEL-404'),dep('MODEL-410')
    ], ['C3-013J','C3-013K','C3-013L','C3-013M','C3-013N','C3-013O','C3-013P']);
    model411.produced_contracts = [{
      contract_id: 'solguard-economic-adversary-model.v1',
      contract_version: 'v1'
    }];
    model411.predicate.must_hold.push(
      'bounded_capital_liquidity_cost_market_and_ordering_constraints',
      'all_readers_verified_with_writer_off_before_writer_activation',
      'satisfiable_unsat_unknown_preserve_bounds_and_provenance',
      'independent_consumers_rederive_realistic_net_economic_delta'
    );
    ledger.nodes.push(model411);
    nodes.set(model411.id, model411);
  }
  addRequired(nodes.get('IR-303'), ['C3-005A','C3-005B','C3-005C','C3-005D','C3-005E','C3-005F','C3-005G','C3-005H']);
  addRequired(nodes.get('MODEL-404'), ['C3-013C','C3-013D','C3-013E','C3-013F','C3-013G','C3-013H','C3-013I']);
  addRequired(nodes.get('MODEL-406'), ['C3-016D','C3-016E','C3-016F']);
  addRequired(nodes.get('PROOF-506'), ['C4-011A','C4-011B','C4-011C','C4-011D','C4-011E']);
  addRequired(nodes.get('LANG-C-03-INTEGRATION'), ['C6-C-05B']);
  addRequired(nodes.get('LANG-C-04-INTEGRATION'), ['C6-C-06A']);
  addRequired(nodes.get('LANG-C-05-INTEGRATION'), ['C6-C-08A']);
  addRequired(nodes.get('LANG-CPP-02-INTEGRATION'), ['C6-CPP-05B','C6-CPP-06A']);
  addRequired(nodes.get('LANG-CPP-03-INTEGRATION'), ['C6-CPP-09A']);
  addRequired(nodes.get('MEASURE-901'), ['C7-001I','C7-002P','C7-002Q']);
  addDep(nodes.get('MODEL-409'), dep('MODEL-410'));
  addDep(nodes.get('MODEL-409'), dep('MODEL-411'));
  addDep(nodes.get('PROOF-501'), dep('MODEL-411', 'contract', {
    contract_id: 'solguard-economic-adversary-model.v1',
    contract_version: 'v1'
  }));

  const rcV = nodes.get('RC-V-EVM-1');
  const rcF = nodes.get('RC-FULL-1');
  addDep(rcV, dep('BASELINE-009'));
  addDep(rcF, dep('DB-902'));
  rcF.dependencies = rcF.dependencies.filter((edge) =>
    edge.id !== 'VERTICAL-EVM-CONTAMINATION-CLOSE-001'
  );
  rcF.dependencies.push({
    id: 'VERTICAL-EVM-CONTAMINATION-CLOSE-001',
    type: 'compound',
    dependency_bindings: [
      { dependency_type: 'hard' },
      {
        dependency_type: 'contract',
        contract_id: 'solguard-candidate-epoch-closure-receipt.v1',
        contract_version: 'v1'
      }
    ].sort((a, b) => cmp(jcs(a), jcs(b)))
  });
  const db = nodes.get('DB-902');
  db.operational = true;
  db.terminalizable = true;
  db.transition_operation = 'record_database_cutover';
  db.candidate_epoch_id = 'RC-V-EVM-1';
  Object.assign(db.acceptance, {
    terminal_outcome_root: null,
    terminal_reason_root: null,
    upstream_nonpass_receipt_root: null
  });
  const blind = nodes.get('BLIND-911');
  blind.evidence_descriptor.cardinality.operand_event_ids = 64;
  blind.evidence_descriptor.cardinality.operand_evidence_roots = 64;
  blind.evidence_descriptor.cardinality.scope_replica_count = 60;
  for (const node of ledger.nodes.filter((x) => x.kind === 'primary')) node.terminalizable ??= false;

  const vClaimIds = ['CLAIM-VERTICAL-EVM-001'];
  const fClaimIds = ['CLAIM-001','CLAIM-002','CLAIM-003','CLAIM-004','CLAIM-005','CLAIM-006'];
  const postClose = new Set([
    'RC-FULL-1-CLOSE','FINAL-001','FINAL-002','FINAL-003','FINAL-004','FINAL-005','FINAL-006','FINAL-007',
    'CLAIM-007','CLAIM-008','RELEASE-914'
  ]);
  const vEvalNodes = ledger.nodes.filter((node) =>
    node.candidate_epoch_id === 'RC-V-EVM-1' &&
    !['RC-V-EVM-1','VERTICAL-EVM-CONTAMINATION-CLOSE-001',...vClaimIds].includes(node.id)
  );
  const fEvalNodes = ledger.nodes.filter((node) =>
    node.candidate_epoch_id === 'RC-FULL-1' &&
    node.id !== 'RC-FULL-1' &&
    !postClose.has(node.id) &&
    !fClaimIds.includes(node.id)
  );
  const vClaims = vClaimIds.map((id) => nodes.get(id));
  const fClaims = fClaimIds.map((id) => nodes.get(id));
  for (const node of [...vEvalNodes,...fEvalNodes]) if (node.kind === 'primary') node.terminalizable = true;
  rcV.terminalizable = false;
  rcF.terminalizable = false;
  nodes.get('VERTICAL-EVM-CONTAMINATION-CLOSE-001').terminalizable = false;

  let fullClose = nodes.get('RC-FULL-1-CLOSE');
  const rebuiltClose = makeFullClose(nodes.get('VERTICAL-EVM-CONTAMINATION-CLOSE-001'), fEvalNodes, fClaims);
  if (fullClose) Object.assign(fullClose, rebuiltClose);
  else {
    fullClose = rebuiltClose;
    ledger.nodes.push(fullClose);
    nodes.set(fullClose.id, fullClose);
  }
  const final1 = nodes.get('FINAL-001');
  addDep(final1, dep('RC-FULL-1-CLOSE'));
  addDep(final1, dep('RC-FULL-1-CLOSE', 'contract', {
    contract_id: 'solguard-candidate-epoch-closure-receipt.v1',
    contract_version: 'v1',
    required_closure_outcome: 'closed_pass'
  }));
  final1.predicate.must_hold = sorted([...final1.predicate.must_hold, 'RC_FULL_1_CLOSE_exact_closed_pass_receipt']);
  const final7 = nodes.get('FINAL-007');
  final7.predicate.must_hold = sorted(final7.predicate.must_hold.filter((criterion) =>
    !criterion.startsWith('dynamic_') &&
    !criterion.startsWith('zero_pending_and_zero_reopened_across_primary_and_contributions') &&
    criterion !== 'accept_final_007_and_recompute_all_derived_in_one_tentative_post_state'
  ).concat([
    'exact_RC_FULL_1_release_train_closure_only',
    'RC_FULL_1_CLOSE_exact_closed_pass_receipt',
    'CLAIM_007_true_in_same_tentative_post_state',
    'every_release_train_primary_accepted_derived_satisfied_and_contribution_accepted',
    'zero_pending_or_reopened_only_within_exact_release_train_closure'
  ]));

  ledger.nodes.sort((a, b) => cmp(a.id, b.id));
  ledger.contributions.sort((a, b) => cmp(a.contribution_id, b.contribution_id));
  const domainIds = ['common','RC-V-EVM-1','RC-FULL-1'];
  const ownershipDomains = domainIds.map((domainId) => {
    const members = [
      ...ledger.nodes.filter((node) => node.closure_domain_id === domainId).map((node) => 'node:' + node.id),
      ...ledger.contributions.filter((item) => item.closure_domain_id === domainId).map((item) => 'contribution:' + item.contribution_id)
    ];
    const commitment = pset(ledger, domainId, 'ownership_domain_' + domainId, members, String);
    return {
      domain_id: domainId,
      membership_ids: commitment.members,
      membership_count: commitment.count,
      membership_root: commitment.root
    };
  });
  const common = ownershipDomains.find((x) => x.domain_id === 'common').membership_ids;
  const fullOwned = ownershipDomains.find((x) => x.domain_id === 'RC-FULL-1').membership_ids;
  const oldV = ledger.candidate_epoch_registry.find((x) => x.candidate_epoch_id === 'RC-V-EVM-1');
  const excludedMemory = new Set(['C6-C-05B','C6-C-06A','C6-C-08A','C6-CPP-05B','C6-CPP-06A','C6-CPP-09A']);
  const priorVerticalEvaluationIds = oldV.release_train_closure_ids ||
    oldV.evaluation_closure_member_records.map((record) =>
      (record.member_kind === 'contribution' ? 'contribution:' : 'node:') + record.member_id
    );
  const vEvalIds = sorted([
    ...priorVerticalEvaluationIds.filter((id) => id !== 'node:VERTICAL-EVM-CONTAMINATION-CLOSE-001'),
    'node:BASELINE-009',
    'node:MODEL-411',
    'node:PROOF-506',
    'contribution:C4-011',
    'contribution:C4-012',
    ...missing.map((row) => row.id).filter((id) => !excludedMemory.has(id)).map((id) => 'contribution:' + id)
  ]);
  const vReleaseIds = sorted([...vEvalIds,'node:VERTICAL-EVM-CONTAMINATION-CLOSE-001']);
  const fReleaseIds = sorted([...common,...fullOwned,'node:VERTICAL-EVM-CONTAMINATION-CLOSE-001']);
  const fEvalIds = fReleaseIds.filter((id) => !postClose.has(id.replace(/^node:/, '')));

  const vRegistry = buildRegistry(ledger, nodes, {
    candidate: rcV,
    evaluationIds: vEvalIds,
    releaseIds: vReleaseIds,
    evaluationNodes: vEvalNodes,
    claimNodes: vClaims,
    closeTarget: 'VERTICAL-EVM-CONTAMINATION-CLOSE-001',
    contaminationSuccessor: true
  });
  const fRegistry = buildRegistry(ledger, nodes, {
    candidate: rcF,
    evaluationIds: fEvalIds,
    releaseIds: fReleaseIds,
    evaluationNodes: fEvalNodes,
    claimNodes: fClaims,
    closeTarget: 'RC-FULL-1-CLOSE',
    releaseTerminal: 'FINAL-007',
    parent: 'RC-V-EVM-1',
    contaminationSuccessor: false
  });
  fRegistry.historical_boundary_member_records = [{
    member_kind: 'primary',
    member_id: 'VERTICAL-EVM-CONTAMINATION-CLOSE-001',
    subject_version: nodes.get('VERTICAL-EVM-CONTAMINATION-CLOSE-001').node_version,
    contract_id: 'solguard-candidate-epoch-closure-receipt.v1',
    contract_version: 'v1',
    accepted_closure_outcomes: ['closed_pass','closed_nonpass'],
    dependency_expansion: 'forbidden'
  }];
  function bindCloseCardinality(closeNode, registry, claimIds) {
    const claimSet = new Set(claimIds);
    const terminalMembers = registry.evaluation_closure_member_records.filter((record) =>
      !claimSet.has(record.member_id)
    );
    closeNode.evidence_descriptor.cardinality = {
      terminal_state_binding_count: terminalMembers.length,
      primary_terminal_state_binding_count: terminalMembers.filter((record) => record.member_kind === 'primary').length,
      derived_terminal_state_binding_count: terminalMembers.filter((record) => record.member_kind === 'derived').length,
      contribution_terminal_state_binding_count: terminalMembers.filter((record) => record.member_kind === 'contribution').length,
      claim_observation_records: claimIds.length,
      claim_observation_count: claimIds.length
    };
    const required = new Set(closeNode.evidence_descriptor.required || []);
    [
      'evaluation_closure_member_set_root','evaluation_closure_member_count',
      'release_train_closure_member_set_root','release_train_closure_member_count',
      'required_pass_member_set_root','required_pass_member_count',
      'pass_claim_target_set_root','pass_claim_target_count',
      'terminal_state_binding_set_root','terminal_state_binding_count',
      'claim_observation_records','claim_observation_count','claim_observation_set_root',
      'proposed_closure_outcome'
    ].forEach((field) => required.add(field));
    [
      'evaluation_closure_id_set_root','evaluation_closure_id_count',
      'release_train_closure_id_set_root','release_train_closure_id_count',
      'claim_required_pass_set_root','claim_required_pass_count',
      'derived_claim_evaluation_event_id','derived_claim_result','derived_claim_evaluation_root'
    ].forEach((field) => required.delete(field));
    closeNode.evidence_descriptor.required = [...required];
  }
  const verticalClose = nodes.get('VERTICAL-EVM-CONTAMINATION-CLOSE-001');
  verticalClose.dependencies = verticalClose.dependencies.filter((edge) =>
    edge.id !== 'CLAIM-VERTICAL-EVM-001' && edge.id !== 'DB-902'
  );
  verticalClose.dependencies.push({
    id: 'DB-902',
    type: 'terminal_observation',
    required_states: ['accepted','terminal_failed','terminal_invalid','insufficient_evidence','terminal_not_run'],
    evidence_root: 'required',
    pending_reopened_or_missing: 'reject'
  });
  verticalClose.dependencies.push({
    id: 'CLAIM-VERTICAL-EVM-001',
    type: 'claim_observation',
    required_computed_states: ['satisfied','unsatisfied'],
    evaluation_receipt_root: 'required',
    operand_state_hash: 'required',
    missing_or_stale_receipt: 'reject'
  });
  verticalClose.predicate.must_hold = sorted([
    ...verticalClose.predicate.must_hold,
    'close_receipt_accepted_for_evidence_complete_pass_or_nonpass',
    'terminal_bindings_equal_evaluation_closure_minus_pass_claim_target',
    'claim_observation_equals_exact_pass_claim_target'
  ]);
  bindCloseCardinality(verticalClose, vRegistry, vClaimIds);
  bindCloseCardinality(fullClose, fRegistry, fClaimIds);
  ledger.candidate_epoch_registry = [vRegistry,fRegistry];
  ledger.resource_profile_policy_registry = [
    buildResourceProfilePolicy(ledger, true),
    buildResourceProfilePolicy(ledger, false)
  ];
  applyEpoch(rcV, vRegistry);
  applyEpoch(rcF, fRegistry);
  for (const candidate of [rcV,rcF]) {
    candidate.evidence_descriptor.required = unique((candidate.evidence_descriptor.required || []).filter((field) =>
      !/planned_(vertical|full)_tooling|^(vertical|full)_tooling_set/.test(field)
    ));
    candidate.evidence_descriptor.forbidden = unique((candidate.evidence_descriptor.forbidden || []).filter((field) =>
      !/planned_(vertical|full)_tooling|^(vertical|full)_tooling_set/.test(field)
    ));
  }
  rcF.evidence_descriptor.required = unique(rcF.evidence_descriptor.required
    .filter((field) => !['contamination_close_event_id','contamination_close_root'].includes(field))
    .concat(['parent_candidate_epoch_closure_event_id','parent_candidate_epoch_closure_root'])
  );
  rcV.evidence_descriptor.forbidden = unique(rcV.evidence_descriptor.forbidden.concat([
    'parent_candidate_epoch_id','parent_candidate_epoch_closure_event_id','parent_candidate_epoch_closure_root'
  ]));

  const candidateSetSpecs = [
    ['evaluation_closure','evaluation_closure_member_set_root','evaluation_closure_member_count','evaluation_closure_member_records','NUL_separated_member_kind_member_id_subject_version'],
    ['release_train_closure','release_train_closure_member_set_root','release_train_closure_member_count','release_train_closure_member_records','NUL_separated_member_kind_member_id_subject_version'],
    ['required_pass_member','required_pass_member_set_root','required_pass_member_count','required_pass_member_records','NUL_separated_member_kind_member_id_subject_version'],
    ['pass_claim_target','pass_claim_target_set_root','pass_claim_target_count','pass_claim_target_records','NUL_separated_node_id_node_version'],
    ['evaluation_observation','evaluation_observation_set_root','evaluation_observation_count','evaluation_observation_records','NUL_separated_observation_kind_node_id_node_version'],
    ['planned_operational_gate','planned_operational_gate_set_root','planned_operational_gate_count','planned_operational_gate_records','NUL_separated_node_id_node_version'],
    ['planned_input_subject','planned_input_subject_set_root','planned_input_subject_count','planned_input_subject_records','NUL_separated_member_kind_member_id_subject_version'],
    ['allowed_next_action','allowed_next_action_set_root','allowed_next_action_count','allowed_next_action_records','operation'],
    ['planned_tooling_subject','planned_tooling_subject_set_root','planned_tooling_subject_count','planned_tooling_subject_records','NUL_separated_contribution_id_contribution_version']
  ].map(([set_kind,root_field,count_field,members_field,logical_key_rule]) => ({
    set_kind,root_field,count_field,members_field,logical_key_rule
  }));
  const candidateDomain = 'solguard:candidate-set:' + '$' + '{set_kind}:v1';
  const programDomain = 'solguard:program-set:' + '$' + '{set_kind}:v1';
  ledger.canonical_set_commitment_contract = {
    schema_version: SET_SCHEMA,
    candidate_domain: candidateDomain,
    program_domain: programDomain,
    preimage: 'UTF8(domain) || 0x00 || RFC8785_JCS(closed_payload)',
    candidate_payload_required: [
      'schema_version','program_id','program_version','candidate_epoch_id','set_kind','member_count','members'
    ],
    program_payload_required: [
      'schema_version','program_id','program_version','subject','set_kind','member_count','members'
    ],
    ordering: 'logical_key_rule ascending by deterministic code-unit comparator',
    duplicate_logical_key: 'reject',
    sets: candidateSetSpecs,
    program_sets: []
  };
  ledger.closure_domain_contract = {
    membership_frozen_at_genesis: true,
    post_result_membership_edit: 'forbidden_new_program_version_required',
    ownership_domains: ownershipDomains,
    candidate_domains: [
      {
        domain_id: 'RC-V-EVM-1/evaluation',
        set_kind: 'evaluation_closure',
        membership_records: vRegistry.evaluation_closure_member_records,
        membership_count: vRegistry.evaluation_closure_member_count,
        membership_root: vRegistry.evaluation_closure_member_set_root
      },
      {
        domain_id: 'RC-V-EVM-1/release',
        set_kind: 'release_train_closure',
        membership_records: vRegistry.release_train_closure_member_records,
        membership_count: vRegistry.release_train_closure_member_count,
        membership_root: vRegistry.release_train_closure_member_set_root
      },
      {
        domain_id: 'RC-FULL-1/evaluation',
        set_kind: 'evaluation_closure',
        membership_records: fRegistry.evaluation_closure_member_records,
        membership_count: fRegistry.evaluation_closure_member_count,
        membership_root: fRegistry.evaluation_closure_member_set_root
      },
      {
        domain_id: 'RC-FULL-1/release',
        set_kind: 'release_train_closure',
        membership_records: fRegistry.release_train_closure_member_records,
        membership_count: fRegistry.release_train_closure_member_count,
        membership_root: fRegistry.release_train_closure_member_set_root
      }
    ],
    terminal_quantifier: 'exact_RC-FULL-1_release_train_closure_only',
    vertical_claim_quantifier: 'exact_RC-V-EVM-1_evaluation_closure_only',
    partition_rule: 'terminal state bindings cover evaluation closure minus pass-claim targets; runtime claim observations cover exact pass-claim targets; sets are disjoint and union equals evaluation closure',
    evaluation_release_split: 'vertical release adds its close; full release adds close FINAL RELEASE and terminal claim members',
    boundary_rule: 'vertical close is an immutable boundary member in full release; its terminal-observation dependencies and vertical claim do not become transitive full members',
    dependency_closed_rule: 'every dependency producer is within the set or an immutable accepted input receipt'
  };

  Object.assign(ledger.candidate_epoch_contract, {
    schema: 'solguard-candidate-epoch.v1',
    closed: true,
    semantics: 'immutable_definition_with_event_sourced_lifecycle',
    canonical_set_commitment_ref: 'canonical_set_commitment_contract',
    planned_input_subject_record_required: ['member_kind','member_id','subject_version','dependency_bindings'],
    planned_input_dependency_binding_union: {
      hard: ['dependency_type'],
      contract: ['dependency_type','contract_id','contract_version'],
      terminal_boundary: ['dependency_type','contract_id_if_applicable','contract_version_if_applicable']
    },
    accepted_input_member_union: {
      primary: ['member_kind','member_id','subject_version','accepted_event_id','evidence_root','subject_content_root','dependency_state_hash'],
      derived: ['member_kind','member_id','subject_version','evaluation_event_id','evaluation_root','operand_state_hash'],
      contribution: ['member_kind','member_id','subject_version','accepted_event_id','evidence_root','accepted_implementation_ref']
    },
    planned_to_accepted_input_rule: 'same exact unique logical member set; runtime branch adds per-kind acceptance data',
    accepted_tooling_member_union: {
      implementation_ref: ['contribution_id','contribution_version','accepted_event_id','evidence_root','accepted_implementation_ref','repository_commit_sha','repository_tree_sha','publication_receipt_root','candidate_tree_containment_proof_root'],
      absence_tree_receipt: ['contribution_id','contribution_version','accepted_event_id','evidence_root','repository_commit_sha','repository_tree_sha','publication_receipt_root','absence_tree_receipt_root','bounded_inventory_root','candidate_tree_containment_proof_root']
    },
    tooling_set_rule: 'all contributions in release train exactly once and accepted before open with commit tree publication and containment',
    source_change_after_open_or_freeze: 'forbidden_new_candidate_epoch_required'
  });
  ledger.candidate_epoch_contract.conditional_fields = {
    initial_vertical: {
      required: [
        'contamination_successor_required=true',
        'planned_tooling_subject_set_root','planned_tooling_subject_count',
        'resource_profile_policy_id','resource_profile_policy_version','resource_profile_policy_root',
        'resource_profile_id','resource_profile_version','resource_profile_root',
        'resource_profile_policy_compliance_root'
      ],
      forbidden: [
        'parent_candidate_epoch_id','parent_candidate_epoch_closure_event_id',
        'parent_candidate_epoch_closure_root'
      ]
    },
    full_successor: {
      required: [
        'parent_candidate_epoch_id','parent_candidate_epoch_closure_event_id',
        'parent_candidate_epoch_closure_root','contamination_successor_required=false',
        'planned_tooling_subject_set_root','planned_tooling_subject_count',
        'resource_profile_policy_id','resource_profile_policy_version','resource_profile_policy_root',
        'resource_profile_id','resource_profile_version','resource_profile_root',
        'resource_profile_policy_compliance_root'
      ],
      forbidden: ['successor_candidate_epoch_id','successor_candidate_epoch_root']
    }
  };
  ledger.candidate_epoch_contract.tooling_boundary_rule =
    'planned tooling contributions are immutable accepted leaf receipts; their parent and dependency DAG is verified at contribution acceptance and is not expanded into the candidate evaluation closure';
  const candidateRequired = new Set(ledger.candidate_epoch_contract.required || []);
  [
    'evaluation_closure_member_set_root','evaluation_closure_member_count',
    'release_train_closure_member_set_root','release_train_closure_member_count',
    'required_pass_member_set_root','required_pass_member_count',
    'pass_claim_target_set_root','pass_claim_target_count',
    'planned_tooling_subject_set_root','planned_tooling_subject_count',
    'accepted_tooling_membership_root','accepted_tooling_membership_count',
    'resource_profile_policy_id','resource_profile_policy_version','resource_profile_policy_root',
    'resource_profile_id','resource_profile_version','resource_profile_root',
    'resource_profile_policy_compliance_root'
  ].forEach((field) => candidateRequired.add(field));
  [
    'claim_required_pass_set_root','claim_required_pass_count','claim_observation_set_root','claim_observation_count',
    'evaluation_closure_id_set_root','evaluation_closure_id_count',
    'release_train_closure_id_set_root','release_train_closure_id_count'
  ].forEach((field) => candidateRequired.delete(field));
  ledger.candidate_epoch_contract.required = [...candidateRequired];

  Object.assign(ledger.candidate_epoch_closure_receipt_contract, {
    schema: 'solguard-candidate-epoch-closure-receipt.v1',
    closed: true,
    terminal_member_binding_union: {
      primary: ['member_kind','member_id','subject_version','terminal_state','terminal_event_id','subject_content_root','evidence_root'],
      derived: ['member_kind','member_id','subject_version','computed_result','evaluation_event_id','evaluation_root','operand_state_hash'],
      contribution: ['member_kind','member_id','subject_version','terminal_state','accepted_event_id','evidence_root','accepted_implementation_ref']
    },
    exact_partition_rule: 'terminal binding keys and runtime claim observation keys are disjoint; their union equals exact frozen evaluation closure',
    outcome_biconditional: {
      closed_pass: 'all required-pass members pass AND every pass-claim target is satisfied',
      closed_nonpass: 'all partitions terminal AND closed-pass predicate is false'
    },
    claim_observation_rule: 'runtime claim_observation_records matches exact pass_claim_target set and never appears in generic evaluation observations'
  });
  const closureRequired = new Set(ledger.candidate_epoch_closure_receipt_contract.required || []);
  [
    'evaluation_closure_member_set_root','evaluation_closure_member_count',
    'release_train_closure_member_set_root','release_train_closure_member_count',
    'required_pass_member_set_root','required_pass_member_count',
    'pass_claim_target_set_root','pass_claim_target_count',
    'claim_observation_records','claim_observation_count','claim_observation_set_root',
    'proposed_closure_outcome','closure_outcome'
  ].forEach((field) => closureRequired.add(field));
  [
    'claim_required_pass_set_root','claim_required_pass_count',
    'derived_claim_evaluation_event_id','derived_claim_result','derived_claim_evaluation_root'
  ].forEach((field) => closureRequired.delete(field));
  ledger.candidate_epoch_closure_receipt_contract.required = [...closureRequired];
  ledger.candidate_epoch_closure_receipt_contract.vertical_branch = {
    required: ['TRAIN_DEV_contamination_classification_root','contamination_successor_required_true','pass_claim_target_exact_CLAIM_VERTICAL_EVM_001']
  };
  ledger.candidate_epoch_closure_receipt_contract.full_terminal_branch = {
    required: ['pass_claim_targets_exact_CLAIM_001_through_CLAIM_006','parent_candidate_epoch_closure_event_id','parent_candidate_epoch_closure_root'],
    contamination_successor_required: false,
    forbidden: ['successor_required','contamination_import','DSSE_release_manifest','tag_realization_receipt']
  };
  const closeTransitionRequired = new Set(ledger.candidate_epoch_close_transition_contract.required || []);
  [
    'evaluation_closure_member_set_root','evaluation_closure_member_count',
    'release_train_closure_member_set_root','release_train_closure_member_count',
    'required_pass_member_set_root','required_pass_member_count',
    'pass_claim_target_set_root','pass_claim_target_count',
    'claim_observation_records','claim_observation_count','claim_observation_set_root',
    'proposed_closure_outcome'
  ].forEach((field) => closeTransitionRequired.add(field));
  ledger.candidate_epoch_close_transition_contract.required = [...closeTransitionRequired];

  await finalizeLedger(ledger, ownershipDomains, fRegistry);
  normalizeLegacyNames(ledger);
  ledger.meta_states['FINAL-008'].formula =
    'RC-FULL-1 release_train_closure_member_set_root matches; RC-FULL-1-CLOSE is closed_pass; every release primary is accepted, every release derived satisfied, every release contribution accepted, zero pending/reopened mutable release members, CLAIM-007 true, and ID/DAG/contract roots valid';
  return { ledger, rows };
}

async function finalizeLedger(ledger, ownershipDomains, fRegistry) {
  ledger.transition_contract.operations.record_database_cutover = {
    mode: 'database_cutover',
    target_kind: 'primary',
    terminalizable_required: true,
    outcome_union: ['accepted','terminal_failed','terminal_invalid','insufficient_evidence']
  };
  ledger.transition_contract.operations.record_upstream_nonpass.requires = sorted([
    ...(ledger.transition_contract.operations.record_upstream_nonpass.requires || []),
    'target_terminalizable_true','blocking_ancestor_same_candidate_epoch','immutable_proof_target_not_runnable'
  ]);
  ledger.transition_contract.operations.materialize_derived.result_union = ['satisfied','unsatisfied'];
  ledger.transition_contract.operations.materialize_derived.unsatisfied_receipt_rule =
    'unsatisfied is materialized with exact operands and is not pending';
  ledger.transition_contract.common_event_required = sorted([
    ...(ledger.transition_contract.common_event_required || []),
    'event_self_hash','canonical_preimage_domain',
    'previous_authoritative_commit_receipt_ref','previous_authoritative_commit_receipt_root',
    'lease_id','lease_ref','lease_root','fencing_token',
    'expected_ledger_revision','expected_authoritative_head_root','lease_expiry',
    'external_timestamp_quorum_2_of_2','assurance_mode','assurance_level'
  ]);
  ledger.transition_contract.commit_receipt = {
    schema: 'solguard-acceptance-ledger-commit-receipt.v1',
    closed: true,
    required: [
      'assurance_mode','assurance_level',
      'receipt_id','committed_event_id','event_self_hash',
      'previous_authoritative_commit_receipt_ref','previous_authoritative_commit_receipt_root',
      'lease_id','lease_root','fencing_token','expected_ledger_revision','committed_ledger_revision',
      'expected_authoritative_head_root','new_authoritative_head_root',
      'external_timestamp_receipt_set_root','external_timestamp_quorum_2_of_2','receipt_self_hash'
    ],
    preimage: 'UTF8(solguard:ledger-commit-receipt:v1) || 0x00 || RFC8785_JCS(closed receipt without self hash)',
    head_rule: 'next event chains last committed authoritative receipt',
    orphan_rule: 'partial event snapshot or receipt is ignored and cannot advance state'
  };
  ledger.linearizability_contract = {
    schema: 'solguard-acceptance-ledger-linearizability.v1',
    closed: true,
    acquisition: 'lease plus monotonically increasing fencing token',
    compare_and_swap: 'expected revision and authoritative head must both match',
    persistence: 'create-once event plus authoritative commit receipt; head changes only with receipt',
    timestamp_boundary: '2-of-2 external authorities bind event and commit receipt',
    recovery: 'ignore orphan artifacts and retry with new lease and fencing token'
  };
  ledger.live_authorization_contract.assurance_profiles = {
    production: {
      assurance_level: 'independent-custodians',
      required_role_count: 4,
      required_distinct_custodian_count: 4,
      duplicate_key_id_or_public_key_material: 'reject'
    },
    development: {
      assurance_level: 'single-custodian',
      required_role_count: 4,
      required_distinct_custodian_count: 1,
      required_distinct_key_id_count: 4,
      required_distinct_ed25519_public_key_count: 4,
      duplicate_key_id_or_public_key_material: 'reject',
      independence_claim: 'forbidden'
    },
    immutable_after_genesis: true,
    profile_change_rule: 'new_program_version_and_new_genesis_required'
  };
  ledger.genesis_batch.genesis_contribution_set =
    ledger.genesis_batch.genesis_contribution_set.filter((id) => !['C0-001A','C0-001B'].includes(id));
  ledger.genesis_batch.topological_order =
    ledger.genesis_batch.topological_order.filter((id) => !['C0-001A','C0-001B'].includes(id));
  ledger.terminal_transition_contract = {
    operation: 'accept_post_tag_terminal',
    target: 'FINAL-007',
    evaluation: 'tentative_post_state',
    require: [
      'RC-FULL-1-CLOSE accepted with closure_outcome=closed_pass',
      'exact RC-FULL-1 release train root',
      'every primary release member accepted',
      'every derived release member satisfied',
      'every contribution release member accepted',
      'zero pending or reopened release members',
      'CLAIM-007 true in same tentative post-state'
    ],
    historical_state_rule:
      'terminal historical members outside exact full release train are auditable but not quantified',
    on_success: 'persist_once',
    on_failure: 'persist_nothing_leave_exact_pre_state',
    dossier_forbidden: ['post_state_root','self_referential_terminal_root'],
    external_transparency: 'only after successful persistence',
    release_train_closure_member_set_root: fRegistry.release_train_closure_member_set_root,
    release_train_closure_member_count: fRegistry.release_train_closure_member_count
  };

  const nodeIds = ledger.nodes.map((node) => node.id);
  const contributionIds = ledger.contributions.map((item) => item.contribution_id);
  const allTypedIds = [
    ...nodeIds.map((id) => 'node:' + id),
    ...contributionIds.map((id) => 'contribution:' + id)
  ];
  const nodeSet = pset(ledger, 'program', 'node_id', nodeIds, String);
  const contributionSet = pset(ledger, 'program', 'contribution_id', contributionIds, String);
  const allIdSet = pset(ledger, 'program', 'all_counted_item_id', allTypedIds, String);
  ledger.node_id_set_sha256 = nodeSet.root;
  ledger.contribution_id_set_sha256 = contributionSet.root;
  ledger.all_counted_item_id_set_sha256 = allIdSet.root;
  ledger.id_set_sha256 = allIdSet.root;
  delete ledger.closure_id_set_sha256;
  ledger.id_set_hash_algorithm =
    'SHA256(UTF8(solguard:program-set:' + '$' + '{set_kind}:v1) || 0x00 || RFC8785_JCS(closed payload))';
  ledger.canonical_set_commitment_contract.program_sets = [
    {
      set_kind: 'node_id',
      root_field: 'node_id_set_sha256',
      count_field: 'state_counts.primary_total plus state_counts.derived_total',
      members_field: 'nodes[].id',
      logical_key_rule: 'node_id'
    },
    {
      set_kind: 'contribution_id',
      root_field: 'contribution_id_set_sha256',
      count_field: 'state_counts.contribution_total',
      members_field: 'contributions[].contribution_id',
      logical_key_rule: 'contribution_id'
    },
    {
      set_kind: 'all_counted_item_id',
      root_field: 'all_counted_item_id_set_sha256',
      count_field: 'state_counts.counted_item_total',
      members_field: 'type-prefixed nodes and contributions',
      logical_key_rule: 'type_prefix_colon_id'
    },
    ...ownershipDomains.map((domain) => ({
      set_kind: 'ownership_domain_' + domain.domain_id,
      root_field: 'closure_domain_contract.ownership_domains[' + domain.domain_id + '].membership_root',
      count_field: 'closure_domain_contract.ownership_domains[' + domain.domain_id + '].membership_count',
      members_field: 'closure_domain_contract.ownership_domains[' + domain.domain_id + '].membership_ids',
      logical_key_rule: 'type_prefix_colon_id'
    }))
  ];
  const primaries = ledger.nodes.filter((node) => node.kind === 'primary');
  const derived = ledger.nodes.filter((node) => node.kind === 'derived');
  ledger.state_counts = {
    primary_total: primaries.length,
    primary_accepted: primaries.filter((node) => node.state === 'accepted').length,
    derived_total: derived.length,
    derived_satisfied: derived.filter((node) => node.computed_state === 'satisfied').length,
    contribution_total: ledger.contributions.length,
    contribution_accepted: ledger.contributions.filter((item) => item.state === 'accepted').length,
    operational_terminal_nonpass: primaries.filter((node) =>
      ['terminal_failed','terminal_invalid','insufficient_evidence','terminal_not_run'].includes(node.state)
    ).length,
    reopened: [...primaries,...ledger.contributions].filter((item) => item.state === 'reopened').length,
    counted_item_total: primaries.length + derived.length + ledger.contributions.length
  };
  ok(primaries.length === 440, 'primary count ' + primaries.length);
  ok(derived.length === 128, 'derived count ' + derived.length);
  ok(ledger.contributions.length === 1103, 'contribution count ' + ledger.contributions.length);
  ok(ledger.state_counts.counted_item_total === 1671, 'counted count');
}

function replaceSection(text, startHeading, endHeading, replacement) {
  const start = text.indexOf(startHeading);
  const end = text.indexOf(endHeading, start + startHeading.length);
  ok(start >= 0 && end > start, 'section not found: ' + startHeading);
  return text.slice(0, start) + replacement.trimEnd() + '\n\n' + text.slice(end);
}
function mdCode(value) {
  return BT + String(value) + BT;
}
function esc(value) {
  return String(value ?? '—').replaceAll('|', '\\|').replaceAll('\n', ' ');
}
function renderChecklist(ledger) {
  const primary = ledger.nodes.filter((node) => node.kind === 'primary');
  const derived = ledger.nodes.filter((node) => node.kind === 'derived');
  const contributions = ledger.contributions;
  const box = (value) => value ? '[x]' : '[ ]';
  const lines = [
    '# Checklist maestra ejecutable',
    '',
    'Esta vista se genera exclusivamente desde ' + mdCode('acceptance-ledger.v1.json') +
      '; no se marca a mano. Cambiar ID, versión, owner, arista, fórmula, schema, cardinalidad o closure exige una nueva versión y regeneración completa.',
    '',
    '## 1. Identidad canónica',
    '',
    '| Campo | Valor |',
    '|---|---|',
    '| Programa | ' + mdCode(ledger.program_id) + ' |',
    '| Versión | ' + mdCode(ledger.program_version) + ' |',
    '| Assurance mode | ' + mdCode(ledger.assurance_mode) + ' |',
    '| Assurance level | ' + mdCode(ledger.assurance_level) + ' |',
    '| Revisión seed | ' + mdCode(ledger.ledger_revision) + ' |',
    '| Node ID-set root | ' + mdCode(ledger.node_id_set_sha256) + ' |',
    '| Contribution ID-set root | ' + mdCode(ledger.contribution_id_set_sha256) + ' |',
    '| All-counted-item ID-set root | ' + mdCode(ledger.all_counted_item_id_set_sha256) + ' |',
    '| Primaries | **' + primary.length + '** |',
    '| Derived | **' + derived.length + '** |',
    '| Contributions | **' + contributions.length + '** |',
    '| Ítems contados | **' + ledger.state_counts.counted_item_total + '** |',
    '',
    'Todos los sets usan JCS/RFC 8785, separación de dominio y rechazo de claves lógicas duplicadas. Las closures fijan ' +
      mdCode('member_kind + member_id + subject_version') + ', no sólo strings de ID.',
    '',
    '## 2. Reglas de progreso',
    '',
    '1. ' + mdCode('pending') + ' significa no aceptado; implementación o tests locales no cambian el ledger.',
    '2. Cada transición exige evidencia content-addressed, identidades/runs/contexts/claves separados y commit receipt linealizable; la separación de custodio depende del perfil de assurance explícito.',
    '3. Una contribution no acepta su primary; el integrador exige el set exacto y E2E.',
    '4. Un derived se materializa como ' + mdCode('satisfied|unsatisfied') + ' con operands exactos; nunca se marca a mano.',
    '5. Sólo un primary ' + mdCode('terminalizable=true') + ' admite nonpass tipado o ' + mdCode('terminal_not_run') + ' demostrado en el mismo epoch.',
    '6. El close particiona la evaluation closure: terminal bindings para miembros no-claim y claim observations para los pass-claim targets exactos.',
    '7. ' + mdCode('FINAL-007') + ' cuantifica sólo sobre el release train exacto de ' + mdCode('RC-FULL-1') + '.',
    '',
    '## 3. Rollup verificable',
    '',
    '| Clase | Total | Accepted/satisfied | Pending/unsatisfied | Reopened | Terminal nonpass |',
    '|---|---:|---:|---:|---:|---:|',
    '| Primary | ' + primary.length + ' | ' + primary.filter((x) => x.state === 'accepted').length +
      ' | ' + primary.filter((x) => x.state === 'pending').length +
      ' | ' + primary.filter((x) => x.state === 'reopened').length +
      ' | ' + primary.filter((x) => ['terminal_failed','terminal_invalid','insufficient_evidence','terminal_not_run'].includes(x.state)).length + ' |',
    '| Derived | ' + derived.length + ' | ' + derived.filter((x) => x.computed_state === 'satisfied').length +
      ' | ' + derived.filter((x) => x.computed_state !== 'satisfied').length + ' | 0 | ' +
      derived.filter((x) => x.computed_state === 'unsatisfied').length + ' |',
    '| Contribution | ' + contributions.length + ' | ' + contributions.filter((x) => x.state === 'accepted').length +
      ' | ' + contributions.filter((x) => x.state === 'pending').length +
      ' | ' + contributions.filter((x) => x.state === 'reopened').length + ' | 0 |',
    '',
    '### 3.1 Candidate closures',
    '',
    '| Candidate | Evaluation | Release train | Required pass | Pass claims | Observations | Gates | Tooling | Close |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---|'
  ];
  for (const registry of ledger.candidate_epoch_registry) {
    lines.push(
      '| ' + mdCode(registry.candidate_epoch_id) +
      ' | ' + registry.evaluation_closure_member_count +
      ' | ' + registry.release_train_closure_member_count +
      ' | ' + registry.required_pass_member_count +
      ' | ' + registry.pass_claim_target_count +
      ' | ' + registry.evaluation_observation_count +
      ' | ' + registry.planned_operational_gate_count +
      ' | ' + registry.planned_tooling_subject_count +
      ' | ' + mdCode(registry.closure_transition_target_id) + ' |'
    );
  }
  lines.push('', '## 4. Checklist de nodos', '', '### 4.1 Primary', '');
  for (const node of primary) {
    const hard = (node.dependencies || []).filter((edge) => edge.type === 'hard').length;
    const contracts = (node.dependencies || []).filter((edge) => edge.type === 'contract').length;
    lines.push(
      '- ' + box(node.state === 'accepted') + ' ' + mdCode(node.id) + ' — mode=' +
      mdCode(node.evidence_mode) + '; owner=' + mdCode(node.owner) + '; hard=' + hard +
      '; contracts=' + contracts + '; contribs=' + (node.required_contribution_ids?.length || 0) +
      '; terminalizable=' + node.terminalizable + '.'
    );
  }
  lines.push('', '### 4.2 Derived', '');
  for (const node of derived) {
    lines.push(
      '- ' + box(node.computed_state === 'satisfied') + ' ' + mdCode(node.id) +
      ' — formula=' + mdCode(node.formula?.op || 'AND') +
      '; operands=' + (node.formula?.operands?.length || 0) +
      '; computed=' + mdCode(node.computed_state) +
      '; candidate=' + mdCode(node.candidate_epoch_id || 'common') + '.'
    );
  }
  lines.push('', '## 5. Checklist de contributions', '');
  const owners = sorted(contributions.map((item) => item.owner_repo));
  owners.forEach((owner, index) => {
    lines.push('### 5.' + (index + 1) + ' ' + owner, '');
    for (const item of contributions.filter((value) => value.owner_repo === owner)) {
      lines.push(
        '- ' + box(item.state === 'accepted') + ' ' + mdCode(item.contribution_id) +
        ' — parent=' + mdCode(item.parent_primary_id) +
        '; declared=' + mdCode(item.declared_parent_id) +
        '; hard-contrib-deps=' + (item.hard_contribution_dependencies?.length || 0) +
        '; source=' + mdCode(item.source?.row_kind) + '.'
      );
    }
    lines.push('');
  });
  lines.push(
    '## 6. Cierre del programa',
    '',
    '- ' + box(primary.filter((x) => !x.operational).every((x) => x.state === 'accepted')) + ' Primary de implementación/control aceptados.',
    '- ' + box(primary.filter((x) => x.terminalizable).every((x) =>
      ['accepted','terminal_failed','terminal_invalid','insufficient_evidence','terminal_not_run'].includes(x.state)
    )) + ' Primary terminalizables con resultado terminal.',
    '- ' + box(contributions.every((x) => x.state === 'accepted')) + ' Las ' + contributions.length + ' contributions aceptadas.',
    '- ' + box(derived.every((x) => x.computed_state === 'satisfied')) + ' Los ' + derived.length + ' derived satisfied en el release train aplicable.',
    '- ' + box(ledger.nodes.find((x) => x.id === 'RC-FULL-1-CLOSE')?.state === 'accepted') + ' ' +
      mdCode('RC-FULL-1-CLOSE') + ' aceptado con ' + mdCode('closed_pass') + '.',
    '- ' + box(ledger.nodes.find((x) => x.id === 'FINAL-007')?.state === 'accepted') + ' ' +
      mdCode('FINAL-007') + ' aceptado y ' + mdCode('CLAIM-007=true') + '.',
    '',
    'Completar esta checklist demuestra el contrato de aceptación de esta versión. No garantiza un bounty futuro ni detección universal.',
    '',
    '<!-- generated by rebuild-final-plan.mjs; do not edit manually -->'
  );
  return lines.join('\n') + '\n';
}

function contributionSection(ledger) {
  const lines = [
    '### 16.4 Registry exacto de contributions',
    '',
    'Tabla generada desde ' + mdCode('acceptance-ledger.v1.json') + '; cada ID aparece exactamente una vez.',
    '',
    '| Contribution criteria ID | Type | Owner repo | Parent primary | Declared gate | Hard contribution deps | Source/expected artifact |',
    '|---|---|---|---|---|---:|---|'
  ];
  for (const item of ledger.contributions) {
    const type = item.contribution_type || item.evidence_descriptor?.profile || 'contribution';
    const artifact = item.expected_commit?.planned_subject || item.expected_receipt?.artifact || item.source?.row_kind;
    lines.push(
      '| ' + mdCode(item.contribution_id) +
      ' | ' + mdCode(esc(type)) +
      ' | ' + mdCode(esc(item.owner_repo)) +
      ' | ' + mdCode(esc(item.parent_primary_id)) +
      ' | ' + mdCode(esc(item.declared_parent_id)) +
      ' | ' + (item.hard_contribution_dependencies?.length || 0) +
      ' | ' + mdCode(esc(artifact)) + ' |'
    );
  }
  lines.push(
    '',
    'Registry cerrado: **653** filas explícitas de ' + mdCode('06') +
      ' + **450** expansiones C6 (30 scopes × 15 sufijos) = **1103 contributions**.'
  );
  return lines.join('\n');
}

function contractEdgeSection(ledger) {
  const nodeEdges = [];
  const contributionEdges = [];
  for (const node of ledger.nodes) for (const edge of node.dependencies || []) {
    const bindings = edge.dependency_bindings || [edge];
    for (const binding of bindings) {
      const type = binding.dependency_type || binding.type;
      if (type === 'contract') nodeEdges.push({
        contract_id: binding.contract_id,
        contract_version: binding.contract_version,
        producer_id: edge.id,
        consumer_id: node.id
      });
    }
  }
  for (const item of ledger.contributions) for (const edge of item.dependencies || []) {
    if (edge.type === 'contract') contributionEdges.push({
      contract_id: edge.contract_id,
      contract_version: edge.contract_version,
      producer_id: edge.id,
      consumer_id: item.contribution_id
    });
  }
  nodeEdges.sort((a, b) => cmp(jcs(a), jcs(b)));
  contributionEdges.sort((a, b) => cmp(jcs(a), jcs(b)));
  const nodeRoot = domainHash('solguard:contract-edge-set:node:v1', {
    schema_version: 'solguard-contract-edge-set.v1',
    count: nodeEdges.length,
    edges: nodeEdges
  });
  const contributionRoot = domainHash('solguard:contract-edge-set:contribution:v1', {
    schema_version: 'solguard-contract-edge-set.v1',
    count: contributionEdges.length,
    edges: contributionEdges
  });
  const groups = new Map();
  for (const edge of nodeEdges) {
    const key = edge.contract_id + '\0' + edge.contract_version + '\0' + edge.producer_id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(edge.consumer_id);
  }
  const lines = [
    '### 3.3 Aristas contractuales materiales',
    '',
    'El ledger contiene **' + nodeEdges.length + ' aristas contractuales de nodo** y **' +
      contributionEdges.length + ' bindings contractuales de contribution**.',
    '',
    '- Schema de ambos payloads: ' + mdCode('solguard-contract-edge-set.v1') + '.',
    '- Root JCS/domain node: ' + mdCode(nodeRoot) + '.',
    '- Root JCS/domain contribution: ' + mdCode(contributionRoot) + '.',
    '- Cada arista fija contract ID/version, producer y consumer exactos.',
    '',
    '| Contract/version | Producer | Consumers exactos | Count |',
    '|---|---|---|---:|'
  ];
  for (const [key, values] of [...groups.entries()].sort(([a], [b]) => cmp(a, b))) {
    const [contractId, version, producer] = key.split('\0');
    const consumers = sorted(values);
    lines.push(
      '| ' + mdCode(contractId) + ' / ' + mdCode(version) +
      ' | ' + mdCode(producer) +
      ' | ' + consumers.map(mdCode).join(', ') +
      ' | ' + consumers.length + ' |'
    );
  }
  lines.push('', 'La expansión contribution→contract permanece machine-readable en ' + mdCode('contributions[].dependencies') + '.');
  return lines.join('\n');
}

function resourceProfilePolicySection(ledger) {
  const policies = ledger.resource_profile_policy_registry;
  ok(Array.isArray(policies) && policies.length === 2, 'resource profile policy registry cardinality');
  const reference = policies[0];
  ok(policies.every((policy) =>
    jcs(policy.required_profile_fields) === jcs(reference.required_profile_fields) &&
    jcs(policy.hard_rates) === jcs(reference.hard_rates) &&
    policy.rate_comparison_semantics === reference.rate_comparison_semantics &&
    jcs(policy.workload_burden_limits) === jcs(reference.workload_burden_limits)
  ), 'resource profile policy constraints drift between candidates');
  const lines = [
    '### 3.0B Registry cerrada de resource profile policies',
    '',
    'Cada ' + mdCode('policy_root') + ' se calcula como ' +
      mdCode('SHA256(UTF8("solguard:resource-profile-policy:v1") || 0x00 || RFC8785_JCS(payload_without_policy_root))') +
      '. El payload cerrado completo se publica en ' + mdCode('resource_profile_policy_registry[]') +
      '; el seed y ' + mdCode('epoch_constants') + ' sólo lo referencian por ID/version/root exactos.',
    '',
    '| Policy | Schema | Program/version | Policy root |',
    '|---|---|---|---|'
  ];
  for (const policy of policies) {
    lines.push(
      '| ' + mdCode(policy.policy_id + '@' + policy.policy_version) +
      ' | ' + mdCode(policy.schema_version) +
      ' | ' + mdCode(policy.program_id + '@' + policy.program_version) +
      ' | ' + mdCode(policy.policy_root) + ' |'
    );
  }
  lines.push(
    '',
    '- Campos obligatorios del profile: ' + reference.required_profile_fields.map(mdCode).join(', ') + '.',
    '- Hard rates/counts: ' + mdCode(jcs(reference.hard_rates)) + '.',
    '- Semántica de comparación: ' + mdCode(reference.rate_comparison_semantics) + '.',
    '- Workload burdens: ' + mdCode(jcs(reference.workload_burden_limits)) + '.'
  );
  return lines.join('\n');
}

function schemaRegistry(ledger, textSources, productIds) {
  const pattern = /\bsolguard-[a-z0-9-]+\.v\d+\b/g;
  const schemas = new Set();
  const locators = new Map();
  function addLocator(id, locator) {
    if (!locators.has(id)) locators.set(id, new Set());
    locators.get(id).add(locator);
  }
  for (const source of textSources) {
    for (const match of source.text.matchAll(pattern)) {
      schemas.add(match[0]);
      addLocator(match[0], source.name);
    }
  }
  function walk(value, path) {
    if (typeof value === 'string') {
      for (const match of value.matchAll(pattern)) {
        schemas.add(match[0]);
        addLocator(match[0], path.replace(/\.\d+(?=\.|$)/g, '[]'));
      }
    } else if (Array.isArray(value)) value.forEach((item, index) => walk(item, path + '.' + index));
    else if (value && typeof value === 'object') {
      for (const [key, item] of Object.entries(value)) walk(item, path + '.' + key);
    }
  }
  walk(ledger, 'ledger');
  const ids = [...schemas].sort(cmp);
  const lines = [
    '<!-- GENERATED:EVIDENCE-SCHEMA-REGISTRY:BEGIN -->',
    '### 3.0A Registry generado de schemas de control y evidencia',
    '',
    'La tabla principal cubre contratos materiales de producto/runtime. Esta tabla cierra los IDs de control, transición y evidencia; alias o versión ausente falla.',
    '',
    '| Schema ID | Owner/authority | Uso/locator canónico observado |',
    '|---|---|---|'
  ];
  for (const id of ids) {
    const used = [...(locators.get(id) || [])].sort(cmp).slice(0, 8);
    let owner = 'AGENTS/governance evidence authority';
    if (productIds.has(id)) owner = 'product contract registry §3';
    else if (/campaign|corpus|truth|match|metric|measurement|adjudication/.test(id)) owner = 'DEPLOY/evaluator';
    else if (/database/.test(id)) owner = 'DATABASE';
    else if (/candidate|release|timestamp|acceptance|ledger|task|derived/.test(id)) owner = 'AGENTS/DEPLOY release governance';
    lines.push(
      '| ' + mdCode(id) + ' | ' + owner + ' | ' +
      (used.length ? used.map(mdCode).join(', ') : 'prosa normativa del paquete') + ' |'
    );
  }
  lines.push('', resourceProfilePolicySection(ledger), '', '<!-- GENERATED:EVIDENCE-SCHEMA-REGISTRY:END -->');
  return lines.join('\n');
}

async function renderContracts(ledger) {
  let text = await readFile(P('09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md'), 'utf8');
  text = text.replaceAll('solguard-detection-maturity-2026-07-25.2', VERSION);
  text = text.replaceAll('solguard-detection-maturity-2026-07-25.3', VERSION);
  text = replaceLegacyString(text);
  text = text.replace(
    /Contiene 541 nodos \(414 primary y 127 derived\), 1039 contribuciones owner-únicas y 1580 ítems contados\./,
    'Contiene 568 nodos (440 primary y 128 derived), 1103 contributions owner-únicas y 1671 ítems contados.'
  );
  text = text.replaceAll(
    '414 accepted/127 satisfied y 1039 contributions accepted',
    '440 primary accepted/128 derived satisfied y 1103 contributions accepted'
  );
  text = replaceSection(text, '### 3.3 Aristas contractuales materiales', '## 4. Schema ' + mdCode('solguard-acceptance-ledger.v1'), contractEdgeSection(ledger));
  text = replaceSection(text, '### 16.4 Registry exacto de contributions', '### 16.5 Política, materialidad, autorización y timestamps', contributionSection(ledger));
  const counts = [
    '## 6. Identidad, counts y cierre',
    '',
    'Snapshot exacto: **' + ledger.state_counts.primary_total + ' primary**, **' +
      ledger.state_counts.derived_total + ' derived**, **' +
      ledger.state_counts.contribution_total + ' contributions** = **' +
      ledger.state_counts.counted_item_total + ' ítems contados**.',
    '',
    'Completitud global: implementation primaries accepted; contributions accepted; primary terminalizables terminales; derived materializados; cero pending/reopened dentro del release train; ' +
      mdCode('RC-FULL-1-CLOSE=closed_pass') + '; ' + mdCode('FINAL-007') +
      ' accepted; y ' + mdCode('CLAIM-007=true') + ' en el mismo tentative post-state.',
    '',
    mdCode('FINAL-007') + ' cuantifica exclusivamente sobre el release train versionado de ' +
      mdCode('RC-FULL-1') + '; no reinterpreta epochs históricos.'
  ].join('\n');
  text = replaceSection(text, '## 6. Identidad, counts y cierre', '## 7. Umbrellas multi-repo y children de owner único', counts);
  if (!text.includes('| ' + mdCode('solguard-economic-adversary-model.v1') + ' |')) {
    const anchor = '| ' + mdCode('solguard-economic-transition-system.v1');
    const at = text.indexOf(anchor);
    ok(at >= 0, 'product registry anchor missing');
    const end = text.indexOf('\n', at) + 1;
    const row = '| ' + mdCode('solguard-economic-adversary-model.v1') +
      ' | ECONOMIC | ' + mdCode('MODEL-411') +
      ' reader-first/writer | VALUE, VALIDATE, CORE, PROOF, Deploy | sí |\n';
    text = text.slice(0, end) + row + text.slice(end);
  }
  const oldSchemaStart = '<!-- GENERATED:EVIDENCE-SCHEMA-REGISTRY:BEGIN -->';
  const oldSchemaEnd = '<!-- GENERATED:EVIDENCE-SCHEMA-REGISTRY:END -->';
  if (text.includes(oldSchemaStart)) {
    const start = text.indexOf(oldSchemaStart);
    const end = text.indexOf(oldSchemaEnd, start) + oldSchemaEnd.length;
    text = text.slice(0, start) + text.slice(end).replace(/^\s*/, '');
  }
  const tableStart = text.indexOf('| Contract ID canónico |');
  const tableEnd = text.indexOf('### 3.1 Frontera de medición');
  const productIds = new Set([...text.slice(tableStart, tableEnd).matchAll(/.(solguard-[a-z0-9-]+\.v\d+)./g)].map((match) => match[1]));
  const planNames = [
    '01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md','02_PROGRAMA_ESTRUCTURAL.md',
    '03_PLAN_POR_REPOSITORIO.md','04_MADUREZ_OCHO_LENGUAJES.md',
    '05_VALIDACION_CIEGA_Y_RELEASE.md','06_PLAN_DE_COMMITS.md',
    '08_PLANTILLA_DE_TAREA_GPT.md','10_MATRIZ_CERTIFICACION_SCOPES.md','README.md'
  ];
  const planTexts = await Promise.all(planNames.map(async (name) => ({
    name,
    text: await readFile(P(name), 'utf8')
  })));
  const generatorText = await readFile(P('rebuild-final-plan.mjs'), 'utf8');
  const schemaSources = [
    ...planTexts,
    { name: '07_CHECKLIST_MAESTRA.md (generated)', text: renderChecklist(ledger) },
    { name: '09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)', text },
    { name: 'rebuild-final-plan.mjs', text: generatorText }
  ];
  const generatedSchemas = schemaRegistry(ledger, schemaSources, productIds);
  text = text.replace('### 3.1 Frontera de medición', generatedSchemas + '\n\n### 3.1 Frontera de medición');
  const conformityStart = '<!-- GENERATED:LEDGER-CONFORMANCE:BEGIN -->';
  const conformityEnd = '<!-- GENERATED:LEDGER-CONFORMANCE:END -->';
  if (text.includes(conformityStart)) {
    const start = text.indexOf(conformityStart);
    const end = text.indexOf(conformityEnd, start) + conformityEnd.length;
    text = text.slice(0, start) + text.slice(end).replace(/^\s*/, '');
  }
  const v = ledger.candidate_epoch_registry[0];
  const f = ledger.candidate_epoch_registry[1];
  const block = [
    conformityStart,
    '### 4.0A Snapshot de conformidad ' + VERSION,
    '',
    'La autoridad machine-readable contiene ' + ledger.state_counts.counted_item_total + ' ítems. Eventos y receipts usan JCS, CAS, lease/fencing y timestamp 2-of-2.',
    '',
    '| Candidate | Evaluation | Release | Required pass | Claims | Observations | Tooling |',
    '|---|---:|---:|---:|---:|---:|---:|',
    '| ' + mdCode(v.candidate_epoch_id) + ' | ' + v.evaluation_closure_member_count + ' | ' +
      v.release_train_closure_member_count + ' | ' + v.required_pass_member_count + ' | ' +
      v.pass_claim_target_count + ' | ' + v.evaluation_observation_count + ' | ' +
      v.planned_tooling_subject_count + ' |',
    '| ' + mdCode(f.candidate_epoch_id) + ' | ' + f.evaluation_closure_member_count + ' | ' +
      f.release_train_closure_member_count + ' | ' + f.required_pass_member_count + ' | ' +
      f.pass_claim_target_count + ' | ' + f.evaluation_observation_count + ' | ' +
      f.planned_tooling_subject_count + ' |',
    '',
    'Candidate set root = SHA-256(UTF8(domain) || 0x00 || RFC8785_JCS(payload cerrado)); cada closure member fija kind, ID y version.',
    conformityEnd
  ].join('\n');
  const schemaHeading = '## 4. Schema ' + mdCode('solguard-acceptance-ledger.v1');
  const assuranceStart = '<!-- GENERATED:ASSURANCE-PROFILES:BEGIN -->';
  const assuranceEnd = '<!-- GENERATED:ASSURANCE-PROFILES:END -->';
  if (text.includes(assuranceStart)) {
    const start = text.indexOf(assuranceStart);
    const end = text.indexOf(assuranceEnd, start) + assuranceEnd.length;
    text = text.slice(0, start) + text.slice(end).replace(/^\s*/, '');
  }
  const assuranceBlock = [
    assuranceStart,
    '### 4.0 Perfil de assurance y custodia',
    '',
    'El par ' + mdCode('assurance_mode') + '/' + mdCode('assurance_level') +
      ' es obligatorio en ledger, event, lease, authoritative head, derived evaluation y commit receipt; debe coincidir durante toda la cadena.',
    '',
    '| Modo | Nivel | Claves Ed25519 | Custodios | Claim permitido |',
    '|---|---|---:|---:|---|',
    '| ' + mdCode('production') + ' | ' + mdCode('independent-custodians') + ' | 4 distintas | 4 distintos | independencia de custodia |',
    '| ' + mdCode('development') + ' | ' + mdCode('single-custodian') + ' | 4 distintas | exactamente 1 declarado | sólo ejecución single-custodian; independencia prohibida |',
    '',
    'Ambos modos rechazan key IDs, human identities o material público Ed25519 duplicado. Cambiar el perfil tras genesis exige nueva versión de programa y nueva genesis. El modo development no satisface gates ni claims que exigen custodios, holdouts, evaluadores o adjudicadores humanos independientes.',
    assuranceEnd
  ].join('\n');
  text = text.replace(schemaHeading, assuranceBlock + '\n\n' + schemaHeading + '\n\n' + block);
  const additions = [
    '| ' + mdCode('BASELINE-009') + ' | ' + mdCode('solguard-deploy') + ' | replay baseline/loss post-genesis | ' + mdCode('C0-001A') + ', ' + mdCode('C0-001B') + ' |',
    '| ' + mdCode('MODEL-411') + ' | ' + mdCode('solguard-economic') + ' | adversario económico acotado | ' + mdCode('C3-013J..P') + ' |',
    '| ' + mdCode('RC-FULL-1-CLOSE') + ' | ' + mdCode('solguard-deploy/release-authority') + ' | close CAS pass/nonpass | 0 |'
  ].filter((row) => !text.includes(row.split(' | ')[0]));
  const before = text.indexOf('### 16.2 Paquetes LANG derived e integration');
  ok(before >= 0, '16.2 missing');
  if (additions.length) text = text.slice(0, before) + additions.join('\n') + '\n\n' + text.slice(before);
  return text;
}

function renderReadme(text, ledger) {
  text = text.replaceAll('solguard-detection-maturity-2026-07-25.2', VERSION);
  text = text.replaceAll('solguard-detection-maturity-2026-07-25.3', VERSION);
  const section = [
    '## 3. Qué significa «100%»',
    '',
    'La autoridad es [' + mdCode('acceptance-ledger.v1.json') + '](acceptance-ledger.v1.json), no el Markdown. Esta versión cierra la especificación; el trabajo sigue inicialmente pending.',
    '',
    'Universo exacto: **' + ledger.state_counts.primary_total + ' primary + ' +
      ledger.state_counts.derived_total + ' derived + ' +
      ledger.state_counts.contribution_total + ' contributions = ' +
      ledger.state_counts.counted_item_total + ' ítems contados**.',
    '',
    '«100%» exige primary de implementación accepted, primary terminalizables terminales, todas las contributions accepted, derived materializados, ' +
      mdCode('RC-FULL-1-CLOSE=closed_pass') + ', release train sin pending/reopened, ' +
      mdCode('FINAL-007') + ' accepted y ' + mdCode('CLAIM-007=true') + '.',
    '',
    'Cerrar o implementar el plan no garantiza bounty, detección universal ni bugs futuros. Los claims sólo valen dentro de scopes, cohorts, amenazas y recursos congelados cuando los gates medidos pasan.',
    ''
  ].join('\n');
  text = replaceSection(text, '## 3. Qué significa «100%»', '## 4.', section);
  const startMarker = '<!-- GENERATED:CANONICAL-STATUS:BEGIN -->';
  const endMarker = '<!-- GENERATED:CANONICAL-STATUS:END -->';
  if (text.includes(startMarker)) {
    const start = text.indexOf(startMarker);
    const end = text.indexOf(endMarker, start) + endMarker.length;
    text = text.slice(0, start) + text.slice(end).replace(/^\s*/, '');
  }
  const status = [
    startMarker,
    'Ledger canónico ' + mdCode(VERSION) + ': roots node/contribution/all-counted = ' +
      mdCode(ledger.node_id_set_sha256) + ' / ' +
      mdCode(ledger.contribution_id_set_sha256) + ' / ' +
      mdCode(ledger.all_counted_item_id_set_sha256) + '.',
    'Perfil activo: ' + mdCode(ledger.assurance_mode) + ' / ' +
      mdCode(ledger.assurance_level) + '. No declara independencia humana ni de custodia.',
    endMarker
  ].join('\n');
  const first = text.indexOf('## 1.');
  return text.slice(0, first) + status + '\n\n' + text.slice(first);
}

function validate(ledger, rows) {
  const nodeIds = ledger.nodes.map((node) => node.id);
  const contributionIds = ledger.contributions.map((item) => item.contribution_id);
  ok(nodeIds.length === new Set(nodeIds).size, 'duplicate node ID');
  ok(contributionIds.length === new Set(contributionIds).size, 'duplicate contribution ID');
  ok(rows.length === 653, 'explicit row drift');
  ok(ledger.contributions.filter((x) => x.source?.row_kind === 'concrete_row').length === 653, 'explicit contribution drift');
  ok(ledger.contributions.filter((x) => x.source?.row_kind === 'c6_scope_expansion').length === 450, 'generated contribution drift');
  const all = new Set([...nodeIds,...contributionIds]);
  const contributionMap = new Map(ledger.contributions.map((item) => [item.contribution_id,item]));
  for (const node of ledger.nodes) {
    for (const edge of node.dependencies || []) ok(all.has(edge.id), node.id + ': missing dependency ' + edge.id);
    for (const id of node.required_contribution_ids || []) {
      const item = contributionMap.get(id);
      ok(item, node.id + ': missing required contribution ' + id);
      ok(item.parent_primary_id === node.id, node.id + '/' + id + ': parent mismatch');
    }
    if (node.kind === 'derived') {
      ok(node.formula?.op === 'AND', node.id + ': derived op');
      ok(
        jcs(sorted((node.dependencies || []).map((edge) => edge.id))) ===
        jcs(sorted(node.formula?.operands || [])),
        node.id + ': formula/dependency mismatch'
      );
    }
  }
  for (const item of ledger.contributions) {
    ok(all.has(item.parent_primary_id), item.contribution_id + ': missing parent');
    for (const edge of item.dependencies || []) ok(all.has(edge.id), item.contribution_id + ': missing dependency ' + edge.id);
    for (const edge of item.hard_contribution_dependencies || []) {
      ok(contributionMap.has(edge.contribution_id), item.contribution_id + ': missing contribution dep ' + edge.contribution_id);
    }
  }
  const graph = new Map([...nodeIds,...contributionIds].map((id) => [id,[]]));
  for (const node of ledger.nodes) for (const edge of node.dependencies || []) graph.get(node.id).push(edge.id);
  for (const item of ledger.contributions) {
    for (const edge of item.dependencies || []) graph.get(item.contribution_id).push(edge.id);
    for (const edge of item.hard_contribution_dependencies || []) graph.get(item.contribution_id).push(edge.contribution_id);
  }
  const active = new Set();
  const done = new Set();
  function visit(id, trail) {
    if (active.has(id)) throw new Error('cycle ' + [...trail,id].join(' -> '));
    if (done.has(id)) return;
    active.add(id);
    for (const target of graph.get(id)) visit(target, [...trail,id]);
    active.delete(id);
    done.add(id);
  }
  for (const id of graph.keys()) visit(id, []);

  const keyRules = {
    evaluation_closure: (x) => keyParts(x.member_kind, x.member_id, x.subject_version),
    release_train_closure: (x) => keyParts(x.member_kind, x.member_id, x.subject_version),
    required_pass_member: (x) => keyParts(x.member_kind, x.member_id, x.subject_version),
    pass_claim_target: (x) => keyParts(x.node_id, x.node_version),
    evaluation_observation: (x) => keyParts(x.observation_kind, x.node_id, x.node_version),
    planned_operational_gate: (x) => keyParts(x.node_id, x.node_version),
    planned_input_subject: (x) => keyParts(x.member_kind, x.member_id, x.subject_version),
    allowed_next_action: (x) => x.operation,
    planned_tooling_subject: (x) => keyParts(x.contribution_id, x.contribution_version)
  };
  const policies = ledger.resource_profile_policy_registry;
  ok(Array.isArray(policies) && policies.length === 2, 'resource profile policy registry must contain two records');
  ok(new Set(policies.map((policy) => policy.policy_id)).size === 2, 'duplicate resource profile policy ID');
  const policiesByKey = new Map();
  for (const policy of policies) {
    const { policy_root: policyRoot, ...payload } = policy;
    ok(
      policyRoot === domainHash('solguard:resource-profile-policy:v1', payload),
      policy.policy_id + ': resource profile policy root mismatch'
    );
    ok(
      jcs(policy.required_profile_fields) === jcs(RESOURCE_PROFILE_REQUIRED_FIELDS),
      policy.policy_id + ': required resource profile fields drift'
    );
    ok(
      jcs(policy.hard_rates) === jcs(RESOURCE_PROFILE_HARD_RATES),
      policy.policy_id + ': resource hard rates drift'
    );
    ok(
      jcs(policy.workload_burden_limits) === jcs(RESOURCE_PROFILE_WORKLOAD_LIMITS),
      policy.policy_id + ': workload burden limits drift'
    );
    policiesByKey.set(keyParts(policy.policy_id, policy.policy_version), policy);
  }
  for (const registry of ledger.candidate_epoch_registry) {
    for (const spec of ledger.canonical_set_commitment_contract.sets) {
      const members = registry[spec.members_field];
      ok(Array.isArray(members), registry.candidate_epoch_id + ': missing ' + spec.members_field);
      const recomputed = cset(ledger, registry.candidate_epoch_id, spec.set_kind, members, keyRules[spec.set_kind]);
      ok(registry[spec.count_field] === recomputed.count, registry.candidate_epoch_id + ': count mismatch ' + spec.set_kind);
      ok(registry[spec.root_field] === recomputed.root, registry.candidate_epoch_id + ': root mismatch ' + spec.set_kind);
    }
    ok(!('claim_observation_records' in registry), registry.candidate_epoch_id + ': runtime claim observations in seed');
    ok(!('claim_required_pass_records' in registry), registry.candidate_epoch_id + ': legacy claim required pass');
    ok(registry.required_pass_member_count ===
      registry.evaluation_closure_member_count - registry.pass_claim_target_count,
      registry.candidate_epoch_id + ': partition count'
    );
    const claimIds = new Set(registry.pass_claim_target_records.map((x) => x.node_id));
    ok(registry.evaluation_observation_records.every((x) => !claimIds.has(x.node_id)),
      registry.candidate_epoch_id + ': claim duplicated in observations'
    );
    const plannedInputKeys = registry.planned_input_subject_records.map(keyRules.planned_input_subject);
    ok(plannedInputKeys.length === new Set(plannedInputKeys).size, registry.candidate_epoch_id + ': duplicate input');
    const policy = policiesByKey.get(keyParts(
      registry.resource_profile_policy_id,
      registry.resource_profile_policy_version
    ));
    ok(policy, registry.candidate_epoch_id + ': resource profile policy reference missing');
    ok(policy.policy_root === registry.resource_profile_policy_root,
      registry.candidate_epoch_id + ': resource profile policy root reference mismatch');
    const epoch = ledger.nodes.find((node) => node.id === registry.candidate_epoch_id)?.epoch_constants;
    ok(epoch, registry.candidate_epoch_id + ': epoch constants missing');
    ok(epoch.resource_profile_policy_id === policy.policy_id &&
      epoch.resource_profile_policy_version === policy.policy_version &&
      epoch.resource_profile_policy_root === policy.policy_root,
    registry.candidate_epoch_id + ': epoch constants resource policy reference mismatch');
  }
  const v = ledger.candidate_epoch_registry.find((x) => x.candidate_epoch_id === 'RC-V-EVM-1');
  const f = ledger.candidate_epoch_registry.find((x) => x.candidate_epoch_id === 'RC-FULL-1');
  const expected = [
    [v,'evaluation_closure_member_count',537],
    [v,'release_train_closure_member_count',538],
    [v,'required_pass_member_count',536],
    [v,'pass_claim_target_count',1],
    [v,'evaluation_observation_count',26],
    [v,'planned_operational_gate_count',28],
    [v,'planned_tooling_subject_count',409],
    [v,'planned_input_subject_count',15],
    [v,'evaluation_node_count',128],
    [v,'release_train_node_count',129],
    [v,'evaluation_contribution_count',409],
    [v,'release_train_contribution_count',409],
    [f,'evaluation_closure_member_count',1633],
    [f,'release_train_closure_member_count',1644],
    [f,'required_pass_member_count',1627],
    [f,'pass_claim_target_count',6],
    [f,'evaluation_observation_count',144],
    [f,'planned_operational_gate_count',151],
    [f,'planned_tooling_subject_count',1103],
    [f,'planned_input_subject_count',47],
    [f,'evaluation_node_count',530],
    [f,'release_train_node_count',541],
    [f,'evaluation_contribution_count',1103],
    [f,'release_train_contribution_count',1103]
  ];
  for (const [registry,field,value] of expected) {
    ok(registry[field] === value,
      registry.candidate_epoch_id + ': expected ' + field + '=' + value + ', got ' + registry[field]
    );
  }
  ok(f.historical_boundary_member_records?.length === 1, 'full historical boundary');
  ok(
    f.historical_boundary_member_records[0].dependency_expansion === 'forbidden',
    'boundary dependency expansion'
  );
  const fullClaimIds = new Set(['CLAIM-001','CLAIM-002','CLAIM-003','CLAIM-004','CLAIM-005','CLAIM-006']);
  ok(f.pass_claim_target_records.every((x) => fullClaimIds.has(x.node_id)), 'full claim targets');
  const post = new Set(['RC-FULL-1-CLOSE','FINAL-001','FINAL-002','FINAL-003','FINAL-004','FINAL-005','FINAL-006','FINAL-007','CLAIM-007','CLAIM-008','RELEASE-914']);
  ok(f.evaluation_closure_member_records.every((x) => !post.has(x.member_id)), 'post-close leaked into evaluation');
  ok([...post].every((id) => f.release_train_closure_member_records.some((x) => x.member_id === id)), 'post-close missing from release');
  ok(ledger.nodes.find((x) => x.id === 'BLIND-911').evidence_descriptor.cardinality.operand_event_ids === 64, 'BLIND cardinality');
  ok(ledger.nodes.find((x) => x.id === 'FINAL-001').dependencies.some((x) => x.id === 'RC-FULL-1-CLOSE' && x.type === 'hard'), 'FINAL-001 close');
  ok(!('closure_id_set_sha256' in ledger), 'ambiguous closure alias remains');
  ok(ledger.program_version === VERSION, 'version drift');
  return {
    primary: ledger.state_counts.primary_total,
    derived: ledger.state_counts.derived_total,
    contributions: ledger.state_counts.contribution_total,
    counted: ledger.state_counts.counted_item_total,
    vertical: {
      evaluation: v.evaluation_closure_member_count,
      release: v.release_train_closure_member_count,
      observations: v.evaluation_observation_count,
      tooling: v.planned_tooling_subject_count
    },
    full: {
      evaluation: f.evaluation_closure_member_count,
      release: f.release_train_closure_member_count,
      observations: f.evaluation_observation_count,
      tooling: f.planned_tooling_subject_count
    },
    roots: {
      node: ledger.node_id_set_sha256,
      contribution: ledger.contribution_id_set_sha256,
      all_counted: ledger.all_counted_item_id_set_sha256
    }
  };
}

async function main() {
  const { ledger, rows } = await rebuild();
  const report = validate(ledger, rows);
  const [contracts, readme] = await Promise.all([
    renderContracts(ledger),
    readFile(P('README.md'), 'utf8').then((text) => renderReadme(text, ledger))
  ]);
  await Promise.all([
    writeFile(P('acceptance-ledger.v1.json'), JSON.stringify(ledger, null, 2) + '\n', 'utf8'),
    writeFile(P('07_CHECKLIST_MAESTRA.md'), renderChecklist(ledger), 'utf8'),
    writeFile(P('09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md'), contracts, 'utf8'),
    writeFile(P('README.md'), readme, 'utf8')
  ]);
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}

await main();
