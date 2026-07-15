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

Dentro de CANDIDATES tambien construye los packs target-scoped
`model_discovery_packs.v2`, ejecuta el model discovery acotado y coordina la
segunda pasada VALUE `candidate_value`. Esta pasada no sustituye la fase VALUE
inicial ni autoriza findings: produce requests, responses, vista efectiva y
diagnosticos de cierre antes de materializar los candidatos para VALIDATE.

### `analyzer/types.rs`

Define los contratos serializados: opciones y resultado del analisis, tool
runs, perfil, candidatos canonicos, evidencias, superficies, transiciones,
protecciones y diagnosticos. Cambiar un campo observable exige una migracion de
contrato y documentacion coordinada.

`AnalyzeOutputs` incluye de forma aditiva:

- `candidate_value_dir`;
- `value_proof_requests_json`;
- `value_proof_responses_json`;
- `effective_attack_paths_json`;
- `value_proof_closure_diagnostics_json`.

Backend puede transportar estas rutas, pero su semantica y autoridad siguen
perteneciendo al core.

### `analyzer/evidence_requests.rs`

Construye hasta 128 consultas `solguard-value-proof-requests.v1` desde
candidatos cuyas tres superficies estan grounded en MAP/TRACE. Cada evidence ID
se resuelve al origin, fichero y linea reales antes de serializar; las refs
imposibles se eliminan y una request sin ninguna referencia exacta o sin una
unica ruta VALUE base con el mismo triple causal se omite.
Aplica `solguard-value-proof-responses.v1` solo tras comprobar schema,
igualdad completa de IDs request/response, identidades, obligaciones, path
base, superficies, refs independientes, readiness e invariant binding.

El modulo rechaza autocorroboracion, exige
`evidence_authority=map_trace_reverified` y mantiene fuera de VALIDATE toda
respuesta que no sea `complete` y `validate_consumable`. Tambien escribe
`effective_attack_paths.json` sin mutar el output VALUE original y
`solguard-value-proof-closure-diagnostics.v1`. Durante el cierre genera un
índice MAP/TRACE propio para rechazar refs falsificados, divergencia entre el
proof suelto y el embebido o cualquier mutación de la ruta/claim VALUE original.

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

Para `model_discovery_candidate.v2`, resuelve los IDs exactos de
`SYMBOL_LOCATION` y reconstruye de forma autoritativa la ruta y la evidencia
desde `RESOLVED_EDGE` y `TYPED_INVARIANT`. El modelo no controla file/line,
chain ni evidence IDs. Una hipotesis sin grounding suficiente se marca
`model_exploratory_source` y nunca se incluye en la entrada de VALIDATE.

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
un exploit. La seleccion solo usa fixtures vinculadas a source o tests reales
del proyecto; core no carga ground truth ni sintetiza fixtures desde bugs
esperados.

### `technical_report.rs`

Renderiza informes para findings soportados y mantiene un manifest de archivos
generados. IDs, evidencia, veredicto y severidad permanecen deterministas aun
cuando se utilice modelo para texto redactado.

## Regla de propiedad

Una decision sobre orden de fases, comandos, candidatos, hashes, fallbacks,
artefactos o admision pertenece a core. La representacion de esa operacion como
request/response HTTP pertenece a backend.
