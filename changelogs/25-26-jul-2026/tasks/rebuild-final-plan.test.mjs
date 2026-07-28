import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const GENERATED = Object.freeze([
  'acceptance-ledger.v1.json',
  '07_CHECKLIST_MAESTRA.md',
  '09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md',
  'README.md'
]);

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function snapshot(stage) {
  return Object.fromEntries(GENERATED.map((name) => [name, sha256(join(stage, name))]));
}

function rebuild(stage) {
  const result = spawnSync(process.execPath, [join(stage, 'rebuild-final-plan.mjs')], {
    cwd: stage,
    encoding: 'utf8',
    timeout: 120_000
  });
  assert.equal(result.status, 0, `rebuild failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
}

test('rebuild-final-plan is byte-idempotent and preserves the R2 76+4 split', { timeout: 240_000 }, () => {
  const root = mkdtempSync(join(tmpdir(), 'solguard-final-plan-'));
  const stage = join(root, 'tasks');
  try {
    cpSync(HERE, stage, { recursive: true });
    rebuild(stage);
    const first = snapshot(stage);
    rebuild(stage);
    assert.deepEqual(snapshot(stage), first);

    const ledger = JSON.parse(readFileSync(join(stage, 'acceptance-ledger.v1.json'), 'utf8'));
    const r2 = ledger.contributions.filter((item) => item.parent_primary_id.startsWith('RUN-'));
    const receipts = r2.filter((item) => item.contribution_type === 'absence_receipt_contribution');
    assert.equal(ledger.program_version, 'solguard-detection-maturity-2026-07-25.4');
    assert.equal(r2.length, 80);
    assert.equal(receipts.length, 4);
    assert.equal(r2.length - receipts.length, 76);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
