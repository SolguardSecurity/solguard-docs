# Matriz canónica de certificación por scope

## 1. Propósito y autoridad

Este archivo define qué debe demostrar cada scope de lenguaje y cómo se
calculan los agregados `LANG-100..LANG-200`. Complementa
[`04_MADUREZ_OCHO_LENGUAJES.md`](04_MADUREZ_OCHO_LENGUAJES.md).

Reglas normativas:

1. C6 implementa y cualifica C0-C4; produce un `C5 candidate` congelado.
2. C7 ejecuta `H-GEN-A` y `H-GEN-B`; sólo después puede emitir C5.
3. Un scope, familia, profile o exclusion no se reduce después de observar
   resultados. Una reducción crea un scope nuevo y reinicia toda la evidencia.
4. Un aggregate ID no se cierra por commit. Se calcula como una fórmula AND
   sobre artefactos firmados y reproducibles.
5. Docs, harness, tests aislados o frontend presence no equivalen a
   certificación.
6. Cada scope conserva su propio denominador, métricas e intervalos. No hay
   promedios que oculten un scope fallido.
7. Python y cualquier lenguaje no listado quedan fuera de estos agregados.
8. C5 requiere independencia humana real: GPTs, worktrees o VMs separados no
   sustituyen custodio/adjudicador externos.
9. Un scope sin `N` y `n_eff` suficientes según power analysis preregistrado
   queda `insufficient_evidence`; nunca se promedia ni se acepta por tendencia.

## 2. Identidad de gates por scope

Para todo `SCOPE_ID` registrado se crean exactamente estos IDs:

```text
<SCOPE_ID>-C0
<SCOPE_ID>-C1
<SCOPE_ID>-C2
<SCOPE_ID>-C3
<SCOPE_ID>-C4
<SCOPE_ID>-C5A
<SCOPE_ID>-C5B
<SCOPE_ID>-CERT
```

En el ledger, los 210 primary gates usan
`criteria_locator=composite_scope_gate`, con `scope_id=<SCOPE_ID>` y
`gate=C0|C1|C2|C3|C4|C5A|C5B`. El linter resuelve el `scope_id` contra la fila
exacta de la sección 6 y el gate contra la fila normativa de la sección 3; no
finge que el ID combinado sea un heading o una fila inexistente.

La fórmula final es:

```text
<SCOPE_ID>-CERT =
  <SCOPE_ID>-C0
  AND <SCOPE_ID>-C1
  AND <SCOPE_ID>-C2
  AND <SCOPE_ID>-C3
  AND <SCOPE_ID>-C4
  AND <SCOPE_ID>-C5A
  AND <SCOPE_ID>-C5B
  AND LANG-200-HARNESS
```

`<SCOPE_ID>-CERT` es un agregado calculado. Ningún commit puede declarar que lo
ha completado. DEPLOY/evaluator post-scan publica una evaluación de fórmula y
el verificador independiente la reproduce; el runtime scanner no puede
emitirla. El receipt operacional del derived —no su fórmula— exige
`signed_solguard_language_certification_v1`, `release_bom_binding`,
`published_limits_and_exclusions` e `independent_reproduction`. La aceptación
primary de `LANG-200-HARNESS` garantiza que el certificador verifica esos
campos con fixtures positivos/negativos firmados; los artefactos reales de C7
se enlazan en C5A, C5B, CERT y FINAL.

## 3. Gates, dependencias y evidencia

| Gate | Dependencias | Resultado obligatorio | Evidencia mínima reproducible |
|---|---|---|---|
| C0 | scope preregistrado | Inventario físico y BuildProfiles completos | `scope-manifest.json`, source tree digest, toolchain/framework manifests, lockfiles, SBOM, sandbox receipt, included/excluded profiles |
| C1 | C0 | Sintaxis, símbolos, tipos y spans exactos | `solguard-language-frontend-manifest.v1`, compiler/parser outputs, replay receipts, malformed/tamper suite, 100% goldens obligatorios |
| C2 | C1 | CFG, guards, calls, state, effects, numeric domains y local boundaries | corpus anotado, fact-level precision/coverage, negative facts, alias/layout/unit receipts, cero facts exactos falsos |
| C3 | C2 | Clausura interprocedural, dispatch, async/atomicidad y deuda completa | TRACE receipts, exact/candidate/unresolved denominators, witness/counterevidence, budget closure, debt blocking tests |
| C4 | C3 y contratos comunes | Pipeline económico y veredicto completo sobre corpus visible | matrices vulnerable/patched/safe/near-miss/metamorphic/adversarial; artefactos MAP→FILTER; DIFF; 100% positivos conformes; cero Pass negativos |
| C5A | C4 y candidate congelado | Primera transferencia blind | instancias contractuales H-GEN-A de campaign manifest y measurement report ligadas al scope y al `candidate_epoch_id`, `candidate_epoch_definition_root` y `candidate_epoch_open_event_root` exactos; `target_policy_openings_root`, `finding_materiality_assessments_root`, contamination freeze/post-reveal roots y power receipt; completion por positivo/control, precision/review/failure gates, prediction/ranking freeze, doble adjudicación, métricas macro e intervalos, leak audit; output A completo firmado y timestamped antes de cualquier reveal |
| C5B | C4, manifest B preregistrado y mismos hashes de producto | Replicación independiente sin retuning | H-GEN-B liga campaign/report/two-set/contamination roots al mismo `candidate_epoch_id`, definition root y open-event root que A y al scope exacto; candidate/scanner/rules/prompts/models/proof-policy/admission-policy y `materiality_profile_root` son idénticos A/B, mientras `policy_set_commitment_root` y hojas target-specific son distintos y cohort-disjoint; power/completion/precision/review/failure gates y outputs A+B sellados antes de reveal |
| CERT | C0-C5B | Certificado C5 del scope | `solguard-language-certification.v1`, fórmula evaluada por DEPLOY/evaluator post-scan, release BOM, firmas, prueba de freeze A+B previo a todo reveal, limits/exclusions y reproducción independiente |

`H-GEN-A` y `H-GEN-B` se preregistran antes del primer scan. Los outputs
completos de A y B quedan congelados, firmados y timestamped antes de revelar
cualquiera. C5B no puede usar labels, errores, adjudicaciones ni tuning
procedentes de C5A.

C5A y C5B se aceptan mediante **60 eventos `record_measurement` distintos**:
uno A y uno B para cada uno de los 30 scopes. Cada evento usa
`measurement_subtype=h_gen_scope_replica`, contiene arrays cerrados
`campaign_manifest_roots[1]` y `measurement_report_roots[1]`, declara
`replica_role=A|B`, el `counterpart_campaign_id` y el mismo
`campaign_pair_set_root`. Un evento no acepta a su pareja. Missing, swap,
reopen o fallo parcial deja ese gate pending/reopened; `TEST-V6` y
`BLIND-911` sólo se materializan después de los 60.

Los manifests H-GEN usan `truth_mode=precommitted_private` y un truth
commitment root no vacío sellado/timestamped antes del scan. Null, placeholder,
root vacío o truth añadido después del scan bloquea C5 aunque el resto de
métricas pase.

Los 60 gates C5A/C5B globales pertenecen exclusivamente al epoch
`RC-FULL-1`. Cada evento `record_measurement` debe repetir y verificar la
tupla completa `candidate_epoch_id + candidate_epoch_definition_root +
candidate_epoch_open_event_id/root + candidate_epoch_freeze_event_id/root +
accepted_candidate_input_set_root +
accepted_tooling_membership_root + resource_profile_id/version/root +
resource_profile_policy_id/version/root +
resource_profile_policy_compliance_root`.
`RC-V-EVM-1` usa IDs `VERTICAL-EVM-*` separados y nunca satisface ni se
promedia con un C5 global. Un receipt vertical, un root de otro epoch o un
campo de candidate omitido invalida el gate aunque scope, campaña y métricas
coincidan.

Cada dependencia C5A/C5B de `solguard-campaign-manifest.v1` se verifica contra
un receipt de instancia que liga `producer_artifact_id`, root, `cohort_id` y
`scope_id` exactos al `dependency_state_hash`. Intercambiar A/B, cambiar el
scope o reutilizar un único manifest para varios scopes falla cerrado aunque
schema y versión coincidan.

Cada dependencia C5A/C5B de `solguard-measurement-report.v1` se verifica del
mismo modo contra la instancia emitida por `EVAL-908`: liga `campaign_id`,
`cohort_id`, `scope_id`, root del reporte y `producer_artifact_id` al
`dependency_state_hash`. Un reporte global sin partición verificable por scope,
un swap A/B o un reporte de otra campaña falla cerrado.

C5 no puede mejorar métricas omitiendo ejecuciones ni desviando falsos a
Review. El reporte particiona `successful_target_completion` por
positivo/control/scope y exige todas las fases obligatorias `complete`;
cualquier source/preflight failure, crash, timeout, OOM, cancel o budget
exhaustion en un control contractual bloquea el scope. Además aplica
`presented_actionable_precision` ≥90 % con LCB ≥80 % y
`negative_control_review_rate` ≤2 % con UCB ≤5 %; patched/safe/near-miss
adjudicados como verdaderos controles tienen cero Review que no sea a la vez TP
y material. Un TP inmaterial penaliza; un bug novel material se adjudica antes
de calcular ese rate. `conservative_negative_control_failure_rate` también es
≤2 % con UCB ≤5 % y cuenta Pass incorrecto, Review no-TP/no-material o cualquier
non-completion de un control comprometido. Crash selectivo nunca reduce el
false-alert ceiling.

El único commitment admitido es
`policy_commitment_scheme=solguard-policy-set-commitment.v1`. Cada opening
incluye `leaf_salt_b64url` CSPRNG de exactamente 32 bytes, `target_index` y
membership proof bottom-up con un sibling de 32 bytes por nivel. Leaves se
ordenan por target key RFC8785/JCS bytewise y usan los domains leaf/pad/node/set
publicados en `01`. Scheme legacy/alternativo, salt corto/reutilizado, índice,
side, padding o proof ambiguo falla cerrado.

Freeze, policy commitments, output seals, reveal, DB cutover, DSSE, tags y
promotion ligan `solguard-external-timestamp-receipt.v1`: base + union
RFC3161/transparency, trust policy y quorum **2-of-2** de autoridades
independientes. Un timestamp local o una sola autoridad no satisface el gate.

El scanner sólo ve `policy_set_commitment_root` opaco y común a la cohort. El
metric provenance post-seal embebe dos sets y deriva roots domain-separated:
TargetPolicyOpeningSet liga campaign/cohort, policy commitment, target-set
root/count y exactamente una opening por target/revision —incluidos
no-result/unmapped/unclassified— y, por entry, refs/digests exactos de policy
leaf, policy snapshot y mapping-table artifact/root. FindingMaterialityAssessmentSet
liga exactamente una assessment por cada sujeto adjudicado Pass+Review+top-10,
con subject/opening refs/digests; si es proven liga lower-bound artifact y
evidence refs/digests, price-snapshot artifact/digest/root y threshold-rule
artifact/digest/ID. Su mapping ref/digest coincide byte-exact con el de la
opening. Report/dossier referencian ambos roots y adjudication la assessment
exacta. Todos los refs usan `artifact_id` + JSON Pointer, `artifact_role`,
`role_schema_digest`, `content_digest` y `locator` del evidence store/dossier,
y son entries obligatorias antes de FINAL-001. C5 falla ante missing/digest mismatch,
swap, cross-campaign/revision, target o subject omitido/extra/duplicado,
proof/pointer inválido, cardinalidad distinta o cualquier mapping/severity en
artefactos del scanner.

Cada campaign fija `contamination_root_at_freeze`. Metric provenance, report y
dossier post-reveal ligan además `post_reveal_contamination_root` y toda su
cadena de eventos. Una colisión post-seal conserva target/truth en
`all_committed` y en el denominador scoreable prefrozen, no gana crédito
blind/novel y sólo cambia una vista publicada. Reemplazar/excluir el caso o
reescribir un root bloquea C5.

El assessment-set congela `claim_materiality_threshold` prefreeze. Estados de
impact/lower-bound/price son `proven|not_proven|not_applicable`, con refs iff
proven y reason/evidence en otro caso; outcome es
`material|non_material|unclassified|not_applicable`. Para
`bounty_detection_ready` el threshold es `high`: medium/unclassified no suman
al numerador ni eximen Review de control.

## 4. Manifest exacto del scope

Cada `scope-manifest.json` usa
`schema_version=solguard-language-scope-manifest.v1` y contiene al menos:

```text
schema_version
scope_id
language
ecosystem
frameworks_and_versions
compiler_or_runtime_versions
compiler_or_runtime_digests
target_vm_chain_or_triple
standards_editions_module_modes
package_manager_and_lock_digests
workspace_projects_translation_units
features_tags_macros_flags_profiles
generated_code_policy
source_map_policy
frontend_adapter_versions
economic_family_ids
kernel_ids
mandatory_constructs
excluded_constructs_and_profiles
exclusion_impact
corpus_manifest_schema=solguard-corpus-manifest.v1
corpus_manifest_digest
holdout_assignment_commitments
scanner_rules_prompts_models_policy_digests
resource_budgets
invalidation_conditions
```

No se permiten ranges ambiguos como `solc 0.x`, `Node Web3`, `modern Rust`,
`Geth-like`, `C++ native` o `supported frameworks`. Toda versión y profile
incluidos se enumeran o se derivan de un manifest cerrado por digest.

## 5. Cadena C4 obligatoria por scope

Cada `<SCOPE_ID>-C4` debe conciliar la misma lineage:

| Repo | Obligación específica |
|---|---|
| `solguard-deploy` | C0, scope/build manifest, toolchains, sandbox, SBOM y BuildProfile sellados |
| `solguard-map` | C1-C2, Semantic IR y boundary observations con autoridad física |
| `solguard-trace` | C3, ruta exacta o candidate sets sound, orden, estado, async/atomicidad y counterevidence |
| `solguard-discover` | Protocol/Boundary IR y hipótesis derivada de hechos, no de keyword authority |
| `solguard-economic` | transición pre/post, activo, unidad, actor, atomicity domain y kernel económico |
| `solguard-value` | ProofObligations, same-flow/same-asset, before/after y delta bajo numeric semantics nativas |
| `solguard-invariant` | propiedad base independiente del texto del candidato |
| `solguard-validate` | Supported sólo con ProofCertificate completo; Refuted/Inconclusive preservados |
| `solguard-filter` | Pass sólo si todo lo anterior verifica; negativos y debt terminan Reject/Review |
| `solguard-diff` | vulnerable→patched, safe→regression y profile changes comparados semánticamente |
| `solguard-core` | envelopes, bindings, request fixpoint, budgets, lineage y estado terminal |
| `solguard-deploy` | matriz, conformance, metamórficos, replay y dossier C4 reproducibles |

Un test común del engine no sustituye la evidencia de un scope. ECONOMIC,
VALUE y DIFF pueden seguir siendo language-neutral, pero cada scope debe probar
que sus adapters, numeric domains, unidades y boundaries atraviesan esos tres
repos correctamente.

### 5.1 Regla bloqueante

En cualquier arista necesaria para la proof:

```text
partial | unavailable | heuristic | unresolved crítico | UB-dependiente
=> proof incomplete
=> VALIDATE Inconclusive
=> FILTER Review
=> C4 no cerrado para ese caso
```

Un `sound_over_approximation` no prueba ausencia, protección, target único ni
delta exacta. Un scope sólo excluye una capacidad si la exclusión estaba
preregistrada y ninguna familia obligatoria depende de ella.

### 5.2 Contributions C6 y DAG de publicación

Los owners de C0-C4 no se comparten: C0=`solguard-deploy`,
C1/C2=`solguard-map`, C3=`solguard-trace` y C4=`solguard-deploy` como
integrador. Cada fila de scope materializa 15 contribution IDs
`C6-SCP-NN-<SUFFIX>`; contribution tiene estado, versión, evidence y verifier
propios, pero nunca acepta el gate.

| Sufijo | Owner repo | Parent | Dependencias contribution mínimas |
|---|---|---|---|
| PROFILE | deploy | C0 | node deps C0 |
| FRONTEND | map | C1 | PROFILE publicado por SHA/receipt |
| LOCAL-IR | map | C2 | FRONTEND |
| TRACE | trace | C3 | LOCAL-IR |
| MODEL | discover | C4 | TRACE |
| ECONOMIC | economic | C4 | MODEL |
| INVARIANT | invariant | C4 | MODEL |
| DIFF | diff | C4 | MODEL |
| CORE | core | C4 | MODEL + ECONOMIC + INVARIANT |
| VALUE | value | C4 | CORE + ECONOMIC |
| VALIDATE | validate | C4 | CORE + VALUE |
| FILTER | filter | C4 | VALIDATE |
| REPLAY | deploy | C4 | MODEL + ECONOMIC + INVARIANT + CORE + VALUE + VALIDATE + FILTER + DIFF |
| CANDIDATE | deploy | C4 | REPLAY |
| SCOPE | docs | C4 | CANDIDATE |

`accept_contribution` exige todas las
`hard_contribution_dependencies[].contribution_id` accepted, su
`publication_receipt`, SHA/tree o absence receipt exacto, evidence root único y
verifier independiente. `accept_primary` exige el conjunto cerrado
`required_contribution_ids` y replay E2E del integrador. Reabrir una
contribution reabre parent, CERT, agregados y claims transitivamente.

## 6. Registro obligatorio de scopes

Los kernels indicados son floors. El manifest puede añadir familias/kernels,
pero no retirar estos después de observar resultados.

Gate B sella `scope_id`, toolchains, profiles, frameworks, familias,
exclusiones, denominadores y asignaciones antes de ejecutar cualquier holdout.
Desde ese instante son irreducibles para la campaña: un fallo no autoriza a
eliminar inputs, perfiles o familias. Toda variante más estrecha es un scope
nuevo, con C0-C5B, corpus y dos holdouts nuevos.

### 6.1 Solidity y Vyper

| Aggregate | Scope ID | Ecosistema obligatorio | Kernels mínimos | Manifest exacto adicional |
|---|---|---|---|---|
| LANG-100 | `SOL-EVM-DEFI` | EVM DeFi, Foundry/Hardhat, proxies/libraries, Yul declarado | K1-K10 | set de solc/EVM/optimizer/viaIR/framework profiles y policy Yul |
| LANG-110 | `VYP-EVM-DEFI` | EVM DeFi Vyper, modules/interfaces/decorators | K1-K10 | versiones Vyper, EVM target, framework profiles y semantics por versión |

Yul/assembly o `raw_call` críticos sin replay exacto bloquean el certificado;
no se convierten en exclusions retroactivas.

### 6.2 Rust

| Aggregate | Scope ID | Ecosistema obligatorio | Kernels mínimos | Manifest exacto adicional |
|---|---|---|---|---|
| LANG-120 | `RST-SOLANA-ANCHOR` | Solana/Anchor accounts, PDA, CPI, tokens | K1-K10 | Rust/Solana/Anchor versions, target, crates, features y macro policy |
| LANG-120 | `RST-COSMWASM` | CosmWasm contracts/messages/storage/funds | K1,K2,K4-K10 | Rust/CosmWasm/VM versions, crates, features y schema adapters |
| LANG-120 | `RST-NEAR` | NEAR promises/callbacks/storage/deposit | K1,K2,K4-K10 | Rust/NEAR SDK/runtime versions, crates, features y promise model |
| LANG-120 | `RST-SUBSTRATE-FRAME` | FRAME origins/storage/extrinsics/weights | K1-K10 | Rust/FRAME/runtime versions, pallets, features y macro expansion |
| LANG-120 | `RST-NATIVE-CLIENT` | native consensus/fork/persistence/network state | K1,K3-K10 | Rust/client crates, target, features, async runtime, serialization y FFI policy |

CosmWasm y NEAR nunca comparten gate, denominador ni certificado. MIR/CFG,
proc-macro, unsafe o FFI debt en la ruta crítica bloquea C3/C4.

### 6.3 Go

| Aggregate | Scope ID | Ecosistema obligatorio | Kernels mínimos | Manifest exacto adicional |
|---|---|---|---|---|
| LANG-130 | `GO-COSMOS-SDK` | Cosmos stores, keepers, messages, coins, hooks | K1-K10 | Go/Cosmos versions, modules, replacements, tags, GOOS/GOARCH y decimal adapters |
| LANG-130 | `GO-GETH-CLIENT` | Geth state, tx, RPC, mempool, reorg, consensus boundary | K1,K3-K10 | Go/client versions, modules, tags, generated-code y persistence adapters |
| LANG-130 | `GO-RELAYER-ORACLE` | relayer/oracle RPC, retry, dedupe, signing, routing | K1,K4-K10 | Go/service frameworks, queue/cache/RPC/signing adapters y deployment profiles |

Reflection, indirect dispatch o generated-code debt en una arista crítica
bloquea la proof. Los extractores corpus-shaped permanecen `rule_assisted`.

### 6.4 C y C++

| Aggregate | Scope ID | Ecosistema obligatorio | Kernels mínimos | Manifest exacto adicional |
|---|---|---|---|---|
| LANG-140 | `C-UTXO-CONSENSUS` | UTXO, fees, validation, fork/timelock | K1-K10 | C standard, compiler/linker/stdlib, target, ABI y compile database |
| LANG-140 | `C-BRIDGE-FINALITY` | native bridge, validator/finality/context | K1,K3-K10 | toolchain, target, macros, serialization, crypto/FFI adapters |
| LANG-140 | `C-WALLET-CUSTODY` | wallet/custody value and signing paths | K1,K3-K10 | toolchain, key/signing libraries, storage and build profiles |
| LANG-150 | `CPP-UTXO-CONSENSUS` | C++ UTXO/consensus/client lifecycle | K1-K10 | C++ standard, compiler/stdlib/linker, ABI, templates y compile database |
| LANG-150 | `CPP-BRIDGE-FINALITY` | native C++ bridge/finality/concurrency | K1,K3-K10 | toolchain, targets, virtual/template sets, serialization y atomics |
| LANG-150 | `CPP-WALLET-CUSTODY` | wallet/custody/accounting/lifetime | K1,K3-K10 | toolchain, libraries, exception/RAII profiles y persistence |

Memory safety genérica queda fuera. Una ruta que depende de undefined behavior
o alias/lifetime no resuelto sólo puede ser Review.

### 6.5 JavaScript y TypeScript

| Aggregate | Scope ID | Ecosistema obligatorio | Kernels mínimos | Manifest exacto adicional |
|---|---|---|---|---|
| LANG-160 | `JS-NODE-RELAYER` | Node relayer, RPC, signing, retry/dedupe | K1,K4-K10 | Node/module mode, package graph, queue/cache/RPC/signing adapters |
| LANG-160 | `JS-NODE-KEEPER-ORACLE` | keeper/oracle/finality/cache | K1,K3-K10 | Node/runtime, scheduler, RPC/oracle/cache drivers y deployment profiles |
| LANG-160 | `JS-NODE-TX-BUILDER` | transaction construction, fees, slippage, nonce | K1,K3-K9 | Node/runtime, ethers/viem/web3 versions, signer and numeric libraries |
| LANG-170 | `TS-NODE-RELAYER-SDK` | typed relayer/SDK and runtime boundaries | K1,K4-K10 | TypeScript/Node versions, tsconfig graph, module mode, adapters y source maps |
| LANG-170 | `TS-NODE-KEEPER-ORACLE` | typed keeper/oracle/finality/cache | K1,K3-K10 | compiler options, project refs, scheduler/RPC/oracle/cache adapters |
| LANG-170 | `TS-NODE-TX-BUILDER` | typed transaction construction and unit safety | K1,K3-K9 | compiler/Node, ethers/viem/web3, generated clients and numeric libraries |

JS y TS no comparten certificados. Dynamic properties, reflection, source-map
drift o type/runtime erasure crítica bloquean C3/C4.

### 6.6 Scopes políglotas

Las seis categorías de boundary son obligatorias y se prueban mediante ocho
scopes exactos. Cinco categorías de seis o siete scopes de ocho es fallo. Un
slash no permite elegir una implementación después de observar resultados.

| Aggregate | Scope ID | Boundary obligatoria | Evidencia adicional |
|---|---|---|---|
| LANG-180 | `X-SOL-TS-RELAYER` | Solidity/EVM ↔ TypeScript relayer | solc/EVM/ABI + TS/Node/RPC/message/domain/asset identity |
| LANG-180 | `X-VYP-JS-KEEPER` | Vyper/EVM ↔ JavaScript keeper/oracle | Vyper/EVM ABI + JS/Node scheduler/price/unit/time/finality |
| LANG-180 | `X-SOLANA-TS-CLIENT` | Rust Solana/Anchor ↔ TypeScript client | Anchor IDL/account/PDA/message/schema/unit/runtime identity |
| LANG-180 | `X-COSMWASM-GO-RELAYER` | Rust CosmWasm ↔ Go relayer | schema/funds/message/ack/retry/finality/asset identity |
| LANG-180 | `X-NEAR-JS-CLIENT` | Rust NEAR ↔ JavaScript client | promise/receipt/callback/deposit/schema/runtime identity |
| LANG-180 | `X-GO-C-FFI` | Go client ↔ C native library | C ABI/layout/ownership/error/atomicity y Go cgo boundary |
| LANG-180 | `X-GO-CPP-FFI` | Go client ↔ C++ native library | C++ ABI/templates/RAII/exceptions/ownership y Go cgo boundary |
| LANG-180 | `X-TS-DATA-SOL-TX` | database/queue/event ↔ TypeScript tx builder ↔ Solidity | idempotency/order/retry/nonce/units/asset/ABI handoff |

Cada scope políglota atraviesa MAP, TRACE, DISCOVER, ECONOMIC, INVARIANT, CORE,
VALUE, VALIDATE y FILTER. DIFF modifica ambos lados y verifica que el cambio
causal aparezca en el finding o en la refutación.

Los pares de DIFF son corpus visible de C4, nunca input de H-GEN/H-NOVEL. El
bundle blind contiene un único snapshot opaco y la closure prueba ausencia de
patches, siblings seguros, metadata de diff y hashes que actúen como oracle.

## 7. Corpus y gates C4

Por cada `(scope, family)`:

- tres roots vulnerables independientes;
- patches de los tres;
- tres safe designs;
- cinco near-miss;
- transformaciones normativas;
- transformaciones adversariales;
- una composición con otra familia;
- oracle fuera del scan root;
- lineage/fork split antes de ejecutar.

Gate C requiere:

```text
100% positivos obligatorios -> complete proof -> Supported -> Pass
  -> publication_eligibility=eligible
0 patched/safe/near-miss Pass
0 transformaciones negativas Pass
100% metamórficos normativos conservan decisión
>=95% positivos adversariales conservan causal class y top-10
```

El 95% nunca permite falsos `Pass` negativos.

## 8. H-GEN-A, H-GEN-B y estadística

Cada scope preregistra dos holdouts lineage-disjoint. Ambos usan exactamente el
mismo candidate de C6.

Cada evaluación publica:

- denominadores por familia;
- roots y lineages independientes;
- precision `FILTER Pass`;
- strict macro recall;
- `finding_recall_at_10` y `positive_target_hit_rate_at_10` separados;
- `negative_target_false_alert_rate` y cero Pass en controles obligatorios;
- metamorphic consistency;
- review load;
- intervalos y lower confidence bounds;
- unknown/unscored/failed runs;
- leak/isolation attestation.

Los floors de 04 se aplican a A y B. Point estimates sin potencia o intervalos
preregistrados no cierran C5. La lista completa de endpoints, denominadores,
LCB/UCB, false-alert, adjudicación y review burden de
`05_VALIDACION_CIEGA_Y_RELEASE.md` §12 y §13.5 es normativa y no puede
sustituirse por este resumen.

El cálculo se hace por scope × cohort, con estimand, alpha/multiplicidad,
efecto mínimo, potencia >=80 %, clusters, no-response, `N` y `n_eff` firmados
antes de seleccionar targets. Los ~220 protocolos y 90 labs actuales no se
presumen suficientes para los 60 strata; los ceilings de controles llevan
plausiblemente a varios miles de observaciones independientes, aunque sólo el
power analysis definitivo fija el número. Si no alcanza, el scope queda fuera
de C5 y el programa debe ampliar holdout o emitir piloto; no puede suavizar el
gate. Este snapshot no permite crear `partial_scope` genérico post-result. Su
único perfil parcial ejecutable es `VERTICAL-EVM-PROFILE-001`, preregistrado
antes de resultados; cualquier otro subset exige una nueva versión congelada.

La custodia también se prueba por persona. Maintainer/operator, custodio H-GEN
y adjudicador final son humanos distintos; LIVE añade selector/attestor y
confirmador externos. Si Roger cubre varios roles, la evidencia sólo puede
etiquetarse `self_administered_isolated_evaluation`. GPTs, sesiones, worktrees,
cuentas o VMs separados no satisfacen independencia y bloquean C5/CERT y los
claims blind, novel, bounty y product release.

### 8.1 Fast track honesto `bounty_vertical`

`VERTICAL-EVM-PROFILE-001` congela exactamente el scope `SOL-EVM-DEFI`, el
candidate epoch `RC-V-EVM-1`, su definition/open-event root, SHAs/tree/manifest,
accepted-input/tooling roots y resource-profile root, los pares
`VERTICAL-EVM-HGEN-A-001/B-001` y
`VERTICAL-EVM-HNOVEL-A-001/B-001`, power analysis, thresholds, límites y claim
máximo. Usa custodio y adjudicador humanos externos; si una sola persona cubre
roles, queda `self_administered_isolated_evaluation` y no concede claim.

`VERTICAL-EVM-BLIND-001` materializa AND sobre C5A/C5B del scope con receipt
independiente; `VERTICAL-EVM-NOVEL-001` exige los dos H-NOVEL; y
`VERTICAL-EVM-LIVE-001` exige autorización live verificada antes de cada intento,
frame fijo y finding severity>=high/material confirmado. Los thresholds no se
relajan frente al programa global.

La autorización live es un artefacto nested content-addressed firmado que liga
artifact/content/root, issuer authority chain, trust policy, subject, target y
revision, program set, ownership binding, ventana, acciones/probes, rate y
recursos, prohibiciones, status/revocation e independent attestor. Unknown o
self-issued chain, overlap del attestor, ownership/status stale, expired,
revoked u out-of-scope aborta antes de ejecutar el intento.

## 9. Fórmulas AND agregadas

### 9.1 Lenguajes

```text
LANG-100 =
  SOL-EVM-DEFI-CERT

LANG-110 =
  VYP-EVM-DEFI-CERT

LANG-120 =
  RST-SOLANA-ANCHOR-CERT
  AND RST-COSMWASM-CERT
  AND RST-NEAR-CERT
  AND RST-SUBSTRATE-FRAME-CERT
  AND RST-NATIVE-CLIENT-CERT

LANG-130 =
  GO-COSMOS-SDK-CERT
  AND GO-GETH-CLIENT-CERT
  AND GO-RELAYER-ORACLE-CERT

LANG-140 =
  C-UTXO-CONSENSUS-CERT
  AND C-BRIDGE-FINALITY-CERT
  AND C-WALLET-CUSTODY-CERT

LANG-150 =
  CPP-UTXO-CONSENSUS-CERT
  AND CPP-BRIDGE-FINALITY-CERT
  AND CPP-WALLET-CUSTODY-CERT

LANG-160 =
  JS-NODE-RELAYER-CERT
  AND JS-NODE-KEEPER-ORACLE-CERT
  AND JS-NODE-TX-BUILDER-CERT

LANG-170 =
  TS-NODE-RELAYER-SDK-CERT
  AND TS-NODE-KEEPER-ORACLE-CERT
  AND TS-NODE-TX-BUILDER-CERT
```

### 9.2 Políglota

```text
LANG-180 =
  X-SOL-TS-RELAYER-CERT
  AND X-VYP-JS-KEEPER-CERT
  AND X-SOLANA-TS-CLIENT-CERT
  AND X-COSMWASM-GO-RELAYER-CERT
  AND X-NEAR-JS-CLIENT-CERT
  AND X-GO-C-FFI-CERT
  AND X-GO-CPP-FFI-CERT
  AND X-TS-DATA-SOL-TX-CERT
```

### 9.3 Corpus

| Primary predicate ID | Condiciones verificables garantizadas por el primary |
|---|---|
| `LANG-190-HARNESS` | `every_scope_family_matrix_complete`, `lineage_split_verified`, `oracle_outside_scan_root`, `corpus_manifest_signed`, negativos y reproducción independiente |
| `LANG-200-HARNESS` | `aggregate_formula_reproduced_independently`, verificación de firma/BOM con fixtures firmados positivos y negativos, sin consumir resultados C7 |

`LANG-190-HARNESS` significa únicamente que el código del harness, schema y
verificadores existe y pasa sus propios tests. Su predicate primary verifica
explícitamente `every_scope_family_matrix_complete`, `lineage_split_verified`,
`oracle_outside_scan_root` y `corpus_manifest_signed`; esas condiciones no son
operandos ocultos del derived.

```text
LANG-190 =
  LANG-190-HARNESS
  AND SOL-EVM-DEFI-C4
  AND VYP-EVM-DEFI-C4
  AND RST-SOLANA-ANCHOR-C4
  AND RST-COSMWASM-C4
  AND RST-NEAR-C4
  AND RST-SUBSTRATE-FRAME-C4
  AND RST-NATIVE-CLIENT-C4
  AND GO-COSMOS-SDK-C4
  AND GO-GETH-CLIENT-C4
  AND GO-RELAYER-ORACLE-C4
  AND C-UTXO-CONSENSUS-C4
  AND C-BRIDGE-FINALITY-C4
  AND C-WALLET-CUSTODY-C4
  AND CPP-UTXO-CONSENSUS-C4
  AND CPP-BRIDGE-FINALITY-C4
  AND CPP-WALLET-CUSTODY-C4
  AND JS-NODE-RELAYER-C4
  AND JS-NODE-KEEPER-ORACLE-C4
  AND JS-NODE-TX-BUILDER-C4
  AND TS-NODE-RELAYER-SDK-C4
  AND TS-NODE-KEEPER-ORACLE-C4
  AND TS-NODE-TX-BUILDER-C4
  AND X-SOL-TS-RELAYER-C4
  AND X-VYP-JS-KEEPER-C4
  AND X-SOLANA-TS-CLIENT-C4
  AND X-COSMWASM-GO-RELAYER-C4
  AND X-NEAR-JS-CLIENT-C4
  AND X-GO-C-FFI-C4
  AND X-GO-CPP-FFI-C4
  AND X-TS-DATA-SOL-TX-C4
  AND TEST-NEG
  AND TEST-META
```

Un commit `[LANG-190-HARNESS]` no cierra `LANG-190`.

### 9.4 Certificación global

`LANG-200-HARNESS` significa únicamente que la infraestructura de sellado,
freeze, reveal, evaluación y fórmula existe y ha pasado fixtures sintéticos
positivos/negativos firmados. Su predicate primary exige
`aggregate_formula_reproduced_independently` y
`release_bom_signature_verification_tested_with_signed_fixtures`; no consume
el BOM, HOLDOUT ni los resultados reales de C7.

```text
LANG-200 =
  LANG-200-HARNESS
  AND LANG-100
  AND LANG-110
  AND LANG-120
  AND LANG-130
  AND LANG-140
  AND LANG-150
  AND LANG-160
  AND LANG-170
  AND LANG-180
  AND LANG-190
```

Un commit `[LANG-200-HARNESS]`, un documento o una campaña parcial no cierra
`LANG-200`.

## 10. Closure de infraestructura común

Los commits de infraestructura primaria usan exclusivamente
`LANG-010-HARNESS`, `LANG-020-HARNESS`, `LANG-030-HARNESS`,
`LANG-040-HARNESS`, `LANG-050A`, `LANG-050B`, `LANG-050C`,
`LANG-080-VALIDATE`, `LANG-080-FILTER`, `LANG-090-HARNESS`,
`LANG-190-HARNESS` y `LANG-200-HARNESS`. `LANG-060` y `LANG-070` conservan sus
IDs de implementación directa.

Los siguientes IDs son agregados derivados; jamás aparecen como el ID de tarea
que un commit declara cerrado. Los cuantificadores `every_required_scope_*` se
expanden de forma determinista sobre los 30 scopes congelados de la sección 6:

```text
LANG-010 =
  LANG-010-HARNESS
  AND every_required_scope_C1

LANG-020 =
  LANG-020-HARNESS
  AND every_required_scope_C0

LANG-030 =
  LANG-030-HARNESS
  AND every_required_scope_C1_replay
  AND TEST-V3

LANG-040 =
  LANG-040-HARNESS
  AND every_required_scope_C3

LANG-050 =
  LANG-050A
  AND LANG-050B
  AND LANG-050C
  AND every_required_scope_C4
  AND TEST-V4

LANG-080 =
  LANG-080-VALIDATE
  AND LANG-080-FILTER
  AND every_required_scope_C4
  AND TEST-NEG

LANG-090 =
  LANG-090-HARNESS
  AND every_required_scope_C4
  AND TEST-META
```

`LANG-060` exige kernels comunes verificados y `LANG-070` exige el motor
EvidenceRequest/fixpoint verificado. Son work packages de implementación, pero
ninguno sustituye los receipts económicos o de request exigidos en cada C4.

## 11. Invalidación y reapertura

Reabre el scope afectado:

- source/corpus/holdout lineage drift;
- parser/compiler/runtime/toolchain/framework change;
- Semantic/Protocol/Economic/Proof IR change;
- adapter, rule, prompt, model o proof policy change;
- budget que modifique cobertura/ranking;
- leak o contaminación descubierta;
- pérdida de artefactos, firmas o reproducción;
- regression en patched/safe/near-miss;
- cambio de exclusions o perfiles.

La reapertura propaga a su language aggregate, `LANG-190`, `LANG-200` y todo
claim dependiente.

## 12. Claims autorizadas

`LANG-200` autoriza exclusivamente:

> Solguard dispone de certificación C5 en los scopes publicados de Solidity,
> Vyper, Rust, Go, C, C++, JavaScript y TypeScript, con las versiones,
> frameworks, familias, perfiles y límites enumerados en el release manifest.

No autoriza:

- “experto en todo el lenguaje”;
- universalidad sobre frameworks o versiones no listados;
- detección de toda familia nueva;
- explotación automática;
- bounty garantizado.

El claim de bugs nuevos requiere además Gate E/H-NOVEL y debe expresarse dentro
del alcance de esas ceremonias. El siguiente producto después de un
`solguard-finding-envelope.v1` válido es explotación; permanece fuera de este
programa.
