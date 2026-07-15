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
el core enlazado por backend, canonicaliza database y las diez herramientas a
rutas fisicas absolutas, y liga corpus, imports, policy y contenido Git al
execution contract usado por `--resume`.

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
deteccion. El runner y el evaluador actuales todavia comparten capacidad de
oracle y no existe una scan attestation verificada: `recall_at` permanece
`null` y no elegible, mientras `diagnostic_recall_at` es solo desarrollo. La
separacion fisica pre-oracle pertenece a E0 y sigue pendiente.

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
