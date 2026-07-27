# Changelog

## solguard-detection-maturity-2026-07-25.3 (unpublished)

- Program: `25-jul-2026`
- Status: `unpublished`
- Task IDs: `C0-108`, `C0-014`, `C0-002`
- Parent gates: `GOV-005`, `LEDGER-001`, `GOV-002`
- Depends-On: `solguard-economic@4aa743d4f534a11b6b37ce585835ce3fad0f569e`
- Hard contribution dependencies for `C0-014`:
  `solguard-agents@9da4ae8f45bf6893845a873d5bc7c1c7ac7fa778` (corrected `C0-012`
  publication candidate) and
  `solguard-deploy@5d8d0a3609b0b191cae89461c7c5946d1c6b3f89` (corrected `C0-013`
  reader candidate)
- `C0-002` has no hard contribution dependencies. Its draft publication is
  stacked on the corrected C0-014 publication branch but does not infer or
  record acceptance from that ancestry.
- Historical changelog: [changelog-docs.md](https://github.com/SolguardSecurity/solguard-docs/blob/main/changelogs/20-25-Jul-2026/changelog-docs.md)

The archived history remains in the central documentation repository and is
linked here without being copied or rewritten.

### Changed contracts

- C0-014 adds an independent read-only consumer of the existing v1
  acceptance-ledger contract; it does not change or republish the schema.
- C0-002 adds the machine-readable `solguard-product-claim-dictionary.v1`
  documentation policy and its linter. It changes no product API, artifact
  schema or acceptance-ledger contract, remains `pre_genesis_candidate` and
  grants `claim_authority=none`.

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
- C0-002 dictionary and linter tests: PASS (6/6), covering exact vocabulary,
  authority and alias drift, positive and negative documentation fixtures,
  historical-scope exclusion and exact 15-repository closure.
- C0-002 local Docs scan: PASS (57 active Markdown files; zero violations).
- C0-002 workspace scan: PASS (15 repositories; 87 active Markdown files; zero
  violations).

### Open limitations

- This pre-genesis changelog bootstrap adds no product capability.
- It establishes no product, performance, recall, precision, release, or
  generalization claim.
- It does not accept `C0-108`, `GOV-005`, `C0-014`, `LEDGER-001`, `C0-002` or
  `GOV-002`; ledger and checklist state remain unchanged until the external
  atomic genesis and later valid transitions.
- Existing serialized `release_eligible` and `finding_eligibility` aliases are
  compatibility debt assigned to `C1-021`. C0-002 permits only explicit legacy,
  deprecated, forbidden or literal-false documentation references and rejects
  any new positive claim authority from those names.
- `GOV-002` also requires C0-008, so this contribution cannot accept its parent
  gate by itself.
