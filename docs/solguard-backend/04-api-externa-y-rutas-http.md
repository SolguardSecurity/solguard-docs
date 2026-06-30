# 04. API Externa y Rutas HTTP

La API externa corre en Rust/Axum y escucha en:

```text
http://127.0.0.1:{EXTERNAL_PORT}
```

Los errores de validacion local devuelven `400` con `{ "error": "..." }`. Los
errores al hablar con el servicio interno devuelven `502` con el mismo formato.

## GET `/health`

Comprueba que el servidor Rust esta vivo.

Respuesta:

```json
{
  "status": "ok",
  "service": "solguard-backend",
  "version": "..."
}
```

## GET `/info`

Devuelve metadatos del backend, estado del servicio interno y resumen de la base
de conocimiento.

Campos principales:

- `service`: siempre `solguard-backend`.
- `version`: valor de `VERSION`.
- `external_port` e `internal_port`.
- `internal_health`: respuesta de `/internal/health` si esta disponible.
- `internal`: respuesta de `/internal/info` si esta disponible.
- `knowledge`: resumen calculado desde SQLite.
- `capabilities`: actualmente lista `health`, `info`, `search` e `ingest`. No
  debe interpretarse como lista exhaustiva de rutas implementadas.

## POST `/install`

Crea `SOLGUARD_PROJECTS_DIR` si no existe.

Respuesta:

```json
{
  "projects_dir": "..."
}
```

## GET `/projects`

Lista proyectos encontrados en `SOLGUARD_PROJECTS_DIR`.

Respuesta:

```json
{
  "projects_dir": "...",
  "projects": [
    {
      "name": "Proyecto",
      "description": "...",
      "path": "..."
    }
  ]
}
```

## POST `/projects/init`

Crea o inicializa un proyecto.

Body:

```json
{
  "name": "Proyecto",
  "description": "opcional"
}
```

El nombre se sanea para ser seguro en filesystem. Se crean `program.json`,
`program.md`, `tool-outputs/` y `reports/`.

## GET `/projects/:project/validation-results`

Lee el contrato autoritativo de validacion del proyecto.

Filtros opcionales:

| Query | Valores validos |
| --- | --- |
| `result` | `supported`, `refuted`, `inconclusive` |
| `finding_class` | `supported_finding`, `review_queue`, `reviewable_lead`, `non_finding` |

Ejemplo:

```text
GET /projects/Curve-Finance-Metapool/validation-results?finding_class=supported_finding
```

## POST `/search`

Consulta el modelo local y, segun modo, la base de conocimiento.

Body:

```json
{
  "query": "patrones parecidos a share inflation",
  "mode": "hybrid"
}
```

`mode` es opcional. Valores:

- `general`: no prepara contexto de base de conocimiento.
- `knowledge`: usa la base de conocimiento; para algunas preguntas agregadas
  puede responder directamente con `model = "solguard-database"`.
- `hybrid`: default; usa contexto historico como prior y pide al modelo razonar
  sobre la consulta.

Respuesta:

```json
{
  "mode": "hybrid",
  "answer": "...",
  "model": "...",
  "used_context": true,
  "retrieval": {}
}
```

## POST `/ingest`

Ingiere informes desde un archivo o directorio hacia `solguard-database`.

Body:

```json
{
  "path": "C:\\ruta\\a\\informes"
}
```

Respuesta:

```json
{
  "processed": 1,
  "inserted": [
    {
      "source_sha256": "...",
      "report_title": "...",
      "finding_count": 3,
      "payload_path": "..."
    }
  ],
  "skipped": [],
  "failures": [],
  "database_path": "..."
}
```

## POST `/analyze`

Ejecuta el pipeline completo sobre un target.

Body:

```json
{
  "project": "Proyecto",
  "target": "https://github.com/org/repo"
}
```

`target` puede ser una ruta local o una referencia remota soportada por el
runtime. La respuesta incluye:

- `project`, `project_dir`, `source_dir`.
- `status`: `completed` o `completed_with_errors`.
- `tool_runs`: ejecuciones externas con estado, codigo, duracion y excerpts.
- `findings_path`: ruta a `findings.md`.
- `outputs`: mapa de rutas a artefactos.

Artefactos destacados en `outputs`:

- `pipeline_json`
- `analysis_funnel_json`
- `canonical_candidates_json`
- `raw_candidates_json`
- `rejected_candidates_json`
- `candidate_lifecycle_json`
- `model_discovery_diagnostics_json`
- `validation_results_json`
- `validation_results_md`
- `findings_md`
- `review_queue_md`
- `impact_escalation_json`
- `poc_plan_json`
- `report_manifest_json`
- `profile_json`

El campo `status = completed` no significa que haya findings; significa que el
pipeline completo produjo sus artefactos sin degradaciones relevantes. Los
findings reales se determinan leyendo `validation_results_json`.
