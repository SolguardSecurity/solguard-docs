# 04. API Externa y Rutas HTTP

La API externa corre en Rust/Axum y escucha en:

```text
http://127.0.0.1:{EXTERNAL_PORT}
```

Excepto el preflight CORS y la vista publica minima de `/health`, las rutas
requieren exactamente una cabecera:

```http
x-solguard-api-key: <EXTERNAL_API_KEY>
```

Los errores usan `{ "code": "...", "error": "..." }`. Un fallo privado anade
`incident_id` para correlacionar el log sin exponer paths, secretos o detalles
internos; un upstream no disponible responde `502` con ese mismo envelope.

## GET `/health`

Comprueba que el servidor Rust esta vivo.

Respuesta publica sin credencial:

```json
{
    "status": "ok",
    "service": "solguard-backend",
    "version": "...",
    "backend_binary_sha256": "..."
}
```

En un run gestionado, el mismo request con la clave externa correcta anade:

```json
{
    "execution_contract_sha256": "...",
    "execution_runtime": {
        "projects_dir": "...",
        "database_path": "...",
        "local_source_roots": ["..."],
        "database_connector_dir": "...",
        "map_dir": "...",
        "trace_dir": "...",
        "diff_dir": "...",
        "discover_dir": "...",
        "economic_dir": "...",
        "value_dir": "...",
        "invariant_dir": "...",
        "validate_dir": "...",
        "filter_dir": "...",
        "exploit_dir": "..."
    }
}
```

`execution_contract_sha256` y `execution_runtime` solo aparecen si el proceso
fue arrancado con el handshake de Deploy y el caller esta autenticado. Los
runners los comparan contra el Backend que ellos mismos crearon. La vista
publica nunca expone roots ni paths de herramientas.

Este digest llega por entorno: no es una identidad de build calculada por el
binario. Por eso `--no-backend` y `SOLGUARD_API_URL` estan deshabilitados hasta
que exista esa identidad fuerte. Estos campos no conceden autoridad al backend
sobre el pipeline.

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

Crea un proyecto nuevo.

Body:

```json
{
    "name": "Proyecto",
    "description": "opcional"
}
```

El nombre debe llegar en su forma canonica. Backend no lo sanea ni crea aliases;
Core publica `program.json`, `program.md`, `tool-outputs/` y `reports/` en modo
create-only. Un destino preexistente o fisicamente ambiguo se rechaza.

## GET `/projects/:project/validation-results`

Lee el contrato autoritativo de validacion del proyecto.

Filtros opcionales:

| Query           | Valores validos                                                       |
| --------------- | --------------------------------------------------------------------- |
| `result`        | `supported`, `refuted`, `inconclusive`                                |
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

Valida la request HTTP y delega el pipeline en `solguard-core`.

Body:

```json
{
    "project": "Proyecto",
    "target": "https://github.com/org/repo",
    "mode": "full",
    "analysis_profile": "generic_blind",
    "run_exploit": false
}
```

`target` puede ser una ruta local o una referencia remota soportada por el
runtime. `mode` acepta `full` y `audit_only`; el segundo ejecuta hasta FILTER y
omite de forma contractual las cinco fases posteriores. `run_exploit` no puede
contradecir la politica del modo. `analysis_profile` acepta solo
`compatibility` (default de transicion) y `generic_blind`; Backend lo transporta
y refleja sin reinterpretar seeds ni resultados. La respuesta incluye:

- `project`, `project_dir`, `source_dir`.
- `analysis_profile` exactamente igual al enum aceptado.
- `status`: `completed` o `completed_with_errors`.
- `tool_runs`: ejecuciones externas con estado, codigo, duracion y excerpts.
- `findings_path`: ruta a `findings.md`.
- `outputs`: mapa de rutas a artefactos.

Cuando `target` es un ZIP, el request debe anadir el objeto cerrado calculado
por el materializador de Deploy:

```json
{
    "project": "Proyecto",
    "target": "D:\\snapshots\\protocolo.zip",
    "mode": "audit_only",
    "run_exploit": false,
    "source_authority": {
        "schema_version": "solguard-source-authority-handoff.v1",
        "transport_bytes": 123,
        "transport_sha256": "<64-hex-minuscula>",
        "materialized_tree_sha256": "<64-hex-minuscula>"
    }
}
```

El objeto es obligatorio para ZIPs y no se admite con una carpeta local o un
target Git. La respuesta refleja `source_authority` como
`solguard-source-authority-receipt.v1` y
`outputs.source_authority_json` apunta al artefacto fisico create-only. El
backend conserva internamente el lease OS de Core hasta terminar de serializar
esta respuesta; ese lease no aparece en JSON.

Artefactos destacados en `outputs`:

- `pipeline_json`
- `source_authority_json` para una fuente ZIP autoritativa
- `analysis_funnel_json`
- `canonical_candidates_json`
- `raw_candidates_json`
- `rejected_candidates_json`
- `candidate_lifecycle_json`
- `model_discovery_diagnostics_json`
- `candidate_value_dir`
- `value_proof_requests_json`
- `value_proof_responses_json`
- `effective_attack_paths_json`
- `value_proof_closure_diagnostics_json`
- `validation_results_json`
- `validation_results_md`
- `filter_results_json`
- `findings_md`
- `review_queue_md`
- `impact_escalation_json`
- `poc_plan_json`
- `exploit_results_json`
- `report_manifest_json`
- `profile_json`

El campo `status = completed` no significa que haya findings; significa que el
pipeline completo produjo sus artefactos sin degradaciones relevantes. Los
findings reales se determinan leyendo `validation_results_json`.

Los cinco campos `candidate_value` son aditivos. Backend no decide si una
respuesta VALUE puede aplicarse: core exige cierre completo, autoridad
`map_trace_reverified`, ausencia de autocorroboracion y binding exacto antes de
emitir la vista efectiva.
