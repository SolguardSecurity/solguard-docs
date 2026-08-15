import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  THREAT_IDS,
  renderMarkdown,
  validateThreatModel,
  validateThreatModelDocuments,
} from "../scripts/validate-finding-threat-model.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jsonBytes = await readFile(path.join(root, "docs", "solguard-core", "finding-threat-model-v1.json"), "utf8");
const markdown = await readFile(path.join(root, "docs", "solguard-core", "finding-threat-model-v1.md"), "utf8");
const canonical = JSON.parse(jsonBytes);

test("canonical JSON and Markdown publish the same closed threat model", () => {
  assert.deepEqual(validateThreatModelDocuments(canonical, markdown, jsonBytes), {
    status: "passed",
    threats: 10,
    source_ledger_revision: 446,
  });
  assert.equal(markdown, renderMarkdown(canonical));
});

test("inventory is exact and every threat names unique executable evidence", () => {
  assert.deepEqual(canonical.threats.map((threat) => threat.id), THREAT_IDS);
  assert.equal(canonical.threats.length, 10);
  const references = canonical.threats.flatMap((threat) => threat.evidence_tests);
  assert.equal(references.length, 11);
  assert.equal(new Set(references).size, references.length);
});

test("JSON byte drift and Markdown disagreement fail closed", () => {
  assert.throws(
    () => validateThreatModelDocuments(canonical, markdown, jsonBytes.replace("  ", "    ")),
    /JSON bytes are not canonical/,
  );
  assert.throws(
    () => validateThreatModelDocuments(canonical, markdown.replace("source_drift", "source-drift"), jsonBytes),
    /Markdown disagrees/,
  );
});

test("added removed reordered relabeled or shared threats fail closed", () => {
  const added = structuredClone(canonical);
  added.threats.push(structuredClone(added.threats[0]));
  assert.throws(() => validateThreatModel(added), /threat inventory or order drifted/);

  const removed = structuredClone(canonical);
  removed.threats.pop();
  assert.throws(() => validateThreatModel(removed), /threat inventory or order drifted/);

  const reordered = structuredClone(canonical);
  [reordered.threats[0], reordered.threats[1]] = [reordered.threats[1], reordered.threats[0]];
  assert.throws(() => validateThreatModel(reordered), /threat inventory or order drifted/);

  const relabeled = structuredClone(canonical);
  relabeled.threats[0].fail_closed_outcome = "review_coverage_debt";
  assert.throws(() => validateThreatModel(relabeled), /source_drift outcome drifted/);

  const sharedEvidence = structuredClone(canonical);
  sharedEvidence.threats[1].evidence_tests = [...sharedEvidence.threats[0].evidence_tests];
  assert.throws(() => validateThreatModel(sharedEvidence), /one test reference cannot cover two threat identities/);
});

test("authority escalation and forged upstream acceptance fail closed", () => {
  const acceptedGate = structuredClone(canonical);
  acceptedGate.authority.gate_state_at_source_revision = "accepted";
  assert.throws(() => validateThreatModel(acceptedGate));

  const independent = structuredClone(canonical);
  independent.authority.assurance_level = "independent-custody";
  assert.throws(() => validateThreatModel(independent));

  const forgedSuite = structuredClone(canonical);
  forgedSuite.upstream_acceptance.threat_suite.commit_sha = "0".repeat(40);
  assert.throws(() => validateThreatModel(forgedSuite), /threat suite pin drifted/);

  const substitutedGateRoot = structuredClone(canonical);
  substitutedGateRoot.upstream_acceptance.finding_bundle_gate.evidence_root = "0".repeat(64);
  assert.throws(() => validateThreatModel(substitutedGateRoot), /finding bundle gate pin drifted/);

  const substitutedPublicationRoot = structuredClone(canonical);
  substitutedPublicationRoot.upstream_acceptance.threat_suite.publication_receipt_root = "f".repeat(64);
  assert.throws(() => validateThreatModel(substitutedPublicationRoot), /threat suite pin drifted/);

  const claim = structuredClone(canonical);
  claim.non_claims = claim.non_claims.filter((entry) => !entry.includes("does not accept DECIDE-605"));
  assert.throws(() => validateThreatModel(claim));
});
