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

`route_digest` es content-addressed y liga el entrypoint con la secuencia de
operaciones, aristas causales, decisiones de rama, value links y asset legs de
la ruta. `branch_choices` usa strings `<branch_id>=true|false` ordenados por ID
y forma parte del payload exacto `operations=[...];edges=[...];branches=[...]`.
Dos ramas alternativas deben producir identidades distintas. `lineage_id`
permite reconocer su procedencia común sin convertirlas en la misma ruta.

La pertenencia estructural exacta de ramas se implementa en esta fase para
Solidity con bloques delimitados por llaves y para Vyper mediante indentación
`if/elif/else`. No es una capability universal: otros lenguajes, sintaxis no
soportada o jerarquías ambiguas deben emitir rutas `partial` y un diagnóstico
explícito, nunca elecciones de rama inventadas como exactas.

Los campos aditivos incluyen:

- `operation_ids` y `causal_edge_ids` en el flujo;
- `branch_choices` canónicas en el flujo;
- `asset_legs` para conservar rutas multi-activo sin forzar un único `asset`;
- source/sink symbol, fichero y línea del entrypoint;
- por step, `operation_id`, symbol/component/asset, value IDs de entrada y
  salida, `source_ordinal`, `branch_path`, resolución, confianza y evidence IDs.

Cada `asset_leg` usa un ID content-addressed sobre asset, dirección y secuencia
ordenada de operation IDs. Ese ID, y no una etiqueta mutable, es el que participa
en el digest de ruta.

La expansión es determinista y acotada. Un ciclo, límite de profundidad,
truncado de rutas, operación no resuelta o arista no resuelta evita que la ruta
se declare `resolved`. `missing_stages` describe deuda de completitud económica
para un proof, pero no vuelve parcial una ruta causal cuyos pasos y aristas sí
están identificados. Los consumidores deben usar los IDs autoritativos y no
recomponer la identidad desde nombres humanos.

La migración es compatible por adición: `audit_map.v0.10` conserva sus campos
anteriores y los nuevos campos tienen defaults de deserialización. Un artefacto
sin `identity_version=economic_flow_identity.v2` es legacy; sigue siendo
legible, pero no posee autoridad de identidad exacta para cerrar una prueba.

## Limites

- No ejecuta codigo.
- No demuestra explotabilidad.
- Puede emitir relaciones `partial` o `unresolved`; los consumidores no deben
  tratarlas como hechos confirmados.
- `--build-probe` es best-effort: un fallo de probe se registra como evidencia,
  no debe tumbar MAP.
