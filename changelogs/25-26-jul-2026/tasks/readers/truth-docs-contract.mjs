#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { parseStrictJsonBytes } from "./acceptance-ledger-markdown.mjs";

const CONTRACT_URL = new URL("./truth-docs-contract.v1.json", import.meta.url);
const DOCUMENT_URL = new URL(
  "../../../../docs/solguard-core/verdict-admission-metrics-defaults-v1.md",
  import.meta.url,
);
const EXPECTED_CONTRACT_ROOT =
  "7844f38a7c8886f2950e2cfa413b20917ab521ce8f7ad58f253892a3d4840448";

const EXPECTED_TOP_LEVEL_KEYS = [
  "schema_version",
  "contribution_id",
  "parent_gate",
  "dependency_state",
  "assurance_mode",
  "assurance_level",
  "independent_custody_claimed",
  "authoritative",
  "writer_enabled",
  "acceptance_enabled",
  "measured_capability",
  "dependencies",
  "technical_verdict",
  "admission_result",
  "metric_lineage",
  "runtime_defaults",
  "gate_separation",
  "truth_matrix",
];
const EXPECTED_TECHNICAL_DECISIONS = ["supported", "refuted", "inconclusive"];
const EXPECTED_ADMISSION_DECISIONS = [
  "pass",
  "review",
  "reject",
  "invalid_upstream",
];
const EXPECTED_OBLIGATIONS = [
  "scope",
  "reachability",
  "state_transition",
  "invariant",
  "contradiction",
  "effect",
  "economic_delta",
  "same_flow",
  "same_asset",
  "protection_analysis",
  "evidence_lineage",
  "coverage",
  "counterevidence",
  "run_binding",
];
const EXPECTED_METRIC_IDS = [
  "canonical_candidates",
  "validation_candidates",
  "supported",
  "refuted",
  "inconclusive",
  "supported_findings",
  "validation_review_queue",
  "validation_reviewable_leads",
  "validation_non_findings",
  "admission_input_supported",
  "admission_pass",
  "admission_review",
  "admission_reject",
  "admission_duplicate",
  "finding_envelopes_all",
  "published_findings",
  "review_envelopes",
  "matched_findings",
];
const EXPECTED_GATE_DECISIONS = [
  "measurement_integrity",
  "verdict_truth_integrity",
  "product_health",
  "blind_evaluation_eligibility",
];
const EXPECTED_SCENARIOS = [
  [
    "positive",
    "supported",
    "pass",
    1,
    0,
    "passed",
    "passed",
    "passed",
    "ineligible",
  ],
  ["patch", "refuted", null, 0, 0, "passed", "passed", "passed", "ineligible"],
  [
    "near_miss",
    "inconclusive",
    null,
    0,
    0,
    "passed",
    "passed",
    "passed",
    "ineligible",
  ],
  [
    "filter_failure",
    "supported",
    null,
    0,
    0,
    "passed_with_observations",
    "failed",
    "failed",
    "ineligible",
  ],
];

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(",")}}`;
}

function contractRoot(document) {
  return createHash("sha256")
    .update("solguard:truth-docs-contract:v1\0", "utf8")
    .update(canonicalJson(document), "utf8")
    .digest("hex");
}

function requireFalse(value, label) {
  assert.equal(value, false, `${label} must remain false`);
}

function requirePinnedSource(source, expected) {
  for (const [field, value] of Object.entries(expected)) {
    assert.equal(source[field], value, `${field} pin drifted`);
  }
}

export function loadTruthDocsContract() {
  return parseStrictJsonBytes(
    readFileSync(CONTRACT_URL),
    "C1-018 truth documentation contract",
  );
}

export function validateTruthDocsContract(document) {
  assert.deepEqual(Object.keys(document), EXPECTED_TOP_LEVEL_KEYS);
  assert.equal(document.schema_version, "solguard-truth-docs-contract.v1");
  assert.equal(document.contribution_id, "C1-018");
  assert.equal(document.parent_gate, "TRUTH-108");
  assert.equal(
    document.dependency_state,
    "accepted_authoritative_development_ledger",
  );
  assert.equal(document.assurance_mode, "development");
  assert.equal(document.assurance_level, "single-custodian");
  requireFalse(
    document.independent_custody_claimed,
    "independent custody claim",
  );
  requireFalse(document.authoritative, "documentation authority");
  requireFalse(document.writer_enabled, "documentation writer");
  requireFalse(document.acceptance_enabled, "acceptance");
  assert.equal(document.measured_capability, null);

  requirePinnedSource(document.dependencies["C1-016"], {
    repository: "SolguardSecurity/solguard-deploy",
    commit: "8d8e1e432989ceb697e9beaa54cd1fc2973856ad",
    tree: "0787487bf8a7ea52fdfc2b643144352ea461129a",
    evidence_root:
      "sha256:3adb7498fd95ee04ee4217297fe02dbd761c8240ae955e8d3f5c610d6f822b7c",
    acceptance_revision: 50,
    assurance_level: "single-custodian",
  });
  requirePinnedSource(document.dependencies["C1-017"], {
    repository: "SolguardSecurity/solguard-agents",
    commit: "2986e2e73ef9be1c41e35e65a232f36ff2fab0f3",
    tree: "0efa887690ff041259a42af5da041f2a1f5929d7",
    evidence_root:
      "sha256:28b107a47bf12cf8471e9133bc8244045feb6e4d6017ac0bdf67d3bcf9decea7",
    acceptance_revision: 51,
    assurance_level: "single-custodian",
  });

  const technical = document.technical_verdict;
  requirePinnedSource(technical, {
    schema_version: "solguard-technical-verdict.v1",
    owner: "SolguardSecurity/solguard-validate",
    commit: "af485547440e63042b3ee696b0eb92bca63055b6",
    tree: "b8a0a5711a5b2ebf235128ae13b57dc2e5eb580f",
    schema_path: "schemas/technical-verdict.v1.schema.json",
    schema_sha256:
      "50090bef6e5b0e26a45b80eb8c9d6c61d4f8c892b16fae06e4ff5145c0a078be",
  });
  requireFalse(technical.writer_enabled, "TechnicalVerdict writer");
  assert.deepEqual(technical.decisions, EXPECTED_TECHNICAL_DECISIONS);
  assert.deepEqual(technical.obligations, EXPECTED_OBLIGATIONS);
  assert.deepEqual(technical.obligation_statuses, [
    "satisfied",
    "refuted",
    "unresolved",
    "not_applicable",
  ]);
  assert.equal(Object.values(technical.reason_codes).flat().length, 22);
  assert.deepEqual(
    technical.goldens.map((entry) => [
      entry.decision,
      entry.reason,
      entry.proof_status,
    ]),
    [
      ["supported", "supported_complete_economic_break", "complete"],
      ["refuted", "refuted_effective_protection", "complete"],
      ["inconclusive", "inconclusive_proof_certificate_incomplete", "missing"],
    ],
  );

  const admission = document.admission_result;
  requirePinnedSource(admission, {
    schema_version: "solguard-admission-result.v1",
    owner: "SolguardSecurity/solguard-filter",
    commit: "22a08ca01ac027127e9b1cfd14a7c82d0a2ce0d5",
    tree: "4dc55518305277b0e82ec267d02fd9276453f6d0",
    schema_path: "schemas/admission-result.v1.schema.json",
    schema_sha256:
      "f13ef0f47c06654bddc49b83342f8069a7681b97c50d521d30799362bd94e1ec",
  });
  requireFalse(admission.writer_enabled, "AdmissionResult writer");
  assert.deepEqual(admission.decisions, EXPECTED_ADMISSION_DECISIONS);
  assert.equal(admission.decisions.includes("duplicate"), false);
  assert.equal(admission.reason_codes.length, 12);
  assert.deepEqual(admission.presentation_roles, [
    "unique",
    "representative",
    "duplicate",
  ]);
  assert.deepEqual(
    admission.goldens.map((entry) => [
      entry.decision,
      entry.technical_decision,
      entry.checker_status,
      entry.evidence_status,
      entry.eligibility,
    ]),
    [
      ["pass", "supported", "passed", "complete", "eligible"],
      ["review", "supported", "missing", "incomplete", "ineligible"],
      ["reject", "supported", "contradicted", "contradicted", "ineligible"],
      ["invalid_upstream", null, "invalid", "invalid", "ineligible"],
    ],
  );

  const lineage = document.metric_lineage;
  requirePinnedSource(lineage, {
    repository: "SolguardSecurity/solguard-deploy",
    commit: "f934991f041de4c8d71b8d7c07aa0930506e293f",
    tree: "27c6e0d5d78988aa25ae2fc4a199de840983b0c0",
    evidence_root:
      "sha256:92a1c96471e8167e4c1530ed0791e2212ca52aa257fad98f0b4916b4fccd736c",
    schema_version: "solguard-oracle-free-metric-lineage-map.v1",
    check_schema_version: "solguard-oracle-free-metric-lineage-check.v1",
  });
  requireFalse(lineage.writer_enabled, "canonical metric writer");
  requireFalse(
    lineage.post_scan_contract_emission,
    "post-scan contract emission",
  );
  assert.equal(lineage.publication_authority, "MEASURE-901");
  assert.equal(lineage.runtime_writer_authority, "EVAL-908");
  assert.equal(lineage.null_semantics, "unavailable_never_zero");
  assert.deepEqual(
    lineage.metrics.map(([metricId]) => metricId),
    EXPECTED_METRIC_IDS,
  );
  const duplicateMetric = lineage.metrics.find(
    ([metricId]) => metricId === "admission_duplicate",
  );
  assert.deepEqual(duplicateMetric, [
    "admission_duplicate",
    "tool-outputs/filter/filter_results.json",
    "count:decision=duplicate",
    "admission_input_supported",
    "legacy_filter_runtime_only",
  ]);
  for (const metricId of [
    "finding_envelopes_all",
    "published_findings",
    "review_envelopes",
  ]) {
    assert.equal(
      lineage.metrics.find(([id]) => id === metricId)[4],
      "runtime_writer_disabled",
    );
  }
  assert.equal(
    lineage.metrics.find(([id]) => id === "matched_findings")[4],
    "post_scan_excluded",
  );

  const defaults = document.runtime_defaults;
  requirePinnedSource(defaults, {
    repository: "SolguardSecurity/solguard-backend",
    commit: "320014d411cb8896ca58cbee9f147c5415be77c8",
    tree: "d53b82012f6c2c5f36b2d16765e589320beea4b1",
    evidence_root:
      "sha256:2f0e9f8056d7120d3cbb4856b65fd6a9c22546912397bf01b09e68822f45188e",
  });
  assert.equal(defaults.analyze_mode_default, "audit_only");
  assert.deepEqual(defaults.analysis_profile_defaults, {
    audit_only: "generic_blind",
    full: "generic_blind",
  });
  requireFalse(defaults.run_exploit_default, "run_exploit default");
  assert.equal(defaults.run_exploit_requires_mode, "full");
  assert.equal(defaults.managed_release_profile, "generic_blind");
  assert.deepEqual(defaults.managed_release_rejects, ["compatibility"]);
  requireFalse(
    defaults.filter_failure.synthetic_result,
    "synthetic FILTER result",
  );
  requireFalse(
    defaults.filter_failure.downstream_exploit,
    "post-FILTER EXPLOIT",
  );

  const gates = document.gate_separation;
  requirePinnedSource(gates, {
    repository: "SolguardSecurity/solguard-deploy",
    commit: "a8adabd194602f5c79371f00a6d2eed25b5caa50",
    tree: "1b61588562c00d3d1e5f3273605528299cf539fe",
    evidence_root:
      "sha256:a289527e79a2b2eb4b31fb1bec41bf6ec7f6cc62a5d4bed8b5397f454a133ee1",
  });
  assert.deepEqual(gates.decisions, EXPECTED_GATE_DECISIONS);
  assert.equal(
    gates.zero_detection_policy,
    "measurement_may_pass_but_product_health_must_fail_when_claimed_closure_is_missing",
  );
  assert.equal(gates.blind_default, "ineligible");

  const matrix = document.truth_matrix;
  assert.equal(
    matrix.schema_version,
    "solguard-truth-authority-chain-matrix.v1",
  );
  assert.equal(matrix.commit, document.dependencies["C1-016"].commit);
  requireFalse(matrix.authoritative, "truth matrix authority");
  requireFalse(matrix.writer_enabled, "truth matrix writer");
  requireFalse(matrix.acceptance_enabled, "truth matrix acceptance");
  assert.equal(matrix.measured_capability, null);
  assert.deepEqual(matrix.scenarios, EXPECTED_SCENARIOS);

  assert.equal(
    contractRoot(document),
    EXPECTED_CONTRACT_ROOT,
    "truth documentation contract root drifted",
  );
  return {
    contractRoot: EXPECTED_CONTRACT_ROOT,
    technicalDecisions: technical.decisions.length,
    technicalReasons: Object.values(technical.reason_codes).flat().length,
    technicalObligations: technical.obligations.length,
    admissionDecisions: admission.decisions.length,
    admissionReasons: admission.reason_codes.length,
    metrics: lineage.metrics.length,
    scenarios: matrix.scenarios.length,
    dependencyState: document.dependency_state,
    assuranceMode: document.assurance_mode,
    assuranceLevel: document.assurance_level,
    independentCustodyClaimed: false,
    writerEnabled: false,
    acceptanceEnabled: false,
    measuredCapability: null,
  };
}

export function validateTruthDocumentation(markdown, document) {
  assert.equal(typeof markdown, "string");
  assert.equal(
    markdown.split(/\r?\n/u, 1)[0],
    "# Veredictos, admisión, métricas y defaults v1",
  );
  const normalizedMarkdown = markdown.replace(/\s+/gu, " ");
  const requiredTokens = new Set([
    "C1-018",
    "TRUTH-108",
    "accepted_authoritative_development_ledger",
    "single-custodian",
    "revisiones 50 y 51",
    "no se alega custodia independiente",
    "no establece capacidad medida",
    "no crea ni modifica esas aceptaciones",
    document.dependencies["C1-016"].commit,
    document.dependencies["C1-017"].commit,
    document.technical_verdict.commit,
    document.technical_verdict.schema_sha256,
    document.admission_result.commit,
    document.admission_result.schema_sha256,
    document.metric_lineage.commit,
    document.runtime_defaults.commit,
    document.gate_separation.commit,
    document.metric_lineage.null_semantics,
    document.gate_separation.zero_detection_policy,
    ...document.technical_verdict.decisions,
    ...Object.values(document.technical_verdict.reason_codes).flat(),
    ...document.technical_verdict.obligations,
    ...document.technical_verdict.obligation_statuses,
    ...document.admission_result.decisions,
    ...document.admission_result.reason_codes,
    ...document.admission_result.technical_statuses,
    ...document.admission_result.checker_statuses,
    ...document.admission_result.evidence_statuses,
    ...document.admission_result.eligibility_statuses,
    ...document.admission_result.presentation_roles,
    ...document.admission_result.ineligibility_kinds,
    ...document.metric_lineage.metrics.flatMap(
      ([metricId, artifact, derivation, denominator, authority]) =>
        [metricId, artifact, derivation, denominator, authority].filter(
          (value) => value !== null,
        ),
    ),
    document.runtime_defaults.analyze_mode_default,
    document.runtime_defaults.analysis_profile_defaults.audit_only,
    document.runtime_defaults.run_exploit_requires_mode,
    document.runtime_defaults.managed_release_profile,
    ...document.runtime_defaults.managed_release_rejects,
    ...document.gate_separation.decisions,
    document.gate_separation.blind_default,
    ...document.truth_matrix.scenarios.flat().filter((value) => value !== null),
  ]);
  for (const token of requiredTokens) {
    assert.equal(
      normalizedMarkdown.includes(String(token)),
      true,
      `truth documentation omits ${token}`,
    );
  }
  assert.match(
    normalizedMarkdown,
    /`duplicate` no es una decisión de `AdmissionResult`/u,
  );
  assert.match(
    normalizedMarkdown,
    /`null` significa no disponible; nunca se convierte en cero/u,
  );
  assert.doesNotMatch(normalizedMarkdown, /C1-018 (?:está )?aceptada/iu);
  assert.doesNotMatch(normalizedMarkdown, /TRUTH-108 (?:está )?cerrado/iu);
  assert.doesNotMatch(normalizedMarkdown, /capacidad medida:\s*(?:sí|true)/iu);
  return { requiredTokens: requiredTokens.size, claimsForbidden: 3 };
}

export function validatePublishedTruthDocs() {
  const document = loadTruthDocsContract();
  const contract = validateTruthDocsContract(document);
  const documentation = validateTruthDocumentation(
    readFileSync(DOCUMENT_URL, "utf8"),
    document,
  );
  return { status: "passed", contract, documentation };
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  if (process.argv.length !== 2) {
    throw new Error(
      "truth documentation verifier accepts no arguments or writer mode",
    );
  }
  process.stdout.write(`${JSON.stringify(validatePublishedTruthDocs())}\n`);
}
