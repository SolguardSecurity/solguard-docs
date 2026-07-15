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
