# Acceptance ledger Markdown reader

This directory contains the C0-014 read-only documentation consumer for the
acceptance ledger. It validates a ledger snapshot before rendering its explicit
primary, derived and contribution states as Markdown.

The output is a disposable, non-authoritative view:

- it never edits the ledger or `07_CHECKLIST_MAESTRA.md`;
- it has no writer, apply or event-emission mode;
- it never derives acceptance from a commit, branch, pull request, planned
  subject or publication-looking metadata;
- it renders `accepted` only when that literal ledger state has the immutable
  acceptance material required by the v1 contract;
- it rejects schema drift, duplicate JSON members, ID/count/DAG/root drift,
  inconsistent derived state and unsafe physical inputs.

The reader pins the C0-012 contract publication at
`solguard-agents@f093848824173f6c5cdb1a7a89dd4acbe5d90ab2` and the independent
C0-013 validation reader at
`solguard-deploy@36ca97b6f8117df77039eea397763b5a3a35a310`. It does not republish or
change either contract.

Render the frozen revision-zero plan snapshot with all current trust anchors:

```powershell
node changelogs/25-26-jul-2026/tasks/readers/acceptance-ledger-markdown.mjs `
  --ledger changelogs/25-26-jul-2026/tasks/acceptance-ledger.v1.json `
  --expect-program-id solguard-detection-maturity-2026-07-25 `
  --expect-program-version solguard-detection-maturity-2026-07-25.3 `
  --expect-revision 0 `
  --expect-id-set-root 6dde0cc088977a833b1badbc3312798aca9a101bb8bf981fe267e24d0762e6bf `
  --expect-program-dag-root e3d4bb06f045e5aadc45f9f69b53810adfa710bd5bd478c1db63ebbb3d29d202
```

The command writes Markdown only to standard output. Supplying trusted
expectations is recommended whenever the caller knows the intended program,
revision or roots; a stale or substituted snapshot then fails closed.

Run the targeted tests:

```powershell
node --test changelogs/25-26-jul-2026/tasks/readers/acceptance-ledger-markdown.test.mjs
```

## Truth contract documentation

C1-018 publishes a read-only documentation contract for TechnicalVerdict,
AdmissionResult, oracle-free metric lineage, safe Backend defaults and the four
separate truth gates. It pins prepared C1-016 and C1-017, preserves null as
unavailable, and keeps writers, acceptance and measured capability disabled.

```powershell
node changelogs/25-26-jul-2026/tasks/readers/truth-docs-contract.mjs
node --test changelogs/25-26-jul-2026/tasks/readers/truth-docs-contract.test.mjs
```
