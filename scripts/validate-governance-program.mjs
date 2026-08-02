#!/usr/bin/env node

import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadDictionary } from "./validate-product-claims.mjs";

const ENTRY_PATH = fileURLToPath(import.meta.url);
const REPOSITORY_ROOT = path.resolve(path.dirname(ENTRY_PATH), "..");
const SHA256 = /^[a-f0-9]{64}$/u;
const COMMIT = /^[a-f0-9]{40}$/u;

const DOCUMENTS = Object.freeze([
  ["governance-index", "docs/governance/README.md"],
  ["claim-dictionary-json", "docs/governance/product-claim-dictionary.v1.json"],
  ["claim-dictionary-markdown", "docs/governance/product-claim-dictionary.md"],
  ["architecture-decisions", "docs/governance/architecture-decisions.md"],
  ["evidence-rules", "docs/governance/evidence-rules.md"],
]);

const SOURCE_DOCUMENTS = Object.freeze([
  [
    "maturity-architecture-contract",
    "changelogs/25-26-jul-2026/tasks/01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md",
  ],
  [
    "structural-program",
    "changelogs/25-26-jul-2026/tasks/02_PROGRAMA_ESTRUCTURAL.md",
  ],
  [
    "ledger-and-dependencies",
    "changelogs/25-26-jul-2026/tasks/09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md",
  ],
]);

const REQUIRED_LINKS = Object.freeze([
  ["README.md", "docs/governance/README.md"],
  ["docs/governance/README.md", "product-claim-dictionary.md"],
  ["docs/governance/README.md", "architecture-decisions.md"],
  ["docs/governance/README.md", "evidence-rules.md"],
  ["docs/governance/README.md", "governance-publication.v1.json"],
  [
    "docs/governance/README.md",
    "../../changelogs/25-26-jul-2026/tasks/01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md",
  ],
  [
    "docs/governance/README.md",
    "../../changelogs/25-26-jul-2026/tasks/02_PROGRAMA_ESTRUCTURAL.md",
  ],
  [
    "docs/governance/README.md",
    "../../changelogs/25-26-jul-2026/tasks/09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md",
  ],
  ["docs/governance/architecture-decisions.md", "product-claim-dictionary.md"],
  ["docs/governance/architecture-decisions.md", "evidence-rules.md"],
  [
    "docs/governance/architecture-decisions.md",
    "../../changelogs/25-26-jul-2026/tasks/01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md",
  ],
  [
    "docs/governance/architecture-decisions.md",
    "../../changelogs/25-26-jul-2026/tasks/02_PROGRAMA_ESTRUCTURAL.md",
  ],
  ["docs/governance/evidence-rules.md", "product-claim-dictionary.md"],
  ["docs/governance/evidence-rules.md", "architecture-decisions.md"],
  [
    "docs/governance/evidence-rules.md",
    "../../changelogs/25-26-jul-2026/tasks/09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md",
  ],
]);

const ARCHITECTURE_DECISIONS = Object.freeze([
  "ADR-001",
  "ADR-002",
  "ADR-003",
  "ADR-004",
  "ADR-005",
  "ADR-006",
  "ADR-007",
  "ADR-008",
  "ADR-009",
  "ADR-010",
]);

const EVIDENCE_RULES = Object.freeze([
  "EVD-001",
  "EVD-002",
  "EVD-003",
  "EVD-004",
  "EVD-005",
  "EVD-006",
  "EVD-007",
  "EVD-008",
  "EVD-009",
  "EVD-010",
  "EVD-011",
  "EVD-012",
]);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function exactKeys(value, expected, label) {
  invariant(
    value && typeof value === "object" && !Array.isArray(value),
    `${label} must be an object`,
  );
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  invariant(
    actual.length === wanted.length &&
      actual.every((key, index) => key === wanted[index]),
    `${label} fields drifted`,
  );
}

function exactArray(actual, expected, label) {
  invariant(Array.isArray(actual), `${label} must be an array`);
  invariant(
    actual.length === expected.length &&
      actual.every((value, index) => value === expected[index]),
    `${label} drifted`,
  );
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(",")}}`;
}

function domainHash(domain, value) {
  return createHash("sha256")
    .update(Buffer.from(domain, "utf8"))
    .update(Buffer.from([0]))
    .update(Buffer.from(canonicalJson(value), "utf8"))
    .digest("hex");
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function governancePublicationRoot(document) {
  const { publication_root: _root, ...payload } = document;
  return domainHash("solguard:governance-publication:v1", payload);
}

function safeRepositoryPath(relativePath, label) {
  invariant(typeof relativePath === "string" && relativePath.length > 0, `${label} is empty`);
  invariant(!path.isAbsolute(relativePath), `${label} must be relative`);
  invariant(!relativePath.includes("\\"), `${label} must use forward slashes`);
  const segments = relativePath.split("/");
  invariant(
    segments.every((segment) => segment.length > 0 && segment !== "." && segment !== ".."),
    `${label} contains an unsafe segment`,
  );
  const resolved = path.resolve(REPOSITORY_ROOT, ...segments);
  const relative = path.relative(REPOSITORY_ROOT, resolved);
  invariant(relative && !relative.startsWith("..") && !path.isAbsolute(relative), `${label} escapes repository`);
  return resolved;
}

export function validateGovernancePublicationDocument(document) {
  exactKeys(
    document,
    [
      "schema_version",
      "publication_version",
      "program_id",
      "program_version",
      "lifecycle_state",
      "claim_authority",
      "contribution",
      "hard_dependencies",
      "documents",
      "source_documents",
      "required_links",
      "validation",
      "publication_root",
    ],
    "governance publication",
  );
  invariant(
    document.schema_version === "solguard-governance-publication.v1" &&
      document.publication_version === 1,
    "governance publication version drifted",
  );
  invariant(
    document.program_id === "solguard-detection-maturity-2026-07-25" &&
      document.program_version === "solguard-detection-maturity-2026-07-25.4",
    "program binding drifted",
  );
  invariant(
    document.lifecycle_state === "pre_genesis_pending" &&
      document.claim_authority === "none",
    "publication attempts to grant lifecycle or claim authority",
  );

  exactKeys(
    document.contribution,
    [
      "contribution_id",
      "parent_primary_id",
      "owner_repository",
      "acceptance_state",
      "cannot_accept_parent_or_claim",
    ],
    "C0-008 contribution",
  );
  invariant(
    document.contribution.contribution_id === "C0-008" &&
      document.contribution.parent_primary_id === "GOV-002" &&
      document.contribution.owner_repository === "solguard-docs" &&
      document.contribution.acceptance_state === "pending" &&
      document.contribution.cannot_accept_parent_or_claim === true,
    "C0-008 contribution binding drifted or attempts acceptance",
  );

  invariant(document.hard_dependencies.length === 1, "C0-008 must have one hard dependency");
  const dependency = document.hard_dependencies[0];
  exactKeys(
    dependency,
    [
      "contribution_id",
      "required_state",
      "required_publication_binding",
      "observed_state",
      "dependency_satisfied",
      "accepted_implementation_ref",
      "accepted_evidence_root",
      "publication_receipt",
      "candidate_branch",
      "candidate_commit",
      "candidate_evidence_root",
    ],
    "C0-002 dependency",
  );
  invariant(
    dependency.contribution_id === "C0-002" &&
      dependency.required_state === "accepted" &&
      dependency.required_publication_binding ===
        "exact_accepted_implementation_ref_and_evidence_root",
    "C0-002 hard dependency contract drifted",
  );
  invariant(
    dependency.observed_state === "pending_draft" &&
      dependency.dependency_satisfied === false &&
      dependency.accepted_implementation_ref === null &&
      dependency.accepted_evidence_root === null &&
      dependency.publication_receipt === null,
    "pending C0-002 dependency was presented as satisfied",
  );
  invariant(
    dependency.candidate_branch === "codex/c0-002-product-claim-dictionary" &&
      dependency.candidate_commit === "6744458f24243095d2a64c8fb06613b059d28133" &&
      dependency.candidate_evidence_root ===
        "1ec12c67f478da6c8bd06fe696ebc381faca771b7aebf1f9e6a38081ac2c3a93" &&
      COMMIT.test(dependency.candidate_commit) &&
      SHA256.test(dependency.candidate_evidence_root),
    "C0-002 candidate binding drifted",
  );

  exactArray(
    document.documents.map((entry) => `${entry.document_id}\0${entry.path}`),
    DOCUMENTS.map(([id, documentPath]) => `${id}\0${documentPath}`),
    "published document identities",
  );
  for (const entry of document.documents) {
    exactKeys(entry, ["document_id", "path", "sha256"], `document ${entry.document_id}`);
    safeRepositoryPath(entry.path, `document ${entry.document_id} path`);
    invariant(SHA256.test(entry.sha256), `document ${entry.document_id} hash is malformed`);
  }

  exactArray(
    document.source_documents.map((entry) => `${entry.source_id}\0${entry.path}`),
    SOURCE_DOCUMENTS.map(([id, sourcePath]) => `${id}\0${sourcePath}`),
    "source document identities",
  );
  for (const entry of document.source_documents) {
    exactKeys(entry, ["source_id", "path", "sha256"], `source ${entry.source_id}`);
    safeRepositoryPath(entry.path, `source ${entry.source_id} path`);
    invariant(SHA256.test(entry.sha256), `source ${entry.source_id} hash is malformed`);
  }

  exactArray(
    document.required_links.map((entry) => `${entry.source}\0${entry.target}`),
    REQUIRED_LINKS.map(([source, target]) => `${source}\0${target}`),
    "required documentation links",
  );
  for (const link of document.required_links) {
    exactKeys(link, ["source", "target"], "required link");
    const sourcePath = safeRepositoryPath(link.source, "required link source");
    invariant(
      typeof link.target === "string" &&
        link.target.length > 0 &&
        !path.isAbsolute(link.target) &&
        !link.target.includes("\\"),
      "required link target is unsafe",
    );
    const targetPath = path.resolve(path.dirname(sourcePath), ...link.target.split("/"));
    const targetRelative = path.relative(REPOSITORY_ROOT, targetPath);
    invariant(
      targetRelative && !targetRelative.startsWith("..") && !path.isAbsolute(targetRelative),
      "required link target escapes repository",
    );
  }

  exactKeys(
    document.validation,
    [
      "architecture_decision_ids",
      "evidence_rule_ids",
      "links_required",
      "content_hashes_required",
      "negative_authority_tests_required",
    ],
    "publication validation policy",
  );
  exactArray(
    document.validation.architecture_decision_ids,
    ARCHITECTURE_DECISIONS,
    "architecture decision IDs",
  );
  exactArray(document.validation.evidence_rule_ids, EVIDENCE_RULES, "evidence rule IDs");
  invariant(
    document.validation.links_required === true &&
      document.validation.content_hashes_required === true &&
      document.validation.negative_authority_tests_required === true,
    "publication validation gates were weakened",
  );
  invariant(SHA256.test(document.publication_root), "publication root is malformed");
  invariant(
    document.publication_root === governancePublicationRoot(document),
    "publication root drifted",
  );
  return document;
}

async function readRegularStable(relativePath, label) {
  const target = safeRepositoryPath(relativePath, label);
  const before = await lstat(target);
  invariant(
    before.isFile() && !before.isSymbolicLink() && before.nlink === 1,
    `${label} must be a single-link regular file`,
  );
  invariant((await realpath(target)) === target, `${label} resolves through indirection`);
  const bytes = await readFile(target);
  const after = await lstat(target);
  invariant(
    before.dev === after.dev &&
      before.ino === after.ino &&
      before.size === after.size &&
      before.mtimeMs === after.mtimeMs,
    `${label} changed while being read`,
  );
  return bytes;
}

function markdownLinks(source) {
  return new Set([...source.matchAll(/\[[^\]]+\]\(([^)]+)\)/gu)].map((match) => match[1]));
}

function headingIds(source, prefix) {
  const expression = new RegExp(`^## (${prefix}-\\d{3}) —`, "gmu");
  return [...source.matchAll(expression)].map((match) => match[1]);
}

export async function validateGovernancePublicationFiles(root = REPOSITORY_ROOT) {
  invariant(path.resolve(root) === REPOSITORY_ROOT, "alternate repository roots are forbidden");
  const manifestBytes = await readRegularStable(
    "docs/governance/governance-publication.v1.json",
    "governance publication manifest",
  );
  const manifest = validateGovernancePublicationDocument(JSON.parse(manifestBytes.toString("utf8")));

  await loadDictionary(
    path.join(REPOSITORY_ROOT, "docs", "governance", "product-claim-dictionary.v1.json"),
  );

  const content = new Map();
  for (const entry of [...manifest.documents, ...manifest.source_documents]) {
    const bytes = await readRegularStable(entry.path, entry.path);
    invariant(sha256(bytes) === entry.sha256, `${entry.path} content hash drifted`);
    content.set(entry.path, bytes);
  }
  for (const link of manifest.required_links) {
    if (!content.has(link.source)) {
      content.set(link.source, await readRegularStable(link.source, link.source));
    }
    const source = content.get(link.source).toString("utf8");
    invariant(markdownLinks(source).has(link.target), `${link.source} is missing link ${link.target}`);
    const targetPath = path.posix.normalize(path.posix.join(path.posix.dirname(link.source), link.target));
    await readRegularStable(targetPath, `link target ${targetPath}`);
  }

  const architecture = content.get("docs/governance/architecture-decisions.md").toString("utf8");
  const evidence = content.get("docs/governance/evidence-rules.md").toString("utf8");
  const index = content.get("docs/governance/README.md").toString("utf8");
  exactArray(headingIds(architecture, "ADR"), ARCHITECTURE_DECISIONS, "architecture headings");
  exactArray(headingIds(evidence, "EVD"), EVIDENCE_RULES, "evidence rule headings");
  invariant(
    (architecture.match(/- Estado: `required_target`\./gu) ?? []).length ===
      ARCHITECTURE_DECISIONS.length,
    "every architecture decision must remain required_target",
  );
  invariant(
    architecture.includes("No acepta `C0-008` ni") &&
      evidence.includes("No aceptan una contribución ni autorizan claims.") &&
      index.replaceAll(/\s+/gu, " ").includes("no aceptan ninguna contribución"),
    "documentation authority disclaimer drifted",
  );

  return {
    schemaVersion: manifest.schema_version,
    publicationRoot: manifest.publication_root,
    documents: manifest.documents.length,
    sourceDocuments: manifest.source_documents.length,
    requiredLinks: manifest.required_links.length,
    architectureDecisions: ARCHITECTURE_DECISIONS.length,
    evidenceRules: EVIDENCE_RULES.length,
    hardDependency: dependencySummary(manifest.hard_dependencies[0]),
    claimAuthority: manifest.claim_authority,
  };
}

function dependencySummary(dependency) {
  return {
    contributionId: dependency.contribution_id,
    observedState: dependency.observed_state,
    satisfied: dependency.dependency_satisfied,
  };
}

function parseArguments(argv) {
  const options = { json: false };
  for (const argument of argv) {
    if (argument === "--json") options.json = true;
    else throw new Error(`unknown argument: ${argument}`);
  }
  return options;
}

export async function runCli(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  const result = await validateGovernancePublicationFiles();
  const output = { status: "passed", ...result };
  process.stdout.write(
    `${options.json ? JSON.stringify(output) : `governance publication validation passed: ${JSON.stringify(result)}`}\n`,
  );
  return output;
}

if (process.argv[1] && path.resolve(process.argv[1]) === ENTRY_PATH) {
  runCli().catch((error) => {
    process.stderr.write(`governance publication validation failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
