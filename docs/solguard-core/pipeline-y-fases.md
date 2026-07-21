# Pipeline, fases y artefactos

Cada analisis crea o reutiliza un proyecto, resuelve el target y avanza mediante
`PipelineJournal` en el orden exacto de `pipeline.v0.10`:

```text
map -> diff -> trace -> discover -> economic -> value -> invariant
    -> candidates -> validate -> filter -> historical-enrichment
    -> impact -> poc-plan -> exploit -> report
```

El journal global vive en `tool-outputs/pipeline.json`. Cada entrada usa
`pipeline_phase.v0.10`; una herramienta puede conservar su receipt propio como
`tool_phase.json` mientras `phase.json` representa la orquestacion.

## Estados

- `completed`: ejecucion y outputs requeridos coherentes.
- `degraded`: salida util con una degradacion registrada.
- `completed_with_errors`: termino con errores conservados para diagnostico.
- `fallback`: core escribio un contrato tipado de contingencia.
- `skipped`: la politica de ejecucion omitio la fase.

Estos estados no son veredictos de seguridad. La autoridad de findings es
`validation_results.json`.

## Frontera de source ZIP

Antes de extraer source, Core inventaria y valida el ZIP completo sin escribir
en el destino final. Los archivos y directorios regulares se conservan; un
symlink ZIP solo puede apuntar, mediante un path POSIX UTF-8/NFC canonico, a un
archivo o directorio existente del mismo archive. Se rechazan paths absolutos,
drives, backslashes, NUL, escapes, targets dangling, ciclos, colisiones, tipos
especiales y cualquier presupuesto excedido. Un link interno seguro se copia en
staging como archivos/directorios regulares, nunca como symlink host. Solo un
plan totalmente cerrado se renombra al output final; un error deja ese output
ausente.

El ZIP fisico debe ser regular y single-link y no puede superar 256 MiB. Core
cobra antes de asignar dos presupuestos independientes de 64 MiB: trabajo y
paths del inventario, y paths retenidos por el plan materializado. Cada entry
regular queda limitada a 64 MiB y el payload declarado y expandido a 1 GiB. Los
permisos publicados son owner-safe para que modos 000 o bits especiales no
oculten source ni impidan limpiar staging.

Todo ZIP orquestado exige `solguard-source-authority-handoff.v1`: el hash y los
bytes del transporte se verifican sobre el mismo handle usado para extraer, y
el digest `solguard-materialized-source-tree.v1` se recompone sobre el arbol
regular publicado. Directorios locales y targets Git rechazan el handoff. Los
nombres reservados de dispositivo en Windows se conservan literalmente y solo
se abren mediante una raiz verbatim despues de superar traversal, colisiones y
presupuestos; no se renombran ni se excluyen.

Un lease OS exclusivo por proyecto empieza antes de mutar su arbol y se
mantiene mediante `AnalysisResponseLease` hasta que la respuesta HTTP termina
de serializarse. Antes y despues de MAP, TRACE y FILTER, Core rehashea la fuente
y exige la cadena `solguard-source-integrity-stage-receipt.v1`: TRACE liga el
receipt MAP y FILTER liga el receipt TRACE. Core publica tambien un receipt
independiente por frontera en `tool-outputs/source/`. Un upstream ausente, stale
o sustituido y cualquier drift del arbol fallan cerrados. Vease
[Integridad de fuentes](./integridad-de-fuentes.md).

## Frontera comun de artefactos

El umbral de observabilidad inline de Core es 96 MiB, no una frontera de
validez. MAP, ECONOMIC, VALUE e INVARIANT publican sidecars compactos ligados al
primario por productor, kind, basename, schema, bytes y SHA-256. Por encima del
umbral, Core recorre y hashea el primario completo y consume solo la proyeccion
contratada; por debajo, el primario sigue siendo la autoridad. El gate de
Deploy conserva un limite inline de 100 MiB y aplica el mismo parser JSON
estricto a ambos lados: UTF-8 invalido, claves duplicadas, JSON truncado o con
datos posteriores, links, escapes, sustitucion fisica y TOCTOU fallan cerrados.
DISCOVER usa un contrato distinto: `coverage_contract.json` con schema
`discover_coverage_contract.v1` es obligatorio por debajo y por encima del
umbral. TRACE no publica un sidecar semantico y se proyecta directamente desde
cada primario. Para un primario grande, el gate recompone la proyeccion de MAP,
DISCOVER, ECONOMIC, VALUE o INVARIANT y exige igualdad exacta con el contrato
productor que corresponda; ningun sidecar o coverage contract sustituye
semantica que no pueda derivarse del primario. Sus lectores tienen un maximo de
100 MiB y MAP reserva como maximo 64 MiB a su manifiesto de clausuras.

La lectura TRACE de Core es una proyeccion tipada streaming, no una carga raw
del JSON completo. El reader hashea todos los bytes, deja que serde descarte los
campos ajenos al consumidor y solo materializa la vista requerida, con un techo
independiente de 64 MiB. Conserva bytes/SHA-256 del primario como autoridad y
revalida root/path canonicos, metadata e identidad fisica antes y despues. Asi
un `trace.v0.9` por encima de 100 MiB sigue siendo consumible sin sidecar
semantico; overflow de la vista, link, escape, sustitucion o drift TOCTOU fallan
cerrados.

Cada lectura estricta queda ligada a un descriptor regular y a su identidad
fisica, con techo de bytes y comprobaciones antes y despues de EOF. Core exige
que el path y el `tool-outputs` root sigan resolviendo al mismo objeto dentro del
project root; rechaza symlinks, reparse points, escapes y path swaps. La clausura
de companions TRACE usada por FILTER rechaza ademas hard links no unicos. Un
tamano o mtime estable no basta: cualquier sustitucion concurrente, hash stale,
sidecar sobredimensionado o root mutado falla cerrado.

Los sidecars preservan observabilidad y cobertura, no contenido de evidencia.
No pueden crear una ruta, equation, transition, invariante ni finding que no
este en el primario autoritativo.

`invariant.bounded_runtime.v1` no es uno de esos sidecars de 100 MiB. Es el
input runtime tipado de VALIDATE/FILTER: los objetos seleccionados tienen un
presupuesto de 256 MiB, mientras el sobre JSON completo tiene el cap separado
de 335.544.320 bytes y declara obligatoriamente
`summary.max_runtime_artifact_bytes=335544320`. El productor comprueba el sobre
serializado antes de escribirlo y cada consumidor comprueba el tamano fisico
antes de una lectura completa.

## Fases de evidencia

### MAP

Ejecuta `solguard-map` y genera el mapa del codigo. A partir de 150 archivos
fuente soportados usa el modo rapido; si el modo profundo excede su ventana,
reintenta de forma acotada y registra la degradacion.

MAP publica `economic_flow_coverage.v1`, `economic_route_graph.v1` con su
`economic_route_graph_coverage.v1`, y `map_collection_coverage.v1` dentro
de `audit_map.json`. Los recibos separan identidades semanticas unicas de
duplicados colapsados y registran limites de rutas, steps, flows, dependencias y
grafos. Un duplicado exacto no crea deuda; una identidad unica omitida, una ruta
incompleta o un limite alcanzado si. Core trata un recibo ausente, malformado o
con `coverage_debt` como degradacion bloqueante, no como evidencia negativa.

Para repositorios con Python productivo, Core no confia solo en la lista de
lenguajes declarada por MAP. Recorre de forma acotada el source root, ignora
symlinks y nombres convencionales de test, identifica cada `.py` que declara
una funcion y exige que aparezca en las identidades `functions` del MAP. Un
fichero productivo ausente, no UTF-8 o por encima del limite de intake invalida
MAP. El mismo control se reaplica antes de aceptar los outputs TRACE y DISCOVER,
de modo que una fase downstream no pueda lavar una ingestion Python incompleta.
Este contrato garantiza presencia estructural; no afirma por si solo cobertura
semantica total ni deteccion de vulnerabilidades Python.

MAP escribe ademas `audit_map.coverage.json` bajo
`solguard-coverage-manifest.v1`. El sidecar liga nombre, schema, bytes y SHA-256
de `audit_map.json` y conserva copias exactas de los tres ledgers. Core solo usa
esta proyeccion si el primario supera su limite de observabilidad; un sidecar
ausente, stale, symlinked o con hash divergente hace fallar la fase. La
proyeccion incluye ademas audit summary, resolucion de graph edges y salud
runtime de flujos y del route graph; Core valida sus campos cerrados y coherencia aritmetica antes
de conservar esos contadores en `analysis_funnel.v1`.

Las rutas economicas deduplican identidades antes del presupuesto. Cada
entrypoint prueba primero 64 rutas y recupera de forma adaptativa hasta el hard
cap 256 solo si existe una identidad adicional; los limites de 128 steps por
ruta, 4096 flows y 32768 steps globales permanecen fail-closed. El dispatch
generico respeta el componente de receivers tipados y acota `self.metodo(...)`
de Vyper al caller. Un destino tipado ausente queda externo/dinamico, no se
expande por homonimos globales.

El route graph es la autoridad no enumerativa para consumidores nuevos. Sus
roots retienen clausuras transitivas completas de fragments, choices, events y
call alternatives; los digests son content-addressed y los caps nunca dejan
media clausura como sana. Cada root solo es valida si su
`entrypoint_symbol_id` coincide con el `symbol_id` del fragment señalado por su
propio `fragment_id`; una root re-sellada contra el fragment de otra funcion
falla cerrada. `over_approximation` conserva el espacio may, pero no
autoriza ausencia o proof exacto. `economic_flows` permanece como witness
lineal compatible y no sustituye al grafo.

Para MAP oversized, el sidecar incluye
`economic_route_graph_closure_manifest.v1`: versiones/digest/cobertura del
grafo, roots con su fragment inicial y fragments con hijos y contadores exactos.
Core valida su `manifest_digest` content-addressed y recorre unicamente los
roots requeridos mas sus hijos transitivos deduplicados. La resolucion es local
a esa clausura: un root exacto no hereda la over-approximation de otro root no
seleccionado. Cobertura completa y semantica MAY son ejes independientes; MAY no
es deuda si no hubo omision, pero nunca autoriza exactitud o MUST.

El mismo sidecar conserva `map_function_identity_manifest.v1`: la proyeccion
canonica y unica de
`{function_id,symbol_id,qualified_name,component,file,start_line}` para resolver
targets TRACE contra MAP sin materializar el primario completo en memoria. Sus
limites son 100.000 funciones y 24 MiB compactos; cualquier omision o colision
es deuda y bloquea autoridad exacta. En release, el gate no confia en esa copia
por si sola: para un MAP mayor de 100 MiB recalcula en streaming desde el
primario el resumen y los ledgers/manifiestos y exige igualdad exacta con el
sidecar hash-bound. Esto detecta sidecars semanticamente forjados aunque el hash
de primario declarado sea correcto.

La deuda de `economic_flow_coverage.v1` bloquea product health aunque todos los
demas ledgers esten completos. El contador runtime `partial` permanece en un
eje separado de incertidumbre semantica: nunca se suma ni se oculta como deuda
de presupuesto, pero tampoco se interpreta como exactitud.

### DIFF

Obtiene contexto de cambios cuando el target conserva historia Git. Un ZIP sin
historia puede omitir la fase sin invalidar el resto del analisis.

### TRACE

Prioriza flujos de estado desde MAP. Sus limites publicos son
`SOLGUARD_TRACE_MAX_TARGETS`, `SOLGUARD_TRACE_MAX_DEPTH`,
`SOLGUARD_TRACE_MAX_PATH_EXPANSIONS` y `SOLGUARD_TRACE_MAX_DEEP_PATHS`.
Core pasa los cuatro límites a TRACE y conserva su configuración efectiva en
los artefactos. Una ejecución sin metadata válida, con valores contradictorios
entre targets o con truncado se refleja como deuda explícita en
`analysis_funnel.json`; no se interpreta como cobertura completa.

El MAP fisico de TRACE tiene un cap independiente de 256 MiB, con 192 MiB de
presupuesto acumulado para datos retenidos y 8 MiB por string o miembro de
array retenido. TRACE comprueba el tamano antes del hash y hace el preflight y
la proyeccion sobre el mismo handle estable. No son los limites de
observabilidad inline de Core/Deploy.

La seleccion batch vacia permanece fail-closed por defecto. Solo la invocacion
orquestada con `--allow-empty-batch-targets` puede escribir un `index.json`
valido con `selection.status=empty_allowed` y el coverage gap
`empty_reason=no_targets_requested` o `all_targets_rejected`. Ese contrato
preserva el fallo de cobertura; no afirma que no exista un bug.

Todo batch actual sella `trace.batch_selection.v3`; v1 y v2 quedan como lectura
diagnostica no apta para FILTER limpio ni release. V3 liga el SHA-256 fisico de
MAP, el universo completo de identidades objetivo, duplicados exactos, outcomes,
orden elegible, seleccion fisica completa, filtros y SHA-256 source. Core,
DISCOVER, VALIDATE, FILTER y Deploy recomponen la autoridad desde MAP, source e
indice fisicos, incluido cuando MAP supera 100 MiB y se proyecta por streaming.

`top` ya no recorta la cobertura fisica. Limita solo el prefijo sellado
`trace.batch_deep_enrichment.v1`; todos los elegibles restantes producen un
primario compacto. Cada target e informe ligan modo y rank mediante
`trace.batch_target_enrichment.v1`. Su clasificacion
`bounded_non_authoritative` impide que una omision profunda compacta se convierta
en deuda fisica/semantica, evidencia de ausencia o resultado negativo. V3
prohibe `target_budget_omitted`; los gaps fisicos describen solo rechazos reales
anteriores a la elegibilidad.

Los filtros cerrados son `levels`, `top`, `include_tests` y
`max_binding_source_bytes`. Cada consumidor
rederiva la elegibilidad de source —incluida la politica production/test y la
excepcion Vyper `examples/` solo para una declaracion exacta `@external`—, el
motivo de cada omision y `priority_diversity_total_order_v1`. Un motivo
autosellado por el productor o un cambio de orden no constituye autoridad.

El indice batch usa `trace.batch_index.v1`: inventaria exactamente cada
`trace.v0.9`, su ruta relativa segura, rank continuo y companions. VALIDATE y
FILTER ligan el mismo `trace:index.json` por SHA-256, pero el indice sigue siendo
metadata: no cuenta como evidencia de un candidato. Un batch `empty_allowed`
fuerza resultados inconclusos.

Prebuild materializa una autoridad single-link del binario release
`solguard-trace-evidence-verify`. Despues de TRACE, Core verifica sus bytes y
SHA-256, crea con `create_new` una copia privada single-link por analisis bajo
`trace/.runtime-tools` y publica de forma create-only
`trace/evidence_verification.json`. La policy
`physical_map_source_exact_evidence_multiset_v1` reabre MAP y source, reproduce
la seleccion v3 completa y exige igualdad exacta de target y multiset de
evidencia para todos los lenguajes. El receipt liga index, MAP, cada descriptor,
source, primario TRACE, conteos/digests de evidencia y binding nativo mediante
roles relocatables y un digest con framing fuerte. Core pasa esa misma copia
privada a FILTER; FILTER la ejecuta otra vez desde un entorno vacio y scratch
privado y compara receipt fresco, stdout y autoridad adyacente byte a byte. El
receipt y stdout estan limitados inclusivamente a 64 MiB antes de leer, hashear
o publicar. Hardlinks, symlinks, junctions/reparse points, sustituciones y drift
TOCTOU fallan cerrados. El receipt adyacente por si solo nunca autoriza una
decision.

El indice actual incorpora siempre `trace.contract_manifest.v1`. Contiene un
binding ordenado por cada target con path, bytes/SHA-256 exactos, coverage ledger
y receipt del route graph, ambos con digest canonico. Su agregado reconcilia
target count, deuda y union de roots; el `manifest_digest` usa el namespace
content-addressed `trace-contract-manifest-v1`. Core lee en streaming cada primario una
vez, compara los contratos inline y recalcula tanto el digest como los
agregados. Un binding ausente/extra/intercambiado o una proyeccion forjada falla
antes de CANDIDATES, VALIDATE o FILTER.

Cada primario TRACE identifica su target mediante
`{id,qualified_name,component,file,line_start}` y esa identidad debe resolver
una unica funcion exacta del primario MAP y de su manifiesto completo.
`solguard_map_context` es opcional y solo corrobora: su ausencia no invalida una
resolucion primaria exacta, pero cualquier `function_id` o inventario declarado
debe coincidir byte por byte con MAP. Un contexto forjado, un componente vacio
o una identidad duplicada deja la autoridad en Review. Los primarios TRACE
mayores de 100 MiB se recorren y hashean desde un unico descriptor con el mismo
contrato; el tamano nunca los excluye silenciosamente del inventario de
autoridad.

Cada coleccion TRACE acotada conserva un receipt tipado unico por
`{producer,collection}` con conteos observados, retenidos y omitidos, limite
activo y politica de seleccion determinista. La aritmetica debe cerrar y
`truncated` solo puede ser true cuando existe omision. Salvo las cuatro
linearizaciones legacy clasificadas bajo la autoridad factorada descrita abajo,
una omision permanece `coverage_debt`; Core no acepta truncados silenciosos ni
recorridos de profundidad fija como cobertura completa.

Cuando existe autoridad factorada completa, sin deuda y con roots no vacios,
TRACE separa la linearizacion legacy solo si `factorized_graph_evaluations`
incluye ambos receipts `trace.factorized_graph_evaluation.v1`: perfiles
`causal.factorized_structure_and_guard_lattice.v1` y
`economic.factorized_operation_consistency.v1`. Core recompone cada evaluacion
desde el graph receipt y exige igualdad de `graph_digest`, proyeccion,
`root_ids`, inventarios, contadores y digests, sin omisiones ni debt. Su
`semantic_authority` liga graph receipt, ambos consumers y
`trace.v0.9.target_evidence`. Con esa autoridad TRACE separa la linearizacion legacy
de deep paths como `trace.materialization_diagnostics.v1` no autoritativo y
publica `trace.materialization_manifest.v1`. Este segundo manifiesto no cubre
todos los targets: debe ser exactamente el subset que contiene esos
diagnosticos, ligado a los mismos bytes primarios del manifiesto all-target. Sin
clausura completa, ambas evaluaciones completas y debt-free, esos receipts
permanecen cobertura semantica normal y sus omisiones degradan la fase. Una clausura
`semantic_resolution=over_approximation` puede cerrar el espacio MAY y usar el
manifiesto, pero nunca prueba exactitud, MUST ni ausencia.

TRACE valida el route graph y publica en cada target un recibo
`economic_route_graph_consumption.v1` de clausura; el indice publica la union
deduplicada. Su digest y deuda upstream deben coincidir con MAP y cualquier
omision local queda separada. Un target sin root publica un recibo vacio
explicito.

Para Vyper, `vyper_source_evidence.v1` localiza entrypoint, guards, reads/writes
`self.*`, llamadas, transferencias/creacion y eventos `log`. Un evento conserva
su evidencia source-local, pero no se clasifica como escritura economica ni como
movimiento de valor. Una ruta bajo un unico segmento
`example`/`examples` solo es elegible si es `.vy`, MAP marca el entrypoint, el
archivo canonico queda dentro del root y nombre/linea declaran `@external`.
Tests, fixtures, mocks, vendor y generated siguen excluidos.

TRACE puede publicar `trace.actor_authorization_binding.v1` para una ruta
source-backed completa que relaciona caller, subject, allowance owner/spender,
amount, recipient y efectos de estado/valor. Solo un binding `resolved` y
`violated` con la regla
`authorization.caller_must_match_subject_or_allowance_spender` entra en la
cadena tipada posterior; bindings satisfechos o incompletos no son candidatos.

### DISCOVER

Genera `protocol_model.json`, `coverage_contract.json` e `index.json` con superficies, capacidades,
rutas, gaps e hipotesis estructuradas. Durante CANDIDATES, core construye
ademas `model_discovery_packs.v2`: capsulas source-grounded, open-world y
target-scoped con hasta doce aristas resueltas conectadas al target. El modelo
responde con `model_discovery_candidate.v2`, que solo contiene semantica e IDs
de superficies.

El presupuesto de aristas preserva ambos lados causales: intercala relaciones
directas entrantes hacia el root/target y salientes hacia el impact antes de
expandir el resto del grafo conectado. Si TRACE no ofrece ningun target
source-backed utilizable, core crea un pool acotado desde simbolos function-like
de MAP, prioriza entrypoints externos/de valor y excluye tests, mocks, fixtures,
vendor y `node_modules`. Este fallback se identifica como
`trace.model_discovery_map_fallback.v1` con
`coverage_gap=trace_targets_unavailable`.

Core reconstruye ubicaciones, ruta y evidencia desde el pack; el modelo no es
autoridad para esos campos. Una hipotesis sin invariant tipado y ruta
autoritativa con evidencia permanece como lead exploratorio y no llega a
VALIDATE. La misma regla se aplica a toda capsula MAP-fallback: es degradada y
open-world, nunca autoridad de validacion.

DISCOVER prioriza bindings TRACE tipados antes del cap final de hipotesis y
excluye de la mineria de intent tanto documentos de issues/vulnerabilidades
conocidas como las lineas que los citan. Para la regla de autorizacion por actor
emite una ruta, regla, gap e hipotesis exactas; INVARIANT la materializa como
`permission_freshness` con predicado `actor_authorization_binding`, y VALIDATE
solo la soporta si regla, scope, superficies y procedencia TRACE reconcilian de
forma exacta.

DISCOVER consume el MAP requerido mediante `map.semantic_projection.v1`: lee y
hashea el archivo completo, retiene solo sus 35 campos semanticos y conserva las
deudas `map_collection_coverage.v1` y `economic_flow_coverage.v1` en
`metadata.resource_usage` y diagnosticos. El hard cap raw es 256 MiB y la
estimacion estructural por defecto 1 GiB; esta ultima no es un cap RSS. Un MAP
invalido, inestable o fuera de presupuesto falla cerrado. El cierre de rutas
usa BFS por estado semantico, conserva el testigo canonico mas corto, colapsa
ciclos/alternativas dominadas y termina edges ambiguos como rutas parciales. Las
rutas emiten incrementalmente hacia colecciones deduplicadas y acotadas por
bytes e items, sin materializar primero el espacio completo. El deadline cooperativo,
una omision demostrada o una etapa no iniciada producen degradacion explicita.

`discover_coverage_contract.v1` liga el modelo por schema, bytes y SHA-256 y
proyecta exactamente summary, resource usage, diagnosticos y un enum ordenado de
causas. Core lo exige aun bajo su limite inline de 96 MiB y lo usa como
proyeccion verificable por encima; cobertura MAP `unknown`, omisiones, contadores
incoherentes o razones que no puedan recomputarse fallan cerrados.

DISCOVER consume el route graph completo como world model factorado y publica
un receipt full-graph tanto en el primario como en su coverage contract. Una
alternativa may genera evidencia requerida e hipotesis, nunca un binding
exacto por similitud ni una expansion cartesiana.

### ECONOMIC

Modela activos, shares, deuda, collateral, rewards, fees, oraculos y reservas.
Produce `economic_model.json`, `synthesized_invariants.json` e `index.json`.
Tras candidatos puede ejecutar el pase aditivo y acotado de evidencia economica
sin reemplazar el modelo inicial cuando ese pase falla.

Los primarios se serializan de forma compacta y streaming. Los sidecars
`economic_model.coverage.json` y `synthesized_invariants.coverage.json` ligan
bytes/SHA-256 y publican un runtime summary acotado, incluida degradacion y
diagnosticos priorizados. Ambos primarios y ambos sidecars conservan ademas el
contrato exacto `economic_collection_coverage.v1`: budgets unicos y ordenados
por productor/coleccion reconcilian observados, duplicados colapsados, total,
retenidos, omitidos y bytes compactos. El ledger sintetizado debe contener cada
budget exacto del modelo. La deuda honesta degrada product health; aritmetica
incoherente, deuda escondida o sustitucion falla cerrada. Los sidecars son
observabilidad operacional y nunca reemplazan una ecuacion, transition o
invariante del primario.

ECONOMIC razona may/must directamente sobre roots/fragments y publica el mismo
receipt full-graph en modelo y sintetizado. Ambos sidecars proyectan literalmente
route coverage y consumption. El output sintetizado debe preservar esos
contratos exactos; un must no puede atravesar una alternativa incierta.

Cuando MAP/TRACE declaran `economic_flow_identity.v2`, ECONOMIC conserva flow
ID, route digest, operaciones, aristas y asset legs en sus transitions, y
publica el mismo par singleton en `flow_route_bindings` de equations y scopes
de invariantes. Un flow ID explícito solo se resuelve por coincidencia exacta;
una ruta legacy o un binding fuzzy no se presenta como transition concreta.
La relación `actual_received_covers_credited_amount` exige una recepción o
transferencia aplicable además del target acreditado. Una ruta solo contable no
se eleva a concreta. La inferencia nativa queda limitada a una función payable
única con evidencia localizada de `msg.value` (o `value` Vyper no sombreado).
Para receipts no nativos, el consumidor exige transferencia y productor
source-backed en la misma ruta; `internal_token`, metadata declarativa y stage
debt no autorizan una transición concreta.

### VALUE

Construye `value_model.json`, `attack_paths.json` y evidencia de rutas de valor.
Sus proofs pueden reforzar causalidad economica, pero no confirmar por si solos
un finding. VALUE no consume ground truth ni calcula overlap. El productor y
los fallbacks v1 de core siguen serializando
`top20_ground_truth_overlap=0` solo como placeholder deprecated de
compatibilidad. Core no lo consume, no lo usa como metrica y lo excluye de
`analysis_funnel.json`; se eliminara en v2. Las metricas reales del evaluator
permanecen fuera del pipeline de producto.

VALUE puede ejecutarse una segunda vez dentro del cierre de candidatos como
`candidate_value`. Esa pasada consume `solguard-value-proof-requests.v1`
`query_only`, con un maximo de 128 consultas y referencias independientes
MAP/TRACE, y produce `solguard-value-proof-responses.v1`. Solo una respuesta
`complete`, `map_trace_reverified`, sin autocorroboracion, con todas las
identidades y obligaciones exactas y proof `validate_consumable` puede aplicarse
a la vista efectiva. Las respuestas parciales permanecen fuera de VALIDATE.
La independencia excluye cualquier evidence ID MAP relabelado por TRACE, y la
obligacion de invariante exige un ID exacto cuyo scope autoritativo este ligado
al mismo flow ID y route digest.

El ensamblado `economic_flow_identity.v2` conserva el ID content-addressed
creado por MAP y une TRACE/ECONOMIC mediante ID y digest exactos. Una request
puede señalar una ruta v2 única MAP+TRACE aunque no exista en el frontier
rankeado base;
VALUE busca sobre sus paths pre-ranking. Core solo acepta el path nuevo si
revalida atómicamente flow ID, digest, ordered sequence, superficies, claims y
evidence refs sin duplicados. Los flows legacy y los conflictos de ensamblado
permanecen no consumibles.

Los cuatro outputs base repiten el mismo ledger
`solguard-value-budget.v1`. Debe ser semanticamente identico y declarar
limites, cardinalidades observadas/retenidas y deuda agregada. Un ledger
ausente, divergente o malformado es error; `status=coverage_debt` degrada la
fase y bloquea release. Una ruta v2 completa se materializa entera o se difiere
entera con secuencia vacia, `route_complete=false` y sin digest verificado;
VALUE nunca publica un prefijo con la identidad autoritativa original.

Cada primario VALUE tiene un sidecar adyacente hash-bound con el ledger exacto.
El sidecar incluye tambien el summary tipado exacto del primario, de modo que
la observabilidad conserva cardinalidades y ratios aun cuando el JSON supera
el umbral inline del consumidor.
La proyeccion de `value_model.json` enumera por separado flows con deuda y flows
con contrato de materializacion invalido; la de `attack_paths.json` enumera
proofs invalidos, incluidos los que declaran completitud sobre un flow
incompleto. Las otras dos proyecciones declaran `not_applicable.v1`. Los conteos
y los IDs ordenados deben reconciliar exactamente: deuda valida no se confunde
con invalidez. Primarios y sidecars se publican de forma atomica y create-only;
un destino ya existente obliga a usar un root nuevo. El gate de deploy solo
consume esa proyeccion si el primario supera 100 MiB; por debajo del limite
manda el documento primario.

`value_model.json` conserva el route graph validado y un receipt full-graph
ligado al mismo digest de MAP. Cuando se usa el sidecar, conserva ese receipt en
`summary.economic_route_graph_consumption`. VALUE puede usar regiones may como
leads, pero no cerrar sobre ellas un proof completo.

### INVARIANT

Combina MAP, TRACE, modelos economicos y VALUE. Core conserva dos roots
permanentes y separados: la pasada inicial en
`tool-outputs/invariant/invariants.json` y el refinement ligado a candidatos en
`tool-outputs/invariant-candidate/invariants.json`. La segunda pasada nunca
reutiliza, mueve ni sobrescribe el bundle inicial.

Cada bundle del productor contiene exactamente `invariants.json`,
`invariants.coverage.json`, `invariants.md` y `summary.txt` en el instante de
publicacion. `solguard-invariant` construye los cuatro archivos en un directorio
staging hermano y publica el bundle completo mediante un unico rename
create-only. Si el root final ya existe, incluso vacio o incompleto, la
publicacion falla cerrada y conserva sus bytes; no mezcla una ejecucion nueva
con residuos. Antes de seleccionar el bundle candidato, Core rechaza cualquier
archivo de productor adicional o ausente.

`invariants.coverage.json` liga el primario, su `stage_coverage.v1` y los
conteos materializados. Si Core genera `invariant.bounded_runtime.v1` para
transporte, esa vista declara path, bytes, SHA-256 y schema del
`invariant.v0.8` original, contadores exactos y la politica
`candidate_attack_path_anchor_score_v1`. Conserva como maximo 8.192 objetos y
256 MiB de serializacion de invariantes retenidas; cada objeto retenido es el
objeto source completo, no una proyeccion semantica recortada. El runtime sella
`invariant.selection_manifest.v1`, calculado desde el primario y el
`value/attack_paths.json` fisicos: inventarios de invariantes/relaciones,
endpoints, anchors, ranking, orden, hashes, limites, seleccion y omisiones. Las
relaciones cuyos dos extremos estan retenidos se recuperan tambien desde el
primario y participan en el limite conjunto que determina
`retained_objects_verified`; no se confia en relaciones compactas. Cualquier
anchor omitido impide autorizacion terminal. El fichero bounded completo no puede superar
335.544.320 bytes y debe publicar
`summary.max_runtime_artifact_bytes=335544320`.

Tras validar el bundle candidato in place, Core escribe una sola vez
`tool-outputs/invariant-selection.json`. El objeto tiene exactamente este
contrato:

```json
{
    "schema_version": "invariant.selection.v1",
    "tool_version": "0.10.0",
    "reason": "candidate_enriched",
    "initial": {
        "primary_path": "invariant/invariants.json",
        "sha256": "<sha256-inicial>"
    },
    "selected": {
        "primary_path": "invariant-candidate/invariants.json",
        "sha256": "<sha256-candidato>"
    },
    "candidate_attempt": {
        "status": "selected",
        "primary_path": "invariant-candidate/invariants.json",
        "sha256": "<sha256-candidato>",
        "error": null
    }
}
```

El unico estado alternativo coherente usa `reason=initial_fallback`, conserva
`selected` identico a `initial` y exige
`candidate_attempt.status=failed`, `candidate_attempt.sha256=null` y un
`candidate_attempt.error` no vacio. No se admiten campos adicionales ni otras
combinaciones. Los paths son relativos a `tool-outputs`, usan `/` y cada hash se
recalcula contra el primario regular del root permanente declarado.

Antes de seleccionar el refinement, Core exige el bundle exacto, el binding
primario/coverage, cobertura completa sin deuda y la capability
`candidate_derived_invariants` ligada por SHA-256 a
`candidates:0` (`raw_candidates.json`). CANDIDATES, VALIDATE, FILTER, el funnel y
`AnalyzeOutputs.invariant_dir` consumen exactamente el bundle `selected`. Para
transporte, usan su primario o una vista bounded hash-bound a ese mismo primario:
la vista inicial vive en `candidates/bounded_invariants.json` y la candidata en
`invariant-candidate/bounded_invariants.json`. Ningun primario ni vista bounded
se mueve o renombra despues de sellar su descriptor.

Si el refinement falla, el bundle inicial permanece utilizable y la seleccion
registra `initial_fallback`, pero CANDIDATES termina
`completed_with_errors`. El fallo no puede presentarse como una fase limpia ni
quedar oculto por el fallback.

Los bindings de autorizacion por actor conservan dimensiones separadas para
caller, subject, allowance owner/spender, amount y recipient. Solo un contrato
TRACE completo, resuelto y violado crea una invariante resuelta; la satisfaccion
o falta de evidencia permanece fail-closed.

## Candidatos y autoridades

### CANDIDATES

Fusiona signals de herramientas, seeds deterministas y model discovery acotado.
Escribe, entre otros:

```text
tool-outputs/candidates/raw_candidates.json
tool-outputs/candidates/validation_candidates.json
tool-outputs/candidates/rejected_candidates.json
tool-outputs/candidates/model_discovery_packs.json
tool-outputs/candidates/model_discovery_diagnostics.json
tool-outputs/candidates/value_proof_requests.json
tool-outputs/candidates/value-evidence/proof_responses.json
tool-outputs/candidates/value-evidence/effective_attack_paths.json
tool-outputs/candidates/value-evidence/proof_closure_diagnostics.json
tool-outputs/candidates/candidate_lifecycle.json
tool-outputs/invariant-selection.json
canonical_candidates.json
analysis_funnel.json
```

Los candidatos incompletos se conservan como leads con etapa, razon, requisitos
faltantes y evidencia; no se eliminan silenciosamente.

Antes de escribir los artefactos, Core finaliza las promociones sobre el
inventario canonico completo. `validation_candidates.json` es despues un
subconjunto exacto por ID y por cuerpo: no puede reescribir una fila al moverla
a VALIDATE. Solo admite `ready_for_validation`, `lead_promoted_exact` y
`lead_promoted_partial`. Cada fila canonica cortada necesita exactamente un
rechazo retenido de etapa `pre_validation_noise_gate`; los contadores y razones
de `binding_diagnostics` deben reconstruirse desde ese ledger.

Los cortes siguen visibles en `candidate_lifecycle.json` y en
`candidate_review_projection.v1` (`review_projection.json`/Markdown), pero esa
vista declara de forma cerrada que no es autoridad de VALIDATE, FILTER ni de
findings. No se mezcla en `validation_results.json`, summaries o hashes; el
`review_queue.md` la presenta solo en una seccion separada y no autoritativa.

`effective_attack_paths.json` no sustituye ni modifica el
`tool-outputs/value/attack_paths.json` original. Es una copia efectiva que
reemplaza un path base revalidado o añade un path v2 exacto encontrado antes del
ranking, siempre que su respuesta supere el cierre. Los diagnosticos
`solguard-value-proof-closure-diagnostics.v1` conservan requests, responses,
aplicaciones, rechazos y sus razones.

El resultado Rust `AnalyzeOutputs` expone `candidate_value_dir`,
`value_proof_requests_json`, `value_proof_responses_json`,
`effective_attack_paths_json` y
`value_proof_closure_diagnostics_json` como campos aditivos.

La especificacion detallada de ambas fronteras esta en
[DISCOVER v2 y cierre candidate-directed VALUE](./discovery-v2-y-candidate-value.md).

### VALIDATE

Emite `validation_results.json` y Markdown con tres veredictos:

- `supported`
- `refuted`
- `inconclusive`

Antes de invocar FILTER, Core exige schema `validation.v0.8`, IDs no vacios,
normalizados y unicos, un resultado exacto por cada miembro de
`validation_candidates.json` y ninguno mas. `summary.total`, `supported`,
`refuted` e `inconclusive` se recomputan desde los resultados. Un mismo ID con
cuerpo distinto, un `lead_unvalidated`, un resultado adicional o un summary
stale detienen el pipeline; no se convierten en review-only de compatibilidad.

`findings.md` refleja `supported_finding`; `review_queue.md` conserva resultados
inconclusos y leads. Ninguna fase posterior puede mutar el hash de este
artefacto autoritativo.

Las protecciones se aplican por familia de invariante. Una revalidacion de
secuencia o invalidacion de objeto puede refutar familias temporales/lifecycle
compatibles, pero no una invariante distinta de autorizacion, permiso,
contabilidad, identidad o estructura. La procedencia TRACE consumida se liga a
`trace:<ruta-relativa-normalizada>` y al SHA-256 exacto de sus bytes.

VALIDATE reabre, parsea y rehashea el source de una vista bounded desde el mismo
descriptor, verifica su layout permitido y compara cada objeto retenido con el
objeto source exacto. Source ausente, externo, symlinked, inestable o divergente
invalida el input completo; no produce un resultado aparentemente normal con
`source_verified=false`. Una invariante source valida omitida por el transporte
solo puede dejar su resultado `inconclusive`. Del mismo modo, TRACE vacio
explicito es cobertura incompleta, nunca soporte ni refutacion.

VALIDATE publica exactamente dos bindings de procedencia INVARIANT en
`metadata.source_hashes`: `invariants` es el SHA-256 del input runtime efectivo
y `invariants:source` el SHA-256 del primario inmutable seleccionado. Son
iguales en modo directo y distintos en bounded. `metadata.invariant_runtime`
debe reconciliar el mismo source, schema, bytes y modo. Una materializacion
bounded autentica puede publicar `retained_objects_verified=false`; ese estado
es deuda diagnostica que fuerza `inconclusive`, bloquea release limpio y nunca
autoriza soporte. El inventario de IDs retenidos verificado se conserva separado
de los objetos: false exige vectores de invariantes y relaciones vacios; true
exige paridad exacta de IDs, orden, objetos y extremos de relaciones. En directo
el valor debe ser `true`. En ambos casos el selection manifest se recompone desde
los inputs fisicos y no puede ocultar anchors truncados.

VALIDATE valida tambien, con implementacion propia, el
`trace.contract_manifest.v1` all-target y el subset
`trace.materialization_manifest.v1`: membresia, orden, paths, bytes/hashes,
digests de ledger/receipt, agregados y cross-binding al mismo primario. No
depende de que Core haya realizado esa comprobacion antes; una divergencia
invalida el input y no produce verdicts parciales.

### FILTER

Consume source, VALIDATE, candidatos exactos, invariantes, MAP, policy, output y
el conjunto TRACE exacto que VALIDATE uso. Verifica `filter.v0.1` de forma
fail-closed y vuelve a ligar cada miembro TRACE por ruta relativa normalizada y
SHA-256. Subsets, miembros extra, sustituciones de path, bytes stale, symlinks,
rutas inseguras o componentes ambiguos fallan cerrados. DISCOVER, ECONOMIC y
VALUE no se anaden como inputs suplementarios sin un contrato de consumo
semantico nuevo y medido.

`trace:index.json` se verifica como metadata root hash-bound y debe coincidir
con `metadata.source_hashes` de VALIDATE. No aparece en
`trace_schema_versions`, no aporta evidence IDs y no puede relabelarse como un
`trace.v0.9` de candidato.

Todo indice con `trace.batch_selection.v3` exige ademas
`trace:evidence_verification.json` y el hash congelado del binario
`tool:trace_evidence_verifier`. El timeout externo de FILTER es 1.200 segundos
por defecto; el verificador dispone de 900 segundos (maximo 3.600) y la relacion
exige al menos 300 segundos adicionales para reap, validacion y publicacion. Una
configuracion N-1 falla antes de ejecutar el child.

El servicio FILTER de Core y `solguard-filter` vuelven a verificar los dos
manifiestos TRACE, el source bounded de INVARIANT y la identidad fisica de toda
la clausura declarada. La salida `filter_results.json` solo es aceptada despues
de reconciliar exactamente el conjunto VALIDATE-supported, los hashes y el
summary `filter.v0.1`. Un contrato ausente o stale, cobertura debt, una lectura
TOCTOU o un resultado contradictorio deja la fase en error/degradada y bloquea
product health; no se sintetiza un FILTER sano de fallback.

Antes de lanzar FILTER, Core sella VALIDATE, candidatos, MAP, el sidecar MAP si
existe, runtime/source INVARIANT y el inventario fisico TRACE completo. Mantiene
handles abiertos y registra identidad fisica, path canonico, metadata y hash;
exige el mismo mapa exacto despues del child y otra vez tras verificar el
report. Un `audit_map.coverage.json` consumido aparece siempre como
`map:coverage`, tambien con MAP inline. Mutacion persistente, inyeccion/borrado
del sidecar, drift de inventario y reemplazo de path con los mismos bytes fallan
cerrados. No es un write lock del sistema operativo: un escritor privilegiado
que restaure bytes y timestamps por completo entre comprobaciones queda fuera
de la frontera imponible del contrato.

FILTER recalcula `invariants` desde el artefacto runtime y
`invariants:source` desde el primario seleccionado que Core le entrega por
separado. Exige que el conjunto de labels sea exacto y lo conserva tanto en
`metadata.source_hashes` como en `metadata.validation_source_hashes`. Missing,
extra, hash stale, igualdad bounded o desigualdad directa fallan cerrados. Un
bounded con `retained_objects_verified=false` puede conservar integridad
estructural y deuda diagnostica, pero no puede producir `pass` para un resultado
soportado ni un estado limpio de release. FILTER recompone tambien el selection
manifest y los objetos/relaciones desde los inputs fisicos; no usa la proyeccion
compacta como autoridad semantica.

Cada resultado conserva `trace.claim_authority.v1`. `none/not_used` solo es
terminal si ni VALIDATE ni el candidato canonico ligado por hash dependen de
TRACE; `primary_evidence_source`, referencias genericas y referencias
`trace:<path>` del candidato forman parte de esa comprobacion. Una decision
TRACE exacta liga el conjunto completo de artefactos, hashes, receipts, roots e
IDs de evidencia. Cada ID debe existir en un array canonico admitido por
`trace_v0_9_typed_evidence_paths_v1` dentro del mismo primario TRACE ligado por
path y SHA-256. La politica solo admite superficies tipadas de
actor/autorizacion, contexto semantico, identidad, atomicidad, findings,
deep paths, cadenas causales, secuencias temporales, evidencia economica y
`evidence_items`. Aliases arbitrarios, `evidence_ids` top-level,
target/path/assembled, texto libre, contexto MAP copiado, claim payloads y otro
primario no pueden aportarlo. Cada `evidence_items[*]` debe tener un unico
`trace-evidence-v1-<sha256>` recompuesto con el framing
`trace.evidence_item.v1` desde el target/rango y el item exactos; cualquier
tamper o re-sellado arbitrario invalida el inventario. Autoridad MAY, roots
incompletas, manifiesto de funciones con deuda o binding ambiguo solo permiten
`review`; nunca `pass`, `reject` o `duplicate` terminales.

## Fases posteriores

### HISTORICAL-ENRICHMENT

Consulta conocimiento historico despues de VALIDATE y vuelve a comprobar que el
artefacto autoritativo no cambio. Escribe el enriquecimiento bajo
`tool-outputs/historical-enrichment/` y `knowledge/`.

### IMPACT

Procesa findings soportados y escribe `impact_escalation.json` y Markdown. Un
fallback conserva diagnostico sin elevar un candidato ni alterar su veredicto.

### POC-PLAN

Escribe el plan reproducible y la seleccion de harness en
`tool-outputs/poc-plan/`. No ejecuta el exploit y solo puede usar fixtures
source/test-linked presentes en el proyecto, nunca fixtures sintetizadas desde
ground truth.

### EXPLOIT

Solo se admite despues de FILTER `pass` y elegibilidad coherente. Core entrega
los artefactos hash-bound a `solguard-exploit` y valida el contrato
`exploit.v0.2`; una compilacion aislada no se presenta automaticamente como
reproduccion.

### REPORT

Renderiza `reports/<candidate_id>.md`, `report_manifest.json` y el receipt de
fase para findings soportados. Los inconclusos o refutados no se presentan como
bugs confirmados.

## Modos de ejecucion

`full` recorre las quince fases sujeto a los gates de FILTER y EXPLOIT.

`audit_only` completa hasta FILTER. Las cinco fases siguientes se escriben como
`skipped`, duracion cero y razon `skipped_by_audit_only_mode`, sin materializar
sus artefactos:

```text
historical-enrichment, impact, poc-plan, exploit, report
```

## Replays operativos

Desde un checkout hermano del core:

```powershell
cargo run --locked --manifest-path "../solguard-core/Cargo.toml" --bin solguard-core -- replay-candidates "<project-dir>" --raw-candidates "<raw.json>" --invariants "<invariants.json>" --out "<out-dir>"
```

Los replays deben usar artefactos congelados y compararse por contenido, IDs,
bindings y hashes. La compilacion y los tests por si solos no prueban paridad de
deteccion.

Del mismo modo, los contratos v2 y `candidate_value` no prueban una mejora de
recall. Esa conclusion requiere un nuevo rerun congelado de los 90 labs y de los
holdouts independientes frente a la baseline anterior.
