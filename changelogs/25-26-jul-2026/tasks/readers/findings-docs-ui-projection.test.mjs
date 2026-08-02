import assert from "node:assert/strict";
import { link, mkdtemp, rm, truncate, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  CORE_FINDINGS_CONTRACT_REF,
  DEPLOY_FINDINGS_READER_REF,
  DOCS_UI_WRITER_ENABLED,
  MAX_DOCS_UI_BUNDLE_BYTES,
  loadPinnedFindingsDocsUiFixture,
  readPhysicalFindingsBundle,
  renderFindingsDocsUiMarkdown,
  validateAndProjectCanonicalBundleBytes,
  verifyPinnedFindingsDocsUiFixtures,
} from "./findings-docs-ui-projection.mjs";

const MODULE_PATH = fileURLToPath(
  new URL("./findings-docs-ui-projection.mjs", import.meta.url),
);
const finding = loadPinnedFindingsDocsUiFixture(
  "finding-pass-eligible-unique.valid.json",
).document;
const review = loadPinnedFindingsDocsUiFixture(
  "review-admission-review.valid.json",
).document;
const clone = (value) => structuredClone(value);
const bytes = (value) => Buffer.from(JSON.stringify(value), "utf8");

test("Docs/UI consumer pins exact C1-009 schemas, goldens and C1-009C reader", () => {
  assert.deepEqual(verifyPinnedFindingsDocsUiFixtures(), {
    "finding-envelope.v1.schema.json":
      "4d5912509f62c11f274e516a1852fab7294296b03f21f9b12cf09862b682c6b2",
    "review-envelope.v1.schema.json":
      "e6cbd73dd0e4f739579c6acf1307fb6117775353a9bac2ae20133167cc3459f2",
    "finding-pass-eligible-unique.valid.json":
      "737ced7074aff059952b89175a178873b6fe5b571f76f6d10fd5e12ab5830d4a",
    "review-admission-review.valid.json":
      "9ec9f0334fcbe7d010b6cd2436b662694ab697cd0d45604dcf4a44b0c23e6b24",
  });
  assert.equal(
    CORE_FINDINGS_CONTRACT_REF,
    "1ad350d8d3f54c227ca8f81b9cb42c4bf6a0494b",
  );
  assert.equal(
    DEPLOY_FINDINGS_READER_REF,
    "cb223071c0dab18190041129490702b8282f27bb",
  );
  assert.equal(DOCS_UI_WRITER_ENABLED, false);
});

test("all-findings and public roles derive closed views without changing input", () => {
  const input = bytes([finding]);
  const original = Buffer.from(input);
  const all = validateAndProjectCanonicalBundleBytes(
    input,
    "finding_envelopes_all",
  );
  const published = validateAndProjectCanonicalBundleBytes(
    input,
    "published_findings_projection",
  );

  assert.deepEqual(input, original);
  assert.deepEqual(all.counts, {
    finding_envelopes: 1,
    published_findings: 1,
    review_envelopes: 0,
  });
  assert.deepEqual(published.counts, all.counts);
  assert.equal(all.items[0].kind, "finding");
  assert.equal(all.items[0].public, true);
  assert.equal(all.items[0].claim.title, finding.claim.title);
  assert.deepEqual(
    all.items[0].route.ordered_operations,
    finding.route.ordered_operations,
  );
  assert.equal(all.measured_capability, null);
  assert.equal(all.writer_enabled, false);
});

test("review role stays outside finding and publication counts", () => {
  const view = validateAndProjectCanonicalBundleBytes(
    bytes([review]),
    "product_review_envelopes",
  );
  assert.deepEqual(view.counts, {
    finding_envelopes: 0,
    published_findings: 0,
    review_envelopes: 1,
  });
  assert.equal(view.items[0].kind, "review");
  assert.equal(view.items[0].admission_status, "review");
  assert.equal(view.items[0].next_action, "resolve_checker");
  assert.ok(!Object.hasOwn(view.items[0], "public"));
});

test("each role permits an explicit canonical empty array without type inference", () => {
  for (const role of [
    "finding_envelopes_all",
    "published_findings_projection",
    "product_review_envelopes",
  ]) {
    const view = validateAndProjectCanonicalBundleBytes(bytes([]), role);
    assert.equal(view.canonical_member_count, 0);
    assert.deepEqual(view.items, []);
    assert.deepEqual(view.counts, {
      finding_envelopes: 0,
      published_findings: 0,
      review_envelopes: 0,
    });
  }
});

test("public projection rejects a valid but ineligible finding", () => {
  const suppressed = clone(finding);
  suppressed.verdict.publication_eligibility = "ineligible";
  suppressed.verdict.ineligibility = {
    kind: "policy_suppression",
    reason_code: "temporary_disclosure_hold",
    policy_id: "policy-disclosure-hold",
    policy_version: "1.0.0",
    policy_root: "a".repeat(64),
    rule_id: "rule-temporary-disclosure-hold",
    scope_root: "b".repeat(64),
    decision_event_id: "decision-event-disclosure-hold",
    actor_id: "actor-security-lead",
    actor_key_id: "actor-key-security-lead",
    justification_refs: [
      {
        artifact_id: "artifact-disclosure-coordination",
        content_digest: "c".repeat(64),
      },
    ],
    created_at: "2026-07-27T00:00:00Z",
    expires_at: "2026-08-03T00:00:00Z",
  };
  const all = validateAndProjectCanonicalBundleBytes(
    bytes([suppressed]),
    "finding_envelopes_all",
  );
  assert.equal(all.items[0].public, false);
  assert.throws(
    () =>
      validateAndProjectCanonicalBundleBytes(
        bytes([suppressed]),
        "published_findings_projection",
      ),
    /not publication eligible/,
  );
});

test("schema mixing, unknown fields, duplicate IDs and ambiguous JSON fail closed", () => {
  assert.throws(
    () =>
      validateAndProjectCanonicalBundleBytes(
        bytes([review]),
        "finding_envelopes_all",
      ),
    /schema_version|required/,
  );
  const unknown = clone(finding);
  unknown.confidence = 0.99;
  assert.throws(
    () =>
      validateAndProjectCanonicalBundleBytes(
        bytes([unknown]),
        "finding_envelopes_all",
      ),
    /confidence is forbidden/,
  );
  assert.throws(
    () =>
      validateAndProjectCanonicalBundleBytes(
        bytes([finding, finding]),
        "finding_envelopes_all",
      ),
    /duplicate ID/,
  );
  const duplicateMember = Buffer.from(
    '[{"schema_version":"solguard-finding-envelope.v1","schema_version":"solguard-finding-envelope.v1"}]',
  );
  assert.throws(
    () =>
      validateAndProjectCanonicalBundleBytes(
        duplicateMember,
        "finding_envelopes_all",
      ),
    /duplicate object member/,
  );
  assert.throws(
    () =>
      validateAndProjectCanonicalBundleBytes(
        Buffer.from([0x5b, 0x22, 0xc3, 0x28, 0x22, 0x5d]),
        "finding_envelopes_all",
      ),
    /valid UTF-8/,
  );
});

test("physical reader rejects hardlinks, directories and oversized sparse inputs", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "solguard-docs-c1-009d-"));
  try {
    const canonical = path.join(root, "finding_envelopes.json");
    await writeFile(canonical, bytes([finding]));
    assert.deepEqual(
      await readPhysicalFindingsBundle(canonical),
      bytes([finding]),
    );

    const linked = path.join(root, "linked.json");
    await link(canonical, linked);
    await assert.rejects(
      () => readPhysicalFindingsBundle(canonical),
      /exactly one physical link/,
    );
    await rm(linked);

    await assert.rejects(
      () => readPhysicalFindingsBundle(root),
      /physical file/,
    );
    const oversized = path.join(root, "oversized.json");
    await writeFile(oversized, "[]");
    await truncate(oversized, MAX_DOCS_UI_BUNDLE_BYTES + 1);
    await assert.rejects(
      () => readPhysicalFindingsBundle(oversized),
      /outside the inclusive/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Markdown is deterministic, escaped and explicit about evidence limits", () => {
  const hostile = clone(finding);
  hostile.claim.title = "Line one | injected\nLine two";
  const view = validateAndProjectCanonicalBundleBytes(
    bytes([hostile]),
    "finding_envelopes_all",
  );
  const first = renderFindingsDocsUiMarkdown(view);
  const second = renderFindingsDocsUiMarkdown(view);
  assert.equal(first, second);
  assert.match(first, /Line one \\\| injected Line two/);
  assert.match(first, /Runtime writer: disabled/);
  assert.match(first, /Measured capability: not established/);
});

test("CLI has no writer or output-file mode", () => {
  const result = spawnSync(
    process.execPath,
    [MODULE_PATH, "--out", "forbidden.json"],
    {
      encoding: "utf8",
    },
  );
  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /unknown or forbidden argument --out; C1-009D is read-only/,
  );
});
