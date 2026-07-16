# Identidad económica de flujo v2

`economic_flow_identity.v2` es el contrato compartido que permite seguir una
misma ruta económica desde MAP y TRACE hasta ECONOMIC, VALUE y el cierre de
candidatos en core. Su objetivo es impedir que fragmentos parecidos, pero
causalmente distintos, se mezclen por nombre, componente o asset.

Este contrato es aditivo. No cambia los nombres de schema actuales de las
herramientas; añade campos y capabilities que un consumidor estricto debe
comprobar. Los artefactos legacy siguen deserializando, pero no pueden cerrar
una prueba exacta.

## Identidad canónica

MAP es la autoridad que crea la ruta. Cada ruta v2 cumple:

```text
identity_version = economic_flow_identity.v2
id = economic-flow-v2-{route_digest}
```

`route_digest` es un SHA-256 content-addressed con framing de longitud. Liga el
entrypoint y la secuencia ordenada de operaciones y aristas causales, las
decisiones de rama canónicas, los value links y los asset legs resultantes. MAP
serializa las decisiones como `branch_choices["<branch_id>=true|false"]` en
orden lexicográfico por branch ID y usa exactamente este payload:

```text
operations=[id|...];edges=[id|...];branches=[branch_id=true|...]
```

No se calcula desde un título, nombre de componente o descripción libre.
Cada asset leg posee además un ID content-addressed propio, calculado con el
mismo framing desde asset, dirección y secuencia ordenada de operation IDs. Un
leg cuyo contenido ya no corresponde a su ID invalida el ensamblado exacto.

La ruta conserva como mínimo:

```text
lineage_id
entrypoint_symbol_id
source_symbol_id
sink_symbol_id
file + line
operation_ids[]
causal_edge_ids[]
branch_choices[]
value_link_ids[]
asset_legs[]
steps[]
```

Cada step enlaza su `operation_id`, symbol, component, asset, input/output value
IDs, `source_ordinal`, `branch_path`, resolución, confianza y evidence IDs.
`source_ordinal` desambigua operaciones que comparten línea y `branch_path`
conserva las decisiones que alcanzan ese paso. `lineage_id` agrupa procedencia
común; no permite sustituir el `id` de ruta. Dos ramas alternativas comparten
lineage si corresponde, pero tienen route digests e IDs distintos.

La pertenencia estructural exacta a ramas en esta fase está limitada a Solidity
con bloques delimitados por llaves y a Vyper con indentación estructural
`if/elif/else`. Otros lenguajes, sintaxis no soportada o una jerarquía ambigua no
adquieren autoridad branch-aware: MAP conserva la ruta como `partial` con un
diagnóstico explícito y TRACE no publica para ella un binding exacto.

Una ruta solo queda `resolved` cuando no fue cortada por ciclo, profundidad o
presupuesto y sus operaciones y aristas están resueltas. `missing_stages`
describe deuda de completitud económica para el proof; no vuelve incierta una
ruta causal cuyos pasos sí están identificados. Un ID v2 no convierte una ruta
topológicamente parcial en resuelta.

## Responsabilidad por productor y consumidor

| Componente | Responsabilidad exacta                                                                                                                                                                                |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MAP        | Construye la ruta, calcula ID/digest y publica operaciones, aristas, links, legs y steps autoritativos.                                                                                               |
| TRACE      | Selecciona contexto sin mutar la ruta. En `economic_checks[].evidence` correlaciona ID/digest mediante un singleton explícito, conserva operations observadas y la copia MAP canónica.                |
| ECONOMIC   | Liga transitions e invariantes mediante ID/digest exactos. Si una equation nombra flows, no usa fallback fuzzy; una ruta MAP parcial puede quedar `flow_bound`, nunca `concrete` por el mero binding. |
| VALUE      | Indexa la autoridad MAP, conserva el upstream ID y fusiona fragments solo por identidad exacta sin conflictos.                                                                                        |
| CORE       | Solo enruta requests tras revalidar el binding TRACE completo; al cerrar reabre refs, exige una identidad de ruta singleton, rechaza respuestas repetidas y preserva ruta/claim.                      |

TRACE no puede podar steps y mantener el mismo ID. ECONOMIC y VALUE pueden
añadir facts o evidence, pero no cambiar source, sink, asset, sequence ni
digest. Cuando dos fragments con el mismo ID discrepan, el conflicto se
conserva para diagnóstico y la ruta queda fuera de consumo estricto.

Los arrays TRACE legacy `flow_ids[]` y `flow_route_digests[]` no expresan una
correlación cuando contienen más de un elemento. Un consumidor estricto solo
acepta el par explícito; un set multi-flow sin pares permanece ambiguo y no
confirma ninguna ruta individual.

Para que Core considere un flow ID como referenciado por TRACE no basta una
aparición textual. Debe existir un `economic_checks[].evidence` con exactamente
un `flow_route_bindings[{flow_id,route_digest}]`; `flow_ids[]` y
`flow_route_digests[]` deben ser singleton y contener el mismo par;
`operation_ids[]` debe ser una subsecuencia no vacía de la ruta; y
`solguard_map_context.economic_flows[]` debe contener una copia canónica,
completa y `resolved` de esa identidad. Cualquier duplicado, drift o ausencia
convierte el binding en no autoritativo.

## Ensamblado exacto en VALUE

VALUE crea un índice de unicidad para flows, operaciones, values, value links y
graph edges. Una ruta v2 solo es consumible cuando:

- `id` coincide con `economic-flow-v2-{route_digest}`;
- cada step resuelve exactamente su `operation_id` y ubicación;
- `source_ordinal` y `branch_path` coinciden con la operación MAP autoritativa;
- los causal edges y value links existen en MAP;
- no hay `assembly_conflict:*` ni deuda de resolución;
- source, sink, asset/asset legs y secuencia proceden de la ruta, no de un
  attachment aproximado.

VALUE conserva en `source_refs` el ID raw, `upstream_flow_id:{id}` y
`route_digest:{digest}`. Las anotaciones ECONOMIC o TRACE solo se adjuntan si
resuelven a esa misma identidad. No se fabrican before/after states, deltas o
relaciones de invariante para rellenar un proof incompleto.

## Búsqueda candidate-directed antes del ranking

Core puede emitir una `solguard-value-proof-requests.v1` por dos caminos
fail-closed:

1. existe exactamente un attack path base con el mismo root/trigger/impact; o
2. no existe ese path, pero exactamente una ruta v2 MAP coincide con las
   superficies del candidato y TRACE aporta para ella el binding singleton
   completo descrito arriba.

El segundo camino escribe ese ID exacto en `flow_hints`. VALUE resuelve la
request contra todos los paths generados antes del ranking/top-50. Esto evita
que el truncado sea una frontera de detección, pero no relaja el matching.

Una respuesta fuera del conjunto base solo se acepta cuando:

- request, candidate e issue key coinciden;
- el path contiene exactamente una vez el flow ID, `upstream_flow_id` y route
  digest exactos;
- root, trigger, impact y ordered sequence coinciden con la ruta autoritativa;
- las refs MAP/TRACE se reabren con origin, ID, fichero y línea exactos;
- no hay una segunda respuesta para el mismo request y las tres refs de
  identidad de ruta no están duplicadas;
- el proof es `complete`, `validate_consumable`, no se autocorrobora y satisface
  todas las obligaciones.

Core reabre las refs probatorias de proof y delta contra MAP/TRACE, pero el
runtime actual las normaliza al comparar y no rechaza por sí solo la repetición
de una ref autoritativa idéntica. El gate estricto de ensamblaje sí la rechaza;
hasta que esa condición se aplique también en Core, es una deuda P1 y no una
garantía runtime.

Core añade un path nuevo aceptado a `effective_attack_paths.json`; no modifica
`tool-outputs/value/attack_paths.json`. Si la respuesta corresponde a un path
base existente, su ruta y claim económico deben permanecer inmutables.

## Compatibilidad y fail-closed legacy

La compatibilidad es asimétrica de forma intencionada:

- lectores anteriores pueden ignorar los nuevos campos aditivos;
- lectores v2 aceptan artefactos legacy como información parcial;
- un flow legacy no puede generar una flow hint autoritativa, satisfacer
  same-flow binding ni cerrar un proof `validate_consumable`;
- una identidad que declara v2 pero no cumple `id =
economic-flow-v2-{route_digest}` es inválida, no legacy, y falla cerrada;
- la ausencia de v2 produce diagnóstico o proof parcial, nunca una inferencia
  favorable por defecto.

## Qué demuestra esta fase

Los tests de contrato pueden demostrar estabilidad del ID, separación de
ramas, joins exactos, rechazo de conflictos y búsqueda pre-ranking. Eso prueba
el mecanismo, no su recall sobre bugs nuevos.

No se debe afirmar una mejora de detección, recall o generalización hasta
ejecutar y congelar un replay comparable de los 90 labs y un holdout
independiente protocol-, family- y time-disjoint. Un replay legacy también es
útil para demostrar compatibilidad y fail-closed, pero no mide por sí solo la
capacidad nueva porque sus artefactos no contienen identidades v2.
