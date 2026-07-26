# Programa estructural de implementación

## 1. Cómo se ejecuta este programa

Cada primary acceptance package tiene un ID estable para DAG, integración,
estado y claim. Cada commit multi-repo que lo alimenta tiene además un
`contribution_id` owner-único. El primary ID se usa en:

- manifests;
- checklist;
- dossier de release.

El `contribution_id`, no el parent primary, se usa en branch, task brief,
commit e informes de implementación/verificación. Un primary de un solo owner
puede despacharse directamente; uno multi-repo sólo se integra cuando todas sus
contribuciones exactas están aceptadas. Reutilizar el parent como branch en dos
repos, omitir una contribución o compartir evidence root falla cerrado.

Un work package no puede comenzar si una dependencia `hard` no está ready:
primary/contribution `accepted`, derived `satisfied=true` en la misma revisión.
Una dependencia `contract` puede avanzar en dual-read, pero no
puede activar el nuevo comportamiento de release hasta cerrar productor y
consumidores.

La unidad de entrega es un slice vertical. No se acepta cerrar un productor sin
probar al menos su consumidor inmediato y CORE cuando el wire entre en el
pipeline.

### 1.1 Dos candidate epochs, una sola dirección

La ejecución prioriza utilidad sin fingir producto completo:

1. common stack + Solidity + tooling de medición forman `RC-V-EVM-1`;
2. se valida, congela y mide como dominio `bounty_vertical`;
3. pase o falle, su evidencia completa se cierra en
   `VERTICAL-EVM-CONTAMINATION-CLOSE-001`;
4. los demás lenguajes y tooling full crean `RC-FULL-1`;
5. éste repite validation/freeze/corpus/campaign sobre instancias nuevas y es el
   único dominio que puede llegar a FINAL-007.

Freeze es por epoch. Un commit posterior no modifica el candidato antiguo; crea
otro root. Capacidades/contratos pueden compartir SHA, pero no se comparten
validation events, corpus, canary, known, pair, run, reveal, report, LIVE o
claim. El closure set de cada train se congela antes de medir y nunca se amplía
para cambiar el resultado.

El candidate fija la aceptación **versionada**, no el estado live de un ID:
subject/version/content root, acceptance event y operand-state root exactos para
cada miembro. Open, freeze y close son transiciones create-only con revision,
previous hash/root y compare-and-swap. Un cierre emite
`solguard-candidate-epoch-closure-receipt.v1` con el claim materializado,
terminal states y firmas/timestamp quorum. Una reapertura posterior propaga sólo
a epochs todavía abiertos que consuman ese subject; no reescribe un receipt ni
un claim histórico cerrado.

## 2. Estados y gates

| Estado | Significado | Autoridad para concederlo |
|---|---|---|
| `planned` | Brief aprobado | coordinador |
| `implemented` | Código y tests escritos | worker |
| `locally_verified` | Suite propia verde | worker |
| `contract_verified` | Goldens y consumidores compatibles | contract reviewer |
| `integrated` | CORE/Backend/Deploy consume el cambio | integration reviewer |
| `measured` | E2E real genera evidencia | measurement reviewer |
| `accepted` | Todos los criterios y negativos pasan | acceptance reviewer |
| `terminal_failed` | Se ejecutó completo y no superó threshold/predicate | measurement + acceptance reviewer |
| `terminal_invalid` | La instancia quedó causal/contractualmente inválida | evidence authority + verifier |
| `insufficient_evidence` | Denominador/potencia/cobertura no permiten decidir | measurement authority + verifier |
| `terminal_not_run` | Un ancestor non-pass hace el gate no ejecutable; path causal verificado | acceptance integrator + verifier |
| derived `satisfied` | Fórmula true sobre operand-state hash exacto; no es state mutable | deterministic evaluator + verifier |

`accepted` es el único estado que permite marcar `[x]` en un gate de pass.
Los cierres non-pass se muestran como `[!]`, preservan evidencia y no satisfacen
dependencias métricas. El porcentaje de release se calcula contra el closure
ID-set del candidate solicitado; la historia vertical permanece visible, pero
no se suma ni se exige como pass de RC-FULL. Sólo un RC-FULL closure 100 %,
derived satisfechos y FINAL-007 autorizan «plan completo».

Si un gate terminal impide ejecutar descendants operacionales, se registra cada
descendant como `terminal_not_run` con blocker y dependency path verificados.
Después se materializan los derived/claims como `false` y se cierra el candidate
`closed_nonpass`; no se deja una campaña fallida eternamente `pending`, no se
emiten tags y no se abre otro epoch hasta cerrar contaminación cuando aplique.

## 3. Fase G0 — Baseline, vocabulario y gobierno

Objetivo: impedir que el programa nazca con claims, versiones o ownership
ambiguos.

### GOV-001 — Congelar el baseline inicial

Owner: `solguard-deploy`.

Colaboradores: `solguard-agents`, `solguard-docs`.

Trabajo:

- capturar los quince HEAD, trees, contenido dirty y remotes;
- distinguir `audit_baseline_root` con los quince HEAD de `03` de
  `program_bootstrap_root` después de versionar este plan y los quince commits
  C0-101..115; conservar ambos y probar que el delta exacto está limitado al
  material documental/changelogs allowlisted, sin product/runtime code;
- registrar que el informe y este plan forman el baseline documental;
- inventariar versiones Cargo/npm, versiones de artefactos y nombres de
  binarios;
- capturar suites y skips actuales;
- clasificar la base `benckmarks.sqlite` como legacy diagnóstica;
- declarar que `benchmarks.sqlite` no se inicializa aún;
- registrar los P0/P1 de la auditoría como risks abiertos.

Validación:

- dos ejecuciones del generador producen el mismo baseline semántico;
- un cambio tracked, staged, untracked, gitlink, binary o schema altera el hash;
- paths faltantes y repos no declarados fallan;
- el manifest no contiene secretos ni contenido de holdout.

Done:

- `solguard-maturity-baseline.v1.json`;
- firma o self-hash verificado;
- informe de comandos;
- comparación automática con `registry/repos.json`.

### GOV-002 — Diccionario canónico de producto

Owner: `solguard-docs`.

Trabajo:

- congelar `signal`, `lead`, `candidate`, `proof`, `supported`, `refuted`,
  `inconclusive`, `pass`, `review`, `reject`, `finding`, `match`, `detected`,
  `known`, `blind`, `novel`, `expert` y `release`;
- actualizar todo texto que use estos conceptos de forma ambigua;
- añadir linter de términos prohibidos en contextos de claim.

Validación:

- buscar todos los usos en los quince repos;
- fixtures de documentación válidos e inválidos;
- ningún README llama finding a un resultado pre-FILTER;
- ningún contrato o gate usa los aliases prohibidos `release_eligible` o
  `finding_eligibility`.

### GOV-003 — Registro machine-readable de contratos

Owner: `solguard-agents`.

Trabajo:

- contrato;
- owner;
- producer;
- consumidores;
- schema/version;
- compatibilidad;
- golden source;
- release requirement;
- repos y paths;
- reviewer obligatorio.

Validación:

- owner ausente, consumidor no registrado, versión incompatible, copia
  divergente y dependency pin flotante fallan;
- cada cambio de contrato exige actualizar el registro;
- la validación se ejecuta en CI.

### GOV-004 — Política de workers y aceptación

Owner: `solguard-agents`.

Trabajo:

- briefs pequeños con ownership disjunto;
- worker y verifier separados;
- contrato de informe final;
- reglas de commit/revert;
- registro de evidencia;
- prohibición de autoaceptación;
- matriz de reviewers por plano.

Validación:

- un brief sin negativos, comandos, owner o final report no valida;
- dos workers con los mismos archivos no pueden entrar en la misma wave;
- una checklist sin evidence digest no se puede marcar.

### GOV-006 — Briefs ejecutables y ownership disjunto

Owner: `solguard-agents`.

Dependencia: `GOV-004`.

Trabajo:

- generar cada brief exclusivamente desde un nodo primary y su revisión exacta
  del acceptance ledger;
- exigir repo, base SHA, branch, archivos editables/read-only/prohibidos,
  dependencias, contratos, postcondiciones y stop conditions;
- calcular intersecciones de ownership entre tasks de la misma wave;
- rechazar comandos genéricos, outputs sin ruta y verificaciones que todavía no
  existen sin una tarea que las implemente;
- validar que el formato de informe incluye diff, commits, exit codes, negativos,
  E2E, riesgos y evidence root.

Validación:

- fixtures de brief válido, owner ausente, glob amplio, dos tasks sobre el mismo
  archivo, dependencia móvil y comando sin resultado esperado;
- el dispatcher no crea branch ni worker para un nodo derived;
- un cambio en el ledger invalida briefs ya generados.

Done:

- generador y schema del brief;
- linter CI;
- matriz de colisiones;
- goldens válidos e inválidos.

### GOV-007 — Separación verificable de implementación y aceptación

Owner: `solguard-agents`.

Dependencia: `GOV-004`.

Trabajo:

- registrar identidades de implementer, verifier e integrador;
- impedir que el mismo run, contexto o credencial firme implementación y
  aceptación;
- hacer que el verifier reproduzca desde checkout limpio y evidence bundle,
  sin estado privado del worker;
- exigir firmas autorizadas, timestamps externos cuando apliquen y
  dependency-state hash vigente;
- rechazar autoaceptación, delegación circular y reutilización de un review
  contra otra versión del nodo.

Validación:

- misma identidad, misma clave, firma replay, node_version distinto, evidence
  root mutado y dependencia reabierta fallan;
- dos GPTs bajo la misma persona/credenciales no satisfacen ceremonias que
  requieren separación humana;
- un `REJECT` nunca promueve el nodo.

Done:

- policy machine-readable;
- verifier de separación;
- suite adversarial de firmas y replay;
- evento de aceptación auditable.

### GOV-008 — Guard de alcance detection-only

Owner: `solguard-agents`.

Dependencia: `GOV-003`.

Trabajo:

- fijar allowlist de los quince repositorios y de capacidades de detección;
- prohibir producto de explotación, PoC ejecutable, envío de reportes y
  componentes fuera del workspace declarado;
- clasificar cada archivo, contrato, dependencia y task contra el scope
  preregistrado;
- bloquear branches, commits y evidence bundles con rutas o capacidades no
  autorizadas;
- conservar una lista explícita de non-goals hasta el cierre.

Validación:

- fixtures que intentan añadir `solguard-exploit`, ejecución de PoC, reporte,
  repo dieciséis, path traversal y symlink fuera de root;
- referencias documentales al siguiente paso no cuentan como implementación;
- ningún artifact runtime adquiere capacidad de explotación.

Done:

- scope manifest detection-only preregistrado y firmado;
- linter de repos/rutas/capacidades;
- tests de bypass;
- receipt de funcionamiento del guard.

`GOV-008` fija y hace cumplir la política antes del trabajo de producto. No
afirma que el runtime final esté cerrado: `SCOPE-900` prueba esa closure en C7
contra los BOM y los 30 manifests C0 reales.

Gate G0:

- GOV-001 a GOV-008 aceptados;
- baseline inmutable;
- vocabulario único;
- topología y scope explícitos.

### BASELINE-009 — Replay current-state y ledger de pérdidas

Owner: `solguard-deploy`.

Dependencia: `GOV-001`.

Esta medición se ejecuta en worktrees/containers de `audit_baseline_root` y
puede avanzar en paralelo con T1 y R2. Sólo capturar/fijar ambos baseline roots
es precondición para empezar cambios. `BASELINE-009` sí es hard antes de abrir o
congelar `RC-V-EVM-1`, seleccionar corpus/holdout o usar cifras como comparación.

Trabajo:

- replay canónico current-state de v1–v8 y del manifest completo de 90 labs,
  sin corregir el candidate auditado;
- reconstruir por truth item/protocolo la primera pérdida observable en
  source/preflight, MAP, TRACE, DISCOVER, candidate, invariant binding,
  ECONOMIC, VALUE, VALIDATE o FILTER;
- conservar `missing|not_observable` si el pipeline histórico no emitía la
  evidencia; jamás imputar una etapa conveniente;
- publicar volumen, recall, precision, ranking, burdens completos, tiempos,
  recursos, degradaciones y discrepancias frente a la auditoría anterior.

Done:

- `solguard-current-replay-baseline.v1.json`;
- `solguard-stage-loss-ledger.v1.jsonl` con denominadores y artifact refs;
- informe que declara explícitamente que v1–v8/90 labs son KNOWN y no evidencia
  de generalización ciega;
- dos reproducciones del evaluator dan los mismos counts/roots.

## 4. Fase T1 — Reparar verdad y medición

Objetivo: que Solguard no pueda volver a contabilizar una hipótesis incompleta
como bug detectado.

### TRUTH-101 — Ley uniforme de `Supported`

Owner: `solguard-validate`.

Trabajo:

- retirar bypasses por patrón determinista, familia o fuente;
- exigir el contrato completo de
  [finding válido](01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md#4-contrato-de-un-finding-válido);
- centralizar la decisión terminal;
- producir diagnósticos por obligación;
- exigir invariante independiente;
- distinguir seguridad no económica de claim económico.

Negativos obligatorios:

- eliminar una a una ruta, transición, delta, unidad, flow, asset, invariante,
  contradicción, protección, evidencia MAP, evidencia TRACE y cobertura;
- en cada caso el resultado es `Inconclusive` o `Refuted`, nunca `Supported`;
- el candidato Compound auditado deja de ser `Supported`.

E2E:

- vulnerable completo → `Supported`;
- patch → `Refuted` o sin candidato;
- near-miss → no `Supported`;
- known rule sin proof → `TechnicalVerdict Inconclusive`, sin
  `AdmissionResult`, sin FILTER y sin `ReviewEnvelope`.

### TRUTH-102 — Veredicto y dedupe ortogonales

Owner: `solguard-validate`.

Consumidor: `solguard-filter`.

Trabajo:

- conservar `technical_verdict` byte a byte ante cualquier agrupación posterior;
- mantener fuera de `solguard-technical-verdict.v1` los campos
  `dedupe_group`, `canonical_parent_id` y `presentation_role`;
- no permitir que un duplicado supported se convierta en inconclusive;
- separar ranking de verdad;
- emitir únicamente identidad causal suficiente para que FILTER agrupe sin
  reescribir verdad.

Validación:

- todos los miembros del grupo conservan su veredicto;
- aplicar distintos órdenes y políticas de presentación no cambia ningún byte
  del veredicto;
- FILTER recibe el conjunto exacto de supported, sin metadata de presentación
  autoritativa procedente de VALIDATE.

### TRUTH-103 — Admisión FILTER independiente

Owner: `solguard-filter`.

Trabajo:

- definir `solguard-admission-result.v1`;
- verificar que todo upstream `Supported` cumple el schema de verdad;
- devolver input inválido si VALIDATE contradice su propio contrato;
- revalidar spans, protecciones, flow, asset, delta, lineage y deuda;
- separar `pass/review/reject` de dedupe;
- emitir `dedupe_group`, `canonical_parent_id`, `presentation_role` y
  representative determinista bajo autoridad exclusiva de FILTER;
- impedir que grupos cross-flow/cross-asset se fusionen y que el orden cambie el
  representante;
- sustituir la falsa corroboración de «dos líneas» por `independence_group` y
  ancestor-set roots; MAP→TRACE se comprueba como consistencia cross-layer, no
  como corroboración independiente;
- tipar `ineligibility`/suppression con kind, policy ID/version/root, rule,
  scope, actor/key, decision event, justificación, timestamps y expiry;
- conservar toda supresión fuera de verdad, matching, denominadores y métricas.

Validación:

- evidence derivada del mismo candidato no cuenta dos veces;
- `checker_missing` jamás produce pass;
- proof incompleto jamás produce pass;
- una protección o contradicción causal exacta sobre un upstream `Supported`
  produce `invalid_upstream`, cuarentena y reapertura de VALIDATE; nunca se
  oculta como `Reject`;
- ambigüedad produce review;
- scores no anulan hard gates;
- policy/root/scope/actor/expiry mutado, suppression silenciosa, TP eliminado
  del denominador y precision que cambia por ocultación fallan.

### TRUTH-104 — Cerrar fuga `generic_blind`

Owner de aceptación: `solguard-core`.

Colaboradores serializados: `solguard-trace`, después `solguard-discover`,
después `solguard-core`. Sus commits son evidence refs disjuntos y no aceptan
por sí solos el nodo.

Trabajo:

- etiquetar procedencia en guardas, reads/writes, calls, evidence, deep paths,
  semantic context, economic checks y rutas;
- desactivar o aislar catálogos exactos en `generic_blind`;
- hacer que consumidores rechacen `known_pattern`;
- separar perfil `rule_assisted`;
- inventariar todos los canales puntuables mediante un test de exhaustividad.

Negativos:

- Go/Node con identificadores conocidos;
- renombrado;
- señal copiada a cada campo aceptado;
- nested alias;
- source text y semantic ID;
- patrón conocido que intenta entrar vía DISCOVER.

Done:

- golden end-to-end que proyecta el artefacto completo;
- ningún canal sin `origin`;
- canary sentinel de patrón conocido produce cero autoridad blind.

### TRUTH-105 — Publicación post-FILTER

Owner: `solguard-core`.

Consumidores de `solguard-finding-envelope.v1`: `solguard-backend`,
`solguard-deploy`, `solguard-database` y `solguard-docs`/UI. El reviewer de
Deploy consume además `solguard-review-envelope.v1`.

Este trabajo publica schemas, goldens, lectores y un projector puro
`AdmissionResult → envelopes/projection`, con el writer de producto
desactivado. No corta el pipeline ni escribe los bundles autoritativos de una
ejecución. `DECIDE-604` es el único trabajo que integra y activa ese projector
como writer de producto en CORE.

Trabajo:

- `findings.json/md` sólo desde `Pass`,
  `publication_eligibility=eligible` y `presentation_role` en
  `{unique, representative}`;
- colección append-only `finding_envelopes_all` con cada
  `solguard-finding-envelope.v1` procedente de `Pass`, aunque quede suprimido
  por ineligibilidad o dedupe;
- `review_queue.json/md` separado;
- `validation_findings.md` renombrado como diagnóstico si se conserva;
- `AnalyzeOutputs` con rutas inequívocas;
- métrica `detected_findings` derivada únicamente de los
  `PublishedFinding` canónicos.

Validación:

- un fixture equivalente al canario archivado se interpreta como cero
  detecciones;
- cinco `AdmissionResult Review|Reject` auténticos, derivados de cinco
  `TechnicalVerdict Supported` y cinco certificados completos, generan
  findings vacío y exactamente cinco `ReviewEnvelope`;
- cinco Supported seguidos de crash, timeout, schema mismatch o
  `invalid_upstream` antes de producir `AdmissionResult` generan cero
  `ReviewEnvelope`, conservan los cinco upstream y emiten failure receipts de
  fase/run;
- un pass genera exactamente un `FindingEnvelope`, no necesariamente un
  `PublishedFinding`;
- un pass `ineligible` conserva exactamente un envelope, publica cero findings
  y no entra en review;
- un grupo duplicado conserva todos sus envelopes, publica exactamente su
  representante y no altera ningún TechnicalVerdict;
- same-ID/body drift falla;
- Markdown se rederiva desde JSON y compara.

### TRUTH-106 — Métricas con procedencia

Owner: `solguard-deploy`.

Consumidor: `solguard-database`.

Trabajo:

- fijar los requisitos y el mapping interno de lineage para cada métrica, con
  cualquier writer del contrato canónico todavía desactivado;
- productor, artefacto, JSON Pointer, tipo, unidad y denominador por métrica;
- cross-check entre primarios, summaries, funnel, pre-release y measurement;
- retirar mapeos manuales ambiguos;
- diferenciar raw, canonical, validate cohort, supported, pass, review y match.

`TRUTH-106` no produce `solguard-metric-provenance.v1`. Entrega el mapping
oracle-free que MEASURE-901 consume para publicar el schema post-scan; el
artefacto canónico sólo lo emite EVAL-908 después de que sus lectores estén
desplegados.

Negativos:

- 230 no puede ocupar `canonical_candidates`;
- 192 no puede ocupar `deep_paths`;
- nullable no se convierte en cero;
- denominadores incompatibles no se agregan;
- CSV no puede ser autoridad primaria.

### TRUTH-107 — Gates con nombres y semánticas separados

Owner: `solguard-deploy`.

Decisiones:

- `measurement_integrity`;
- `verdict_truth_integrity`;
- `product_health`;
- `blind_evaluation_eligibility`.

Trabajo:

- retirar booleano ambiguo;
- `product_health` exige cierre VALUE y FILTER según el claim;
- `measurement_integrity` puede aprobar evidencia de un mal producto;
- todos los blockers tienen código, evidencia y severidad;
- no hay soft-fail en promoción.

Validación:

- cero proofs/zero pass no autoriza product health;
- artefactos coherentes con cero detección sí pueden autorizar measurement;
- host boundary no autoriza blind;
- un finding no matched sigue contando para precision/adjudicación.

### TRUTH-108 — Corregir dependency pin y defaults peligrosos

Owner: `solguard-backend`.

Trabajo:

- pin compatible de database;
- CI clean-checkout real;
- default explícito por ruta y modo;
- release obliga `generic_blind`;
- `.env` sólo con placeholders;
- comparación de secretos apropiada;
- docs y tests alineados.

### TRUTH-109 — Preparar y ensayar el rechazo de escrituras legacy

Owner: `solguard-database`.

Dependencias: `TRUTH-105`, `PLAT-801`.

Trabajo:

- inventariar todos los writers de findings, review y métricas legacy;
- implementar dual-read y write-new detrás de flags desactivados;
- ligar cada escritura nueva a run, artifact root, schema y decisión canónica;
- implementar el rechazo de tablas, columnas, endpoints y payloads legacy,
  pero ensayar su activación sólo sobre una réplica efímera;
- registrar todo intento posterior al corte sin reinterpretarlo ni migrarlo en
  silencio.

Validación:

- payload antiguo, columna desconocida, finding pre-FILTER, cross-run root,
  downgrade y writer rezagado fallan;
- backup/restore de ensayo conserva el punto de corte simulado;
- readers antiguos no fuerzan reactivar writers antiguos.

Done:

- inventory y rehearsal receipt;
- constraint o trigger de rechazo;
- telemetría sintética a cero y distinta de la evidencia de cutover real;
- matriz old/new y new/new firmada.

`TRUTH-109` demuestra que el guard existe y funciona; no crea
`benchmarks.sqlite`, no cambia autoridad y no activa el rechazo en producción.
`DB-902` es el único trabajo autorizado para hacerlo tras reconciliación real.

### TRUTH-110 — Suite global de cero bypass

Owner: `solguard-deploy`.

Dependencias: `TRUTH-101` a `TRUTH-109`.

Trabajo:

- componer en un único harness todos los bypasses de verdad, origen, proof,
  admisión, dedupe, publicación y métrica;
- mutar o retirar una obligación por ejecución;
- intentar elevar scores, duplicados, fallos de checker, artefactos corruptos y
  provenance conocida hasta `Pass`;
- comparar la colección completa de FindingEnvelope, su proyección
  PublishedFinding y la review queue contra los primarios;
- publicar denominador completo de mutantes e intentos.

Validación:

- cada mutante termina en `Refuted`, `Inconclusive`, `Review`, `Reject` o fallo
  tipado; nunca `PublishedFinding`;
- cero mutantes no ejecutados, skipped o reclasificados;
- el harness falla si aparece un canal scoreable nuevo sin mutante.

Done:

- manifest de bypasses;
- resultados machine-readable;
- replay limpio;
- gate obligatorio de todos los perfiles de release.

Gate T1:

- TRUTH-101 a TRUTH-110 aceptados;
- fixture Compound reinterpretado honestamente;
- cero atajos a Supported;
- cero fugas conocidas blind;
- las métricas del CSV antiguo son rechazadas.

## 5. Fase R2 — Runtime inmutable por ejecución

### RUN-201 — Crate neutral de contratos

Owner: workspace `solguard-core`.

Nombre propuesto: `solguard-artifact-contracts`.

Contenido permitido:

- wire types;
- schemas;
- canonical JSON;
- IDs y framing;
- verificadores puros;
- golden vectors;
- error enums.

Contenido prohibido:

- heurísticas;
- detector rules;
- acceso a benchmark;
- ejecución de tools;
- política de veredicto.

Los contratos semánticos específicos siguen siendo propiedad de su productor.
El crate sólo evita copias divergentes de primitivas compartidas.

Migración:

1. inventariar todas las copias vendorizadas y sus hashes;
2. publicar crate, schemas y goldens;
3. activar dual-read en cada consumidor por commit independiente;
4. demostrar parity entre copia y contrato canónico;
5. hacer que el productor emita el contrato nuevo;
6. observar y firmar cero lecturas legacy;
7. retirar cada copia autoritativa en commits separados;
8. añadir un linter CI que impida reintroducir implementaciones duplicadas.

Gate:

- todos los consumidores registrados han migrado;
- la matriz old/new y new/new pasa;
- el registry apunta a una única fuente canónica;
- cero copia vendorizada conserva autoridad;
- la retirada no ocurre en el mismo commit que el nuevo productor.

### RUN-202 — `solguard-run-spec.v1`

Owner: `solguard-core`.

Incluye:

- run ID;
- `product_mode=detection_only` obligatorio para writers nuevos;
- candidate epoch ID/root, freeze event/root, candidate manifest/root y
  accepted input membership root;
- source authority;
- análisis/profile;
- tools y binarios;
- model/prompt/config;
- budgets;
- features;
- output root;
- contract versions;
- forbidden capabilities;
- determinism policy;
- `materiality_profile_id`, versión y root canónico;
- taxonomía/algoritmo genérico no identificante para clases de impacto y lower
  bound en unidades nativas;
- `policy_set_commitment_root` hiding y común a la cohort, sin policies, leaves,
  salts, IDs, URLs, mappings ni membership proofs;
- reglas genéricas de unidades, freshness, valoración conservadora,
  incertidumbre y activos sin precio;
- horizonte, privilegio, capital, timing, repeticiones, estado previo y demás
  prerrequisitos que limitan el lower bound.

`audit_only` sólo puede entrar por reader legacy tipado; no es default, no se
reescribe como run nuevo y se retira tras cero lecturas. Campo ausente,
desconocido, cross-epoch o binding indirecto al state live falla antes de
ejecutar. Todo output/envelope/manifest repite el epoch binding byte-exact.

El perfil de materialidad cubre pérdida directa, mint/deuda no autorizados,
insolvencia/backing deficit, freeze económico cuantificado,
control/gobernanza, extracción por fees/rewards/accounting y disponibilidad
con impacto económico. El scanner emite clase/lower bound nativo, nunca
severidad del bounty. La policy target-specific y su mapping se abren en el
evaluator sólo después de sellar/reveal; ahí se verifica membership contra el
commitment y se deriva `program_severity`. Mapping ausente, precio stale,
unidades incompatibles o lower bound insuficiente produce `unclassified`.

Validación:

- UUID/identidad no colisionable;
- paths contenidos;
- config desconocida falla;
- hash semántico estable;
- timestamps fuera del hash reproducible;
- delta mínimo rotulado critical, upper-bound-only, stale price, cross-asset
  incompatible, privilege/repetition drift, policy drift y root swap fallan;
- A/B comparten el materiality root genérico, pero cada cohort y LIVE conserva
  su propio policy-set commitment precongelado;
- dictionary/fingerprint/leak tests demuestran que la imagen y host scanner no
  pueden resolver una policy leaf o identidad desde el commitment;
- no existe reclasificación de severidad después de la evaluación firmada.
- `audit_only`, product mode omitido, artifact RC-V en run RC-FULL, freeze
  event/root distinto y membership receipt stale fallan.

### RUN-203 — ArtifactStore append-only

Owner: `solguard-core`.

Trabajo:

- root `runs/<run_id>`;
- attempts create-only;
- staging mismo volumen;
- rename atómico;
- flush/fsync/`FlushFileBuffers` de file y persistencia de directory entry o
  equivalente documentado antes de publicar complete;
- durability receipt por artifact/manifest y recovery probe desde proceso/boot
  nuevo;
- manifest exacto;
- stable reads;
- link/hardlink/reparse/TOCTOU;
- optional CAS;
- retención y GC explícitos;
- pin/refcount inmutable de todo artifact alcanzable desde candidate cerrado,
  ledger, dossier, DSSE, tag, transparency receipt o release;
- archive/restore verificable sin romper digests ni locator history.

Validación:

- output preexistente;
- crash antes/durante/después de rename;
- disco lleno;
- cambio de identidad;
- alias Windows;
- dos runs concurrentes;
- intento fallido conservado;
- run anterior inmutable;
- fault injection/power cut antes/después de cada flush/rename/manifest complete;
- GC intenta borrar un artifact pinneado, pin drift, archive corrupto y restore
  en entorno nuevo.

### RUN-204 — Journal DAG y cronología

Owner: `solguard-core`.

Trabajo:

- attempts;
- dependencias por hash;
- inputs/outputs;
- budgets;
- capabilities;
- start/end wall y monotonic;
- exit/process;
- deuda;
- retry/resume lineage.

Validación:

- no timestamp derivado restando duración;
- orden causal verificable;
- un nodo no puede consumir output no seleccionado;
- journal incompleto no cierra run.

### RUN-205 — Resume, retry y cache keys

Owner: `solguard-core`.

Trabajo:

- cache key por source, toolchain, contract, config, model y inputs;
- reuso sólo read-only;
- retry con attempt nuevo;
- resume desde manifest;
- selección hash-bound;
- invalidación por drift.

Validación:

- modificar un byte de cada input invalida reuso;
- exact resume no ejecuta fases cerradas;
- versión legacy no se reutiliza en release;
- selección stale falla.

### RUN-206 — Cancelación y supervisión

Owner: `solguard-core`.

Consumidor: `solguard-backend`.

Trabajo:

- cancellation token;
- deadline;
- process tree;
- cooperative close;
- forced bounded cleanup;
- exit/debt receipt;
- endpoint/lock release.

Validación:

- cancelar en cada fase;
- child/grandchild;
- process que ignora señal;
- cleanup failure;
- run coherente incompleto;
- no proceso o puerto huérfano.

### RUN-207 — Publicación tool-owned

`RUN-207` es un gate derivado, no una tarea multi-owner. Sus hijos primarios
de owner único son:

- `RUN-207-MAP`;
- `RUN-207-TRACE`;
- `RUN-207-DISCOVER`;
- `RUN-207-ECONOMIC`;
- `RUN-207-INVARIANT`;
- `RUN-207-VALUE`;
- `RUN-207-VALIDATE`;
- `RUN-207-FILTER`;
- `RUN-207-DIFF`;
- `RUN-207-CORE-READER`;
- `RUN-207-CORE-CUTOVER`;
- `RUN-207-DATABASE`;
- `RUN-207-BACKEND`;
- `RUN-207-DEPLOY`.

`RUN-207 = AND(todos los hijos) AND RUN-207-E2E`, donde `RUN-207-E2E` verifica
la publicación interrepo completa sin escribir directamente en paths de otra
tool. Ningún hijo puede cerrar el umbrella.

Orden hard: `CORE-READER`, `DATABASE`, `BACKEND` y `DEPLOY` aceptan dual-read;
después publican los nueve tools; `CORE-CUTOVER` activa canonicalización y
retirada; finalmente `RUN-207-E2E` prueba el sistema integrado.

Trabajo:

- aceptar output staging otorgado;
- no asumir `project/tool-outputs`;
- bundle create-only;
- `tool_phase.json` propio; cada fichero declara
  `schema_version=solguard-tool-phase.v1`, no introduce un schema por nombre de
  fichero;
- manifest;
- fallo sin bundle parcial.

Orden:

1. MAP;
2. DIFF;
3. TRACE;
4. DISCOVER;
5. ECONOMIC;
6. VALUE;
7. INVARIANT;
8. VALIDATE;
9. FILTER;
10. CORE activa runtime nuevo.

### RUN-208 — Manifest final y portabilidad

Owner: `solguard-core`. Verificador: `solguard-deploy`.

Trabajo:

- seleccionar exactamente un attempt por phase/wave;
- bindings relativos y físicos;
- toolchain BOM;
- `solguard-product-artifact-manifest.v1` con IDs, roles tipados, payload
  schema/version, producer, run/phase/wave/attempt, source/parent roots,
  digests, size, sequence, complete marker, confidentiality y locator CAS;
- colección product completa, proyecciones publicables y review envelopes como
  roles distintos; filenames, extensiones y paths son display/transporte;
- telemetry;
- closure y self-hash.

### RUN-209 — Eliminar handoffs implícitos

Owner: `solguard-core`.

Dependencias: `RUN-207`, `RUN-208`.

Trabajo:

- inventariar tmp files, rutas convencionales, cwd compartido, env vars y
  sidecars usados como handoff autoritativo;
- sustituir cada handoff por artifact ID, phase, producer, root y lineage del
  ArtifactStore;
- permitir temporales sólo dentro de un attempt y sin consumidores externos;
- rechazar descubrimiento por filename, mtime, glob o “último archivo”;
- demostrar cero lecturas de rutas legacy antes de retirarlas.

Validación:

- concurrencia con nombres iguales, cwd distinto, mtime invertido, temp
  preexistente, symlink, archivo parcial y crash entre write/rename;
- un artifact no registrado no puede consumirse aunque exista físicamente;
- búsqueda global y telemetría confirman cero handoffs autoritativos implícitos.

Done:

- inventory/removal manifest;
- linter de accesos prohibidos;
- E2E concurrente;
- receipts de cero uso legacy.

### RUN-210 — Fail-closed de artifacts y roots

Owner: `solguard-core`.

Dependencias: `RUN-203`, `RUN-208`.

Trabajo:

- verificar schema, self-hash, producer, run ID, phase, parent roots y complete
  marker antes de abrir payloads;
- distinguir absent, corrupt, incompatible, foreign-root, partial y tampered;
- propagar fallo/deuda hasta manifest, verdict y health;
- impedir fallback a archivos legacy, cache anterior o bundle vacío;
- conservar el artifact inválido en cuarentena para diagnóstico.

Validación:

- bit flip, truncamiento, schema futuro/antiguo, root de otro run, parent
  omitido, complete marker falso, replay y zip/path traversal;
- ningún caso produce artifact vacío exitoso, `Supported` o `Pass`;
- resume sólo reutiliza artifacts cuya closure completa coincide.

Done:

- verifier común;
- corpus de corrupción;
- chaos E2E;
- reason codes y telemetría por clase.

Gate R2:

- concurrencia real;
- crash matrix;
- resume matrix;
- portable verification;
- cero autoridad en root legacy;
- Backend puede recuperar estado desde manifests.

## 6. Fase S3 — Substrato semántico y bindings

### IR-301 — `solguard-semantic-ir.v1`

Owner: `solguard-map`.

Consumidores: TRACE, DISCOVER, DIFF, ECONOMIC y verificadores posteriores.

Trabajo detallado en
[04_MADUREZ_OCHO_LENGUAJES.md](04_MADUREZ_OCHO_LENGUAJES.md).

Gate:

- schemas y modelos;
- compiler/parser authority;
- CFG/dataflow;
- callsites;
- estado;
- operaciones económicas;
- numeric semantics;
- provenance/capabilities/debt;
- goldens cross-language.

### IR-302 — Identidades canónicas

Owner: MAP. El crate neutral aporta wire types y verificadores puros; CORE es
verificador de binding, no co-owner.

Entidades:

- source;
- component/module/package;
- type;
- callable;
- state region;
- operation occurrence;
- call/causal edge;
- branch;
- actor;
- asset/unit;
- route;
- flow;
- evidence.

Validación:

- overloads;
- homónimos;
- files reordenados;
- generic instances;
- receiver types;
- cross-language boundary;
- occurrence multiplicity;
- no substring binding.

### IR-303 — TRACE sobre grafos tipados

Owner: `solguard-trace`.

Dependencias: `IR-301`, `IR-304`, `IR-307`.

Trabajo:

- sustituir `build_generic_trace` productivo por operadores semánticos;
- contexto interprocedural;
- dispatch sets;
- MAY/MUST;
- guard lattice;
- state/effect;
- async/callback/happens-before;
- atomicity;
- counterevidence;
- summaries interprocedurales content-addressed por callable/context;
- SCC/cycle/recursion summaries con widening/fixpoint y deuda;
- slices target-scoped backward/forward desde ProofObligation/EvidenceRequest;
- dominators/post-dominators, path feasibility y guards contradictorios;
- continuaciones reanudables con frontier, visited set, budgets e input roots;
- cache exacta por source/IR/toolchain/query/summary-policy root;
- prioridad adaptativa por movimiento de valor, privilegio, escritura
  persistente, llamada externa, callback y obligación abierta;
- query dirigida; la prioridad sólo agenda y nunca es evidence.

Validación:

- grafos con SCC/recursión/callback, dispatch amplio y secuencias multi-call;
- replay de continuación produce el mismo root que ejecución sin interrupción;
- cambio de un byte invalida summary/cache;
- dominator/path-feasibility elimina rutas imposibles sin perder witnesses;
- pressure tests comparan exploración ingenua vs slices/summaries y contabilizan
  toda ruta truncada como debt;
- targets high-risk no se pierden silenciosamente por budget y toda terminación
  conserva frontier/reason/capability receipt.

### IR-304 — Capability receipts medidos

Owner de aceptación y schema: MAP.

Productor: MAP, únicamente para capacidades de frontend medidas desde sus
propios primarios.

Certificador: DEPLOY.

Trabajo:

- vector de sintaxis, símbolos, tipos, layout, CFG/local effects, toolchain y
  build profile; no tier escalar;
- exact/over-approx/partial/unavailable;
- ratio y denominador;
- corpus;
- deuda;
- parser/toolchain;
- expiry;
- certification external.

MAP no puede certificar reachability, orden, async o causalidad que sólo TRACE
puede observar. Esas capacidades pertenecen a `IR-308`. DEPLOY verifica que los
denominadores de frontend son cerrados y que toda capability MAP usada por una
proof tiene receipt vigente.

### IR-305 — DIFF semántico

Owner: `solguard-diff`.

Dependencias: `IR-301`, `IR-304`, `IR-307`.

Trabajo:

- context MAP schema/hash/size bound;
- cambios de tipos, storage, guards, calls, flows, units, build profiles;
- C/C++ como lenguajes;
- riesgo como prioridad, nunca evidencia.

### IR-306 — Metamórficos de identidad y causalidad

Owner: `solguard-diff`.

Dependencias: `IR-301`, `IR-305`.

Trabajo:

- definir transformaciones semánticamente equivalentes por lenguaje:
  renombrado, reorden permitido, wrapper, extracción/inlining, formatting,
  module path y build profile equivalente;
- ligar entidades antes/después mediante identidad física y semántica, no por
  texto;
- exigir que findings, refutaciones, causal class y bindings sobrevivan la
  transformación;
- separar transformaciones normativas de adversariales;
- registrar toda pérdida como deuda o fallo, nunca como nuevo comportamiento.

Validación:

- matrices por los 30 scopes;
- renombrados con homónimos, overloads, macros, generated code y boundaries;
- transformaciones que sí cambian guard, unidad, actor o estado deben cambiar
  la decisión;
- replay desde source roots sellados.

Done:

- catálogo versionado de transformaciones;
- matcher causal;
- report de consistencia;
- gate `TEST-META`.

### IR-307 — Fail-closed de frontend no soportado

Owner: `solguard-map`.

Dependencias: `IR-301`, `IR-304`.

Trabajo:

- definir `unsupported` por constructo, profile y región exacta;
- prohibir CFG, call edges, state facts o tipos inventados tras parse
  incompleto;
- emitir capability receipt y coverage debt que bloquee pruebas dependientes;
- permitir leads heurísticos sólo fuera de facts autoritativos;
- propagar unsupported a TRACE, CORE, VALUE, VALIDATE y FILTER.

Validación:

- sintaxis válida no soportada, macro/proc-macro, assembly, reflection,
  generated code, FFI, UB y module modes desconocidos;
- el mismo caso nunca produce grafo vacío exitoso ni ausencia segura;
- mutar una capability exacta a unavailable reabre el scope afectado.

Done:

- taxonomy y schema;
- corpus malformed/unsupported;
- contract tests de propagación;
- cero facts fabricated.

### IR-308 — Capability receipts causales de TRACE

Owner: `solguard-trace`.

Dependencias: `IR-303`, `IR-304`.

Contrato: reutiliza `solguard-capability-receipt.v1`, con
`producer_kind=trace`; no redefine ni extiende el schema en wire.

Trabajo:

- medir reachability, dispatch closure, guard resolution, orden,
  async/callback, happens-before, atomicidad y state/effect coverage;
- publicar exact/over-approx/partial/unavailable con ratio, denominador, corpus,
  deuda, TRACE/toolchain digest y expiry;
- enlazar cada capability causal a trace roots y source authority;
- impedir que un receipt MAP sustituya uno TRACE o viceversa;
- hacer que DEPLOY certifique el par por scope sin fusionar denominadores.

Validación:

- retirar una call edge, callback, guard, estado u orden reduce el receipt
  exacto y reabre consumers transitivos;
- receipt TRACE falsificado, stale, cross-scope o con producer MAP falla;
- toda ProofCertificate que use una capacidad causal referencia un IR-308
  vigente;
- casos partial/unavailable bloquean C4/C5 cuando participan en el witness.

Done:

- writer TRACE separado;
- matriz MAP/TRACE por scope;
- denominadores y roots reproducibles;
- contract matrix new/new y tests de reapertura.

Gate S3:

- corpus estructural de ocho lenguajes;
- negativos y metamórficos;
- frontend replay;
- capability receipts MAP y TRACE separados y vigentes;
- ninguna heuristic authority;
- bindings exactos.

## 7. Fase W4 — World model e hipótesis

### MODEL-401 — `solguard-protocol-model.v1`

Owner: `solguard-discover`.

Trabajo:

- actores y capabilities;
- trust boundaries;
- componentes;
- activos y cuentas;
- estados/state machines;
- mensajes/callbacks;
- oráculos;
- tiempo/epochs/finality;
- upgrades/config;
- cross-component boundaries;
- unknowns y deuda.

Validación:

- facts rederivables desde IR/TRACE;
- no autoridad por vocabulary;
- C/C++ incluidos;
- model proposal separado;
- semantic-equivalent implementations generan relaciones equivalentes.

### MODEL-402 — Eliminar ausencia léxica como prueba

Owner: `solguard-discover`.

Trabajo:

- la ausencia requiere coverage receipt;
- helpers/protecciones delegadas se resuelven;
- keywords sólo priorizan exploración;
- tests con decoys, aliases, wrapper y equivalente semántico.

### MODEL-403 — `solguard-economic-transition-system.v1`

Owner: `solguard-economic`.

Trabajo:

- preconditions;
- reads/writes;
- pre/post-state;
- operaciones;
- asset/unit;
- atomicity;
- external effects;
- equations;
- resolution;
- source/trace authority;
- coverage.

### MODEL-404 — Kernels económicos universales

Owner: `solguard-economic`.

Kernels mínimos:

- conservación;
- backing/solvencia;
- boundedness;
- consumo único;
- context binding;
- orden/atomicidad;
- authority/lifecycle;
- precisión/unidades;
- commitment completeness;
- liveness económica.

### MODEL-410 — Sistema dimensional y de unidades

Owner: `solguard-economic`.

Dependencia: `MODEL-403`. `PROOF-505` consume este resultado; nunca es una
precondición de `MODEL-410`.

Trabajo:

- representar de forma tipada activo, denominación, escala, periodo,
  orientación de precio y dominio numérico;
- exigir conversiones explícitas y con procedencia entre shares, assets,
  precios, porcentajes, tasas, tiempo y unidades de gas o fees;
- propagar redondeo, truncamiento, overflow y error acumulado como intervalos
  o deuda, no como igualdad exacta;
- rechazar ecuaciones, deltas y comparaciones con dimensiones incompatibles;
- conservar estas dimensiones desde la transición económica hasta la
  obligación que compilará VALUE.

Validación:

- fixtures con `wei/ether`, decimals heterogéneos, bps/WAD/RAY, shares/assets,
  price orientation, tasas por periodo y clocks incompatibles;
- cambiar sólo una unidad o escala rompe el type-check y nunca produce
  `Supported` ni `Pass`;
- metamórficos de reescala coherente conservan la decisión;
- unknown numeric semantics, overflow, UB o rounding no acotado generan deuda
  bloqueante;
- suites específicas de Solidity, Vyper, Rust, Go, C, C++, JavaScript,
  TypeScript y boundaries políglotas.

Done:

- comprobador dimensional integrado en
  `solguard-economic-transition-system.v1`;
- recibos reproducibles de unidades y conversiones;
- corpus positivo, safe, near-miss y adversarial;
- consumidor `PROOF-505` enlazado por contrato y probado end-to-end.

### MODEL-411 — Modelo de adversario económico

Owner: `solguard-economic`.

Dependencias: `MODEL-403`, `MODEL-404`, `MODEL-410`.

Contrato: `solguard-economic-adversary-model.v1`.

Trabajo:

- capital propio, borrow/flash liquidity, repayment y límites;
- market depth, slippage, fees, gas/compute, opportunity cost y net delta;
- precio endógeno/oracle, TWAP/window, heartbeat y manipulación;
- mempool/MEV/order choice, front/back-run, callbacks, block/epoch y
  concurrencia;
- secuencia/repetición acotada, inventories intermedios y feasible region;
- objective function y `satisfiable|unsat|unknown` con bounds/provenance;
- actor privilege, competition, victim state y external preconditions.

Validación:

- AMM/oracle/TWAP/flash-loan positivos con lower-bound neto;
- near-misses donde depth, fees, heartbeat, capital, repayment u orden eliminan
  beneficio/impacto;
- prohibir liquidez infinita, precio arbitrario, MEV perfecto, costes cero,
  repetición ilimitada y snapshots futuros;
- reescala coherente conserva decisión; cambio de market/oracle root la reabre;
- VALUE/VALIDATE rederivan feasibility y net adverse delta.

Done:

- schema/model/goldens;
- provider/evaluator contract;
- corpus estratégico por scope aplicable;
- integración con ProofObligation, PROBE y materiality lower bound.

### MODEL-405 — Invariantes base independientes

Owner: `solguard-invariant`.

Trabajo:

- derivados antes del candidato;
- scoped por entidad/state/flow/asset/route;
- quantifier/predicate;
- framework semantics;
- relaciones;
- no candidate text;
- specialization rederivada.

Negativo:

- candidato intenta introducir su propia conclusión;
- invariante sin flow exacto;
- cross-route/cross-asset;
- duplicate/substring;
- candidate-derived confidence.

### MODEL-406 — Dos motores de hipótesis

Owner: DISCOVER. CORE consume, verifica origin y bloquea bypasses; no redefine
el motor ni el envelope.

Tracks:

- `semantic_generic`;
- `rule_pack`;
- `model_grounded`;
- `historical_retrieval`;
- `direct_tool_finding`.

Trabajo:

- orígenes indelebles;
- enum de origen y `knowledge_taint` canónicos, sin aliases `known_rule` o
  `known_pattern` usados como origin class;
- prompts/resource packs separados;
- métricas separadas;
- candidate generation común sólo después de origin;
- model proposal no autoritativa;
- ningún known artifact montado en holdout H-NOVEL.
- harness de ablación `semantic_core_only`, `generic_with_model`,
  `rule_pack_only`, `full_without_retrieval` y `known_retrieval_control`;
- mismos bytes/inputs/budgets/stopping/evaluator, con cache y output físicamente
  separados;
- deltas pareados de recall, precision, Recall@K, review burden, proof closure,
  primera pérdida y recursos por scope/origen;
- H-NOVEL no atribuye novedad a un hit sostenido sólo por
  `rule_pack|historical_retrieval`.
- ModelGateway trata source/comments/strings/metadata como
  `untrusted_source_data`, usa context envelopes estructurados, limita
  bytes/tokens/items y prohíbe tools/red/filesystem/secrets/retrieval oculto;
- proposals de modelo siguen siendo advisory y schema-bound aunque el target
  contenga instrucciones.

Validación:

- intentar relabel tras merge/ranking/dedupe/VALIDATE/FILTER;
- taint conocido copiado a cada campo y formato consumidor;
- retrieval/cache/resource pack montado en un perfil prohibido;
- mismo target con orígenes múltiples y primary origin reordenado;
- ablation con distinto seed, budget, denominator o evaluator;
- métricas globales que oculten el fallo del motor genérico;
- prompt/context injection en comentarios, strings, Unicode, nested fences,
  URLs/tool requests, output bombs, poisoned dependency metadata y prompt echo.

### MODEL-407 — Candidate binding exacto

Owner: `solguard-core`.

Trabajo:

- `solguard-canonical-candidate.v1`;
- root/trigger/impact inmutables;
- scope exacto;
- flow/asset/route;
- invariant relation;
- origin;
- missing obligations;
- no best-family fallback;
- no overwrite de evidencia durante quality ranking.

Validación:

- caso Governor/Oracle/Rewards de Compound;
- homónimos;
- cross-component;
- misma familia pero flow incompatible;
- mismo activo pero route distinto;
- reorder determinista.

### MODEL-408 — Multi-transacción y contrafactuales

`MODEL-408` es derivado de tres hijos de owner único:

- `MODEL-408-TRACE`: secuencia y estado persistente;
- `MODEL-408-DISCOVER`: lifecycle, actores y contrafactuales;
- `MODEL-408-ECONOMIC`: transiciones y delta multi-transacción;
- `MODEL-408-E2E`: composición verificada de los tres outputs.

`MODEL-408 = AND(MODEL-408-TRACE, MODEL-408-DISCOVER,
MODEL-408-ECONOMIC, MODEL-408-E2E)`.

Trabajo:

- estado persistente entre tx;
- actor/context;
- block/epoch/time;
- order;
- retry/replay;
- callbacks;
- restored-property counterfactual;
- fixed bounds y deuda.

### MODEL-409 — Matriz causal vulnerable/control/mutante

Owner: `solguard-deploy`.

Dependencias: `MODEL-401` a `MODEL-408`, `MODEL-410` y `MODEL-411`.

Trabajo:

- exigir por familia y scope roots vulnerables independientes, patch causal,
  safe design, near-miss y mutantes positivos/negativos;
- preservar lineage y fork split antes de ejecutar;
- fijar la propiedad restaurada y el único cambio causal de cada par;
- comprobar que protocol model, transición, invariante e hipótesis explican el
  cambio sin leer labels;
- rechazar casos corpus-shaped, duplicados o con oracle dentro del scan root.

Validación:

- matriz completa por `(scope, family)`;
- mutar guard, actor, asset, unidad, orden, finality y rounding;
- el patch elimina la causa; el safe control nunca produce `Pass`;
- dos revisores reproducen el oracle desde primarios fuera del scanner.

Done:

- manifest firmado;
- lineage report;
- pares y mutantes versionados;
- evidencia C4 consumible por `LANG-190`.

Gate W4:

- world model rederivable;
- invariantes independientes;
- adversario económico y costes/bounds rederivables;
- 0 cross-bindings incompatibles;
- known/open separados;
- candidatos exactos;
- matrices safe/near-miss.

## 8. Fase P5 — Prueba económica iterativa

### PROOF-501 — Compilador canónico de obligaciones

Owner de política y compilación: `solguard-value`.

El crate compartido sólo contiene wire types, enums y validación estructural.
No decide qué obligación es mandatory, conditional o not-applicable.
`solguard-validate` rederiva y verifica la selección desde el claim y los
primarios; no confía en la lista emitida por VALUE.

Trabajo:

- obligación derivada por claim;
- mandatory/conditional/not-applicable con razón;
- para claims económicos, obligaciones obligatorias de lower bound conservador,
  actor/prerrequisitos, materiality profile y policy binding;
- para ataques estratégicos, adversary model, capital/liquidity, market/oracle
  manipulation feasibility, bounded sequence y net delta después de costes;
- no lista elegida por request;
- state machine de resolución;
- blocker y provider.

### PROOF-502 — Request y response de evidencia versionados

Contratos: `solguard-evidence-request.v1` y
`solguard-evidence-response.v1`.

Owner orquestación: `solguard-core`.

Providers: MAP, TRACE, ECONOMIC, VALUE, INVARIANT.

Campos comunes y específicos:

- request/candidate/issue;
- obligation;
- provider/capability;
- exact scopes;
- evidence already known;
- wave/parents;
- budget;
- query-only;
- response authority;
- progress.

### PROOF-503 — Providers dirigidos

`PROOF-503` es derivado. Los hijos primarios son `PROOF-503-MAP`,
`PROOF-503-TRACE`, `PROOF-503-ECONOMIC`, `PROOF-503-VALUE` y
`PROOF-503-INVARIANT`; `PROOF-503-E2E` prueba el intercambio real de requests y
responses. El umbrella sólo cierra con el AND de los seis.

Orden:

1. MAP: symbols, CFG, dataflow, route;
2. TRACE: reachability, guards, sequence, temporalidad;
3. ECONOMIC: transitions, units, equation;
4. VALUE: before/after, delta, actor loss/gain;
5. INVARIANT: exact scope y predicate evaluation.

Cada provider:

- abre source/primaries;
- no confía en request como evidencia;
- publica bundle independiente;
- declara no-progress;
- respeta budgets.

### PROOF-504 — Scheduler multi-wave

Owner: `solguard-core`.

Trabajo:

- agrupar requests comunes sin fusionar candidatos;
- prioridad por capacidad de cierre, no score benchmark;
- revalidación de responses;
- effective view inmutable;
- recompilación de obligaciones;
- fixed point;
- cycle detection;
- presupuesto global/per-candidate/per-provider;
- cierre atómico.

### PROOF-505 — Solver y análisis dimensional

Owner: VALUE. ECONOMIC provee expresiones/unidades y actúa como revisor de
dimensionalidad.

Trabajo:

- expresiones tipadas;
- units;
- signedness/width/rounding;
- constraints;
- satisfiable/unsat/unknown;
- witness;
- counterexample;
- solver version/options/hash;
- timeout debt.

No se acepta `delta_expression` textual como demostración.

### PROOF-506 — Probe semántico acotado

Owner: VALUE. DEPLOY verifica y atesta el aislamiento; no decide la obligación.

Scope:

- offline;
- sin red;
- no explotación;
- fixture/source exacto;
- state/value assertions;
- adapters versionados para SMT/symbolic, concolic dirigido, property fuzzing y
  simulación de snapshots/secuencias multi-call/multi-transacción;
- selección del adapter derivada de la ProofObligation/capability, nunca del
  resultado observado;
- seed, bounds, search strategy, initial state, environment, tool/options y
  stop reason content-addressed;
- límites;
- resultado reproducible;
- no secrets;
- no host mounts.

Un probe responde una obligación. FILTER sigue siendo obligatorio.

Cada adapter devuelve `proved|refuted|unknown|unsupported|budget_exhausted` con
witness/counterexample/debt y capability receipt. Un crash, no finding, path no
explorado o fuzzer sin hit nunca significa refuted. Tests cubren snapshot drift,
flaky seed, nondeterminism, corpus leak, host escape, state reset incorrecto,
secuencia fuera de bounds y simulación que omite fees/callbacks.

### PROOF-507 — `solguard-proof-certificate.v1`

Owner: VALUE.

Verificador: VALIDATE.

Contenido:

- claim y scope;
- todas las obligaciones;
- route/flow/asset;
- invariant;
- state before/after;
- delta;
- lower bound conservador con amount/asset/unit nativos, incertidumbre,
  horizonte y prerrequisitos;
- `materiality_profile_id/root`, `policy_set_commitment_root`, impact class y
  product materiality status;
- prohibición de policy leaf, membership proof, program ID/mapping o severidad
  target-specific dentro del certificado;
- evidence/counterevidence;
- solver/probe;
- coverage;
- assumptions;
- certificate status.

### PROOF-508 — Refutación real

Owner: VALUE. VALIDATE es verificador independiente de la refutación.

Motivos terminales:

- route imposible;
- protección efectiva;
- invariant preservado;
- delta cero/no negativo;
- actor no controla input;
- asset/flow incompatible;
- state transition no posible.

Ausencia de evidencia no es refutación.

### PROOF-509 — Semántica fail-closed de budgets

Owner: `solguard-core`.

Dependencia: `PROOF-504`.

Trabajo:

- presupuestar waves, providers, solver, paths, memoria, artifacts y tiempo por
  obligación;
- distinguir exhausted, cancelled, timeout, solver-unknown y no-progress;
- ligar consumo y límites al run spec y al certificado;
- impedir que truncamiento, compactación o cache conviertan incertidumbre en
  ausencia;
- propagar budget debt hasta VALIDATE/FILTER y health.

Validación:

- agotar cada dimensión una por una y de forma combinada;
- resume no reinicia ni duplica budget sin política explícita;
- un partial artifact no cierra obligación;
- ningún score o regla conocida transforma exhaustion en `Pass`.

Done:

- receipts de budget;
- chaos/property suite;
- reason codes terminales;
- E2E con cierre, exhaustion y retry autorizado.

### PROOF-510 — Paquete de reproducción causal

Owner: `solguard-deploy`.

Dependencias: `PROOF-507`, `DECIDE-601`.

Trabajo:

- empaquetar source authority, run spec, semantic roots, trace, modelo,
  transiciones, invariantes, requests/responses, solver/probe y certificado;
- incluir comandos, toolchain/BOM, budgets y expected roots;
- excluir logs privados, ground truth y rutas del host;
- permitir que un revisor recalcule route, before/after, delta, contradicción y
  veredicto;
- fallar ante una dependencia ausente o byte diferente.

Validación:

- reproducción desde checkout/entorno limpio;
- tamper de cada root, archivo faltante, orden distinto y schema incompatible;
- mismo verdict, causal class y proof status;
- paquete no contiene oracle ni secretos.

Done:

- schema y builder del replay package;
- verifier independiente;
- manifest closure;
- receipt firmado.

Gate P5:

- fixture de al menos tres waves;
- 0 requests en un caso cerrado desde base;
- request corrupta/autorreferencial/cross-flow rechazada;
- cycle/fixed-point;
- todas las obligaciones cerradas en Supported;
- pruebas completas >0 en canarios controlados;
- refuted >0 en corpus negativo.

## 9. Fase D6 — Decisión y producto

### DECIDE-601 — Verificador de certificados

Owner: `solguard-validate`.

Trabajo:

- reabrir primarios/manifests;
- verificar cada obligación;
- rederivar bindings críticos;
- validar solver/probe;
- comparar invariant;
- deuda;
- counterevidence;
- decisión única.

### DECIDE-602 — Checkers FILTER genéricos

Owner: `solguard-filter`.

Trabajo:

- registry por primitive/kernel/framework;
- checker contract;
- vulnerable/safe/near-miss;
- `checker_not_registered|checker_unsupported` → FILTER termina de forma
  auténtica y emite un `AdmissionResult=Review`; sólo entonces puede existir
  `ReviewEnvelope`;
- `checker_runtime_missing|checker_unavailable|checker_crash` → fallo de
  ejecución anterior a `AdmissionResult`, sin `ReviewEnvelope`;
- lineage independence;
- exact source revalidation;
- protección/effect/delta.

### DECIDE-603 — Ranking y calibración

`DECIDE-603` es derivado de `DECIDE-603-CORE`,
`DECIDE-603-VALIDATE`, `DECIDE-603-DEPLOY` y `DECIDE-603-E2E`. Cada hijo tiene
owner único; el E2E prueba que ranking, verdad técnica y evaluación permanecen
separados.

Trabajo:

- ranking product-only;
- no ground truth imports;
- features declaradas;
- calibration por origin/language/family;
- `evidence_completeness_score` determinista con rubric ID/version/root, nunca
  probability;
- `calibrated_actionability_probability` opcional sólo con calibration
  model/population root e intervalo aceptados;
- estabilidad;
- reason codes;
- freeze pre-oracle.

### DECIDE-604 — Finding y review bundles

Owner: CORE.

Trabajo:

- consumir los contracts y el projector aceptados en `TRUTH-105`;
- realizar el único cutover del writer de producto después de FILTER;
- conservar todos los TechnicalVerdict por artifact ref/digest byte-exact sin
  reautorizarlos en CORE y proyectar por separado Inconclusive, Refuted,
  admission Reject, coverage/debt y PublishedFinding SARIF;
- deterministic JSON/Markdown;
- exact counts;
- duplicate presentation;
- no validation-only rows;
- Backend y Database passthrough.

Validación:

- todos los lectores de `TRUTH-105` superan new-new, fallo parcial, tamper y
  replay con el writer real;
- telemetría demuestra cero consumo del path validation-only antes de
  retirarlo;
- un mismo run no puede ser escrito por el adapter legacy y el writer nuevo;
- reanudación idempotente conserva exactamente los mismos envelope IDs y
  bytes;
- todo campo materializado en FindingEnvelope/ReviewEnvelope coincide
  byte-exact tras canonicalización con candidate, certificate, verdict y
  admission referenciados; ningún campo duplicado aporta autoridad propia;
- mutation tests cambian por separado candidate epoch/freeze/membership,
  claim, scope, route, delta, materiality, proof status, decision,
  `publication_eligibility`, ineligibility policy/root/rule/scope/actor/expiry,
  origin set/primary/taint/artifact refs, evidence-completeness/calibrated
  probability, roots, canonical parent y lineage; reordenar origins, introducir
  `confidence`, suprimir un TP o cruzar run/root también falla cerrado;
- cada vista JSON/Markdown/SARIF se rederiva desde primarios y falla si añade,
  elimina o reclasifica un objeto.

### DECIDE-605 — Threat model del finding

Owner: FILTER. Docs consume y revisa el threat model publicado.

Casos:

- source drift;
- copied evidence;
- stale invariant;
- forged solver result;
- cross-run mix;
- duplicate ID;
- malicious artifact;
- coverage laundering;
- known-origin stripping;
- report/JSON disagreement.

### DECIDE-606 — Score nunca sustituye evidencia

Owner: `solguard-validate`.

Dependencia: `DECIDE-601`.

Trabajo:

- aplicar hard proof gates antes de ranking o threshold;
- registrar score y features sólo como prioridad, no como verdad;
- prohibir el alias wire `confidence` y cualquier score sin rubric/model root;
- bloquear `Supported`/`Pass` si falta una obligación, primario, coverage o
  certificado aunque el score sea máximo;
- verificar calibración por origin/scope sin introducir excepciones;
- emitir reason code estable para toda exclusión.

Validación:

- scores mínimo/máximo/NaN/infinito, feature ausente, overflow y calibration
  drift;
- known rule perfecta con proof incompleto;
- completeness máximo y probability alta con hard gate incompleto;
- calibration population/scope/origin/root cambiado o intervalo ausente;
- reorden de candidatos no altera el veredicto;
- cero bypass desde Backend o configuración.

Done:

- gate order formalizado;
- tests adversariales;
- contract fixture;
- métricas separadas de verdad.

### DECIDE-607 — Preservar true positives upstream ante fallo FILTER

Owner: `solguard-core`.

Dependencias: `TRUTH-103`, `DECIDE-604`.

Trabajo:

- persistir technical verdict, proof certificate y candidate antes de ejecutar
  admisión;
- representar `filter_failed`, `checker_not_registered`,
  `checker_unsupported`, `checker_runtime_missing`, `checker_unavailable` y
  `admission_unavailable` como estados separados;
- si FILTER termina y devuelve Admission `Review|Reject`, construir su
  `ReviewEnvelope`; si falla antes de producir `AdmissionResult`, conservar
  upstream y el fallo únicamente mediante `solguard-tool-phase.v1`,
  `solguard-artifact-envelope.v1` y `solguard-run-telemetry.v1`, sin forjar un
  ReviewEnvelope ni un `admission_ref`;
- prohibir que un fallo FILTER borre, reescriba o convierta upstream en cero;
- excluirlo de detecciones `Pass` sin perderlo del denominador de evaluación.

Validación:

- `checker_not_registered|checker_unsupported` producen exactamente un
  `AdmissionResult=Review` auténtico, nunca `Pass`;
- `checker_runtime_missing|checker_unavailable|checker_crash`, timeout, schema
  mismatch y artifact corrupto de FILTER no producen `AdmissionResult`,
  `ReviewEnvelope` ni `admission_ref`;
- mutation tests impiden reclasificar cualquiera de esos fallos operativos
  como review y usarlo para mejorar precision o completion;
- replay posterior recupera exactamente el upstream;
- métricas distinguen supported, pass y filter failure;
- ningún fallback publica finding.

Done:

- estados, failure receipts y product envelopes sólo cuando existe admission;
- persistencia append-only;
- crash matrix;
- reconciliación de denominadores.

### DECIDE-608 — Dedupe causal sin inflación

Owner: `solguard-filter`.

Dependencias: `TRUTH-102`, `DECIDE-602`.

Trabajo:

- agrupar por causa, route, flow, asset, invariant y proof identity;
- conservar todos los technical verdicts y relaciones `canonical_parent_id`;
- elegir representative determinista sin cambiar verdad;
- impedir merge cross-flow/cross-asset y split artificial por texto;
- contar detecciones y review load con denominadores explícitos.

Validación:

- permutación de input, alias/renombrado, same-line causes distintas,
  multi-location misma causa y grupos transitivos;
- cada grupo tiene un representative;
- duplicados no inflan precision/recall ni desaparecen del audit trail;
- tamper o ciclo en `canonical_parent_id` falla.

Done:

- algoritmo y schema;
- property tests;
- métricas canónicas;
- E2E JSON/Markdown.

Gate D6:

- finding lifecycle E2E;
- review separado;
- precision controls;
- zero bypass;
- ranking freeze;
- tamper suite.

## 10. Fase O8 — Plataforma y operación

### PLAT-801 — Database benchmark v2

Owner: `solguard-database`.

Modelo:

- runs;
- protocol runs;
- phases;
- candidates;
- technical verdicts;
- admissions;
- findings;
- evaluation labels post-scan;
- metrics y provenance.

Identidad:

- append-only por run/protocol/bundle digest;
- bundle idéntico = idempotent no-op;
- misma identidad/diferentes bytes = conflicto;
- no UPSERT mutable que reescriba historia.

### PLAT-802 — Tooling y dry-run de migración v2

Owner: `solguard-database`.

Dependencias: TRUTH-106 y PLAT-801.

Proceso:

1. consumir el schema v2 y goldens de `PLAT-801` con el writer nuevo
   desactivado;
2. desplegar dual-read v1/v2 en Backend;
3. desplegar dual-read v1/v2 en Deploy/evaluator;
4. verificar old/old, new/old, old/new y new/new antes de activar productores;
5. implementar backup, hash, `application_id`, `quick_check` e
   `integrity_check`;
6. ejecutar export lógico, transformación e import sólo sobre copias
   efímeras;
7. reconciliar counts, IDs, roots, confianza y provenance en esas copias;
8. ensayar restore y migración correctiva forward-only;
9. producir un dry-run receipt que declare explícitamente
   `authority_changed=false`.

`PLAT-802` entrega tooling probado. No crea la instancia autoritativa
`data/benchmarks.sqlite`, no activa writers, no corta readers y no modifica
`benckmarks.sqlite`. Tras publicar en C7 los contratos de medición y todos sus
readers, `DB-902` ejecuta una sola vez backup, creación, migración, shadow,
reconciliación, telemetría a cero, cutover y congelación del legacy.

Restore ensayado:

- detener primero el writer de la réplica;
- restaurar un snapshot compatible de ensayo;
- conservar los readers duales hasta verificar la recuperación;
- nunca ejecutar downgrade in-place sobre la base viva.

### PLAT-803 — API asíncrona de jobs

`PLAT-803` es derivado de `PLAT-803-CORE`, `PLAT-803-BACKEND` y
`PLAT-803-E2E`. CORE posee lifecycle y eventos; BACKEND posee el transporte y
la API; el E2E verifica idempotencia, reconexión, cancelación y replay.

Endpoints mínimos:

- create;
- status;
- events/progress;
- cancel;
- manifests;
- findings;
- review;
- readiness.

Validación:

- restart;
- recovery;
- concurrent clients;
- separate control pool;
- auth;
- body/rate bounds;
- no path leakage.

### PLAT-804 — Readiness y observabilidad

Owner: Backend.

Checks autenticados:

- core;
- tools;
- model;
- DB;
- run root;
- ArtifactStore;
- process supervisor;
- version/BOM parity.

Health público sigue mínimo.

### PLAT-805 — Dependency train

Owner: AGENTS. Cada CI ejecuta el contrato y DEPLOY verifica la matriz, sin
convertirse en co-owner.

Trabajo:

- pins SHA completos;
- private checkout;
- compatibility manifest;
- clean runner;
- branch names prohibidos en release;
- schema/goldens publicados, readers compatibles y fijados antes de activar el
  writer nuevo;
- automated drift.

### PLAT-806 — Documentación contractual

Owner: Docs.

Incluye:

- APIs;
- schemas;
- defaults;
- paths;
- DB;
- runbooks;
- recovery;
- claims;
- capabilities;
- limits;
- release;
- evidence;
- threat model.

### PLAT-807 — Paginación y filtros sin pérdida

Owner: `solguard-backend`.

Dependencia: `PLAT-803`.

Trabajo:

- usar cursor estable ligado a run, sort key y query digest;
- ordenar determinísticamente findings, review y runs;
- definir snapshot semantics frente a escrituras concurrentes;
- validar filtros por verdict, admission, scope, family, origin y time;
- rechazar cursor de otro tenant/run/query o versión.

Validación:

- page sizes límites, inserciones concurrentes, empates, cursor replay,
  borrado lógico, filtros combinados y backpressure;
- concatenar páginas produce el conjunto exacto sin pérdida ni duplicado;
- mismo snapshot produce mismo orden.

Done:

- contract API y cursor firmado;
- property tests;
- load/concurrency report;
- documentación de límites.

### PLAT-808 — Aislamiento de runs concurrentes

Owner: `solguard-backend`.

Dependencias: `PLAT-803`, `RUN-205`.

Trabajo:

- namespace por run/attempt para estado, cache, logs, artifacts y decisiones;
- ligar jobs, cancellation y resume al mismo source/config/model root;
- separar temp dirs, process trees, DB transactions y telemetry;
- impedir cache hit cross-tenant o cross-run;
- limpiar recursos sin borrar evidence append-only.

Validación:

- runs idénticos y distintos en paralelo, cancel/retry cruzado, crash,
  eviction, reused IDs y scheduler reorder;
- ningún byte, decision o log cambia de run;
- race detectors y chaos sobre Backend/CORE/DB.

Done:

- isolation keys;
- concurrency harness;
- leak assertions;
- recovery receipts.

### PLAT-809 — Migración forward-only y restore probado

Owner: `solguard-database`.

Dependencia: `PLAT-802`.

Trabajo:

- prohibir downgrade in-place y migraciones destructivas no respaldadas;
- capturar backup, schema/data hashes y checks antes del cambio;
- ejecutar dry-run y reconciliación sobre copia;
- hacer rollback mediante restore a infraestructura compatible;
- conservar eventos y evidencia de intentos fallidos.

Validación:

- fallo en cada statement/batch, disco lleno, kill, versión saltada, backup
  corrupto y restore limpio;
- integridad referencial y counts antes/después;
- producción nunca usa la DB activa como laboratorio de recovery.

Done:

- migration/restore runbook ejecutable;
- manifests y hashes;
- chaos report;
- forward-only gate.

### PLAT-810 — Observabilidad de pérdida de evidencia

Owner: `solguard-backend`.

Dependencias: `PLAT-804`, `TRUTH-106`.

Trabajo:

- emitir por stage inputs, outputs, debt, reason, attempts, budget y lineage;
- reconciliar counts MAP→TRACE→DISCOVER→ECONOMIC→VALUE→VALIDATE→FILTER;
- distinguir cero legítimo, missing, failed, partial, rejected y dropped;
- enlazar métricas a artifact/JSON Pointer y run root;
- alertar pérdida o contradicción sin acceder a truth post-scan.

Validación:

- inyectar pérdida en cada arista, métricas ausentes, duplicated events,
  out-of-order y restart;
- el stage exacto y la causa se localizan;
- dashboard no inventa cero ni eleva health;
- scanner telemetry permanece oracle-free.

Done:

- telemetry schema y dashboards;
- reconciler automático;
- alerts y runbook;
- chaos E2E.

Gate O8:

- backup/restore;
- jobs/recovery/cancel;
- CI clean;
- docs drift gate;
- manifests;
- no default ambiguo.

## 11. Fases L7, K9, B10 y R11

La implementación multilenguaje se especifica en
[04_MADUREZ_OCHO_LENGUAJES.md](04_MADUREZ_OCHO_LENGUAJES.md).

La validación, aislamiento, known regression, holdout y release se especifican
en [05_VALIDACION_CIEGA_Y_RELEASE.md](05_VALIDACION_CIEGA_Y_RELEASE.md).

## 12. Dependencias críticas resumidas

| Trabajo | No puede activarse antes de |
|---|---|
| Nuevo `benchmarks.sqlite` | TRUTH-106, PLAT-801/802, MEASURE-901 y ejecución única DB-902 |
| Finding público | TRUTH-101/103/105 y DECIDE-604 |
| Certificado de lenguaje | IR-301/304/308, P5, D6 y holdout |
| EvidenceRequest multi-wave | RUN-203/204, MODEL-407 y PROOF-501 |
| API jobs | RUN-202 a RUN-206 |
| Known regression de aceptación | T1, R2, S3, W4, P5, D6, L7 y O8 |
| Holdout real | known regression, aislamiento y thresholds congelados |
| Tag de producto | blind aprobado y rollback ensayado |

## 13. Antipatrones prohibidos durante la implementación

- crear más reglas antes de reparar la verdad;
- marcar un lenguaje por parsear fixtures;
- compartir ground truth con el worker;
- ajustar thresholds tras ver resultados;
- hacer que FILTER compense un VALIDATE inválido;
- tratar review como recall de producto;
- usar un score para saltar hard gates;
- cerrar una obligation porque no se encontró evidencia;
- usar candidato como evidencia;
- permitir `unknown` como exacto;
- borrar runs fallidos;
- reusar roots de release;
- mezclar refactor, contrato y semántica en un commit;
- migrar la DB sin restore;
- declarar CI verde sólo por tests locales;
- cerrar un WP sin consumidor E2E.
