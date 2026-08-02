import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  activeDocumentationPaths,
  lintMarkdownText,
  loadDictionary,
  scanRepository,
  scanWorkspace,
  validateDictionary,
} from "../scripts/validate-product-claims.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dictionaryPath = path.join(
  repoRoot,
  "docs",
  "governance",
  "product-claim-dictionary.v1.json",
);

async function temporaryWorkspace(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "solguard-claims-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test("C0-002 freezes the exact canonical vocabulary without claim authority", async () => {
  const dictionary = await loadDictionary(dictionaryPath);
  assert.equal(dictionary.canonical_terms.length, 18);
  assert.equal(dictionary.claim_authority, "none");
  assert.deepEqual(
    dictionary.forbidden_aliases.map((entry) => entry.alias),
    ["release_eligible", "finding_eligibility"],
  );
  assert.equal(dictionary.compatibility_debt.source_contract_alias_removal_task, "C1-021");
});

test("dictionary validation rejects term, alias and authority drift", async () => {
  const dictionary = await loadDictionary(dictionaryPath);
  for (const mutate of [
    (copy) => copy.canonical_terms.reverse(),
    (copy) => (copy.claim_authority = "release"),
    (copy) => (copy.forbidden_aliases[0].replacement = "product_release_eligible"),
    (copy) => (copy.compatibility_debt.source_contract_alias_removal_task = "UNKNOWN"),
    (copy) => (copy.lint_policy.repository_names = copy.lint_policy.repository_names.slice(1)),
    (copy) => (copy.lint_policy.unregistered_rule = true),
  ]) {
    const copy = structuredClone(dictionary);
    mutate(copy);
    assert.throws(() => validateDictionary(copy));
  }
});

test("valid documentation keeps product stages and legacy debt explicit", () => {
  const source = `
# Valid

MAP emits signals and does not emit findings.

VALIDATE emitted \`supported\` for run \`run-1\`; FILTER emitted \`pass\`.

The legacy field \`product_release_eligible=false\` has no claim authority.

The blind detection claim is backed by the [sealed dossier](evidence/run-1.md).
`;
  assert.deepEqual(lintMarkdownText(source, "valid.md"), []);
});

test("invalid fixtures reject pre-FILTER findings, aliases and unsupported claims", () => {
  const source = `
# Invalid

TRACE emits confirmed findings.

The product is blind validated.

The gate sets \`product_release_eligible=true\` and the build is release-ready.

The new finding_eligibility flag grants publication.

The legacy gate sets \`release_eligible=true\` and grants publication.
`;
  assert.deepEqual(
    new Set(lintMarkdownText(source, "invalid.md").map((entry) => entry.code)),
    new Set([
      "PREFILTER_FINDING_PROMOTION",
      "CLAIM_EVIDENCE_REQUIRED",
      "FORBIDDEN_CLAIM_ALIAS",
    ]),
  );
});

test("active documentation scope excludes historical changelogs and releases", async (t) => {
  const root = await temporaryWorkspace(t);
  await mkdir(path.join(root, "agents"), { recursive: true });
  await mkdir(path.join(root, "docs", "nested"), { recursive: true });
  await mkdir(path.join(root, "changelogs"), { recursive: true });
  await mkdir(path.join(root, "releases"), { recursive: true });
  await writeFile(path.join(root, "README.md"), "MAP emits signals, not findings.\n");
  await writeFile(path.join(root, "agents", "README.md"), "FILTER emits pass.\n");
  await writeFile(path.join(root, "docs", "nested", "guide.md"), "Known regression.\n");
  await writeFile(path.join(root, "changelogs", "old.md"), "TRACE emits findings.\n");
  await writeFile(path.join(root, "releases", "old.md"), "release-ready\n");

  assert.deepEqual(await activeDocumentationPaths(root), [
    "agents/README.md",
    "docs/nested/guide.md",
    "README.md",
  ]);
  const scan = await scanRepository(root, "fixture");
  assert.equal(scan.files, 3);
  assert.deepEqual(scan.violations, []);
});

test("workspace scan requires and validates the exact fifteen repositories", async (t) => {
  const root = await temporaryWorkspace(t);
  const dictionary = await loadDictionary(dictionaryPath);
  for (const repository of dictionary.lint_policy.repository_names) {
    await mkdir(path.join(root, repository), { recursive: true });
    await writeFile(
      path.join(root, repository, "README.md"),
      "A candidate is not a finding or a detected result.\n",
    );
  }
  const scan = await scanWorkspace(root, dictionary);
  assert.equal(scan.repositories.length, 15);
  assert.equal(scan.fileCount, 15);
  assert.deepEqual(scan.violations, []);

  await rm(path.join(root, "solguard-map"), { recursive: true, force: true });
  await assert.rejects(() => scanWorkspace(root, dictionary), /workspace repository is missing/);
});
