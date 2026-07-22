# Medicion completa, loss ledger y futuro holdout

La fase 1 separa tres conceptos que antes podian confundirse:

1. evidencia historica incompleta;
2. una regresion canonica nueva sobre v1-v8 y los 90 labs;
3. una futura prueba blind sobre un holdout privado independiente.

Solo el segundo punto mide el pipeline actual. En esta fase se fijan la politica
y el mecanismo criptografico del tercero, pero no existe una cohorte privada
real en el workspace: solo un custodio externo puede seleccionarla y sellarla.
No se abre ni se ejecuta durante esta fase.

## Frontera de claims

v1-v8 y labs-90 son `known_regression` de forma permanente. El snapshot publico
de exclusion liga 254 targets y 630 findings declarados. Sirven para detectar
regresiones, localizar perdidas y comparar ruido; no prueban generalizacion,
recall ciego ni descubrimiento de bugs nuevos.

La precision real queda `null` mientras no exista adjudicacion independiente.
Un finding no enlazado a un bug conocido puede ser ruido o un hallazgo nuevo y
no se etiqueta automaticamente como falso positivo. El informe puede mostrar
un `known_bug_precision_proxy`, siempre separado y con esa limitacion explicita.
Del mismo modo, FILTER ausente o incompleto y recall no observable permanecen
`null` o con estado parcial/no disponible. Los subtotales observados y su
cobertura se publican aparte; missing nunca se convierte en cero.

## Precommit de identidades anterior al replay

`solguard-measurement-pre-run-lock.v2` se crea despues del prebuild y antes de
analizar protocolos. Es un precommit firmado Ed25519 que incluye su timestamp;
falla si algun repositorio runtime esta sucio, el root no esta fisicamente
ausente o falta un input. Precompromete:

- commit, tree y estado limpio de los repos runtime;
- hashes explicitos de prompts, templates, policies, schemas, configs y locks
  versionados;
- bytes de los binarios Solguard y de Node, Git Bash, Git, Forge, Ollama,
  PowerShell, Cargo, Rustc y Bun;
- manifest byte a byte de snapshots y cache de labs, que deben permanecer sin
  cambios durante el replay;
- variables semanticas allowlisted, sin secretos;
- sistema operativo, CPU, RAM y versiones de Node, Git, Cargo, Rust, Bun y
  Ollama;
- manifest Ollama, Modelfile, parametros, template y todos los blobs CAS
  verificados contra su SHA-256;
- argv, cwd, entorno explicito allowlisted, paralelismo, outputs requeridos y
  autoridad de firma;
- historia de baseline en uno de dos modos cerrados: `bootstrap` sin evidencia
  historica verificable o `comparative` con measurement, loss ledger y manifest
  historicos byte-bound.

En `bootstrap`, que es el modo elegido por el orquestador para el primer replay,
`previous_measurement`, `previous_loss_ledger`, manifest historico y comparacion
quedan `null`. El lock declara `comparison_available=false`, no importa
agregados publicados como evidencia y mantiene la mejora del detector como no
disponible. `comparative` solo es valido cuando los artefactos historicos reales
se preservaron y verificaron. Los validadores aceptan v1 para comprobar material
historico almacenado; todo lock nuevo se emite como v2.

El manifest de snapshots y cache compromete identidades de bytes, no crea mounts
read-only ni demuestra inmutabilidad fisica. El runner rehashea los inputs antes
y despues de cada comando y cualquier drift invalida la baseline; tampoco cubre
una mutacion-and-restore entre checkpoints.

La frontera ZIP se valida antes de arrancar workers. Un link interno procedente
del archive upstream no se replica como symlink del host: solo se acepta cuando
su target POSIX UTF-8/NFC resuelve, incluso a traves de componentes intermedios,
a un archivo o directorio existente dentro del mismo archive. El preflight
rechaza paths absolutos, drives, backslashes, NUL, escapes, dangling links,
ciclos, colisiones, paths no canonicos y expansiones fuera de presupuesto. Los
links seguros se materializan deterministamente como archivos/directorios
regulares; Core repite una validacion equivalente sobre el inventario completo
y publica desde staging solo despues de cerrar plan, limites y contenido.

Deploy limita cada ZIP y la suma comprimida de base mas componentes a 256 MiB;
el presupuesto restante se aplica antes de leer o descargar el siguiente
componente. Inventario y paths del output tienen caps independientes de 32 MiB,
cobrados antes de insertar en memoria. Se permiten como maximo 256
`source_components`, con mounts normalizados y validados en O(n log n). Core
mantiene sus propios caps de 64 MiB para trabajo de inventario y paths
materializados, ademas del cap fisico de 256 MiB y el payload de 1 GiB.

La identidad raw del ZIP es telemetria de transporte, no la autoridad comun de
source. Cada base y componente queda fijado por commit SHA-1 inmutable de 40
caracteres y `snapshot_tree_sha256`; el catalogo scan proyecta el mismo valor
como `source_tree_sha256`. `solguard-materialized-source-tree.v1` hashea paths,
tipos, longitudes y contenido del arbol regular resultante. Dos mirrors pueden
tener ZIPs raw diferentes, pero deben producir exactamente ese mismo tree hash.
La cache incluye locator, mirrors, revision y tree identity; una entrada legacy
o una coincidencia solo por project+commit no concede autoridad.

Los ocho runners v1-v8, el runner scan-only y los dos runners de labs son los
once callers HTTP y todos deben transmitir
`solguard-source-authority-handoff.v1`. Core devuelve
`solguard-source-authority-receipt.v1` y encadena receipts de integridad entre
MAP, TRACE y FILTER. El preflight, el materializador usado por el runner y Core
deben compartir este contrato; no se admite un camino legacy paralelo.

La actualizacion de catalogos sigue la ceremonia
`source-authority-seal.mjs create -> verify -> apply -> finalize`. `apply`
actualiza de forma transaccional catalogos legacy y scan, ground truth,
known-corpus exclusion y application receipt bajo lease exclusivo, journal,
compare-and-swap, fsync y rollback recuperable. Una rotacion de un tree ya
declarado necesita autorizacion versionada. Seal, application receipt y cada
record del journal llevan firma Ed25519; receipt y journal comparten un UUID de
transaccion nuevo, el hash del seal y el plan exacto, por lo que recovery
rechaza una transaccion stale o replayed. El seal cierra `v1`-`v8` y el receipt
liga el denominador completo de known corpus `v1`-`v8` mas `labs-90`.
`finalize` usa la pareja Ed25519 fijada para revalidar el receipt persistido y
sus derivados, y publica create-only un
`solguard-source-authority-finalization.v1` firmado. Los consumers verifican
marker, application receipt y hashes derivados con la trust root y key ID
`solguard-phase1-20260717` fijados por el repositorio. De esos bytes exactos,
finalize deriva tambien `solguard-release-catalog-manifest.v1`, ordenado v1-v8
y ligado a la generacion del application receipt; los batch plans lo embeben y
no dependen de hashes manuales. La ceremonia real continua
pendiente hasta conservar los tres documentos firmados y completar esa
revalidacion; los comandos PowerShell exactos estan en
[Integridad de fuentes](../solguard-core/integridad-de-fuentes.md).

Fuera de `apply` no existe un regenerador de catalogos autorizado.
`materialize-scan-catalogs.mjs` admite solo `--check`; los aliases
`benchmark:scan-catalogs` y `benchmark:scan-catalogs:check` son read-only y
exigen paridad byte-exacta.

Los consumers normales leen derivados exclusivamente dentro de
`withSourceAuthorityRead`. El lease compartido del SO mantiene estable el root
fisico y la generacion del application receipt; el callback recibe un capability
opaco in-process que expira al salir. Los accessors solo aceptan paths exactos
descritos por el receipt, usan handles acotados y verifican identidad, longitud,
SHA-256 y JSON estricto antes de devolver datos. Al terminar, incluso ante una
excepcion, se vuelven a comprobar lease, root y la misma finalizacion. Verificar
y despues reabrir un pathname raw no conserva esta autoridad.

La ejecucion supervisada usa un capability de proceso separado, corto, ligado a
la generacion y a la ascendencia del runner. Su watchdog single-flight verifica
periodicamente capability y lease. Ante perdida de lease/capability o sustitucion
del root fisico, termina y drena el arbol entero mediante Job Object en Windows o
process group en Unix; el cierre normal del lider tampoco deja descendientes.
Solo `apply`/`finalize`, con purpose y lease explicitos, pueden observar el estado
de ceremonia aun no finalizado.

Un futuro commitment externo que cite un hash anterior del known corpus no se
puede reescribir en sitio: debe publicarse una version nueva sin abrir la cohorte
privada. Actualmente no existe un commitment real, por lo que esta es una regla
de ceremonia y no el registro de una rotacion ya realizada.

El replay usa los binarios comprometidos con `--no-prebuild`. El runner deriva
cada comando del lock y pasa al child exactamente el entorno explicito del
runbook; no hereda variables arbitrarias del proceso llamador. Antes de ejecutar
adquiere un lease exclusivo y crea un journal de inicio. Cada comando exitoso
produce `solguard-measurement-command-receipt.v2`, un recibo Ed25519 create-only
que liga identidad de comando, telemetria
y un manifest canonico de evidencia con extensiones y directorios excluidos
declarados en el propio recibo, y que enlaza el recibo anterior mediante
`previous_receipt_sha256`. No afirma cubrir cada byte del arbol: los artefactos
semanticos/offline listados se rehashean aparte y cada descriptor de medicion en
scope debe coincidir con un recibo firmado. La firma prueba integridad bajo la
clave suministrada, no autorizacion de esa clave, un timestamp externo notarial
ni aislamiento fisico del host.

Los runners de release y labs solicitan `analysis_profile=generic_blind` junto
con `mode=audit_only` y `run_exploit=false`, lo sellan en
`solguard-runtime-policy.v2` y verifican que Backend devuelva el mismo perfil en
la respuesta autenticada. `compatibility`, un perfil ausente o una respuesta
distinta fallan cerrados. Esta es una propiedad contractual del nuevo camino;
todavia no hay un replay ejecutado que mida su efecto sobre deteccion.

El recibo v2 liga ademas el informe exacto `solguard-pre-release-check.v3` y sus
dos decisiones independientes:

- `measurement_integrity`: evidencia completa, coherente, contabilizada y
  comparable;
- `product_health`: politica estricta de salud y promocion del producto.

`measurement_integrity` no tolera autoridad ausente, invalida o no
verificable. En particular, `coverage_contract_missing`,
`coverage_contract_invalid`, `coverage_contract_unverifiable` y un artefacto de
cohorte demasiado grande para su verificador acotado bloquean el comando. Una
deuda coherente y explicitamente ligada puede seguir siendo diagnostica, pero
mantiene `product_health=failed` y nunca permite promocion.

El gate recompone tambien las tres cohortes de candidatos: inventario canonico
completo, subconjunto exacto realmente emitido a VALIDATE y resultados exactos
de ese subconjunto. Las filas VALIDATE conservan el mismo cuerpo y solo estados
de admision cerrados; cada corte canonico necesita una unica entrada
`pre_validation_noise_gate` en `rejected_candidates.json`. Los runners cuentan
`candidate_findings` desde canonical y el total/veredictos desde VALIDATE. Un
ID reusado con otro cuerpo, un lead no validable admitido, un resultado desnudo
o un corte sin ledger invalida la medicion.

El gate no confia en contadores copiados. Recalcula desde las filas fisicas de
VALIDATE `total`, `supported`, `refuted`, `inconclusive`,
`supported_findings`, `review_queue`, `reviewable_leads` y `non_findings`;
`supported_candidates` debe coincidir con los verdictos `supported`. Exige la
misma verdad en `validation.summary`, en cada registro de protocolo y en los
agregados de suite. `candidate_findings` se agrega por separado desde el
inventario canonico fisico. Un contador secundario ausente o stale es un fallo
de integridad de medicion, incluso si recall o el estado textual parecen sanos.

Canonical, input VALIDATE, ledger de cortes y resultados VALIDATE se leen como
autoridad fisica acotada. Cada path debe permanecer dentro del project root,
sin symlink, junction/reparse point ni hardlink, y conservar la misma identidad
de fichero y cadena de padres durante la lectura. Un escape, alias, sustitucion
TOCTOU o artefacto de cohorte mayor de 100 MiB falla cerrado: estas cohortes no
tienen un sidecar semantico que permita saltarse el join exacto.

La recuperacion posterior a VALIDATE aplica el mismo contrato sobre artefactos
frescos, confinados al root, link-free y fisicamente estables. Ademas exige que
el SHA-256 de los bytes reales de `validation_candidates.json` sea exactamente
`validation.metadata.source_hashes.candidates`; un timeout no concede permiso
para fabricar o ampliar la cohorte.

El inventario de detection coverage es exacto y ordenado:
`MAP -> TRACE -> DISCOVER -> ECONOMIC -> VALUE -> INVARIANT -> VALIDATE -> FILTER`.
MAP se verifica directamente desde `audit_map.json`; una proyeccion MAP dentro
de DISCOVER o un receipt posterior solo puede servir como cross-check y nunca
sustituye al artefacto autoritativo. Para MAP mayor de 100 MiB, el gate exige el
sidecar ligado por bytes/SHA-256, pero recompone desde el primario sus ledgers,
audit summary, graph edge health, economic flow runtime health, clausura e
identidades antes de evaluar deuda. La igualdad con el sidecar es obligatoria:
el sidecar nunca es autoridad semantica independiente.
El contrato actual es `solguard-coverage-manifest.v2` con
`solguard-map-coverage.v2`; v1 solo puede aparecer como diagnostico legacy.
Ademas de los ledgers historicos, el gate recompone
`control_flow_coverage.v1` y `map_target_route_prerequisites.v1` desde los CFG,
funciones, source, evidencia, calls y edges fisicos. Omision o identidad
ausente bloquean; unresolved retenido conserva `over_approximation` MAY y nunca
se convierte en MUST, ausencia o negativo.
El mismo sidecar debe incluir
`economic_route_graph_closure_manifest.v1`: el gate valida su digest
content-addressed, cobertura, roots, clausura transitiva de fragments y
contadores. La exactitud se calcula por cada conjunto de roots seleccionado;
una region no seleccionada `over_approximation` no contamina un root exacto,
pero una region MAY alcanzada nunca autoriza un claim exacto/MUST. Omision de
cobertura y resolucion semantica se contabilizan por separado.

TRACE debe sellar `trace.contract_manifest.v2` con un binding ordenado para
cada target del batch. El gate rehashea cada `trace.v0.9`, compara su ledger y
route receipt inline y recalcula deuda, roots y `manifest_digest`. Cuando la
clausura factorada autoriza separar la linearizacion legacy, exige ademas que
`trace.materialization_manifest.v2` sea el subset exacto de targets con
diagnosticos, ligado a los mismos bytes. Un target ausente/extra/intercambiado,
un digest stale o diagnosticos clasificados sin clausura completa, debt-free y
con roots bloquean `product_health`. Tanto `exact` como `over_approximation`
pueden acreditar esa cobertura MAY; el gate conserva la segunda etiqueta y no
la usa para probar exactitud, MUST o ausencia.
El materialization manifest esta ausente o es `null` exactamente cuando no
existen diagnosticos y es obligatorio, con el subset exacto, cuando
`diagnostics_count > 0`.

La autoridad de productor actual se prueba unicamente con
`trace.evidence_verification.v2` bajo la policy v3. Un primary sin indice, un
indice sin receipt, un receipt v1 o un estado desconocido puede aparecer en un
informe diagnostico, pero bloquea `product_health` y cualquier decision FILTER
terminal dependiente de TRACE.

El `index.json` fisico actual tiene un cap inclusivo de 100 MiB. Canary,
release, detection coverage y el replay FILTER offline aplican el mismo lector
streaming estable y no retienen a la vez un `Buffer` crudo del fichero completo
y el documento parseado. El receipt y stdout del verificador conservan un cap
inclusivo independiente de 64 MiB; ese presupuesto no limita el indice.

Con ocho workers simultaneos, el limite anterior acota la entrada fisica de
indices a 800 MiB en total antes del overhead de parser, objetos y runtime. Es
una envolvente aritmetica de bytes de entrada, no una medida ni una garantia de
RSS del proceso.

El target publicado debe usar exactamente el `map_function_id` seleccionado; un
ID local del parser no es identidad de target. En
`trace.batch_selection.v3`, `--top` solo separa deep de compact y
`target_budget_omitted` esta prohibido. Compact exige un unico
`physical_source_binding`; deep `.vy`/`.py` exige exactamente el binding de
funcion del lenguaje correspondiente.

El inventario TRACE usa la politica cerrada
`trace.evidence_authority_paths.v1`. En particular, cada
`evidence_items[*]` debe contener un unico `trace-evidence-v1-<sha256>` que el
gate recompone con `trace.evidence_item.v1` desde target, rango y payload
exactos. Cambiar target/detail/kind/source/file/line/range o re-sellar un ID
arbitrario bloquea `product_health` tanto en primarios pequenos como grandes.
Cada item declara `source=solguard-trace`; evidencia MAP queda en el slot
separado y nullable `solguard_map_context` y no adquiere autoridad TRACE.
`trace-economic-evidence-*` es identidad semantica y solo
`source_evidence_ids` resueltos por ID/fichero/linea aportan evidencia fisica.

Para un primario TRACE por encima de 100 MiB, la proyeccion directa recalcula
desde un unico stream estable schema, target, ledgers, capabilities, receipt de
grafo, materializacion, ocurrencias de evidencia, digest multiset y
`binding_counts`, a la vez que sella todos los bytes y su SHA-256. Enums, orden,
paridad y aritmetica checked deben cerrar; parcialidad, truncado, overflow,
TOCTOU o digest drift fallan cerrados. No existe sidecar semantico TRACE.
Cada primary debe ser no vacio y respetar el cap producer inclusivo de 4 GiB.
El gate compara `primary_bytes` con metadata fisica antes del hash/proyeccion;
los presupuestos menores de datos retenidos limitan memoria, no el wire valido.

ECONOMIC solo queda completo si ambos `economic_collection_coverage.v1` son
aritmeticamente coherentes y el ledger sintetizado preserva cada budget exacto
del modelo. Para primarios por encima de 100 MiB, el gate verifica el sidecar del
productor, su SHA-256 streaming, recompone la proyeccion semantica desde el
primario y exige igualdad exacta; no trata el tamano como fallo ni acepta un
resumen sin autoridad. VALUE e INVARIANT siguen la misma regla con sus summaries,
estados de materializacion/proof y stage coverage.

DISCOVER publica siempre `discover_coverage_contract.v2`, no solo cuando el
modelo es grande. El gate liga `protocol_model.json` por bytes y SHA-256,
recomputa su enum `coverage_reasons` desde los ledgers y contadores y exige
coincidencia exacta con el primario cuando este cabe bajo el limite. Por encima
de 100 MiB recompone la proyeccion desde el primario y exige que el contrato
hash-bound la reproduzca sin elevar el parse cap. Un contrato
ausente, cobertura upstream `unknown`, deuda, una etapa semantica no exacta o
aritmetica incoherente bloquean `product_health`.
V1 es diagnostico legacy y no puede pasar la salud actual. V2 liga tambien los
limites exactos y todos los contadores de uso. La integridad TRACE se mide con
dos pasadas fisicas, un budget previo derivado de bytes, primarios, throughput
minimo y overhead por fichero, y un reloj separado de la inferencia semantica;
los bytes/pasadas incompletos o un budget excedido fallan cerrado.
Cada etapa bounded publica `semantic_coverage.v2` con unit obligatorio
`items|files|targets|contracts|debt_entries`; solo `items` agrega
`semantic_items_omitted`. Unit desconocida/ausente, un receipt v1 incompatible,
overflow o conteos incoherentes fallan cerrados; v1 nunca se reinterpreta como
v2.

INVARIANT puede llegar a VALIDATE/FILTER mediante
`invariant.bounded_runtime.v1`, pero el gate exige el source
`invariant.v0.8` byte-exacto, la seleccion de objetos completos y su coverage
ledger. Deuda coherente en `omitted_anchor_occurrences`,
`omitted_evidence_occurrences` u `omitted_relationships`, incluido el cruce
retained/omitted, fuerza todos los verdictos a `inconclusive` y deja vacio el
conjunto terminal FILTER. Tamper, shape/count incoherente u overflow checked son
fallos duros. Core, VALIDATE, FILTER y el gate realizan comprobaciones
fail-closed independientes; que una capa haya aceptado un artefacto no exime a
la siguiente de revalidarlo.

La lectura inline de Core cambia a proyeccion a partir de 96 MiB; el gate de
Deploy conserva 100 MiB como limite inline. Los sidecars estan limitados a 100
MiB y la clausura MAP a 64 MiB. En ambos lados del limite, el mismo parser
rechaza UTF-8 invalido, claves duplicadas, JSON truncado o con datos posteriores.
El primario completo se rehashea por streaming desde un descriptor acotado y se
comprueban identidad fisica, root, symlinks/reparse points, hard links y cambios
antes/despues. Esta defensa evita aceptar un artefacto sustituido durante la
lectura; no convierte la ejecucion host en una frontera blind aislada.

Una medicion coherente puede firmarse con `product_health=failed`, pero el mismo
recibo fija `product_release_eligible=false`. `finalize` y `verify` releen los
artefactos, regeneran el informe y comparan ambas decisiones; no pueden
reinterpretar esa baseline como un release sano. El tier `release` sigue
seleccionando `product_health` sin soft-fail.

Un comando que termina non-zero, recibe una signal, pierde artefactos requeridos
o no supera `measurement_integrity` no recibe un recibo de exito. Emite
`solguard-measurement-command-failure-receipt.v1`, firmado y create-only, con
`release_eligible=false`, `continuation=false` y `root_reusable=false`. El
documento `solguard-measurement-failure-diagnostic.v1` y el inventario
`solguard-pipeline-partial-diagnostic.v1` pueden describir evidencia parcial,
pero no autorizan el siguiente comando, `finalize`, `verify` ni una baseline.
El siguiente intento exige root nuevo y un pre-run lock nuevo.

## Loss ledger

`solguard-pipeline-loss-ledger.v1` contiene exactamente una fila por bug
declarado y conserva los protocolos fallidos en una tabla separada. El orden de
observacion es:

```text
source_preflight
MAP
TRACE
DISCOVER
candidato
binding a invariante
ECONOMIC/VALUE
VALIDATE
FILTER
```

Cada etapa puede ser `survived`, `blocked`, `bypassed`, `not_applicable`,
`unverifiable` o `not_reached`. Cada decision enlaza artefacto, SHA-256 y JSON
pointer cuando esa evidencia existe.

El ledger distingue:

- `first_observed_loss_stage`: primera frontera donde se observa la perdida;
- `first_attributable_loss_stage`: primera perdida demostrada despues de cerrar
  con evidencia todos los predecesores requeridos.

Una fase MAP o TRACE completada para el protocolo no demuestra por si sola que
el bug concreto sobrevivio. En ausencia de lineage por finding, la atribucion
correcta es `unverifiable`. FILTER `duplicate` conserva el bug solo si su
representante tiene decision `pass`.

El ledger se genera despues del scan y pertenece al evaluador. Ground truth,
matcher y ledger nunca son inputs de CORE, herramientas o FILTER.

La elegibilidad del denominador se congela antes del analisis mediante el
preflight comun de benchmarks/labs. Sus outcomes son disjuntos:

- `ground_truth_ineligible`: la referencia declarada no describe un finding
  evaluable en el snapshot inmutable;
- `source_unavailable`: el source requerido no pudo materializarse o localizarse;
- `analysis_failed_after_source_preflight`: la referencia era elegible y el
  source paso preflight, pero el pipeline fallo despues.

Estos campos se persisten aunque exista timeout o fallo downstream. Un finding
`ground_truth_ineligible` termina en el loss ledger como
`finding_not_applicable`; no cuenta como miss, source ausente ni scoreable. El
preflight es evaluador/corpus y nunca se entrega al pipeline productivo.

## Metricas y comparabilidad

El productor actual emite `solguard-pipeline-measurement.v2`. Conserva los
denominadores y controles de v1 para:

- volumen MAP, TRACE, DISCOVER, ECONOMIC, VALUE, candidatos, VALIDATE y FILTER;
- recall end-to-end sobre los 630 findings declarados, donde fallos de source y
  protocolos cuentan como misses, mas el denominator estatico scoreable;
- candidate recall, VALIDATE-supported recall y FILTER-pass recall;
- macro recall por protocolo, familia y lenguaje;
- review queue, overflow, ruido, densidad y candidatos por bug conocido;
- fallos, degradaciones, fallbacks y truncaciones observables;
- precision real y adjudicacion: `precision=null`, cero findings adjudicados y
  cobertura explicita (que puede ser `null` sin denominador) mientras no exista
  adjudicacion independiente; `known_bug_precision_proxy` se mantiene separado
  y no es precision de producto.

V2 anade tiempos batch de benchmarks/labs, tiempo secuencial total y
distribuciones de duracion por protocolo y fase con
`min/mean/p50/p95/max`, interpolacion R7 y cobertura explicita. Publica
throughput de protocolos, protocolos completados, candidatos y findings
supported por hora; y eficiencia por protocolo completado para CPU, IO y bytes
de output declarados. El output manifest solo suma ficheros/bytes de los
manifests ligados por los command receipts firmados: no afirma medir todos los
bytes escritos en el filesystem.

`solguard-resource-telemetry.v3` alimenta esa vista operacional y separa:

- proceso supervisado: picos de RSS, memoria virtual y privada, CPU acumulada,
  pico de utilizacion respecto a un CPU logico e IO de transferencia read/write;
- host: RAM usada/disponible y CPU global;
- GPU: en Windows consulta contadores CIM
  `Win32_PerfFormattedData_GPUPerformanceCounters_*`, una ruta aplicable a AMD
  cuando el host los expone; opcionalmente puede usar un `nvidia-smi` fisico
  para memoria total/usada y utilizacion;
- Ollama: modelos activos, tamano y `size_vram` mediante `/api/ps` local;
- storage: usados, libres y disponibles del filesystem fisico del run mediante
  `statfs`.

El runbook canonico configura 5 segundos para el arbol de procesos y 30 para
sistema/storage. El proveedor fisico de tabla de procesos y el
`nvidia-smi` opcional se resuelven, hashean y atestiguan antes de ejecutar y se
reatestiguan al terminar; el root de storage tambien queda ligado por identidad
fisica. El runbook Windows actual liga PowerShell y usa CIM;
`--nvidia-smi-executable` es una capacidad opcional de v3, no un provider que el
runbook configure por defecto. Las observaciones de host/GPU son system-wide,
Ollama no queda atribuido en exclusiva al child, el IO de proceso no son bytes
fisicos de disco y storage no equivale a output. La ruta CIM no identifica por
si sola el vendor y deja la capacidad VRAM total como `null`; solo conserva los
contadores expuestos por el host. El muestreo puede perder procesos cortos,
detached o reparented. Un sensor no soportado o no observado queda
`null`/`unavailable`, nunca se convierte en cero. Los lectores conservan
compatibilidad explicita con telemetria v1/v2; el nuevo runbook produce v3.

El macro recall por protocolo solo tiene valor numerico cuando estan observados
los 254 protocolos configurados. Si la cobertura es parcial queda `null` y se
publican por separado protocolos observados, total, ratio de cobertura y estado.

`solguard-measurement-comparison.v1` clasifica cada metrica como
`comparable`, `partially_comparable` o `not_comparable`. La ausencia historica
de memoria o adjudicacion no se convierte en cero. Tiempo y memoria solo pueden
ser plenamente comparables con corpus, hardware, concurrencia y metodo
equivalentes.

La baseline final `solguard-measurement-baseline.v2` exige evidencia
`core_bound`, un manifest offline completo, todos los outputs requeridos, cada
finding en el ledger y firma Ed25519. `core_bound` se recomputa contra el
commit/tree limpio de `solguard-core` del lock para exactamente las nueve
colecciones: v1-v8 lo incluyen en `reproducibility.toolchain.repos`; labs en
`analysis_toolchain.repos` y en un `core_source_tree` reconciliado. Los
self-hashes de los execution contracts, componentes, runner y comando tambien
se verifican; una etiqueta no sirve como evidencia. La baseline embebe el
inventario semantico completo, los hashes de measurement y ledger y, solo
cuando existe historia comparable, el hash de comparison.
En modo `bootstrap`, los descriptores y hashes historicos y `comparison` son
`null`, `comparison_available=false` y
`detector_improvement=unavailable_without_previous_baseline`. En modo
`comparative`, finalizacion y verificacion vuelven a comprobar los bytes y las
ausencias de la baseline historica; una aparicion, desaparicion o mutacion
invalida la comparacion. Baseline v1 queda admitida solo para verificacion
historica; el productor actual firma v2.

## Replay de fase 1

Los runners productivos no se duplican:

`labs-v1` no forma parte de este replay canonico: sus 8 labs legacy solo admiten
`regression` o `targeted`, nunca release/measurement, y no pueden satisfacer el
denominador ni el receipt de los 90 labs. La unica superficie canonica de 90
labs es `labs-v2`; release y measurement exigen el conjunto completo y rechazan
`--protocol`. Ambas colecciones siguen siendo regresion conocida.

Los comandos `v1-v8-measurement` y `labs-measurement` siguen disponibles para
conservar una medicion integra aunque product health falle. No son la cadena de
aceptacion elegida para este intento. La superficie canonica de promocion es
`scripts/measurement/setup-release.ps1`, que exige canarios 8/8 y despues usa
exactamente `v1-v8-release` y `labs-release`; ambos solicitan y verifican
`generic_blind`.

El orquestador recibe un unico prebuild receipt ya creado y lo verifica antes
de cualquier canario. Tambien valida repositorios limpios, binarios host
exactos, modelo Ollama local, espacio libre, plan sellado y roots disjuntos y
fisicamente ausentes. `-ValidateOnly` comprueba esas precondiciones sin crear ni
cambiar outputs.

Antes del replay completo, el orquestador ejecuta o revalida una barrera
dirigida sin ground truth como input del producto. `--require-product-health`
solo es valido con `--tier targeted`; cada canario es un comando independiente,
usa el mismo prebuild con `--no-prebuild`, repite `--snapshot-preflight` y posee
un root exclusivo. Los ocho se procesan secuencialmente, nunca en paralelo. Un
fallo conserva su root y no contamina ni autoriza el siguiente estado. La matriz
exacta es:

El canario Vyper v8 no confia en el tag mutable `v0.3.7`: el catalogo fija el
objeto Git afectado `6020b8bbf66b062d299d87bc7e4eddc4c9d1c157` y la URL de
snapshot incorpora ese SHA-1 completo. Asi una mutacion o redireccion del tag
no puede cambiar silenciosamente el corpus sellado.

```text
v1:Compound-Finance -> <root-compound-nuevo>
v1:Monad            -> <root-monad-nuevo>
v2:Size             -> <root-size-nuevo>
v2:LoopFi           -> <root-loopfi-nuevo>
v4:Morpheus         -> <root-morpheus-v4-nuevo>
v5:Timeswap         -> <root-timeswap-nuevo>
v6:Morpheus         -> <root-morpheus-v6-nuevo>
v8:Vyper            -> <root-vyper-nuevo>
```

La invocacion completa tiene esta forma. Ejecutarla inicia toda la secuencia y,
por su duracion, pertenece al operador:

```powershell
& "$workspace\solguard-deploy\scripts\measurement\setup-release.ps1" `
  -WorkspaceRoot $workspace `
  -RunRoot $run `
  -RunId $runId `
  -CanaryBase $canaryBase `
  -PrebuildReceipt $prebuildReceipt `
  -SnapshotsRoot $snapshots `
  -LabsCacheRoot $labsCache `
  -ModelManifest $modelManifest `
  -SigningPrivateKey $privateKey `
  -SigningPublicKey $publicKey `
  -Model 'qwen2.5-coder:7b' `
  -OllamaHost 'http://127.0.0.1:11434' `
  -OllamaModelsRoot 'D:\models'
```

El prebuild receipt es input obligatorio. El orquestador realiza una
verificacion preliminar y cada canario recibe y valida esa misma identidad; no
se recompila entre canarios. `-ValidateOnly` aplica el preflight sin ejecutar la
matriz ni crear outputs.

El primer intento `r1` posterior al commit Deploy `0d1f1df` no llego a producir
ese receipt. Aunque los 14 repositorios requeridos estaban limpios, el prebuild
aborto antes de compilar por deriva del contrato TRACE: Core tenia 191980 bytes,
Validate/Discover 191984 por formato rustfmt 2024/2021 y FILTER 176486 sobre la
copia anterior sin `generic_blind`. No se ejecuto ningun canario ni replay y ese
root no se reutiliza. La correccion emplea una forma estable y el prebuild
compara ahora las siete copias byte-identicas de Core, Validate, Discover,
FILTER y los vendors VALUE, ECONOMIC e INVARIANT antes de compilar. Esto es
evidencia de paridad de input, no una medicion de deteccion.

Cada canario debe terminar con estado limpio, `filter_results.json` presente y
product health aprobado; un error, deuda de cobertura, fallback o artefacto
contractual invalido impide preparar el root v1-v8. Los roots fallidos no se
reciclan. Los ocho outputs se cierran offline con
`benchmark:canary-acceptance`. Este exige el manifest exacto
`solguard-canary-acceptance-input.v1`, roots fisicamente distintos y no
anidados, y crea un snapshot CAS privado por root mediante copia streaming. El
inventario sella dev/ino, mtime/ctime, directorios y SHA-256 de source,
knowledge y tool outputs; rechaza links, hardlinks, escapes, JSON con claves
duplicadas, swaps de directorio, cambios TOCTOU, threshold o selector drift.
Sobre esos bytes recompone `buildPreReleaseCheck` con
`enforceProductHealth=true` y vuelve a evaluar los bugs conocidos con catalogo,
GT y matcher actuales. Cada bug scoreable debe tener un match exact/equivalente
supported y el candidato debe acabar en FILTER `pass`, directamente o por un
representante dedupe pass explicitamente ligado. Los ocho roots deben compartir
los mismos bytes de repos, binarios, runtime, modelo y manifest fisico. La
provenance Git tambien se conserva, pero un commit sin cambio de contenido no
rompe la identidad material. El JSON
`solguard-canary-acceptance.v1` se publica de forma atomica y create-only con
descriptores fisicos, SHA-256 y mappings finding-candidate-FILTER por selector.
Es local, no esta firmado y solo habilita preparar otro root ausente para el
replay completo v1-v8; declara `release_eligible=false`,
`generalization_evidence=false` y `blind_detection_evidence=false`.

Esta seccion define una condicion de aceptacion, no registra su cumplimiento.
Hasta conservar los outputs y el informe product-health de cada canario, su
estado es no verificado y no autoriza preparar ni anunciar el replay completo.

Monad v1 queda fijado al snapshot compuesto completo
`code-423n4/2025-09-monad@bcc1592fcf38f47a417190b1ea159934926f1f12`, que
incluye el alcance Rust BFT y C++ execution del concurso. El snapshot anterior
del componente C++ aislado no representa el alcance auditable completo. Esta
correccion de corpus evita una evaluacion incompleta; no es una regla de
deteccion ni evidencia de mejora.

Tras obtener acceptance exacto 8/8, el orquestador prepara un root fisicamente
ausente con `--bootstrap-baseline`, lock v2 y la identidad del acceptance. Lanza
`v1-v8-release` con las ocho suites y `--parallel 8`; solo si ese comando termina
con exito ejecuta `labs-release` sobre los 90 labs. Despues llama a `finalize` y
`verify` sobre la baseline v2 firmada. Cada `run` requiere las claves privada y
publica, valida drift antes/despues, sella receipt y no admite resume.

En este primer bootstrap no se crea `comparison.json`: el mensaje de finalize
debe indicar `comparison=unavailable_bootstrap`, y los campos correspondientes
de lock/baseline permanecen `null`. Deben preservarse el root completo, las
lineas `completed command=... receipt=...`, `finalized baseline=...
comparison=unavailable_bootstrap path=...` y `verified baseline=...`, junto con
`pipeline-measurement.json`, `loss-ledger.json` y
`measurement-baseline.json` bajo `_measurement/current`.

Nada de esta cadena se ha ejecutado todavia. No hay canarios aceptados 8/8, no
hay replay nuevo de v1-v8, labs no se han iniciado, y no existen finalize ni
verify de una baseline v2. La matriz, el orquestador y sus tests son capacidad
operacional, no resultados de deteccion.

## Holdout futuro: politica y mecanismo, no cohorte real

La politica publica `solguard-holdout-policy.v1` exige una cohorte one-shot,
disjunta por target, lineage, forks, familia de protocolo, familia de
vulnerabilidad y corte temporal, con controles limpios y custodia separada.
Cada booleano queda en el manifest privado y se liga a un hash de evidencia.
v1-v8 y labs-90 estan excluidos.

Un custodio externo, independiente del desarrollo, debe crear fuera del parent
que contiene todos los repos Solguard:

- manifest privado con targets, sources fijados, ground truth y plan de
  adjudicacion;
- nonce aleatorio privado de al menos 32 bytes;
- payload cifrado segun un perfil permitido; la identidad e independencia de
  sus recipients es gobernanza externa y no la demuestra este validador;
- clave privada Ed25519 y recibo privado de custodia.

El commitment publico contiene solo un ID opaco, hashes de policy y corpus
conocido, una raiz Merkle global, hash/tamano del ciphertext, agregados
autorizados, trigger de reveal, key ID, self-hash y firma. El contrato rechaza
nombres, locators, ground truth, salts, nonces y otros campos secretos en el
documento publico. Publicar hashes individuales tampoco seria seguro frente a
ataques de diccionario.

Un commitment prueba integridad y autenticidad bajo la clave suministrada, no
independencia ni un timestamp externo. Una publicacion externa puede aportar un
limite `not-after`, pero `sealed_at` por si solo procede del caller. Los fixtures
sinteticos solo validan el mecanismo y no constituyen el holdout del producto.
Hasta que un custodio externo entregue material privado real, publique el
commitment y la frontera aislada de fase 13 exista, el estado honesto es:

```text
policy contract: designed and versioned
policy freeze: pending external signed commitment
mechanism: implemented and tested with synthetic fixtures
canonical known-regression replay: pending operator execution
core-bound baseline: not produced yet
real private cohort: not supplied
real public commitment: not supplied
holdout: not opened and not executed
evaluation_eligible: false
```

No se debe inventar un cohort ni afirmar que quedo sellado material real si el
custodio todavia no lo ha proporcionado.
