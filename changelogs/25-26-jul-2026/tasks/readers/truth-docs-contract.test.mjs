import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import {
  loadTruthDocsContract,
  validatePublishedTruthDocs,
  validateTruthDocsContract,
  validateTruthDocumentation,
} from "./truth-docs-contract.mjs";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
);
const DOCUMENT = path.join(
  ROOT,
  "docs",
  "solguard-core",
  "verdict-admission-metrics-defaults-v1.md",
);
const CLI = path.join(
  ROOT,
  "changelogs",
  "25-26-jul-2026",
  "tasks",
  "readers",
  "truth-docs-contract.mjs",
);

test("C1-018 pins verdict, admission, metrics, defaults and gates without authority", async () => {
  const result = validatePublishedTruthDocs();
  assert.equal(result.status, "passed");
  assert.deepEqual(result.contract, {
    contractRoot: "a9ac2edfb5a00f5bd6eea59874382ee0934cb4bc16c3379f9288a6dadc7697f4",
    technicalDecisions: 3,
    technicalReasons: 22,
    technicalObligations: 14,
    admissionDecisions: 4,
    admissionReasons: 12,
    metrics: 18,
    scenarios: 4,
    writerEnabled: false,
    acceptanceEnabled: false,
    measuredCapability: null,
  });
  assert.ok(result.documentation.requiredTokens > 100);
});

test("C1-018 rejects contract relabeling and authority escalation", () => {
  const mutations = [
    [
      "TechnicalVerdict decision",
      (document) => document.technical_verdict.decisions.push("pass"),
      /supported|refuted|inconclusive/u,
    ],
    [
      "AdmissionResult duplicate decision",
      (document) => document.admission_result.decisions.push("duplicate"),
      /pass|review|reject|invalid_upstream/u,
    ],
    [
      "writer activation",
      (document) => {
        document.writer_enabled = true;
      },
      /documentation writer must remain false/u,
    ],
    [
      "legacy duplicate as v1 authority",
      (document) => {
        document.metric_lineage.metrics.find(
          ([metricId]) => metricId === "admission_duplicate",
        )[4] = "oracle_free_primary";
      },
      /legacy_filter_runtime_only/u,
    ],
    [
      "compatibility default",
      (document) => {
        document.runtime_defaults.analysis_profile_defaults.audit_only =
          "compatibility";
      },
      /generic_blind/u,
    ],
    [
      "blind eligibility forgery",
      (document) => {
        document.truth_matrix.scenarios[0][8] = "eligible";
      },
      /ineligible/u,
    ],
  ];
  for (const [label, mutate, expected] of mutations) {
    const document = structuredClone(loadTruthDocsContract());
    mutate(document);
    assert.throws(
      () => validateTruthDocsContract(document),
      expected,
      `${label} must fail closed`,
    );
  }
});

test("C1-018 rejects documentation that drops a pinned runtime fact", async () => {
  const document = loadTruthDocsContract();
  const markdown = await readFile(DOCUMENT, "utf8");
  assert.throws(
    () =>
      validateTruthDocumentation(
        markdown.replace("inconclusive_coverage_debt", "removed_reason"),
        document,
      ),
    /inconclusive_coverage_debt/u,
  );
  assert.throws(
    () =>
      validateTruthDocumentation(
        markdown.replace(
          /`duplicate` no\s+es una decisión de `AdmissionResult`/u,
          "duplicate is admitted",
        ),
        document,
      ),
    /duplicate/u,
  );
});

test("C1-018 verifier is read-only and rejects invented CLI modes", async () => {
  const { stdout, stderr } = await execFileAsync(process.execPath, [CLI], {
    cwd: ROOT,
    windowsHide: true,
  });
  assert.equal(stderr, "");
  assert.equal(JSON.parse(stdout).status, "passed");
  await assert.rejects(
    execFileAsync(process.execPath, [CLI, "--write"], {
      cwd: ROOT,
      windowsHide: true,
    }),
    /accepts no arguments or writer mode/u,
  );
});
