# 07. SolGuard Discover

`solguard-discover` infiere un modelo semantico de protocolo desde MAP, TRACE y
opcionalmente el source tree. Es una fase de descubrimiento ciego de reglas,
objetos de ciclo de vida, rutas, gaps e hipotesis.

No confirma vulnerabilidades. Produce senales backend-ready para candidatos.

## Inputs

Obligatorios:

- `--map <audit_map.json>`
- `--trace <trace.json | trace directory>`

Opcional:

- `--source <source dir>`

## CLI actual

```powershell
cargo run --release -- `
  --map project/tool-outputs/map/audit_map.json `
  --trace project/tool-outputs/trace `
  --source project/source `
  --out project/tool-outputs/discover
```

Opciones de limites:

- `--max-duration-ms`
- `--max-json-file-bytes`
- `--max-trace-files`
- `--max-trace-bytes-total`
- `--max-source-files`
- `--max-source-file-bytes`
- `--max-source-bytes-total`
- `--max-source-lines-total`
- `--max-corpus-bytes`
- `--max-intent-signals`
- `--max-working-set-bytes`

Tambien existen variables equivalentes:

- `SOLGUARD_DISCOVER_MAX_DURATION_MS`
- `SOLGUARD_DISCOVER_MAX_JSON_FILE_BYTES`
- `SOLGUARD_DISCOVER_MAX_TRACE_FILES`
- `SOLGUARD_DISCOVER_MAX_TRACE_BYTES_TOTAL`
- `SOLGUARD_DISCOVER_MAX_SOURCE_FILES`
- `SOLGUARD_DISCOVER_MAX_SOURCE_FILE_BYTES`
- `SOLGUARD_DISCOVER_MAX_SOURCE_BYTES_TOTAL`
- `SOLGUARD_DISCOVER_MAX_SOURCE_LINES_TOTAL`
- `SOLGUARD_DISCOVER_MAX_CORPUS_BYTES`
- `SOLGUARD_DISCOVER_MAX_INTENT_SIGNALS`
- `SOLGUARD_DISCOVER_MAX_WORKING_SET_BYTES`

## Salidas

Schemas:

```text
protocol_model.v0.1
discover_index.v0.1
```

Archivos:

- `protocol_model.json`
- `index.json`
- `protocol_model.md`
- `summary.txt`

## Que infiere

El modelo puede incluir:

- actores;
- protocol assets;
- lifecycle objects;
- trust boundaries;
- attack surfaces;
- reconstructed call routes;
- intent signals;
- implicit protocol rules;
- counterexample templates;
- scenario trace hypotheses;
- invariant gaps;
- blind vulnerability hypotheses;
- negative evidence signals.

## Hipotesis backend-ready

Las hipotesis blind se emiten con lineas/evidencia para que el core pueda
convertirlas en candidatos:

- `canonical_issue_key`
- `semantic_rule`
- `root_cause_surface`
- `trigger_surface`
- `impact_surface`
- `chain[i]`
- `target_location`
- `fingerprint`
- `missing_evidence`

En el core pueden aparecer con
`primary_evidence_source = protocol_invariant_discovery`.

## Integracion con model discovery v2 de core

El `protocol_model.json` de esta herramienta y los model packs construidos por
core son contratos distintos. `solguard-discover` posee el modelo de protocolo;
`solguard-pipeline-core` posee
`tool-outputs/candidates/model_discovery_packs.json` con
`model_discovery_packs.v2`.

Para cada target seleccionado, core forma una capsula source-grounded y
open-world. Incluye como maximo doce aristas resueltas conectadas al target y no
permite que aristas globales no relacionadas consuman ese cupo. Un target no se
descarta solo por carecer de aristas o invariantes previos. Cada pack declara
`OPEN_WORLD=true`, `VALIDATION_AUTHORITY=false` y exige la salida compacta
`model_discovery_candidate.v2`.

Dentro de esas doce aristas, core intercala primero las conexiones directas
entrantes del lado root-cause y las salientes del lado impact; asi un fan-out
grande no elimina la otra mitad causal. Si TRACE no entrega ningun target
source-backed utilizable, core usa un fallback MAP acotado: selecciona simbolos
function-like, prioriza superficies `public`/`external` y de valor, y excluye
tests, mocks, fixtures, vendor y `node_modules`. El contexto declara
`trace.model_discovery_map_fallback.v1` y
`coverage_gap=trace_targets_unavailable`.

El modelo solo propone semantica y los IDs exactos de las tres superficies.
Core resuelve file/line, invariantes, ruta y evidencia desde el propio pack. No
confia en `chain` ni `evidence_ids` aportados por el modelo. Si no puede
reconstruir invariant tipado y ruta con evidencia, conserva la hipotesis como
lead exploratorio y la excluye de VALIDATE.

El fallback MAP no cambia esa regla: su capsula es degradada, open-world y sin
autoridad de validacion.

El contrato completo se describe en
[DISCOVER v2 y cierre candidate-directed VALUE](../solguard-core/discovery-v2-y-candidate-value.md).

## Capabilities

`protocol_model.json` e `index.json` registran:

- upstream dependencies;
- input capabilities;
- consumed capabilities;
- output capabilities.

Esto permite saber que datos ofrecian MAP/TRACE y que parte fue realmente usada.

## Degradacion

En repos grandes o con limites agotados, DISCOVER escribe un modelo degradado en
vez de ejecutar sin limite. La degradacion queda visible en metadata,
`protocol_model.md`, `summary.txt` y diagnosticos.

## Limites

- No valida reachability completa.
- No confirma impacto.
- Las reglas implicitas son hipotesis hasta pasar por INVARIANT/VALIDATE.
- El source opcional ayuda a minar intenciones, pero no sustituye evidencia
  estructurada.
- Los packs v2 mejoran la disciplina de grounding; no prueban por si solos una
  mejora de recall ni de generalizacion.
