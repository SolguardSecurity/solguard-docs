# Servicios y responsabilidades de Solguard Core

`src/services` contiene la logica de producto reutilizable. Ningun modulo de
esta jerarquia define rutas, status codes o DTO HTTP.

## Fachada y workspace

### `analyze.rs`

Es la fachada consumida por el backend. Reexporta las opciones, estados,
outputs, perfil y tool runs del analizador, ejecuta el pipeline y permite leer
resultados VALIDATE con filtros estrictos.

### `projects.rs`

Gestiona `SOLGUARD_PROJECTS_DIR`: sanea nombres, crea `program.json`,
`program.md`, `tool-outputs/` y `reports/`, enumera proyectos y repara metadata
ausente o invalida sin salir del workspace configurado.

### `ingest.rs`

Recorre documentos soportados, usa el crate documental de
`solguard-database` y entrega el payload al conector Bun. El alias Rust
`solguard_ingest_core` distingue esa dependencia del motor de pipeline.

### `knowledge.rs`

Consulta SQLite para resumen, busqueda, respuesta directa y enriquecimiento
historico posterior a candidatos. El conocimiento historico no sustituye la
evidencia de producto ni modifica el veredicto de VALIDATE.

### `internal_client.rs`

Adapta el servicio local de modelo para health, info y search. Core recibe el
cliente ya configurado por el host; puertos y credenciales siguen perteneciendo
al backend.

## Motor de analisis

### `analyzer/runtime.rs`

Prepara el proyecto, resuelve el target, ejecuta las herramientas, registra el
journal, construye candidatos y coordina VALIDATE, FILTER y las fases
posteriores. Tambien conserva degradaciones como fast MAP, fallbacks tipados,
timeouts y preservacion de receipts de herramienta.

### `analyzer/types.rs`

Define los contratos serializados: opciones y resultado del analisis, tool
runs, perfil, candidatos canonicos, evidencias, superficies, transiciones,
protecciones y diagnosticos. Cambiar un campo observable exige una migracion de
contrato y documentacion coordinada.

### `analyzer/seeds/**`

Contiene las familias deterministas para Solidity, Vyper, TypeScript, Rust,
C/C++, NFT y protocolos Web3/DLT. Las seeds deben producir evidencia,
superficies, causalidad y break conditions trazables; nunca decisiones tomadas
desde ground truth.

### `analyzer/bug_family_registry.rs`

Normaliza familias y taxonomia para que signals, candidatos e invariantes usen
identidades coherentes.

### `analyzer/finalizers.rs`

Canonicaliza, agrupa, enlaza invariantes, preserva leads y genera diagnosticos
antes de entregar candidatos a VALIDATE. IDs, bindings y source evidence son
contratos de compatibilidad.

### `analyzer/validation.rs`

Normaliza `validation_results.json` y sus mirrors. VALIDATE conserva la
autoridad sobre `supported`, `refuted` e `inconclusive`; los resultados se
clasifican como `supported_finding`, `review_queue`, `reviewable_lead` o
`non_finding`.

## Pipeline y fases posteriores

### `pipeline.rs`

Implementa `pipeline.v0.10` y `pipeline_phase.v0.10`, exige el orden de quince
fases y escribe `tool-outputs/pipeline.json`. Cuando una herramienta ya produjo
`phase.json`, core lo preserva como `tool_phase.json` antes de escribir el
receipt de orquestacion.

### `filter.rs`

Invoca `solguard-filter` con los inputs minimos autorizados, valida hashes,
cobertura, gates, score, blockers, eligibility y summary de `filter.v0.1`. Un
fallo no fabrica resultados: FILTER permanece fail-closed.

### `exploit.rs`

Comprueba la procedencia `exploit.v0.2`, el hash inmutable de FILTER y la
eligibilidad antes de invocar `solguard-exploit`. Un exit code no basta para
aceptar un contrato incompleto o incoherente.

### `impact.rs`

Deriva capacidad del atacante, estado invalido, repeticion, beneficio y perdida
solo para findings soportados. Su fallback no reescribe VALIDATE.

### `poc_plan.rs` y `poc_plan_refresh.rs`

Construyen planes reproducibles y seleccionan harnesses Foundry, Hardhat,
Anchor, Rust o multiproceso. Planificar no equivale a reproducir ni a admitir
un exploit.

### `technical_report.rs`

Renderiza informes para findings soportados y mantiene un manifest de archivos
generados. IDs, evidencia, veredicto y severidad permanecen deterministas aun
cuando se utilice modelo para texto redactado.

## Regla de propiedad

Una decision sobre orden de fases, comandos, candidatos, hashes, fallbacks,
artefactos o admision pertenece a core. La representacion de esa operacion como
request/response HTTP pertenece a backend.
