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

| Opcion                      | Funcion                                                         |
| --------------------------- | --------------------------------------------------------------- |
| `--target <name>`           | Target individual.                                              |
| `--out <dir>`               | Directorio de salida. Default: `solguard-trace-output`.         |
| `--from-map <path>`         | Contexto de `audit_map.json`.                                   |
| `--max-depth <n>`           | Profundidad de llamadas internas. Default: `2`.                 |
| `--max-path-expansions <n>` | Presupuesto de expansiones causales por target. Default: `192`. |
| `--max-deep-paths <n>`      | Máximo de deep paths retenidos por target. Default: `64`.       |
| `--top <n>`                 | Batch budget de targets.                                        |
| `--levels S,A,...`          | Filtra batch por nivel SolGuard.                                |
| `--include-tests`           | Incluye tests/mocks Solidity omitidos por defecto.              |
| `--no-color`                | Desactiva colores ANSI.                                         |

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

El recorrido profundo reparte el presupuesto de expansión entre los hermanos
pendientes antes de profundizar. Así, una primera cadena extensa no puede
agotar toda la cuota y ocultar una rama crítica posterior; la cuota no usada se
recupera de forma determinista. TRACE deduplica paths antes de aplicar el límite
de retención.

Todo `trace.json` y `index.json` declara en `metadata` los valores efectivos de
`max_depth`, `max_path_expansions` y `max_deep_paths`. Si un límite corta
contexto o rutas, el artefacto lo conserva mediante
`target_context_budget_truncated`, `deep_path_budget_truncated` o la
terminación `path_expansion_budget`. La ausencia, invalidez o contradicción de
esa metadata es deuda de integridad, no una ejecución ilimitada implícita.

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

En batch, el MAP se deserializa una sola vez y se proyecta después al contexto
source-backed de cada target. Esto evita que el coste de lectura crezca como
`targets × tamaño del MAP` sin cambiar el contrato semántico.

Las relaciones `partial` o `unresolved` se conservan como preguntas de revision,
no como llamadas confirmadas.

### Preservación de `economic_flow_identity.v2`

Cuando MAP declara `economic_flow_identity.v2`, TRACE consume y vuelve a emitir
la misma identidad content-addressed. Conserva el `id`, `route_digest`,
`lineage_id`, la lista completa y ordenada de steps, `operation_ids`,
`causal_edge_ids`, `branch_choices` y `asset_legs`. Cada step mantiene también
`source_ordinal` y `branch_path`; TRACE no puede colapsar dos operaciones de la
misma línea ni eliminar la procedencia de rama.

Un slice de TRACE puede seleccionar una ruta, pero no podar sus steps y mantener
el mismo ID: eso convertiría la identidad en una afirmación falsa. La selección
de operaciones del slice se amplía para incluir las operaciones de los flujos
seleccionados, mientras la ruta canónica permanece intacta.

La evidencia económica conserva los arrays compatibles `flow_ids` y
`flow_route_digests`, pero publica la correlación autoritativa en
`flow_route_bindings[{flow_id,route_digest}]`. Un set legacy con varias rutas no
permite inferir qué digest pertenece a cada ID y permanece ambiguo. TRACE solo
emite pares para rutas v2 coherentes y topológicamente `resolved`, y publica las
capabilities `economic_flow_identity.v2` y `route_digest_preservation` cuando
aplica esta semántica.

Para que Core use un check como autoridad candidate-directed, su `evidence`
debe contener un único binding y arrays singleton con el mismo ID/digest, una
secuencia completa y exactamente ordenada de `operation_ids` y la copia canónica `resolved`
en `solguard_map_context.economic_flows`. Los checks multi-flow pueden conservar
valor diagnóstico, pero no generan una flow hint autoritativa.

Los evidence IDs heredados de MAP son provenance de origen, no corroboración
TRACE independiente. TRACE debe separar esa procedencia de cualquier evidencia
realmente nativa; mientras no exista provenance explícita suficiente, un ID que
ya aparece en MAP no puede cerrar `map_trace_reverified`, aunque se copie a otra
superficie o línea TRACE.

TRACE no amplía la cobertura estructural de MAP. En esta fase, los bindings de
rama exactos proceden solo de Solidity con llaves y Vyper por indentación
`if/elif/else`; una ruta de otro lenguaje o con sintaxis ambigua permanece
`partial` y no recibe `flow_route_bindings` autoritativos.

Los artefactos MAP legacy siguen siendo aceptados por compatibilidad, pero un
flow sin identidad v2 no puede adquirir autoridad exacta por el mero hecho de
haber pasado por TRACE.

## Limites

- No ejecuta transacciones ni tests.
- No confirma impacto material.
- `semantic_findings` pueden ser `signal`, `candidate`, `supported` o
  `review_required`, pero `validated` y `refuted` pertenecen a VALIDATE.
- En modo multi-lenguaje, parte del analisis depende del contexto MAP y
  heuristicas deterministas.
