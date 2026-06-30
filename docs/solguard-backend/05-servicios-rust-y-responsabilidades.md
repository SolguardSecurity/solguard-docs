# 05. Servicios Rust y Responsabilidades

La carpeta `src/services` concentra la logica de negocio. Los controladores HTTP
deben mantenerse delgados: validan body/query/path, llaman servicios y traducen
errores a respuestas JSON.

## `projects.rs`

Gestiona el workspace local:

- crea `SOLGUARD_PROJECTS_DIR`;
- sanea nombres de proyecto;
- inicializa `program.json`, `program.md`, `tool-outputs/` y `reports/`;
- lista proyectos existentes;
- resuelve rutas de proyecto.

## `internal_client.rs`

Cliente HTTP del servicio interno Node. Usa `INTERNAL_API_KEY` como bearer o
header interno y expone:

- health interno;
- info interno;
- busqueda con modo `general`, `knowledge` o `hybrid`.

Los fallos aqui se convierten en error upstream (`502`) desde controladores.

## `knowledge.rs`

Lee la base SQLite de `solguard-database` para:

- resumen de conocimiento en `/info`;
- contexto de busqueda para `/search`;
- respuestas directas de base de datos en modo `knowledge`;
- recuperacion historica posterior a candidatos.

La recuperacion historica usada por el analisis ocurre despues de VALIDATE. No
debe alimentar la decision determinista previa.

## `ingest.rs`

Orquesta la ingesta de informes. Recorre rutas, filtra formatos soportados,
invoca el conector de `solguard-database` con Bun y devuelve:

- archivos procesados;
- informes insertados;
- rutas omitidas;
- fallos parciales;
- ruta de base de datos utilizada.

## `analyze.rs`

Fachada publica del analizador. Reexporta tipos (`AnalyzeOutputs`,
`AnalyzeStatus`, `ToolRun`) y llama al runtime de `services/analyzer`.

## `analyzer/runtime.rs`

Orquestador principal del pipeline. Responsabilidades:

- preparar proyecto y source tree;
- clonar o resolver el target;
- ejecutar herramientas externas;
- registrar cada fase en `PipelineJournal`;
- construir seeds y candidatos;
- llamar al modelo para discovery acotado cuando procede;
- ejecutar VALIDATE;
- impedir que fases posteriores modifiquen `validation_results.json`;
- escribir artefactos finales, perfil y logs.

Tambien contiene guards de runtime como fast-map en repos grandes y reintento de
`map --deep` con `--fast` cuando excede la ventana acotada.

## `analyzer/types.rs`

Define los contratos serializados de analisis:

- `AnalyzeResult`
- `AnalyzeStatus`
- `AnalyzeOutputs`
- `ToolRun`
- `AnalysisProfile`
- estructuras de candidatos canonicos, evidencias, superficies, transiciones,
  protecciones y diagnosticos.

Cuando se anade un artefacto nuevo que deba ver el cliente, este archivo debe
actualizarse junto con la documentacion de API.

## `analyzer/validation.rs`

Construye y normaliza `validation_results.json` y su markdown. Sus clases son:

- `supported_finding`: finding soportado y renderizable.
- `review_queue`: candidato inconcluso que necesita revision.
- `reviewable_lead`: lead que todavia no esta listo para validacion completa.
- `non_finding`: candidato refutado o clasificado como no finding.

Tambien genera mirrors seguros:

- `findings.md` solo incluye `supported_finding`.
- `review_queue.md` conserva lo inconcluso para investigacion manual.
- `rejected_hypotheses.md` apunta al contrato autoritativo.

## `analyzer/seeds/*`

Familias de patrones deterministas que transforman senales de source/trace/map
en hipotesis estructuradas. Incluye familias Solidity, Vyper, TypeScript,
Rust/C++, NFT y patrones de protocolos reales.

Estas semillas no deben emitir texto libre sin evidencia: deben producir
invariantes, superficies, break conditions, flujo/estado y referencias que
puedan llegar a VALIDATE.

## `analyzer/bug_family_registry.rs`

Registro de familias de bugs. Sirve para normalizar taxonomia, evitar llaves
inconsistentes y mantener una relacion trazable entre senales y familias.

## `analyzer/finalizers.rs`

Finaliza candidatos y resultados para mantener contratos estables antes de
renderizar o exponer salidas.

## `pipeline.rs`

Implementa el journal del pipeline. Enforcea el orden:

```text
map -> diff -> trace -> discover -> economic -> invariant -> candidates -> validate -> historical-enrichment -> impact -> poc-plan -> report
```

Estados posibles:

- `completed`
- `degraded`
- `completed_with_errors`
- `fallback`
- `skipped`

Cada fase escribe su propio `phase.json` y el manifiesto global vive en
`tool-outputs/pipeline.json`.

## `impact.rs`

Analiza impacto solo despues de tener veredictos. Consume candidatos,
`validation_results.json`, map y trace. Si falla, genera un reporte fallback sin
alterar el veredicto determinista.

## `poc_plan.rs`

Genera planes de PoC para candidatos soportados o parcialmente accionables.
Evalua idoneidad de harnesses como Foundry, Hardhat, Anchor, Rust test,
fork test e integracion multiproceso. Es planificacion: no ejecuta exploits y no
modifica veredictos.

## `technical_report.rs`

Renderiza informes tecnicos en `reports/` para findings soportados y un
`report_manifest.json`. Puede usar texto del modelo en partes redactadas, pero
los IDs, veredictos, severidad, evidencia y rutas provienen de contratos
deterministas.
