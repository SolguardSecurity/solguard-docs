# 02. SolGuard Trace

`solguard-trace` profundiza sobre targets concretos usando codigo fuente y,
cuando existe, `audit_map.json`. Su salida explica guards, estado, efectos,
rutas, causalidad y senales semanticas por target.

No confirma vulnerabilidades. Produce evidencia y candidatos de revision.

## Inputs

Entrada principal:

```text
<repo local>
```

Inputs opcionales:

- `--target <Contract.function>` para modo individual.
- `--from-map <audit_map.json>` para contexto MAP o batch mode.

## CLI actual

Modo individual:

```powershell
cargo run -- <repo> --target Vault.withdraw --out solguard-trace-output
```

Modo batch desde MAP:

```powershell
cargo run -- <repo> --from-map solguard-output/audit_map.json --top 20 --out solguard-trace-output
```

Opciones:

| Opcion | Funcion |
| --- | --- |
| `--target <name>` | Target individual. |
| `--out <dir>` | Directorio de salida. Default: `solguard-trace-output`. |
| `--from-map <path>` | Contexto de `audit_map.json`. |
| `--max-depth <n>` | Profundidad de llamadas internas. Default: `2`. |
| `--top <n>` | Batch budget de targets. |
| `--levels S,A,...` | Filtra batch por nivel SolGuard. |
| `--include-tests` | Incluye tests/mocks Solidity omitidos por defecto. |
| `--no-color` | Desactiva colores ANSI. |

Reglas:

- Si se usa batch (`--top` o `--levels`), `--from-map` es obligatorio.
- `--target` no puede combinarse con batch.
- Si no hay batch, `--target` es obligatorio.

## Contrato de salida

Schema principal:

```text
trace.v0.9
```

Modo individual:

- `trace.json`
- `trace.md`
- `summary.txt`

Modo batch:

- `index.json`
- `index.md`
- `summary.txt`
- `traces/<rank>_<target>.json`
- `traces/<rank>_<target>.md`
- `traces/<rank>_<target>.txt`

## Que modela

TRACE puede incluir:

- call trace;
- deep paths;
- assembled paths desde MAP;
- state reads/writes;
- guards;
- metrics;
- external effects;
- semantic flows;
- limit controls;
- mismatch candidates;
- temporal findings;
- economic findings;
- identity completeness;
- atomicity checks;
- semantic context flows;
- semantic findings con superficies, evidencia y confidence.

## Batch mode

`--top` es presupuesto, no truncado ciego. La seleccion intenta mantener
diversidad por lenguaje, componente y cluster para que una superficie con mucha
senal no expulse otras rutas relevantes.

## Relacion con MAP

TRACE consume `audit_map.json` como fuente estructural. Usa:

- `graph_edges`;
- `cross_component_links`;
- `cross_component_paths`;
- `semantic_contexts`;
- `context_couplings`;
- `identity_schemas`;
- `atomicity_boundaries`;
- state/economic/build context.

Las relaciones `partial` o `unresolved` se conservan como preguntas de revision,
no como llamadas confirmadas.

## Limites

- No ejecuta transacciones ni tests.
- No confirma impacto material.
- `semantic_findings` pueden ser `signal`, `candidate`, `supported` o
  `review_required`, pero `validated` y `refuted` pertenecen a VALIDATE.
- En modo multi-lenguaje, parte del analisis depende del contexto MAP y
  heuristicas deterministas.
