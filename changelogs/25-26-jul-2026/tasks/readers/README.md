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
- it validates and renders the closed assurance pair; a
  `development/single-custodian` snapshot is never presented as independent.

The reader pins the C0-012 contract publication at
`solguard-agents@9da4ae8f45bf6893845a873d5bc7c1c7ac7fa778`, its explicit
single-custodian assurance amendment at
`solguard-agents@7769407d9ac2d68c8f8ef861736aa6ea4198ab13`, and the separate
C0-013 validation reader at
`solguard-deploy@5d8d0a3609b0b191cae89461c7c5946d1c6b3f89`. It does not republish or
change either contract. Its LF-normalized source SHA-256 is
`d79faca964661430f565c9a897e72a4285f6fe96259e302853dace281ca6017c`.

Render the frozen revision-zero plan snapshot with all current trust anchors:

```powershell
node changelogs/25-26-jul-2026/tasks/readers/acceptance-ledger-markdown.mjs `
  --ledger changelogs/25-26-jul-2026/tasks/acceptance-ledger.v1.json `
  --expect-program-id solguard-detection-maturity-2026-07-25 `
  --expect-program-version solguard-detection-maturity-2026-07-25.4 `
  --expect-revision 0 `
  --expect-id-set-root 0d323e2fab3955e8ac50fa717c086fa538542ea4f0efd18001f5e03eefe4866d `
  --expect-program-dag-root 6158e1e93cd4819c83febf27a5314d8529a8101359eec7b717621d861f3fb9f6
```

The command writes Markdown only to standard output. Supplying trusted
expectations is recommended whenever the caller knows the intended program,
revision or roots; a stale or substituted snapshot then fails closed.

Run the targeted tests:

```powershell
node --test changelogs/25-26-jul-2026/tasks/readers/acceptance-ledger-markdown.test.mjs
```

## Canonical findings Docs/UI projection

The C1-009D read-only consumer validates the exact C1-009 finding and review
schemas before deriving a closed JSON or Markdown presentation. Its local
schema/golden copies are non-authoritative fixtures pinned byte-for-byte to
`solguard-core@1ad350d8d3f54c227ca8f81b9cb42c4bf6a0494b`; the route semantics
also pin
`solguard-deploy@cb223071c0dab18190041129490702b8282f27bb`.

The reader keeps all Pass envelopes, public findings and product reviews in
three distinct roles. Reviews never increment finding counts, and
`findings.json` rejects any member that is not both eligible and
`unique|representative`. It accepts canonical empty arrays, preserves the
source byte digest, exposes no writer/output-file mode and reports no measured
capability. C1-009, C1-009C, C1-009D and TRUTH-105 remain pending acceptance.

```powershell
node changelogs/25-26-jul-2026/tasks/readers/findings-docs-ui-projection.mjs `
  --input C:\evidence\project\review_queue.json `
  --role product_review_envelopes `
  --format json

node --test changelogs/25-26-jul-2026/tasks/readers/findings-docs-ui-projection.test.mjs
```
