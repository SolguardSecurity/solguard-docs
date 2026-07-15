# 05. Servicios Rust y Responsabilidades

La frontera Rust se divide entre el adaptador HTTP y el motor.

## En `solguard-backend`

### Controllers

Validan body, query y path; transforman el request al tipo de entrada del core;
invocan la libreria; y convierten el resultado o error en HTTP. No ejecutan
herramientas ni escriben artefactos de analisis.

### Routes y middleware

Definen la superficie Axum, CORS y observabilidad HTTP. Las rutas publicadas no
cambian por la migracion.

### Bootstrap

`main.rs` carga el entorno necesario para el host, construye los adaptadores y
el contexto del core, y arranca el servidor. El servicio Node/Ollama permanece
como dependencia local inyectada, no como autoridad de deteccion.

## En `solguard-core`

- `services/analyze.rs`: fachada de analisis consumida por backend.
- `services/analyzer/runtime.rs`: pipeline y ejecucion de herramientas.
- `services/analyzer/types.rs`: tipos serializados de analisis.
- `services/analyzer/seeds/**`: deteccion determinista.
- `services/analyzer/finalizers.rs`: cierre, binding y reconciliacion.
- `services/pipeline.rs`: orden y journal `pipeline.v0.10`.
- `services/filter.rs`: FILTER y reconciliacion `filter.v0.1`.
- `services/exploit.rs`: admision y provenance `exploit.v0.2`.
- `services/impact.rs`, `poc_plan.rs` y `technical_report.rs`: salidas
  posteriores a FILTER.
- `services/projects.rs`, `ingest.rs`, `knowledge.rs` e `internal_client.rs`:
  servicios no HTTP reutilizables.

## Regla de propiedad

Si un cambio decide que fase se ejecuta, con que argumentos, que candidato se
conserva, como se reconcilia un artefacto o que se escribe en el proyecto,
pertenece al core. Si valida o representa una request/response HTTP, pertenece
al backend.

El inventario completo esta en
[Servicios y responsabilidades de core](../solguard-core/servicios-y-responsabilidades.md).
