#!/usr/bin/env node

import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const LEDGER_VIEW_AUTHORITATIVE = false;
export const LEDGER_WRITER_ENABLED = false;

export const ACCEPTANCE_LEDGER_READER_PINS = Object.freeze({
    schemaPublisher: Object.freeze({
        repository: "solguard-agents",
        taskId: "C0-012",
        commit: "f093848824173f6c5cdb1a7a89dd4acbe5d90ab2",
    }),
    validatingReader: Object.freeze({
        repository: "solguard-deploy",
        taskId: "C0-013",
        commit: "36ca97b6f8117df77039eea397763b5a3a35a310",
    }),
});

const MAX_DOCUMENT_BYTES = 32 * 1024 * 1024;
const SHA256 = /^[0-9a-f]{64}$/u;
const GIT_SHA1 = /^[0-9a-f]{40}$/u;
const CANONICAL_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{2,255}$/u;
const ID_SET_ALGORITHM =
    "SHA256(UTF8(solguard:program-set:${set_kind}:v1) || 0x00 || RFC8785_JCS(closed payload))";

const IMPLEMENTATION_STATES = Object.freeze(["pending", "accepted", "reopened"]);
const OPERATIONAL_STATES = Object.freeze([
    "pending",
    "accepted",
    "reopened",
    "terminal_failed",
    "terminal_invalid",
    "insufficient_evidence",
    "terminal_not_run",
]);
const DERIVED_STATES = Object.freeze(["unsatisfied", "satisfied"]);
const OPERATIONAL_NONPASS = new Set(OPERATIONAL_STATES.slice(3));

const EVENT_OPERATIONS = Object.freeze([
    "genesis_batch",
    "accept_contribution",
    "reopen_contribution",
    "accept_primary",
    "reopen_primary",
    "record_candidate_epoch_open",
    "record_validation",
    "record_freeze_attestation",
    "record_database_cutover",
    "record_campaign",
    "record_measurement",
    "record_upstream_nonpass",
    "record_candidate_epoch_close",
    "record_final_evidence",
    "accept_release_pre_tag",
    "accept_post_tag_terminal",
    "materialize_derived",
]);

const EVENT_FIELDS = Object.freeze([
    "schema_version",
    "canonical_preimage_domain",
    "program_id",
    "ledger_revision_before",
    "event_id",
    "event_self_hash",
    "sequence",
    "operation",
    "target_id",
    "target_version",
    "prior_event_hash",
    "expected_authoritative_head_root",
    "expected_ledger_revision",
    "previous_authoritative_commit_receipt_ref",
    "previous_authoritative_commit_receipt_root",
    "lease_id",
    "lease_ref",
    "lease_root",
    "lease_expiry",
    "fencing_token",
    "payload",
    "payload_digest",
    "role",
    "signer_key_id",
    "signature",
    "trusted_timestamp",
    "external_timestamp_quorum_2_of_2",
]);

const LEDGER_FIELDS = Object.freeze([
    "schema_version",
    "program_id",
    "program_version",
    "ledger_revision",
    "generated_view",
    "specification",
    "scope_matrix",
    "id_set_sha256",
    "id_set_hash_algorithm",
    "state_counts",
    "allowed_states",
    "nodes",
    "meta_states",
    "contributions",
    "node_id_set_sha256",
    "contribution_id_set_sha256",
    "genesis_batch",
    "transition_contract",
    "policy_commitment_contract",
    "live_authorization_contract",
    "terminal_transition_contract",
    "operational_outcome_contract",
    "external_timestamp_contract",
    "candidate_epoch_contract",
    "candidate_epoch_closure_receipt_contract",
    "closure_domain_contract",
    "candidate_epoch_registry",
    "candidate_epoch_close_transition_contract",
    "upstream_nonpass_receipt_contract",
    "canonical_set_commitment_contract",
    "linearizability_contract",
    "all_counted_item_id_set_sha256",
    "resource_profile_policy_registry",
]);

const PRIMARY_REQUIRED = Object.freeze([
    "id",
    "kind",
    "counted",
    "owner",
    "state",
    "node_version",
    "operational",
    "evidence_mode",
    "dependencies",
    "formula",
    "predicate",
    "evidence_descriptor",
    "verifier_descriptor",
    "acceptance",
    "required_contribution_ids",
    "closure_domain_id",
    "terminalizable",
]);
const PRIMARY_ALLOWED = Object.freeze([
    ...PRIMARY_REQUIRED,
    "candidate_epoch_id",
    "candidate_epoch_kind",
    "epoch_constants",
    "measurement_subtype",
    "produced_contracts",
    "profile_constants",
    "terminal_outcomes",
    "transition_operation",
]);
const DERIVED_REQUIRED = Object.freeze([
    "id",
    "kind",
    "counted",
    "owner",
    "computed_state",
    "node_version",
    "operational",
    "dependencies",
    "formula",
    "predicate",
    "evidence_descriptor",
    "verifier_descriptor",
    "acceptance",
    "closure_domain_id",
]);
const DERIVED_ALLOWED = Object.freeze([
    ...DERIVED_REQUIRED,
    "candidate_epoch_id",
    "materialization_operation",
    "measurement_subtype",
]);
const CONTRIBUTION_REQUIRED = Object.freeze([
    "contribution_id",
    "kind",
    "counted",
    "parent_primary_id",
    "parent_primary_ids",
    "integration_gate",
    "declared_parent_id",
    "owner_repo",
    "state",
    "contribution_version",
    "operational",
    "dependencies",
    "hard_contribution_dependencies",
    "source",
    "predicate",
    "evidence_descriptor",
    "verifier_descriptor",
    "acceptance",
    "closure_domain_id",
]);
const CONTRIBUTION_ALLOWED = Object.freeze([
    ...CONTRIBUTION_REQUIRED,
    "contribution_type",
    "expected_commit",
    "expected_receipt",
]);
const DEPENDENCY_ALLOWED = Object.freeze([
    "id",
    "type",
    "contract_id",
    "contract_version",
    "dependency_bindings",
    "evaluation_receipt_root",
    "evidence_root",
    "missing_or_stale_receipt",
    "operand_state_hash",
    "ordering_receipt_root",
    "pending_reopened_or_missing",
    "required_closure_outcome",
    "required_computed_states",
    "required_state",
    "required_states",
    "successor_release_closure_import",
]);
const ACCEPTANCE_REQUIRED = Object.freeze([
    "evidence_root",
    "verifier_root",
    "accepted_ledger_revision",
    "dependency_state_hash",
    "reopened_by",
]);
const ACCEPTANCE_ALLOWED = Object.freeze([
    ...ACCEPTANCE_REQUIRED,
    "accepted_implementation_ref",
    "closure_outcome",
    "closure_receipt_root",
    "terminal_outcome_root",
    "terminal_reason_root",
    "upstream_nonpass_receipt_root",
]);

const PINNED_PROGRAM_ROOTS = new Map([
    [
        "solguard-detection-maturity-2026-07-25\0solguard-detection-maturity-2026-07-25.3",
        Object.freeze({
            node: "77dd0c5ac31ccee4347a4a3ef391c9c298e86fd5fe6f56acf7600aab7ffc0cfd",
            contribution:
                "64b77b67ddde6638784544b45b9f7b8ed7f6631669026a663ffdece56ee0961c",
            all: "6dde0cc088977a833b1badbc3312798aca9a101bb8bf981fe267e24d0762e6bf",
            dag: "e3d4bb06f045e5aadc45f9f69b53810adfa710bd5bd478c1db63ebbb3d29d202",
        }),
    ],
]);

function invariant(condition, message) {
    if (!condition) throw new Error(message);
}

function assertObject(value, label) {
    invariant(
        value !== null && typeof value === "object" && !Array.isArray(value),
        `${label} must be an object`,
    );
}

function assertClosedObject(value, required, allowed, label) {
    assertObject(value, label);
    const allowedFields = new Set(allowed);
    for (const field of required) invariant(Object.hasOwn(value, field), `${label} lacks ${field}`);
    for (const field of Object.keys(value)) {
        invariant(allowedFields.has(field), `${label} contains unknown field ${field}`);
    }
}

function assertArray(value, label) {
    invariant(Array.isArray(value), `${label} must be an array`);
}

function assertString(value, label) {
    invariant(typeof value === "string" && value.length > 0, `${label} must be non-empty text`);
}

function assertId(value, label) {
    invariant(typeof value === "string" && CANONICAL_ID.test(value), `${label} is not canonical`);
}

function assertInteger(value, minimum, label) {
    invariant(
        Number.isSafeInteger(value) && value >= minimum,
        `${label} must be an integer >= ${minimum}`,
    );
}

function assertHash(value, label) {
    invariant(typeof value === "string" && SHA256.test(value), `${label} must be lowercase SHA-256`);
}

function exactUnique(values, label) {
    invariant(new Set(values).size === values.length, `${label} contains duplicates`);
}

function equalSet(actual, expected) {
    return actual.size === expected.size && [...actual].every((entry) => expected.has(entry));
}

function utf8Compare(left, right) {
    return Buffer.from(left, "utf8").compare(Buffer.from(right, "utf8"));
}

export function canonicalJson(value) {
    if (value === null || typeof value === "boolean" || typeof value === "string") {
        return JSON.stringify(value);
    }
    if (typeof value === "number") {
        invariant(Number.isFinite(value), "JCS rejects non-finite numbers");
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
    assertObject(value, "JCS value");
    return `{${Object.keys(value)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
        .join(",")}}`;
}

export function domainHash(domain, value) {
    return createHash("sha256")
        .update(Buffer.from(domain, "utf8"))
        .update(Buffer.from([0]))
        .update(Buffer.from(canonicalJson(value), "utf8"))
        .digest("hex");
}

function decodeStrictUtf8(bytes, label) {
    invariant(bytes instanceof Uint8Array, `${label} bytes must be Uint8Array`);
    try {
        return new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/u, "");
    } catch (error) {
        throw new Error(`${label} is not valid UTF-8: ${error.message}`);
    }
}

function rejectDuplicateJsonMembers(text, label) {
    let cursor = 0;
    const fail = (message) => {
        throw new Error(`${label} is not strict JSON at offset ${cursor}: ${message}`);
    };
    const whitespace = () => {
        while (/[\u0009\u000a\u000d\u0020]/u.test(text[cursor] ?? "")) cursor += 1;
    };
    const stringToken = () => {
        if (text[cursor] !== '"') fail("expected string");
        const start = cursor;
        cursor += 1;
        while (cursor < text.length) {
            const character = text[cursor];
            if (character === '"') {
                cursor += 1;
                try {
                    return JSON.parse(text.slice(start, cursor));
                } catch (error) {
                    fail(`invalid string: ${error.message}`);
                }
            }
            if (character === "\\") {
                cursor += 1;
                const escape = text[cursor];
                if (escape === "u") {
                    const hex = text.slice(cursor + 1, cursor + 5);
                    if (!/^[a-fA-F0-9]{4}$/u.test(hex)) fail("invalid unicode escape");
                    cursor += 5;
                    continue;
                }
                if (!['"', "\\", "/", "b", "f", "n", "r", "t"].includes(escape)) {
                    fail("invalid escape");
                }
                cursor += 1;
                continue;
            }
            if (character.codePointAt(0) <= 0x1f) fail("unescaped control character");
            cursor += 1;
        }
        fail("unterminated string");
    };
    const literal = (expected) => {
        if (!text.startsWith(expected, cursor)) fail(`expected ${expected}`);
        cursor += expected.length;
    };
    const number = () => {
        const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u.exec(text.slice(cursor));
        if (!match) fail("invalid number");
        cursor += match[0].length;
    };
    const value = () => {
        whitespace();
        const character = text[cursor];
        if (character === "{") {
            cursor += 1;
            whitespace();
            const keys = new Set();
            if (text[cursor] === "}") {
                cursor += 1;
                return;
            }
            while (cursor < text.length) {
                whitespace();
                const key = stringToken();
                if (keys.has(key)) fail(`duplicate object member ${JSON.stringify(key)}`);
                keys.add(key);
                whitespace();
                if (text[cursor] !== ":") fail("expected colon");
                cursor += 1;
                value();
                whitespace();
                if (text[cursor] === "}") {
                    cursor += 1;
                    return;
                }
                if (text[cursor] !== ",") fail("expected comma or object close");
                cursor += 1;
            }
            fail("unterminated object");
        }
        if (character === "[") {
            cursor += 1;
            whitespace();
            if (text[cursor] === "]") {
                cursor += 1;
                return;
            }
            while (cursor < text.length) {
                value();
                whitespace();
                if (text[cursor] === "]") {
                    cursor += 1;
                    return;
                }
                if (text[cursor] !== ",") fail("expected comma or array close");
                cursor += 1;
            }
            fail("unterminated array");
        }
        if (character === '"') return void stringToken();
        if (character === "t") return literal("true");
        if (character === "f") return literal("false");
        if (character === "n") return literal("null");
        number();
    };
    whitespace();
    value();
    whitespace();
    if (cursor !== text.length) fail("trailing content");
}

export function parseStrictJsonBytes(bytes, label = "acceptance ledger") {
    const text = decodeStrictUtf8(bytes, label);
    rejectDuplicateJsonMembers(text, label);
    try {
        return JSON.parse(text);
    } catch (error) {
        throw new Error(`${label} is not valid JSON: ${error.message}`);
    }
}

function sameFileStat(left, right) {
    return ["dev", "ino", "size", "mtimeNs", "ctimeNs"].every(
        (field) => left[field] === right[field],
    );
}

export async function readPhysicalLedger(file) {
    const label = "acceptance ledger";
    const lexical = path.resolve(file);
    const metadata = await lstat(lexical, { bigint: true });
    invariant(metadata.isFile() && !metadata.isSymbolicLink(), `${label} is not a physical file`);
    invariant(metadata.nlink === 1n, `${label} must have exactly one physical link`);
    invariant(
        metadata.size > 0n && metadata.size <= BigInt(MAX_DOCUMENT_BYTES),
        `${label} has an invalid byte size`,
    );
    const physical = await realpath(lexical);
    const noFollow = process.platform === "win32" ? 0 : (fsConstants.O_NOFOLLOW ?? 0);
    const handle = await open(lexical, fsConstants.O_RDONLY | noFollow);
    try {
        const before = await handle.stat({ bigint: true });
        invariant(
            before.isFile() && before.nlink === 1n && sameFileStat(metadata, before),
            `${label} changed before open`,
        );
        const bytes = await handle.readFile();
        const after = await handle.stat({ bigint: true });
        invariant(sameFileStat(before, after), `${label} changed while being read`);
        const current = await lstat(lexical, { bigint: true });
        invariant(
            current.isFile() &&
                !current.isSymbolicLink() &&
                current.nlink === 1n &&
                sameFileStat(after, current) &&
                (await realpath(lexical)) === physical,
            `${label} identity changed while being read`,
        );
        return parseStrictJsonBytes(bytes, label);
    } finally {
        await handle.close();
    }
}

function assertDag(adjacency, label) {
    const visiting = new Set();
    const visited = new Set();
    function visit(id, trail) {
        invariant(!visiting.has(id), `${label} cycle: ${[...trail, id].join(" -> ")}`);
        if (visited.has(id)) return;
        visiting.add(id);
        for (const dependency of adjacency.get(id) ?? []) visit(dependency, [...trail, id]);
        visiting.delete(id);
        visited.add(id);
    }
    for (const id of adjacency.keys()) visit(id, []);
}

export function computeProgramSetRoot(ledger, setKind, members) {
    const ordered = [...members].sort(utf8Compare);
    return domainHash(`solguard:program-set:${setKind}:v1`, {
        schema_version: "solguard-canonical-set-commitment.v1",
        program_id: ledger.program_id,
        program_version: ledger.program_version,
        subject: "program",
        set_kind: setKind,
        member_count: ordered.length,
        members: ordered,
    });
}

export function computeProgramDagRoot(ledgerDocument) {
    const ledger = structuredClone(ledgerDocument);
    const nodes = ledger.nodes
        .map((node) => ({
            id: node.id,
            kind: node.kind,
            owner: node.owner,
            node_version: node.node_version,
            evidence_mode: node.evidence_mode ?? null,
            dependencies: node.dependencies,
            formula: node.formula,
            required_contribution_ids: node.required_contribution_ids ?? [],
            closure_domain_id: node.closure_domain_id,
        }))
        .sort((left, right) => utf8Compare(left.id, right.id));
    const contributions = ledger.contributions
        .map((entry) => ({
            contribution_id: entry.contribution_id,
            contribution_version: entry.contribution_version,
            parent_primary_id: entry.parent_primary_id,
            parent_primary_ids: entry.parent_primary_ids,
            integration_gate: entry.integration_gate,
            declared_parent_id: entry.declared_parent_id,
            owner_repo: entry.owner_repo,
            dependencies: entry.dependencies,
            hard_contribution_dependencies: entry.hard_contribution_dependencies,
            closure_domain_id: entry.closure_domain_id,
        }))
        .sort((left, right) => utf8Compare(left.contribution_id, right.contribution_id));
    return domainHash("solguard/acceptance-ledger-program-dag/v1", {
        program_id: ledger.program_id,
        program_version: ledger.program_version,
        nodes,
        contributions,
    });
}

function validateDescriptor(document, label) {
    assertClosedObject(
        document,
        ["schema", "profile", "closed", "required", "forbidden"],
        ["schema", "profile", "closed", "required", "forbidden", "cardinality"],
        label,
    );
    invariant(document.closed === true, `${label} must be closed`);
    assertArray(document.required, `${label}.required`);
    assertArray(document.forbidden, `${label}.forbidden`);
    exactUnique(document.required, `${label}.required`);
    exactUnique(document.forbidden, `${label}.forbidden`);
}

function validateVerifierDescriptor(document, label) {
    assertClosedObject(
        document,
        ["type"],
        [
            "type",
            "separation",
            "required_verdict",
            "forbidden",
            "forbidden_role_overlap",
            "implementation_gate",
            "independent_receipt_required",
            "required_verifier_role",
        ],
        label,
    );
    assertString(document.type, `${label}.type`);
}

function validatePredicate(document, label) {
    assertClosedObject(
        document,
        ["type", "reference", "must_hold"],
        [
            "type",
            "reference",
            "criteria_id",
            "criteria_locator",
            "gate",
            "scope_id",
            "operational",
            "must_hold",
        ],
        label,
    );
    assertArray(document.must_hold, `${label}.must_hold`);
    exactUnique(document.must_hold, `${label}.must_hold`);
}

function validateAcceptedImplementationRef(reference, label) {
    assertObject(reference, label);
    if (reference.kind === "commit_sha") {
        const fields = ["kind", "commit_sha", "repository_tree_sha", "publication_receipt_root"];
        assertClosedObject(reference, fields, fields, label);
        invariant(GIT_SHA1.test(reference.commit_sha), `${label}.commit_sha must be lowercase SHA-1`);
        invariant(
            GIT_SHA1.test(reference.repository_tree_sha),
            `${label}.repository_tree_sha must be lowercase SHA-1`,
        );
        assertHash(reference.publication_receipt_root, `${label}.publication_receipt_root`);
        return;
    }
    invariant(reference.kind === "absence_tree_receipt", `${label}.kind is unsupported`);
    const fields = ["kind", "absence_tree_digest", "bounded_inventory_root", "absence_receipt_root"];
    assertClosedObject(reference, fields, fields, label);
    for (const field of fields.slice(1)) assertHash(reference[field], `${label}.${field}`);
}

function validateAcceptance(acceptance, state, label, contribution = false) {
    assertClosedObject(acceptance, ACCEPTANCE_REQUIRED, ACCEPTANCE_ALLOWED, `${label}.acceptance`);
    assertArray(acceptance.reopened_by, `${label}.acceptance.reopened_by`);
    const roots = [acceptance.evidence_root, acceptance.verifier_root, acceptance.dependency_state_hash];
    if (state === "pending") {
        invariant(
            roots.every((value) => value === null) &&
                acceptance.accepted_ledger_revision === null &&
                acceptance.reopened_by.length === 0,
            `${label} pending acceptance contains materialized state`,
        );
        if (contribution) {
            invariant(
                acceptance.accepted_implementation_ref === null,
                `${label} pending contribution contains an implementation ref`,
            );
        }
        return;
    }
    invariant(
        roots.every((value) => typeof value === "string" && SHA256.test(value)),
        `${label} accepted or terminal state lacks immutable roots`,
    );
    assertInteger(acceptance.accepted_ledger_revision, 0, `${label}.accepted_ledger_revision`);
    if (state === "reopened") {
        invariant(acceptance.reopened_by.length > 0, `${label} reopened state lacks history`);
    }
    if (contribution) {
        validateAcceptedImplementationRef(
            acceptance.accepted_implementation_ref,
            `${label}.accepted_implementation_ref`,
        );
    }
}

function validateDerivedAcceptance(acceptance, label) {
    assertClosedObject(acceptance, ACCEPTANCE_REQUIRED, ACCEPTANCE_ALLOWED, `${label}.acceptance`);
    assertArray(acceptance.reopened_by, `${label}.acceptance.reopened_by`);
    invariant(acceptance.reopened_by.length === 0, `${label} derived acceptance has reopen history`);
    for (const [field, value] of Object.entries(acceptance)) {
        if (field !== "reopened_by") {
            invariant(value === null, `${label} derived acceptance contains materialized state`);
        }
    }
}

function validateDependency(dependency, nodes, label) {
    assertClosedObject(dependency, ["id", "type"], DEPENDENCY_ALLOWED, label);
    assertId(dependency.id, `${label}.id`);
    assertString(dependency.type, `${label}.type`);
    invariant(nodes.has(dependency.id), `${label} references missing node ${dependency.id}`);
    if (dependency.type === "contract") {
        assertString(dependency.contract_id, `${label}.contract_id`);
        assertString(dependency.contract_version, `${label}.contract_version`);
        invariant(
            dependency.contract_version === dependency.contract_id.match(/\.(v\d+)$/u)?.[1],
            `${label} contract version drifted`,
        );
    } else {
        invariant(
            !Object.hasOwn(dependency, "contract_id") &&
                !Object.hasOwn(dependency, "contract_version"),
            `${label} non-contract edge contains contract identity`,
        );
    }
}

function nodeReady(node) {
    return node?.kind === "primary"
        ? node.state === "accepted"
        : node?.computed_state === "satisfied";
}

function validateGenesis(ledger, nodes, contributions) {
    const fields = [
        "operation",
        "atomic",
        "prior_state",
        "evaluation_state",
        "genesis_contribution_set",
        "genesis_node_set",
        "topological_order",
        "failure_semantics",
        "forbidden",
    ];
    const genesis = ledger.genesis_batch;
    assertClosedObject(genesis, fields, fields, "genesis batch");
    invariant(
        genesis.operation === "genesis_batch" && genesis.atomic === true,
        "genesis batch mode drifted",
    );
    for (const field of [
        "genesis_contribution_set",
        "genesis_node_set",
        "topological_order",
        "forbidden",
    ]) {
        assertArray(genesis[field], `genesis.${field}`);
        exactUnique(genesis[field], `genesis.${field}`);
    }
    const members = new Set([...genesis.genesis_contribution_set, ...genesis.genesis_node_set]);
    invariant(
        equalSet(new Set(genesis.topological_order), members),
        "genesis topological order must contain the exact member union",
    );
    for (const id of genesis.genesis_contribution_set) {
        invariant(contributions.has(id), `genesis contribution ${id} is missing`);
    }
    for (const id of genesis.genesis_node_set) {
        const node = nodes.get(id);
        invariant(
            node?.kind === "primary" && node.evidence_mode === "bootstrap",
            `${id} is not a bootstrap primary`,
        );
    }
    const position = new Map(genesis.topological_order.map((id, index) => [id, index]));
    const requireEarlier = (consumer, producer) => {
        if (!position.has(producer)) return;
        invariant(position.get(producer) < position.get(consumer), `${producer} must precede ${consumer} in genesis`);
    };
    for (const id of genesis.genesis_contribution_set) {
        const entry = contributions.get(id);
        for (const dependency of entry.dependencies) requireEarlier(id, dependency.id);
        for (const dependency of entry.hard_contribution_dependencies) {
            requireEarlier(id, dependency.contribution_id);
        }
    }
    for (const id of genesis.genesis_node_set) {
        const node = nodes.get(id);
        for (const dependency of node.dependencies) requireEarlier(id, dependency.id);
        for (const contributionId of node.required_contribution_ids) requireEarlier(id, contributionId);
    }
}

function validateTransitionContract(ledger) {
    const transition = ledger.transition_contract;
    assertObject(transition, "transition contract");
    invariant(transition.closed === true, "transition contract must be closed");
    invariant(
        equalSet(new Set(Object.keys(transition.operations ?? {})), new Set(EVENT_OPERATIONS)),
        "transition operation union drifted",
    );
    invariant(
        equalSet(new Set(transition.common_event_required ?? []), new Set(EVENT_FIELDS)),
        "common event required fields drifted",
    );
    invariant(
        transition.commit_receipt?.schema === "solguard-acceptance-ledger-commit-receipt.v1",
        "commit receipt schema drifted",
    );
    invariant(
        ledger.linearizability_contract?.schema ===
            "solguard-acceptance-ledger-linearizability.v1",
        "linearizability schema drifted",
    );
    invariant(
        transition.operations.materialize_derived?.writes_state === false &&
            transition.operations.materialize_derived?.receipt_only === true,
        "materialize_derived must remain receipt-only",
    );
}

function validateAllowedStates(allowed) {
    const fields = [
        "implementation_primary_and_contribution",
        "operational_primary",
        "derived_computed",
    ];
    assertClosedObject(allowed, fields, fields, "allowed states");
    invariant(
        canonicalJson(allowed.implementation_primary_and_contribution) ===
            canonicalJson(IMPLEMENTATION_STATES),
        "implementation state union drifted",
    );
    invariant(
        canonicalJson(allowed.operational_primary) === canonicalJson(OPERATIONAL_STATES),
        "operational state union drifted",
    );
    invariant(
        canonicalJson(allowed.derived_computed) === canonicalJson(DERIVED_STATES),
        "derived state union drifted",
    );
}

function validateExpectations(ledger, expectations) {
    const allowed = new Set([
        "programId",
        "programVersion",
        "ledgerRevision",
        "idSetRoot",
        "programDagRoot",
    ]);
    for (const field of Object.keys(expectations)) {
        invariant(allowed.has(field), `unknown ledger expectation ${field}`);
    }
    const checks = [
        ["programId", ledger.program_id, "program ID"],
        ["programVersion", ledger.program_version, "program version"],
        ["ledgerRevision", ledger.ledger_revision, "ledger revision"],
        ["idSetRoot", ledger.id_set_sha256, "ID-set root"],
    ];
    for (const [field, actual, label] of checks) {
        if (Object.hasOwn(expectations, field)) {
            invariant(actual === expectations[field], `${label} does not match the trusted expectation`);
        }
    }
    if (Object.hasOwn(expectations, "programDagRoot")) {
        invariant(
            computeProgramDagRoot(ledger) === expectations.programDagRoot,
            "program DAG root does not match the trusted expectation",
        );
    }
}

export function validateAcceptanceLedgerForView(document, expectations = {}) {
    const ledger = structuredClone(document);
    assertClosedObject(ledger, LEDGER_FIELDS, LEDGER_FIELDS, "acceptance ledger");
    invariant(
        ledger.schema_version === "solguard-acceptance-ledger.v1",
        "ledger schema version drifted",
    );
    assertId(ledger.program_id, "ledger.program_id");
    assertId(ledger.program_version, "ledger.program_version");
    assertInteger(ledger.ledger_revision, 0, "ledger.ledger_revision");
    assertString(ledger.generated_view, "ledger.generated_view");
    invariant(ledger.id_set_hash_algorithm === ID_SET_ALGORITHM, "ledger ID-set algorithm drifted");
    validateAllowedStates(ledger.allowed_states);
    assertArray(ledger.nodes, "ledger.nodes");
    assertArray(ledger.contributions, "ledger.contributions");
    invariant(ledger.nodes.length > 0, "ledger.nodes must not be empty");
    invariant(ledger.contributions.length > 0, "ledger.contributions must not be empty");
    assertObject(ledger.meta_states, "ledger.meta_states");

    const nodes = new Map(ledger.nodes.map((node) => [node.id, node]));
    const contributions = new Map(
        ledger.contributions.map((entry) => [entry.contribution_id, entry]),
    );
    invariant(nodes.size === ledger.nodes.length, "duplicate node IDs");
    invariant(contributions.size === ledger.contributions.length, "duplicate contribution IDs");
    for (const id of nodes.keys()) {
        invariant(!contributions.has(id), `node/contribution ID collision: ${id}`);
    }

    const nodeAdjacency = new Map();
    for (const node of ledger.nodes) {
        assertObject(node, "ledger node");
        invariant(["primary", "derived"].includes(node.kind), `${node.id ?? "node"} has an invalid kind`);
        const required = node.kind === "primary" ? PRIMARY_REQUIRED : DERIVED_REQUIRED;
        const allowed = node.kind === "primary" ? PRIMARY_ALLOWED : DERIVED_ALLOWED;
        assertClosedObject(node, required, allowed, `node ${node.id}`);
        assertId(node.id, "node.id");
        invariant(node.counted === true, `${node.id} must be counted`);
        assertInteger(node.node_version, 1, `${node.id}.node_version`);
        invariant(typeof node.operational === "boolean", `${node.id}.operational must be boolean`);
        assertArray(node.dependencies, `${node.id}.dependencies`);
        exactUnique(
            node.dependencies.map((dependency) => canonicalJson(dependency)),
            `${node.id} dependencies`,
        );
        validatePredicate(node.predicate, `${node.id}.predicate`);
        validateDescriptor(node.evidence_descriptor, `${node.id}.evidence_descriptor`);
        validateVerifierDescriptor(node.verifier_descriptor, `${node.id}.verifier_descriptor`);
        assertClosedObject(
            node.acceptance,
            ACCEPTANCE_REQUIRED,
            ACCEPTANCE_ALLOWED,
            `${node.id}.acceptance`,
        );
        const dependencyIds = [];
        for (const [index, dependency] of node.dependencies.entries()) {
            validateDependency(dependency, nodes, `${node.id}.dependencies[${index}]`);
            dependencyIds.push(dependency.id);
        }
        nodeAdjacency.set(node.id, dependencyIds);

        if (node.kind === "primary") {
            assertString(node.owner, `${node.id}.owner`);
            assertString(node.evidence_mode, `${node.id}.evidence_mode`);
            const states = node.operational ? OPERATIONAL_STATES : IMPLEMENTATION_STATES;
            invariant(states.includes(node.state), `${node.id} has an invalid explicit state`);
            invariant(node.formula === null, `${node.id} primary formula must be null`);
            assertArray(node.required_contribution_ids, `${node.id}.required_contribution_ids`);
            exactUnique(node.required_contribution_ids, `${node.id}.required_contribution_ids`);
            validateAcceptance(node.acceptance, node.state, node.id);
            for (const contributionId of node.required_contribution_ids) {
                invariant(
                    contributions.get(contributionId)?.parent_primary_id === node.id,
                    `${node.id} reverse contribution ${contributionId} drifted`,
                );
            }
        } else {
            invariant(node.owner === null, `${node.id} derived owner must be null`);
            validateDerivedAcceptance(node.acceptance, node.id);
            const formulaFields = ["op", "operands"];
            assertClosedObject(node.formula, formulaFields, formulaFields, `${node.id}.formula`);
            invariant(node.formula.op === "AND", `${node.id} formula operation drifted`);
            assertArray(node.formula.operands, `${node.id}.formula.operands`);
            exactUnique(node.formula.operands, `${node.id}.formula.operands`);
            const hardDependencies = node.dependencies.map((dependency) => dependency.id);
            invariant(
                node.dependencies.every((dependency) => dependency.type === "hard") &&
                    canonicalJson(hardDependencies) === canonicalJson(node.formula.operands),
                `${node.id} formula/dependency order drifted`,
            );
            const expectedState = node.formula.operands.every((id) => nodeReady(nodes.get(id)))
                ? "satisfied"
                : "unsatisfied";
            invariant(
                node.computed_state === expectedState,
                `${node.id} derived state drifted: expected ${expectedState}`,
            );
            if (node.operational) {
                invariant(
                    node.materialization_operation === "materialize_derived",
                    `${node.id} operational derived lacks materialization operation`,
                );
            }
        }
    }
    assertDag(nodeAdjacency, "node DAG");

    const contributionAdjacency = new Map();
    for (const contribution of ledger.contributions) {
        assertClosedObject(
            contribution,
            CONTRIBUTION_REQUIRED,
            CONTRIBUTION_ALLOWED,
            `contribution ${contribution.contribution_id}`,
        );
        assertId(contribution.contribution_id, "contribution.contribution_id");
        invariant(
            contribution.kind === "contribution" && contribution.counted === true,
            `${contribution.contribution_id} kind drifted`,
        );
        invariant(contribution.operational === false, `${contribution.contribution_id} cannot be operational`);
        invariant(
            IMPLEMENTATION_STATES.includes(contribution.state),
            `${contribution.contribution_id} has an invalid explicit state`,
        );
        assertInteger(
            contribution.contribution_version,
            1,
            `${contribution.contribution_id}.contribution_version`,
        );
        assertString(contribution.owner_repo, `${contribution.contribution_id}.owner_repo`);
        assertArray(contribution.parent_primary_ids, `${contribution.contribution_id}.parent_primary_ids`);
        exactUnique(contribution.parent_primary_ids, `${contribution.contribution_id}.parent_primary_ids`);
        const parent = nodes.get(contribution.parent_primary_id);
        invariant(parent?.kind === "primary", `${contribution.contribution_id} parent is missing`);
        invariant(
            contribution.parent_primary_ids.includes(contribution.parent_primary_id),
            `${contribution.contribution_id} parent set omits canonical parent`,
        );
        assertArray(contribution.dependencies, `${contribution.contribution_id}.dependencies`);
        exactUnique(
            contribution.dependencies.map((dependency) => canonicalJson(dependency)),
            `${contribution.contribution_id} dependencies`,
        );
        for (const [index, dependency] of contribution.dependencies.entries()) {
            validateDependency(dependency, nodes, `${contribution.contribution_id}.dependencies[${index}]`);
        }
        assertArray(
            contribution.hard_contribution_dependencies,
            `${contribution.contribution_id}.hard_contribution_dependencies`,
        );
        const dependencyIds = [];
        for (const [index, dependency] of contribution.hard_contribution_dependencies.entries()) {
            const label = `${contribution.contribution_id}.hard_contribution_dependencies[${index}]`;
            const fields = [
                "contribution_id",
                "type",
                "ordering",
                "required_state",
                "publication_receipt",
                "publication_binding",
            ];
            assertClosedObject(dependency, fields, fields, label);
            invariant(contributions.has(dependency.contribution_id), `${label} references a missing contribution`);
            invariant(
                dependency.type === "hard_contribution" &&
                    ["hard", "publication"].includes(dependency.ordering) &&
                    dependency.required_state === "accepted" &&
                    dependency.publication_receipt === "required",
                `${label} policy drifted`,
            );
            dependencyIds.push(dependency.contribution_id);
        }
        exactUnique(dependencyIds, `${contribution.contribution_id} contribution dependencies`);
        contributionAdjacency.set(contribution.contribution_id, dependencyIds);
        validatePredicate(contribution.predicate, `${contribution.contribution_id}.predicate`);
        validateDescriptor(contribution.evidence_descriptor, `${contribution.contribution_id}.evidence_descriptor`);
        validateVerifierDescriptor(
            contribution.verifier_descriptor,
            `${contribution.contribution_id}.verifier_descriptor`,
        );
        validateAcceptance(
            contribution.acceptance,
            contribution.state,
            contribution.contribution_id,
            true,
        );
    }
    assertDag(contributionAdjacency, "contribution DAG");

    const nodeIds = [...nodes.keys()];
    const contributionIds = [...contributions.keys()];
    const allIds = [
        ...nodeIds.map((id) => `node:${id}`),
        ...contributionIds.map((id) => `contribution:${id}`),
    ];
    invariant(
        ledger.node_id_set_sha256 === computeProgramSetRoot(ledger, "node_id", nodeIds),
        "node ID-set root mismatch",
    );
    invariant(
        ledger.contribution_id_set_sha256 ===
            computeProgramSetRoot(ledger, "contribution_id", contributionIds),
        "contribution ID-set root mismatch",
    );
    const allRoot = computeProgramSetRoot(ledger, "all_counted_item_id", allIds);
    invariant(
        ledger.all_counted_item_id_set_sha256 === allRoot && ledger.id_set_sha256 === allRoot,
        "all-counted ID-set root mismatch",
    );
    const pinned = PINNED_PROGRAM_ROOTS.get(`${ledger.program_id}\0${ledger.program_version}`);
    if (pinned) {
        invariant(
            ledger.node_id_set_sha256 === pinned.node &&
                ledger.contribution_id_set_sha256 === pinned.contribution &&
                allRoot === pinned.all &&
                computeProgramDagRoot(ledger) === pinned.dag,
            "canonical program ID-set or DAG pins drifted",
        );
    }

    const primary = ledger.nodes.filter((node) => node.kind === "primary");
    const derived = ledger.nodes.filter((node) => node.kind === "derived");
    const counts = {
        primary_total: primary.length,
        primary_accepted: primary.filter((node) => node.state === "accepted").length,
        derived_total: derived.length,
        derived_satisfied: derived.filter((node) => node.computed_state === "satisfied").length,
        contribution_total: ledger.contributions.length,
        contribution_accepted: ledger.contributions.filter((entry) => entry.state === "accepted").length,
        operational_terminal_nonpass: primary.filter((node) => OPERATIONAL_NONPASS.has(node.state)).length,
        reopened:
            primary.filter((node) => node.state === "reopened").length +
            ledger.contributions.filter((entry) => entry.state === "reopened").length,
        counted_item_total: ledger.nodes.length + ledger.contributions.length,
    };
    invariant(canonicalJson(ledger.state_counts) === canonicalJson(counts), "ledger state counts drifted");
    validateGenesis(ledger, nodes, contributions);
    validateTransitionContract(ledger);
    validateExpectations(ledger, expectations);
    return Object.freeze({
        status: "passed",
        authoritative: LEDGER_VIEW_AUTHORITATIVE,
        writerEnabled: LEDGER_WRITER_ENABLED,
        programId: ledger.program_id,
        programVersion: ledger.program_version,
        ledgerRevision: ledger.ledger_revision,
        nodeCount: ledger.nodes.length,
        contributionCount: ledger.contributions.length,
        idSetRoot: ledger.id_set_sha256,
        programDagRoot: computeProgramDagRoot(ledger),
    });
}

function mdCell(value) {
    return String(value).replaceAll("|", "\\|").replace(/[\r\n]+/gu, " ");
}

function mdCode(value) {
    const text = String(value);
    invariant(!text.includes("`"), "Markdown view refuses backticks in code values");
    return `\`${mdCell(text)}\``;
}

function acceptanceMaterial(item) {
    if (item.state === "pending") return "none";
    return [
        `revision ${item.acceptance.accepted_ledger_revision}`,
        `evidence ${item.acceptance.evidence_root}`,
        `verifier ${item.acceptance.verifier_root}`,
    ].join("; ");
}

function implementationReference(contribution) {
    const reference = contribution.acceptance.accepted_implementation_ref;
    if (reference === null) return "none";
    if (reference.kind === "commit_sha") return `commit ${reference.commit_sha}`;
    return `absence receipt ${reference.absence_receipt_root}`;
}

export function renderAcceptanceLedgerMarkdown(document, expectations = {}) {
    const ledger = structuredClone(document);
    const validation = validateAcceptanceLedgerForView(ledger, expectations);
    const primary = ledger.nodes
        .filter((node) => node.kind === "primary")
        .sort((left, right) => utf8Compare(left.id, right.id));
    const derived = ledger.nodes
        .filter((node) => node.kind === "derived")
        .sort((left, right) => utf8Compare(left.id, right.id));
    const contributions = [...ledger.contributions].sort((left, right) =>
        utf8Compare(left.contribution_id, right.contribution_id),
    );
    const lines = [
        "<!-- Generated read-only view. The acceptance ledger JSON remains authoritative. -->",
        "# Acceptance ledger state - non-authoritative view",
        "",
        "> **Warning:** this Markdown does not grant, infer, reopen or revoke acceptance. It only renders explicit state from a validated ledger snapshot. Git commits, branches, pull requests and planned subjects are not acceptance evidence.",
        "",
        `- Schema: ${mdCode(ledger.schema_version)}`,
        `- Program: ${mdCode(ledger.program_id)}`,
        `- Program version: ${mdCode(ledger.program_version)}`,
        `- Ledger revision: ${mdCode(ledger.ledger_revision)}`,
        `- Counted ID-set root: ${mdCode(ledger.id_set_sha256)}`,
        `- Program DAG root: ${mdCode(validation.programDagRoot)}`,
        `- View authority: ${mdCode("false")}`,
        `- Writer enabled: ${mdCode("false")}`,
        "",
        "## State summary",
        "",
        "| Kind | Total | Accepted or satisfied | Pending or unsatisfied | Reopened | Terminal non-pass |",
        "| --- | ---: | ---: | ---: | ---: | ---: |",
        `| Primary | ${ledger.state_counts.primary_total} | ${ledger.state_counts.primary_accepted} | ${primary.filter((node) => node.state === "pending").length} | ${primary.filter((node) => node.state === "reopened").length} | ${ledger.state_counts.operational_terminal_nonpass} |`,
        `| Derived | ${ledger.state_counts.derived_total} | ${ledger.state_counts.derived_satisfied} | ${derived.filter((node) => node.computed_state === "unsatisfied").length} | 0 | 0 |`,
        `| Contribution | ${ledger.state_counts.contribution_total} | ${ledger.state_counts.contribution_accepted} | ${contributions.filter((entry) => entry.state === "pending").length} | ${contributions.filter((entry) => entry.state === "reopened").length} | 0 |`,
        "",
        "## Primary nodes",
        "",
        "| ID | Owner | Evidence mode | Explicit ledger state | Acceptance material |",
        "| --- | --- | --- | --- | --- |",
    ];
    for (const node of primary) {
        lines.push(
            `| ${mdCode(node.id)} | ${mdCode(node.owner)} | ${mdCode(node.evidence_mode)} | ${mdCode(node.state)} | ${mdCell(acceptanceMaterial(node))} |`,
        );
    }
    lines.push(
        "",
        "## Derived nodes",
        "",
        "| ID | Formula | Operands | Recomputed state |",
        "| --- | --- | --- | --- |",
    );
    for (const node of derived) {
        lines.push(
            `| ${mdCode(node.id)} | ${mdCode(node.formula.op)} | ${node.formula.operands.map(mdCode).join("<br>")} | ${mdCode(node.computed_state)} |`,
        );
    }
    lines.push(
        "",
        "## Contributions",
        "",
        "| ID | Owner repository | Parent | Explicit ledger state | Accepted implementation reference | Acceptance material |",
        "| --- | --- | --- | --- | --- | --- |",
    );
    for (const contribution of contributions) {
        lines.push(
            `| ${mdCode(contribution.contribution_id)} | ${mdCode(contribution.owner_repo)} | ${mdCode(contribution.parent_primary_id)} | ${mdCode(contribution.state)} | ${mdCell(implementationReference(contribution))} | ${mdCell(acceptanceMaterial(contribution))} |`,
        );
    }
    lines.push(
        "",
        "## Interpretation boundary",
        "",
        "Only the machine-readable ledger and valid signed transitions can carry acceptance authority. This generated Markdown is disposable and must not be edited as a substitute for a ledger transition.",
        "",
    );
    return lines.join("\n");
}

function parseArguments(argv) {
    const options = { expectations: {} };
    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];
        const value = argv[index + 1];
        if (argument === "--ledger") options.ledger = value;
        else if (argument === "--expect-program-id") options.expectations.programId = value;
        else if (argument === "--expect-program-version") options.expectations.programVersion = value;
        else if (argument === "--expect-revision") {
            invariant(/^\d+$/u.test(value ?? ""), "--expect-revision requires a non-negative integer");
            options.expectations.ledgerRevision = Number(value);
        } else if (argument === "--expect-id-set-root") options.expectations.idSetRoot = value;
        else if (argument === "--expect-program-dag-root") options.expectations.programDagRoot = value;
        else throw new Error(`unknown or forbidden argument ${argument}; C0-014 is read-only`);
        invariant(value && !value.startsWith("--"), `${argument} requires a value`);
        index += 1;
    }
    invariant(options.ledger, "--ledger is required");
    if (Object.hasOwn(options.expectations, "idSetRoot")) {
        assertHash(options.expectations.idSetRoot, "expected ID-set root");
    }
    if (Object.hasOwn(options.expectations, "programDagRoot")) {
        assertHash(options.expectations.programDagRoot, "expected program DAG root");
    }
    return options;
}

async function main() {
    const options = parseArguments(process.argv.slice(2));
    const ledger = await readPhysicalLedger(options.ledger);
    process.stdout.write(renderAcceptanceLedgerMarkdown(ledger, options.expectations));
}

const invokedAsScript =
    process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedAsScript) {
    main().catch((error) => {
        process.stderr.write(`${error.stack ?? error.message}\n`);
        process.exitCode = 1;
    });
}
