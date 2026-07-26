# Plan de madurez por repositorio

## 1. Baseline de partida

Estos son los HEAD limpios observados al iniciar este programa, después de
archivar y eliminar los changelogs históricos:

| Repo | Baseline |
|---|---|
| `solguard-map` | `43c015afd1` |
| `solguard-trace` | `e1b72aa14c` |
| `solguard-discover` | `b3a634e922` |
| `solguard-economic` | `2c2ef1a0df` |
| `solguard-value` | `10b32206f1` |
| `solguard-invariant` | `60018c247b` |
| `solguard-validate` | `14f4d341a2` |
| `solguard-filter` | `8076bb1137` |
| `solguard-diff` | `bca89eda6a` |
| `solguard-database` | `1d1420fb93` |
| `solguard-core` | `15dae21328` |
| `solguard-backend` | `68b9500457` |
| `solguard-deploy` | `51dcff4e16` |
| `solguard-docs` | `d82c2b4331` más el nuevo material documental |
| `solguard-agents` | `65029c4275` |

El baseline debe sustituirse por un manifest firmado antes del primer cambio
funcional. Los hashes de esta tabla son orientación humana, no BOM.

## 2. `solguard-map`

### Responsabilidad final

Convertir un source tree y perfiles de build sellados en una Semantic IR
físicamente verificable. MAP describe programas; no propone ni decide
vulnerabilidades.

### Trabajo requerido

#### Autoridad de frontend

- frontend autoritativo por cada lenguaje;
- build profiles enumerados;
- parser/compiler y versión fijados;
- imports, packages, modules y generated code;
- archivos omitidos como deuda;
- source spans y hashes;
- fallback siempre no autoritativo.

#### Semantic IR

- símbolos overload-safe;
- tipos y layouts;
- CFG;
- SSA/dataflow o equivalente;
- reads/writes;
- aliasing/state regions;
- calls exactas, candidate sets y unresolved;
- control/exception/revert;
- async/atomicity boundaries;
- numeric semantics;
- economic operations;
- evidence lineage;
- capability vector.

#### Identidad económica

- operation occurrences ordenadas;
- causal edges;
- value links;
- asset/unit;
- route/flow identity;
- branch order;
- source/target callable;
- exact duplicate collapse sin perder multiplicidad.

#### Verificador

- replay físico de facts críticos;
- goldens compiler/parser;
- tamper tests;
- streamed verification para artefactos grandes;
- parity Rust/Node cuando exista consumidor Node.

#### Provider de evidencia dirigida

- consumir `solguard-evidence-request.v1` sin interpretar el claim como hecho;
- responder con `solguard-evidence-response.v1` desde source/IR primarios
  sellados;
- ligar request, wave, scope, source root, capability receipt, coverage y
  producer version;
- distinguir `fact`, `absent_with_exhaustive_coverage`, `unknown`,
  `unavailable`, error y `no_progress`;
- nunca convertir fallback, ausencia parcial o texto del candidato en
  evidencia autoritativa;
- nunca compilar `solguard-proof-certificate.v1`: esa autoridad pertenece a
  VALUE.

### Tests obligatorios

- corpus estructural por versión/lenguaje;
- overloads, generics, traits, interfaces, virtual dispatch;
- N-1/N/N+1 de todos los límites;
- ambiguous resolution;
- alpha rename;
- reorder;
- split/merge de archivos;
- build profile alternativo;
- fixtures con comments/strings/decoys;
- source drift, symlink, hardlink y TOCTOU;
- exact negative absence.

### Criterio de salida

- `solguard-semantic-ir.v1` aceptada por TRACE/DISCOVER/DIFF;
- capability tier anterior retirado de claims;
- corpus obligatorio sin fallback;
- hechos críticos reejecutables;
- ningún unresolved convertido en exacto;
- certificación externa, no autoasignada.

### No debe asumir

- que AST presente significa semántica completa;
- que un nombre representa un activo;
- que un edge unresolved no existe;
- que un transfer textual movió valor;
- que ocho parsers equivalen a soporte experto.

## 3. `solguard-trace`

### Responsabilidad final

Construir witnesses causales, temporales, de estado y efectos sobre la IR de
MAP. TRACE distingue MAY/MUST/exact y puede contestar EvidenceRequests
dirigidas.

### Trabajo requerido

#### Procedencia blind

- origen obligatorio en todo canal;
- conocidos desactivados o aislados en `generic_blind`;
- test de exhaustividad de campos puntuables;
- profile `rule_assisted` explícito;
- consumidores fail-closed.

#### Motor común

- recorrido CFG/call graph tipado;
- contexto interprocedural;
- dispatch sets;
- recursion;
- guard lattice;
- state/effect propagation;
- callbacks/reentrancy;
- async/goroutines/promises;
- transaction/epoch/order;
- error/revert/rollback;
- counterevidence;
- route materialization factorada;
- summaries content-addressed por callable/context;
- SCC/recursion/callback fixpoints;
- slices target-scoped desde ProofObligation/EvidenceRequest;
- dominators/post-dominators y path feasibility;
- continuaciones reanudables con frontier/budget/debt;
- cache por source/IR/toolchain/query/policy root;
- prioridad por value movement, privilege, persistent write y external call,
  sin convertir prioridad en evidence.

#### Capability receipt causal

- writer `IR-308` separado del receipt MAP;
- ratios y denominadores de reachability, orden, async, atomicidad y closure;
- trace/source roots, expiry y deuda;
- producer kind indeleble y verificación DEPLOY.

#### Query mode

- consumir `solguard-evidence-request.v1` y emitir
  `solguard-evidence-response.v1` con request/wave/trace roots y provenance;
- resolve callable/edge;
- expand backward root;
- expand forward impact;
- resolve guard/protection;
- materialize state transition;
- cross-transaction sequence;
- atomicity/context;
- bounded frontier y debt.

Cada respuesta declara progreso o `no_progress` y conserva MAY/MUST/exact,
frontier omitido, counterevidence y budgets. TRACE aporta causalidad; no
fabrica un `ProofCertificate`.

### Tests obligatorios

- fuga Go/Node por cada campo;
- conocido presente en source pero sin autoridad;
- known profile positivo;
- paths exactos y over-approx;
- negative/absence sólo con cierre;
- cross-file/cross-module;
- async/callback;
- ambiguous dispatch;
- budget/frontier;
- compact/deep parity;
- request lineage y no-progress.

### Criterio de salida

- `build_generic_trace` deja de autorizar C3+;
- las ocho IR entran por operadores comunes;
- toda decisión TRACE-dependent tiene receipt verificable;
- ningún receipt MAP sustituye el receipt TRACE `IR-308`;
- request multi-wave real;
- cero fuga known blind.

## 4. `solguard-discover`

### Responsabilidad final

Construir el world model y proponer hipótesis tipadas. DISCOVER no produce
evidencia terminal ni convierte ausencia léxica en bug.

### Trabajo requerido

- `solguard-protocol-model.v1`;
- actors, roles y capabilities;
- assets/accounts/ledgers;
- state machines/lifecycle;
- trust boundaries;
- oracles/time/finality;
- messages/callbacks/queues;
- cross-language boundaries;
- configuration/upgrades;
- unknowns y debt;
- rules implícitas desde relaciones;
- counterfactuals;
- known/open-world tracks;
- `origin_class` cerrado: semantic generic, rule pack, model grounded,
  historical retrieval y direct tool;
- rule packs versionados fuera del motor genérico;
- taint conocido/derivado indeleble;
- context envelopes estructurados: source/comments/strings son
  `untrusted_source_data`, nunca instrucciones;
- C y C++ como fuentes reales;
- model proposals compactas no autoritativas.

### Eliminaciones estructurales

- protección inferida sólo por keyword;
- gap por palabra ausente sin coverage;
- binding por family vocabulary;
- source location inventada por modelo;
- candidate high confidence sin ruta/invariante;
- mezcla de known pattern en blind.

### Tests obligatorios

- implementación segura con nombres atípicos;
- vulnerable con nombres neutros;
- helper/modifier/middleware/trait;
- decoy words;
- C/C++;
- alpha rename;
- graph edge reorder;
- model hallucination;
- missing coverage;
- unknown/not-started/budget;
- open-world sin reglas.
- relabel de rule pack/retrieval como genérico;
- ablaciones con mismo input/budget y caches separados.

### Criterio de salida

- world model rederivable;
- hipótesis conservan obligations;
- exploratory leads fuera de VALIDATE;
- open-world medible;
- ninguna inferencia terminal desde texto.

## 5. `solguard-economic`

### Responsabilidad final

Convertir Protocol/Semantic IR y TRACE en un sistema de transiciones
económicas tipado. ECONOMIC no concede proof ni verdict.

### Trabajo requerido

- `solguard-economic-transition-system.v1`;
- `solguard-economic-adversary-model.v1`;
- preconditions;
- state before/after;
- ordered operations;
- asset/account/unit;
- numeric semantics;
- external effects;
- atomicity;
- equations;
- actor-controlled inputs;
- source/TRACE evidence;
- resolution/debt;
- universal economic kernels;
- counterfactual transitions;
- capital/borrow/flash liquidity y repayment;
- market depth/slippage/fees/gas y net delta;
- oracle/TWAP/window/heartbeat/manipulation;
- MEV/order choice/concurrency y bounded sequence optimization.

### Semánticas obligatorias

- requested/received/accounted;
- transfer fee/rebase;
- shares/supply/backing;
- debt/collateral/solvency;
- rate/index/reward;
- oracle price/decimals/freshness;
- rounding/residue;
- mint/burn/lock/unlock;
- nonce/message/context;
- governance/config/migration;
- multi-transaction state.

### Corrección de candidate evidence

`candidate_economic_checks` pasa a ser una query/hypothesis:

- nunca `resolution=resolved` por leer prose;
- no authority independiente;
- puede generar una EvidenceRequest;
- el delta se rederiva desde operations/state;
- source lines se reabren;
- misma ruta y activo exactos.

### Provider de evidencia dirigida

- consumir `solguard-evidence-request.v1` sólo para el mismo transition,
  actor, activo, unidad, route y roots;
- emitir `solguard-evidence-response.v1` desde operaciones, ecuaciones y
  estados rederivados, con supuestos, coverage y counterfactuals explícitos;
- responder `unknown`, `unavailable` o `no_progress` cuando el modelo no
  permite cerrar before/after, delta o protección;
- impedir que una query candidate-derived se autocorroborre;
- no compilar certificados ni conceder `Supported`.

### Tests obligatorios

- dimensional analysis;
- same/different asset;
- rounding;
- zero delta;
- internal ledger vs external transfer;
- requested vs actual received;
- partial transition;
- protection/counterfactual;
- candidate self-corroboration;
- multi-tx.

### Criterio de salida

- canarios controlados producen transiciones concretas;
- ninguna transición concreta procede sólo del candidato;
- VALUE puede consumir ecuaciones exactas;
- coverage parcial bloquea proof completo.

## 6. `solguard-value`

### Responsabilidad final

Compilar y cerrar ProofObligations sobre valor, estado, secuencia, flow, activo
y delta. VALUE produce certificados o refutaciones; no veredictos.

### Trabajo requerido

- `solguard-proof-obligation.v1`;
- obligation set derivado del claim;
- no subconjunto elegido por caller;
- consumir `solguard-evidence-request.v1` y
  `solguard-evidence-response.v1` definidos por CORE/crate neutral;
- responder como provider VALUE cuando CORE solicita before/after o delta, sin
  redefinir el wire schema;
- búsqueda full-set pre-ranking;
- before/after;
- same-flow/same-asset;
- delta concreto adverso no cero o intervalo cuyo dominio completo conserva
  signo adverso, actor, activo y unidad;
- actor loss/beneficiary gain;
- missing/ineffective protection;
- counterexample;
- solver/probe receipt;
- adapters SMT/symbolic, concolic, property fuzzing y simulación de
  snapshots/secuencias, todos acotados y reproducibles;
- `solguard-proof-certificate.v1`;
- explicit no-progress.

### Cierre iterativo

- emitir sólo obligaciones abiertas;
- provider exacto;
- response independent;
- wave lineage;
- effective view sin mutar base;
- fixed point;
- budgets;
- deterministic closure;
- refutation terminal.

### Tests obligatorios

- todas las obligations individualmente ausentes;
- request autorreferencial;
- cross-run/cross-flow/cross-asset;
- top-50 omission;
- duplicate response;
- partial proof;
- solver unknown/timeout;
- three-wave fixture;
- no-progress/fixed-point;
- negative protection;
- patch real.

### Criterio de salida

- proofs completas medibles >0;
- `validate_consumable` equivale a contrato completo;
- cero proof completa con flow parcial;
- cero candidate text como evidence;
- VALIDATE revalida el certificado.

## 7. `solguard-invariant`

### Responsabilidad final

Generar y verificar propiedades tipadas, independientes de la conclusión del
candidato, sobre world/economic model.

### Trabajo requerido

- invariantes base antes de candidatos;
- quantifiers y predicates ejecutables;
- scope exacto;
- relations;
- entity/state/flow/asset/route;
- framework packs;
- applicability;
- preconditions;
- violated/preserved/unknown evaluation;
- specialization rederivada;
- provenance;
- coverage.

### Familias obligatorias

- conservation;
- solvency/backing;
- monotonicity;
- boundedness;
- freshness;
- authorization;
- consumption/replay;
- ordering/atomicity;
- initialization/migration;
- quorum/finality;
- accounting correspondence;
- liveness acotada.

### Provider de evidencia dirigida

- consumir `solguard-evidence-request.v1` ligado al mismo modelo, transition,
  scope y roots;
- emitir `solguard-evidence-response.v1` con predicate ejecutable,
  applicability, evaluación y counterexample/preserved witness;
- declarar `unknown`, deuda acotada y `no_progress` sin reinterpretarlos como
  violación o ausencia;
- demostrar que la propiedad existía o se rederivó independientemente del
  candidate;
- no compilar `ProofCertificate` ni decidir el technical verdict.

### Tests obligatorios

- candidato intenta crear su propia propiedad;
- same family/cross-flow;
- duplicate scope;
- dangling relation;
- bounded omissions;
- counterexample;
- preserved property;
- specialization semantic equivalence;
- eight-language normalization.

### Criterio de salida

- VALIDATE puede evaluar predicates, no sólo family compatibility;
- toda invariance terminal es independiente;
- bounded debt mantiene inconclusive;
- framework packs certificados.

## 8. `solguard-validate`

### Responsabilidad final

Única autoridad del veredicto técnico. Verifica ProofCertificates; no reconoce
un patrón como sustituto de una prueba.

### Trabajo requerido

- ley uniforme de Supported;
- rehydration de primarios;
- consumir y verificar cada `solguard-evidence-response.v1` contra su
  `EvidenceRequest`, provider autorizado, wave, roots, scope, capability,
  coverage y bytes primarios;
- rederivar una muestra bloqueante y toda respuesta crítica; una response
  firmada no sustituye la evidencia subyacente;
- rechazar respuestas cross-run, duplicadas, circulares, sin progreso
  declarado, con provider indebido o con ausencia no exhaustiva;
- exact candidate/invariant/route;
- obligation verification;
- state/delta/protection;
- evidence/counterevidence;
- solver/probe;
- coverage;
- refutation;
- verdict aislado de dedupe/ranking; ningún campo de presentación en el wire;
- calibration metadata;
- reason codes cerrados.

### Tests obligatorios

- tabla de verdad exhaustiva;
- property-based combination de obligations;
- deterministic branch regression;
- candidate-derived invariant;
- forged proof;
- stale artifact;
- solver mismatch;
- debt;
- refuted positives;
- dedupe preservation;
- result ordering.

### Criterio de salida

- 0 Supported sin prueba completa;
- 0 Refuted por falta de datos;
- duplicados conservan truth;
- FILTER rechaza wire inválido;
- final unit/integration/E2E gate.

## 9. `solguard-filter`

### Responsabilidad final

Admitir findings técnicamente supported mediante una segunda verificación
independiente de fuente, protección, efecto, lineage y presentación.

### Trabajo requerido

- `solguard-admission-result.v1`;
- generic proof checker registry;
- framework extensions;
- exact source re-resolution;
- protection effectiveness;
- delta/effect;
- independence group;
- dedupe presentation, grouping y representative determinista bajo autoridad
  exclusiva de FILTER;
- pass/review/reject;
- invalid upstream handling;
- suppression/ineligibility hash-bound con policy/root, rule, scope,
  actor/event, justification y expiry; nunca borra verdad ni métricas;
- `evidence_completeness_score` rubric-bound; alias `confidence` prohibido;
- emitir `solguard-admission-result.v1` y solicitar a CORE la construcción de
  `solguard-review-envelope.v1`; FILTER no posee ni reimplementa el envelope;
- no benchmark inputs.

### Tests obligatorios

- checker missing;
- incomplete proof;
- safe helper;
- delegated protection;
- ambiguous source;
- same lineage twice;
- duplicate;
- suppression expirada, scope/root mutado y TP ocultado del denominador;
- forged candidate;
- stale MAP/invariant;
- economic vs non-economic;
- all eight language packs.

### Criterio de salida

- cero pass sin complete certificate;
- certified families no terminan checker_missing;
- review no es finding;
- output transaccional;
- Core reconcilia exact supported set.

## 10. `solguard-diff`

### Responsabilidad final

Priorizar cambios semánticos que afectan superficies e invariantes. DIFF no
demuestra la vulnerabilidad.

### Trabajo requerido

- C y C++ como lenguajes;
- Semantic IR input con schema/hash/bounds;
- build profiles;
- type/layout;
- storage/state;
- guard/protection;
- call target;
- economic operations;
- units/signedness;
- async/order;
- consumir dos snapshots `solguard-source-authority.v1` sellados por CORE;
- incomplete status;
- cualquier helper Git/GitHub es no autoritativo y entrega bytes a la misma
  adquisición/containment de CORE antes de que DIFF los analice.

### Tests obligatorios

- pequeña diff/gran cambio económico;
- gran diff/semánticamente neutra;
- C/C++;
- build tag/feature;
- storage layout;
- units;
- stale MAP;
- oversized/untrusted JSON;
- source identity drift.
- intento de usar patch, sibling seguro o metadata de diff como evidence de un
  finding blind.

### Criterio de salida

- ocho lenguajes reconocidos;
- prioridad explica facts;
- pares vulnerable/patched sólo alimentan corpus visible de conformance; nunca
  el scan H-GEN/H-NOVEL ni un ProofCertificate blind;
- ninguna prioridad entra como evidence;
- context physically bound.

## 11. `solguard-core`

### Responsabilidad final

Control plane: source authority, run lifecycle, phase DAG, candidates,
EvidenceRequest scheduler, selección de artefactos y publicación final. CORE no
concede verdict ni posee campaign truth, matches, adjudication reviews o
métricas post-scan; sí proyecta los product review envelopes oracle-free
definidos por el pipeline.

### Trabajo requerido

#### Runtime

- `run-spec`;
- ArtifactStore/CAS;
- append-only attempts;
- journal DAG;
- resume/retry/cancel;
- process supervision;
- budgets;
- manifests;
- recovery.

#### Pipeline

- dejar la lista lineal rígida como compatibility;
- DAG base;
- proof waves;
- selected artifacts;
- convergence;
- `product_mode=detection_only` explícito hasta FILTER; `audit_only` sólo reader
  legacy sin writer/default y con retirada tras cero uso;
- exploit unreachable en este scope.

#### Candidates

- known/open separation;
- origin set/primary origin/knowledge taint byte-exact;
- exact binding;
- no overwrite;
- no best family;
- obligations;
- review projection no authority;
- deterministic IDs;
- profiles de ablación sin rutas implícitas a rule packs/retrieval.

#### Model boundary

- proposals sólo semantic fields;
- no locations/evidence del modelo;
- prompt/model digest;
- context packs estructurados y delimitados;
- source/comments/strings siempre `untrusted_source_data`;
- límites de bytes/tokens/items y prohibición de tools/red/filesystem/secrets;
- no oracle;
- no imports ni recursos del evaluator de medición;
- malformed/timeout/degraded.

#### Publication

- post-FILTER;
- colección canónica completa de `FindingEnvelope`, incluidos Pass suprimidos;
- `PublishedFinding` como proyección elegible y publicable;
- `ReviewEnvelope` sólo para admission `Review|Reject`;
- índice completo por artifact ref/digest de TechnicalVerdict sin
  reautorizarlos en CORE, y proyecciones separadas de Inconclusive, Refuted y
  admission Reject, sin llamarlas findings;
- coverage/debt report rederivable y SARIF sólo desde PublishedFinding;
- manifest de artefactos por ID/role/schema/hash/lineage, nunca por filename;
- exact counts;
- AnalyzeOutputs;
- no report pre-FILTER llamado finding.

### Tests obligatorios

- crash/recovery matrix;
- run concurrency;
- dirty drift;
- candidate cross-binding Compound;
- model hallucination;
- EvidenceRequest waves;
- exploit phase unreachable;
- findings/review;
- deterministic replay;
- budgets;
- stale selection.

### Criterio de salida

- ningún output anterior se destruye;
- current clean BOM ejecuta;
- jobs recuperables;
- proof loop real;
- finding final verdadero.

## 12. `solguard-backend`

### Responsabilidad final

Adaptador HTTP autenticado y bounded para jobs CORE. No inspecciona ni decide
artefactos.

### Trabajo requerido

- API jobs;
- run ID;
- status/events/progress;
- cancel;
- manifests, technical verdicts, findings, review, refuted/inconclusive,
  admission rejects y coverage por artifact role;
- readiness autenticada;
- health pública mínima;
- control pool separado;
- concurrency/backpressure;
- timeout/body/rate;
- exact DTOs;
- dependency pins;
- secrets placeholders;
- default profile explícito;
- restart recovery.

### Tests obligatorios

- clean checkout contra pins;
- auth/CORS;
- long jobs;
- eight concurrent;
- control responsiveness;
- cancel;
- restart;
- stale run;
- readiness dependency failure;
- path/secret non-disclosure;
- additive fields.
- passthrough byte-exact de cada role y rechazo de SARIF/proyección que no
  resuelva a su objeto canónico.

### Criterio de salida

- no request larga bloquea control;
- runtime attestation coincide con BOM;
- release no usa compatibility;
- CI remoto realmente verde.

## 13. `solguard-database`

### Responsabilidad final

Persistir conocimiento, runs y mediciones sin convertirse en detector ni
authority primaria de resultados.

### Trabajo requerido

- DBs separadas;
- canonical `benchmarks.sqlite`;
- application ID/schema;
- append-only measurement model;
- signed canonical ingest;
- metric provenance;
- null semantics;
- exact export;
- migration;
- backup/restore;
- quick/integrity checks;
- bounded indexes/queries;
- retention;
- blind DB fresh/empty;
- no ground-truth retrieval al scanner.

### Tests obligatorios

- foreign DB;
- wrong path/hardlink;
- metric swap;
- duplicate bundle;
- identity conflict;
- interrupted transaction;
- corruption;
- migration dry-run;
- round-trip;
- restore;
- corpus growth;
- blind retrieval.

### Criterio de salida

- legacy preservado;
- nuevo path único;
- ingest recomputable;
- backup/restore ensayado;
- backend y deploy fijan misma revisión.

## 14. `solguard-deploy`

### Responsabilidad final

Build, BOM, canarios, aislamiento, corpus, evaluación, gates, telemetría,
release y rollback.

### Trabajo requerido

- cuatro gates independientes;
- cross-artifact metric verifier;
- runtime allowlist detection-only separada de TCB y gobierno;
- scope reachability que excluya cualquier componente de explotación y oracle;
- clean prebuild;
- eight-language canaries;
- known regression contra el 100 % del manifest canónico firmado; `254` sólo
  es expectativa del baseline y todo drift se explica;
- replay current-state de los HEAD/trees iniciales y stage-loss ledger sobre
  snapshots inmutables; puede correr en paralelo con T1/R2, pero
  `BASELINE-009` debe estar accepted antes de abrir/congelar/medir RC-V;
- harness de ablación pareada por origen con denominador/budget/evaluator
  idénticos;
- VM+OCI+CAS blind;
- custody/reveal;
- evaluator separate;
- adjudication;
- confidence intervals;
- resource metrics;
- promotion/rollback;
- dossier.

### Tests obligatorios

- missing/wrong component;
- dirty repo;
- model/config drift;
- zero proof/pass;
- oracle sentinel;
- network/path escape;
- writable input;
- empty DB;
- failed target denominator;
- resume scheduler;
- tamper/signatures;
- tags/BOM;
- rollback.

### Criterio de salida

- known y blind separados;
- contribución de motor genérico, modelo, rule packs y retrieval cuantificada,
  nunca inferida del agregado;
- host process nunca blind;
- 100 % de los targets del manifest firmado contabilizados;
- holdout one-shot;
- thresholds frozen;
- accepted dossier.

## 15. `solguard-docs`

### Responsabilidad final

Documentación verdadera, versionada y trazable de arquitectura, API, contracts,
capabilities, releases, mediciones, límites y runbooks.

### Trabajo requerido

- este programa y su progreso;
- arquitectura as-built;
- contract/schema registry;
- API jobs;
- DB/migration/recovery;
- language certifications;
- claim registry;
- benchmark/holdout methodology;
- finding lifecycle;
- threats;
- limits/residual risks;
- release dossier;
- cross-link/API/schema drift CI.

### Tests obligatorios

- links;
- paths;
- API routes vs code;
- schema names/versions;
- env/defaults;
- repo inventory;
- language claims vs certificates;
- metrics/denominators;
- no claims sin evidence link.

### Criterio de salida

- documentación implementation-based;
- ningún README contradice el producto;
- cada claim de release enlaza evidencia.

## 16. `solguard-agents`

### Responsabilidad final

Coordinar ownership, contratos, dependency trains, task briefs, reviews y
aceptación. No contiene product code.

### Trabajo requerido

- registry exacto para este scope de quince repos;
- product scope separado de topology total;
- contract registry;
- compatibility matrix;
- dependency pins;
- task/verification schemas;
- conflict detection;
- release waves;
- claim reviewers;
- automatic checklist evidence validation;
- PROJECT_CONTEXT actualizado sólo con comportamiento aceptado.

### Tests obligatorios

- repos faltantes explícitamente excluded;
- overlapping ownership;
- contract owner/consumer;
- stale pin;
- workflow path;
- missing verification;
- unsupported claim;
- source-of-truth divergence.

### Criterio de salida

- `validate-coordination` y workflows verdes con el scope real;
- un worker nuevo puede ejecutar cualquier WP sin contexto oral;
- ningún contrato cambia silenciosamente.

## 17. Regla de cierre por repo

Un repositorio no se declara «terminado». Se declara aceptado para una release
concreta cuando:

- sus WPs obligatorios están aceptados;
- sus language/framework packs aplicables están certificados;
- no tiene P0/P1 abiertos;
- full suite y clean CI pasan;
- contratos y consumidores coinciden;
- E2E del BOM final pasa;
- limitaciones residuales están publicadas;
- tag inmutable coincide con el commit medido.
