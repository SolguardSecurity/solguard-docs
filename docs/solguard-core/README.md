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

### Segunda ola E0 en deploy

La segunda ola añade infraestructura para demostrar esa congelacion fuera del
core, sin introducir capacidades de benchmark en el motor. `solguard-deploy`
define cuatro payloads versionados:

- `solguard-scan-contract.v1`;
- `solguard-scan-receipt.v1`;
- `solguard-scan-attestation.v1`;
- `solguard-evaluation-contract.v1`.

V1-v8 tambien tienen ahora catalogos oracle-free `protocols-scan.json` bajo
`solguard-scan-catalog.v1`: 24 targets en v1 y 20 en cada suite v2-v8. El
generador/check mantiene paridad exacta de project+commit y bytes materializados
exactos. Cada target contiene solo project, commit y locators/mirrors limitados
a `codeload.github.com`; elimina nombres, categorias, aliases y texto libre, y
liga su suite a la solicitada y cada locator ref a `commit`. Un ref legacy
`main`/`master` solo se convierte en
input fijo cuando el scan contract compromete los bytes descargados mediante el
`source_sha256` obligatorio. Este catalogo es el unico componente de la nueva
frontera ya integrado en las suites.

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

Tambien existe un fingerprint `solguard-scan-execution-contract.v1` que liga
solo launcher, runner, catalogo de scan, toolchain, configuracion, runtime
policy, recovery y modulos productivos. El constructor rechaza recursivamente
ground truth, matcher, evaluator, splits, adjudications y source coverage. Este
fingerprint scan-only convive de momento con el execution contract legacy usado
por los runners actuales; no debe confundirse con una migracion ya desplegada.

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
rutas fisicas absolutas. Los runners actuales siguen ligando corpus, imports,
policy y contenido Git al execution contract legacy usado por `--resume`; la
nueva huella scan-only todavia no sustituye ese flujo.

## Artefactos y compatibilidad

La migracion cambia el propietario del codigo, no los contratos observables:

- `pipeline.v0.10` y el orden de fases permanecen estables;
- cada receipt de herramienta se conserva como `tool_phase.json` cuando el
  journal del core escribe `phase.json`;
- `analysis_funnel.json`, candidatos canonicos, VALIDATE, FILTER, EXPLOIT y
  reportes mantienen rutas y esquemas;
- `/analyze`, `audit_only` y las respuestas HTTP siguen siendo compatibles;
- deploy deriva `solguard-product-priority-ranking.v2` solo desde artefactos de
  producto y anota despues `solguard-audit-ranking.v3`; el core no participa en
  ese matching ni recibe sus labels.

Esta separacion no implica una afirmacion de rendimiento o recall. Su objetivo
es asignar una unica propiedad arquitectonica al pipeline sin cambiar la
deteccion.

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

Sin embargo, solo los catalogos estan integrados. Aun faltan el runner scan-only
comun, la barrera global scan-close-seal, el bundle v1-v8 y su conexion a
`full-run.sh` y labs. No existen inputs CAS/read-only ni un attestor OCI o VM
real; una frontera
`host_process` permanece explicitamente ineligible y no demuestra aislamiento
de capacidades. Tampoco elimina todas las ventanas TOCTOU ni sustituye inputs
CAS o mounts de solo lectura. Por eso `recall_at` continua `null`,
`oracle_capability_separated=false` y `diagnostic_recall_at` es solo desarrollo.
E0 sigue abierto y esta ola no cambia detectores, recall observado ni calidad de
hallazgos; tampoco autoriza un claim de ejecucion blind. No se han ejecutado
scans reales ni medido una mejora de benchmark o recall como parte de esta ola.

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
