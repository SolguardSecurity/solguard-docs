#!/usr/bin/env node

/**
 * Validador read-only del plan final de madurez de Solguard.
 *
 * No genera ni corrige artefactos. Falla con exit code 1 ante cualquier
 * incoherencia semantica, de cardinalidad, de DAG o de compromiso canonico.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const LEDGER_PATH = join(HERE, "acceptance-ledger.v1.json");
const COMMITS_PATH = join(HERE, "06_PLAN_DE_COMMITS.md");
const CONTRACTS_PATH = join(HERE, "09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md");
const REAL_TARGET =
  "C:\\Users\\Roger Gómez Martínez\\Documents\\GitHub\\solguard-docs\\changelogs\\25-jul-2026\\tasks";

const EXPECTED = Object.freeze({
  nodes: 568,
  primary: 440,
  derived: 128,
  contributions: 1103,
  countedItems: 1671,
  concreteRows: 653,
  scopeExpansions: 450,
  scopes: 30,
  scopeGates: 8,
  repositories: 15,
});

const EXPECTED_REPOS = Object.freeze([
  "solguard-agents",
  "solguard-backend",
  "solguard-core",
  "solguard-database",
  "solguard-deploy",
  "solguard-diff",
  "solguard-discover",
  "solguard-docs",
  "solguard-economic",
  "solguard-filter",
  "solguard-invariant",
  "solguard-map",
  "solguard-trace",
  "solguard-validate",
  "solguard-value",
]);

const SCOPE_PRIMARY_GATES = Object.freeze([
  "C0",
  "C1",
  "C2",
  "C3",
  "C4",
  "C5A",
  "C5B",
]);

const SCOPE_SUFFIXES = Object.freeze([
  "PROFILE",
  "FRONTEND",
  "LOCAL-IR",
  "TRACE",
  "MODEL",
  "ECONOMIC",
  "INVARIANT",
  "DIFF",
  "CORE",
  "VALUE",
  "VALIDATE",
  "FILTER",
  "REPLAY",
  "CANDIDATE",
  "SCOPE",
]);

const REQUIRED_CANDIDATE_SET_KINDS = Object.freeze([
  "evaluation_closure",
  "release_train_closure",
  "required_pass_member",
  "pass_claim_target",
  "evaluation_observation",
  "planned_operational_gate",
  "planned_input_subject",
  "allowed_next_action",
  "planned_tooling_subject",
]);

const failures = [];
let checks = 0;

function check(condition, code, detail = "") {
  checks += 1;
  if (!condition) failures.push({ code, detail: String(detail) });
}

function codeUnitCompare(left, right) {
  const a = String(left);
  const b = String(right);
  return a < b ? -1 : a > b ? 1 : 0;
}

function sameSet(left, right) {
  const a = [...new Set(left)].sort(codeUnitCompare);
  const b = [...new Set(right)].sort(codeUnitCompare);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function duplicates(values) {
  const seen = new Set();
  const duplicateSet = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicateSet.add(value);
    seen.add(value);
  }
  return [...duplicateSet].sort(codeUnitCompare);
}

function jsonCanonical(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("JCS rechaza numeros no finitos");
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (Array.isArray(value)) return `[${value.map(jsonCanonical).join(",")}]`;
  if (typeof value === "object") {
    const keys = Object.keys(value).sort(codeUnitCompare);
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${jsonCanonical(value[key])}`)
      .join(",")}}`;
  }
  throw new Error(`Tipo no representable por JCS: ${typeof value}`);
}

function containsNull(value) {
  if (value === null) return true;
  if (Array.isArray(value)) return value.some(containsNull);
  if (value && typeof value === "object") return Object.values(value).some(containsNull);
  return false;
}

function sha256Domain(domain, payload) {
  return createHash("sha256")
    .update(Buffer.from(domain, "utf8"))
    .update(Buffer.from([0]))
    .update(Buffer.from(jsonCanonical(payload), "utf8"))
    .digest("hex");
}

function parseLedger() {
  check(existsSync(LEDGER_PATH), "JSON_MISSING", LEDGER_PATH);
  if (!existsSync(LEDGER_PATH)) return null;
  try {
    return JSON.parse(readFileSync(LEDGER_PATH, "utf8"));
  } catch (error) {
    check(false, "JSON_PARSE", error.message);
    return null;
  }
}

function markdownFiles() {
  return readdirSync(HERE)
    .filter((name) => extname(name).toLowerCase() === ".md")
    .map((name) => join(HERE, name))
    .sort();
}

function packageModuleFiles() {
  return readdirSync(HERE)
    .filter((name) => extname(name).toLowerCase() === ".mjs")
    .map((name) => join(HERE, name))
    .sort(codeUnitCompare);
}

function contributionRows(text) {
  const rows = [];
  for (const [lineIndex, line] of text.split(/\r?\n/).entries()) {
    if (!line.trimStart().startsWith("|")) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (/^C[0-9][A-Z0-9-]*$/.test(cells[0] ?? "")) {
      rows.push({ id: cells[0], cells, line: lineIndex + 1 });
    }
  }
  return rows;
}

function itemKey(prefix, id) {
  return `${prefix}:${id}`;
}

function validateCounts(ledger) {
  const nodes = ledger.nodes ?? [];
  const contributions = ledger.contributions ?? [];
  const primaries = nodes.filter((node) => node.kind === "primary" && node.counted !== false);
  const derived = nodes.filter((node) => node.kind === "derived" && node.counted !== false);
  const countedContributions = contributions.filter((item) => item.counted !== false);

  check(nodes.length === EXPECTED.nodes, "COUNT_NODES", `${nodes.length} != ${EXPECTED.nodes}`);
  check(primaries.length === EXPECTED.primary, "COUNT_PRIMARY", `${primaries.length} != ${EXPECTED.primary}`);
  check(derived.length === EXPECTED.derived, "COUNT_DERIVED", `${derived.length} != ${EXPECTED.derived}`);
  check(
    countedContributions.length === EXPECTED.contributions,
    "COUNT_CONTRIBUTIONS",
    `${countedContributions.length} != ${EXPECTED.contributions}`,
  );
  check(
    primaries.length + derived.length + countedContributions.length === EXPECTED.countedItems,
    "COUNT_ITEMS",
    `${primaries.length + derived.length + countedContributions.length} != ${EXPECTED.countedItems}`,
  );

  const terminalNonpass = new Set([
    "terminal_failed",
    "terminal_invalid",
    "insufficient_evidence",
    "terminal_not_run",
  ]);
  const reopened = [...primaries, ...countedContributions].filter(
    (item) => item.state === "reopened" || (item.acceptance?.reopened_by?.length ?? 0) > 0,
  ).length;
  const computed = {
    primary_total: primaries.length,
    primary_accepted: primaries.filter((item) => item.state === "accepted").length,
    derived_total: derived.length,
    derived_satisfied: derived.filter((item) => item.computed_state === "satisfied").length,
    contribution_total: countedContributions.length,
    contribution_accepted: countedContributions.filter((item) => item.state === "accepted").length,
    operational_terminal_nonpass: primaries.filter(
      (item) => item.operational === true && terminalNonpass.has(item.state),
    ).length,
    reopened,
    counted_item_total: primaries.length + derived.length + countedContributions.length,
  };
  for (const [field, expected] of Object.entries(computed)) {
    check(
      ledger.state_counts?.[field] === expected,
      `STATE_COUNT_${field.toUpperCase()}`,
      `${ledger.state_counts?.[field]} != ${expected}`,
    );
  }
}

function validateIdsAndGraph(ledger) {
  const nodes = ledger.nodes ?? [];
  const contributions = ledger.contributions ?? [];
  const nodeIds = nodes.map((node) => node.id);
  const contributionIds = contributions.map((item) => item.contribution_id);
  check(duplicates(nodeIds).length === 0, "DUPLICATE_NODE_IDS", duplicates(nodeIds).join(", "));
  check(
    duplicates(contributionIds).length === 0,
    "DUPLICATE_CONTRIBUTION_IDS",
    duplicates(contributionIds).join(", "),
  );
  check(
    duplicates([...nodeIds, ...contributionIds]).length === 0,
    "DUPLICATE_UNPREFIXED_IDS",
    duplicates([...nodeIds, ...contributionIds]).join(", "),
  );

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const contributionById = new Map(contributions.map((item) => [item.contribution_id, item]));
  const edges = new Map();
  for (const node of nodes) {
    const from = itemKey("node", node.id);
    const dependencies = [];
    for (const dependency of node.dependencies ?? []) {
      check(nodeById.has(dependency.id), "MISSING_NODE_DEP", `${node.id} -> ${dependency.id}`);
      if (nodeById.has(dependency.id)) dependencies.push(itemKey("node", dependency.id));
    }
    for (const contributionId of node.required_contribution_ids ?? []) {
      check(
        contributionById.has(contributionId),
        "MISSING_REQUIRED_CONTRIBUTION",
        `${node.id} -> ${contributionId}`,
      );
      if (contributionById.has(contributionId)) {
        dependencies.push(itemKey("contribution", contributionId));
      }
    }
    edges.set(from, [...new Set(dependencies)]);
  }

  for (const item of contributions) {
    const from = itemKey("contribution", item.contribution_id);
    const dependencies = [];
    for (const dependency of item.dependencies ?? []) {
      check(
        nodeById.has(dependency.id),
        "MISSING_CONTRIBUTION_NODE_DEP",
        `${item.contribution_id} -> ${dependency.id}`,
      );
      if (nodeById.has(dependency.id)) dependencies.push(itemKey("node", dependency.id));
    }
    for (const dependency of item.hard_contribution_dependencies ?? []) {
      const dependencyId = dependency.contribution_id ?? dependency.id;
      check(
        contributionById.has(dependencyId),
        "MISSING_CONTRIBUTION_DEP",
        `${item.contribution_id} -> ${dependencyId}`,
      );
      if (contributionById.has(dependencyId)) {
        dependencies.push(itemKey("contribution", dependencyId));
      }
    }
    for (const field of ["parent_primary_id", "integration_gate"]) {
      if (item[field]) {
        check(
          nodeById.has(item[field]) && nodeById.get(item[field]).kind === "primary",
          "INVALID_CONTRIBUTION_PARENT",
          `${item.contribution_id}.${field}=${item[field]}`,
        );
      }
    }
    for (const parentId of item.parent_primary_ids ?? []) {
      check(
        nodeById.has(parentId) && nodeById.get(parentId).kind === "primary",
        "INVALID_CONTRIBUTION_PARENT_SET",
        `${item.contribution_id} -> ${parentId}`,
      );
    }
    edges.set(from, [...new Set(dependencies)]);
  }

  for (const node of nodes.filter((item) => item.kind === "derived")) {
    const formulaOperands = node.formula?.operands ?? [];
    const hardDependencies = (node.dependencies ?? [])
      .filter((dependency) => dependency.type === "hard")
      .map((dependency) => dependency.id);
    check(node.formula?.op === "AND", "DERIVED_FORMULA_OP", `${node.id}: ${node.formula?.op}`);
    check(
      duplicates(formulaOperands).length === 0,
      "DERIVED_DUPLICATE_OPERAND",
      `${node.id}: ${duplicates(formulaOperands).join(", ")}`,
    );
    check(
      sameSet(formulaOperands, hardDependencies),
      "DERIVED_DEPENDENCY_MISMATCH",
      `${node.id}: formula=${formulaOperands.join(",")} hard=${hardDependencies.join(",")}`,
    );
  }

  const color = new Map();
  const stack = [];
  function visit(id) {
    if (color.get(id) === 2) return;
    if (color.get(id) === 1) {
      const start = stack.indexOf(id);
      check(false, "COMBINED_DAG_CYCLE", [...stack.slice(start), id].join(" -> "));
      return;
    }
    color.set(id, 1);
    stack.push(id);
    for (const dependency of edges.get(id) ?? []) visit(dependency);
    stack.pop();
    color.set(id, 2);
  }
  for (const id of edges.keys()) visit(id);

  return { nodeById, contributionById, edges };
}

function validateScopesAndRows(ledger, graph) {
  const scopeNodes = (ledger.nodes ?? []).filter(
    (node) => node.predicate?.criteria_locator === "composite_scope_gate",
  );
  const scopeIds = [...new Set(scopeNodes.map((node) => node.predicate.scope_id))].sort(codeUnitCompare);
  check(scopeIds.length === EXPECTED.scopes, "SCOPE_COUNT", `${scopeIds.length} != ${EXPECTED.scopes}`);
  for (const scopeId of scopeIds) {
    const gates = scopeNodes
      .filter((node) => node.predicate.scope_id === scopeId)
      .map((node) => node.predicate.gate);
    check(
      sameSet(gates, SCOPE_PRIMARY_GATES),
      "SCOPE_PRIMARY_GATES",
      `${scopeId}: ${gates.sort().join(", ")}`,
    );
    const cert = graph.nodeById.get(`${scopeId}-CERT`);
    check(cert?.kind === "derived", "SCOPE_CERT_MISSING", `${scopeId}-CERT`);
    const expectedOperands = [
      ...SCOPE_PRIMARY_GATES.map((gate) => `${scopeId}-${gate}`),
      "LANG-200-HARNESS",
    ];
    check(
      sameSet(cert?.formula?.operands ?? [], expectedOperands),
      "SCOPE_CERT_FORMULA",
      `${scopeId}-CERT`,
    );
  }
  check(
    scopeNodes.length + scopeIds.length === EXPECTED.scopes * EXPECTED.scopeGates,
    "SCOPE_30_X_8",
    `${scopeNodes.length}+${scopeIds.length} != ${EXPECTED.scopes * EXPECTED.scopeGates}`,
  );

  const rows = contributionRows(readFileSync(COMMITS_PATH, "utf8"));
  const rowIds = rows.map((row) => row.id);
  check(rows.length === EXPECTED.concreteRows, "CONCRETE_ROW_COUNT", `${rows.length} != ${EXPECTED.concreteRows}`);
  check(duplicates(rowIds).length === 0, "CONCRETE_ROW_DUPLICATES", duplicates(rowIds).join(", "));
  const concrete = (ledger.contributions ?? []).filter(
    (item) => item.source?.row_kind === "concrete_row",
  );
  check(
    concrete.length === EXPECTED.concreteRows,
    "LEDGER_CONCRETE_COUNT",
    `${concrete.length} != ${EXPECTED.concreteRows}`,
  );
  check(
    sameSet(rowIds, concrete.map((item) => item.contribution_id)),
    "CONCRETE_ROW_LEDGER_MISMATCH",
    `solo-md=${rowIds.filter((id) => !graph.contributionById.has(id)).join(",")}; ` +
      `solo-ledger=${concrete
        .map((item) => item.contribution_id)
        .filter((id) => !rowIds.includes(id))
        .join(",")}`,
  );
  for (const item of concrete) {
    check(
      item.source?.row_id === item.contribution_id,
      "CONCRETE_SOURCE_ROW_ID",
      item.contribution_id,
    );
  }

  const expansions = (ledger.contributions ?? []).filter(
    (item) => item.source?.row_kind === "c6_scope_expansion",
  );
  check(
    expansions.length === EXPECTED.scopeExpansions,
    "SCOPE_EXPANSION_COUNT",
    `${expansions.length} != ${EXPECTED.scopeExpansions}`,
  );
  const expansionKeys = expansions.map(
    (item) => `${item.source?.scope_id}\u0000${item.source?.suffix}`,
  );
  check(
    duplicates(expansionKeys).length === 0,
    "SCOPE_EXPANSION_DUPLICATES",
    duplicates(expansionKeys).join(", "),
  );
  for (const scopeId of scopeIds) {
    const suffixes = expansions
      .filter((item) => item.source?.scope_id === scopeId)
      .map((item) => item.source?.suffix);
    check(
      sameSet(suffixes, SCOPE_SUFFIXES),
      "SCOPE_EXPANSION_SUFFIXES",
      `${scopeId}: ${suffixes.sort().join(", ")}`,
    );
  }

  const repos = [...new Set((ledger.contributions ?? []).map((item) => item.owner_repo))].sort();
  check(repos.length === EXPECTED.repositories, "REPOSITORY_COUNT", `${repos.length} != ${EXPECTED.repositories}`);
  check(sameSet(repos, EXPECTED_REPOS), "REPOSITORY_SET", repos.join(", "));
  return scopeIds;
}

function candidateLogicalKey(setKind, member) {
  if (typeof member === "string") return member;
  if (!member || typeof member !== "object") return jsonCanonical(member);
  switch (setKind) {
    case "evaluation_closure":
    case "release_train_closure":
      return `${member.member_kind}\u0000${member.member_id}\u0000${member.subject_version}`;
    case "evaluation_observation":
      return `${member.observation_kind}\u0000${member.node_id}\u0000${member.node_version}`;
    case "planned_operational_gate":
      return `${member.node_id}\u0000${member.node_version}`;
    case "planned_input_subject":
      return `${member.member_kind}\u0000${member.member_id}\u0000${member.subject_version}`;
    case "allowed_next_action":
      return String(member.operation);
    case "planned_tooling_subject":
      return `${member.contribution_id}\u0000${member.contribution_version}`;
    case "pass_claim_target":
      return `${member.node_id}\u0000${member.node_version}`;
    case "required_pass_member":
      return `${member.member_kind}\u0000${member.member_id}\u0000${member.subject_version}`;
    default:
      return jsonCanonical(member);
  }
}

function dependencyBindingKey(binding) {
  return [
    binding?.dependency_type ?? binding?.type ?? "",
    binding?.contract_id ?? "",
    binding?.contract_version ?? "",
    binding?.required_state ?? "",
  ].join("\u0000");
}

function mappingByKind(ledger) {
  const contract = ledger.canonical_set_commitment_contract;
  check(contract && typeof contract === "object", "CANONICAL_SET_CONTRACT_MISSING");
  const mappings = contract?.sets;
  check(Array.isArray(mappings), "CANONICAL_SET_MAPPING_MISSING", "canonical_set_commitment_contract.sets[]");
  const byKind = new Map();
  for (const mapping of mappings ?? []) {
    check(
      typeof mapping.set_kind === "string" && mapping.set_kind.length > 0,
      "CANONICAL_SET_KIND_INVALID",
      JSON.stringify(mapping),
    );
    if (mapping.set_kind) {
      check(!byKind.has(mapping.set_kind), "CANONICAL_SET_KIND_DUPLICATE", mapping.set_kind);
      byKind.set(mapping.set_kind, mapping);
    }
    for (const field of ["root_field", "count_field", "members_field", "logical_key_rule"]) {
      check(
        typeof mapping[field] === "string" && mapping[field].length > 0,
        "CANONICAL_SET_MAPPING_FIELD",
        `${mapping.set_kind}.${field}`,
      );
    }
  }
  check(
    sameSet([...byKind.keys()], REQUIRED_CANDIDATE_SET_KINDS),
    "CANONICAL_SET_KIND_SET",
    [...byKind.keys()].sort().join(", "),
  );
  if ("closure_id_set_sha256" in ledger) {
    const exactProgramMapping = (contract?.program_sets ?? []).some(
      (mapping) =>
        mapping.root_field === "closure_id_set_sha256" &&
        typeof mapping.set_kind === "string" &&
        String(mapping.domain_template ?? mapping.domain ?? "").includes("solguard:program-set:"),
    );
    check(
      exactProgramMapping,
      "AMBIGUOUS_LEGACY_CLOSURE_ID_HASH",
      "closure_id_set_sha256 sin mapping program-set exacto",
    );
  }
  return byKind;
}

function normalizeClosureMember(value) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return null;
  if (typeof value.member_id === "string") {
    if (value.member_id.includes(":")) return value.member_id;
    return `${value.member_kind === "contribution" ? "contribution" : "node"}:${value.member_id}`;
  }
  return null;
}

function normalizeClaimTarget(value) {
  if (typeof value === "string") return value.replace(/^node:/, "");
  return value?.node_id ?? value?.target_id ?? value?.member_id ?? null;
}

const RESOURCE_PROFILE_REQUIRED_FIELDS = Object.freeze([
  "resource_profile_id",
  "resource_profile_version",
  "hardware_class",
  "runtime_class",
  "hardware_root",
  "runtime_root",
  "wall_time_p95_ms_max",
  "wall_time_ms_max",
  "cpu_time_ms_max",
  "peak_ram_bytes_max",
  "peak_disk_bytes_max",
  "solver_time_ms_max",
  "model_calls_max",
  "model_tokens_max",
  "model_cost_minor_units_max",
  "retry_count_max",
  "throughput_targets_per_hour_min",
  "concurrency_limit",
  "queue_limit",
  "candidate_limit",
  "continuation_limit",
  "model_timeout_rate_max",
  "schema_failure_rate_max",
  "model_failure_rate_max",
  "schema_or_model_failure_rate_max",
  "filter_failure_count_max",
  "control_oom_count_max",
  "control_disk_exhaustion_count_max",
  "control_noncompletion_count_max",
]);

const RESOURCE_PROFILE_HARD_RATES = Object.freeze({
  model_timeout_rate_max: 0.02,
  schema_failure_rate_max: 0.01,
  model_failure_rate_max: 0.01,
  schema_or_model_failure_rate_max: 0.01,
  filter_failure_count_max: 0,
  control_oom_count_max: 0,
  control_disk_exhaustion_count_max: 0,
  control_noncompletion_count_max: 0,
});

const RESOURCE_PROFILE_WORKLOAD_LIMITS = Object.freeze({
  review_median_max: 10,
  review_p95_max: 25,
  raw_pass_median_max: 15,
  raw_pass_p95_max: 40,
  inconclusive_median_max: 10,
  inconclusive_p95_max: 25,
  candidate_median_max: 50,
  candidate_p95_max: 100,
  proof_debt_median_max: 10,
  proof_debt_p95_max: 25,
});

function expectedResourceProfilePolicy(ledger, policyId) {
  return {
    schema_version: "solguard-resource-profile-policy.v1",
    program_id: ledger.program_id,
    program_version: ledger.program_version,
    policy_id: policyId,
    policy_version: 1,
    required_profile_fields: RESOURCE_PROFILE_REQUIRED_FIELDS,
    hard_rates: RESOURCE_PROFILE_HARD_RATES,
    rate_comparison_semantics:
      "actual_rate_strictly_less_than_configured_max; actual_count_lte_configured_max",
    workload_burden_limits: RESOURCE_PROFILE_WORKLOAD_LIMITS,
  };
}

function validateResourceProfilePolicies(ledger, graph, candidates) {
  const policies = ledger.resource_profile_policy_registry;
  check(
    Array.isArray(policies),
    "RESOURCE_PROFILE_POLICY_REGISTRY_MISSING",
    "ledger.resource_profile_policy_registry[]",
  );
  if (!Array.isArray(policies)) return;

  check(policies.length === 2, "RESOURCE_PROFILE_POLICY_REGISTRY_COUNT", `${policies.length} != 2`);
  const policyIds = policies.map((policy) => policy?.policy_id);
  check(
    duplicates(policyIds).length === 0,
    "RESOURCE_PROFILE_POLICY_ID_DUPLICATE",
    duplicates(policyIds).join(", "),
  );
  const expectedIdsByEpoch = new Map([
    ["RC-V-EVM-1", "solguard-resource-profile-policy-vertical-v1"],
    ["RC-FULL-1", "solguard-resource-profile-policy-full-v1"],
  ]);
  check(
    sameSet(policyIds, [...expectedIdsByEpoch.values()]),
    "RESOURCE_PROFILE_POLICY_ID_SET",
    policyIds.join(", "),
  );

  const policyById = new Map(policies.map((policy) => [policy?.policy_id, policy]));
  const policyRoots = [];
  for (const [policyId, policy] of policyById.entries()) {
    check(policy && typeof policy === "object" && !Array.isArray(policy), "RESOURCE_PROFILE_POLICY_RECORD", policyId);
    if (!policy || typeof policy !== "object" || Array.isArray(policy)) continue;
    check(!containsNull(policy), "RESOURCE_PROFILE_POLICY_NULL", policyId);
    check(
      sameSet(Object.keys(policy), [
        "schema_version",
        "program_id",
        "program_version",
        "policy_id",
        "policy_version",
        "required_profile_fields",
        "hard_rates",
        "rate_comparison_semantics",
        "workload_burden_limits",
        "policy_root",
      ]),
      "RESOURCE_PROFILE_POLICY_CLOSED_RECORD",
      policyId,
    );

    const { policy_root: policyRoot, ...payload } = policy;
    const expectedPayload = expectedResourceProfilePolicy(ledger, policyId);
    check(
      jsonCanonical(payload) === jsonCanonical(expectedPayload),
      "RESOURCE_PROFILE_POLICY_EXACT_CONTENT",
      policyId,
    );
    const expectedRoot = sha256Domain("solguard:resource-profile-policy:v1", payload);
    check(
      typeof policyRoot === "string" && /^[0-9a-f]{64}$/.test(policyRoot),
      "RESOURCE_PROFILE_POLICY_ROOT_TYPE",
      policyId,
    );
    check(
      policyRoot === expectedRoot,
      "RESOURCE_PROFILE_POLICY_ROOT_RECOMPUTE",
      `${policyId}: ${policyRoot} != ${expectedRoot}`,
    );
    policyRoots.push(policyRoot);
  }
  check(
    duplicates(policyRoots).length === 0,
    "RESOURCE_PROFILE_POLICY_ROOT_DUPLICATE",
    duplicates(policyRoots).join(", "),
  );

  for (const [epochId, expectedPolicyId] of expectedIdsByEpoch.entries()) {
    const candidate = candidates.find((item) => item.candidate_epoch_id === epochId);
    const node = graph.nodeById.get(epochId);
    const policy = policyById.get(expectedPolicyId);
    check(Boolean(candidate), "RESOURCE_PROFILE_CANDIDATE_MISSING", epochId);
    check(Boolean(node), "RESOURCE_PROFILE_EPOCH_NODE_MISSING", epochId);
    check(Boolean(policy), "RESOURCE_PROFILE_POLICY_FOR_EPOCH_MISSING", `${epochId}:${expectedPolicyId}`);
    if (!candidate || !node || !policy) continue;
    for (const field of [
      "resource_profile_policy_id",
      "resource_profile_policy_version",
      "resource_profile_policy_root",
    ]) {
      const policyField = field.replace(/^resource_profile_/, "");
      check(
        candidate[field] === policy[policyField],
        "RESOURCE_PROFILE_CANDIDATE_POLICY_REFERENCE",
        `${epochId}.${field}`,
      );
      check(
        node.epoch_constants?.[field] === policy[policyField],
        "RESOURCE_PROFILE_EPOCH_CONSTANT_POLICY_REFERENCE",
        `${epochId}.${field}`,
      );
      check(
        node.epoch_constants?.[field] === candidate[field],
        "RESOURCE_PROFILE_CANDIDATE_EPOCH_MISMATCH",
        `${epochId}.${field}`,
      );
    }
    check(candidate.resource_profile_policy_id === expectedPolicyId, "RESOURCE_PROFILE_POLICY_EPOCH_ID", epochId);
  }
}

function validateCanonicalCandidateSets(ledger, graph) {
  const byKind = mappingByKind(ledger);
  const registry = ledger.candidate_epoch_registry ?? [];
  check(registry.length === 2, "CANDIDATE_REGISTRY_COUNT", `${registry.length} != 2`);

  for (const candidate of registry) {
    const epochId = candidate.candidate_epoch_id;
    check(typeof epochId === "string", "CANDIDATE_ID_MISSING", JSON.stringify(candidate).slice(0, 120));
    for (const [setKind, mapping] of byKind.entries()) {
      const members = candidate[mapping.members_field];
      const count = candidate[mapping.count_field];
      const root = candidate[mapping.root_field];
      check(Array.isArray(members), "CANDIDATE_SET_MEMBERS", `${epochId}.${mapping.members_field}`);
      check(Number.isInteger(count), "CANDIDATE_SET_COUNT_TYPE", `${epochId}.${mapping.count_field}`);
      check(
        typeof root === "string" && /^[0-9a-f]{64}$/.test(root),
        "CANDIDATE_SET_ROOT_TYPE",
        `${epochId}.${mapping.root_field}`,
      );
      if (!Array.isArray(members)) continue;
      check(count === members.length, "CANDIDATE_SET_COUNT", `${epochId}.${setKind}: ${count} != ${members.length}`);
      check(
        !members.some(containsNull),
        "CANDIDATE_SET_NULL_MEMBER",
        `${epochId}.${setKind}`,
      );
      const keys = members.map((member) => candidateLogicalKey(setKind, member));
      check(
        keys.every((key) => typeof key === "string" && !key.includes("undefined")),
        "CANDIDATE_SET_LOGICAL_KEY",
        `${epochId}.${setKind}`,
      );
      check(
        duplicates(keys).length === 0,
        "CANDIDATE_SET_DUPLICATE_KEY",
        `${epochId}.${setKind}: ${duplicates(keys).join(", ")}`,
      );
      check(
        keys.every((key, index) => index === 0 || keys[index - 1] < key),
        "CANDIDATE_SET_ORDER",
        `${epochId}.${setKind}`,
      );
      const payload = {
        schema_version: "solguard-canonical-set-commitment.v1",
        program_id: ledger.program_id,
        program_version: ledger.program_version,
        candidate_epoch_id: epochId,
        set_kind: setKind,
        member_count: members.length,
        members,
      };
      const expectedRoot = sha256Domain(`solguard:candidate-set:${setKind}:v1`, payload);
      check(
        root === expectedRoot,
        "CANDIDATE_SET_ROOT",
        `${epochId}.${setKind}: ${root} != ${expectedRoot}`,
      );
    }

    const evaluation = candidate[byKind.get("evaluation_closure")?.members_field] ?? [];
    const release = candidate[byKind.get("release_train_closure")?.members_field] ?? [];
    const evaluationRefs = evaluation.map(normalizeClosureMember);
    const releaseRefs = release.map(normalizeClosureMember);
    check(!("node_count" in candidate), "AMBIGUOUS_CANDIDATE_NODE_COUNT", epochId);
    check(!("contribution_count" in candidate), "AMBIGUOUS_CANDIDATE_CONTRIBUTION_COUNT", epochId);
    const summaryFields = [
      "evaluation_node_count",
      "release_train_node_count",
      "evaluation_contribution_count",
      "release_train_contribution_count",
    ];
    if (summaryFields.some((field) => field in candidate)) {
      for (const field of summaryFields) {
        check(Number.isInteger(candidate[field]), "CANDIDATE_SUMMARY_COUNT_MISSING", `${epochId}.${field}`);
      }
      check(
        candidate.evaluation_node_count ===
          evaluation.filter((member) => member.member_kind !== "contribution").length,
        "CANDIDATE_EVALUATION_NODE_COUNT",
        epochId,
      );
      check(
        candidate.release_train_node_count ===
          release.filter((member) => member.member_kind !== "contribution").length,
        "CANDIDATE_RELEASE_NODE_COUNT",
        epochId,
      );
      check(
        candidate.evaluation_contribution_count ===
          evaluation.filter((member) => member.member_kind === "contribution").length,
        "CANDIDATE_EVALUATION_CONTRIBUTION_COUNT",
        epochId,
      );
      check(
        candidate.release_train_contribution_count ===
          release.filter((member) => member.member_kind === "contribution").length,
        "CANDIDATE_RELEASE_CONTRIBUTION_COUNT",
        epochId,
      );
    }
    check(
      evaluationRefs.every((member) => releaseRefs.includes(member)),
      "EVALUATION_NOT_SUBSET_RELEASE",
      epochId,
    );
    const closeMember = `node:${candidate.closure_transition_target_id}`;
    check(
      typeof candidate.closure_transition_target_id === "string" &&
        graph.nodeById.has(candidate.closure_transition_target_id),
      "CANDIDATE_CLOSE_TARGET_MISSING",
      `${epochId}:${candidate.closure_transition_target_id}`,
    );
    check(!evaluationRefs.includes(closeMember), "CANDIDATE_CLOSE_INSIDE_EVALUATION", `${epochId}:${closeMember}`);
    check(releaseRefs.includes(closeMember), "CANDIDATE_CLOSE_OUTSIDE_RELEASE", `${epochId}:${closeMember}`);

    for (const [closureKind, closure] of [
      ["evaluation", evaluationRefs],
      ["release", releaseRefs],
    ]) {
      const closureSet = new Set(closure);
      for (const member of closure) {
        const [kind, id] = String(member).split(/:(.+)/);
        check(kind === "node" || kind === "contribution", "CLOSURE_MEMBER_PREFIX", `${epochId}:${member}`);
        const item = kind === "node" ? graph.nodeById.get(id) : graph.contributionById.get(id);
        check(Boolean(item), "CLOSURE_MEMBER_MISSING", `${epochId}:${member}`);
        if (!item) continue;
        if (kind === "node") {
          const importedVerticalBoundary =
            epochId === "RC-FULL-1" && item.id === "VERTICAL-EVM-CONTAMINATION-CLOSE-001";
          if (!importedVerticalBoundary) {
            for (const dependency of item.dependencies ?? []) {
              if (dependency.type === "historical_ordering") continue;
              const dependencyTypes = dependency.dependency_bindings?.map((binding) => binding.type) ?? [dependency.type];
              const isTerminalObservation = dependencyTypes.some(
                (type) => type === "terminal_observation" || type === "terminal_derived_observation",
              );
              if (isTerminalObservation) continue;
              if (!dependencyTypes.some((type) => type === "hard" || type === "contract")) continue;
              check(
                closureSet.has(`node:${dependency.id}`),
                "CLOSURE_NODE_DEPENDENCY",
                `${epochId}.${closureKind}: ${member} -> node:${dependency.id}`,
              );
            }
          }
          for (const contributionId of item.required_contribution_ids ?? []) {
            check(
              closureSet.has(`contribution:${contributionId}`),
              "CLOSURE_REQUIRED_CONTRIBUTION",
              `${epochId}.${closureKind}: ${member} -> contribution:${contributionId}`,
            );
          }
        } else {
          for (const dependency of item.dependencies ?? []) {
            check(
              closureSet.has(`node:${dependency.id}`),
              "CLOSURE_CONTRIBUTION_NODE_DEP",
              `${epochId}.${closureKind}: ${member} -> node:${dependency.id}`,
            );
          }
          for (const dependency of item.hard_contribution_dependencies ?? []) {
            const dependencyId = dependency.contribution_id ?? dependency.id;
            check(
              closureSet.has(`contribution:${dependencyId}`),
              "CLOSURE_CONTRIBUTION_DEP",
              `${epochId}.${closureKind}: ${member} -> contribution:${dependencyId}`,
            );
          }
          check(
            closureSet.has(`node:${item.parent_primary_id}`),
            "CLOSURE_CONTRIBUTION_PARENT",
            `${epochId}.${closureKind}: ${member} -> node:${item.parent_primary_id}`,
          );
        }
      }
    }

    const requiredPass = candidate[byKind.get("required_pass_member")?.members_field] ?? [];
    const passClaims = candidate[byKind.get("pass_claim_target")?.members_field] ?? [];
    const claimIds = passClaims.map(normalizeClaimTarget).filter(Boolean);
    for (const record of passClaims) {
      check(
        record && typeof record === "object" && !Array.isArray(record),
        "PASS_CLAIM_TARGET_RECORD_TYPE",
        epochId,
      );
      if (!record || typeof record !== "object" || Array.isArray(record)) continue;
      check(
        sameSet(Object.keys(record), ["node_id", "node_version", "required_computed_state"]),
        "PASS_CLAIM_TARGET_CLOSED_RECORD",
        `${epochId}:${JSON.stringify(record)}`,
      );
      const referenced = graph.nodeById.get(record.node_id);
      check(
        referenced?.kind === "derived" && record.required_computed_state === "satisfied",
        "PASS_CLAIM_TARGET_KIND",
        `${epochId}:${record.node_id}`,
      );
      check(
        record.node_version === referenced?.node_version,
        "PASS_CLAIM_TARGET_VERSION",
        `${epochId}:${record.node_id}`,
      );
    }
    const expectedRequiredPass = evaluationRefs.filter((member) => {
      if (!member.startsWith("node:")) return true;
      return !claimIds.includes(member.slice("node:".length));
    });
    const normalizedRequiredPass = requiredPass.map(normalizeClosureMember).filter(Boolean);
    check(
      requiredPass.every((record) => record && typeof record === "object" && !Array.isArray(record)),
      "REQUIRED_PASS_LEGACY_STRING_RECORD",
      epochId,
    );
    for (const record of requiredPass) {
      if (!record || typeof record !== "object" || Array.isArray(record)) continue;
      const ref = normalizeClosureMember(record);
      const [refPrefix, refId] = String(ref).split(/:(.+)/);
      const referenced =
        refPrefix === "node" ? graph.nodeById.get(refId) : graph.contributionById.get(refId);
      check(Boolean(referenced), "REQUIRED_PASS_MEMBER_REF", `${epochId}:${ref}`);
      const actualKind = refPrefix === "contribution" ? "contribution" : referenced?.kind;
      check(record.member_kind === actualKind, "REQUIRED_PASS_MEMBER_KIND", `${epochId}:${ref}`);
      check(record.member_id === refId, "REQUIRED_PASS_MEMBER_ID", `${epochId}:${ref}`);
      const actualVersion =
        refPrefix === "contribution" ? referenced?.contribution_version : referenced?.node_version;
      check(record.subject_version === actualVersion, "REQUIRED_PASS_MEMBER_VERSION", `${epochId}:${ref}`);
      if (actualKind === "derived") {
        check(
          sameSet(Object.keys(record), [
            "member_kind",
            "member_id",
            "subject_version",
            "required_computed_state",
          ]),
          "REQUIRED_PASS_DERIVED_CLOSED_RECORD",
          `${epochId}:${ref}`,
        );
        check(record.required_computed_state === "satisfied", "REQUIRED_PASS_DERIVED_STATE", `${epochId}:${ref}`);
        check(!("required_state" in record), "REQUIRED_PASS_DERIVED_UNION", `${epochId}:${ref}`);
      } else {
        check(
          sameSet(Object.keys(record), [
            "member_kind",
            "member_id",
            "subject_version",
            "required_state",
          ]),
          "REQUIRED_PASS_STATE_CLOSED_RECORD",
          `${epochId}:${ref}`,
        );
        check(record.required_state === "accepted", "REQUIRED_PASS_ACCEPTED_STATE", `${epochId}:${ref}`);
        check(!("required_computed_state" in record), "REQUIRED_PASS_STATE_UNION", `${epochId}:${ref}`);
      }
    }
    check(
      sameSet(normalizedRequiredPass, expectedRequiredPass),
      "REQUIRED_PASS_MEMBERS",
      `${epochId}: ${normalizedRequiredPass.length} != ${expectedRequiredPass.length}`,
    );
    check(
      !Object.keys(candidate).some((key) => key.startsWith("claim_required_pass")),
      "LEGACY_CLAIM_REQUIRED_PASS_FIELD",
      epochId,
    );

    check(
      !Object.keys(candidate).some((key) => key.startsWith("claim_observation")),
      "RUNTIME_CLAIM_OBSERVATION_IN_CANDIDATE_SEED",
      epochId,
    );
    const evaluationObservations =
      candidate[byKind.get("evaluation_observation")?.members_field] ?? [];
    for (const record of evaluationObservations) {
      const observed = graph.nodeById.get(record.node_id);
      check(Boolean(observed), "EVALUATION_OBSERVATION_REF", `${epochId}:${record.node_id}`);
      check(
        evaluationRefs.includes(`node:${record.node_id}`),
        "EVALUATION_OBSERVATION_OUTSIDE_CLOSURE",
        `${epochId}:${record.node_id}`,
      );
      check(
        record.observation_kind === observed?.kind,
        "EVALUATION_OBSERVATION_KIND",
        `${epochId}:${record.node_id}`,
      );
    }
    check(
      !evaluationObservations.some((record) => claimIds.includes(record.node_id)),
      "CLAIM_DUPLICATED_IN_EVALUATION_OBSERVATIONS",
      epochId,
    );
    const forbiddenObservationIds = new Set([
      epochId,
      candidate.closure_transition_target_id,
      ...claimIds,
      "FINAL-001",
      "FINAL-002",
      "FINAL-003",
      "FINAL-004",
      "FINAL-005",
      "FINAL-006",
      "FINAL-007",
      "CLAIM-007",
      "CLAIM-008",
      "RELEASE-914",
    ]);
    check(
      !evaluationObservations.some((record) => forbiddenObservationIds.has(record.node_id)),
      "INVALID_EVALUATION_OBSERVATION_DOMAIN",
      `${epochId}: ${evaluationObservations
        .filter((record) => forbiddenObservationIds.has(record.node_id))
        .map((record) => record.node_id)
        .join(", ")}`,
    );
    const plannedGateField = byKind.get("planned_operational_gate")?.members_field;
    const plannedGateIds = (candidate[plannedGateField] ?? []).map((record) => record.node_id);
    const expectedPlannedGateIds = [
      ...evaluationObservations.map((record) => record.node_id),
      ...claimIds,
      candidate.closure_transition_target_id,
    ];
    check(
      duplicates(expectedPlannedGateIds).length === 0,
      "OPERATIONAL_GATE_DOMAIN_NOT_DISJOINT",
      `${epochId}: ${duplicates(expectedPlannedGateIds).join(", ")}`,
    );
    check(
      sameSet(plannedGateIds, expectedPlannedGateIds),
      "PLANNED_OPERATIONAL_GATE_DOMAIN",
      `${epochId}: planned=${plannedGateIds.length}, expected=${expectedPlannedGateIds.length}`,
    );
    check(!plannedGateIds.includes(epochId), "CANDIDATE_OPEN_IN_OPERATIONAL_GATES", epochId);
    for (const action of candidate[byKind.get("allowed_next_action")?.members_field] ?? []) {
      check(
        Object.hasOwn(ledger.transition_contract?.operations ?? {}, action.operation),
        "CANDIDATE_ACTION_UNKNOWN",
        `${epochId}:${action.operation}`,
      );
    }

    const tooling = candidate[byKind.get("planned_tooling_subject")?.members_field] ?? [];
    const toolingIds = tooling.map((record) => record.contribution_id);
    const releaseContributionIds = releaseRefs
      .filter((member) => member.startsWith("contribution:"))
      .map((member) => member.slice("contribution:".length));
    check(
      sameSet(toolingIds, releaseContributionIds),
      "CANDIDATE_TOOLING_NOT_EXACT_CLOSURE",
      `${epochId}: tooling=${toolingIds.length}, closure=${releaseContributionIds.length}`,
    );

    const plannedInputs = candidate[byKind.get("planned_input_subject")?.members_field] ?? [];
    const candidateNode = graph.nodeById.get(epochId);
    check(Boolean(candidateNode), "CANDIDATE_OPEN_NODE_MISSING", epochId);
    const directDependencies = (candidateNode?.dependencies ?? []).filter(
      (dependency) => dependency.type !== "historical_ordering",
    );
    check(
      duplicates(directDependencies.map((dependency) => dependency.id)).length === 0,
      "CANDIDATE_DUPLICATE_LOGICAL_DEPENDENCY",
      `${epochId}: ${duplicates(directDependencies.map((dependency) => dependency.id)).join(", ")}`,
    );
    const expectedInputSubjects = [
      ...directDependencies.map((dependency) => {
        const referenced = graph.nodeById.get(dependency.id);
        return {
          member_kind: referenced?.kind,
          member_id: dependency.id,
          subject_version: referenced?.node_version,
        };
      }),
      ...(candidateNode?.required_contribution_ids ?? []).map((contributionId) => {
        const referenced = graph.contributionById.get(contributionId);
        return {
          member_kind: "contribution",
          member_id: contributionId,
          subject_version: referenced?.contribution_version,
        };
      }),
    ];
    check(
      sameSet(
        plannedInputs.map((record) => candidateLogicalKey("planned_input_subject", record)),
        expectedInputSubjects.map((record) => candidateLogicalKey("planned_input_subject", record)),
      ),
      "CANDIDATE_INPUT_DEPENDENCY_SET",
      `${epochId}: input=${plannedInputs.length}, deps=${expectedInputSubjects.length}`,
    );
    for (const record of plannedInputs) {
      const referenced =
        record.member_kind === "contribution"
          ? graph.contributionById.get(record.member_id)
          : graph.nodeById.get(record.member_id);
      check(
        record.member_kind === (record.member_kind === "contribution" ? "contribution" : referenced?.kind),
        "CANDIDATE_INPUT_MEMBER_KIND",
        `${epochId}:${record.member_id}`,
      );
      check(
        record.subject_version ===
          (record.member_kind === "contribution"
            ? referenced?.contribution_version
            : referenced?.node_version),
        "CANDIDATE_INPUT_SUBJECT_VERSION",
        `${epochId}:${record.member_id}`,
      );
      check(
        sameSet(Object.keys(record), [
          "member_kind",
          "member_id",
          "subject_version",
          "dependency_bindings",
        ]),
        "CANDIDATE_INPUT_CLOSED_RECORD",
        `${epochId}:${record.member_id}`,
      );
      check(
        Array.isArray(record.dependency_bindings) && record.dependency_bindings.length > 0,
        "CANDIDATE_INPUT_BINDINGS",
        `${epochId}:${record.member_id}`,
      );
      const bindingKeys = (record.dependency_bindings ?? []).map(dependencyBindingKey);
      check(
        duplicates(bindingKeys).length === 0 &&
          bindingKeys.every((key, index) => index === 0 || codeUnitCompare(bindingKeys[index - 1], key) < 0),
        "CANDIDATE_INPUT_BINDING_ORDER",
        `${epochId}:${record.member_id}`,
      );
    }

    for (const forbiddenRuntimeField of [
      "resource_profile_id",
      "resource_profile_version",
      "resource_profile_root",
    ]) {
      check(
        !(forbiddenRuntimeField in candidate),
        "RUNTIME_RESOURCE_PROFILE_IN_SEED",
        `${epochId}.${forbiddenRuntimeField}`,
      );
    }
    check(
      typeof candidate.resource_profile_policy_id === "string" &&
        candidate.resource_profile_policy_id.length > 0,
      "RESOURCE_PROFILE_POLICY_ID",
      epochId,
    );
    check(
      Number.isInteger(candidate.resource_profile_policy_version) &&
        candidate.resource_profile_policy_version > 0,
      "RESOURCE_PROFILE_POLICY_VERSION",
      epochId,
    );
    check(
      typeof candidate.resource_profile_policy_root === "string" &&
        /^[0-9a-f]{64}$/.test(candidate.resource_profile_policy_root),
      "RESOURCE_PROFILE_POLICY_ROOT",
      epochId,
    );
    const openRequired = new Set(candidateNode?.evidence_descriptor?.required ?? []);
    for (const field of [
      "resource_profile_id",
      "resource_profile_version",
      "resource_profile_root",
      "resource_profile_policy_id",
      "resource_profile_policy_version",
      "resource_profile_policy_root",
      "resource_profile_policy_compliance_root",
    ]) {
      check(openRequired.has(field), "CANDIDATE_OPEN_RESOURCE_FIELD", `${epochId}:${field}`);
    }
  }

  validateResourceProfilePolicies(ledger, graph, registry);

  const vertical = registry.find((item) => item.candidate_epoch_id === "RC-V-EVM-1");
  const full = registry.find((item) => item.candidate_epoch_id === "RC-FULL-1");
  check(Boolean(vertical), "VERTICAL_EPOCH_REGISTRY_MISSING");
  check(Boolean(full), "FULL_EPOCH_REGISTRY_MISSING");
  if (vertical && full) {
    check(
      !("historical_boundary_member_records" in vertical),
      "VERTICAL_HAS_HISTORICAL_BOUNDARY_IMPORT",
    );
    const passField = byKind.get("pass_claim_target")?.members_field;
    check(
      sameSet((vertical[passField] ?? []).map(normalizeClaimTarget), ["CLAIM-VERTICAL-EVM-001"]),
      "VERTICAL_PASS_CLAIM_TARGET",
    );
    check(
      sameSet((full[passField] ?? []).map(normalizeClaimTarget), [
        "CLAIM-001",
        "CLAIM-002",
        "CLAIM-003",
        "CLAIM-004",
        "CLAIM-005",
        "CLAIM-006",
      ]),
      "FULL_PASS_CLAIM_TARGETS",
    );
    check(
      vertical.closure_transition_target_id === "VERTICAL-EVM-CONTAMINATION-CLOSE-001",
      "VERTICAL_CLOSE_TARGET",
      String(vertical.closure_transition_target_id),
    );
    check(
      full.closure_transition_target_id === "RC-FULL-1-CLOSE",
      "FULL_CLOSE_TARGET",
      String(full.closure_transition_target_id),
    );
    check(full.release_terminal_target_id === "FINAL-007", "FULL_RELEASE_TERMINAL", String(full.release_terminal_target_id));

    const evalField = byKind.get("evaluation_closure")?.members_field;
    const releaseField = byKind.get("release_train_closure")?.members_field;
    const fullEval = new Set((full[evalField] ?? []).map(normalizeClosureMember));
    const fullRelease = new Set((full[releaseField] ?? []).map(normalizeClosureMember));
    check(
      fullEval.has("node:VERTICAL-EVM-CONTAMINATION-CLOSE-001"),
      "FULL_IMMUTABLE_VERTICAL_BOUNDARY_MISSING",
    );
    check(!fullRelease.has("node:RC-V-EVM-1"), "FULL_IMPORTS_VERTICAL_OPEN_NODE");
    check(full.parent_candidate_epoch_id === "RC-V-EVM-1", "FULL_PARENT_EPOCH_ID");
    const boundaryRecords = full.historical_boundary_member_records;
    check(
      Array.isArray(boundaryRecords) && boundaryRecords.length === 1,
      "FULL_BOUNDARY_RECORD_COUNT",
      String(boundaryRecords?.length),
    );
    const boundary = boundaryRecords?.[0] ?? {};
    check(
      sameSet(Object.keys(boundary), [
        "member_kind",
        "member_id",
        "subject_version",
        "contract_id",
        "contract_version",
        "accepted_closure_outcomes",
        "dependency_expansion",
      ]),
      "FULL_BOUNDARY_CLOSED_RECORD",
      JSON.stringify(boundary),
    );
    check(boundary.member_kind === "primary", "FULL_BOUNDARY_KIND", String(boundary.member_kind));
    check(
      boundary.member_id === "VERTICAL-EVM-CONTAMINATION-CLOSE-001",
      "FULL_BOUNDARY_ID",
      String(boundary.member_id),
    );
    check(
      boundary.subject_version === graph.nodeById.get(boundary.member_id)?.node_version,
      "FULL_BOUNDARY_VERSION",
      String(boundary.subject_version),
    );
    check(
      boundary.contract_id === "solguard-candidate-epoch-closure-receipt.v1" &&
        boundary.contract_version === "v1",
      "FULL_BOUNDARY_CONTRACT_ID",
      `${boundary.contract_id}@${boundary.contract_version}`,
    );
    check(
      sameSet(boundary.accepted_closure_outcomes ?? [], ["closed_pass", "closed_nonpass"]),
      "FULL_BOUNDARY_OUTCOMES",
      JSON.stringify(boundary.accepted_closure_outcomes),
    );
    check(
      boundary.dependency_expansion === "forbidden",
      "FULL_BOUNDARY_DEPENDENCY_EXPANSION",
      String(boundary.dependency_expansion),
    );
    const fullBoundaryText = JSON.stringify({
      candidate: full,
      candidateContract: ledger.candidate_epoch_contract,
      closureDomain: ledger.closure_domain_contract,
    });
    check(
      fullBoundaryText.includes("VERTICAL-EVM-CONTAMINATION-CLOSE-001") &&
        /immutable[_ ]boundary/i.test(fullBoundaryText),
      "FULL_VERTICAL_BOUNDARY_CONTRACT",
    );
    const postClose = [
      "RC-FULL-1-CLOSE",
      "FINAL-001",
      "FINAL-002",
      "FINAL-003",
      "FINAL-004",
      "FINAL-005",
      "FINAL-006",
      "FINAL-007",
      "CLAIM-007",
      "CLAIM-008",
      "RELEASE-914",
    ].map((id) => `node:${id}`);
    check(
      sameSet(
        [...fullRelease].filter((member) => !fullEval.has(member)),
        postClose,
      ),
      "FULL_EVALUATION_RELEASE_SEPARATION",
      [...fullRelease].filter((member) => !fullEval.has(member)).join(", "),
    );
  }

  const closureReceipt = ledger.candidate_epoch_closure_receipt_contract ?? {};
  const closureRequired = new Set(closureReceipt.required ?? []);
  for (const field of [
    "claim_observation_records",
    "claim_observation_count",
    "claim_observation_set_root",
    "pass_claim_target_set_root",
    "pass_claim_target_count",
  ]) {
    check(closureRequired.has(field), "CLOSURE_RUNTIME_CLAIM_FIELD", field);
  }
  const closureReceiptText = JSON.stringify(closureReceipt);
  check(
    closureReceiptText.includes("pass_claim_target") && closureReceiptText.includes("exact"),
    "CLOSURE_CLAIM_EXACT_SET_RULE",
  );

  return { byKind, registry };
}

function validateCanonicalProgramSets(ledger) {
  const mappings = ledger.canonical_set_commitment_contract?.program_sets ?? [];
  check(Array.isArray(mappings) && mappings.length === 6, "PROGRAM_SET_MAPPING_COUNT", String(mappings.length));
  const nodeMembers = (ledger.nodes ?? []).map((node) => node.id).sort(codeUnitCompare);
  const contributionMembers = (ledger.contributions ?? [])
    .map((item) => item.contribution_id)
    .sort(codeUnitCompare);
  const allMembers = [
    ...nodeMembers.map((id) => `node:${id}`),
    ...contributionMembers.map((id) => `contribution:${id}`),
  ].sort(codeUnitCompare);
  const ownershipById = new Map(
    (ledger.closure_domain_contract?.ownership_domains ?? []).map((domain) => [domain.domain_id, domain]),
  );

  for (const mapping of mappings) {
    let members;
    let subject;
    let root;
    let count;
    if (mapping.set_kind === "node_id") {
      members = nodeMembers;
      subject = "program";
      root = ledger.node_id_set_sha256;
      count = (ledger.state_counts?.primary_total ?? 0) + (ledger.state_counts?.derived_total ?? 0);
    } else if (mapping.set_kind === "contribution_id") {
      members = contributionMembers;
      subject = "program";
      root = ledger.contribution_id_set_sha256;
      count = ledger.state_counts?.contribution_total;
    } else if (mapping.set_kind === "all_counted_item_id") {
      members = allMembers;
      subject = "program";
      root = ledger.all_counted_item_id_set_sha256;
      count = ledger.state_counts?.counted_item_total;
    } else if (mapping.set_kind.startsWith("ownership_domain_")) {
      subject = mapping.set_kind.slice("ownership_domain_".length);
      const domain = ownershipById.get(subject);
      check(Boolean(domain), "PROGRAM_OWNERSHIP_DOMAIN_MISSING", subject);
      members = domain?.membership_ids ?? [];
      root = domain?.membership_root;
      count = domain?.membership_count;
    } else {
      check(false, "PROGRAM_SET_KIND_UNKNOWN", mapping.set_kind);
      continue;
    }
    check(count === members.length, "PROGRAM_SET_COUNT", `${mapping.set_kind}: ${count} != ${members.length}`);
    check(duplicates(members).length === 0, "PROGRAM_SET_DUPLICATE", mapping.set_kind);
    check(
      members.every((member, index) => index === 0 || codeUnitCompare(members[index - 1], member) < 0),
      "PROGRAM_SET_ORDER",
      mapping.set_kind,
    );
    const payload = {
      schema_version: "solguard-canonical-set-commitment.v1",
      program_id: ledger.program_id,
      program_version: ledger.program_version,
      subject,
      set_kind: mapping.set_kind,
      member_count: members.length,
      members,
    };
    const expectedRoot = sha256Domain(`solguard:program-set:${mapping.set_kind}:v1`, payload);
    check(root === expectedRoot, "PROGRAM_SET_ROOT", `${mapping.set_kind}: ${root} != ${expectedRoot}`);
  }
  check(
    ledger.id_set_sha256 === ledger.all_counted_item_id_set_sha256,
    "PROGRAM_ID_SET_ALIAS",
    `${ledger.id_set_sha256} != ${ledger.all_counted_item_id_set_sha256}`,
  );
}

function validateMilestonesAndSemantics(ledger, graph, candidateData) {
  const node = (id) => graph.nodeById.get(id);
  for (const id of ["BASELINE-009", "MODEL-411", "RC-FULL-1-CLOSE"]) {
    check(Boolean(node(id)), "REQUIRED_NODE_MISSING", id);
  }

  const gov = node("GOV-001");
  check(sameSet(gov?.required_contribution_ids ?? [], ["C0-001"]), "GOV_001_CONTRIBUTIONS");
  const baseline = node("BASELINE-009");
  check(baseline?.kind === "primary" && baseline?.operational === false, "BASELINE_KIND");
  check(
    (baseline?.dependencies ?? []).some((dependency) => dependency.id === "GOV-001" && dependency.type === "hard"),
    "BASELINE_GOV_DEPENDENCY",
  );
  check(
    sameSet(baseline?.required_contribution_ids ?? [], ["C0-001A", "C0-001B"]),
    "BASELINE_CONTRIBUTIONS",
  );
  for (const id of ["C0-001A", "C0-001B"]) {
    check(graph.contributionById.get(id)?.parent_primary_id === "BASELINE-009", "BASELINE_CONTRIBUTION_PARENT", id);
  }
  check(
    (node("RC-V-EVM-1")?.dependencies ?? []).some(
      (dependency) => dependency.id === "BASELINE-009" && dependency.type === "hard",
    ),
    "VERTICAL_BASELINE_DEPENDENCY",
  );

  const genesis = ledger.genesis_batch ?? {};
  const genesisContributions = genesis.genesis_contribution_set ?? [];
  const genesisNodes = genesis.genesis_node_set ?? [];
  const genesisOrder = genesis.topological_order ?? [];
  check(!genesisContributions.includes("C0-001A"), "GENESIS_CONTAINS_BASELINE_REPLAY_A");
  check(!genesisContributions.includes("C0-001B"), "GENESIS_CONTAINS_BASELINE_REPLAY_B");
  check(!genesisNodes.includes("BASELINE-009"), "GENESIS_CONTAINS_BASELINE_NODE");
  check(
    sameSet(genesisOrder, [...genesisContributions, ...genesisNodes]),
    "GENESIS_ORDER_MEMBERSHIP",
  );
  check(duplicates(genesisOrder).length === 0, "GENESIS_ORDER_DUPLICATES", duplicates(genesisOrder).join(", "));
  check(
    genesisOrder.indexOf("C0-001") >= 0 && genesisOrder.indexOf("C0-001") < genesisOrder.indexOf("GOV-001"),
    "GENESIS_C0_GOV_ORDER",
  );
  const genesisKeys = new Set([
    ...genesisNodes.map((id) => `node:${id}`),
    ...genesisContributions.map((id) => `contribution:${id}`),
  ]);
  const position = new Map(
    genesisOrder.map((id, index) => [
      genesisNodes.includes(id) ? `node:${id}` : `contribution:${id}`,
      index,
    ]),
  );
  for (const member of genesisKeys) {
    for (const dependency of graph.edges.get(member) ?? []) {
      check(genesisKeys.has(dependency), "GENESIS_EXTERNAL_DEPENDENCY", `${member} -> ${dependency}`);
      check(
        (position.get(dependency) ?? Number.POSITIVE_INFINITY) < (position.get(member) ?? -1),
        "GENESIS_TOPOLOGICAL_ORDER",
        `${member} -> ${dependency}`,
      );
    }
  }

  const model = node("MODEL-411");
  check(model?.kind === "primary" && model?.owner === "solguard-economic", "MODEL_411_KIND_OWNER");
  check(
    ["MODEL-403", "MODEL-404", "MODEL-410"].every((id) =>
      (model?.dependencies ?? []).some((dependency) => dependency.id === id && dependency.type === "hard"),
    ),
    "MODEL_411_DEPENDENCIES",
  );
  check(
    ["C3-013J", "C3-013K", "C3-013L", "C3-013M", "C3-013N", "C3-013O", "C3-013P"].every((id) =>
      (model?.required_contribution_ids ?? []).includes(id),
    ),
    "MODEL_411_CONTRIBUTIONS",
  );
  check(
    (node("MODEL-409")?.dependencies ?? []).some(
      (dependency) => dependency.id === "MODEL-411" && dependency.type === "hard",
    ),
    "MODEL_409_MODEL_411_DEPENDENCY",
  );
  check(
    (node("PROOF-501")?.dependencies ?? []).some(
      (dependency) =>
        dependency.id === "MODEL-411" &&
        dependency.type === "contract" &&
        dependency.contract_id === "solguard-economic-adversary-model.v1",
    ),
    "PROOF_501_ADVERSARY_CONTRACT",
  );

  const close = node("RC-FULL-1-CLOSE");
  check(
    close?.kind === "primary" &&
      close?.operational === true &&
      close?.terminalizable === false &&
      close?.evidence_mode === "candidate_epoch_close",
    "FULL_CLOSE_SEMANTICS",
  );
  check(
    (node("FINAL-001")?.dependencies ?? []).some(
      (dependency) => dependency.id === "RC-FULL-1-CLOSE" && dependency.type === "hard",
    ),
    "FINAL_001_CLOSE_DEPENDENCY",
  );

  const blind = node("BLIND-911");
  check((blind?.formula?.operands ?? []).length === 64, "BLIND_OPERAND_COUNT", (blind?.formula?.operands ?? []).length);
  check(
    blind?.evidence_descriptor?.cardinality?.operand_event_ids === 64,
    "BLIND_EVENT_ROOT_CARDINALITY",
    String(blind?.evidence_descriptor?.cardinality?.operand_event_ids),
  );
  check(
    blind?.evidence_descriptor?.cardinality?.operand_evidence_roots === 64,
    "BLIND_EVIDENCE_ROOT_CARDINALITY",
    String(blind?.evidence_descriptor?.cardinality?.operand_evidence_roots),
  );
  check(
    blind?.evidence_descriptor?.cardinality?.scope_replica_count === 60,
    "BLIND_SCOPE_REPLICA_COUNT",
    String(blind?.evidence_descriptor?.cardinality?.scope_replica_count),
  );

  const db = node("DB-902");
  check(db?.operational === true && db?.terminalizable === true, "DB_902_TERMINALIZABLE");
  const dbOperationText = JSON.stringify(ledger.transition_contract?.operations?.record_database_cutover ?? {});
  for (const outcome of [
    "accepted",
    "terminal_failed",
    "terminal_invalid",
    "insufficient_evidence",
  ]) {
    check(dbOperationText.includes(outcome), "DB_902_OUTCOME_UNION", outcome);
  }
  const full = candidateData.registry.find((item) => item.candidate_epoch_id === "RC-FULL-1");
  const vertical = candidateData.registry.find((item) => item.candidate_epoch_id === "RC-V-EVM-1");
  const inputField = candidateData.byKind.get("planned_input_subject")?.members_field;
  const observationField = candidateData.byKind.get("evaluation_observation")?.members_field;
  check(
    (full?.[inputField] ?? []).some((record) => record.member_id === "DB-902"),
    "FULL_CANDIDATE_DB_INPUT",
  );
  check(
    (vertical?.[observationField] ?? []).some((record) => record.node_id === "DB-902"),
    "VERTICAL_DB_OBSERVATION",
  );

  for (const candidate of candidateData.registry) {
    for (const observation of candidate[observationField] ?? []) {
      if (observation.observation_kind !== "primary") continue;
      const observedNode = node(observation.node_id);
      check(
        observedNode?.terminalizable === true,
        "OBSERVED_PRIMARY_NOT_TERMINALIZABLE",
        `${candidate.candidate_epoch_id}:${observation.node_id}`,
      );
    }
  }
  const upstreamText = JSON.stringify({
    operation: ledger.transition_contract?.operations?.record_upstream_nonpass,
    contract: ledger.upstream_nonpass_receipt_contract,
  });
  for (const token of ["terminalizable", "candidate_epoch", "terminal_not_run"]) {
    check(upstreamText.includes(token), "UPSTREAM_NONPASS_CONTRACT", token);
  }

  const final007 = node("FINAL-007");
  const finalText = JSON.stringify(final007 ?? {});
  const terminalText = JSON.stringify(ledger.terminal_transition_contract ?? {});
  for (const forbidden of [
    /dynamic_primary_total/i,
    /dynamic_derived_total/i,
    /dynamic_contribution_total/i,
    /across_primary_and_contributions/i,
    /all_primary_total/i,
    /all_derived_total/i,
    /all_contribution_total/i,
  ]) {
    check(!forbidden.test(finalText), "FINAL_007_GLOBAL_QUANTIFIER", forbidden.source);
    check(!forbidden.test(terminalText), "TERMINAL_GLOBAL_QUANTIFIER", forbidden.source);
  }
  for (const criterion of final007?.predicate?.must_hold ?? []) {
    if (
      /(?:all|every|zero_pending|zero_reopened).*(?:primary|derived|contribution)/i.test(criterion)
    ) {
      check(
        /release_train/i.test(criterion),
        "FINAL_007_NON_CLOSURE_QUANTIFIER",
        criterion,
      );
    }
  }
  check(ledger.terminal_transition_contract?.target === "FINAL-007", "TERMINAL_TARGET");
  const releaseMap = candidateData.byKind.get("release_train_closure");
  if (full && releaseMap) {
    check(
      ledger.terminal_transition_contract?.[releaseMap.root_field] === full[releaseMap.root_field],
      "TERMINAL_RELEASE_ROOT",
    );
    check(
      ledger.terminal_transition_contract?.[releaseMap.count_field] === full[releaseMap.count_field],
      "TERMINAL_RELEASE_COUNT",
    );
  }
}

function stripFencedBlocks(text) {
  const output = [];
  let fence = null;
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (!fence && match) {
      fence = { char: match[1][0], length: match[1].length };
      output.push("");
      continue;
    }
    if (fence && match && match[1][0] === fence.char && match[1].length >= fence.length && match[2].trim() === "") {
      fence = null;
      output.push("");
      continue;
    }
    output.push(fence ? "" : line);
  }
  return output.join("\n");
}

function validateFences(file, text) {
  let fence = null;
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const match = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (!match) continue;
    if (!fence) {
      fence = { char: match[1][0], length: match[1].length, line: index + 1 };
    } else if (
      match[1][0] === fence.char &&
      match[1].length >= fence.length &&
      match[2].trim() === ""
    ) {
      fence = null;
    }
  }
  check(!fence, "UNBALANCED_FENCE", `${file}:${fence?.line ?? "?"}`);
}

function cleanLinkTarget(raw) {
  let target = raw.trim();
  if (target.startsWith("<")) {
    const end = target.indexOf(">");
    if (end >= 0) target = target.slice(1, end);
  } else {
    target = target.split(/\s+["']/)[0];
  }
  target = target.replace(/\\ /g, " ").split("#", 1)[0].split("?", 1)[0];
  try {
    return decodeURI(target);
  } catch {
    return target;
  }
}

function validateMarkdown(ledger) {
  const files = markdownFiles();
  const contents = new Map(files.map((file) => [file, readFileSync(file, "utf8")]));
  for (const [file, text] of contents.entries()) {
    validateFences(file, text);
    const outsideFences = stripFencedBlocks(text);
    const targets = [];
    for (const match of outsideFences.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) targets.push(match[1]);
    for (const match of outsideFences.matchAll(/^\s*\[[^\]]+\]:\s*(\S+)/gm)) targets.push(match[1]);
    for (const rawTarget of targets) {
      const target = cleanLinkTarget(rawTarget);
      if (!target || target.startsWith("#")) continue;
      if (/^(?:https?|mailto|data):/i.test(target)) continue;
      const stageCandidate = isAbsolute(target) ? target : resolve(dirname(file), target);
      const targetFile = join(REAL_TARGET, file.slice(HERE.length + 1));
      const realCandidate = isAbsolute(target) ? target : resolve(dirname(targetFile), target);
      check(
        existsSync(stageCandidate) || existsSync(realCandidate),
        "BROKEN_LOCAL_LINK",
        `${file} -> ${target}`,
      );
    }
  }

  check(
    ledger.program_version === "solguard-detection-maturity-2026-07-25.3",
    "PROGRAM_VERSION",
    String(ledger.program_version),
  );
  const allText = [...contents.values()].join("\n");
  check(
    !/solguard-detection-maturity-2026-07-25\.2\b/.test(`${allText}\n${JSON.stringify(ledger)}`),
    "STALE_PROGRAM_VERSION_2",
  );
  check(!/claim_required_pass/i.test(`${allText}\n${JSON.stringify(ledger)}`), "STALE_CLAIM_REQUIRED_PASS");

  const stalePatterns = [
    /\b565\s+(?:nodes?|nodos?)\b/i,
    /(?:nodes?|nodos?)[^\n|]{0,24}\b565\b/i,
    /\b437\s+(?:primary|primari)/i,
    /(?:primary|primari)[^\n|]{0,24}\b437\b/i,
    /\b(?:1[.,]?064|1064)\s+contrib/i,
    /contrib[^\n|]{0,24}\b(?:1[.,]?064|1064)\b/i,
    /\b(?:1[.,]?629|1629)\s+(?:items?|elementos?|items? contados)/i,
    /(?:items?|elementos?|contados)[^\n|]{0,24}\b(?:1[.,]?629|1629)\b/i,
    /\b614\s+(?:filas|rows|contrib)/i,
    /(?:filas|rows|contrib)[^\n|]{0,24}\b614\b/i,
  ];
  for (const pattern of stalePatterns) {
    check(!pattern.test(allText), "STALE_COUNT_LITERAL", pattern.source);
  }
  const staleRoots = [
    "9655a61b00783f83b3769c3ddb747049e49f9ae3fc34b49b2ec8554dde6428b5",
    "28f5deee94990d9b4ff0c750eeecdc0486e85ead6a790128b088070ea7fdee37",
    "df4e3acb965222239b1ebb7c4189af508a7d8d869957163226f51ffede1ff11d",
    "49ec99b2ffe002e940f0cafb6087b4313d1da20f84c7b84d66555c9e19f2367e",
    "7662997791738b66f22a001014d42eb5309cf12251fd13313e3d668ea10e54ca",
  ];
  const rawPlan = `${allText}\n${JSON.stringify(ledger)}`;
  for (const staleRoot of staleRoots) {
    check(!rawPlan.includes(staleRoot), "STALE_HASH_LITERAL", staleRoot);
  }

  for (const field of [
    "id_set_sha256",
    "node_id_set_sha256",
    "contribution_id_set_sha256",
    "closure_id_set_sha256",
  ]) {
    const expected = ledger[field];
    if (typeof expected !== "string") continue;
    const regex = new RegExp(`${field}[^\\n]{0,160}?([0-9a-f]{64})`, "gi");
    for (const match of allText.matchAll(regex)) {
      check(match[1] === expected, "STALE_HASH_LITERAL", `${field}: ${match[1]} != ${expected}`);
    }
  }

  validateSchemaRegistry(contents, ledger);
}

function validateSchemaRegistry(contents, ledger) {
  const schemaRegex = /\bsolguard-[a-z0-9][a-z0-9._-]*\.v[0-9]+\b/gi;
  const cited = new Set();
  for (const text of contents.values()) {
    for (const match of text.matchAll(schemaRegex)) cited.add(match[0].toLowerCase());
  }
  for (const match of JSON.stringify(ledger).matchAll(schemaRegex)) cited.add(match[0].toLowerCase());

  const moduleCited = new Set();
  for (const file of packageModuleFiles()) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(schemaRegex)) {
      const schema = match[0].toLowerCase();
      moduleCited.add(schema);
      cited.add(schema);
    }
  }
  for (const requiredModuleSchema of [
    "solguard-resource-profile-policy.v1",
    "solguard-contract-edge-set.v1",
  ]) {
    check(
      moduleCited.has(requiredModuleSchema),
      "SCHEMA_MODULE_REFERENCE_MISSING",
      requiredModuleSchema,
    );
  }

  const contractsText = contents.get(CONTRACTS_PATH) ?? readFileSync(CONTRACTS_PATH, "utf8");
  const registered = new Set();
  let registryRows = 0;
  for (const line of contractsText.split(/\r?\n/)) {
    if (!line.trimStart().startsWith("|")) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (!cells.length) continue;
    const firstCellSchemas = [...cells[0].matchAll(schemaRegex)].map((match) => match[0].toLowerCase());
    if (!firstCellSchemas.length) continue;
    registryRows += 1;
    for (const schema of firstCellSchemas) registered.add(schema);
    check(
      cells.length >= 2 && cells.slice(1).some((cell) => cell && !/^[-:]+$/.test(cell)),
      "SCHEMA_REGISTRY_ROW_METADATA",
      line,
    );
  }
  check(registryRows > 0, "SCHEMA_REGISTRY_MISSING");
  const missing = [...cited].filter((schema) => !registered.has(schema)).sort();
  check(missing.length === 0, "SCHEMA_REGISTRY_COVERAGE", missing.join(", "));
}

function main() {
  const ledger = parseLedger();
  if (!ledger) finish();
  check(Array.isArray(ledger.nodes), "NODES_NOT_ARRAY");
  check(Array.isArray(ledger.contributions), "CONTRIBUTIONS_NOT_ARRAY");
  validateCounts(ledger);
  const graph = validateIdsAndGraph(ledger);
  validateScopesAndRows(ledger, graph);
  const candidateData = validateCanonicalCandidateSets(ledger, graph);
  validateCanonicalProgramSets(ledger);
  validateMilestonesAndSemantics(ledger, graph, candidateData);
  validateMarkdown(ledger);
  finish();
}

function finish() {
  if (failures.length) {
    console.error(`FAIL: ${failures.length} errores en ${checks} comprobaciones.`);
    for (const failure of failures) {
      console.error(`- [${failure.code}]${failure.detail ? ` ${failure.detail}` : ""}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log(`PASS: plan final coherente (${checks} comprobaciones).`);
  console.log(
    `Ledger: ${EXPECTED.primary} primarios + ${EXPECTED.derived} derivados + ` +
      `${EXPECTED.contributions} contributions = ${EXPECTED.countedItems} items.`,
  );
}

main();
