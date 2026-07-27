# Changelog

## solguard-detection-maturity-2026-07-25.3 (unpublished)

- Program: `25-jul-2026`
- Status: `unpublished`
- Task IDs: `C0-108`, `C0-014`, `C1-009D`
- Parent gates: `GOV-005`, `LEDGER-001`, `TRUTH-105`
- Depends-On: `solguard-economic@4aa743d4f534a11b6b37ce585835ce3fad0f569e`
- Hard contribution dependencies for `C0-014`:
  `solguard-agents@f093848824173f6c5cdb1a7a89dd4acbe5d90ab2` (`C0-012` publication) and
  `solguard-deploy@36ca97b6f8117df77039eea397763b5a3a35a310` (`C0-013` reader)
- Hard contribution dependencies for `C1-009D`:
  `solguard-core@1ad350d8d3f54c227ca8f81b9cb42c4bf6a0494b` (`C1-009` publication) and
  `solguard-deploy@cb223071c0dab18190041129490702b8282f27bb` (`C1-009C` reader).
  Both are draft implementations pending independent acceptance.
- Historical changelog: [changelog-docs.md](https://github.com/SolguardSecurity/solguard-docs/blob/main/changelogs/20-25-Jul-2026/changelog-docs.md)

The archived history remains in the central documentation repository and is
linked here without being copied or rewritten.

### Changed contracts

- None. C0-014 adds an independent read-only consumer of the existing v1
  acceptance-ledger contract; it does not change or republish the schema.
- C1-009D adds a read-only Docs/UI consumer of the existing C1-009 finding and
  review schemas. Its byte-pinned fixtures are non-authoritative consumer test
  inputs; it does not change or republish either product contract.

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
- C1-009D Docs/UI projection tests: PASS (9/9), covering all three canonical
  roles, empty arrays, public eligibility, review isolation, exact schema and
  golden pins, strict JSON/UTF-8, schema mixing, duplicate IDs, Markdown
  escaping, physical input limits and forbidden writer/output modes.
- Cross-repository C1-009D verification: PASS against the pinned Core
  publication (8 Node and 3 Rust tests), the Deploy C1-009C reader (8 tests)
  and two direct Deploy-bytes-to-Docs/UI role projections.
- C1-009D new-file formatting, changed-link, changelog-structure and repository
  whitespace checks: PASS.
- Central final-plan validation after C1-009D: PASS (71,663 checks; 1,671
  ledger items remain unchanged).

### Open limitations

- This pre-genesis changelog bootstrap adds no product capability.
- It establishes no product, performance, recall, precision, release, or
  generalization claim.
- It does not accept `C0-108`, `GOV-005`, `C0-014` or `LEDGER-001`; ledger and
  checklist state remain unchanged until the external atomic genesis and later
  valid transitions.
- C1-009D does not accept C1-009, C1-009C, C1-009D or TRUTH-105. The
  DECIDE-604 runtime writer remains disabled, canonical runtime artifacts have
  not been observed, and this view establishes no measured product capability.
