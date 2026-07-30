import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contractPath = path.join(root, "docs", "solguard-core", "runtime-portable-lifecycle.v1.json");
const documentPath = path.join(root, "docs", "solguard-core", "runtime-portable-lifecycle.md");

const expectedContracts = [
  "solguard-run-artifact-manifest.v1",
  "solguard-product-artifact-manifest.v1",
  "solguard-run-terminal-state.v1",
];
const expectedOutcomes = ["succeeded", "failed", "cancelled", "completed_with_debt"];
const expectedEndpoints = [
  "POST /runs/:run_id/artifacts/resolve",
  "POST /runs/:run_id/artifacts/expose",
  "POST /runs/:run_id/attempts/:attempt_id/cancel",
  "GET /runs/:run_id/attempts/:attempt_id/terminal-receipt",
];
const expectedRefs = new Map([
  ["C2-020", "14595a76dda8c7bfde0c8a962f0af879de99f09a"],
  ["C2-020A", "b37bfe66facf985bb2701778288df90d425c72c8"],
  ["C2-020B", "c5c60894165df6fe9e5e4d3b019ba19662be25e4"],
  ["C2-020C", "0d94e3dcc3f8331c5bd59403f35b7eebb67a3bc4"],
  ["C2-020D", "56141d2d44a34a2b9c7f173e687a8ad5724b8dbc"],
  ["C2-021", "eacc2c9603499fad165a3400be1a1917b4e278a8"],
  ["C2-022", "6b1a6f8f3868264c96b136c959100dcda5ff6db3"],
  ["C2-023", "8384ce1120c8c2361264ffaf42556b6455005982"],
]);

function equalArray(actual, expected, field) {
  if (!Array.isArray(actual) || actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
    throw new Error(`${field} must match the closed ordered inventory`);
  }
}

function validate(contract, document) {
  if (contract.schema_version !== "docs.runtime-portable-lifecycle.v1") throw new Error("unexpected schema_version");
  if (contract.status !== "draft_pending" || contract.authoritative !== false || contract.acceptance_authority !== false) {
    throw new Error("documentation must remain draft, pending and non-authoritative");
  }
  equalArray(contract.contracts, expectedContracts, "contracts");
  equalArray(contract.terminal_outcomes, expectedOutcomes, "terminal_outcomes");
  equalArray(contract.endpoints, expectedEndpoints, "endpoints");
  equalArray(contract.resume?.forbidden_authority, ["filename", "path", "cwd", "mtime"], "resume.forbidden_authority");
  if (contract.resume?.terminal_runs_are_immutable !== true || contract.recovery?.requires_empty_identity_store !== true || contract.recovery?.verify_all_before_publish !== true || contract.recovery?.tamper_fails_without_partial_write !== true || contract.recovery?.database_manifest_rows_create_only !== true) {
    throw new Error("portable recovery invariants are incomplete");
  }
  if (!Array.isArray(contract.upstream_refs) || contract.upstream_refs.length !== 8) {
    throw new Error("upstream_refs must contain exactly eight contributions");
  }
  for (const ref of contract.upstream_refs) {
    if (expectedRefs.get(ref.contribution_id) !== ref.commit) throw new Error(`unexpected commit for ${ref.contribution_id}`);
    if (!/^solguard-[a-z]+$/.test(ref.repository)) throw new Error(`invalid repository for ${ref.contribution_id}`);
  }
  for (const token of [...expectedContracts, ...expectedOutcomes, ...expectedEndpoints, ...expectedRefs.keys(), "no implica merge", "no validan GitHub Actions"]) {
    if (!document.includes(token)) throw new Error(`documentation is missing ${token}`);
  }
}

const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const document = fs.readFileSync(documentPath, "utf8");
validate(contract, document);

if (process.argv.includes("--negative-self-test")) {
  const corrupt = structuredClone(contract);
  corrupt.recovery.tamper_fails_without_partial_write = false;
  let rejected = false;
  try {
    validate(corrupt, document);
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error("negative self-test did not reject a corrupt recovery policy");
}

console.log("runtime lifecycle documentation: PASS");
