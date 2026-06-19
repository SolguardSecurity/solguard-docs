# Solguard Map

`solguard-map` es la herramienta de mapeo estructural de Solguard. Aunque el binario se publica como `rbm-map`, su papel dentro del ecosistema es actuar como cartógrafo determinista del repositorio objetivo. No intenta demostrar vulnerabilidades ni reemplazar la revisión manual. Su responsabilidad es transformar un repositorio Web3 o DLT en un modelo auditable compuesto por componentes, entrypoints, roles, estados, dependencias, superficies críticas y rutas de revisión.

## Propósito técnico

El valor de `solguard-map` está en responder una pregunta previa a cualquier análisis profundo: qué existe en el repositorio y qué partes merecen atención primero. Esta herramienta convierte un árbol de archivos heterogéneo en una representación intermedia lo bastante rica como para que un auditor, `solguard-trace` o `solguard-backend` puedan trabajar sobre prioridades y relaciones ya extraídas.

No se comporta como un parser semántico completo de todos los lenguajes soportados. Su diseño es heurístico y determinista. Aun así, su salida es estructuralmente ambiciosa porque no se limita a enumerar archivos; intenta reconstruir componentes auditables, funciones expuestas, límites de confianza, estados sensibles y superficies con prioridad RBM.

## Flujo interno de ejecución

El flujo principal está definido en `src/main.rs`. Primero resuelve la entrada, que puede ser una ruta local o un repositorio remoto. Después construye un índice de archivos aplicando reglas de descubrimiento y exclusión. A continuación detecta el stack tecnológico del proyecto, parsea el repositorio con extractores específicos por lenguaje y finalmente construye el `AuditMap`, que es el artefacto central del sistema.

Ese pipeline tiene un orden importante. La etapa de `input` resuelve el objetivo físico. La etapa de `discovery` decide qué archivos forman parte de la superficie real de análisis. La etapa de `parsing` extrae señales del código y de la configuración. La etapa de `analysis` relaciona esas señales y produce la jerarquía final de componentes, superficies y rutas. La etapa de `output` persiste esa representación en formatos legibles por humanos y por máquina.

## Arquitectura por módulos

`input` resuelve la fuente del repositorio y la convierte en una raíz de análisis estable. `discovery` construye el índice de archivos y detecta el stack. `parsing` contiene extractores para Solidity, Vyper, Rust, Go, Node.js/TypeScript, C/C++ y parsing genérico o de configuración. `analysis` transforma la salida de parsing en objetos de auditoría de mayor nivel. `ir` define los tipos compartidos de esa representación interna. `rules` contiene heurísticas de clasificación, niveles RBM, roles y candidatos de invariantes. `output` genera terminal, Markdown, JSON, CSV y Graphviz.

Esta división es importante porque `solguard-map` no genera su salida de una sola pasada textual. Primero obtiene observaciones locales del código y luego las promueve a estructuras auditables con semántica propia.

## Modelo de datos principal

El objeto `AuditMap` es la salida canónica. Contiene metadatos del repositorio, stack detectado, resumen, componentes, funciones, roles, estados, dependencias, flujos, aristas de llamada, superficies críticas, objetivos priorizados y rutas de revisión.

Los tipos más importantes de esa IR son:

- `ComponentInfo`, que representa unidades auditables como contratos, servicios, paquetes, módulos, relayers, indexers u oráculos.
- `FunctionInfo`, que modela funciones o entrypoints con visibilidad, tags, razones de criticidad y nivel RBM.
- `RoleInfo`, que describe actores privilegiados como owner, admin, validator, relayer, signer, treasury o emergency authority.
- `StateInfo`, que recoge estados sensibles como pausas, nonces, contabilidad, checkpoints o validator sets.
- `DependencyInfo`, que representa dependencias externas y límites de confianza como RPC, oráculos, signers, bridges, bases de datos o variables de entorno.
- `CriticalSurface`, que promueve funciones y rutas a superficies de prioridad de auditoría.
- `ReviewRoute` y `ReviewTarget`, que convierten la información previa en rutas y entradas concretas para revisión.

Este diseño convierte a `solguard-map` en una fase de modelado del repositorio, no solo en un escáner de keywords.

## Lenguajes y cobertura

La herramienta soporta Solidity, Vyper, Rust, Go, JavaScript, TypeScript, C, C++, JSON, TOML, YAML, Docker, ENV y Makefile. En la práctica, los lenguajes fuente se usan para detectar funciones, componentes, roles y estados, mientras que los archivos de configuración e infraestructura se usan para dependencias, despliegues, servicios y límites de confianza operativos.

La herramienta filtra ruido antes de parsear. Omite rutas típicas como `.git`, `node_modules`, `target`, `dist`, `build`, `vendor`, artefactos generados, mocks, fixtures y varios tipos de tests. Esto es esencial porque el objetivo del mapa no es indexar el repositorio entero sin criterio, sino aislar la superficie más relevante para auditoría.

## Modos de análisis

La CLI define dos modos. `fast` es el modo base y ya construye el grafo interprocedural Solidity resuelto por símbolos. `deep` añade enlaces aproximados para los demás lenguajes soportados. Las aristas aproximadas se mantienen separadas mediante `resolution`, `relation_source` y `confidence`; no se promocionan a relaciones Solidity resueltas.

La herramienta también permite restringir lenguajes, añadir exclusiones, elegir rama remota, desactivar color y exportar un mapa Graphviz. Todo esto sugiere que `solguard-map` está pensado tanto para uso interactivo como para orquestación automatizada desde el backend.

## Prioridad RBM

Una parte central del sistema es la clasificación RBM. `RbmLevel` divide las superficies en `S`, `A`, `B`, `C` y `D`. Estos niveles no expresan severidad confirmada, sino prioridad de revisión. `S` agrupa movimiento de valor y ejecución sensible. `A` agrupa permisos, seguridad, configuración, firma y oráculos. `B` representa mutación de estado y contabilidad. `C` representa helpers e integración. `D` cubre superficies de menor señal.

Esa clasificación es una decisión de producto importante porque condiciona qué exporta el mapa, qué consume `solguard-trace` y qué prioriza `solguard-backend` durante el análisis.

## Artefactos de salida

`solguard-map` escribe un paquete de artefactos relativamente amplio: `audit_map.md`, `audit_map.json`, `summary.txt`, varios CSV temáticos, `flows.md` y opcionalmente `callgraph.dot`. La coexistencia de Markdown, JSON y CSV no es redundante. Cada formato responde a un uso distinto: lectura humana, consumo programático y análisis tabular.

`audit_map.json` es el artefacto más importante para el resto del ecosistema. `solguard-trace` y `solguard-diff` pueden enriquecer su razonamiento con contexto procedente de este archivo, y `solguard-backend` lo usa como entrada estructural del pipeline de análisis.

## Grafo interprocedural de v0.8.0

La Fase 1 de `v0.8.0` convierte `graph_edges` en la fuente de verdad del grafo. `graph_symbols` registra contratos, interfaces, librerías, funciones y modifiers con identidad estable. `call_edges` permanece como vista de compatibilidad y referencia la arista canónica mediante `graph_edge_id`.

El resolver Solidity cubre:

- llamadas internas y resolución a través de la jerarquía de herencia;
- declaraciones de herencia y llamadas `super`;
- aplicación de modifiers, incluidos modifiers heredados;
- librerías mediante llamada estática y `using Library for Type`;
- declaraciones de interfaces y funciones de implementación;
- llamadas externas tipadas, casts y llamadas EVM de bajo nivel;
- callbacks estándar y su posible objetivo de reentrada;
- `delegatecall`;
- relación proxy-implementación y entrypoints de upgrade;
- `constructor`, `fallback` y `receive` como símbolos del grafo.

Los tipos de arista interprocedural son `internal_call`, `inheritance`, `inherited_call`, `modifier_call`, `library_call`, `interface_implementation`, `external_call`, `callback`, `reentry_target`, `delegatecall`, `proxy_implementation` y `upgrade`.

Cada arista conserva archivo, línea, evidencia, confianza y resolución. `resolved` exige un símbolo único; `partial` conserva una relación útil con dispatch o target incompleto; `unresolved` identifica explícitamente el límite que una fase posterior no debe tratar como hecho confirmado.

Además de `audit_map.json`, MAP exporta `graph_symbols.csv`, `graph_edges.csv` y un `call_graph.dot` que incluye todas las relaciones interprocedurales.

## Relaciones cross-component

Desde `audit_map.v0.8`, `solguard-map` no solo emite aristas locales en `graph_edges`. También normaliza recursos compartidos y construye relaciones productor-consumidor entre componentes. Esta capa cubre eventos on-chain y off-chain, llamadas RPC/HTTP, queues, lecturas/escrituras de base de datos y configuración producida o consumida por el código.

El contrato mantiene `graph_edges` como hechos atómicos y añade dos colecciones de mayor nivel: `cross_component_links`, que empareja productor y consumidor sobre un recurso normalizado, y `cross_component_paths`, que agrupa esos enlaces en rutas de revisión consumibles por `solguard-trace`.

Cada enlace conserva `resolution`, `confidence`, `evidence_ids`, `resource_kind`, `resource_name` y `resource_key`. Una relación `resolved` requiere clave exacta y roles opuestos claros; `partial` y `unresolved` se exportan como evidencia de revisión, no como comportamiento confirmado.

## Contexto semantico v0.9

Desde `audit_map.v0.9`, `solguard-map` anade una capa de semantic context tracking. Esta capa sigue siendo conservadora: no intenta ejecutar data-flow interprocedural completo, sino normalizar senales que antes quedaban repartidas entre tags, risk patterns y evidencia textual.

El mapa exporta cuatro colecciones aditivas:

- `semantic_contexts`, con dimensiones como `epoch`, `version`, `domain`, `session`, `fork`, `route`, `validator_set` y `checkpoint`.
- `context_couplings`, con enlaces cache/persistent, guard/effect, producer/consumer y config/code, incluyendo temporalidad simbolica (`captured_at`, `validated_at`, `consumed_at`, `invalidated_by`).
- `identity_schemas`, con campos observados, campos esperados con procedencia y campos faltantes para dedupe/cache/context keys.
- `atomicity_boundaries`, con garantias `atomic`, `rollback_guaranteed`, `rollback_partial`, `compensated`, `non_atomic` o `unknown`.

Los campos economicos o de identidad (`nonce`, `payload_hash`, `sender`, `recipient`, `amount`, `emitter`, `chain_id`) no se mezclan con las dimensiones de contexto. Cuando un campo aparece en `expected_fields`, debe explicar su `source`, `confidence_score` y `evidence_ids`. Los defaults DTL solo se aplican si el mapa observa contexto suficiente, por ejemplo un flujo route/domain/message.

### Hardening v0.9.1

El hardening v0.9.1 mantiene `schema_version: "audit_map.v0.9"` y anade metadatos aditivos: `tool_version`, `hardening_revision` y `source_capabilities`. La intencion es separar version de esquema y version de herramienta; los consumidores antiguos pueden ignorar estos campos, mientras que `solguard-trace` puede saber que capacidades ofrecio realmente el mapa.

`source_capabilities` describe senales disponibles en el artefacto, por ejemplo `graph_edges`, `cross_component_links`, `semantic_context_tracking`, `identity_schemas` o `atomicity_boundaries`. No sustituye a la evidencia concreta: cada conclusion debe seguir referenciando `evidence_ids`, `resolution` y `confidence_score`.

## Relación con el resto del stack

Dentro del ecosistema Solguard, `solguard-map` es la herramienta que responde qué existe en el objetivo y por dónde conviene empezar. No valida hipótesis ni analiza cambios históricos. Su papel es establecer el espacio de revisión: componentes, entrypoints, dependencias, estados, flujos y superficies críticas. Por eso suele ser la primera herramienta determinista en ejecutarse cuando el backend prepara un análisis completo.
