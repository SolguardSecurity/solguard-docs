import { createHash } from "node:crypto";
import { constants as fsConstants, readFileSync } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";

import {
  canonicalJson,
  parseStrictJsonBytes,
} from "./acceptance-ledger-markdown.mjs";

export const CORE_FINDINGS_CONTRACT_REF =
  "1ad350d8d3f54c227ca8f81b9cb42c4bf6a0494b";
export const DEPLOY_FINDINGS_READER_REF =
  "cb223071c0dab18190041129490702b8282f27bb";
export const DOCS_UI_WRITER_ENABLED = false;
export const MAX_DOCS_UI_BUNDLE_BYTES = 32 * 1024 * 1024;

const FIXTURE_ROOT = new URL(
  "./fixtures/findings-contract-v1/",
  import.meta.url,
);
const PIN = parseStrictJsonBytes(
  readFileSync(new URL("./findings-docs-ui-pin.v1.json", import.meta.url)),
  "Docs/UI findings pin",
);
const ROLE_DEFINITIONS = Object.freeze({
  finding_envelopes_all: Object.freeze({
    path: "finding_envelopes.json",
    schemaId: "solguard-finding-envelope.v1",
    schemaFile: "finding-envelope.v1.schema.json",
    kind: "finding",
  }),
  published_findings_projection: Object.freeze({
    path: "findings.json",
    schemaId: "solguard-finding-envelope.v1",
    schemaFile: "finding-envelope.v1.schema.json",
    kind: "finding",
  }),
  product_review_envelopes: Object.freeze({
    path: "review_queue.json",
    schemaId: "solguard-review-envelope.v1",
    schemaFile: "review-envelope.v1.schema.json",
    kind: "review",
  }),
});
const SCHEMA_CACHE = new Map();

export function verifyPinnedFindingsDocsUiFixtures() {
  assertPin();
  const result = {};
  for (const [name, expected] of Object.entries(PIN.fixture_sha256)) {
    const bytes = readFileSync(new URL(name, FIXTURE_ROOT));
    const actual = sha256(bytes);
    invariant(
      actual === expected,
      `${name} differs from the pinned C1-009 bytes`,
    );
    result[name] = actual;
  }
  return Object.freeze(result);
}

export function loadPinnedFindingsDocsUiFixture(name) {
  assertPin();
  invariant(
    Object.hasOwn(PIN.fixture_sha256, name),
    `unknown pinned fixture ${name}`,
  );
  const bytes = readFileSync(new URL(name, FIXTURE_ROOT));
  invariant(
    sha256(bytes) === PIN.fixture_sha256[name],
    `${name} fixture digest drifted`,
  );
  return {
    bytes: Buffer.from(bytes),
    document: parseStrictJsonBytes(bytes, name),
  };
}

export function validateAndProjectCanonicalBundleBytes(input, artifactRole) {
  assertPin();
  const definition = requireRole(artifactRole);
  invariant(
    input instanceof Uint8Array,
    "canonical bundle must be a Uint8Array",
  );
  invariant(
    input.byteLength >= 2,
    "canonical bundle must contain one JSON array",
  );
  invariant(
    input.byteLength <= MAX_DOCS_UI_BUNDLE_BYTES,
    `canonical bundle exceeds the ${MAX_DOCS_UI_BUNDLE_BYTES}-byte Docs/UI limit`,
  );
  const bytes = Buffer.from(input);
  const document = parseStrictJsonBytes(bytes, definition.path);
  invariant(
    Array.isArray(document),
    `${definition.path} must be a canonical array`,
  );
  const schema = loadSchema(definition);
  const identifiers = new Set();
  const items = document.map((entry, index) => {
    validateJsonSchema(entry, schema, schema, `${definition.path}[${index}]`);
    invariant(
      entry.schema_version === definition.schemaId &&
        entry.contract_version === "v1",
      `${definition.path}[${index}] has the wrong canonical contract identity`,
    );
    const identifier =
      definition.kind === "finding" ? entry.finding_id : entry.review_id;
    invariant(
      !identifiers.has(identifier),
      `${definition.path} contains duplicate ID ${identifier}`,
    );
    identifiers.add(identifier);
    return definition.kind === "finding"
      ? projectFinding(entry, artifactRole, index)
      : projectReview(entry, index);
  });

  const findingCount = definition.kind === "finding" ? items.length : 0;
  const publishedFindingCount = items.filter(
    (item) => item.kind === "finding" && item.public,
  ).length;
  const reviewCount = definition.kind === "review" ? items.length : 0;
  return {
    view_version: "solguard-docs-findings-ui-projection.v1",
    artifact_role: artifactRole,
    canonical_path: definition.path,
    source_contract: definition.schemaId,
    source_sha256: sha256(bytes),
    source_size: bytes.byteLength,
    canonical_member_count: items.length,
    counts: {
      finding_envelopes: findingCount,
      published_findings: publishedFindingCount,
      review_envelopes: reviewCount,
    },
    items,
    authority: "canonical_v1_presentation_only",
    writer_enabled: DOCS_UI_WRITER_ENABLED,
    runtime_writer_authority: "DECIDE-604",
    source_commit: CORE_FINDINGS_CONTRACT_REF,
    deploy_reader_commit: DEPLOY_FINDINGS_READER_REF,
    dependency_acceptance: { ...PIN.dependency_acceptance },
    measured_capability: null,
  };
}

export function renderFindingsDocsUiMarkdown(view) {
  invariant(
    view?.view_version === "solguard-docs-findings-ui-projection.v1",
    "invalid Docs/UI view",
  );
  const lines = [
    "# Canonical Solguard product view",
    "",
    `- Role: \`${escapeMarkdown(view.artifact_role)}\``,
    `- Source contract: \`${escapeMarkdown(view.source_contract)}\``,
    `- Source SHA-256: \`${view.source_sha256}\``,
    `- Canonical members: ${view.canonical_member_count}`,
    `- Finding envelopes: ${view.counts.finding_envelopes}`,
    `- Published findings: ${view.counts.published_findings}`,
    `- Review envelopes: ${view.counts.review_envelopes}`,
    "- Runtime writer: disabled (future authority: `DECIDE-604`)",
    "- Measured capability: not established",
    "",
  ];
  if (view.items.length === 0)
    return `${lines.join("\n")}No canonical items.\n`;
  if (view.items[0].kind === "finding") {
    lines.push(
      "| Finding | Candidate | Claim | Class | Publication | Presentation |",
      "| --- | --- | --- | --- | --- | --- |",
      ...view.items.map(
        (item) =>
          `| ${escapeMarkdown(item.id)} | ${escapeMarkdown(item.candidate_id)} | ${escapeMarkdown(item.claim.title)} | ${escapeMarkdown(item.claim.vulnerability_class)} | ${escapeMarkdown(item.publication_eligibility)} | ${escapeMarkdown(item.presentation_role)} |`,
      ),
    );
  } else {
    lines.push(
      "| Review | Candidate | Admission | Class | Next action |",
      "| --- | --- | --- | --- | --- |",
      ...view.items.map(
        (item) =>
          `| ${escapeMarkdown(item.id)} | ${escapeMarkdown(item.candidate_id)} | ${escapeMarkdown(item.admission_status)} | ${escapeMarkdown(item.review_class)} | ${escapeMarkdown(item.next_action)} |`,
      ),
    );
  }
  return `${lines.join("\n")}\n`;
}

export async function readPhysicalFindingsBundle(file) {
  invariant(
    typeof file === "string" && file.length > 0,
    "--input requires a path",
  );
  const lexical = path.resolve(file);
  const beforePath = await lstat(lexical, { bigint: true });
  requirePhysicalBundleFile(beforePath, "canonical bundle");
  const noFollow =
    process.platform === "win32" ? 0 : (fsConstants.O_NOFOLLOW ?? 0);
  const physical = await realpath(lexical);
  const handle = await open(lexical, fsConstants.O_RDONLY | noFollow);
  try {
    const before = await handle.stat({ bigint: true });
    requirePhysicalBundleFile(before, "canonical bundle");
    invariant(
      sameFileStat(beforePath, before),
      "canonical bundle changed before open",
    );
    const bytes = await handle.readFile();
    const after = await handle.stat({ bigint: true });
    requirePhysicalBundleFile(after, "canonical bundle");
    invariant(
      sameFileStat(before, after),
      "canonical bundle changed while being read",
    );
    const current = await lstat(lexical, { bigint: true });
    requirePhysicalBundleFile(current, "canonical bundle");
    invariant(
      sameFileStat(after, current),
      "canonical bundle path changed after read",
    );
    invariant(
      (await realpath(lexical)) === physical,
      "canonical bundle physical path changed",
    );
    return bytes;
  } finally {
    await handle.close();
  }
}

function projectFinding(entry, artifactRole, index) {
  invariant(
    entry.verdict.validate_decision === "supported",
    `finding[${index}] is not Supported`,
  );
  invariant(
    entry.verdict.filter_decision === "pass",
    `finding[${index}] is not FILTER Pass`,
  );
  const publicRole = ["unique", "representative"].includes(
    entry.presentation.presentation_role,
  );
  const isPublic =
    entry.verdict.publication_eligibility === "eligible" && publicRole;
  if (artifactRole === "published_findings_projection") {
    invariant(isPublic, `findings.json[${index}] is not publication eligible`);
  }
  const duplicate = entry.presentation.presentation_role === "duplicate";
  invariant(
    duplicate === (entry.verdict.ineligibility?.kind === "duplicate"),
    `finding[${index}] duplicate role and ineligibility disagree`,
  );
  return {
    kind: "finding",
    id: entry.finding_id,
    candidate_id: entry.candidate_id,
    candidate_digest: entry.candidate_digest,
    claim: {
      title: entry.claim.title,
      vulnerability_class: entry.claim.vulnerability_class,
      economic_family: entry.claim.economic_family,
      impact_class: entry.claim.materiality.impact_class,
      proven_lower_bound: structuredClone(
        entry.claim.materiality.proven_lower_bound,
      ),
      time_horizon: entry.claim.materiality.time_horizon,
    },
    scope: {
      language: entry.scope.language,
      framework: entry.scope.framework,
      components: [...entry.scope.components],
      entrypoints: [...entry.scope.entrypoints],
      actors: [...entry.scope.actors],
      assets: [...entry.scope.assets],
    },
    route: {
      flow_id: entry.route.flow_id,
      route_digest: entry.route.route_digest,
      ordered_operations: [...entry.route.ordered_operations],
    },
    invariant_id: entry.invariant.invariant_id,
    proof_status: entry.proof.status,
    coverage: structuredClone(entry.coverage),
    publication_eligibility: entry.verdict.publication_eligibility,
    presentation_role: entry.presentation.presentation_role,
    public: isPublic,
    canonical_parent_id: entry.presentation.canonical_parent_id ?? null,
    ineligibility: entry.verdict.ineligibility
      ? structuredClone(entry.verdict.ineligibility)
      : null,
    refs: {
      verdict: structuredClone(entry.verdict_ref),
      admission: structuredClone(entry.admission_ref),
      source_tree_sha256: entry.bindings.source_tree_sha256,
      runtime_manifest_sha256: entry.bindings.runtime_manifest_sha256,
    },
  };
}

function projectReview(entry, index) {
  invariant(
    entry.technical_verdict === "supported",
    `review[${index}] is not Supported`,
  );
  invariant(
    ["review", "reject"].includes(entry.admission_status),
    `review[${index}] is not backed by FILTER review/reject`,
  );
  return {
    kind: "review",
    id: entry.review_id,
    candidate_id: entry.candidate_id,
    candidate_digest: entry.candidate_digest,
    technical_verdict: entry.technical_verdict,
    admission_status: entry.admission_status,
    review_class: entry.review_class,
    unresolved_checks: [...entry.admission_unresolved_checks],
    requested_context: [...entry.requested_admission_context],
    admission_debt: [...entry.admission_debt],
    next_action: entry.next_action,
    refs: {
      verdict: structuredClone(entry.verdict_ref),
      admission: structuredClone(entry.admission_ref),
      proof_certificate_ref: entry.proof_certificate_ref,
      proof_certificate_digest: entry.proof_certificate_digest,
      source_tree_sha256: entry.source_tree_sha256,
      runtime_manifest_sha256: entry.runtime_manifest_sha256,
    },
  };
}

function loadSchema(definition) {
  if (SCHEMA_CACHE.has(definition.schemaFile))
    return SCHEMA_CACHE.get(definition.schemaFile);
  const { document } = loadPinnedFindingsDocsUiFixture(definition.schemaFile);
  invariant(
    document["x-solguard-contract-id"] === definition.schemaId,
    "schema contract ID drifted",
  );
  invariant(
    document["x-solguard-owner"] === "solguard-core",
    "schema owner drifted",
  );
  invariant(
    document["x-solguard-writer-enabled"] === false,
    "schema writer unexpectedly enabled",
  );
  SCHEMA_CACHE.set(definition.schemaFile, document);
  return document;
}

function validateJsonSchema(value, schema, root, label) {
  invariant(
    schema && typeof schema === "object" && !Array.isArray(schema),
    `${label} schema is invalid`,
  );
  if (schema.$ref) {
    invariant(
      schema.$ref.startsWith("#/"),
      `${label} uses a non-local schema reference`,
    );
    const target = schema.$ref
      .slice(2)
      .split("/")
      .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
      .reduce((current, key) => current?.[key], root);
    invariant(target, `${label} schema reference is unresolved`);
    validateJsonSchema(value, target, root, label);
  }
  if (schema.type)
    invariant(
      matchesType(value, schema.type),
      `${label} must be ${schema.type}`,
    );
  if (Object.hasOwn(schema, "const")) {
    invariant(
      isDeepStrictEqual(value, schema.const),
      `${label} differs from its canonical constant`,
    );
  }
  if (schema.enum)
    invariant(
      schema.enum.some((entry) => isDeepStrictEqual(value, entry)),
      `${label} is unknown`,
    );
  if (typeof value === "string") {
    const length = [...value].length;
    if (schema.minLength !== undefined)
      invariant(length >= schema.minLength, `${label} is too short`);
    if (schema.maxLength !== undefined)
      invariant(length <= schema.maxLength, `${label} is too long`);
    if (schema.pattern)
      invariant(
        new RegExp(schema.pattern, "u").test(value),
        `${label} has invalid syntax`,
      );
    if (schema.format === "date-time")
      invariant(isRfc3339DateTime(value), `${label} is not RFC3339 date-time`);
  }
  if (typeof value === "number") {
    if (schema.minimum !== undefined)
      invariant(value >= schema.minimum, `${label} is below minimum`);
    if (schema.maximum !== undefined)
      invariant(value <= schema.maximum, `${label} is above maximum`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined)
      invariant(value.length >= schema.minItems, `${label} has too few items`);
    if (schema.maxItems !== undefined)
      invariant(value.length <= schema.maxItems, `${label} has too many items`);
    if (schema.uniqueItems) {
      invariant(
        new Set(value.map((entry) => canonicalJson(entry))).size ===
          value.length,
        `${label} contains duplicates`,
      );
    }
    if (schema.items)
      value.forEach((entry, index) =>
        validateJsonSchema(entry, schema.items, root, `${label}[${index}]`),
      );
  }
  if (isObject(value)) {
    const keys = Object.keys(value);
    if (schema.minProperties !== undefined)
      invariant(
        keys.length >= schema.minProperties,
        `${label} has too few fields`,
      );
    for (const required of schema.required ?? [])
      invariant(
        Object.hasOwn(value, required),
        `${label}.${required} is required`,
      );
    for (const [key, entry] of Object.entries(value)) {
      if (schema.properties?.[key])
        validateJsonSchema(
          entry,
          schema.properties[key],
          root,
          `${label}.${key}`,
        );
      else if (schema.additionalProperties === false)
        invariant(false, `${label}.${key} is forbidden`);
      else if (isObject(schema.additionalProperties))
        validateJsonSchema(
          entry,
          schema.additionalProperties,
          root,
          `${label}.${key}`,
        );
    }
  }
  for (const entry of schema.allOf ?? [])
    validateJsonSchema(value, entry, root, label);
  if (schema.if) {
    const branch = schemaPasses(value, schema.if, root)
      ? schema.then
      : schema.else;
    if (branch) validateJsonSchema(value, branch, root, label);
  }
  if (schema.not)
    invariant(
      !schemaPasses(value, schema.not, root),
      `${label} matches a forbidden shape`,
    );
}

function schemaPasses(value, schema, root) {
  try {
    validateJsonSchema(value, schema, root, "conditional value");
    return true;
  } catch {
    return false;
  }
}

function matchesType(value, type) {
  if (type === "object") return isObject(value);
  if (type === "array") return Array.isArray(value);
  if (type === "integer") return Number.isSafeInteger(value);
  if (type === "number")
    return typeof value === "number" && Number.isFinite(value);
  if (type === "string") return typeof value === "string";
  if (type === "boolean") return typeof value === "boolean";
  if (type === "null") return value === null;
  return false;
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isRfc3339DateTime(value) {
  return (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.test(
      value,
    ) && Number.isFinite(Date.parse(value))
  );
}

function requirePhysicalBundleFile(info, label) {
  invariant(
    info.isFile() && !info.isSymbolicLink(),
    `${label} must be a physical file`,
  );
  invariant(info.nlink === 1n, `${label} must have exactly one physical link`);
  invariant(
    info.size >= 2n && info.size <= BigInt(MAX_DOCS_UI_BUNDLE_BYTES),
    `${label} size is outside the inclusive Docs/UI limit`,
  );
}

function sameFileStat(left, right) {
  return ["dev", "ino", "size", "mtimeNs", "ctimeNs"].every(
    (field) => left[field] === right[field],
  );
}

function requireRole(role) {
  invariant(
    typeof role === "string" && Object.hasOwn(ROLE_DEFINITIONS, role),
    "--role must be a supported canonical artifact role",
  );
  return ROLE_DEFINITIONS[role];
}

function assertPin() {
  invariant(
    PIN.schema_version === "solguard-findings-docs-ui-consumer-pin.v1",
    "Docs/UI pin schema drifted",
  );
  invariant(
    PIN.consumer_repository === "SolguardSecurity/solguard-docs",
    "Docs/UI consumer owner drifted",
  );
  invariant(
    PIN.source_repository === "SolguardSecurity/solguard-core",
    "finding contract owner drifted",
  );
  invariant(
    PIN.source_commit === CORE_FINDINGS_CONTRACT_REF,
    "finding contract commit drifted",
  );
  invariant(
    PIN.source_evidence_root ===
      "sha256:319c7e246aefbf41934bde419021f8bd38566c4add32d3032cb52e5f26a8a7c7",
    "finding contract evidence drifted",
  );
  invariant(
    PIN.source_publication_root ===
      "sha256:6cbf6026a2fc343aa58c62e71f70520dbb1b6a2a824e905816d79e2ba0968b1b",
    "finding publication root drifted",
  );
  invariant(
    PIN.deploy_reader_commit === DEPLOY_FINDINGS_READER_REF,
    "Deploy reader commit drifted",
  );
  invariant(
    PIN.deploy_reader_evidence_root ===
      "sha256:def7ed84d98fca40317a79193e4b11e5b02db91fd900c1a3959c7a71744c792a",
    "Deploy reader evidence drifted",
  );
  invariant(
    PIN.writer_enabled === false &&
      PIN.runtime_writer_authority === "DECIDE-604",
    "Docs/UI writer boundary drifted",
  );
  invariant(
    PIN.dependency_acceptance?.["C1-009"] ===
      "prepared_draft_pending_development_single_custodian_acceptance",
    "C1-009 status drifted",
  );
  invariant(
    PIN.dependency_acceptance?.["C1-009C"] ===
      "prepared_draft_pending_development_single_custodian_acceptance",
    "C1-009C status drifted",
  );
  for (const [role, expected] of Object.entries(ROLE_DEFINITIONS)) {
    const pinned = PIN.roles?.[role];
    invariant(
      pinned?.canonical_path === expected.path,
      `${role} canonical path drifted`,
    );
    invariant(
      pinned?.canonical_schema === expected.schemaId,
      `${role} schema drifted`,
    );
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function escapeMarkdown(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("|", "\\|")
    .replace(/[\r\n]+/gu, " ");
}

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function parseArguments(argv) {
  const options = { format: "json" };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (argument === "--input") options.input = value;
    else if (argument === "--role") options.role = value;
    else if (argument === "--format") options.format = value;
    else
      throw new Error(
        `unknown or forbidden argument ${argument}; C1-009D is read-only`,
      );
    invariant(value && !value.startsWith("--"), `${argument} requires a value`);
    index += 1;
  }
  invariant(options.input, "--input is required");
  requireRole(options.role);
  invariant(
    ["json", "markdown"].includes(options.format),
    "--format must be json or markdown",
  );
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const bytes = await readPhysicalFindingsBundle(options.input);
  const view = validateAndProjectCanonicalBundleBytes(bytes, options.role);
  process.stdout.write(
    options.format === "json"
      ? `${JSON.stringify(view, null, 2)}\n`
      : renderFindingsDocsUiMarkdown(view),
  );
}

const invokedAsScript =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedAsScript) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
