#!/usr/bin/env node

import { readFile, readdir, lstat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED_TERMS = [
  "signal",
  "lead",
  "candidate",
  "proof",
  "supported",
  "refuted",
  "inconclusive",
  "pass",
  "review",
  "reject",
  "finding",
  "match",
  "detected",
  "known",
  "blind",
  "novel",
  "expert",
  "release",
];

const EXPECTED_REPOSITORIES = [
  "solguard-value",
  "solguard-validate",
  "solguard-trace",
  "solguard-map",
  "solguard-invariant",
  "solguard-filter",
  "solguard-economic",
  "solguard-docs",
  "solguard-discover",
  "solguard-diff",
  "solguard-deploy",
  "solguard-database",
  "solguard-core",
  "solguard-backend",
  "solguard-agents",
];

const ALIAS_PATTERN =
  /\b(?:(?:[a-z0-9]+)_)*release_eligible\b|\bfinding_eligibility\b/iu;
const LEGACY_QUALIFIER =
  /\b(?:legacy|deprecated|compatibility(?:-only)?|forbidden|prohibited|alias(?:es)?|historical|heredado|obsoleto|prohibido)\b/iu;
const LITERAL_FALSE_ALIAS =
  /\b(?:(?:[a-z0-9]+)_)*release_eligible["'`]?\s*[:=]\s*false\b|\bfinding_eligibility["'`]?\s*[:=]\s*false\b/iu;
const LITERAL_TRUE_ALIAS =
  /\b(?:(?:[a-z0-9]+)_)*release_eligible["'`]?\s*[:=]\s*true\b|\bfinding_eligibility["'`]?\s*[:=]\s*true\b/iu;
const PREFILTER_FINDING =
  /\b(?:MAP|TRACE|DISCOVER|ECONOMIC|VALUE|INVARIANT)\b[\s\S]{0,280}\b(?:emit(?:s)?|produc(?:e|es)|publish(?:es)?|detect(?:s)?|find(?:s)?|confirm(?:s)?|report(?:s)?|genera|generan|emite|emiten|publica|publican|detecta|detectan|encuentra|encuentran|confirma|confirman)\b[\s\S]{0,180}\b(?:finding(?:s)?|hallazgo(?:s)?|vulnerabilit(?:y|ies)|vulnerabilidad(?:es)?)\b/u;
const STRONG_CLAIM =
  /\b(?:blind|novel|expert)\s+(?:finding|findings|detection|detected|validated|verified|proven|certified|hallazgo|hallazgos|detecci[oó]n|validado|verificado|probado|certificado)\b|\b(?:release|bounty)[ -]ready\b|\b(?:listo|lista)\s+para\s+(?:release|bug bounty)\b/iu;
const NON_CLAIM_QUALIFIER =
  /\b(?:no|not|never|nunca|cannot|can't|does not|do not|pending|pendiente|diagnostic|diagn[oó]stico|unknown|desconocido|open|abierto|ineligible|no existe|sin evidencia|hypothesis|hip[oó]tesis|debt|deuda|forbidden|prohibited)\b/iu;
const EVIDENCE_LINK =
  /\[[^\]]+\]\([^)]+\)|\b(?:evidence|evidencia)[-_ ](?:ref|link|root|dossier)\b|\b(?:evidence|evidencia)\s*[:=]\s*\S+/iu;

function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function exactKeys(value, expected, label) {
  invariant(
    value && typeof value === "object" && !Array.isArray(value),
    `${label} must be an object`,
  );
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  invariant(
    JSON.stringify(actual) === JSON.stringify(wanted),
    `${label} fields drifted: ${actual.join(",")}`,
  );
}

function stringArray(value, label) {
  invariant(Array.isArray(value) && value.length > 0, `${label} must be non-empty`);
  invariant(
    value.every((entry) => typeof entry === "string" && entry.length > 0),
    `${label} entries must be non-empty strings`,
  );
  invariant(new Set(value).size === value.length, `${label} contains duplicates`);
}

export function validateDictionary(dictionary) {
  exactKeys(
    dictionary,
    [
      "schema_version",
      "dictionary_version",
      "owner",
      "status",
      "claim_authority",
      "canonical_terms",
      "forbidden_aliases",
      "legacy_reference_policy",
      "lint_policy",
      "compatibility_debt",
    ],
    "dictionary",
  );
  invariant(
    dictionary.schema_version === "solguard-product-claim-dictionary.v1",
    "dictionary schema version drifted",
  );
  invariant(dictionary.dictionary_version === 1, "dictionary version drifted");
  invariant(dictionary.owner === "solguard-docs", "dictionary owner drifted");
  invariant(
    dictionary.status === "pre_genesis_candidate",
    "dictionary must remain pre_genesis_candidate before acceptance",
  );
  invariant(dictionary.claim_authority === "none", "dictionary grants claim authority");

  invariant(Array.isArray(dictionary.canonical_terms), "canonical_terms must be an array");
  invariant(
    JSON.stringify(dictionary.canonical_terms.map((entry) => entry.term)) ===
      JSON.stringify(EXPECTED_TERMS),
    "canonical term order or membership drifted",
  );
  for (const entry of dictionary.canonical_terms) {
    exactKeys(
      entry,
      [
        "term",
        "stage",
        "definition",
        "permitted_assertion",
        "forbidden_implications",
        "required_evidence",
      ],
      `term ${entry.term}`,
    );
    for (const field of ["term", "stage", "definition", "permitted_assertion"]) {
      invariant(
        typeof entry[field] === "string" && entry[field].length > 0,
        `${entry.term}.${field} must be non-empty`,
      );
    }
    stringArray(entry.forbidden_implications, `${entry.term}.forbidden_implications`);
    stringArray(entry.required_evidence, `${entry.term}.required_evidence`);
  }

  invariant(
    JSON.stringify(dictionary.forbidden_aliases.map((entry) => entry.alias)) ===
      JSON.stringify(["release_eligible", "finding_eligibility"]),
    "forbidden aliases drifted",
  );
  for (const alias of dictionary.forbidden_aliases) {
    exactKeys(
      alias,
      ["alias", "replacement", "reason", "legacy_removal_task"],
      `alias ${alias.alias}`,
    );
    invariant(
      alias.replacement === "publication_eligibility",
      `${alias.alias} replacement drifted`,
    );
    invariant(alias.legacy_removal_task === "C1-021", `${alias.alias} removal task drifted`);
  }

  exactKeys(
    dictionary.legacy_reference_policy,
    ["claim_authority", "allowed_only_when", "positive_or_unqualified_use"],
    "legacy_reference_policy",
  );
  invariant(
    dictionary.legacy_reference_policy.claim_authority === "none",
    "legacy references grant claim authority",
  );
  invariant(
    dictionary.legacy_reference_policy.positive_or_unqualified_use === "forbidden",
    "positive legacy alias use is not forbidden",
  );
  stringArray(
    dictionary.legacy_reference_policy.allowed_only_when,
    "legacy_reference_policy.allowed_only_when",
  );

  invariant(
    JSON.stringify(dictionary.lint_policy.repository_names) ===
      JSON.stringify(EXPECTED_REPOSITORIES),
    "workspace repository list drifted",
  );
  exactKeys(
    dictionary.lint_policy,
    [
      "repository_names",
      "included_documentation",
      "excluded_documentation",
      "finding_producer_allowlist",
      "evidence_link_required_for",
    ],
    "lint_policy",
  );
  for (const field of [
    "repository_names",
    "included_documentation",
    "excluded_documentation",
    "finding_producer_allowlist",
    "evidence_link_required_for",
  ]) {
    stringArray(dictionary.lint_policy[field], `lint_policy.${field}`);
  }
  exactKeys(
    dictionary.compatibility_debt,
    ["source_contract_alias_removal_task", "statement"],
    "compatibility_debt",
  );
  invariant(
    dictionary.compatibility_debt.source_contract_alias_removal_task === "C1-021",
    "compatibility debt is not bound to C1-021",
  );
  invariant(
    dictionary.compatibility_debt.statement.includes("does not rewrite serialized product contracts"),
    "compatibility debt statement became ambiguous",
  );
  return dictionary;
}

export async function loadDictionary(dictionaryPath) {
  const bytes = await readFile(dictionaryPath, "utf8");
  return validateDictionary(JSON.parse(bytes));
}

function markdownParagraphs(source) {
  const lines = source.replaceAll("\r\n", "\n").split("\n");
  const paragraphs = [];
  let current = [];
  let startLine = 1;
  let fence = null;

  const flush = () => {
    if (current.length > 0) {
      paragraphs.push({ line: startLine, text: current.join(" ").trim() });
      current = [];
    }
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const marker = line.match(/^\s*(```|~~~)/u)?.[1] ?? null;
    if (marker) {
      flush();
      if (fence === null) fence = marker;
      else if (fence === marker) fence = null;
      continue;
    }
    if (fence !== null) continue;
    if (line.trim().length === 0) {
      flush();
      continue;
    }
    if (current.length === 0) startLine = index + 1;
    current.push(line.trim());
  }
  flush();
  return paragraphs;
}

export function lintMarkdownText(source, relativePath = "README.md") {
  const violations = [];
  for (const paragraph of markdownParagraphs(source)) {
    if (
      ALIAS_PATTERN.test(paragraph.text) &&
      (LITERAL_TRUE_ALIAS.test(paragraph.text) ||
        (!LEGACY_QUALIFIER.test(paragraph.text) &&
          !LITERAL_FALSE_ALIAS.test(paragraph.text)))
    ) {
      violations.push({
        code: "FORBIDDEN_CLAIM_ALIAS",
        path: relativePath,
        line: paragraph.line,
        message: "legacy eligibility alias is positive or unqualified",
      });
    }
    if (PREFILTER_FINDING.test(paragraph.text) && !NON_CLAIM_QUALIFIER.test(paragraph.text)) {
      violations.push({
        code: "PREFILTER_FINDING_PROMOTION",
        path: relativePath,
        line: paragraph.line,
        message: "pre-FILTER producer is presented as emitting a finding",
      });
    }
    if (
      STRONG_CLAIM.test(paragraph.text) &&
      !NON_CLAIM_QUALIFIER.test(paragraph.text) &&
      !EVIDENCE_LINK.test(paragraph.text)
    ) {
      violations.push({
        code: "CLAIM_EVIDENCE_REQUIRED",
        path: relativePath,
        line: paragraph.line,
        message: "strong product claim has no evidence link in its paragraph",
      });
    }
  }
  return violations;
}

async function regularFile(filePath) {
  try {
    const info = await lstat(filePath);
    return info.isFile() && !info.isSymbolicLink() && info.nlink === 1;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function markdownBelow(directory, repositoryRoot, output) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      await markdownBelow(absolute, repositoryRoot, output);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      output.push(path.relative(repositoryRoot, absolute).replaceAll(path.sep, "/"));
    }
  }
}

export async function activeDocumentationPaths(repositoryRoot) {
  const paths = [];
  for (const candidate of ["README.md", "agents/README.md"]) {
    if (await regularFile(path.join(repositoryRoot, candidate))) paths.push(candidate);
  }
  await markdownBelow(path.join(repositoryRoot, "docs"), repositoryRoot, paths);
  return [...new Set(paths)].sort((left, right) => left.localeCompare(right, "en"));
}

export async function scanRepository(repositoryRoot, repositoryName = path.basename(repositoryRoot)) {
  const files = await activeDocumentationPaths(repositoryRoot);
  const violations = [];
  for (const relativePath of files) {
    const source = await readFile(path.join(repositoryRoot, relativePath), "utf8");
    for (const violation of lintMarkdownText(source, relativePath)) {
      violations.push({ repository: repositoryName, ...violation });
    }
  }
  return { repository: repositoryName, files: files.length, violations };
}

export async function scanWorkspace(workspaceRoot, dictionary) {
  const repositories = [];
  for (const repositoryName of dictionary.lint_policy.repository_names) {
    const repositoryRoot = path.join(workspaceRoot, repositoryName);
    const info = await lstat(repositoryRoot).catch((error) => {
      if (error?.code === "ENOENT") return null;
      throw error;
    });
    invariant(info?.isDirectory(), `workspace repository is missing: ${repositoryName}`);
    repositories.push(await scanRepository(repositoryRoot, repositoryName));
  }
  return {
    repositories,
    fileCount: repositories.reduce((total, entry) => total + entry.files, 0),
    violations: repositories.flatMap((entry) => entry.violations),
  };
}

function parseArguments(argv) {
  const options = { dictionary: null, repoRoot: null, workspaceRoot: null, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--dictionary") options.dictionary = argv[++index];
    else if (argument === "--repo-root") options.repoRoot = argv[++index];
    else if (argument === "--workspace-root") options.workspaceRoot = argv[++index];
    else if (argument === "--json") options.json = true;
    else throw new Error(`unknown argument: ${argument}`);
  }
  invariant(!(options.repoRoot && options.workspaceRoot), "choose repo-root or workspace-root");
  return options;
}

export async function runCli(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const dictionaryPath = path.resolve(
    options.dictionary ??
      path.join(scriptRoot, "docs", "governance", "product-claim-dictionary.v1.json"),
  );
  const dictionary = await loadDictionary(dictionaryPath);
  const scan = options.workspaceRoot
    ? await scanWorkspace(path.resolve(options.workspaceRoot), dictionary)
    : {
        repositories: [
          await scanRepository(path.resolve(options.repoRoot ?? scriptRoot), "solguard-docs"),
        ],
      };
  scan.fileCount ??= scan.repositories.reduce((total, entry) => total + entry.files, 0);
  scan.violations ??= scan.repositories.flatMap((entry) => entry.violations);

  const result = {
    status: scan.violations.length === 0 ? "passed" : "failed",
    schemaVersion: dictionary.schema_version,
    canonicalTerms: dictionary.canonical_terms.length,
    repositories: scan.repositories.length,
    files: scan.fileCount,
    violations: scan.violations,
  };
  if (options.json) console.log(JSON.stringify(result));
  else if (result.status === "passed") {
    console.log(
      `PASS: ${result.canonicalTerms} terms; ${result.repositories} repositories; ${result.files} files`,
    );
  } else {
    for (const violation of result.violations) {
      console.error(
        `${violation.repository}:${violation.path}:${violation.line} ${violation.code} ${violation.message}`,
      );
    }
  }
  if (result.status !== "passed") process.exitCode = 1;
  return result;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  runCli().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
