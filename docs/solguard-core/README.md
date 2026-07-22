# SolGuard Pipeline Core

`solguard-core` es el motor Rust del pipeline de auditoria. Su paquete Cargo se
llama `solguard-pipeline-core`, expone la libreria `solguard_core` y proporciona
el binario operativo `solguard-core`.

El core posee la logica pesada que antes residia en el backend: preparacion de
proyectos, ejecucion de herramientas, journal de fases, generacion y binding de
candidatos, VALIDATE, reconciliacion fail-closed de FILTER, admision de EXPLOIT,
impacto, planes de PoC, enriquecimiento y reportes. `solguard-backend` no replica
estas decisiones; actua como adaptador HTTP y host de proceso.

## Frontera arquitectonica

```text
cliente / solguard-deploy
        -> POST /analyze
        -> solguard-backend (HTTP, DTO, proceso)
        -> solguard_core::services::analyze
        -> pipeline y herramientas
        -> artefactos y respuesta
        -> solguard-backend
        -> cliente
```

La dependencia es unidireccional: backend depende de core. Core no importa
controllers, rutas ni DTO HTTP del backend.

## Autoridad de source

Un analisis de ZIP no confia solo en la URL o en el hash de transporte. Deploy
entrega `solguard-source-authority-handoff.v1` con bytes/SHA-256 raw y el digest
`solguard-materialized-source-tree.v1`; Core verifica ambos sobre el ZIP y el
arbol fisico realmente publicados. Un lease OS exclusivo protege el proyecto
desde antes del reset/extraccion hasta que Backend termina de serializar la
respuesta. MAP, TRACE y FILTER rehashean el arbol antes y despues, conservan
receipts encadenados y ligan el artefacto exacto de cada fase.

El contrato, incluidos mirrors, nombres reservados de Windows y ceremonia de
catalogos, se documenta en
[Integridad de fuentes y cadena MAP -> TRACE -> FILTER](./integridad-de-fuentes.md).

## Pipeline preservado

El orden contractual de `pipeline.v0.10` no cambia con la migracion:

```text
map -> diff -> trace -> discover -> economic -> value -> invariant
    -> candidates -> validate -> filter -> historical-enrichment
    -> impact -> poc-plan -> exploit -> report
```

VALIDATE sigue siendo la autoridad para `supported`, `refuted` e
`inconclusive`. FILTER conserva `filter.v0.1` y su admision fail-closed. EXPLOIT
conserva `exploit.v0.2` y solo consume candidatos admitidos por FILTER.

En `audit_only`, core ejecuta hasta FILTER y registra
`historical-enrichment`, `impact`, `poc-plan`, `exploit` y `report` como
`skipped_by_audit_only_mode`, sin materializar sus artefactos. El endpoint y su
payload HTTP permanecen en backend.

### Refuerzo DISCOVER v2 y `candidate_value`

Dentro de CANDIDATES, core construye `model_discovery_packs.v2` target-scoped.
Cada capsula conserva source aunque no existan aristas o invariantes previos,
marca `OPEN_WORLD=true` y `VALIDATION_AUTHORITY=false`, y solicita la salida
compacta `model_discovery_candidate.v2`. El modelo solo propone semantica e IDs
de superficies; core reconstruye ubicaciones, ruta y evidence IDs. Los leads
exploratorios se conservan para diagnostico, pero nunca entran en VALIDATE.

Las doce aristas preservan presupuesto para conexiones entrantes root-cause y
salientes impact antes de expandir el grafo conectado. Si TRACE no aporta
targets source-backed utilizables, core usa un fallback MAP acotado de simbolos
function-like productivos, prioriza superficies externas/de valor y excluye
tests, mocks, fixtures y dependencias vendorizadas. Ese camino queda marcado
como `trace.model_discovery_map_fallback.v1`, degradado y open-world; no gana
autoridad de validacion.

Despues de crear candidatos canonicos, core puede ejecutar VALUE de nuevo como
`candidate_value`. Las requests `solguard-value-proof-requests.v1` son
`query_only`, estan limitadas a 128 y parten de evidencia independiente
MAP/TRACE. Con `economic_flow_identity.v2`, una request puede dirigirse a una
ruta content-addressed única compartida por MAP y TRACE aunque el path no esté
en el frontier rankeado base. VALUE busca esa identidad antes del ranking; core exige ID,
digest, superficies, secuencia y refs exactos antes de añadir el path a la vista
efectiva. Solo una respuesta `solguard-value-proof-responses.v1` completa,
`map_trace_reverified`, sin autocorroboracion, con binding exacto y proof
`validate_consumable` se aplica. Una respuesta partial o legacy no promueve el
candidato.

## Frontera ciega de producto

El core no carga, matchea ni puntua ground truth de benchmarks. Tampoco
sintetiza fixtures runtime a partir de bugs esperados. Las antiguas opciones
CLI `--ground-truth`, `--synthesize-runtime-fixtures` y
`--allow-unmatched-runtime-fixtures` no forman parte de la superficie actual.
Los planes de PoC solo pueden seleccionar fixtures enlazadas a source o tests
que existan en el proyecto auditado.

La prevalidacion historica conservada durante la transicion es fail-closed: un
registro guardado solo se acepta cuando declara el booleano exacto
`contamination_guard.oracle_visible=false`. Un guard ausente, mal tipado o
visible al oracle invalida ese registro. El matching y las metricas contra bugs
conocidos pertenecen a `solguard-deploy` despues de congelar las salidas del
producto.

### Tercera ola E0 en deploy

La tercera ola añade un batch scan-only diagnostico a la infraestructura que
demuestra esa congelacion fuera del core, sin introducir capacidades de
benchmark en el motor. `solguard-deploy`
define cuatro payloads versionados:

- `solguard-scan-contract.v1`;
- `solguard-scan-receipt.v1`;
- `solguard-scan-attestation.v1`;
- `solguard-evaluation-contract.v1`.

V1-v8 tambien tienen ahora catalogos oracle-free `protocols-scan.json` bajo
`solguard-scan-catalog.v1`: 24 targets en v1 y 20 en cada suite v2-v8. El
generador/check mantiene paridad exacta de project+commit y bytes materializados
exactos. Cada target contiene solo project, commit, locators/mirrors limitados
a `codeload.github.com` y `source_tree_sha256`; elimina nombres, categorias, aliases y texto libre, y
liga su suite a la solicitada y cada locator ref a `commit`. Un ref legacy
`main`/`master`, un tag o un SHA abreviado no es admisible: base y componentes
usan objetos Git inmutables de 40 caracteres. El scan contract liga tambien los
bytes raw mediante `source_sha256`, pero la identidad comun entre mirrors es el
tree hash. El runner scan-only comun consume esta proyeccion.

Cada payload tiene un JSON Schema Draft 2020-12 cerrado. El modulo contractual
usa JSON canonico y SHA-256, y solo acepta envelopes DSSE Ed25519. La
validacion de cadena comprueba referencias exactas entre contrato, receipt,
attestation y evaluation contract; no permite recomponer hashes para cambiar
status, barrera, outputs o elegibilidad. Ademas, los project IDs rechazan
traversal, los descriptores obligatorios deben ligar contenido presente y el
digest de product-priority debe coincidir con su descriptor de input.

Una clave publica Ed25519 suministrada por el caller prueba integridad respecto
a ese firmante, no que el firmante sea un attestor autorizado. En consecuencia,
`--require-scan-boundary` falla cerrado hasta que exista una raiz de confianza
fijada por el repositorio y una politica de firma con roles separados. Las
cadenas suministradas son diagnosticas: aunque cumplan la estructura elegible,
mantienen `recall_at_eligible=false`.

Los nombres `structurally_eligible` y
`scan_attestation_structurally_valid` significan completitud estructural;
`oracle_capability_separated_claimed` sigue siendo una afirmacion del proveedor.
No representan aislamiento verificado ni autorizacion de release.

El ranking productivo se ha extraido a
`solguard-deploy/benchmarks/product-priority.mjs`. Es un modulo puro que solo
consume candidatos, VALIDATE y diagnosticos productivos, sin importar matcher o
evaluator. Mantiene el wire contract `solguard-product-priority-ranking.v2` y su
semantica actual: separar el codigo no equivale a certificar el momento ni las
capacidades con las que se ejecuto.

`solguard-scan-execution-contract.v2` cierra exactamente 27 componentes: su
constructor, runner, launcher, helper CLI productivo, runner de procesos y lock
de autoridad de source, catalogo materializado, modulo de catalogo, compositor
de snapshots, contrato de rutas portables, autoridad de cohortes, handoff,
reader y finalizacion de autoridad de source, trust root y clave publica
fijadas, parser JSON estricto, product-priority, scan-contract, scan-boundary y
seis schemas. El constructor
rechaza ground truth, matcher, evaluator, splits y adjudications. El contrato
embebe el estado completo `solguard-toolchain-fingerprint.v2`; el worker
rehashea los componentes y recomputa los 13 repositorios antes y despues. Esto
detecta drift, no aislamiento de capacidades.

El execution contract legacy de v1-v8 sigue siendo evidencia de regresion
conocida, no blind, pero cierra exactamente 34 componentes para resume: 23
modulos JavaScript alcanzables y 11 recursos corpus/runtime. Incluye sus
descriptores y todos los modulos locales alcanzables por
imports estaticos desde cada runner. El test de cierre vuelve a calcular ese
grafo y falla ante una dependencia omitida; la libreria dinamica del evaluador
permanece declarada de forma explicita.

Los gates de pre-release no se falsean dentro de ese closure legacy: sus
modulos se sellan mediante la captura completa del worktree, el prebuild y el
lock de medicion. Un execution contract dedicado para ellos seria otra frontera
versionada.

`protocols-scan.mjs` es el runner scan-only comun y `scan-suite.mjs` su launcher
por suite. Cada source se materializa y liga por `source_sha256` y por el tree
hash canonico; cada target
recibe backend y base nuevos. Los outputs sellables y el runtime mutable de
logs/bases viven en raices frescas y fisicamente disjuntas. Targets completados, parciales y
fallidos permanecen en el denominador declarado.

El orquestador predeclara exactamente v1-v8 en
`solguard-scan-batch-plan.v1`, fijando hash documental, hash de bytes y tamano
de cada catalogo mediante el `solguard-release-catalog-manifest.v1` completo,
derivado de la finalizacion firmada y ligado a la misma generacion del
application receipt. El plan lo embebe para que su validacion historica no
dependa de una autoridad activa posterior ni de hashes manuales. Solo crea
`solguard-scan-batch-barrier.v1` y `solguard-scan-chain-bundle.v1` despues del
cierre correcto de todas las suites y de validar todos los artefactos por target
y suite. El bundle contiene plan y barrier completos, pero es crudo, no firmado
y diagnostico: no abre ni incorpora el oracle.

La forma v1 pre-authority nunca tuvo tag, seal/receipt aceptado ni bundle
elegible y acceptance-r1 no la produjo; se rechaza sin migracion. La forma
authority-bound es el primer v1 soportado. Tras su primer seal aceptado, todo
cambio breaking debe versionar coordinadamente plan, barrier y bundle.

## Estructura principal

```text
src/
  lib.rs                 API Rust del motor
  main.rs                CLI solguard-core
  config.rs              paths y limites del pipeline
  services/
    analyze.rs            fachada del analisis
    pipeline.rs           orden y journal pipeline.v0.10
    analyzer/
      runtime.rs          coordinacion de fases y herramientas
      types.rs            tipos serializados del analisis
      evidence_requests.rs requests y cierre candidate-directed VALUE
      seeds/              deteccion determinista
      finalizers.rs       cierre y reconciliacion de candidatos
    filter.rs             invocacion y reconciliacion filter.v0.1
    exploit.rs            admision y provenance exploit.v0.2
    impact.rs
    poc_plan.rs
    technical_report.rs
    knowledge.rs
    ingest.rs
    projects.rs
```

La estructura conserva las fronteras internas del motor trasladado. La
migracion no reinterpreta seeds, IDs, bindings, fallbacks ni argumentos de las
herramientas.

Documentacion detallada:

- [Servicios y responsabilidades](./servicios-y-responsabilidades.md)
- [Pipeline, fases y artefactos](./pipeline-y-fases.md)
- [Integridad de fuentes y cadena MAP -> TRACE -> FILTER](./integridad-de-fuentes.md)
- [DISCOVER v2 y cierre candidate-directed VALUE](./discovery-v2-y-candidate-value.md)
- [Identidad económica de flujo v2](./economic-flow-identity-v2.md)

## API y CLI

El backend consume la libreria `solguard_core`. Las tareas offline que necesitan
la misma logica de candidatos consumen el binario `solguard-core`:

```powershell
cargo run --locked --bin solguard-core -- rebuild-candidates "<project-dir>"
cargo run --locked --bin solguard-core -- replay-raw-candidates "<project-dir>" --base "<raw.json>" --out "<out.json>"
cargo run --locked --bin solguard-core -- replay-candidates "<project-dir>" --raw-candidates "<raw.json>" --invariants "<invariants.json>" --out "<dir>"
cargo run --locked --bin solguard-core -- refresh-poc-plans "<project-dir>"
```

`solguard-deploy` puede resolver el repositorio con `SOLGUARD_CORE_DIR`, cuyo
default es `../solguard-core`. Para ejecuciones reproducibles verifica que sea
el core enlazado por backend y canonicaliza database y las diez herramientas a
rutas fisicas absolutas. Los runners legacy siguen ligando corpus, imports,
policy y contenido Git al execution contract usado por `--resume`; ese flow
permanece como default. El batch scan-only es un camino diagnostico separado.

## Artefactos y compatibilidad

La migracion original cambio el propietario del codigo sin romper los
contratos autoritativos. El endurecimiento posterior anade contratos de
discovery y evidencia:

- `pipeline.v0.10` y el orden de fases permanecen estables;
- cada receipt de herramienta se conserva como `tool_phase.json` cuando el
  journal del core escribe `phase.json`;
- `analysis_funnel.json`, candidatos canonicos, VALIDATE, FILTER, EXPLOIT y
  reportes mantienen sus autoridades y rutas principales;
- `model_discovery_packs.v2` y `model_discovery_candidate.v2` sustituyen el
  contrato v1 de la frontera model-assisted;
- MAP, TRACE, ECONOMIC y VALUE añaden `economic_flow_identity.v2` a sus schemas
  actuales: los lectores legacy pueden ignorar los campos nuevos, mientras los
  consumidores estrictos exigen ID/digest y joins exactos;
- los flows legacy siguen siendo legibles, pero no pueden cerrar same-flow ni
  proofs `validate_consumable`;
- se anaden `value_proof_requests.json` y el directorio
  `candidates/value-evidence/` sin sobrescribir `value/attack_paths.json`;
- `AnalyzeOutputs` anade `candidate_value_dir` y las cuatro rutas JSON de esta
  segunda pasada; `/analyze` y `audit_only` siguen siendo compatibles para
  consumidores que aceptan campos aditivos;
- deploy deriva `solguard-product-priority-ranking.v2` solo desde artefactos de
  producto y anota despues `solguard-audit-ranking.v3`; el core no participa en
  ese matching ni recibe sus labels.

Estos cambios endurecen el contexto y el cierre de evidencia, pero todavia no
demuestran una mejora de rendimiento o recall. No se debe publicar esa
afirmacion hasta repetir los 90 labs y los holdouts independientes, congelar los
nuevos artefactos y compararlos con la baseline anterior.

La frontera host de prueba en deploy puede lanzar un proceso con un environment
exacto sin herencia y allowlist positiva de variables de aplicacion
`SOLGUARD_*`, bloqueando tambien loaders no enumerados como `LD_AUDIT`;
filesystem, argumentos y
ejecutables allowlisted. `source_sha256` es obligatorio y los `inputPaths` de
scanner, toolchain, product-priority, configuracion y todos los sources se
rehashan antes y despues de ejecutar. Esto prueba identidad en dos checkpoints,
no consumo mecanico por el child ni ausencia de swap-and-restore. Despues recoge
un output manifest cerrado,
liga ranking y receipt, y detecta traversal, symlinks o artefactos modificados.
El evaluator puede verificar envelopes DSSE, la cadena
exacta, los hashes de ground truth/catalogo/splits/matcher, el
`scan_report` sellado y el manifest completo antes de evaluar. Repite esos
hashes antes de publicar y obliga a escribir la evaluacion fuera del arbol de
scan. La evaluacion consume los bytes verificados y congelados de matcher,
catalogo, splits, ground truth y run, en lugar de reabrir esos inputs semanticos
por ruta tras verificarlos. Su TCB liga `evaluate.mjs`, `scan-contract.mjs` y
`scan-boundary.mjs`; el output debe ser una ruta fresca, separada y escrita de
forma exclusiva.
Ese inventario TCB aun se comprueba desde modulos importados antes del preflight;
strict necesita un launcher minimo fijado por el repositorio que verifique el
closure antes del import. Los JSON Schema son estructurales y los invariantes de
self-hash, cronologia, igualdad y cadena pertenecen al validador JS autoritativo.

`full-run.sh --flow boundary-scan --tier full` conecta el runner, plan y barrera
para el conjunto exacto v1-v8. No admite resume, seleccion de protocolo ni tier
release; tampoco ejecuta el evaluador. `legacy` sigue siendo el flow por defecto
y el batch nuevo declara siempre `release_eligible=false`.

Aun faltan inputs CAS/read-only, aislamiento confiable OCI/VM y una raiz de
confianza fijada por el repositorio, el consumo multi-chain del bundle por un
evaluador separado, una publicacion blind y la integracion de labs. La frontera
`host_process` permanece explicitamente ineligible y no demuestra aislamiento
de capacidades ni elimina todas las ventanas TOCTOU. Por eso `recall_at`
continua `null`, `oracle_capability_separated=false` y
`diagnostic_recall_at` es solo desarrollo. E0 sigue abierto y esta ola no cambia
detectores, recall observado ni calidad de hallazgos; tampoco autoriza un claim
de ejecucion blind. No se han ejecutado scans reales ni medido una mejora de
benchmark o recall como parte de esta ola.

## Publicacion y dependencias privadas

Core y `solguard-database` son repositorios privados usados como dependencias
hermanas en CI. Los workflows que hacen checkout deben recibir
`SOLGUARD_REPO_TOKEN` con acceso de lectura a ambos.

El backend fija el core aprobado mediante la variable de Actions
`SOLGUARD_CORE_REF`, que debe contener un SHA inmutable de 40 caracteres. Los
checkouts de database tambien se fijan a una revision concreta; no se usan
ramas movibles como contrato de compilacion.

El orden de rollout es fail-closed:

1. publicar `solguard-core` y validar `fmt`, `clippy`, tests y build locked;
2. configurar `SOLGUARD_CORE_REF` con ese commit y validar el backend en un
   runner limpio;
3. validar despues los prebuilds, fingerprints y replays de `solguard-deploy`.

No se debe publicar primero el consumidor si el remoto del core sigue vacio o
si una credencial de CI no puede resolver el core documental de database.

## Colision de nombres

Hay dos componentes distintos:

- `solguard-pipeline-core`: paquete del repositorio `solguard-core`, motor de
  auditoria descrito en esta pagina;
- `solguard-database::solguard-core`: crate historica bajo
  `solguard-database/crates/solguard-core`, dedicada solo a ingesta documental.

En texto se debe usar siempre uno de esos nombres calificados. En Rust ambos
pueden exponer identificadores parecidos, por lo que los manifests deben usar
aliases de dependencia cuando los dos aparezcan en el mismo grafo.
