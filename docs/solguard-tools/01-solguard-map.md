# 01. SolGuard Map

`solguard-map` es la herramienta de modelado estructural del repositorio. Su
trabajo es responder que existe, donde estan las superficies importantes y que
contexto necesita el resto del pipeline.

No valida bugs. Produce un `audit_map.json` consumible por TRACE, DISCOVER,
ECONOMIC, VALUE, INVARIANT, VALIDATE y `solguard-pipeline-core`.

## Inputs

Entrada principal:

```text
<local path | git url>
```

Puede analizar un directorio local o clonar una URL Git con `--branch`.

## CLI actual

```powershell
cargo run -- <input> --out solguard-output
```

Opciones principales:

| Opcion                                         | Funcion                                           |
| ---------------------------------------------- | ------------------------------------------------- |
| `--out <dir>`                                  | Directorio de salida. Default: `solguard-output`. |
| `--branch <name>`                              | Rama remota al clonar una URL Git.                |
| `--langs solidity,vyper,rust,go,node,c,config` | Filtra lenguajes.                                 |
| `--exclude a,b,c`                              | Excluye fragmentos de ruta adicionales.           |
| `--fast`                                       | Modo heuristico rapido.                           |
| `--deep`                                       | Anade enlaces aproximados sobre el modo base.     |
| `--graph`                                      | Exporta Graphviz.                                 |
| `--build-probe`                                | Ejecuta probes de build/toolchain best-effort.    |
| `--build-probe-timeout-ms <ms>`                | Timeout por probe. Default: `2500`.               |
| `--no-color`                                   | Desactiva colores ANSI.                           |

## Contrato de salida

Schema actual:

```text
audit_map.v0.10
```

Archivos base:

- `audit_map.json`
- `audit_map.md`
- `summary.txt`
- `flows.md`

CSVs principales:

- `components.csv`
- `entrypoints.csv`
- `critical_surface.csv`
- `roles.csv`
- `states.csv`
- `dependencies.csv`
- `callgraph.csv`
- `graph_symbols.csv`
- `graph_edges.csv`
- `review_targets.csv`
- `review_route_nodes.csv`

CSVs de modelos avanzados:

- `state_machines.csv`
- `state_transitions.csv`
- `economic_values.csv`
- `economic_operations.csv`
- `economic_value_links.csv`
- `economic_flows.csv`
- `economic_flow_steps.csv`
- `accrual_checkpoints.csv`
- `external_dependency_contracts.csv`
- `dependency_assumptions.csv`
- `semantic_types.csv`
- `imports.csv`
- `type_relations.csv`
- `aliases.csv`
- `storage_layout.csv`
- `resolution_diagnostics.csv`
- `build_profiles.csv`
- `build_files.csv`
- `build_aliases.csv`
- `build_compile_units.csv`
- `build_probes.csv`

Graphviz, si se usa `--graph`:

- `component_graph.dot`
- `call_graph.dot`
- `dependency_graph.dot`
- `state_graph.dot`
- `economic_graph.dot`
- `external_dependency_graph.dot`

## Modelo principal

`audit_map.json` contiene:

- metadata del repo, rama, commit y modo;
- stack/lenguajes/frameworks;
- componentes auditables;
- entrypoints y funciones;
- roles y permisos;
- estados, state machines y transiciones;
- dependencias externas y assumptions;
- grafo interprocedural;
- relaciones cross-component;
- flujos economicos;
- contextos semanticos, identidad y atomicidad;
- build context y probes;
- superficies criticas y targets de revision.

## Niveles SolGuard

Los niveles `S`, `A`, `B`, `C`, `D` son prioridad de revision, no severidad:

- `S`: movimiento de valor, mint/burn, bridge, mensajes, ejecucion sensible.
- `A`: permisos, seguridad, configuracion, firmas, oraculos.
- `B`: mutacion de estado y contabilidad.
- `C`: integracion y helpers.
- `D`: baja senal o baja prioridad.

## Capacidades relevantes actuales

`audit_map.v0.10` incluye mejoras sobre versiones antiguas:

- Tree-sitter para Solidity/C/C++ y parsers mas estructurados para Go y TS.
- Grafo con `graph_symbols` y `graph_edges`.
- Resolucion de imports, aliases, tipos y storage layout.
- Build context con profiles, compile units y probes opcionales.
- State machines/transitions.
- IR economica de valores, operaciones y flujos.
- External dependency contracts y assumptions.
- Cross-component links/paths.
- Semantic context tracking, identity schemas y atomicity boundaries.

### Identidad de flujo económico v2

MAP puede declarar de forma aditiva las capabilities
`economic_flow_identity.v2` y `content_addressed_economic_routes`. Bajo este
contrato, cada elemento de `economic_flows` representa una ruta ordenada, no un
resumen mutable del entrypoint:

```text
id = economic-flow-v2-{route_digest}
identity_version = economic_flow_identity.v2
```

`route_digest` es content-addressed y usa framing binario fuerte: el namespace
y cada parte se enmarcan por separado con longitud `u64` big-endian y bytes
UTF-8. Firma steps completos, contenido autoritativo de aristas y value links,
operation IDs, decisiones de rama, asset legs y todos los hechos económicos
superiores; no concatena listas con delimitadores. `branch_choices` usa strings
`<branch_id>=true|false` ordenados por ID. Dos ramas alternativas deben producir
identidades distintas. `lineage_id` permite reconocer su procedencia común sin
convertirlas en la misma ruta.

La pertenencia estructural exacta de ramas se implementa en esta fase para
Solidity con bloques delimitados por llaves y para Vyper mediante indentación
`if/elif/else`. No es una capability universal: otros lenguajes, sintaxis no
soportada o jerarquías ambiguas deben emitir rutas `partial` y un diagnóstico
explícito, nunca elecciones de rama inventadas como exactas.

En Solidity también se reconocen los cuerpos compactos `if (...) statement;`
y `else statement;`. MAP solo elimina una alternativa cuando el propio cuerpo
demuestra una terminación incondicional mediante `return` o `revert`, incluido
`revert CustomError(...)`; no deduce imposibilidad por el nombre de un guard.
Las rutas equivalentes se deduplican antes de aplicar el presupuesto para que
duplicados de expansión no consuman el espacio reservado a rutas distintas.

Los campos aditivos incluyen:

- `operation_ids` y `causal_edge_ids` en el flujo;
- `branch_choices` canónicas en el flujo;
- `asset_legs` para conservar rutas multi-activo sin forzar un único `asset`;
- source/sink symbol, fichero y línea del entrypoint;
- por step, `operation_id`, symbol/component/asset, value IDs de entrada y
  salida, `source_ordinal`, `branch_path`, resolución, confianza y evidence IDs.

Cada `asset_leg` usa `economic-asset-leg-v2-{digest}` sobre asset, dirección,
source/sink symbol IDs, operation IDs y amount expressions ordenados. Ese ID, y
no una etiqueta mutable, es el que participa en el digest de ruta. Los arrays
requested/transferred/actual se derivan de los `economic_values` alcanzados y
`accounting_targets` de las operaciones `accounting_update`.

La expansión es determinista y acotada. Un ciclo, límite de profundidad,
truncado de rutas, operación no resuelta o arista no resuelta evita que la ruta
se declare `resolved`. `missing_stages` describe deuda de completitud económica
para un proof, pero no vuelve parcial una ruta causal cuyos pasos y aristas sí
están identificados. Los consumidores lo rederivan desde los stages y facts de
la ruta. También revalidan entrypoint, component, file, line y
`economic-lineage-v1` contra la única función con el mismo `symbol_id`, en vez
de confiar en metadata superior no incluida en el digest. Los consumidores
deben usar los IDs autoritativos y no recomponer la identidad desde nombres
humanos.

Una asignación contable exige un operador de asignación real. Comparaciones
como `==`, `!=`, `<=` o `>=`, y el operador TypeScript `=>`, no se presentan
como mutaciones de estado. Cuando una llamada ocupa varias líneas, MAP conserva
una ventana source-backed alrededor del callsite en vez de resolverla mediante
una coincidencia global de nombre.

Una resta genérica tampoco demuestra recepción de activos. MAP solo emite
`actual_balance_delta` para semántica fuerte (`actualBalance`, `balanceDelta`,
`actualDelta`, `received`) o para un par before/after respaldado por snapshots
`balanceOf` tipados. `actual_received_amount` exige `received` explícito o ese
par tipado; fee growth, `balance - excluded` y offsets temporales permanecen
aritmética, no receipts.

La migración es compatible por adición: `audit_map.v0.10` conserva sus campos
anteriores y los nuevos campos tienen defaults de deserialización. Un artefacto
sin `identity_version=economic_flow_identity.v2` es legacy; sigue siendo
legible, pero no posee autoridad de identidad exacta para cerrar una prueba.

## Presupuestos y cobertura observable

`audit_map.json` incluye dos recibos aditivos:

- `economic_flow_coverage.v1`: limites y conteos de rutas por entrypoint, steps
  por ruta, flows/steps globales y cualquier ruta omitida;
- `map_collection_coverage.v1`: `observed`, `duplicates_collapsed`, identidades
  semanticas unicas, retenidas y truncadas para dependencias, call edges y graph
  edges.

El inventario de `map_collection_coverage.v1` es completo por modo y lenguaje,
no una muestra de los productores que alcanzaron a emitir datos. Una ejecucion
`fast` publica los 35 recibos base y una ejecucion `deep` los 42 recibos base;
los productores condicionales de un lenguaje se anaden cuando esa capability
esta activa. Cada productor esperado aparece una sola vez, incluso con cero
identidades. Un recibo base ausente o duplicado deja el ledger incompleto; los
recibos adicionales solo corresponden a productores condicionales activos y
mantienen las mismas invariantes de coherencia.

Los joins semanticos usan un source-scope estable. En Go, el scope es el paquete
por directorio; en los demas lenguajes soportados es el fichero fuente junto al
componente declarado. Reutilizar nombres genericos como `main`, `bindings` o
`client` en directorios independientes no une sus simbolos. Solo una relacion
de import explicita puede hacer visible un destino fuera del scope local.

La resolucion de receivers construye el entorno de tipos en el contexto local
del caller. Declaraciones de fichero pueden ser visibles, pero un parametro o
receiver homonimo de otra funcion no puede sobrescribir el tipo del caller. MAP
excluye declaraciones que el parser superficial podria confundir con
pseudo-calls. A la vez, una llamada recursiva real dentro del cuerpo se conserva
como relacion semantica: compartir nombre con la funcion caller no basta para
eliminarla.

MAP deduplica identidades semanticas exactas antes de presupuestar rutas. Cada
entrypoint comienza con un cap interno de 64; solo si esa pasada demuestra una
identidad unica adicional se repite de forma determinista con el hard cap 256.
La misma recuperacion adaptativa se aplica dentro de callees. Siguen vigentes
los limites de 128 steps por ruta, 4096 flows y 32768 steps globales.

El fallback interprocedural tampoco resuelve una llamada por coincidencia global
de nombre cuando existe un receiver tipado. Para Solidity y Vyper solo es
elegible el componente del tipo declarado; si su implementacion no esta en el
source, la llamada permanece externa o dinamica. En Vyper,
`self.metodo(...)` queda acotado al componente caller. Esto evita multiplicar
una llamada por metodos homonimos de componentes no compatibles sin inventar un
destino interno.

Escribir JSON compacto evita multiplicar memoria y disco por whitespace, pero
no cambia la cobertura. Colapsar duplicados exactos se contabiliza y no crea
deuda. Si la pasada 256 demuestra otra identidad, una ruta supera 128 steps o
se agota un limite global, MAP conserva la omision como deuda fail-closed: las
rutas retenidas afectadas permanecen `partial` y `coverage_debt` registra el
presupuesto agotado. Los consumidores no pueden presentarlas como cobertura
completa ni usar la ausencia de una ruta como evidencia negativa.

### Evidencia diagnostica dirigida

El smoke dirigido final de Optimism produjo un `audit_map.json` de
119.784.018 bytes con SHA-256
`e4c290b3ccd7925ab1316b7979489d309d3a28fa250739a8716d669b575b70b6`.
Este artefacto sirve para verificar ingestion, identidad byte-exacta y los
recibos de cobertura del MAP usado por DISCOVER. La aceptacion downstream final
quedo sellada en
`D:\SolguardDiagnostics\phase1-discover-optimism-ledger-runtime-20260718-final-r2`:
el `protocol_model.json` tiene SHA-256
`EE0B843CC92C7611EAE3B510CB35B3BB0937980E8F557DC0DE1F4A098D42206C`,
el `index.json`
`2D616D703C06B9E70B2022EBB61C3D8665B71319E00C9FEE09BF578A14B62A3A`
y el binario DISCOVER
`DE3C09078ACF8822800EFE51919F07609BA72CE7255BAB01F5BFD7E46BFED363`.
El caso dirigido paso de 180.303 a 23.882 ms. Es evidencia diagnostica de
contrato y runtime; por si sola no demuestra una mejora de precision, recall ni
generalizacion.

## Limites

- No ejecuta codigo.
- No demuestra explotabilidad.
- Puede emitir relaciones `partial` o `unresolved`; los consumidores no deben
  tratarlas como hechos confirmados.
- `--build-probe` es best-effort: un fallo de probe se registra como evidencia,
  no debe tumbar MAP.
