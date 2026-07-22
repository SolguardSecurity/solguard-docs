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

| Opcion                          | Funcion                                                                   |
| ------------------------------- | ------------------------------------------------------------------------- |
| `--target <name>`               | Target individual.                                                        |
| `--out <dir>`                   | Directorio de salida. Default: `solguard-trace-output`.                   |
| `--from-map <path>`             | Contexto de `audit_map.json`.                                             |
| `--max-depth <n>`               | Profundidad de llamadas internas. Default: `2`.                           |
| `--max-path-expansions <n>`     | Presupuesto de expansiones por target. Default: `8192`; maximo: `65536`.  |
| `--max-deep-paths <n>`          | Maximo de deep paths retenidos. Default y maximo: `4096`.                 |
| `--top <n>`                     | Presupuesto del prefijo deep; los targets elegibles restantes son compact. |
| `--levels S,A,...`              | Filtra batch por nivel SolGuard.                                          |
| `--analysis-profile <perfil>`   | `compatibility` o `generic_blind`; default: `compatibility`.              |
| `--allow-empty-batch-targets`   | Permite al orquestador registrar seleccion batch vacia como coverage gap. |
| `--include-tests`               | Incluye tests/mocks Solidity omitidos por defecto.                        |
| `--source-integrity <json>`     | Contrato orquestado del arbol fisico autorizado.                          |
| `--map-source-integrity <json>` | Receipt MAP obligatorio junto al contrato anterior.                       |
| `--no-color`                    | Desactiva colores ANSI.                                                   |

Reglas:

- Si se usa batch (`--top` o `--levels`), `--from-map` es obligatorio.
- `--target` no puede combinarse con batch.
- Si no hay batch, `--target` es obligatorio.
- Una seleccion batch vacia falla por defecto. El flag
  `--allow-empty-batch-targets` solo es valido en batch orquestado y produce un
  indice explicito; no fabrica traces ni evidencia.

## Contrato de salida

Schemas:

```text
trace.v0.9
trace.coverage_ledger.v1
trace.contract_manifest.v2
trace.materialization_diagnostics.v2
trace.materialization_manifest.v2
trace.target_route_closure.v2
trace.target_route_evaluation.v2
trace.claim_authority.v2
trace.evidence_verification.v2
```

Modo individual:

- `trace.json`
- `trace.md`
- `summary.txt`

Modo batch:

- `index.json` (`trace.batch_index.v1`)
- `index.md`
- `summary.txt`
- `traces/<rank>_<target>.json`
- `traces/<rank>_<target>.md`
- `traces/<rank>_<target>.txt`
- `evidence_verification.json` cuando la seleccion usa
  `trace.batch_selection.v3`
- `source_integrity.json` cuando Core entrega ambos contratos de integridad

`evidence_verification.json` no es un autosellado suficiente. Prebuild
materializa una autoridad single-link del binario release independiente
`solguard-trace-evidence-verify`. Core comprueba sus bytes/SHA-256 y crea con
`create_new` una copia privada single-link dentro de un `TempDir` del sistema,
fuera de `trace/` y del resto de artefactos publicados. Esa misma copia verifica
`index.json`, MAP y source y es la unica que se entrega a FILTER. FILTER la
vuelve a ejecutar desde un entorno vacio y un scratch privado; Core conserva el
`TempDir` hasta que FILTER termina y lo cierra al hacer `Drop`. Ningun ejecutable
se publica bajo el arbol de artefactos. El receipt adyacente, stdout y el fichero
create-only fresco deben ser byte-identicos y no superar inclusivamente 64 MiB.
Hardlinks, symlinks, junctions/reparse points, sustituciones o drift de identidad
fallan cerrados.

El receipt usa schema `trace.evidence_verification.v2` y policy
`physical_map_sidecar_source_and_native_trace_exact_recomputation_v3`. Liga
roles relocatables, bytes/SHA-256 de index, MAP y sidecar MAP v2, todos los
targets seleccionados, descriptor y source fisico de cada target, primario
TRACE, multiset/digest de evidencia, bindings nativos y los contratos TRACE v2.
Su `receipt_digest` emplea framing de longitudes de 64 bits. La ausencia de un
target, evidencia adicional, binding inventado, binario stale o cambio fisico
durante el replay falla cerrado para todos los lenguajes, no solo para
Python/Vyper.

Solo ese receipt v2/policy v3 puede acreditar al productor para una decision
dependiente de TRACE. Un primario suelto sin `index.json`, un indice sin receipt,
un receipt v1 o un estado de verificacion desconocido puede conservarse como
diagnostico/revision, pero nunca autoriza una decision terminal de FILTER ni
`product_health` limpio.

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

## Perfil de analisis y signal origins

Cada indice y primario actual sella un `analysis_profile`:

- `compatibility` conserva canales estructurales, reglas genericas y senales de
  compatibilidad existentes;
- `generic_blind` admite solo hechos estructurales y reglas tipadas y elimina
  de todos los canales puntuados cualquier senal con origen `known_pattern`.

La capability `trace.signal_origins.v1` liga cada mismatch, invariante candidato
y prioridad publicada a uno de tres origenes cerrados:
`structural_generic`, `generic_rule` o `known_pattern`. En `generic_blind`, una
entrada `known_pattern`, un ledger ausente, extra, reordenado o incoherente
invalida el artefacto. `candidate_bug_patterns` debe ser la proyeccion exacta de
los mismatches admitidos; no existe un catalogo paralelo que pueda reintroducir
los patrones excluidos.

El perfil controla procedencia dentro del producto. No demuestra que el host
carezca de acceso a un oracle, ni que el resultado generalice a protocolos
nuevos; esa afirmacion necesita una frontera y un holdout independientes.

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

Cuando el modo orquestado permite una seleccion vacia, `index.json` declara
`selection.status=empty_allowed` y un `empty_reason` cerrado:
`no_targets_requested` cuando el filtro no selecciona ningun target logico o
`all_targets_rejected` cuando todos fallan la admision anterior al presupuesto.
Esa salida permite continuar con un fallback tipado y observable, pero sigue
siendo deuda de cobertura y nunca demuestra ausencia de vulnerabilidad.

La seleccion completa usa el contrato cerrado `trace.batch_selection.v3`; v1 y
v2 quedan solo como entradas diagnosticas y nunca son limpias ni aptas para
release. V3 liga el SHA-256 fisico de `audit_map.json`, filtros canonicos, un
outcome por identidad MAP unica, el orden elegible total, todos los elegibles
como seleccion fisica, cada SHA-256 de source y todos los contadores. Los
rechazos anteriores a la elegibilidad usan un enum cerrado:
`invalid_target_identity`, `non_production_source`,
`source_binding_unresolved` o `source_unresolved`. V3 prohibe
`target_budget_omitted`: `--top` limita solo el prefijo profundo, no targets.
Duplicados MAP exactos no son deuda: se sellan por separado en
`duplicate_collapses`, mientras los overloads conservan identidades fuertes
distintas. Un gap fisico no vacio siempre es deuda. `empty_allowed` tambien es
deuda aunque no emita evidencia TRACE.

El subcontrato `trace.batch_deep_enrichment.v1` sella el prefijo exacto de
analisis profundo y un inventario completo deep/compact. Cada `trace.v0.9`
publica `trace.batch_target_enrichment.v1`, ligado a identidad y rank fisicos.
`compact` conserva source y contexto MAP autoritativos, pero declara que el
analisis profundo no se materializo. Esa declaracion es
`bounded_non_authoritative`: no es deuda de cobertura, no prueba ausencia y no
puede alimentar inferencia negativa.

La evidencia fisica sigue una matriz cerrada. Un target `compact` publica
exactamente un `physical_source_binding` nativo y no publica
`python_function_binding` ni `vyper_function_binding`. Un target deep sobre
`.vy` publica exactamente un `vyper_function_binding`; uno deep sobre `.py`,
exactamente un `python_function_binding`. Mezclar bindings de lenguaje, omitir
el binding exigido o usar el binding de otro lenguaje falla cerrado.

Los filtros sellados son exactamente `levels`, `top` e `include_tests`; este
ultimo forma parte de la autoridad porque cambia que fuentes pueden entrar. Los
consumidores no confian en el motivo publicado por TRACE: reabren MAP y source,
recalculan existencia, binding, politica production/test y admision Vyper
`@external`, y reconstruyen `priority_diversity_total_order_v1`. Por ello ni un
rechazo autosellado falso ni un prefijo reordenado pueden ocultar un target
fisicamente elegible, incluso cuando MAP supera 100 MiB.

El indice sella la membresia exacta: ranks continuos, rutas relativas seguras,
companions `.json`/`.md`/`.txt`, contadores y estado de seleccion deben
reconciliar con disco. VALIDATE y FILTER verifican su hash como metadata; no lo
incluyen entre los schemas de evidencia `trace.v0.9`.

### Contrato TRACE -> consumidores

Toda salida batch actual incorpora en `index.json` el manifiesto obligatorio
`trace.contract_manifest.v2`. Su array `targets` tiene el mismo orden y
membresia que el indice y liga cada target a `trace_json`, bytes/SHA-256 del
primario, `trace.coverage_ledger.v1`, el receipt
`economic_route_graph_consumption.v1` y, cuando existe, el conjunto indivisible
de clausura, evaluaciones y autoridad target-route v2. No se admite una pareja,
capability o digest a medias.

El agregado reconcilia `target_count`, targets y receipts con deuda, la union
ordenada de roots observados, consumidos y omitidos, autoridades target-route,
claims exactos/review-only y los contadores separados
`target_route_coverage_debt_authorities` y
`target_route_incomplete_authorities`. Estos dos ultimos describen la
representacion semantica y no se mezclan con deuda operacional de coleccion.
`manifest_digest` usa framing content-addressed `trace-contract-manifest-v2`
sobre el JSON canonico sin ese campo. Las claves de cada objeto se ordenan por
sus bytes UTF-8 (no por el orden UTF-16 por defecto de JavaScript) y cada parte
del content address se enmarca con su longitud `u64` big-endian. Un golden
compartido Rust/Node, con Unicode compuesto, no ASCII, CJK, cirilico, una clave
U+E000 y emoji no-BMP, fija tanto la serializacion como el SHA-256 y evita que
los verificadores diverjan silenciosamente. Core, DISCOVER, VALIDATE, FILTER y el gate de Deploy reabren los
primarios declarados, comprueban bytes/SHA-256, comparan ledger y receipt inline
y recalculan agregados y digest. Un target ausente o extra, path intercambiado,
hash stale, contrato inline distinto o resumen coherente solo en apariencia
falla cerrado.

El target del primario conserva obligatoriamente identidad MAP suficiente:
`id`, `qualified_name`, `component`, `file` y `line_start`. Su `id` publicado es
exactamente el `map_function_id` seleccionado por `trace.batch_selection.v3`;
IDs locales del parser como `fn_*` permanecen dentro del call graph y no pueden
reemplazarlo. Los consumidores resuelven esa identidad primero contra el
`audit_map.json` autoritativo y su manifiesto de funciones completo. El slot
top-level `solguard_map_context` esta separado y presente, aunque su valor puede
ser `null`: solo corrobora MAP. Cualquier `function_id` o lista `functions`
declarada debe confirmar la misma identidad. Un contexto forjado, un componente
vacio o una identidad duplicada impiden una decision terminal.

Los cinco receipts acotados de la linearizacion legacy de deep paths dejan de
ser cobertura semantica solo cuando el target tiene una clausura factorada
completa, sin deuda y con roots no vacios, y ambos consumidores publican una
evaluacion graph-native completa e independientemente recomputable. El campo
`factorized_graph_evaluations` contiene exactamente dos receipts
`trace.factorized_graph_evaluation.v1`: perfil
`causal.factorized_structure_and_guard_lattice.v1` y perfil
`economic.factorized_operation_consistency.v1`. Ambos ligan el mismo
`graph_digest`, proyeccion, `root_ids`, inventarios, contadores y digests de
resultado/evaluacion. Su `semantic_resolution` puede ser `exact` u
`over_approximation`: ambas acreditan consumo completo del espacio MAY, pero la
segunda no acredita exactitud, MUST ni ausencia. En ese caso el target publica
`trace.materialization_diagnostics.v2` con la clasificacion
`non_authoritative_legacy_linearization`. `index.json` publica entonces
`trace.materialization_manifest.v2`: un subset de membresia exacta, ordenado y sin bindings
inventados, compuesto solo por los targets que tienen esos diagnosticos. Cada
binding conserva target/path/root IDs, bytes/SHA-256 del primario, digest de los
diagnosticos y su objeto completo. `semantic_authority` enumera el graph receipt,
ambos consumers y `trace.v0.9.target_evidence`. Si falta una evaluacion, existe
deuda/omision o cualquier digest deriva, los receipts permanecen en
`trace.coverage_ledger.v1`; la omision no puede lavarse como diagnostico.
El manifiesto queda ausente (o puede leerse como `null`) exactamente cuando
`diagnostics_count=0`; si existe al menos un diagnostico, es obligatorio y su
membresia debe coincidir exactamente con ese subset.

El contrato target-route es independiente de esa linearizacion. Para cada
target deep con CFG autorizado, TRACE publica conjuntamente
`trace.target_route_closure.v2`, dos `trace.target_route_evaluation.v2`
(causal y economic) y `trace.claim_authority.v2`. La clausura conserva
identidades MAP/CFG, nodos, aristas, calls, evidencia, fixpoints MAY/MUST y deuda
de representacion. Solo una clausura exacta, completa y sin deuda puede elevar
claims; `over_approximation`, `incomplete` o `coverage_debt` quedan
`review_only`, con MAY/MUST/negative desautorizados segun corresponda. Es
distinto de `trace.claim_authority.v1`, que VALIDATE y FILTER publican despues
para justificar una decision concreta.

Fuera de esa excepcion cerrada, toda coleccion acotada publica un receipt tipado
unico por `{producer,collection}`. Debe cumplirse
`observed = retained + omitted`, `truncated = (omitted > 0)` y el receipt
conserva limite de items/bytes, orden de seleccion determinista y motivo. Un
`take`/`truncate` silencioso, un recorrido de grafo detenido a profundidad fija
o un receipt limpio tras omitir elementos es deuda contractual, no una
optimizacion invisible. TRACE selecciona primero scopes exactos de target, CFG,
grafo, estado, semantica, tiempo y evidencia y solo despues materializa sus
proyecciones acotadas.

Los consumidores no tienen que materializar un `trace.v0.9` grande para sellar
esta frontera: recorren los campos seleccionados y calculan el hash del archivo
completo desde el descriptor abierto. La identidad declarada por ambos
manifiestos debe referirse a esos mismos bytes. Una sustitucion durante la
lectura, un symlink/reparse point, una ruta que escape del root o una identidad
fisica distinta al reabrir se rechaza en vez de confiar solo en tamano y fecha.
La misma lectura streaming se aplica a un `trace.v0.9` mayor de 100 MiB: extrae
solo los campos contractuales necesarios mientras calcula bytes y SHA-256 del
archivo completo. Un primario grande sigue formando parte del inventario de
autoridad; JSON truncado, datos despues del valor raiz o limites internos
agotados fallan cerrados.

El wire fisico de cada primario debe ser no vacio y tiene un cap inclusivo
comun de 4 GiB. TRACE calcula el descriptor exacto con un writer streaming
acotado y publica sin construir una segunda copia del JSON en memoria. Cada
consumidor compara primero `primary_bytes` con metadata fisica estable; cero,
N+1, mismatch, overflow o drift fallan antes del hash/proyeccion costosos. Los
caps menores de proyeccion retenida son presupuestos de memoria independientes,
no otro formato fisico.

La proyeccion directa conserva schema, target MAP-bound, `evidence_items`, el
slot separado `solguard_map_context`, receipt economico, capabilities, coverage
ledger, evaluaciones factoradas y diagnosticos de materializacion. Recalcula
ocurrencias, IDs unicos, digest multiset y `binding_counts` de evidencia desde
el primario. Enums de productor/coleccion, orden canonico, paridad entre
capabilities, status y deuda, y toda aritmetica de items/bytes son cerrados y
checked. Un campo ausente, truncado, parcial, duplicado, overflow o digest
divergente falla cerrado; no existe autoridad de sidecar TRACE.

Core aplica esta frontera mediante proyecciones serde especificas para cada
consumidor. Los campos no consumidos se recorren y hashean pero no se retienen
como un `Value` raw; la proyeccion materializada tiene un techo sellado de 64
MiB. El descriptor, metadata, identidad fisica, root y path canonicos se
comparan antes y despues de parsear. Por tanto, superar 100 MiB no elimina el
primario de TRACE ni concede autoridad a un sidecar: hash, bytes y contrato
siguen procediendo del fichero completo, y overflow de proyeccion o drift TOCTOU
fallan cerrados.

El MAP fisico consumido por TRACE tiene limites de seguridad independientes:
256 MiB de bytes, 192 MiB acumulados de datos retenidos y 8 MiB para cualquier
string o miembro de array retenido. El cap fisico se comprueba antes del hash y
la proyeccion se obtiene en dos pasadas sobre el mismo handle. Estos limites no
son el umbral de observabilidad inline de 96/100 MiB.

El descriptor no basta por si solo: cada directorio padre lexico desde el root
se comprueba con `lstat` e identidad fisica antes y despues de la lectura. Un
symlink, junction/reparse point o cambio de padre falla incluso cuando resuelve
a otra ruta situada dentro del mismo root.

FILTER y el gate de Deploy comparten la politica cerrada
`trace.evidence_authority_paths.v1`. Solo inventarian arrays `evidence_ids`
canonicos en bindings de actor/autorizacion y sus route steps, semantic-context
flows, identity-completeness fields, atomicity boundaries/operations, semantic
finding surfaces/chains, deep-path edge evidence, causal/temporal stages,
evidencia economica tipada y `evidence_items`. No cuentan aliases arbitrarios,
un `evidence_ids` top-level, target/path/assembled, `solguard_map_context`,
`trace_claim_authority` ni texto libre. El inventario ordena/deduplica y aplica
presupuestos de 2.000.000 nodos JSON, 250.000 ocurrencias, 100.000 IDs unicos y
16 MiB de bytes de identidad. Un binding puede reclamar un ID solo si aparece
en el mismo primario ligado por path y SHA-256; un ID inventado o presente solo
en otro target no concede autoridad.

Dentro de esas rutas, el namespace tambien es cerrado: solo
`trace-evidence-v1-<64hex>` y `trace-auth-<64hex>` conceden autoridad TRACE.
Identidades `ev-*`, `source-*`, `native-source-*` o `symbol*` copiadas desde
MAP/source conservan esa procedencia; su posicion dentro de un JSON TRACE no
las renombra. Las refs tampoco pierden multiplicidad: una referencia generica
debe resolver exactamente una ocurrencia path-bound y una repeticion identica
en el mismo artefacto invalida el claim.

Cada `evidence_items[*]` publica exactamente un
`trace-evidence-v1-<sha256>`. Los consumidores recomponen el framing
`trace.evidence_item.v1`: nombre, qualified name, componente, archivo y rango
del target, seguidos de kind, source, archivo, linea y detail normalizado del
item, todos con longitud big-endian de 64 bits. Cambiar cualquiera de esos
campos o reemplazar el ID por un re-sellado arbitrario invalida la autoridad,
con independencia del tamano del primario.
Ademas, cada item declara `source=solguard-trace`. Evidencia MAP no entra
en este ledger: permanece bajo `solguard_map_context.evidence` con su procedencia
MAP y nunca se convierte en corroboracion TRACE por estar copiada en el mismo
documento.

### Consumo del grafo economico

Cuando MAP publica `economic_route_graph.v1`, TRACE valida el wire completo y
selecciona para cada target la clausura transitiva de sus roots sin enumerar
combinaciones de alternativas. Cada trace publica un recibo
`economic_route_graph_consumption.v1` con `scope=root_closure`; `index.json`
publica el agregado union-deduplicado. Un target que no es root conserva un
recibo explicito de cero items, no una omision silenciosa.

El recibo copia digest, identidad, estado y deuda upstream de MAP, y separa
omision local de `semantic_resolution=over_approximation`. Esta ultima permite
razonamiento may, pero no una ruta v2 exacta ni evidencia de ausencia. Digest
distinto, referencia desconocida, shape no canonico o deuda local hacen fallar
cerrado el contrato TRACE -> consumidores.

La resolucion agregada se calcula unicamente sobre los roots elegidos para ese
target y sus fragments transitivos deduplicados. Un root exacto no hereda la
over-approximation de otro root no seleccionado. Una over-approximation dentro
de su propia clausura conserva cobertura completa si no hubo omision, pero
reduce la autoridad a MAY y bloquea cualquier materializacion exacta/MUST.

### Evidencia source-local Vyper

`vyper_source_evidence.v1` extrae guards `assert`/revert, reads y writes
`self.*`, llamadas internas y efectos `transfer`, `send`, `raw_call`,
`extcall` y create con fichero/linea. Los eventos `log` tambien quedan
localizados, pero no se cuentan como escritura economica ni movimiento de
valor. La admision excepcional de un `.vy`
bajo un unico segmento `example` o `examples` exige entrypoint MAP exacto,
archivo canonico dentro del root y decorador `@external` en la declaracion.
No abre tests, fixtures, mocks, vendor ni generated.

## Binding de autorizacion por actor

TRACE puede emitir `trace.actor_authorization_binding.v1` cuando reconstruye
una ruta source-backed completa que enlaza el caller, el subject seleccionado,
el owner y spender de allowance, el amount, el recipient y los efectos finales
sobre subject y valor. La regla semantica estable es
`authorization.caller_must_match_subject_or_allowance_spender`.

El binding conserva superficies, pasos ordenados, expresiones resueltas,
evidence IDs y una resolucion `satisfied` o `violated`. Solo una relacion
`violated` y `resolved` puede abrir una hipotesis posterior. Una ruta
incompleta, un guard que liga caller y subject, o un allowance cuyo spender es
el caller no se presenta como violacion. TRACE sigue aportando evidencia: no
emite por si mismo un finding soportado.

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

Para un target Solidity deep, TRACE no parsea solo el archivo seleccionado. A
partir de las aristas MAP resueltas `internal_call`, `direct_call`,
`external_call` y `library_call`, obtiene los simbolos participantes y construye
una clausura cross-file de sus ficheros Solidity. Un simbolo ligado por MAP a
dos ficheros distintos es ambiguo y falla cerrado.

La clausura tiene limites inclusivos y verificables:

- 256 ficheros y 32 MiB por proyecto Solidity deep;
- cache LRU de 16 proyectos y 64 MiB de source retenido;
- catalogo fisico global de 65.536 ficheros y 256 MiB;
- 8 MiB por fichero de source.

Cada fichero se abre mediante descriptor estable, se liga por path relativo,
bytes y SHA-256 y se vuelve a verificar al reutilizarlo y al cerrar el batch.
Symlink, reparse point, escape, sustitucion, drift o N+1 en cualquiera de los
presupuestos falla cerrado. Esto restaura contexto de autorizacion e herencia
entre ficheros sin volver a escanear un corpus Solidity ilimitado por target.

Las relaciones `partial` o `unresolved` se conservan como preguntas de revision,
no como llamadas confirmadas.

### Preservación de `economic_flow_identity.v2`

Cuando MAP declara `economic_flow_identity.v2`, TRACE consume y vuelve a emitir
la misma identidad content-addressed. Conserva el `id`, `route_digest`,
`lineage_id`, la lista completa y ordenada de steps, `operation_ids`,
`causal_edge_ids`, `branch_choices` y `asset_legs`. Cada step mantiene también
`source_ordinal` y `branch_path`; TRACE no puede colapsar dos operaciones de la
misma línea ni eliminar la procedencia de rama.

`branch_path` es una secuencia causal única en orden de fuente, exterior a
interior, y no se ordena lexicográficamente. El `event.guard` correspondiente es
el set canónico ordenado y sin duplicados; TRACE reconcilia ambos canonizando
una copia de la secuencia, pero conserva el orden causal publicado.

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

Los IDs `trace-economic-evidence-*` de `economic_checks[].evidence.evidence_ids`
son identidades semánticas del check, no evidencia física. INVARIANT puede
conservarlos únicamente como `source_id`/`source_ids`. Las referencias físicas
proceden exclusivamente de `source_evidence_ids` y deben resolver una autoridad
MAP/TRACE exacta por `{evidence_id,file,line}`; un ID semántico nunca se publica
como `EvidenceRef` ni adquiere autoridad TRACE.

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
