# Changelog

## solguard-detection-maturity-2026-07-25.3 (unpublished)

- Program: `25-jul-2026`
- Status: `unpublished`
- Task IDs: `C0-108`, `C0-014`, `C1-018`
- Parent gates: `GOV-005`, `LEDGER-001`, `TRUTH-108`
- Depends-On: `solguard-economic@4aa743d4f534a11b6b37ce585835ce3fad0f569e`
- Hard contribution dependencies for `C0-014`:
  `solguard-agents@f093848824173f6c5cdb1a7a89dd4acbe5d90ab2` (`C0-012` publication) and
  `solguard-deploy@36ca97b6f8117df77039eea397763b5a3a35a310` (`C0-013` reader)
- Hard contribution dependencies for `C1-018`:
  `solguard-deploy@8d8e1e432989ceb697e9beaa54cd1fc2973856ad` (`C1-016`) and
  `solguard-agents@2986e2e73ef9be1c41e35e65a232f36ff2fab0f3` (`C1-017`).
  Both are prepared drafts pending independent acceptance.
- Historical changelog: [changelog-docs.md](https://github.com/SolguardSecurity/solguard-docs/blob/main/changelogs/20-25-Jul-2026/changelog-docs.md)

The archived history remains in the central documentation repository and is
linked here without being copied or rewritten.

### Changed contracts

- None. C0-014 adds an independent read-only consumer of the existing v1
  acceptance-ledger contract; it does not change or republish the schema.
- C1-018 adds a read-only documentation contract over the owner-published
  TechnicalVerdict and AdmissionResult schemas, prepared metric lineage,
  runtime defaults and separated gates. It republishes no product schema and
  activates no writer.

### Migrations

- None.

### Validation evidence

- Central final-plan validation: `node validate-final-plan.mjs` - PASS (71,663
  checks).
- Structural changelog validation: PASS (required fields, exact historical
  link, UTF-8, and terminal newline).
- Repository whitespace validation: `git diff --check` - PASS.
- Product tests: N/A; this pre-genesis commit changes documentation only and
  does not alter product or runtime behavior.
- C0-014 reader validation and negative tests: PASS (14/14), covering literal
  state rendering, non-inference from commit/publication metadata, immutable
  acceptance material, deterministic output, schema/count/ID-set/formula
  tamper, stale revision expectations, strict JSON, hardlinks and forbidden
  writer modes.
- C1-018 truth documentation verification: PASS, covering exact owner schema
  pins, 3 technical decisions, 22 technical reason codes, 14 obligations, 4
  admission decisions, 12 admission reasons, 18 metric routes, safe defaults
  and 4 synthetic matrix scenarios. Negative mutations reject writer/authority
  escalation, enum relabeling, a compatibility default and forged blind
  eligibility.

### Open limitations

- This pre-genesis changelog bootstrap adds no product capability.
- It establishes no product, performance, recall, precision, release, or
  generalization claim.
- It does not accept `C0-108`, `GOV-005`, `C0-014` or `LEDGER-001`; ledger and
  checklist state remain unchanged until the external atomic genesis and later
  valid transitions.
- C1-018 does not accept C1-016, C1-017, C1-018 or TRUTH-108. Its examples are
  synthetic contract fixtures, all writers remain disabled, and it establishes
  no measured product, release or blind-generalization capability.
