# Informe factual de la reparación y endurecimiento de Solguard

> Fecha del informe: 21 de julio de 2026
>
> Alcance: la jornada completa y las dos sesiones de aproximadamente seis horas descritas por el propietario, junto con los commits y las comprobaciones inmediatamente posteriores.
>
> Repositorio principal: `solguard-core`
>
> Regla de interpretación: este documento separa hechos medidos, mecanismos implementados y capacidades todavía no demostradas.

## 1. Resumen ejecutivo

El trabajo realizado durante estas sesiones no fue una suma de reglas para hacer pasar benchmarks concretos. El cambio principal fue convertir un pipeline que podía producir mucha información, pero perdía autoridad, cobertura y trazabilidad entre fases, en un sistema bastante más estricto y verificable.

Antes de estos cambios, el intento canónico de v1-v8 del 17 de julio procesó 164 protocolos, tardó `10:43:28.624` de extremo a extremo y acabó con código 1. Produjo 28.561 candidatos, 2.006 resultados `supported` de VALIDATE y 26.555 inconclusos. El recall sobre el corpus conocido fue alto —509/509 a nivel de candidato y 506/509 a nivel de `supported`—, pero DISCOVER quedó degradado en 159/164 protocolos y FILTER falló en 52. Ese run no ejecutó los 90 labs y no puede considerarse una baseline de release.

La conclusión inicial era incómoda pero clara: Solguard conservaba capacidad de encontrar señales conocidas, pero no transformaba esa capacidad en un resultado fiable, limpio y profesional. Había pérdidas silenciosas, artefactos demasiado grandes, deuda de cobertura mal expresada, evidencia TRACE insuficientemente ligada, inconsistencias entre VALIDATE y FILTER, y una cadena de ejecución que aún podía recompilar o cambiar material durante el scan.

Las tres sesiones atacaron esas causas de forma transversal:

- hicieron explícitos los presupuestos, omisiones y estados de cobertura;
- cerraron el contrato físico y semántico entre MAP, TRACE, INVARIANT, VALUE, VALIDATE y FILTER;
- añadieron soporte TRACE real y source-backed para Vyper;
- introdujeron lectura y proyección acotada de artefactos superiores a 100 MiB;
- reforzaron source authority, ZIPs, hashes, manifests, locks y publicación atómica;
- conservaron identidades causales y económicas sin convertir aproximaciones `MAY` en pruebas exactas;
- añadieron ejecución `no_prebuild` con binarios release previamente sellados;
- corrigieron la captura Git de repositorios con gitlinks y prepararon una cadena de prebuild/canarios no reutilizable.

La valoración honesta es la siguiente:

**El núcleo está mucho más sólido a nivel de compilación, contratos locales, integridad y comportamiento fail-closed. Sin embargo, todavía no existe evidencia end-to-end suficiente para afirmar que el producto completo sea ya una herramienta profesional de bug bounty, que haya reducido el ruido de forma efectiva o que descubra bugs nuevos y profundos a ciegas.** Eso solo podrá afirmarse después de superar los ocho canarios, repetir v1-v8 y los 90 labs en un root nuevo, finalizar y verificar la medición y, finalmente, evaluar un holdout realmente blind.

## 2. Cómo se ha construido este informe

Este informe se basa en:

- el historial y los diffs Git de los repositorios `solguard-*`;
- los archivos y contratos presentes en los commits;
- las pruebas existentes y las suites ejecutadas;
- los artefactos conservados de los replays y smokes;
- `PLAN_DE_MEJORA.MD` y la documentación cross-repo;
- los receipts de prebuild `r1` y `r2` conservados en `D:\SolguardCanaries`;
- la salida real de la sesión.

Hay tres precauciones importantes:

1. Git acredita contenido, autoría lógica y timestamps de commit; no acredita cuántas horas continuas se trabajó. Por ello, «una jornada completa» y «dos sesiones de seis horas» son duraciones comunicadas por el propietario, no tiempos reconstruidos a partir de Git.
2. Las estadísticas de líneas modificadas no miden calidad ni esfuerzo funcional. Varios commits incluyen `rustfmt`, fixtures grandes, movimientos de módulos y reestructuraciones.
3. Un test unitario, un smoke o un prebuild pueden probar un contrato concreto, pero no demuestran recall, precisión, reducción del ruido ni generalización sobre bugs no vistos.

## 3. Punto de partida: qué había fallado realmente

### 3.1 Replay v1-v8 del 17 de julio

El root `D:\SolguardBaselines\phase1-core-20260717-final` conserva el intento diagnóstico anterior a esta reparación:

| Hecho | Resultado |
|---|---:|
| Protocolos procesados | 164 |
| Duración end-to-end | `10:43:28.624` |
| Duración del proceso medido | `10:43:09.834` |
| Estado final | código 1; gate estricto fallido |
| Labs ejecutados en ese root | 0/90 |
| Candidatos | 28.561 |
| `supported` por VALIDATE | 2.006, el 7,024 % |
| Inconclusos | 26.555, el 92,976 % |
| Candidate recall conocido | 509/509 |
| Supported recall conocido | 506/509 |
| DISCOVER degradado | 159/164 |
| Protocolos con fallo FILTER | 52 |

La densidad inconclusa del 92,976 % no es una medida de falsos positivos ni de precisión. Tampoco el 506/509 prueba generalización: v1-v8 es un corpus conocido y solo sirve como regresión.

Las pérdidas operacionales estaban concentradas:

- MAP generó 42 artefactos mayores de 96 MiB y tres mayores de 512 MiB;
- TRACE tuvo cuatro errores tipados y deuda de truncado;
- DISCOVER trabajó casi siempre degradado;
- VALUE tuvo 17 protocolos degradados y un crash en Neo-Tokyo;
- FILTER falló en 52 protocolos por contratos compartidos, no por 52 causas independientes;
- cuatro runners no solicitaron `audit_only`, por lo que consumieron tiempo innecesario después de VALIDATE;
- los tres misses scoreables fueron dos casos SukukFi perdidos antes de VALIDATE y un caso Kinetiq perdido en VALIDATE.

### 3.2 Replay de aceptación del 18 de julio: por qué se definieron los ocho gaps

Después de la primera ola de correcciones se ejecutó otro v1-v8 bajo:

`D:\SolguardBaselines\phase1-core-20260718-acceptance-r1`

Las ocho suites exteriores terminaron, pero el gate volvió a bloquear la aceptación:

| Hecho | Resultado |
|---|---:|
| Protocolos | 164 |
| Estado por protocolo | 164 `completed_with_errors` |
| Duración medida | `18.106.817 ms`, es decir, `5:01:46.817` |
| Candidatos | 53.453 |
| `supported` | 2.438 |
| Inconclusos | 51.015 |
| Leads revisables | 42.852 |
| Errores del gate | 3.611 |
| Warnings | 22 |

En v2-v8, donde los artefactos permiten un matching comparable, se obtuvieron 127/135. En v1 el recall quedó `null`, por lo que no existe un recall global válido para ese run.

Los errores se concentraron en 164 protocolos con estado erróneo, 164 artefactos requeridos ausentes, 1.155 fases no completadas, 164 degradaciones, 164 contratos de cobertura ausentes, 164 contratos inválidos y 1.602 deudas de cobertura. Estas categorías pueden solaparse; no representan 3.611 bugs distintos.

El run produjo un failure receipt firmado, fijó `release_eligible=false`, `continuation_allowed=false` y `root_reusable=false`, y no podía convertirse en release por reinterpretación posterior.

Este segundo resultado fue importante porque demostró que las primeras correcciones no bastaban. De él salió el backlog concreto de ocho gaps: TRACE → FILTER, INVARIANT bounded → VALIDATE, Vyper, cobertura DISCOVER, artefactos grandes, Monad/corpus v1, canarios dirigidos y repetición final solo después de una aceptación 8/8.

### 3.3 Los 90 labs históricos son una medición distinta

El replay histórico de los 90 labs no pertenece al root anterior y no debe mezclarse con él. En la reconstrucción conservada:

- DISCOVER quedó degradado en los 90;
- 45/90 llegaron a un candidato exacto o equivalente;
- 16/90 llegaron a `strict-supported`;
- se generaron 52.922 candidatos raw, 18.676 canónicos y 2.335 `validation-ready`;
- VALUE produjo 3 pruebas completas de 4.500;
- VALIDATE produjo 725 `supported`, 17.951 `inconclusive` y 0 `refuted`;
- la ejecución original completó 71 protocolos y 19 terminaron fallando por la misma contradicción de FILTER: `reject_kind contradicts its evidence`.

Estos datos explican por qué la reparación era necesaria, pero no establecen paridad con el core actual. Los labs contienen bugs conocidos y etiquetados después del scan; tampoco son una demostración blind.

### 3.4 Diagnóstico de raíz

El problema no era simplemente «faltan más reglas». La primera pérdida real se repetía en varios puntos:

- cobertura y selección no demostrables en MAP y TRACE;
- identidad causal perdida o degradada entre MAP, TRACE, ECONOMIC y VALUE;
- candidatos que alcanzaban VALIDATE sin un conjunto cerrado y reconciliable;
- invariantes compactas o acotadas sin suficiente vínculo al primario;
- deuda upstream que podía llegar a una decisión terminal;
- metadatos o sidecars capaces de parecer autoridad aunque el primario físico no coincidiera;
- artefactos grandes leídos de forma monolítica o degradados por límites implícitos;
- FILTER sin una entrada física exacta para recomprobar la evidencia usada por VALIDATE;
- build y ejecución sin una cadena inmutable de binarios y material Git.

Por eso el trabajo se centró primero en verdad operacional y evidencia. Añadir más patrones encima de contratos inseguros habría aumentado el volumen, no la utilidad.

## 4. Cronología verificable de commits

### 4.1 Preparación de medición — 17 de julio

Antes de las tres sesiones principales se preparó la infraestructura de medición:

| Repositorio | Commit | Finalidad |
|---|---|---|
| `solguard-deploy` | `bdcbe29c` | Telemetría de recursos, agregación de procesos y pruebas del CLI de medición. |
| `solguard-docs` | `1db550f2` | Baseline Phase 1, loss ledger y diseño del holdout. |

Este bloque permitió medir y diagnosticar; no modificó por sí mismo la detección.

### 4.2 Sesión 1 — jornada completa comunicada por el propietario

Los cambios se publicaron entre las 21:42 y las 21:47 del 18 de julio:

| Repositorio | Commit | Cambio principal |
|---|---|---|
| `solguard-deploy` | `acf5970b` | Preflight de sources, snapshots compuestos, receipts de fallo y medición recuperable. |
| `solguard-backend` | `f60034f7` | Propagación de límites de expansión TRACE. |
| `solguard-map` | `be6597b7` | Ledgers de cobertura, rutas/identidades más estrictas y reparación Rust. |
| `solguard-trace` | `37b923f3` | Bindings de autorización de actor y coverage receipts. |
| `solguard-validate` | `25b9a223` | Schemas de entrada y cobertura upstream. |
| `solguard-value` | `cc64ab48` | `solguard-value-budget.v1` y cobertura tipada. |
| `solguard-discover` | `87b774cc` | Límites de MAP, proyección semántica y telemetría. |
| `solguard-docs` | `195a18bc` | Documentación de cobertura económica, autorización y medición. |
| `solguard-invariant` | `fa0d128f` | Propagación de authorization bindings y cobertura. |
| `solguard-filter` | `3a59b557` | Deuda de cobertura, resolución de source e invariantes acotadas. |
| `solguard-core` | `8bbd7df8` | Gate cuts, VALUE candidate-directed, procedencia TRACE y decisiones FILTER fail-closed. |

### 4.3 Sesión 2 — primera sesión de aproximadamente seis horas

Los commits principales se publicaron entre las 08:13 y las 08:15 del 21 de julio:

| Repositorio | Commit | Cambio principal |
|---|---|---|
| `solguard-deploy` | `08718b92` | Source authority, selección TRACE, canarios y contratos de medición. |
| `solguard-backend` | `3c19e2d5` | Handoff de source authority en `/analyze`. |
| `solguard-map` | `d490b5d6` | Manifests de cobertura, Python/Vyper y grafo económico factorado. |
| `solguard-trace` | `0d44cafb` | Selección TRACE v3, evidencia física, Vyper y verificador. |
| `solguard-validate` | `796e5b9e` | Autoridad TRACE exacta, conjunto cerrado y runtime invariant bounded. |
| `solguard-value` | `c5a2633d` | Identidad económica exacta, presupuestos y sidecars ligados. |
| `solguard-economic` | `1553d7af` | Razonamiento factorado y separación `MAY`/`MUST`. |
| `solguard-discover` | `a9243c92` | `discover_coverage_contract.v1` y degradación tipada. |
| `solguard-invariant` | `ad38155a` | Proyección bounded, hashing streaming y publicación atómica. |
| `solguard-filter` | `6d530494` | Revalidación física TRACE/INVARIANT y fixtures de lote. |
| `solguard-agents` | `64b92183` | Contratos y coordinación cross-repo. |
| `solguard-docs` | `60e4ad2f` | Integridad de source, VALIDATE, DISCOVER, ECONOMIC y VALUE. |
| `solguard-core` | `4f255756` | Integración sistémica de source authority, selections, bounded runtime y evidence authority. |

Aunque el asunto del commit de core dice «Refactor code structure», el diff contiene cambios funcionales y contractuales mayores. No fue una refactorización cosmética.

### 4.4 Sesión 3 — segunda sesión de aproximadamente seis horas

El bloque principal se publicó entre las 13:34 y las 13:35 del 21 de julio, con un cierre posterior a las 14:25 y 15:08:

| Repositorio | Commit | Cambio principal |
|---|---|---|
| `solguard-deploy` | `0b1ee452` | Reserva, creación, publicación y verificación del receipt de prebuild. |
| `solguard-backend` | `aa340a26` | Identidad del binario backend y runtime gestionado. |
| `solguard-map` | `87ecc723` | Visibilidad Solidity conservadora y entrypoints correctos. |
| `solguard-trace` | `705043f5` | Evaluaciones factoradas, cierre de cobertura y verificación física. |
| `solguard-agents` | `439e9613` | Contratos de visibilidad, TRACE y ejecución. |
| `solguard-docs` | `0b673b61` | Documentación de visibilidad, colecciones TRACE y único prebuild. |
| `solguard-core` | `4fad2b94` | Streaming TRACE, autoridad factorada y runtime `no_prebuild`. |
| `solguard-agents` | `8c1a5d8d` | Captura material v2 y actualización de closures. |
| `solguard-deploy` | `67c612a7` | Captura Git recursiva, gitlinks y validación adversarial. |
| `solguard-core` | `e69aea3f` | Exclusión de `PREBUILD.md`; no cambia detección. |

Los repositorios `solguard-database`, `solguard-diff` y `solguard-exploit` no recibieron commits en este intervalo. EXPLOIT se mantuvo fuera del objetivo funcional actual, que es detection-only.

## 5. Sesión 1: qué se hizo y por qué

### 5.1 Se separó medición íntegra de salud del producto

El runner anterior convertía cualquier degradación de producto en un fracaso opaco del runbook. Se añadieron preflight de sources, snapshots compuestos deterministas, telemetría, diagnósticos parciales y receipts de fallo no reutilizables.

El motivo fue poder distinguir:

- un run corrupto o no reproducible;
- un run íntegro cuyo producto está degradado;
- un source ausente;
- una referencia de ground truth inválida;
- un análisis que falla después de haber establecido la aplicabilidad.

El contrato `solguard-pre-release-check.v3` separó `measurement_integrity` de `product_health`. Un resultado coherente puede medirse aunque la salud falle, pero no obtiene elegibilidad de release. El tier `release` sigue fallando cerrado.

### 5.2 MAP dejó de ocultar crecimiento y omisiones

MAP incorporó ledgers de colecciones y deuda de cobertura con contadores `observed`, `retained` y `omitted`. También se endurecieron identidades de archivos, rutas y declaraciones Rust.

El motivo era doble:

1. impedir que un límite se interpretase como «no hay más elementos»;
2. reducir el tamaño sin perder la capacidad de demostrar qué se había descartado.

Durante el cierre apareció un defecto Rust real en Acala: 491 métodos `impl`, 282 homónimos y al menos 102 spans incorrectos. Una declaración podía apropiarse de un cuerpo situado cientos de líneas después. La corrección pasó a usar spans exactos de `syn`, namespaces por crate/file/module, `<Self as Trait>`, separación entre declaración y cuerpo, y variantes source-scoped.

El smoke MAP final `r5` procesó 164/164 proyectos en `6:28.974`, sin fallos. El volumen agregado bajó de 17.906.779.122 a 7.062.839.351 bytes, una reducción medida del 60,557735 %. Solo siete MAP quedaron por encima de 96 MiB y ninguno por encima de 512 MiB.

Esa mejora no equivale a cobertura completa. El mismo smoke hizo visible que 161/164 protocolos conservaban alguna omisión, 49 tenían deuda económica, existían 1.220 receipts truncados y 2.522.197 identidades omitidas. La mejora real fue acotar y declarar la deuda, no hacerla desaparecer.

### 5.3 TRACE empezó a modelar autorización y cobertura

TRACE añadió `trace.actor_authorization_binding.v1` para representar quién autoriza, quién actúa y qué efecto se permite. También añadió receipts de cobertura acotados.

El objetivo era cerrar una pérdida observada en bugs de autorización: una cadena podía contener la evidencia, pero esta no sobrevivía con una identidad útil hasta INVARIANT y VALIDATE.

Los cuatro errores TRACE del run anterior se aislaron como `no targets matched the requested batch filters`, no como crashes. El modo opt-in `--allow-empty-batch-targets` permitió producir cuatro índices válidos con deuda explícita y cero evidencia fabricada.

### 5.4 DISCOVER obtuvo proyección semántica y límites explícitos

DISCOVER incorporó límites para el MAP requerido, streaming, hash completo, proyección semántica y telemetría de bytes. El objetivo era evitar que el tamaño de MAP convirtiera casi automáticamente la fase en un fallback opaco.

En el canario de Optimism, el runtime observado de la selección bajó de `180.303 ms` a `23.882 ms`; se conservaron 450/4.206 reglas, 300/445 gaps y 120/300 hipótesis. El resultado siguió correctamente marcado como `degraded` y declaró 113.594 elementos omitidos.

Esto prueba terminación, determinismo y deuda visible. No prueba mejor razonamiento ni generalización.

### 5.5 VALUE dejó de esconder su presupuesto

Se introdujo `solguard-value-budget.v1` en los primarios VALUE y en el core. Las consultas candidate-directed pasaron a tener un conjunto observado, retenido y omitido; las respuestas se separaron en `complete`, `partial`, `unmatched` y `ambiguous`.

El core valida la partición exacta y aplica el lote de forma atómica. Una respuesta parcial o una evidencia imposible no puede mezclarse silenciosamente con las válidas.

El motivo era que VALUE había producido solo 3 pruebas completas de 4.500 en los labs históricos. Sin un presupuesto verificable, no era posible saber si una prueba faltaba porque no existía, porque se había truncado o porque no se había consultado.

### 5.6 VALIDATE y FILTER empezaron a respetar la deuda upstream

VALIDATE endureció versiones de schema y proyectó cobertura upstream. FILTER añadió `coverage_debt` a cada resultado y al resumen.

La regla esencial pasó a ser: una entrada con cobertura incompleta no puede terminar en `pass` ni `reject`; debe permanecer en `review` o `inconclusive`.

El replay FILTER offline `r4` procesó exactamente 2.015 inputs `supported`:

- 61 `pass`;
- 1.440 `review`;
- 513 `reject`;
- 1 duplicado.

En 105 inputs había deuda de cobertura y ninguno recibió una decisión terminal. Esto prueba la política fail-closed del filtro; no mide precisión.

### 5.7 Cierre dirigido de los tres misses conocidos

Kinetiq conservó aplicabilidad temporal por familia. SukukFi v4/v6 recorrió una cadena genérica de autorización:

`trace.actor_authorization_binding.v1` → DISCOVER violated-only → INVARIANT `permission_freshness` → VALIDATE exact-scope.

Los casos satisfechos, incompletos, contradictorios o heurísticos fallan cerrados. No se añadió una excepción por nombre de protocolo.

Estos replays dirigidos cierran pérdidas conocidas localmente. Siguen sin probar el resultado del pipeline completo ni generalización blind.

## 6. Sesión 2: reparación sistémica de los ocho gaps

### 6.1 Contrato TRACE → VALIDATE → FILTER

Se introdujo `trace.batch_selection.v3`. El core reconstruye el universo físico elegible desde MAP y source en lugar de confiar en una lista autorreferenciada de TRACE. `--top` limita el enriquecimiento profundo, pero no elimina targets físicos: el resto queda como `compact`.

Cada primary TRACE se liga por path relativo, bytes y SHA-256. Los `evidence_items` usan IDs canónicos derivados del target, rango de source, tipo, procedencia, archivo, línea y payload normalizado.

VALIDATE solo puede usar como autoridad terminal evidencia TRACE `exact`. Evidencia `may_only`, `unbound`, genérica o ambigua fuerza `inconclusive`. Una tabla cerrada de namespaces evita que texto libre, metadata o un ID inventado se conviertan en TRACE.

FILTER vuelve a comprobar:

- el inventario físico;
- el índice de lote;
- los manifests;
- los roots MAP;
- los reportes exactos consumidos por VALIDATE;
- el verificador independiente;
- la identidad antes y después de la ejecución.

La ausencia de evidencia produce revisión. La evidencia falsificada o un contrato estructural inválido hacen fallar la fase de forma cerrada.

El motivo de este endurecimiento fue directo: FILTER no podía tomar una decisión profesional si no podía reconstruir exactamente qué evidencia TRACE autorizó el veredicto de VALIDATE.

### 6.2 Contrato bounded INVARIANT → VALIDATE → FILTER

INVARIANT pasó a generar una vista `invariant.bounded_runtime.v1` ligada al primario `invariant.v0.8` por schema, path, bytes, SHA-256, selección, IDs y contabilidad de cobertura.

El runtime permite como máximo 8.192 objetos y 256 MiB de materialización; el envelope completo tiene un límite independiente de 320 MiB. VALIDATE reabre el source y rehidrata los objetos exactos. FILTER repite la comprobación.

Symlinks, reparse points, hardlinks, paths arbitrarios, hashes obsoletos, conteos incoherentes o sources ausentes fallan cerrados. Si el inventario es verificable, pero los objetos no caben dentro del límite, no se inventa una muestra representativa: se entrega un conjunto vacío y se fuerza `inconclusive`.

El motivo fue impedir que una representación compacta o incompleta adquiriese más autoridad que el artefacto completo.

### 6.3 Evidencia TRACE real para Vyper

MAP y TRACE añadieron soporte Vyper general y source-backed:

- resolución exacta de funciones ligadas por MAP;
- entrypoints `@external`;
- guards y reverts;
- storage `self.*`;
- llamadas internas, eventos y efectos externos;
- enmascarado de comentarios y strings;
- reconstrucción de statements multilínea;
- delimitación de cuerpo por indentación;
- separación entre evidencia nativa TRACE y evidencia heredada de MAP.

Paths absolutos, traversal, symlinks o bindings inconsistentes se omiten con deuda explícita. TRACE no confía ciegamente en `line_end` y no interpreta `log` como una escritura externa.

Existe una excepción acotada para contratos ejecutables bajo `example/examples`, pero no admite tests, fixtures, mocks, benchmarks, vendor, generated ni funciones internas.

El motivo era cerrar un capability gap real de lenguajes Python/Vyper sin crear una regla específica para el benchmark Vyper.

### 6.4 Cobertura DISCOVER como contrato de gate

DISCOVER añadió `coverage_contract.json` con schema `discover_coverage_contract.v1`, ligado a `protocol_model.json` por bytes y SHA-256.

Las causas tipadas incluyen deuda o cobertura desconocida de MAP y ECONOMIC, TRACE o source omitidos, elementos semánticos omitidos, observación semántica incompleta y degradación por recursos. La observación solo puede ser `exact`, `lower_bound` o `not_started`.

Un ledger ausente se interpreta como `unknown`, nunca como cero. Counters, receipts y reasons deben reconciliar; un contrato ausente, stale, malformed o hash-divergent falla cerrado.

El motivo fue que «DISCOVER degradado» era demasiado genérico. El release necesita saber qué capacidad faltó y si esa ausencia invalida una decisión terminal.

Este cambio no completa todavía el world model open-world descrito en el plan. Hace verificable la cobertura del modelo existente; no demuestra por sí solo razonamiento nuevo.

### 6.5 Manejo profesional de artefactos mayores de 100 MiB

La solución se aplicó de forma transversal:

- MAP publica `audit_map.coverage.json` ligado al primario;
- DISCOVER usa `map.semantic_projection.v1`, retiene solo campos consumidos y hashea el fichero completo;
- TRACE limita el MAP físico a 256 MiB y usa presupuestos de proyección;
- VALIDATE transmite y proyecta primarios TRACE grandes sin materializar el JSON opaco completo;
- FILTER usa handles estables, spools acotados y sidecars corroborativos;
- INVARIANT y ECONOMIC aceptan inputs de hasta 512 MiB con streaming fail-closed;
- VALUE usa threshold de 96 MiB, hard cap de 256 MiB y manifests ligados;
- los outputs se publican mediante staging/create-only para no sobrescribir un resultado previo.

Un sidecar no se considera evidencia independiente. Siempre debe reconciliar con el primario físico.

El motivo fue evitar dos fallos opuestos: quedarse sin memoria o saltarse silenciosamente el artefacto grande. Ahora el sistema puede terminar, limitar memoria y conservar deuda verificable.

### 6.6 MAP, Python y grafo económico factorado

MAP añadió:

- `map_function_identity_manifest.v1`;
- `economic_route_graph.v1` factorado;
- `economic_route_graph_closure_manifest.v1`;
- publicación transaccional de `audit_map.json` y sidecars;
- parsing Python productivo;
- separación explícita entre código productivo, stubs y fallbacks;
- deuda para entrypoints no representables.

El grafo factorado representa roots, fragments, choices, events y alternativas de llamada sin expandir todo el producto cartesiano. Esto es importante para análisis profundo: conserva posibilidades causales sin explotar memoria ni declarar una ruta lineal falsa.

### 6.7 ECONOMIC y VALUE conservaron identidad causal

ECONOMIC pasó a razonar sobre el grafo factorado y a distinguir hechos `MAY` de un `MUST` realmente exhaustivo. Un route contable sin una transferencia o recepción source-backed no se presenta como valor recibido.

VALUE vuelve a validar IDs, digests, referencias, cobertura y cierre del grafo. Una aproximación puede conservar espacio `MAY`, pero no crear una identidad económica v2 exacta ni una prueba consumible. Si una ruta excede presupuesto, se difiere entera; no se publica un prefijo bajo la identidad autoritativa de la ruta completa.

El motivo fue reparar una pérdida medida: existían requests grounded que no podían enlazar con el top-50 de VALUE, y relajar el matcher habría fabricado evidencia. La solución correcta fue preservar la misma identidad MAP → TRACE → ECONOMIC → VALUE.

Los replays estructurales de Aegis y Auralis conservaron las identidades históricas y mejoraron resolución de rutas en Auralis, pero siguieron sin producir proof closures y DISCOVER permaneció degradado. Sirven para probar el contrato causal, no recall.

### 6.8 Source authority y conjunto cerrado de candidatos

El core añadió inventario ZIP completo, materialización segura de links internos, rechazo de escapes/ciclos/colisiones, límites físicos, nombres Windows reservados, hash del transporte, hash canónico del árbol extraído y un lock exclusivo del proyecto.

`validation_candidates.json` pasó a ser un conjunto cerrado. VALIDATE debe emitir exactamente un resultado por ID, sin extras ni ausentes. Los candidatos cortados se conservan para lifecycle/review, pero no pueden contaminar hashes, resúmenes o inputs de FILTER.

El motivo fue evitar que el sistema validase un universo distinto del que FILTER creía estar evaluando.

## 7. Sesión 3: runtime sellado, visibilidad y preparación de aceptación

### 7.1 Streaming TRACE en el core

Se añadió `src/services/trace_projection.rs`. Los consumidores dejaron de cargar el JSON TRACE completo y pasaron a:

- hashear todos los bytes físicos;
- deserializar solo los campos retenidos;
- limitar la proyección materializada a 64 MiB;
- controlar profundidad, strings, miembros y metadata;
- comprobar identidad física antes, durante y después;
- aceptar primarios superiores a 100 MiB sin omitirlos.

Esta pieza cierra el gap entre el soporte de artefactos grandes de las herramientas y el consumo real en el orquestador.

### 7.2 Evaluación causal y económica factorada

TRACE publica receipts independientes `trace.factorized_graph_evaluation.v1` para el consumidor causal y el económico. El core recomputa ambas evaluaciones; no confía solo en un digest declarado.

Si falta un consumidor, hay tampering, el inventario es incompleto o el digest está stale, la deuda se conserva. Una over-approximation sigue siendo `MAY` y no puede convertirse en ausencia o `MUST`.

El motivo fue impedir que una sola linearización parcial se presentase como cobertura suficiente para dos consumidores distintos.

### 7.3 Visibilidad Solidity conservadora

MAP corrigió la identificación de `public` y `external`:

- el AST solo acepta el nodo `visibility` directo de la declaración;
- el fallback inspecciona únicamente la cabecera enmascarada;
- comentarios, strings, modifiers o el cuerpo no pueden fabricar visibilidad;
- visibilidad ausente o contradictoria se trata conservadoramente como `internal`.

Así una función interna no se promueve erróneamente a entrypoint, critical surface o root económico. Es una corrección general, no específica de un protocolo.

### 7.4 Runtime release sin recompilar durante el scan

`SOLGUARD_PREBUILD_MODE=no_prebuild` hace que el core ejecute directamente los binarios release previamente sellados. Se exige layout absoluto y canónico de repos hermanos, hashes correctos y ausencia de redirecciones de Cargo, rustc, wrappers, flags, targets o toolchain.

El backend gestionado exige su path release absoluto y SHA-256. Node rechaza debug, binarios alternativos, missing, symlink/reparse o hash drift; Rust vuelve a hashear el ejecutable realmente cargado y `/health` publica `backend_binary_sha256`.

El fallback `cargo run` queda reservado al desarrollo. FILTER, EXPLOIT y el resto de fases quedan conectadas al mismo runtime precompilado.

El motivo fue que un release no es reproducible si recompila en mitad del scan o si cada worker puede resolver un binario diferente.

### 7.5 Único prebuild y receipts no reutilizables

Deploy añadió reserva exclusiva, creación, publicación y verificación de `solguard-prebuild-receipt.v1`. El receipt liga:

- el plan de medición;
- commits y árboles de repositorios;
- estado limpio;
- material físico del worktree;
- semantic files;
- binarios de producto;
- binarios y herramientas del host;
- hashes y tamaños.

La reserva consume el root aunque el prebuild falle. Esto evita reintentar sobre la misma identidad y ocultar que el primer intento no fue reproducible.

### 7.6 Defecto descubierto en gitlinks y corrección

El primer intento, `D:\SolguardCanaries\phase1-core-20260721-r1`, solo conserva `prebuild-receipt.json.reservation.json`; no existe receipt final. La reserva se creó el `2026-07-21T11:39:02.282Z` y el intento duró aproximadamente 325 segundos. Compiló las herramientas, core y backend, pero falló al sellar con:

`solguard-deploy material labs-v1/repos/lab-defi-v1 must be a regular non-symlink file`

La causa fue que el capturador trataba los ocho gitlinks versionados de `solguard-deploy` como archivos regulares.

La corrección introdujo captura material v2:

- gitlinks recursivos;
- verificación de que el HEAD limpio del repositorio enlazado coincide con el OID del padre;
- SHA-1 y SHA-256 cuando corresponden;
- bytes físicos, no solo metadata Git;
- rechazo de symlinks, reparse points, conflictos, index flags y redirecciones de entorno;
- builder canónico compartido por contrato y canarios.

El closure de scan pasó de 26 a 27 componentes y el de ejecución/prebuild de 33 a 34.

No se parcheó el caso concreto para que el prebuild pasara. Se corrigió el modelo general de material Git.

### 7.7 Prebuild `r2`: qué demostró y qué no

El segundo intento tardó aproximadamente 15,8 segundos, principalmente porque reutilizó los artefactos release ya compilados, y produjo:

`D:\SolguardCanaries\phase1-core-20260721-r2\prebuild-receipt.json`

Hechos del receipt:

| Campo | Valor |
|---|---|
| Schema | `solguard-prebuild-receipt.v1` |
| Creado | `2026-07-21T12:28:47.963Z` |
| Repositorios sellados | 14 |
| Binarios de producto | 12 |
| Herramientas/binarios host | 12 |
| Binarios totales inventariados | 24 |
| Hash interno del receipt | `1cb41bac4733b9a2a733e46d29b9672e2c1eda4a2ee539c1419f728b519e97d9` |
| SHA-256 del archivo | `0acb970bda6cc8f0ced79b16d16282f81fff3ce6f55ca58183e4e31c432e12a6` |
| Claim de prebuild canónico | `true` |
| Claim de autoridad de release | `false` |

El receipt prueba que ese conjunto concreto de repositorios y binarios pudo construirse, inventariarse y sellarse. No prueba que ningún canario haya pasado ni que la detección haya mejorado.

Además, `r2` selló `solguard-core` en `4fad2b94`. El commit posterior `e69aea3f` ya cambió el HEAD del core. Por tanto, incluso antes de crear este informe, `r2` dejó de representar el conjunto actual de commits. Este archivo añade otro cambio al worktree.

**Consecuencia operacional: `r2` debe conservarse como evidencia histórica de prebuild, pero no debe usarse para los canarios ni para el release actual. Después de commitear `INFORME.md` será obligatorio preparar un root fresco `r3` y ejecutar un único prebuild nuevo.**

## 8. ¿Hubo adaptación específica a los benchmarks?

La revisión no encontró branching productivo por nombre de Compound, Monad, Size, LoopFi, Morpheus o Timeswap. Los mecanismos añadidos se expresan mediante identidades, schemas, cobertura, lenguaje, grafo causal y evidencia física.

Sí existen fixtures y casos de regresión inspirados en fallos conocidos. Eso es correcto y necesario para evitar reintroducirlos, pero debe interpretarse con cuidado:

- Compound expuso problemas de source/symlinks;
- Vyper expuso un gap de lenguaje;
- Kinetiq y SukukFi expusieron pérdidas de aplicabilidad y autorización;
- Monad expuso que el snapshot de evaluación anterior solo cubría el componente C++ y no el alcance completo Rust BFT + C++;
- Size, LoopFi, Timeswap y Morpheus se eligieron como canarios de contratos distintos.

El snapshot completo de Monad quedó fijado a:

`code-423n4/2025-09-monad@bcc1592fcf38f47a417190b1ea159934926f1f12`

Esto es una corrección del corpus y de la evaluación, no una mejora de detección. No se debe presentar como recall ganado.

La conclusión precisa es: **los tests usan regresiones conocidas, pero no se observó una excepción productiva por protocolo. Aun así, solo un holdout disjunto puede demostrar que los mecanismos generalizan.**

## 9. Verificación realizada

### 9.1 Estado actual de `solguard-core`

Inmediatamente antes de crear este documento se verificó:

- rama `main` alineada con `origin/main`;
- worktree limpio;
- `cargo fmt --check`: correcto;
- `cargo clippy --locked --all-targets -- -D warnings`: correcto;
- `cargo test --locked`: 610 tests ejecutados, 608 correctos, 0 fallos y 2 ignorados, en 66,62 segundos.

Los dos tests ignorados son smokes cross-repo que requieren binarios o snapshots externos:

- `exact_windows_device_paths_flow_through_seeds_map_and_trace`;
- `zetachain_device_path_is_consumed_by_real_map_and_trace`.

Crear `INFORME.md` cambia deliberadamente el estado limpio. No cambia código Rust ni debería afectar compilación, pero sí cambia la identidad Git/material del release.

### 9.2 Gates locales conservados

El corte del 18 de julio dejó registrados en `PLAN_DE_MEJORA.MD` los siguientes gates locales: MAP 101, CORE 400, TRACE 84, DISCOVER 75, VALUE 67, INVARIANT 33, VALIDATE 130, FILTER 133, backend 18 y ECONOMIC 39, además de 424/424 tests de deploy.

Esos números pertenecen a aquel corte. Los commits del 21 añadieron muchas pruebas y no deben presentarse como los conteos actuales de todas las suites.

Después de corregir la captura Git, la salida preservada de la sesión de deploy registró 955 tests: 951 correctos, 0 fallos y 4 skips esperados en aproximadamente `2:25.17`, además de Prettier y checks estructurales. Este informe no reinterpreta ese resultado como aceptación del producto.

### 9.3 Qué verifican los tests nuevos

La cobertura adversarial añadida incluye, entre otras cosas:

- límites N−1/N/N+1;
- manifests faltantes, stale o falsificados;
- mutación TOCTOU;
- symlinks, hardlinks y reparse points;
- paths Windows verbatim y reservados;
- TRACE v1/v2/v3 y evidencia inyectada;
- Vyper con nombres, líneas, comentarios, strings y bodies falsificados;
- bounded invariants truncadas o manipuladas;
- primarios mayores de 100 MiB;
- graphs factorados con ciclos, choices y orden de efectos;
- sidecars que intentan adquirir autoridad independiente;
- binarios debug, alternativos o con hash drift;
- garantías de que `no_prebuild` no invoque Cargo.

Esto es evidencia fuerte de ingeniería defensiva. Sigue sin ser evidencia de eficacia de detección sobre protocolos nuevos.

## 10. Los ocho canarios y el release siguen pendientes

Los ocho canarios definidos son:

1. Compound v1;
2. Monad v1;
3. Size v2;
4. LoopFi v2;
5. Morpheus v4;
6. Timeswap v5;
7. Morpheus v6;
8. Vyper v8.

La aceptación exige 8/8, estados limpios, `filter_results.json` presente y product health válido. En el root `phase1-core-20260721-r2` solo existen el receipt y su reserva: no se ejecutó ninguno de esos ocho canarios dentro de esa cadena.

Tampoco se ha ejecutado con el código final:

- un nuevo `v1-v8-release` completo;
- un nuevo `labs-release` de los 90 labs;
- `finalize` y `verify` sobre ambos receipts;
- un holdout blind;
- una evaluación externa de findings nuevos.

Por tanto no existe todavía una baseline release final y firmada de estas mejoras.

## 11. Qué ha mejorado de verdad

Se puede afirmar con evidencia que:

- el core compila, pasa clippy y su suite actual no tiene fallos;
- la cadena entre fases es más verificable y menos confiada en metadata declarativa;
- una omisión o degradación queda tipada y no puede producir una decisión terminal optimista;
- TRACE, INVARIANT y los consumidores de artefactos grandes tienen límites explícitos y verificables;
- Vyper ya dispone de una ruta de evidencia nativa más realista;
- las identidades causales/económicas sobreviven mejor entre MAP, TRACE, ECONOMIC y VALUE;
- source, ZIPs, paths y material Git reciben comprobaciones adversariales serias;
- el scan puede usar binarios release sellados sin recompilar;
- FILTER tiene mucha más información para comprobar qué evidencia autorizó un veredicto;
- los cambios son generales en su formulación y no se observó branching por protocolo.

Estas mejoras reducen la probabilidad de resultados falsamente seguros, artefactos inconsistentes y releases irreproducibles. También crean una base mejor para detectar bugs profundos, porque preservan causalidad, estados `MAY`, evidencia y cobertura en lugar de aplastarlos en un ranking temprano.

## 12. Qué no está demostrado y qué deuda permanece

No se puede afirmar todavía que:

- haya aumentado el recall global;
- haya aumentado la precisión;
- haya bajado el volumen de ruido o inconclusos;
- FILTER funcione limpiamente en los ocho canarios reales;
- DISCOVER deje de estar degradado a escala;
- VALUE produzca suficientes proof closures;
- se detecten bugs no vistos;
- la herramienta sea ya útil para un hunter profesional durante horas de trabajo reales;
- el producto esté listo para auditar protocolos de forma autónoma;
- Solguard sea, o esté cerca de ser, «la mejor herramienta de auditoría».

El plan mantiene abiertas capacidades importantes:

- ArtifactStore plenamente transaccional;
- journal/DAG y work queue iterativa;
- world model persistente y realmente open-world;
- `EvidenceRequest` con reintentos y budgets;
- PROBE dirigido, symbolic/concolic y fork simulation;
- refutación y counterfactuals generales;
- DIFF útil para validación;
- aislamiento confiable OCI/VM y trust root;
- holdout blind custodiado;
- dos releases consecutivos con gates de calidad;
- findings nuevos adjudicados externamente.

También existe deuda de mantenibilidad en el core. Antes de este informe, algunos módulos tenían tamaños muy altos:

- `runtime.rs`: 24.865 líneas;
- `filter.rs`: 11.047 líneas;
- `trace_projection.rs`: 5.308 líneas;
- `trace_batch_selection.rs`: 4.998 líneas.

El código puede estar correcto y testeado, pero esta concentración incrementa el coste de revisión, la probabilidad de conflictos y la dificultad de aislar responsabilidades. Conviene modularizar de forma conservadora después de cerrar la medición, sin mezclar esa refactorización con nuevas capacidades de detección.

## 13. Valoración final, sincera y realista

### Estado del núcleo

`solguard-core` ya no parece roto a nivel de compilación, tests locales o contratos básicos. Ha pasado de orquestar outputs relativamente confiados a exigir autoridad física, hashes, inventories, selections, cobertura y estados fail-closed. La mejora estructural es grande y real.

### Estado del producto detection-only

Todavía no está validado como producto profesional. El último replay completo disponible pertenece al estado anterior y mostró una herramienta operativamente poco utilizable: DISCOVER degradado casi siempre, FILTER fallando en decenas de protocolos y una enorme mayoría de candidatos inconclusos.

Los cambios atacan precisamente esas causas, pero el efecto end-to-end sigue sin medirse. Por tanto la formulación honesta no es «ya está arreglada», sino:

**la reparación arquitectónica y contractual está muy avanzada; la reparación del resultado de producto está pendiente de demostración.**

### Capacidad para bug bounty

La base actual es bastante más prometedora. Preservar rutas, evidencia, identidad económica, cobertura y estados `MAY` es exactamente lo que necesita una herramienta que aspire a encontrar bugs complejos y no solo patrones conocidos.

Pero una herramienta útil para bug bounty debe entregar pocos leads, reproducibles y con evidencia suficiente. Aún no hay una medición actual de esa cola. Hasta superar canarios, replay y holdout, no es responsable afirmar que ya ahorra tiempo a un hunter o que detecta vulnerabilidades a ciegas de forma consistente.

### Objetivo de ser la mejor herramienta de auditoría

Ese objetivo sigue siendo lejano. No porque el trabajo haya sido inútil, sino porque la excelencia exige más que contratos correctos: reasoning open-world, adquisición iterativa de evidencia, refutación, análisis temporal multi-transacción, evaluación blind, utilidad humana y findings reales.

La recuperabilidad de Solguard es alta. No parece necesario reescribirlo desde cero. Se ha convertido una base frágil en una plataforma defensiva seria. En el corte original, el siguiente paso previsto no era añadir más claims, sino demostrar con un `r3` limpio y sellado cuánto de esa mejora estructural se traducía en detección útil. El addendum siguiente explica por qué ese plan quedó suspendido.

## 14. Consecuencia inmediata definida el 21 de julio

Esta sección conserva el orden de continuación definido al cerrar el informe
original. Quedó superado por los fallos de arranque y de contratos descritos en
el addendum del 22 de julio. En particular, ya no procede crear otro prebuild ni
ejecutar los canarios hasta terminar la congelación temporal y la macroauditoría
de infraestructura solicitada por el propietario.

1. Revisar y commitear únicamente `INFORME.md` en `solguard-core`.
2. Verificar de nuevo que los 14 repositorios del plan están limpios.
3. No reutilizar `r1` ni `r2`.
4. Crear un root fresco `phase1-core-20260721-r3` o una identidad posterior igualmente nueva.
5. Ejecutar un único prebuild definitivo.
6. Ejecutar los ocho canarios independientes y exigir 8/8.
7. Solo entonces preparar y ejecutar `v1-v8-release`, `labs-release`, `finalize` y `verify`.
8. Tratar v1-v8 y labs como regresión conocida, no como prueba blind.
9. Abrir el holdout únicamente cuando la cadena de release y sus gates estén cerrados.

Hasta completar esa secuencia, cualquier afirmación de mejora de recall, precisión, reducción de ruido o descubrimiento de bugs nuevos sería una hipótesis, no un resultado.

## 15. Addendum factual del 22 de julio: fallos al iniciar los canarios

### 15.1 Alcance y regla de interpretación

Este addendum documenta los fallos observados al intentar iniciar la aceptación
dirigida previa a v1-v8 y labs, las causas que pudieron demostrarse, los parches
aplicados y las comprobaciones realizadas. No convierte un test local en una
prueba de calidad de detección y no afirma que los ocho canarios hayan pasado.

Los roots fallidos se preservaron y no se reutilizaron. Las rutas y cifras de
esta sección son evidencia histórica del incidente; no son configuración del
producto ni se usan para seleccionar vulnerabilidades.

### 15.2 Diagnósticos previos no sellados

Antes de la cadena oficial se hicieron siete diagnósticos dirigidos sobre el
mismo protocolo para localizar fallos de infraestructura. No fueron releases ni
mediciones de recall. Sus resultados observables fueron:

| Root | Resultado observable | Duración reportada |
|---|---|---:|
| `phase1-20260721-r1-compound` | La autoridad de source rechazó la capacidad porque el proceso propietario no era ancestro. No se produjo `results.json`. | No disponible |
| `phase1-20260721-r2-compound` | El análisis terminó, pero el gate rechazó `validation results[192] uses ambiguous generic TRACE evidence`. | `00:31:32` |
| `phase1-20260721-r3-compound` | Se reprodujo el rechazo por evidencia TRACE genérica ambigua. | `00:29:13` |
| `phase1-20260721-r4-compound` | INVARIANT trató `symbol-a8ee7b6cea37fed0` como una autoridad física desconocida. | `00:13:16` |
| `phase1-20260721-r5-compound` | La conexión con Backend terminó en `ECONNRESET` durante TRACE. El log conservado no permite atribuir una causa más precisa. | Aproximadamente `00:37` |
| `phase1-20260721-r6-compound` | Backend salió con `0xffffffff`; el runner observó `ECONNRESET` y reinició el proceso. | `00:01:29` |
| `phase1-20260721-r7-compound` | El worker Tokio de Backend desbordó su stack (`STATUS_STACK_OVERFLOW`); el runner observó `ECONNRESET`. | `00:21:10` |

Estos diagnósticos demostraron que el problema no era una única regla de
detección. Había defectos en la custodia del proceso, en la separación entre
identidad semántica y autoridad física y en el presupuesto de stack del runtime.
Cuando un log no permite distinguir entre crash, kill externo o cierre del
proceso, este informe conserva `ECONNRESET` como síntoma y no inventa una causa.

### 15.3 Primer intento oficial: Backend no llegó a arrancar

El root oficial
`D:\SolguardCanaries\phase1-core-20260721-r3\compound` terminó en 9.126 ms. El
runner registró `Backend exited during startup`. El log de Backend contiene:

```text
thread 'main' (...) has overflowed its stack
error: script "start" exited with code 253
```

La causa concreta estaba en `solguard-backend`: el cálculo SHA-256 de la
identidad del ejecutable reservaba un array local de 1 MiB. El binario release de
Windows dispone de un stack principal de ese mismo orden; la verificación de
integridad podía consumirlo antes de que Tokio completase el arranque.

La corrección se publicó en `solguard-backend` como
`f5bed0fca97e464806deb970c2bd1fc70c12a920`:

- el buffer de hashing pasó del stack al heap;
- se añadió un test que ejecuta el hashing dentro de un thread Windows con
  stack de 1 MiB;
- se añadió un test release que exige llegar hasta la validación de
  configuración sin `stack overflow`;
- CI incorporó un job Windows release específico para este contrato.

El cambio no reduce la comprobación del binario: conserva lectura streaming,
metadata estable y SHA-256; solo cambia el lugar de la reserva de memoria.

### 15.4 Segundo intento oficial: pérdida de autoridad en INVARIANT

Tras corregir el arranque, el root
`D:\SolguardCanaries\phase1-core-20260721-r4\compound` avanzó por MAP, TRACE,
DISCOVER, ECONOMIC y VALUE. Terminó tras 1.766.018 ms (`00:29:26.018`) con:

```text
INVARIANT evidence `trace-economic-evidence-f550c14c35cbac71`
uses an unknown authority namespace
```

El fallo era correcto en su decisión fail-closed, pero revelaba un contrato
incorrecto: `trace-economic-evidence-*` identifica una comprobación semántica,
no un artefacto físico. INVARIANT intentaba resolverlo como si fuera un
`EvidenceRef` físico MAP o TRACE. La corrección separó:

- `source_ids`, que conservan linaje y relaciones semánticas;
- `source_evidence_ids`, que son los únicos IDs autorizados para resolver
  evidencia física;
- deuda local de una hipótesis mal ligada, que ya no degrada por sí sola todo
  el protocolo;
- input malformado, overflow o inconsistencia de contadores, que continúan
  fallando cerrados.

## 16. Fallos latentes descubiertos al auditar el root `r4`

La primera excepción visible no era el único defecto. La inspección de los
artefactos conservados identificó varias causas independientes que habrían
bloqueado una fase posterior o degradado el resultado:

1. El verificador posterior del productor TRACE podía rechazar un report porque
   `report.target` no coincidía exactamente con el descriptor seleccionado. El
   log operacional mostraba principalmente el inicio del stderr y podía ocultar
   el error terminal.
2. DISCOVER ordenaba `branch_path` como si fuera un set. Ese campo representa
   orden causal exterior-a-interior y no debe ordenarse; solo `event.guard` es
   un conjunto canónico ordenado y sin duplicados.
3. VALUE permitía que un efecto externo sin autoridad source-backed consumiera
   el presupuesto de secuencias antes de descartar la ruta, provocando
   `route_sequence_budget` y perdiendo rutas válidas.
4. INVARIANT mezclaba IDs semánticos `trace-economic-evidence-*` con namespaces
   de evidencia física.
5. Los límites de `TRACE/index.json` no coincidían entre productores y
   consumidores: coexistían valores de 16, 64 y 100 MiB.
6. El preflight JSON estricto no inspeccionaba duplicados dentro de todas las
   ramas no seleccionadas. También era necesario detectar claves equivalentes
   tras decodificar escapes Unicode, por ejemplo `a` y `\u0061`.
7. El productor TRACE deserializaba el índice tipado sin aplicar exactamente el
   mismo cierre estricto de campos desconocidos que los consumidores.
8. El runtime del verificador podía persistir bajo `trace/.runtime-tools` en un
   root fallido. Ese ejecutable no debe formar parte del artefacto TRACE.
9. El nombre autoritativo del receipt debía ser únicamente
   `evidence_verification.json`; la variante con guion solo puede aparecer en
   pruebas negativas.

La presencia de varios defectos compartidos explica por qué un único canario
era capaz de revelar fallos en distintas fases. No eran nueve excepciones para
Compound: eran contratos generales que cualquier protocolo grande o
multilenguaje podía atravesar.

## 17. Parches generales aplicados

### 17.1 TRACE productor y contrato compartido

Se creó un verificador TRACE v2 compartido por Core, DISCOVER, VALIDATE y
FILTER. Las cuatro implementaciones efectivas quedaron byte-idénticas, con
176.486 bytes, LF y SHA-256:

`bf0c152603e36abdb369a679a4ac05680368a48e93b7d70cb1f3d18b22096084`

El prebuild comprueba esa identidad antes y después de compilar. El contrato
actual exige:

- `index.json` físico no vacío y con límite inclusivo de 100 MiB;
- receipt y stdout con límites independientes inclusivos de 64 MiB;
- un único descriptor físico estable y dos pasadas: preflight/hash y parseo
  tipado cerrado;
- detección de claves duplicadas en todos los objetos, incluso en ramas no
  retenidas;
- comparación de claves tras decodificación Unicode;
- límites globales de profundidad, nodos, campos y bytes de claves;
- rechazo de trailing documents, campos desconocidos, symlinks, hardlinks,
  escapes de root, drift de identidad y mutaciones TOCTOU;
- ausencia de stdout, receipt y staging ante cualquier fallo previo;
- recomputación final de hashes y de toda la autoridad declarada.

El verificador ejecutable se copia a un `TempDir` privado fuera de TRACE, vive
hasta terminar FILTER y se elimina mediante su guard incluso en caminos de
error. El root histórico `r4` conserva `.runtime-tools` como evidencia del fallo;
no se modifica ni se reutiliza. Los artefactos nuevos no deben contenerlo.

### 17.2 MAP, rutas causales y VALUE

MAP publica prerequisitos de ruta y control flow recomputables. TRACE conserva
la identidad del target MAP y su orden causal. DISCOVER mantiene `branch_path`
en orden exterior-a-interior y reconcilia por separado guards canónicos.

VALUE descarta efectos externos sin autoridad antes de consumir el presupuesto
de secuencias. Una aproximación puede conservar un camino `MAY`, pero no crear
receipts, deltas o identidades económicas exactas.

### 17.3 INVARIANT, VALIDATE y FILTER

INVARIANT publica una selección bounded con contadores comprobados y separa
linaje semántico de evidencia física. VALIDATE recompone el primario bounded y
propaga deuda coherente como inconclusa; un input malformado continúa siendo un
error duro.

FILTER vuelve a abrir MAP, TRACE, INVARIANT y VALIDATE, comprueba hashes,
inventarios, receipts y el conjunto cerrado de candidatos. Una decisión
terminal solo se admite cuando la autoridad física es completa y coincide con
la usada por VALIDATE.

### 17.4 DISCOVER, Vyper y artefactos grandes

DISCOVER incorporó un contrato cerrado de cobertura y razones tipadas. Vyper
dispone de binding de función, archivo, líneas y evidencia nativa, sin promover
texto genérico a autoridad TRACE.

Los artefactos grandes se leen mediante metadata estable, streaming y
proyecciones bounded. El límite físico y el presupuesto semántico son conceptos
distintos: aceptar 100 MiB no permite materializar memoria sin límite ni omitir
silenciosamente el resto.

### 17.5 Tests y portabilidad

Los smokes físicos de Deploy ya no contienen rutas `D:` ni nombres de
protocolos. Se activan exclusivamente mediante:

- `SOLGUARD_TRACE_PRODUCER_V2_POSITIVE_ROOT`;
- `SOLGUARD_TRACE_PRODUCER_V2_NEGATIVE_ROOT`.

Esto conserva una prueba física opcional sin convertir un benchmark conocido
en una bifurcación del producto.

## 18. Commits que cierran la reparación del incidente

Los parches se cerraron el 22 de julio en commits separados por repositorio:

| Repositorio | Commit | Propósito |
|---|---|---|
| `solguard-agents` | `690f17cc79091167b89c5ab64c3c3883a0496352` | Sellar contratos de detección y coordinación. |
| `solguard-map` | `6fa12ed98fa5facdd1c26d6a08c816112c0bd8d8` | Sellar prerequisitos de control flow para target routes. |
| `solguard-trace` | `825fe857b0d3ea85bbdcf4d07fb48ce73ae415be` | Endurecer la autoridad física TRACE v2. |
| `solguard-discover` | `765034ec75c49a8e5e1e5ddb527edb74a120d13e` | Verificar la autoridad TRACE v2 sellada. |
| `solguard-economic` | `126d21f8a5c61b74bc5f68ff798b3fc125a28145` | Consumir autoridad del grafo factorado. |
| `solguard-value` | `7dee5235264d632b890384ee38cde7b7dabd0051` | Exigir autoridad graph-native para valor. |
| `solguard-invariant` | `d232113fec53724ca426fcc25073ab1dfeba5f01` | Separar linaje semántico y tuplas físicas. |
| `solguard-validate` | `7bcaec84503179f3f330e8e024b35f9b454aaf92` | Cerrar autoridad TRACE e INVARIANT. |
| `solguard-filter` | `14a9936d39de90aa82901cc06b18096778e56d29` | Exigir admisión física TRACE/INVARIANT. |
| `solguard-core` | `a128e9fd0bb76e96056aab64f1ed2db81d1d196d` | Endurecer la autoridad entre fases. |
| `solguard-backend` | `47ffcdbc1e13de2123b7463af2b656e97f08f482` | Fijar la dependencia del contrato TRACE compartido. |
| `solguard-docs` | `fed9f1c11644383dc27be5fdc63ce06be029f3d0` | Alinear documentación con los contratos reales. |
| `solguard-deploy` | `92f91be205aa6e45baaf9eeebce13ba77cbc930e` | Aplicar los gates TRACE v2 en prebuild y release. |

No se hizo push ni se crearon tags. Cada repo pasó `git diff --check` y quedó
sin staging ni archivos pendientes antes de crear este addendum.

## 19. Evidencia de verificación posterior

Las verificaciones ejecutadas y conservadas fueron:

| Superficie | Resultado |
|---|---:|
| TRACE | 271 tests, 0 fallos |
| DISCOVER | 213 tests, 0 fallos |
| VALIDATE | 259 tests, 0 fallos |
| FILTER | 319 tests correctos, 0 fallos, 2 ignorados por fixtures externos preexistentes |
| Core | 643 tests correctos, 0 fallos, 2 ignorados por fixtures externos preexistentes |
| Contrato TRACE compartido | 12/12 |
| Backend | 26/26 |
| Deploy, suite completa | 1.010 correctos, 0 fallos, 5 skips ambientales |
| Deploy, último ajuste portable | 32 correctos, 0 fallos, 3 skips configurables |
| Smoke Core → FILTER | 2/2 |

Además:

- `fmt` y Clippy con `-D warnings` pasaron en las superficies Rust afectadas;
- `git diff --check` pasó en todos los repos registrados;
- un `index.json` físico de exactamente 104.857.600 bytes fue aceptado;
- al añadir un byte, el productor falló antes de publicar stdout, staging o
  receipt;
- el smoke positivo `r6` y el negativo `r4` de consumidores dieron 2/2;
- no se encontraron nombres de Compound, Monad, LoopFi, Morpheus o Timeswap en
  líneas añadidas de código productivo; `Vyper` aparece como lenguaje y `Size`
  como concepto técnico, no como selector de protocolo.

## 20. Límites de la evidencia y decisión de congelación

El productor TRACE actual no pudo repetirse sobre los 669 targets del artefacto
físico completo porque el árbol source extraído había sido limpiado. El intento
falló cerrado por `ENOENT`, con stdout vacío y sin receipt. El ZIP oficial sí se
rematerializó y coincide con su autoridad:

- transporte: 2.624.741 bytes;
- SHA-256: `79062d620e45ac2d771279aeb151be9ff8fbbfc559047965635e5e0a179ef993`;
- source tree: 452 archivos, 64 directorios, 9.952.367 bytes;
- tree SHA-256: `ac68935ea12e49af9693046d482221375852f766bbf0a58ebb80949f3010b39c`.

No existe una API pública que exponga `extract_zip_authorized`; por tanto no se
usó un extractor manual ni se lanzó otro análisis completo solo para fabricar
esa evidencia. La futura aceptación con sources frescos deberá cerrar este
residual.

La conclusión honesta es:

**la reparación contractual está ampliamente cubierta por pruebas y smokes, pero
la aceptación operacional 8/8 no se ha ejecutado y la calidad end-to-end no está
demostrada.**

Por decisión del propietario, se congela temporalmente el inicio de canarios,
v1-v8 y labs. El siguiente trabajo es una macroauditoría de la infraestructura
completa para cerrar responsabilidades, inputs, outputs, contratos, CI,
mantenibilidad y rendimiento sin añadir nuevas familias específicas ni reducir
la potencia actual. Solo después de esa auditoría se preparará una nueva cadena
inmutable de aceptación.

## 21. Macroauditoría de madurez del 22 de julio

La fase que sigue a la congelación anterior no fue otro intento de hacer pasar
Compound ni de ajustar los benchmarks. Fue una auditoría estática y dinámica de
las responsabilidades, entradas, salidas, procesos, publicación, recuperación,
mantenibilidad y CI de los 17 repositorios de Solguard.

Las reglas aplicadas durante toda la fase fueron:

- canarios, v1-v8, los 90 labs y holdout permanecieron congelados;
- no se añadieron familias de vulnerabilidad ni nombres de protocolos al motor;
- primero se inventariaron commits, LOC, contratos y fallos;
- cada owner tuvo ficheros disjuntos y un criterio de salida;
- cambios funcionales y documentación se separaron en commits;
- un fallo coherente por presupuesto se conserva como deuda tipada;
- input malformado, ambiguo, sustituido o fuera de autoridad falla cerrado;
- no se atribuye una mejora de recall, precisión, ruido o velocidad sin replay;
- GitHub Actions remoto no se considera verde porque no hubo push.

La coordinación y los informes de la primera pasada están en
`solguard-agents/sprints/2026-07-22-infrastructure-maturity-audit/`. Los cuatro
informes originales se conservan sin reescribir para que siga visible qué se
encontró antes de aplicar los parches.

## 22. Qué estaba inmaduro antes de esta fase

La primera pasada no demostró que el detector completo fabricara findings
terminales de la nada. Sí encontró dos P0 operacionales y una matriz amplia de
P1 que impedía considerar la infraestructura profesional:

1. La API loopback no exigía una credencial externa separada, CORS era demasiado
   permisivo y la política peligrosa no estaba suficientemente cerrada antes de
   llegar a Core.
2. EXPLOIT llamaba sandbox a un workspace que podía compilar o ejecutar código
   del target en el host. El directorio temporal no era una frontera de
   seguridad.
3. MAP, TRACE y DISCOVER no compartían una disciplina física uniforme para
   roots, links, TOCTOU, presupuestos y publicación.
4. TRACE podía gastar trabajo superlineal en preflight y materializar demasiado
   source Solidity de forma agregada.
5. El motor genérico y el catálogo de patrones conocidos no declaraban una
   procedencia suficientemente fuerte para una ejecución blind.
6. VALIDATE y FILTER necesitaban publicación terminal transaccional y una
   procedencia manifest-first más estricta.
7. INVARIANT, ECONOMIC y VALUE necesitaban distinguir mejor lineage semántico de
   evidencia física y cerrar sus consumos TRACE bounded.
8. Procesos, Git, ingesta y Diff tenían caminos con output, timeouts,
   completitud o código remoto insuficientemente acotados.
9. CLI, backend y base de datos habían acumulado responsabilidades o fallbacks
   incompatibles con la arquitectura declarada.
10. Había archivos de 6.000 a más de 26.000 líneas y contratos duplicados sin un
    gate machine-checkable común.

Estos defectos eran sistémicos, no excepciones de un protocolo. Por eso se
repararon como infraestructura general.

## 23. Cierre de responsabilidades por herramienta

### 23.1 MAP

MAP queda limitado a inventariar y modelar la superficie determinista. No
valida bugs ni recibe ground truth. La macroauditoría añadió:

- root de source canónico, físicamente contenido y link-free;
- lectura estable con revalidación antes/después;
- admisión y presupuestos antes de CFG/dominadores;
- deuda explícita cuando una colección coherente se acota;
- bundle create-only y atómico después de validar primario, sidecars y receipts;
- adquisición local/Git separada de la semántica de MAP;
- tests N-1/N/N+1, links, deriva, publicación y fallo parcial.

No se añadió una heurística de benchmark. El resultado actual es 179/179 tests,
Clippy estricto, formato y build release verdes.

### 23.2 TRACE

TRACE sigue siendo el propietario de rutas, guards, estado, efectos y evidencia
nativa. Ahora declara el enum cerrado:

```text
compatibility | generic_blind
```

Cada mismatch, invariante sugerida y prioridad conserva un origen:

- `structural_generic`;
- `generic_rule`;
- `known_pattern`.

`generic_blind` excluye `known_pattern` de la autoridad publicada. No elimina el
motor estructural ni añade nombres conocidos. Copiar un ID tampoco cambia su
origen MAP/TRACE.

La carga Solidity deep ya no recorre el corpus completo. Deriva desde MAP la
clausura de endpoints callable resueltos y materializa conjuntamente el target
y sus helpers autorizados, incluso en otros ficheros. Conserva guards, llamadas,
efectos, transfers y autorización source-backed cross-file bajo estos límites:

- 256 ficheros y 32 MiB por proyecto;
- 8 MiB por dependencia;
- LRU de 16 proyectos y 64 MiB agregados;
- catálogo de 65.536 descriptores y 256 MiB por batch.

Un cache hit revalida todos los descriptores. El cierre final revalida también
las dependencias auxiliares. Overflow, ambigüedad física y drift fallan cerrado.

La suite final de TRACE pasa 299/299, doctests, Clippy, formato y release. Los
binarios verificados de esa compilación fueron:

- `solguard-trace.exe`: 18.194.432 bytes,
  `f5f4c034e67e0f619ebdb1412ffedcf2da2e515e701b78928a7d30e5e414d083`;
- `solguard-trace-evidence-verify.exe`: 17.229.824 bytes,
  `ef1331fc2e43f1bd54503ebea16eb984cd86db421afa8cc1b51c8dc24bb37b9a`.

Estos hashes identifican aquella build local; no son un release ni deben
reutilizarse como autoridad después de cambiar cualquier repo.

### 23.3 DISCOVER

DISCOVER queda como constructor del world model y de hipótesis abiertas, no
como validador de findings. Sus fronteras actuales incluyen:

- traversal iterativo y físicamente contenido;
- límites separados de profundidad, entradas, directorios, path bytes y bytes
  retenidos;
- cobertura exacta por unidad y razones cerradas;
- TRACE manifest-first y verificación del contrato productor;
- deadline cooperativo y estructuras de cierre que evitan clonar caminos sin
  cota;
- binding solo por identidades de location, symbol, route, state, flow y
  endpoint, nunca por vocabulario de familia aislado;
- publicación completa/atómica después de validar los artefactos.

La suite final pasa 243/243, doctests, Clippy, formato y release. Esto demuestra
los contratos de DISCOVER; no demuestra que el world model sea completo para
bugs desconocidos.

### 23.4 ECONOMIC, VALUE e INVARIANT

Los tres motores conservan responsabilidades separadas:

- ECONOMIC modela transiciones, ecuaciones y deuda económica;
- VALUE modela rutas de valor y pruebas candidatas;
- INVARIANT sintetiza predicados tipados.

Los tres consumen TRACE manifest-first mediante lecturas bounded, estables y
físicamente contenidas. Recalculan cierre, digests, counters y capabilities y
tratan v1/legacy como diagnóstico. La evidencia semántica
`trace-economic-evidence-*` permanece `source_id`; solo `source_evidence_ids`
resueltos a tuplas físicas pueden autorizar una evidencia.

VALUE mantiene separada la request dirigida de la evidencia que responde. Una
request nunca se autocorrobora. INVARIANT conserva selección bounded, relaciones
y deuda de anchors sin convertir una omisión global en soporte local.

Resultados finales:

- ECONOMIC: 83/83;
- VALUE: 101/101;
- INVARIANT: 62/62;
- formato, Clippy y release verdes en los tres.

### 23.5 VALIDATE y FILTER

VALIDATE sigue siendo el único owner del verdict
`supported|refuted|inconclusive`. FILTER sigue siendo una evaluación
independiente post-VALIDATE y no reescribe ese verdict.

Ambos reabren TRACE por manifest exacto, cierran root/index/members, rechazan
junk, links, hardlinks, sustitución y drift, y permiten primarios grandes por
streaming dentro de presupuestos explícitos. El runtime bounded de INVARIANT se
reconcilia contra su primario seleccionado.

La publicación terminal es create-only y transaccional. Una ejecución standalone
sin autoridad de orquestación no puede presentarse como una decisión productiva.
Deuda coherente produce inconclusive/review sin ocultar el artefacto; input
malformado sigue siendo error duro.

Resultados finales:

- VALIDATE: 270/270;
- FILTER: 327 correctos, 0 fallos y 2 ignorados porque requieren binarios release
  externos no configurados;
- formato, Clippy, release y metadata locales verdes.

Los dos tests ignorados no se cuentan como ejecutados ni como evidencia verde.

### 23.6 Core

Core conserva la orquestación completa y no contiene HTTP. La fase añadió una
frontera común de filesystem y separó tres grants:

- `projects_dir`: estado gestionado por Core;
- `local_source_roots`: targets locales autorizados;
- `ingest_roots`: documentos autorizados.

Un grant no implica los otros. Los nombres de proyecto deben ser canónicos; no
se sanea una identidad inválida hasta convertirla silenciosamente en otra. La
creación es create-only y la publicación usa staging hermano y rename atómico.

La ingesta tiene plan cerrado, journal durable, commit, cleanup y recovery
idempotente. Backend invoca el recovery al arrancar, pero Core decide qué estado
puede recuperarse. Un journal malformado, stale o escapado falla cerrado.

Los procesos usan entorno allowlisted, output bounded, timeout y terminación del
árbol. Git remoto acepta locators canónicos de GitHub sin credenciales, commit
exacto, entorno aislado, hooks/submodules desactivados, checkout efímero y
receipt. No ejecuta código del repositorio para adquirirlo.

La validación final de Core fue:

- 695 tests totales;
- 693 correctos;
- 0 fallos;
- 2 ignorados por fixtures externos;
- Clippy all-targets/all-features con warnings como error;
- formato y build release all-targets/all-features verdes.

### 23.7 Backend y CLI

Backend queda como host HTTP/modelo y adaptador de Core. La API externa exige
`EXTERNAL_API_KEY`, distinta de `INTERNAL_API_KEY`, salvo health público mínimo
y preflight. Aplica antes del handler:

- CORS por origen canónico exacto;
- body JSON bounded;
- concurrencia bounded;
- DTOs cerrados;
- errores con `incident_id` sin filtrar rutas o secretos.

La attestation gestionada de `/health` requiere autenticación e incluye binario,
contrato, paths de runtime, `projects_dir` y `local_source_roots`. No se atribuye
a esa respuesta la publicación de `ingest_roots`. `analysis_profile` se
transporta como enum, sin que el backend interprete la detección. El default de
una request que omite `mode` es `audit_only`; EXPLOIT exige simultáneamente
`full` y `run_exploit=true`.

Backend pasa 43/43 tests Rust, Clippy, formato y release. Sus tests y build Node
declarados por el repositorio también pasaron en el bloque funcional.

CLI ya no abre SQLite ni Ollama y no ejecuta herramientas. Consume la API
autenticada a través del proxy local Tauri. Los comandos legacy no soportados
fallan explícitamente en vez de llamar a otro endpoint. Resultado: 3 tests web,
2 Rust y builds Vite/Tauri release verdes.

### 23.8 EXPLOIT, DIFF y DATABASE

EXPLOIT es ahora plan-only por defecto. `execute` y `compile_only` terminan en
`isolation_unavailable` mientras no exista un runner aislado verificado. No hay
fallback al host y el workspace de planificación no se llama frontera de
seguridad. Pasa 84/84, Clippy, formato y release.

DIFF inspecciona Git con entorno no heredado y desactiva hooks, filters,
submodules y ejecución del repositorio. Paginación, patches ausentes y
truncamiento se registran como deuda de completitud. Pasa 29/29, Clippy,
formato y release.

DATABASE limita payloads, filas y procesos del connector. Captura stdout/stderr
bounded, aplica timeout y termina el árbol. La publicación parcial no se marca
como ingesta completa. Pasa 65 tests Rust; Node pasa 32 con 1 skip ambiental por
`EPERM` al crear un symlink en Windows; release verde.

### 23.9 Deploy

Deploy conserva benchmarks, labs, evaluación post-hoc y release. No es un motor
de detección. La macroauditoría cambió su frontera operacional:

- `solguard-scan-runtime-config.v2` no persiste API keys;
- una autoridad efímera single-link contiene las credenciales del backend;
- el padre la destruye al terminar y ante fallo de prepare o run;
- si operación y cleanup fallan, se conservan ambos errores;
- todos los runners usan auth externa gestionada;
- adquisición Git usa commit exacto, entorno aislado y repositorio efímero;
- los source roots son exactos y no se heredan implícitamente;
- los monolitos de detection coverage y pre-release tests se dividieron por
  responsabilidad sin cambiar exports ni nombres de casos.

El cierre scan v2 tiene exactamente 29 componentes: 20 módulos JavaScript y 9
recursos sellados. El productor y consumidor importan una única identidad,
comparan el set exacto y reabren físicamente cada miembro.

El cierre legacy de benchmark/canario tiene 35 componentes: 24 módulos
alcanzables y 11 recursos. Es una frontera de resume conocida, no evidencia
blind.

La suite final de Deploy tiene:

- 1.026 tests totales;
- 1.018 correctos;
- 0 fallos;
- 8 skips explícitos por capacidades POSIX/symlink o fixtures externos no
  configurados;
- Prettier, sintaxis Bash y `git diff --check` verdes.

No se lanzó ningún runner de benchmark o lab para obtener ese resultado.

## 24. Modularización y tamaño

La modularización fue mecánica por cohesión antes de añadir nuevos contratos.
Algunos ejemplos:

- Core: `analyzer/runtime.rs` pasó de un monolito de 26.772 líneas en el diff
  previo a una fachada de 14, con execution, contracts, invariant runtime,
  oversized projection y observability separados.
- Core: `analyzer/tests.rs` pasó de 22.978 a una fachada de 7 y suites por
  dominio.
- Core: `finalizers.rs` pasó de 13.476 a una fachada de 6.
- Core: `filter.rs` pasó de 12.359 a una fachada de 11.
- Deploy: `detection-coverage-check.mjs` bajó de 12.394 a 5.956 y delega
  primitives, route graph, TRACE factorized, selection, stage contracts y
  downstream.
- Deploy: `benchmark-pre-release-check.test.mjs` bajó de 10.364 a 2.970 y
  separa fixtures y tests downstream.
- FILTER: el test monolítico de 7.680 líneas se dividió en cuatro grupos; la
  paridad de sus 207 casos se verificó antes de la suite completa.
- TRACE: `batch.rs` quedó en 5.942 después de extraer el catálogo/source cache.

La auditoría final no encuentra ningún fichero de código o test rastreado por
encima de 6.000 líneas. El mayor registrado es
`solguard-trace/tests/trace_solidity.rs` con 5.960.

Esto mejora mantenibilidad y reduce el radio de revisión. No significa que el
total de LOC se haya reducido: los contratos físicos, recuperación y tests
adversariales añadieron código. Tampoco se presenta como una mejora medida de
runtime.

## 25. Tres fallos descubiertos durante el propio cierre

La parte más importante de esta fase es que no se dio por bueno el primer verde.
Revisiones posteriores encontraron tres defectos reales.

### 25.1 Regresión Solidity cross-file de TRACE

La primera optimización dejaba de cargar el corpus Solidity completo y parseaba
solo el fichero seleccionado. Reducía memoria, pero podía perder guards,
efectos o autorización situados en un helper de otro fichero. La suite previa no
cubría el caso productor completo.

No se aceptó ese estado. Se reemplazó por una clausura general derivada de
endpoints callable MAP y se añadieron:

- positivo unitario target/helper cross-file;
- positivo CLI batch `Derived.redeem -> Base.redeemFresh` con evidencia de
  `Base.sol`;
- negativo de 257 ficheros frente al límite inclusivo de 256;
- negativo de sustitución de una dependencia cacheada.

El fixture usa nombres sintéticos y estructura general; no adapta TRACE a un
protocolo conocido.

### 25.2 Productor 29 / consumidor 28 en Deploy

La primera suite de Deploy pasó porque el test del builder y el test del worker
construían sus fixtures desde listas distintas. El builder sellaba
`git_material_module` y producía 29 componentes; el consumidor enumeraba 28 y
podía rechazar el contrato real.

La revisión documental detectó la contradicción antes de ejecutar benchmarks.
El commit `a8abf97`:

- mueve la identidad a un owner único;
- obliga al builder a hacer exact-keys contra esa identidad;
- obliga al consumidor a importar la misma lista;
- construye en test el contrato real;
- lo entrega al validador runtime;
- reabre los 29 componentes físicos.

La primera repetición completa encontró además que el analizador estático de
imports no aceptaba un `export { local }`. Se cambió a una exportación constante
parseable, pasaron 16/16 tests dirigidos y después la suite completa volvió a
1.018/0/8.

### 25.3 Routing obsoleto en las guías de agentes

El grafo de `registry/repos.json` ya representaba Backend como transporte de
Core, pero varias guías `agents/README.md` todavía enviaban directamente TRACE,
DISCOVER, ECONOMIC, VALUE, INVARIANT, VALIDATE, FILTER, EXPLOIT, DIFF o DATABASE
a Backend. EXPLOIT conservaba además la responsabilidad obsoleta `sandbox
runner` pese al contrato plan-only.

No bastaba con corregir la prosa. `708bf0f` amplía el validador de coordinación
para reabrir físicamente las 16 guías, extraer `Upstream` y `Downstream` y exigir
identidad y orden exactos con el registry. Dos pruebas cubren deriva de routing
y la representación cerrada `none`. La suite de coordinación queda en 11/11 y
el gate local confirma 16/16 guías.

Estos tres incidentes justifican la macroauditoría: compilar y tener tests
aislados verdes no basta; los contratos deben cruzar productor y consumidor y
su documentación operativa debe permanecer vinculada a la misma autoridad.

## 26. Commits funcionales de la macroauditoría

| Repositorio | Commits funcionales principales |
|---|---|
| Agents | `a6b5d14`, `8c691af`, `6fc1986`, `708bf0f` |
| MAP | `dfe544c`, `aa21297`, `ba409b6` |
| TRACE | `146f9a4`, `e3ebb7e`, `32d4ba3` |
| DISCOVER | `567e242`, `d57aef2`, `fd12cf0` |
| ECONOMIC | `486c8a4`, `758ffc9`, `a77087f` |
| VALUE | `bd4c997`, `5e2f812`, `0d7bfb8` |
| INVARIANT | `9e5f756`, `4b14051`, `31759cf` |
| VALIDATE | `07b90b1`, `562d90f`, `21d5122` |
| FILTER | `7d72036`, `c3c4ee0`, `53d8926`, `ad5a1e4` |
| EXPLOIT | `ef06488`, `e8535c6`, `c8b915e`, `d42da45` |
| DIFF | `71a0241`, `b54d478`, `d329f98` |
| DATABASE | `54989dc`, `9304471` |
| CORE | `58921c8`, `5a20341`, `36b2b0f` |
| BACKEND | `1afb753`, `ff6f3ec`, `0a74891` |
| CLI | `fa8773f`, `d248ebf` |
| DEPLOY | `09b86cd`, `a8abf97` |

Los commits anteriores de reparación TRACE/INVARIANT/FILTER descritos en las
secciones 17-20 siguen formando la base. Esta tabla identifica el bloque de
madurez posterior, no reemplaza el historial anterior.

## 27. Matriz de verificación final

| Repositorio | Tests locales | Otras verificaciones |
|---|---:|---|
| MAP | 179/179 | fmt, Clippy, release |
| TRACE | 299/299 | fmt, Clippy, doctests, release |
| DISCOVER | 243/243 | fmt, Clippy, doctests, release |
| ECONOMIC | 83/83 | fmt, Clippy, metadata, release |
| VALUE | 101/101 | fmt, Clippy, metadata, release |
| INVARIANT | 62/62 | fmt, Clippy, metadata, release |
| VALIDATE | 270/270 | fmt, Clippy, metadata standalone, release |
| FILTER | 327 pass, 2 ignored | fmt + fragments, Clippy, metadata standalone, release |
| EXPLOIT | 84/84 | fmt, Clippy, release |
| DIFF | 29/29 | fmt, Clippy, release |
| DATABASE | 65 Rust; 32 Node pass, 1 skip | fmt, Clippy, release |
| CORE | 693 pass, 2 ignored | fmt, Clippy all, release all |
| BACKEND | 43/43 Rust | fmt, Clippy, Node gates, release |
| CLI | 3 web; 2 Rust | Vite build, Tauri release |
| DEPLOY | 1.018 pass, 8 skips | Prettier, Bash, diff check |
| AGENTS | 11/11 | 16 repos, 112 claims, 16 guías, 4 grupos/11 miembros, 16 workflows |
| DOCS | 62 Markdown, 95 enlaces relativos, 0 rotos | UTF-8, fences y diff correctos; sin build de producto |

No se suman estos conteos como una cifra global porque mezclan suites, runtimes
y algunos contratos vendorizados. Un total agregado sería engañoso.

Todos los repos Rust afectados tuvieron build release local. Los workflows
fueron revisados y los validadores locales pasan. No se ejecutó GitHub Actions
remoto, por lo que no se afirma un estado remoto verde.

## 28. Valoración honesta después de la macroauditoría

La infraestructura actual es mucho más madura que la que inició los canarios:

- las responsabilidades tienen owners explícitos;
- inputs y outputs autoritativos son bounded y físicos;
- las publicaciones importantes son create-only/transaccionales;
- procesos, Git, ingesta y secretos tienen cleanup y recovery;
- el modo general declara procedencia en vez de mezclarla;
- EXPLOIT no ejecuta código host sin aislamiento;
- el código de alto riesgo está dividido y testeado;
- la coordinación detecta deriva entre repos;
- se encontraron y repararon fallos que el primer verde había ocultado.

Pero todavía no es honesto afirmar que Solguard es un producto profesional de
bug bounty validado end-to-end. Faltan hechos que esta fase prohibió fabricar:

1. ejecutar los ocho canarios desde una cadena inmutable nueva;
2. exigir 8/8 con estados limpios y `filter_results.json`;
3. ejecutar v1-v8 y los 90 labs en roots nuevos;
4. finalizar y verificar receipts;
5. comparar ruido, candidatos, soporte, recall conocido, tiempos y memoria;
6. abrir en el futuro un holdout independiente según su ceremonia;
7. ejecutar GitHub Actions remoto tras publicar los commits.

Tampoco hay una medición nueva que demuestre que sea más rápida. Se eliminaron
recorridos y copias no acotados y se redujo el tamaño de monolitos, pero una
mejora de complejidad o mantenibilidad no es una cifra de tiempo/RAM.

La conclusión correcta es:

**Solguard ha cerrado los defectos operacionales abordados y verificados en esta macroauditoría. Permanecen explícitos los residuales no demostrados: CI remoto, tests ignorados que dependen de fixtures/binarios externos, atestación de ACL exclusiva en Windows y aislamiento verificable para ejecución host. Su infraestructura local es considerablemente más estricta, modular y auditable. Su calidad real de detección, filtrado y generalización sigue sin demostrarse hasta repetir la aceptación y los corpora congelados.**

## 29. Cierre previo al nuevo replay: perfil, bootstrap y medición profesional

### 29.1 Motivo de este bloque

Antes de lanzar otra ejecución de muchas horas se revisó
`LIMITES_RIESGOS_RESIDUALES.md` para distinguir dos estados que no deben
mezclarse:

1. que exista un sistema capaz de medir de forma verificable;
2. que ya exista una medición real producida por ese sistema.

El segundo estado sigue pendiente. Este bloque implementa y prueba el primero,
sin rellenar con estimaciones los datos que solo pueden producir v1-v8 y labs.

La revisión encontró tres problemas previos al replay:

- los requests canónicos de benchmarks/labs no fijaban `analysis_profile`, por
  lo que heredaban el default de transición `compatibility`;
- los outputs históricos ya habían sido eliminados tras documentarlos, mientras
  `prepare` exigía siempre artefactos anteriores físicos;
- la telemetría existente medía memoria del árbol y presión parcial del host,
  pero no cerraba CPU, IO, storage ni GPU AMD dentro del receipt release.

No se adaptó ninguna regla a Compound, Monad, Size, LoopFi, Morpheus, Timeswap o
Vyper. Esos nombres solo definen la matriz canaria operacional ya acordada.

### 29.2 Perfil `generic_blind` obligatorio para la cadena preparada

Los runners de v1-v8 y labs envían ahora `analysis_profile=generic_blind` y
rechazan una respuesta Backend con otro perfil. La identidad runtime
`solguard-runtime-policy.v2` incluye el perfil y usa exact keys. La aceptación
canaria vuelve a comprobarlo y rechaza un contrato `compatibility` incluso si
un actor recalcula sus hashes internos.

TRACE conserva `compatibility` para callers históricos; no se cambió ese default
global de forma incompatible. Lo cerrado es la responsabilidad del producto
release actual: debe declarar y verificar el perfil que pretende usar.

Esta corrección elimina una ambigüedad de configuración. No demuestra por sí
sola separación de oráculo, recall blind ni generalización.

### 29.3 Baseline bootstrap sin fabricar historia

La preparación acepta ahora exactamente un modo:

- comparativo, con `--previous-artifacts-root` y los artefactos históricos
  físicos completos;
- bootstrap, con `--bootstrap-baseline` y ausencia obligatoria de evidencia
  anterior.

Los contratos de lock y baseline pasan a v2 manteniendo lectura v1. En bootstrap
los descriptores anteriores, sus hashes y `comparison.json` son `null`/ausentes;
las claims fijan que la comparación y la mejora del detector no están
disponibles. `finalize` y `verify` fallan si aparece evidencia comparativa
inesperada o si se cruzan los modos.

Esto permite avanzar sin mentir sobre los outputs eliminados. Si la próxima
ejecución termina y se verifica, será la nueva baseline autoritativa. Los números
documentados de runs anteriores pueden conservar contexto humano, pero no se
importan como evidencia firmada ni permiten calcular un delta sellado.

### 29.4 Telemetría v3

`solguard-resource-telemetry.v3` mide bajo supervisión externa:

- RSS, memoria virtual y privada del árbol;
- CPU acumulada, IO read/write y pico CPU del árbol;
- CPU y RAM del host;
- GPU Windows mediante CIM vendor-neutral, incluido AMD; NVIDIA solo mediante
  un ejecutable físico explícito, nunca por fallback de `PATH` en v3;
- VRAM observada por Ollama;
- uso, espacio libre y disponible del filesystem del run root.

El sampling de proceso y sistema tiene cadencias separadas, timers sin solape y
drain al cerrar. Cada provider se atesta por path/hash/bytes, se reatesta al
final y queda ligado al PowerShell sellado por el pre-run lock. El storage root
también queda ligado por hash. Counters regresivos, overflow, provider drift o
cobertura incompleta quedan visibles en quality/limitations o invalidan el
receipt.

La atribución se limita con precisión: CPU/RAM/IO del árbol pertenecen a la
supervisión de esos procesos; CPU/RAM del host, GPU y filesystem son
observaciones globales. El IO representa transferencia contabilizada por
proceso, no IO físico de disco.

Una sonda real de 2,5 segundos en el host Windows/AMD produjo y verificó un
receipt v3 `completed` y `complete`. Observó CPU/IO del proceso, CPU/RAM del
host, uso/utilización GPU, VRAM de Ollama y storage. Ese smoke demuestra que el
provider funciona en este host; no es una medida de rendimiento de Solguard.

### 29.5 Medición de pipeline v2

`solguard-pipeline-measurement.v2` conserva los contratos de recall conocido,
macro-recall, ruido y loss ledger, y añade:

- distribuciones R7 `min/mean/p50/p95/max` por protocolo y fase;
- protocolos, candidatos y findings soportados por hora;
- CPU e IO por protocolo completado;
- files/bytes de outputs declarados en manifests firmados;
- cobertura y calidad para proceso, host, GPU, Ollama y storage.

Los command receipts que ya han superado firma y cadena son el único origen de
los bytes/files de output. El collector reconcilia sus descriptores de
telemetría y la verificación final repite el binding. Los temporales no
declarados y el resto mutable del run root no se cuentan como output del
producto.

La precisión real permanece `null`: no existe adjudicación independiente nueva.
El proxy de bugs conocidos se conserva como proxy y advierte que un finding no
enlazado no equivale automáticamente a un falso positivo. Las nuevas medidas
operacionales solo son parcialmente comparables hasta acreditar equivalencia de
host, modelo y contención.

La baseline v2 falla cerrada si falta cobertura de CPU, IO, RAM, GPU, Ollama o
storage, si faltan manifests firmados, si no hay duraciones completas por
protocolo o si no puede derivarse la eficiencia completa. Un `null` no se
convierte en cero.

### 29.6 Orquestador de ejecución

`solguard-deploy/scripts/measurement/setup-release.ps1` consolida la secuencia
operacional:

1. reabre plan, receipt del único prebuild, paths, claves, modelo, espacio y
   repositorios limpios;
2. ejecuta los ocho canarios de forma secuencial y en roots independientes;
3. conserva cualquier fallo y no reintenta ni borra el mismo root;
4. exige los ocho estados limpios, `filter_results.json` y aceptación 8/8;
5. ejecuta `prepare --bootstrap-baseline` sin recompilar;
6. ejecuta v1-v8 con el `--parallel 8` sellado;
7. solo tras código cero vuelve a comprobar espacio y ejecuta labs;
8. solo tras ambos ejecuta `finalize` y `verify`.

`-ValidateOnly` comprueba precondiciones sin crear ni modificar roots de
evidencia canarios/release ni el acceptance. Sí puede iniciar el daemon, cargar
el modelo, comprobar red y crear logs diagnósticos no autoritativos bajo
`$CanaryBase/_runtime-logs`. Solo los canarios completos pueden reanudarse y
deben volver a pasar su validación exacta; un root release preparado o fallido
nunca se reutiliza.

### 29.7 Validación y estado pendiente

Las pruebas dirigidas de perfil, canarios, bootstrap, telemetría, medición v2,
schemas, manifests, comparación y orquestador pasan localmente. Los schemas
nuevos compilan con AJV Draft 2020-12 estricto. La suite completa de Deploy
descubrió 1.066 tests: 1.058 correctos, 0 fallos y 8 omitidos por capacidades
opcionales del host, en 130,6 segundos. La identidad del prebuild solo se
registrará después de cerrar estos commits, porque cualquier cambio tracked
posterior invalidaría esa cadena.

Siguen abiertos, sin reinterpretación optimista:

1. ejecutar el único prebuild definitivo sobre todos los repos limpios;
2. ejecutar y conservar los ocho canarios;
3. obtener aceptación 8/8 real;
4. ejecutar v1-v8 y, solo si termina limpio, los 90 labs;
5. finalizar y verificar la baseline bootstrap;
6. analizar sus cifras reales;
7. usar un replay posterior para la primera comparación criptográfica;
8. abrir en el futuro un holdout independiente.

La valoración honesta no cambia por haber mejorado la instrumentación:
Solguard está mucho mejor preparado para producir una verdad operacional
auditable, pero su calidad y velocidad actuales siguen sin estar demostradas por
esta nueva cadena hasta que termine el replay real.

## 30. Incidente real del primer prebuild: deriva del contrato TRACE

Después del commit inicial de medición se verificaron los 14 repos del plan como
limpios y se inició el prebuild definitivo. El proceso se detuvo antes de
compilar con un error de paridad física: la fuente canónica del contrato TRACE en
Core tenía 191.980 bytes, mientras que Validate y Discover tenían 191.984. El
diff mostró una única aserción formateada de modo distinto por rustfmt 2024 y
2021. La inspección completa encontró además un problema funcional más serio:
FILTER conservaba la copia anterior de 176.486 bytes y no contenía el cierre de
señales para `generic_blind`.

El gate evitó que una cadena incoherente recibiera un receipt. No se compiló ni
se ejecutó ningún canario, y el root del intento fallido queda retirado en vez de
reutilizarse.

La corrección usa una forma de código que pasa `rustfmt --check` tanto con
edición 2021 como 2024 y sincroniza byte a byte:

1. Core;
2. Validate;
3. Discover;
4. FILTER;
5. el vendor de VALUE;
6. el vendor de ECONOMIC;
7. el vendor de INVARIANT.

El prebuild se amplía para exigir esas siete identidades en cada nueva cadena y
su test altera deliberadamente un vendor para demostrar el bloqueo. Por tanto,
se cierran en la checklist los riesgos de deriva no comprobada de Validate y
FILTER. La duplicación física continúa por autonomía de build, pero ya no queda
sin una comparación automática fail-closed.

Al compilar la copia actual en FILTER, Clippy mostró otro gap: el método que
expone el `analysis_profile` verificado no era consumido por ese intake. FILTER
reconcilia ahora el perfil del receipt producer-v2 con el perfil retenido en el
índice después de verificar los primarios. Una fixture legacy de autoridad se
actualizó de forma explícita a `compatibility` y al shape actual de colecciones
de señales; no se relajó el contrato para hacerla pasar.

La validación posterior fue: contrato canónico 15/15; Validate 270/270;
Discover 243/243; FILTER 330 correctos, 0 fallos y 2 ignorados; VALUE 101/101;
ECONOMIC 83/83; INVARIANT 62/62; y 15/15 tests internos en cada uno de los tres
vendors. Los seis consumidores pasaron formato, Clippy y build release.
En ese punto, antes del addendum r3 posterior, la suite de Deploy descubrió
1.045 tests: 1.037 correctos, 0 fallos y 8 omitidos por capacidades opcionales
del host, en 129,3 segundos.
Core pasó también su suite completa: 693 correctos, 0 fallos y 2 ignorados de
695, con formato y Clippy estricto verdes.

Este incidente no aporta cifras de detección. Su valor es operacional: encontró
un defecto real antes de gastar horas en canarios o replays y convirtió una
suposición de paridad en una precondición comprobable.

## 31. Addendum r3: contexto de Ollama reproducible y fallo temprano

### 31.1 Problema observado

La preparación anterior fijaba el modelo y su manifest, pero Backend no enviaba
un `num_ctx` explícito en cada llamada a Ollama. El contexto efectivo podía
depender de cómo se hubiera iniciado el daemon. Esto era una deriva semántica:
dos scans con los mismos binarios, modelo y prompts podían no disponer de la
misma ventana de entrada.

El problema no estaba en una regla de Core y no se corrigió introduciendo lógica
de benchmark en el motor. La responsabilidad se cerró en las dos fronteras que
realmente la poseen:

- Backend configura y transmite el contexto en cada request de inferencia;
- Deploy sella, comprueba y registra el runtime usado por una medición.

### 31.2 Contrato Backend

Backend incorpora `OLLAMA_NUM_CTX` a `InternalConfig`. El valor por defecto es
`32768`; su parser solo acepta enteros decimales canónicos entre `1` y
`1048576`, y el constructor de `OllamaService` vuelve a comprobar el límite.
Cada request `/api/chat` incluye `options.num_ctx` junto a temperatura, seed y
resto de parámetros deterministas.

La validación local de Backend pasó 27/27 tests Node, incluido el body real de
la request, y 43/43 tests Rust. También pasaron formato, Clippy estricto y build
release. Esto demuestra el contrato local; no demuestra calidad de findings.

### 31.3 Política y preflight de Deploy

Los planes release/measurement incorporan el objeto cerrado
`solguard-ollama-runtime-policy.v1`:

| Campo | Valor r3 |
|---|---:|
| `context_length` | `32768` |
| `gpu_required` | `true` |
| `gpu_backend` | `vulkan` |
| `host` | `http://127.0.0.1:11435` |

La identidad semántica exacta añade:

| Variable | Valor r3 |
|---|---:|
| `OLLAMA_NUM_CTX` | `32768` |
| `OLLAMA_CONTEXT_LENGTH` | `32768` |
| `OLLAMA_NUM_PARALLEL` | `1` |
| `OLLAMA_NOPRUNE` | `true` |
| `OLLAMA_VULKAN` | `true` |

La aceptación canaria y el lock vuelven a reconciliar estos valores; no basta
con recalcular un hash sobre un contrato incoherente.

El writer canario publica `solguard-canary-release-binding.v2`, que conserva la
identidad histórica y añade `ollama_context_length` y `ollama_vulkan`. El lector
sigue aceptando la forma legacy para preservar y auditar evidencia antigua;
esa compatibilidad de lectura no la convierte en una identidad r3 ni permite
saltarse las comprobaciones del lock actual.

El orden de `setup-release.ps1` queda cerrado de este modo:

1. leer y validar plan, rutas y prebuild receipt sin ejecutar herramientas;
2. ejecutar la verificación exclusiva del receipt antes de Git, de iniciar un
   daemon Ollama gestionado o de cualquier inferencia/scan;
3. exigir que `http://127.0.0.1:11435` esté libre e iniciar siempre allí un
   daemon dedicado con el ejecutable Ollama ligado por el receipt;
4. enviar `/api/generate` con el modelo exacto y `num_ctx=32768`, un único token
   de salida y carga persistente;
5. consultar `/api/ps` y exigir exactamente una entrada del modelo solicitado,
   `context_length=32768`, tamaño positivo y residencia GPU completa mediante
   `size_vram == size`;
6. ejecutar el preflight temprano del catálogo y hacer fetch exacto,
   `rev-parse` y `fsck` de los 90 commits fijados con concurrencia máxima cuatro;
7. solo después permitir los ocho canarios y la secuencia release ya definida.

Las comprobaciones Git de limpieza se ejecutan después de
`--verify-receipt-only`. El receipt liga Node, Git, Git Bash, Ollama y
`taskkill`. El daemon y sus runners quedan contenidos por un Job Object Windows
kill-on-close, se comprueba que el listener pertenece al PID gestionado y el
puerto debe quedar libre antes de devolver exito. Si fallan operación y cleanup,
se conservan ambas causas.

El orquestador impide además que Windows suspenda el sistema durante la sección
larga y libera ese estado junto al daemon en su cleanup. El entorno sellado
declara Vulkan y la igualdad de tamaños acredita que Ollama reporta el modelo
completamente residente en GPU. No es una atestación independiente del driver,
del hardware, de la implementación interna de Vulkan o del aislamiento del
host.

La inhibición de suspensión solo vive mientras lo hace el proceso. No puede
evitar un corte eléctrico, un reinicio forzado o de Windows Update, un fallo del
driver/GPU ni una pérdida de red posterior al preflight. Por tanto reduce una
causa concreta de interrupción, pero no garantiza que una ejecución overnight
termine.

### 31.4 Telemetría runtime

`solguard-resource-telemetry.v3` conserva lectura del shape histórico para no
destruir evidencia anterior, pero una medición r3 completa debe añadir:

- `model_name`;
- `context_length` exacto `32768`;
- `model_size_bytes` positivo;
- `model_size_vram_bytes` positivo e igual al tamaño total;
- instante de observación.

`solguard-pipeline-measurement.v2` proyecta esos valores en cada resumen de
telemetría y la finalización exige un único modelo atestado de forma coherente.
Una muestra legacy puede seguir leyéndose; no puede satisfacer por sí sola la
salud de una release r3.

### 31.5 Retirada compatible de r2

El receipt `r2` no se borra. Sigue demostrando exactamente el prebuild histórico
que selló, pero no incluye el Backend actual, la nueva política runtime, las
cinco variables semánticas, el daemon dedicado receipt-bound ni la atestación de
Ollama. Por eso está retirado e incompatible con r3 y no debe usarse para
canarios, `prepare` o release.

La identidad nueva exige un root y un prebuild receipt frescos después de que
todos los repositorios implicados estén commiteados y limpios. La evidencia
histórica de r1/r2 se conserva precisamente para no reescribir los intentos
fallidos o incompatibles como si nunca hubieran ocurrido.

### 31.6 Estado factual al cerrar esta documentación

La validación local final de Deploy descubrió 1.066 tests: 1.058 pasaron, 0
fallaron y 8 quedaron omitidos por condiciones declaradas, en 130,6 segundos.
También pasaron PowerShell 5.1, `node --check` y `git diff --check`. Este dato
supera las cifras de suites anteriores documentadas en su contexto histórico;
demuestra contratos y fallos simulados del código actual, no una ejecución r3
del producto.

No se ha ejecutado ni aceptado todavía:

- el prebuild r3;
- ninguno de los ocho canarios r3 ni la aceptación 8/8;
- v1-v8 r3;
- los 90 labs r3;
- `finalize` y `verify` r3;
- un holdout independiente.

Por tanto siguen abiertas la precisión real, las métricas end-to-end, el cambio
de ruido, el recall conocido de la nueva cadena y la generalización blind. El
contrato r3 reduce una fuente concreta de deriva y mueve fallos caros al inicio;
no permite afirmar todavía que Solguard detecte más vulnerabilidades, sea más
rápido o produzca mejores findings.

## 32. Addendum factual: primer canario de la cadena `professional-r3`

### 32.1 Qué sí funcionó

El 22 de julio se publicó y verificó el prebuild receipt de la cadena
`phase1-core-20260722-professional-r3`. Selló 14 repositorios y 24 binarios. El
orquestador verificó el receipt antes de usar sus ejecutables, inició el daemon
Ollama dedicado en `127.0.0.1:11435`, observó el modelo
`qwen2.5-coder:7b` con contexto `32768` y 6.414.244.248 bytes reportados como
residentes en VRAM, y completó el preflight de los 90 commits fijados.

Estos hechos validan esa parte del arranque. No validan ningún resultado de
detección.

### 32.2 Fallo exacto

El primer canario, `v1:Compound-Finance`, se detuvo antes de MAP. El resumen
registró `duration_ms=10435`; el protocolo permaneció 863 ms en `analyze` y
terminó con `status=failed`. Backend registró exactamente:

```text
local ZIP analysis source is disabled; configure SOLGUARD_LOCAL_SOURCE_ROOTS
```

El snapshot local había sido materializado y validado: 2.624.741 bytes y
SHA-256
`79062d620e45ac2d771279aeb151be9ff8fbbfc559047965635e5e0a179ef993`.
No hubo evidencia MAP, TRACE, DISCOVER, VALIDATE o FILTER que pudiera evaluarse.
El cierre gestionado liberó la inhibición de suspensión, detuvo solo su daemon
Ollama y dejó libres los puertos gestionados.

La causa fue general: los ocho runners legacy conocían su `snapshotDir`, pero
no lo declaraban en `SOLGUARD_LOCAL_SOURCE_ROOTS`. Backend aplicó correctamente
el contrato de Core y rechazó un ZIP cuya lectura no había sido concedida. No
fue un fallo del modelo, de GPU, del prebuild, del cache del snapshot, de
Compound ni del timeout.

### 32.3 Reparación

Deploy deriva ahora una autoridad local cerrada a partir del snapshot absoluto
y normalizado de cada suite. Los runners v1-v8:

- crean físicamente ese directorio antes de iniciar Backend;
- inyectan exactamente un `SOLGUARD_LOCAL_SOURCE_ROOTS` y no heredan roots del
  entorno;
- rechazan delimitadores ambiguos, roots de filesystem y paths no canónicos;
- exigen que `/health` devuelva exactamente el mismo root;
- sellan `snapshot_dir` y `local_source_roots` dentro de la configuración del
  contrato de ejecución.

La aceptación 8/8 vuelve a comprobar ambos campos contra
`<suite-root>/snapshots`. Ausencia, roots extra, un path hermano o un prefijo
parecido fallan aunque se recalculen coherentemente los hashes internos. El
helper se integró en un componente ya sellado, por lo que la clausura legacy
permanece en 35 componentes y no hubo cambio de schema.

La validación dirigida terminó 70/70. La suite completa de Deploy descubrió
1.076 tests: 1.068 pasaron, 0 fallaron y 8 quedaron omitidos por condiciones de
plataforma, en 130,07 segundos. Esto prueba el cableado y los rechazos del
contrato; no sustituye un canario real.

El setup canónico añadió además un preflight temprano para los veintidós
endpoints loopback: benchmarks `4401-4408`/`5401-5408` y labs
`4490-4492`/`5490-5492`. Si uno está ocupado, la cadena se detiene antes de
iniciar la inferencia gestionada o crear un root canario. Las bases de los
canarios se fijan además en `4400/5400` para impedir que un entorno residual los
redirija fuera de lo comprobado. El plan debe declarar exactamente tres workers
de labs; una deriva de paralelismo se rechaza antes de confiar en ese rango.

### 32.4 Estado de evidencia

El root
`D:\SolguardCanaries\phase1-core-20260722-professional-r3\compound` y su
transcript se conservan como evidencia fallida. La identidad `r3` queda retirada
y no debe reintentarse ni reutilizarse. Monad, Size, LoopFi, Morpheus, Timeswap
y Vyper no se ejecutaron.

No existe todavía una aceptación 8/8 con la corrección, ni un nuevo replay
v1-v8, ni labs, `finalize`, `verify` o holdout. Por tanto no se afirma ninguna
mejora de recall, precisión, ruido, velocidad o generalización. El siguiente
intento debe usar commits limpios, un receipt nuevo y roots completamente
ausentes.

## 33. Addendum factual: fallo de atestación runtime en la cadena `professional-r4`

### 33.1 Alcance y primera pérdida

El 22 de julio se publicó el prebuild receipt de
`phase1-core-20260722-professional-r4`. El documento selló 14 repositorios y
24 binarios. Su SHA-256 de archivo fue
`e0347fba149e6d32a4ea515ba364d90a61aed6d2fa92fe9aa547b2c58bb305e0` y su
identidad interna fue
`248debae47c719af76b70ced3fd39a78b2748f9d557db4ea6f79b07803d51718`.

El primer canario, `v1:Compound-Finance`, materializó y validó el snapshot,
construyó el contrato de ejecución e inició tanto el nodo Bun en
`127.0.0.1:4401` como Backend en `127.0.0.1:5401`. Se detuvo tras 6.823 ms
(6,823 segundos) con:

```text
Managed backend runtime attestation mismatch
```

El fallo ocurrió dentro de `backend.start()`, antes de `preflightModel()` y
antes del bucle de protocolos. `protocols` quedó vacío y no se generó ningún
artefacto MAP, TRACE, DISCOVER, ECONOMIC, VALUE, INVARIANT, VALIDATE o FILTER.
Por tanto no fue un fallo de detección de Compound ni produjo evidencia con la
que evaluar el pipeline analítico.

### 33.2 Causa reproducida

La causa se reprodujo contra un Backend real y aislado. En Windows, Backend
canoniza los paths existentes y puede devolver una ruta física con namespace
verbatim, por ejemplo `\\?\C:\...\snapshots`, y expandir un alias corto 8.3.
El runner comparaba ese valor con la forma léxica configurada, por ejemplo
`C:\Users\ROGERG~1\...\snapshots`. Ambas formas podían identificar el mismo
directorio físico, pero el helper nuevo de `local_source_roots` usaba
`path.resolve` y comparación textual. El binario Backend y el hash del contrato
de ejecución sí coincidían; la atestación se rechazó por la representación del
path.

El error fue contractual y general para paths Windows existentes. No fue una
adaptación a Compound ni a una vulnerabilidad conocida. El root r4 por sí solo
no conservó el campo discrepante porque el runner de esa identidad emitía un
mensaje genérico; la causa concreta se obtuvo mediante la reproducción real
posterior.

### 33.3 Corrección contractual y cierre del hueco de integración

Deploy centraliza ahora la atestación de Backend en un evaluador compartido por
los runners v1-v8 y labs. La comparación live de roots locales exige que los
paths existan y compara su identidad física canonizada con
`realpathSync.native`. La verificación offline conserva comparación léxica por
defecto para poder validar receipts históricos sin reinterpretar su evidencia.

El evaluador comprueba los hashes esperados, los trece paths runtime de las
herramientas y exactamente un local source root. Ante un rechazo devuelve solo
los nombres allowlisted de los campos que no coinciden; no vuelca valores,
tokens ni secretos. Este evaluador forma parte de la clausura sellada del
contrato, que pasa a 36 componentes (25 módulos JavaScript alcanzables y 11
recursos corpus/runtime) sin cambiar de schema. Una modificación futura cambia
así la identidad de ejecución en lugar de quedar fuera del fingerprint.

Se añadió además un smoke test que inicia los procesos reales Bun y Backend en
un entorno temporal aislado, sin lanzar un scan ni consultar el modelo. El
smoke verifica:

- que la salud pública y una credencial incorrecta no expongan la atestación;
- que la salud autenticada coincida en servicio, binario, contrato y los
  catorce paths runtime observados;
- que el proceso gestionado, sus puertos y el directorio temporal se limpien
  tanto al terminar como al fallar.

El prebuild ejecuta obligatoriamente ese smoke antes de publicar el receipt.
El setup vuelve a ejecutarlo después de verificar el receipt y antes de iniciar
Ollama. No existe una opción productiva para omitirlo. Así, un desacuerdo entre
la configuración del runner y la respuesta real de Backend debe fallar antes de
crear un root canario o consumir horas de inferencia.

### 33.4 Validaciones realizadas

La suite completa final de Deploy descubrió 1.082 tests: 1.074 pasaron, 0
fallaron y 8 quedaron omitidos por condiciones declaradas, en 131,5995386
segundos. Incluyó la prueba de cierre de un descendiente después de morir su
launcher.

El smoke final con Bun y Backend reales terminó correctamente en 815 ms y verificó
los 14 paths runtime. Tras la prueba quedaron libres sus puertos y no quedó el
directorio temporal. Estas comprobaciones validan el comparador, la
autenticación, el cableado de procesos y el cleanup del arranque actual. No son
un benchmark ni miden la calidad de detección.

### 33.5 Límites y estado de r4

No se ha ejecutado ningún canario nuevo con esta corrección. Tampoco se han
ejecutado una aceptación 8/8, v1-v8, los 90 labs, `finalize`, `verify` ni un
holdout independiente. En consecuencia, estos cambios no demuestran recall,
precisión, reducción de ruido, rendimiento end-to-end ni generalización blind.

El root
`D:\SolguardCanaries\phase1-core-20260722-professional-r4\compound` se conserva
como evidencia fallida. Los otros siete roots canarios, la aceptación 8/8 y el
root release r4 no llegaron a crearse. La identidad r4 está consumida y no debe
reintentarse, borrarse ni reutilizarse. Un nuevo intento requiere commits
limpios, un prebuild receipt nuevo y roots completamente ausentes.
