import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { link, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
    ACCEPTANCE_LEDGER_READER_PINS,
    LEDGER_VIEW_AUTHORITATIVE,
    LEDGER_WRITER_ENABLED,
    canonicalJson,
    readPhysicalLedger,
    renderAcceptanceLedgerMarkdown,
    validateAcceptanceLedgerForView,
} from "./acceptance-ledger-markdown.mjs";

const readerRoot = path.dirname(fileURLToPath(import.meta.url));
const taskRoot = path.resolve(readerRoot, "..");
const docsRoot = path.resolve(taskRoot, "..", "..", "..");
const reader = path.join(readerRoot, "acceptance-ledger-markdown.mjs");
const ledgerFile = path.join(taskRoot, "acceptance-ledger.v1.json");
const ledgerPromise = readFile(ledgerFile, "utf8").then(JSON.parse);

async function freshLedger() {
    return structuredClone(await ledgerPromise);
}

function acceptContribution(ledger, contributionId) {
    const contribution = ledger.contributions.find(
        (entry) => entry.contribution_id === contributionId,
    );
    contribution.state = "accepted";
    contribution.acceptance = {
        evidence_root: "1".repeat(64),
        verifier_root: "2".repeat(64),
        accepted_ledger_revision: 1,
        dependency_state_hash: "3".repeat(64),
        accepted_implementation_ref: {
            kind: "commit_sha",
            commit_sha: "a".repeat(40),
            repository_tree_sha: "b".repeat(40),
            publication_receipt_root: "4".repeat(64),
        },
        reopened_by: [],
    };
    ledger.ledger_revision = 1;
    ledger.state_counts.contribution_accepted += 1;
    return contribution;
}

test("C0-014 pins C0-012 and C0-013 while keeping all authority and writes off", () => {
    assert.equal(LEDGER_VIEW_AUTHORITATIVE, false);
    assert.equal(LEDGER_WRITER_ENABLED, false);
    assert.deepEqual(ACCEPTANCE_LEDGER_READER_PINS, {
        schemaPublisher: {
            repository: "solguard-agents",
            taskId: "C0-012",
            commit: "f093848824173f6c5cdb1a7a89dd4acbe5d90ab2",
        },
        validatingReader: {
            repository: "solguard-deploy",
            taskId: "C0-013",
            commit: "36ca97b6f8117df77039eea397763b5a3a35a310",
        },
    });
});

test("the runtime reader contains no filesystem write primitive", async () => {
    const source = await readFile(reader, "utf8");
    assert.doesNotMatch(
        source,
        /\b(?:appendFile|copyFile|createWriteStream|mkdir|rename|rm|unlink|writeFile)\b/u,
    );
    assert.doesNotMatch(source, /\bO_(?:APPEND|CREAT|TRUNC|WRONLY)\b/u);
});

test("the frozen central ledger validates and renders deterministically without checkboxes", async () => {
    const ledger = await freshLedger();
    const before = canonicalJson(ledger);
    const validation = validateAcceptanceLedgerForView(ledger);
    assert.deepEqual(
        {
            status: validation.status,
            authoritative: validation.authoritative,
            writerEnabled: validation.writerEnabled,
            ledgerRevision: validation.ledgerRevision,
            nodeCount: validation.nodeCount,
            contributionCount: validation.contributionCount,
        },
        {
            status: "passed",
            authoritative: false,
            writerEnabled: false,
            ledgerRevision: 0,
            nodeCount: 568,
            contributionCount: 1103,
        },
    );
    const first = renderAcceptanceLedgerMarkdown(ledger);
    const second = renderAcceptanceLedgerMarkdown(ledger);
    assert.equal(first, second);
    assert.equal(canonicalJson(ledger), before);
    assert.match(first, /this Markdown does not grant, infer, reopen or revoke acceptance/u);
    assert.match(first, /\| `C0-014` \| `solguard-docs` \| `LEDGER-001` \| `pending` \| none \| none \|/u);
    assert.doesNotMatch(first, /\[[ xX]\]/u);
    assert.ok(first.endsWith("\n"));
});

test("commit and publication-looking metadata never promotes a pending contribution", async () => {
    const ledger = await freshLedger();
    const contribution = ledger.contributions.find((entry) => entry.contribution_id === "C0-014");
    contribution.expected_commit.commit_sha = "a".repeat(40);
    contribution.expected_commit.pull_request_merged = true;
    contribution.expected_commit.publication_receipt_root = "4".repeat(64);
    const markdown = renderAcceptanceLedgerMarkdown(ledger);
    assert.match(markdown, /\| `C0-014` \| `solguard-docs` \| `LEDGER-001` \| `pending` \| none \| none \|/u);
    assert.doesNotMatch(markdown, /pull_request_merged|planned_subject/u);
});

test("accepted is rendered only when the explicit state carries immutable acceptance material", async () => {
    const ledger = await freshLedger();
    acceptContribution(ledger, "C0-014");
    const markdown = renderAcceptanceLedgerMarkdown(ledger);
    assert.match(
        markdown,
        /\| `C0-014` \| `solguard-docs` \| `LEDGER-001` \| `accepted` \| commit a{40} \| revision 1; evidence 1{64}; verifier 2{64} \|/u,
    );

    const forged = await freshLedger();
    forged.contributions.find((entry) => entry.contribution_id === "C0-014").state = "accepted";
    forged.state_counts.contribution_accepted = 1;
    assert.throws(
        () => renderAcceptanceLedgerMarkdown(forged),
        /accepted or terminal state lacks immutable roots/u,
    );

    const forgedDerived = await freshLedger();
    forgedDerived.nodes.find((node) => node.kind === "derived").acceptance.evidence_root =
        "5".repeat(64);
    assert.throws(
        () => renderAcceptanceLedgerMarkdown(forgedDerived),
        /derived acceptance contains materialized state/u,
    );
});

test("future, tampered, count-drifted and formula-drifted ledgers fail closed", async (context) => {
    await context.test("future schema", async () => {
        const ledger = await freshLedger();
        ledger.schema_version = "solguard-acceptance-ledger.v2";
        assert.throws(() => validateAcceptanceLedgerForView(ledger), /schema version drifted/u);
    });
    await context.test("unknown top-level field", async () => {
        const ledger = await freshLedger();
        ledger.unregistered_future_field = true;
        assert.throws(() => validateAcceptanceLedgerForView(ledger), /unknown field/u);
    });
    await context.test("state count drift", async () => {
        const ledger = await freshLedger();
        ledger.state_counts.contribution_accepted = 1;
        assert.throws(() => validateAcceptanceLedgerForView(ledger), /state counts drifted/u);
    });
    await context.test("ID-set root drift", async () => {
        const ledger = await freshLedger();
        ledger.id_set_sha256 = "0".repeat(64);
        assert.throws(() => validateAcceptanceLedgerForView(ledger), /ID-set root mismatch/u);
    });
    await context.test("derived formula result drift", async () => {
        const ledger = await freshLedger();
        const derived = ledger.nodes.find((node) => node.kind === "derived");
        derived.computed_state = "satisfied";
        ledger.state_counts.derived_satisfied = 1;
        assert.throws(() => validateAcceptanceLedgerForView(ledger), /derived state drifted/u);
    });
});

test("trusted expectations reject a stale or substituted snapshot", async () => {
    const ledger = await freshLedger();
    assert.throws(
        () => validateAcceptanceLedgerForView(ledger, { ledgerRevision: 1 }),
        /ledger revision does not match/u,
    );
    assert.throws(
        () => validateAcceptanceLedgerForView(ledger, { idSetRoot: "0".repeat(64) }),
        /ID-set root does not match/u,
    );
    assert.doesNotThrow(() =>
        validateAcceptanceLedgerForView(ledger, {
            programId: ledger.program_id,
            programVersion: ledger.program_version,
            ledgerRevision: ledger.ledger_revision,
            idSetRoot: ledger.id_set_sha256,
        }),
    );
});

test("physical input rejects duplicate members and hardlinked ledger files", async () => {
    const temporary = await mkdtemp(path.join(os.tmpdir(), "solguard-docs-ledger-"));
    try {
        const duplicate = path.join(temporary, "duplicate.json");
        await writeFile(duplicate, Buffer.from('{"state":"pending","state":"accepted"}\n'));
        await assert.rejects(readPhysicalLedger(duplicate), /duplicate object member/u);

        const source = path.join(temporary, "source.json");
        const alias = path.join(temporary, "alias.json");
        await writeFile(source, Buffer.from('{"schema_version":"fixture"}\n'));
        await link(source, alias);
        await assert.rejects(readPhysicalLedger(source), /exactly one physical link/u);
    } finally {
        await rm(temporary, { recursive: true, force: true });
    }
});

test("CLI renders to stdout with exact anchors and rejects write-like or stale modes", async () => {
    const ledger = await freshLedger();
    const valid = spawnSync(
        process.execPath,
        [
            reader,
            "--ledger",
            ledgerFile,
            "--expect-program-id",
            ledger.program_id,
            "--expect-program-version",
            ledger.program_version,
            "--expect-revision",
            String(ledger.ledger_revision),
            "--expect-id-set-root",
            ledger.id_set_sha256,
        ],
        { cwd: docsRoot, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
    );
    assert.equal(valid.status, 0, valid.stderr);
    assert.match(valid.stdout, /^<!-- Generated read-only view\./u);
    assert.match(valid.stdout, /View authority: `false`/u);
    assert.equal(valid.stderr, "");

    const stale = spawnSync(
        process.execPath,
        [reader, "--ledger", ledgerFile, "--expect-revision", "1"],
        { cwd: docsRoot, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
    );
    assert.notEqual(stale.status, 0);
    assert.match(stale.stderr, /ledger revision does not match/u);

    for (const mode of ["--apply", "--write", "--output", "--emit-event"]) {
        const rejected = spawnSync(process.execPath, [reader, mode, "forbidden"], {
            cwd: docsRoot,
            encoding: "utf8",
        });
        assert.notEqual(rejected.status, 0);
        assert.match(rejected.stderr, /unknown or forbidden argument/u);
    }
});
