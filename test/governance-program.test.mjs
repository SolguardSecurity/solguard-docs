import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import {
  governancePublicationRoot,
  validateGovernancePublicationDocument,
  validateGovernancePublicationFiles,
} from "../scripts/validate-governance-program.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const MANIFEST = path.join(
  ROOT,
  "docs",
  "governance",
  "governance-publication.v1.json",
);
const execFileAsync = promisify(execFile);

async function fixture() {
  return JSON.parse(await readFile(MANIFEST, "utf8"));
}

function reseal(document) {
  document.publication_root = governancePublicationRoot(document);
  return document;
}

test("C0-008 publishes linked architecture and evidence rules without authority", async () => {
  assert.deepEqual(await validateGovernancePublicationFiles(), {
    schemaVersion: "solguard-governance-publication.v1",
        publicationRoot: "1765a35843598612a6e22d3a69c156aa857767ef956953745fe08dede2488e1b",
    documents: 5,
    sourceDocuments: 3,
    requiredLinks: 15,
    architectureDecisions: 10,
    evidenceRules: 12,
    hardDependency: {
      contributionId: "C0-002",
      observedState: "pending_draft",
      satisfied: false,
    },
    claimAuthority: "none",
  });
});

test("publication rejects lifecycle, claim, and contribution escalation", async () => {
  const original = await fixture();
  for (const [mutate, expected] of [
    [(copy) => (copy.lifecycle_state = "accepted"), /grant lifecycle or claim authority/u],
    [(copy) => (copy.claim_authority = "release"), /grant lifecycle or claim authority/u],
    [(copy) => (copy.contribution.acceptance_state = "accepted"), /attempts acceptance/u],
    [(copy) => (copy.contribution.cannot_accept_parent_or_claim = false), /attempts acceptance/u],
  ]) {
    const changed = structuredClone(original);
    mutate(changed);
    reseal(changed);
    assert.throws(() => validateGovernancePublicationDocument(changed), expected);
  }
});

test("pending C0-002 cannot be represented as a satisfied hard dependency", async () => {
  const original = await fixture();
  for (const mutate of [
    (copy) => (copy.hard_dependencies[0].dependency_satisfied = true),
    (copy) => (copy.hard_dependencies[0].observed_state = "accepted"),
    (copy) => (copy.hard_dependencies[0].accepted_implementation_ref = "a".repeat(40)),
    (copy) => (copy.hard_dependencies[0].publication_receipt = "receipt.json"),
  ]) {
    const changed = structuredClone(original);
    mutate(changed);
    reseal(changed);
    assert.throws(
      () => validateGovernancePublicationDocument(changed),
      /presented as satisfied/u,
    );
  }
});

test("document, source, and link scope is exact and path-contained", async () => {
  const original = await fixture();
  for (const [mutate, expected] of [
    [
      (copy) => (copy.documents[0].path = "../outside.json"),
      /published document identities drifted/u,
    ],
    [
      (copy) => (copy.source_documents[0].path = "README.md"),
      /source document identities drifted/u,
    ],
    [
      (copy) => copy.required_links.pop(),
      /required documentation links drifted/u,
    ],
    [
      (copy) => (copy.required_links[0].target = "../outside.md"),
      /required documentation links drifted/u,
    ],
  ]) {
    const changed = structuredClone(original);
    mutate(changed);
    reseal(changed);
    assert.throws(() => validateGovernancePublicationDocument(changed), expected);
  }
});

test("closed decision IDs, evidence-rule IDs, and negative gates cannot drift", async () => {
  const original = await fixture();
  for (const [mutate, expected] of [
    [
      (copy) => copy.validation.architecture_decision_ids.pop(),
      /architecture decision IDs drifted/u,
    ],
    [
      (copy) => copy.validation.evidence_rule_ids.reverse(),
      /evidence rule IDs drifted/u,
    ],
    [
      (copy) => (copy.validation.negative_authority_tests_required = false),
      /validation gates were weakened/u,
    ],
  ]) {
    const changed = structuredClone(original);
    mutate(changed);
    reseal(changed);
    assert.throws(() => validateGovernancePublicationDocument(changed), expected);
  }
});

test("publication root and candidate binding are independently revalidated", async () => {
  const original = await fixture();
  const changedRoot = structuredClone(original);
  changedRoot.publication_root = "0".repeat(64);
  assert.throws(
    () => validateGovernancePublicationDocument(changedRoot),
    /publication root drifted/u,
  );

  const changedCandidate = structuredClone(original);
  changedCandidate.hard_dependencies[0].candidate_commit = "f".repeat(40);
  reseal(changedCandidate);
  assert.throws(
    () => validateGovernancePublicationDocument(changedCandidate),
    /candidate binding drifted/u,
  );
});

test("documented CLI validates the same publication", async () => {
  const result = await execFileAsync(
    process.execPath,
    ["scripts/validate-governance-program.mjs", "--json"],
    { cwd: ROOT, windowsHide: true },
  );
  assert.equal(result.stderr, "");
  const output = JSON.parse(result.stdout);
  assert.equal(output.status, "passed");
  assert.equal(output.architectureDecisions, 10);
  assert.equal(output.evidenceRules, 12);
  assert.deepEqual(output.hardDependency, {
    contributionId: "C0-002",
    observedState: "pending_draft",
    satisfied: false,
  });
});
