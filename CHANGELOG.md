# Changelog

## solguard-detection-maturity-2026-07-25.3 (unpublished)

- Program: `25-jul-2026`
- Status: `unpublished`
- Task IDs: `C0-108`, `C0-014`, `C0-002`, `C0-008`, `C1-009D`, `C1-018`
- Parent gates: `GOV-005`, `LEDGER-001`, `GOV-002`, `TRUTH-105`, `TRUTH-108`
- Depends-On: `solguard-economic@4aa743d4f534a11b6b37ce585835ce3fad0f569e`
- Hard contribution dependencies for `C0-014`:
  `solguard-agents@9da4ae8f45bf6893845a873d5bc7c1c7ac7fa778` (corrected `C0-012`
  publication candidate) and
  `solguard-deploy@5d8d0a3609b0b191cae89461c7c5946d1c6b3f89` (corrected `C0-013`
  reader candidate)
- Hard contribution dependencies for `C1-018`:
  `solguard-deploy@8d8e1e432989ceb697e9beaa54cd1fc2973856ad` (`C1-016`) and
  `solguard-agents@2986e2e73ef9be1c41e35e65a232f36ff2fab0f3` (`C1-017`).
  The authoritative development ledger accepts them at revisions 50 and 51
  with `assurance_level: single-custodian`; no independent custody is claimed.
- Hard contribution dependencies for `C1-009D`:
  `solguard-core@1ad350d8d3f54c227ca8f81b9cb42c4bf6a0494b` (`C1-009` publication) and
  `solguard-deploy@cb223071c0dab18190041129490702b8282f27bb` (`C1-009C` reader).
  Both remain pending the explicit development single-custodian acceptance batch; no independent
  custody is claimed.
- `C0-002` has no hard contribution dependencies. Its draft publication is
  stacked on the corrected C0-014 publication branch but does not infer or
  record acceptance from that ancestry.
- `C0-008` has the hard contribution dependency `C0-002`. This candidate is
  stacked on `solguard-docs@6744458f24243095d2a64c8fb06613b059d28133`,
  records the dependency as `pending_draft` and does not manufacture the
  accepted implementation ref, evidence root or publication receipt.
- Historical changelog: [changelog-docs.md](https://github.com/SolguardSecurity/solguard-docs/blob/main/changelogs/20-25-Jul-2026/changelog-docs.md)

The archived history remains in the central documentation repository and is
linked here without being copied or rewritten.

### Changed contracts

- C0-014 adds a separate read-only consumer of the existing v1
  acceptance-ledger contract; it does not change or republish the schema.
- C1-018 adds a read-only documentation contract over the owner-published
  TechnicalVerdict and AdmissionResult schemas, oracle-free metric lineage,
  runtime defaults and separated gates. It republishes no product schema and
  activates no writer.
- C1-009D adds a read-only Docs/UI consumer of the existing C1-009 finding and
  review schemas. Its byte-pinned fixtures are non-authoritative consumer test
  inputs; it does not change or republish either product contract.
- C0-002 adds the machine-readable `solguard-product-claim-dictionary.v1`
  documentation policy and its linter. It changes no product API, artifact
  schema or acceptance-ledger contract, remains `pre_genesis_candidate` and
  grants `claim_authority=none`.
- C0-008 adds the internal `solguard-governance-publication.v1` manifest,
  architecture decisions, evidence rules and a fail-closed validator. The
  manifest is a content-addressed documentation publication, not a product API
  or acceptance-ledger contract, and grants `claim_authority=none`.

### Migrations

- None.

### Validation evidence

- Central final-plan validation: `node validate-final-plan.mjs` - PASS (78,360
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
- Integrated C1-018 contract root:
  `7844f38a7c8886f2950e2cfa413b20917ab521ce8f7ad58f253892a3d4840448`.
- Complete integrated Docs Node suite: PASS (41/41).
- Cross-repository C1-018 verification: Deploy PASS (54/55, with the one
  Windows symlink-creation case explicitly skipped after `EPERM`) and Backend
  PASS (31/31 Node and 67/67 Rust).
- Central final-plan validation after C1-018: PASS (78,360 checks; 1,671 ledger
  items remain unchanged).
- GitHub Actions: N/A. Neither the integrated branch nor `main` contains a
  workflow, so no remote CI run exists to cite; the exhaustive local and
  cross-repository contract suites above are the validation evidence.
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
- C0-002 dictionary and linter tests: PASS (6/6), covering exact vocabulary,
  authority and alias drift, positive and negative documentation fixtures,
  historical-scope exclusion and exact 15-repository closure.
- C0-002 local Docs scan: PASS (57 active Markdown files; zero violations).
- C0-002 workspace scan: PASS (15 repositories; 87 active Markdown files; zero
  violations).
- C0-008 governance publication validator: PASS (5 bound documents, 3 frozen
  plan sources, 15 required links, 10 architecture decisions and 12 evidence
  rules; C0-002 dependency remains unsatisfied).
- C0-008 negative and CLI suite:
  `node --test test/governance-program.test.mjs` - PASS (7/7), covering
  authority escalation, false dependency satisfaction, path/link scope,
  closed IDs, validation-gate weakening, roots and candidate bindings.
- Complete Docs Node suite: `node --test test/*.test.mjs` - PASS (13/13).
- C0-008 local claim scan: PASS (60 active Markdown files; zero violations).

### Open limitations

- This pre-genesis changelog bootstrap adds no product capability.
- It establishes no product, performance, recall, precision, release, or
  generalization claim.
- It does not accept `C0-108`, `GOV-005`, `C0-014`, `LEDGER-001`, `C0-002`,
  `C0-008` or `GOV-002`; ledger and
  checklist state remain unchanged until the external atomic genesis and later
  valid transitions.
- C1-018 does not accept itself or TRUTH-108. C1-016 and C1-017 are accepted
  only by the authoritative development ledger under `single-custodian`
  assurance. Its examples are synthetic contract fixtures, all writers remain
  disabled, and it establishes no measured product, release or
  blind-generalization capability.
- C1-009D does not accept C1-009, C1-009C, C1-009D or TRUTH-105. The
  DECIDE-604 runtime writer remains disabled, canonical runtime artifacts have
  not been observed, and this view establishes no measured product capability.
- Existing serialized `release_eligible` and `finding_eligibility` aliases are
  compatibility debt assigned to `C1-021`. C0-002 permits only explicit legacy,
  deprecated, forbidden or literal-false documentation references and rejects
  any new positive claim authority from those names.
- `GOV-002` also requires C0-008, so this contribution cannot accept its parent
  gate by itself.
- C0-008 remains ineligible for acceptance while C0-002 lacks the required
  accepted implementation ref, evidence root and publication receipt. Its
  stacked ancestry is ordering context only.
