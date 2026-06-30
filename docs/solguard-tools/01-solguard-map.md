# 01. SolGuard Map

`solguard-map` es la herramienta de modelado estructural del repositorio. Su
trabajo es responder que existe, donde estan las superficies importantes y que
contexto necesita el resto del pipeline.

No valida bugs. Produce un `audit_map.json` consumible por TRACE, DISCOVER,
ECONOMIC, INVARIANT, VALIDATE y el backend.

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

| Opcion | Funcion |
| --- | --- |
| `--out <dir>` | Directorio de salida. Default: `solguard-output`. |
| `--branch <name>` | Rama remota al clonar una URL Git. |
| `--langs solidity,vyper,rust,go,node,c,config` | Filtra lenguajes. |
| `--exclude a,b,c` | Excluye fragmentos de ruta adicionales. |
| `--fast` | Modo heuristico rapido. |
| `--deep` | Anade enlaces aproximados sobre el modo base. |
| `--graph` | Exporta Graphviz. |
| `--build-probe` | Ejecuta probes de build/toolchain best-effort. |
| `--build-probe-timeout-ms <ms>` | Timeout por probe. Default: `2500`. |
| `--no-color` | Desactiva colores ANSI. |

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

## Limites

- No ejecuta codigo.
- No demuestra explotabilidad.
- Puede emitir relaciones `partial` o `unresolved`; los consumidores no deben
  tratarlas como hechos confirmados.
- `--build-probe` es best-effort: un fallo de probe se registra como evidencia,
  no debe tumbar MAP.
