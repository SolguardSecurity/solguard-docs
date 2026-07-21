# 06. SolGuard Validate

`solguard-validate` evalua candidatos canonicos contra invariantes tipadas y
evidencia estatica de MAP/TRACE/DISCOVER/ECONOMIC.

Es la primera herramienta que produce veredictos estaticos autoritativos, pero
no confirma explotabilidad ni impacto material por ejecucion.

## Inputs

Obligatorios:

- `--candidates <canonical_candidates.json | validation_candidates.json>`
- `--invariants <invariants.json | invariant.bounded_runtime.v1>`
- `--map <audit_map.json>`
- `--trace <trace.json | trace directory>`

Opcionales:

- `--discover <discover output dir | protocol_model.json>`
- `--economic <economic output dir | economic_model.json>`
- `--evidence-artifact <json>` repetible

## CLI actual

```powershell
cargo run --locked -- `
  --candidates canonical_candidates.json `
  --invariants solguard-invariant-output/invariants.json `
  --map solguard-output/audit_map.json `
  --trace solguard-trace-output `
  --discover solguard-discover-output `
  --economic solguard-economic-output `
  --out solguard-validate-output
```

## Salidas

Schema:

```text
validation.v0.8
```

Archivos:

- `validation_results.json`
- `validation_results.md`
- `summary.txt`

Dentro del pipeline, el input autoritativo es exclusivamente
`tool-outputs/candidates/validation_candidates.json`. Debe usar schema
`canonical_candidates.v0.8`, ser un subconjunto semanticamente identico del
inventario final `canonical_candidates.json` y contener solo estados
`ready_for_validation`, `lead_promoted_exact` o `lead_promoted_partial`.
`lead_unvalidated` y cualquier candidato cortado permanecen fuera aunque se
conserven en una proyeccion manual no autoritativa.

## Veredictos

`result` puede ser:

- `supported`
- `refuted`
- `inconclusive`

`finding_class` puede ser:

- `supported_finding`
- `review_queue`
- `reviewable_lead`
- `non_finding`

Regla operativa dentro de SolGuard:

```text
finding soportado por contrato estatico = result supported + finding_class supported_finding
```

La salida cubre exactamente la cohorte de entrada: IDs no vacios, normalizados
y unicos, sin faltantes ni adicionales. La pareja `result/finding_class`, los
contadores del summary y `trace.claim_authority.v1` deben ser coherentes. Un
`supported` desnudo, un claim TRACE terminal sin autoridad `exact` o una
reutilizacion del mismo ID con otro cuerpo son contratos invalidos, no findings
ni resultados recuperables.

Si recibe `invariant.bounded_runtime.v1`, VALIDATE no confia en la proyeccion
por si sola. Antes de deserializar exige que el fichero no supere 335.544.320
bytes y que declare exactamente
`summary.max_runtime_artifact_bytes=335544320`. Reabre el `invariant.v0.8`
ligado, exige path local canonico y regular, verifica schema, bytes y SHA-256,
reconstruye los objetos retenidos y las relaciones entre IDs retenidos, y
reconcilia coverage y contadores. Los 8.192 objetos y 256 MiB limitan la
seleccion materializada, no el sobre JSON completo.

`metadata.source_hashes.invariants` sella siempre el artefacto runtime recibido
por `--invariants`; `metadata.source_hashes["invariants:source"]` sella siempre
el primario `invariant.v0.8` seleccionado. Ambos labels son obligatorios y se
reconcilian con `metadata.invariant_runtime`: son iguales en modo directo y
distintos en modo bounded. Missing, extra, hash no canonico o stale invalida el
contrato posterior.

Metadata-only, source ausente/symlinked/inestable o un hash divergente invalida
el input. VALIDATE recompone ademas `invariant.selection_manifest.v1` desde el
source y `value/attack_paths.json` fisicos: inventarios completos, endpoints de
relaciones, anchors, ranking, orden, hashes y seleccion deben ser exactos. Una
omision de anchors o un manifest autosellado divergente falla cerrado.

En cambio, `retained_objects_verified=false` puede describir una
vista bounded autentica cuya materializacion exacta —incluidas relaciones— no
cabe en el limite: es deuda diagnostica, no soporte. VALIDATE fuerza los
resultados afectados a `inconclusive`, FILTER no puede admitirlos como `pass` y
release no puede quedar limpio. En modo
directo `retained_objects_verified` debe ser `true`. En el modo bounded
`false`, el inventario de IDs ya verificado se conserva por separado y los
vectores de invariantes/relaciones entregados al motor quedan vacios. En modo
`true`, IDs, contadores, orden, objetos y extremos de relaciones deben coincidir
exactamente; cualquier drift invalida el input antes de evaluar candidatos o
reclamar salud de release.

Cuando `--trace` es un batch, `index.json` es metadata sellada y
`trace.contract_manifest.v1` es obligatorio. VALIDATE exige un binding en el
mismo orden por cada `trace.v0.9`, rehashea sus bytes, compara el
`trace.coverage_ledger.v1` y el receipt de route graph inline y vuelve a
calcular el digest y los contadores agregados. Si el receipt agregado autoriza
una clausura factorada completa y sin deuda, con resolucion `exact` u
`over_approximation`, tambien exige que
`trace.materialization_manifest.v1` sea exactamente el subset de targets con
`trace.materialization_diagnostics.v1` y que cada diagnostico quede ligado al
mismo primario. Esta admision solo acredita cobertura MAY: VALIDATE conserva
`over_approximation` y no la convierte en exactitud, MUST o evidencia de
ausencia. La linearizacion bounded no puede sustituir la autoridad del grafo.

Estas lecturas son acotadas y quedan ligadas al descriptor y a la identidad
fisica del fichero dentro del root declarado. Paths inseguros, symlinks o
reparse points, un target extra/ausente, una sustitucion concurrente o cualquier
cross-hash stale invalidan el input completo. Una seleccion TRACE
`empty_allowed` valida sigue produciendo cobertura incompleta y resultados
`inconclusive`; nunca soporte o refutacion por ausencia.

La admision limpia exige `trace.batch_selection.v3`; versiones 1 y 2 son
diagnosticas y no pueden autorizar una decision terminal limpia. VALIDATE reabre
el MAP y el source fisicos, recompone la identidad de cada target, el universo
completo, los duplicados, el orden elegible y el inventario fisico completo, y
verifica que cada descriptor selle los bytes source reales. Un receipt
autosellado no puede inventar, ocultar ni reordenar targets.

En v3, `--top` limita unicamente el subcontrato
`trace.batch_deep_enrichment.v1`. VALIDATE verifica tambien cada marcador
`trace.batch_target_enrichment.v1`; un target compacto conserva autoridad
fisica, pero su omision profunda es no autoritativa y nunca evidencia negativa
ni deuda de cobertura.

Cada resultado publica `trace.claim_authority.v1`. Para una decision que no usa
TRACE, `decision_authority=not_used` y `claim_quantifier=none` solo son
coherentes cuando tanto el resultado como su candidato canonico hash-bound
carecen de dependencia TRACE. El `primary_evidence_source` y todas las
referencias del candidato se incluyen en esa comprobacion; VALIDATE no puede
lavar un candidato TRACE como source/MAP-only. Cuando existe dependencia, los
bindings cubren exactamente los paths, hashes, receipts, roots e IDs de
evidencia usados. FILTER vuelve a exigir que cada ID figure en un array
estructurado `evidence_ids` del mismo primario TRACE hash-bound; no acepta texto
ni IDs presentes solo en otro target. Solo `exact` sin deuda permite una decision terminal;
`may_only`, targets no ligados o una identidad MAP incompleta permanecen
inconclusos para FILTER.

Solo los namespaces nativos `trace-evidence-v1-<64hex>` y
`trace-auth-<64hex>` pueden satisfacer esa frontera. Un ID `ev-*`,
`source-*`, `native-source-*` o `symbol*` copiado conserva autoridad upstream y
no se convierte en TRACE. Las referencias genericas deben resolver una sola
ocurrencia path-bound; duplicar la misma pareja artefacto/ID invalida el claim
en vez de perder multiplicidad durante la deduplicacion.

## Criterio de `supported`

Requiere evidencia estatica positiva:

- invariante aplicable;
- break condition tipada;
- root cause, trigger e impact en flujo compatible;
- aristas criticas resueltas;
- state transition o delta economico demostrable;
- target externo/callback/proxy resuelto cuando aplica;
- token semantics resuelta si afecta al path economico.

VALIDATE tambien puede soportar patrones deterministas de alta precision cuando
la fuente es local, la cadena causal esta resuelta y la familia esta
explicitamente gateada. En `v0.8`, esto incluye el caso
`authorization_validation.return_value_enforced`: un check de rol devuelve un
booleano, el valor no se hace efectivo antes de una funcion privilegiada y la
evidencia enlaza source fingerprint, superficies root/trigger/impact y pasos
criticos resueltos. Esta ruta es general y no debe depender del nombre de un
protocolo concreto.

Para `authorization.caller_must_match_subject_or_allowance_spender`, VALIDATE
solo reconcilia el candidato agregado `actor_authorization_binding` con una
invariante `permission_freshness` que tenga la misma regla semantica, predicado
tipado y scope resuelto. Las dimensiones caller, subject, allowance
owner/spender, amount y recipient deben proceder del binding TRACE exacto y
coincidir con las superficies causales del candidato. Una regla distinta,
evidencia heuristica, un binding satisfecho o un scope contradictorio permanece
`inconclusive`; no se relaja el contrato de soporte por similitud textual.

## Criterio de `refuted`

Requiere proteccion positiva, resuelta y en scope exacto:

- guard;
- invalidacion;
- rollback;
- compensacion;
- proteccion antes del impacto.

La ausencia de ruta no basta para refutar.

La proteccion debe pertenecer a una familia aplicable. Revalidar una secuencia o
invalidar un objeto puede refutar una invariante temporal/lifecycle compatible,
pero no una invariante distinta de autorizacion, permiso, contabilidad,
identidad o estructura. VALIDATE conserva ademas cada procedencia TRACE como
`trace:<ruta-relativa-normalizada>` y el SHA-256 de los bytes consumidos; FILTER
usa ese conjunto exacto para la reconciliacion posterior.

## Inconclusos

Todo lo que no tiene soporte/refutacion suficiente queda `inconclusive`.
Cada resultado incluye diagnosticos como:

- `missing_interprocedural_edge`
- `unresolved_external_target`
- `unknown_callback_path`
- `missing_state_transition`
- `missing_balance_delta`
- `unknown_token_semantics`
- `unknown_proxy_implementation`
- `protection_order_unresolved`
- `impact_not_reached`
- `scope_not_resolved`
- `unresolved_preconditions`
- `missing_multi_call_sequence`
- `missing_state_before_after`
- `invariant_break_not_demonstrated`

## Dedupe/ranking

VALIDATE puede deduplicar supported findings exact-scope. Un duplicado soportado
puede degradarse a `review_queue` con razon `deduplicated_supported_finding` para
no publicar el mismo finding varias veces.

Cada finding soportado conserva un `dedupe_group_id` determinista derivado de
invariante, condicion, causa, trigger, impacto, lineas, contexto de flujo y
delta de estado. FILTER trata cualquier ID no vacio como un namespace
autoritativo, incluso si contiene un solo finding: dos grupos distintos no se
pueden volver a fusionar mediante una huella menos precisa aguas abajo.

## Limites

- No genera PoCs.
- No ejecuta tests ni symbolic execution.
- `supported` significa soporte estatico, no explotabilidad confirmada.
