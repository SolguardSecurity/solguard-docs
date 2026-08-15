import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const THREAT_IDS = Object.freeze([
  "source_drift",
  "copied_evidence",
  "stale_invariant",
  "forged_solver_result",
  "cross_run_mix",
  "duplicate_id",
  "malicious_artifact",
  "coverage_laundering",
  "known_origin_stripping",
  "report_json_discrepancy",
]);

const OUTCOMES = Object.freeze({
  source_drift: "reject_input_without_admission",
  copied_evidence: "review_insufficient_corroboration",
  stale_invariant: "reject_input_without_admission",
  forged_solver_result: "reject_input_without_admission",
  cross_run_mix: "reject_input_without_admission",
  duplicate_id: "reject_input_without_admission",
  malicious_artifact: "reject_input_without_admission",
  coverage_laundering: "review_coverage_debt",
  known_origin_stripping: "reject_input_without_admission",
  report_json_discrepancy: "abort_publication_without_output_root",
});

const SHA256 = /^[0-9a-f]{64}$/u;
const GIT_SHA1 = /^[0-9a-f]{40}$/u;
const TEST_REF = /^solguard-filter:[A-Za-z0-9_./-]+::[a-z0-9_]+$/u;

function exactKeys(value, expected, label) {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), `${label} keys drifted`);
}

function nonempty(value, label) {
  assert.equal(typeof value, "string", `${label} must be a string`);
  assert.ok(value.length > 0, `${label} must be nonempty`);
  assert.equal(value.trim(), value, `${label} must be trimmed`);
}

function exactStringArray(value, label) {
  assert.ok(Array.isArray(value) && value.length > 0, `${label} must be a nonempty array`);
  value.forEach((entry, index) => nonempty(entry, `${label}[${index}]`));
  assert.equal(new Set(value).size, value.length, `${label} contains duplicates`);
}

function sha(value, label) {
  assert.match(value, SHA256, `${label} must be lowercase SHA-256`);
}

function gitSha(value, label) {
  assert.match(value, GIT_SHA1, `${label} must be lowercase Git SHA-1`);
}

export function validateThreatModel(document) {
  exactKeys(
    document,
    [
      "schema_version",
      "document_id",
      "publication_status",
      "authority",
      "upstream_acceptance",
      "protected_transition",
      "threats",
      "product_invariants",
      "non_claims",
    ],
    "root",
  );
  assert.equal(document.schema_version, "solguard-finding-threat-model-doc.v1");
  assert.equal(document.document_id, "finding-threat-model-v1");
  assert.equal(document.publication_status, "published_documentation");

  exactKeys(
    document.authority,
    [
      "kind",
      "claim_authority",
      "assurance_mode",
      "assurance_level",
      "independence_claim",
      "gate_id",
      "gate_state_at_source_revision",
      "source_ledger_revision",
    ],
    "authority",
  );
  assert.deepEqual(document.authority, {
    kind: "documentation_only",
    claim_authority: "none",
    assurance_mode: "development",
    assurance_level: "single-custodian",
    independence_claim: "forbidden",
    gate_id: "DECIDE-605",
    gate_state_at_source_revision: "pending",
    source_ledger_revision: 446,
  });

  exactKeys(document.upstream_acceptance, ["finding_bundle_gate", "threat_suite"], "upstream_acceptance");
  const gate = document.upstream_acceptance.finding_bundle_gate;
  exactKeys(gate, ["id", "state", "ledger_revision", "evidence_root", "verifier_root", "reopened_by"], "finding_bundle_gate");
  assert.equal(gate.id, "DECIDE-604");
  assert.equal(gate.state, "accepted");
  assert.equal(gate.ledger_revision, 445);
  sha(gate.evidence_root, "finding_bundle_gate.evidence_root");
  sha(gate.verifier_root, "finding_bundle_gate.verifier_root");
  assert.deepEqual(gate.reopened_by, []);

  const suite = document.upstream_acceptance.threat_suite;
  exactKeys(
    suite,
    [
      "id",
      "state",
      "ledger_revision",
      "repository",
      "commit_sha",
      "repository_tree_sha",
      "publication_receipt_root",
      "evidence_root",
      "verifier_root",
      "reopened_by",
    ],
    "threat_suite",
  );
  assert.equal(suite.id, "C4-024");
  assert.equal(suite.state, "accepted");
  assert.equal(suite.ledger_revision, 446);
  assert.equal(suite.repository, "SolguardSecurity/solguard-filter");
  for (const field of ["commit_sha", "repository_tree_sha"])
    gitSha(suite[field], `threat_suite.${field}`);
  for (const field of ["publication_receipt_root", "evidence_root", "verifier_root"])
    sha(suite[field], `threat_suite.${field}`);
  assert.deepEqual(suite.reopened_by, []);

  exactKeys(
    document.protected_transition,
    ["technical_truth", "admission", "finding", "publication", "review", "failure"],
    "protected_transition",
  );
  Object.entries(document.protected_transition).forEach(([key, value]) => nonempty(value, `protected_transition.${key}`));

  assert.ok(Array.isArray(document.threats), "threats must be an array");
  assert.deepEqual(document.threats.map((threat) => threat.id), THREAT_IDS, "threat inventory or order drifted");
  for (const [index, threat] of document.threats.entries()) {
    exactKeys(threat, ["id", "attack", "protected_boundary", "fail_closed_outcome", "evidence_tests"], `threats[${index}]`);
    nonempty(threat.attack, `threats[${index}].attack`);
    nonempty(threat.protected_boundary, `threats[${index}].protected_boundary`);
    assert.equal(threat.fail_closed_outcome, OUTCOMES[threat.id], `${threat.id} outcome drifted`);
    exactStringArray(threat.evidence_tests, `threats[${index}].evidence_tests`);
    threat.evidence_tests.forEach((reference) => assert.match(reference, TEST_REF));
  }
  const evidenceTests = document.threats.flatMap((threat) => threat.evidence_tests);
  assert.equal(new Set(evidenceTests).size, evidenceTests.length, "one test reference cannot cover two threat identities");

  exactStringArray(document.product_invariants, "product_invariants");
  exactStringArray(document.non_claims, "non_claims");
  assert.ok(document.non_claims.some((entry) => entry.includes("does not accept DECIDE-605")));
  assert.ok(document.non_claims.some((entry) => entry.includes("not independent custody")));
  return document;
}

function cell(value) {
  return value.replaceAll("|", "\\|");
}

export function renderMarkdown(document) {
  validateThreatModel(document);
  const lines = [
    "# Threat model del finding v1",
    "",
    "## Límite de autoridad",
    "",
    "| Campo | Valor |",
    "| --- | --- |",
    `| Estado | \`${document.publication_status}\` |`,
    `| Autoridad | \`${document.authority.kind}\`; claim authority \`${document.authority.claim_authority}\` |`,
    `| Assurance | \`${document.authority.assurance_mode}\` / \`${document.authority.assurance_level}\` |`,
    `| Independencia | \`${document.authority.independence_claim}\` |`,
    `| Gate | \`${document.authority.gate_id}\` = \`${document.authority.gate_state_at_source_revision}\` en revisión \`${document.authority.source_ledger_revision}\` |`,
    "",
    "Este documento es una vista de solo lectura. Publicarlo no acepta el gate, no reautoriza artefactos y no convierte CI, merge o documentación en autoridad del ledger.",
    "",
    "## Evidencia upstream fijada",
    "",
    "| Sujeto | Estado | Revisión | Implementación | Evidence root | Verifier root |",
    "| --- | --- | ---: | --- | --- | --- |",
    `| \`${document.upstream_acceptance.finding_bundle_gate.id}\` | \`${document.upstream_acceptance.finding_bundle_gate.state}\` | \`${document.upstream_acceptance.finding_bundle_gate.ledger_revision}\` | gate de bundles | \`${document.upstream_acceptance.finding_bundle_gate.evidence_root}\` | \`${document.upstream_acceptance.finding_bundle_gate.verifier_root}\` |`,
    `| \`${document.upstream_acceptance.threat_suite.id}\` | \`${document.upstream_acceptance.threat_suite.state}\` | \`${document.upstream_acceptance.threat_suite.ledger_revision}\` | \`${document.upstream_acceptance.threat_suite.repository}@${document.upstream_acceptance.threat_suite.commit_sha}\` | \`${document.upstream_acceptance.threat_suite.evidence_root}\` | \`${document.upstream_acceptance.threat_suite.verifier_root}\` |`,
    "",
    "Ambos objetos tienen `reopened_by=[]`. Los receipts son `development / single-custodian`; no existe claim de custodia independiente.",
    "",
    "## Transición protegida",
    "",
    ...Object.entries(document.protected_transition).map(([key, value]) => `- \`${key}\`: ${value}.`),
    "",
    "## Matriz cerrada de amenazas",
    "",
    "| ID | Ataque | Límite protegido | Resultado fail-closed | Evidencia ejecutable |",
    "| --- | --- | --- | --- | --- |",
    ...document.threats.map(
      (threat) =>
        `| \`${threat.id}\` | ${cell(threat.attack)} | ${cell(threat.protected_boundary)} | \`${threat.fail_closed_outcome}\` | ${threat.evidence_tests.map((reference) => `\`${reference}\``).join("<br>")} |`,
    ),
    "",
    "## Invariantes de producto",
    "",
    ...document.product_invariants.map((invariant) => `- ${invariant}.`),
    "",
    "## No-afirmaciones",
    "",
    ...document.non_claims.map((claim) => `- ${claim}.`),
  ];
  return `${lines.join("\n")}\n`;
}

export function validateThreatModelDocuments(document, markdown, jsonBytes) {
  validateThreatModel(document);
  assert.equal(jsonBytes, `${JSON.stringify(document, null, 2)}\n`, "JSON bytes are not canonical pretty JSON");
  assert.equal(markdown, renderMarkdown(document), "Markdown disagrees with canonical JSON");
  return { status: "passed", threats: document.threats.length, source_ledger_revision: document.authority.source_ledger_revision };
}

async function main(argv) {
  assert.deepEqual(argv, [], "validator accepts no arguments or writer mode");
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const jsonPath = path.join(root, "docs", "solguard-core", "finding-threat-model-v1.json");
  const markdownPath = path.join(root, "docs", "solguard-core", "finding-threat-model-v1.md");
  const [jsonBytes, markdown] = await Promise.all([
    readFile(jsonPath, "utf8"),
    readFile(markdownPath, "utf8"),
  ]);
  const result = validateThreatModelDocuments(JSON.parse(jsonBytes), markdown, jsonBytes);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
