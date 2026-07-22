# 05. SolGuard Invariant

`solguard-invariant` convierte evidencia estructurada de MAP/TRACE y,
opcionalmente, invariantes sintetizadas por ECONOMIC, en propiedades tipadas que
deberian mantenerse.

No detecta bugs por si sola. Define que propiedad es aplicable, sobre que scope,
con que evidencia y que condicion de ruptura debe evaluarse.

## Inputs

Obligatorios:

- `--map <audit_map.json>`
- `--trace <trace.json | trace directory>`

Opcionales:

- `--knowledge <historical_evidence.json>`
- `--synthesized <synthesized_invariants.json>` repetible
- `--value-model <value_model.json>`
- `--attack-paths <attack_paths.json>`
- `--candidates <raw_candidates.json>` repetible

## CLI actual

```powershell
cargo run --locked -- `
  --map solguard-output/audit_map.json `
  --trace solguard-trace-output `
  --knowledge historical_evidence.json `
  --synthesized solguard-economic-output/synthesized_invariants.json `
  --out solguard-invariant-output
```

Opciones:

| Opcion           | Funcion                                                     |
| ---------------- | ----------------------------------------------------------- |
| `--map`          | MAP JSON.                                                   |
| `--trace`        | TRACE JSON o carpeta.                                       |
| `--knowledge`    | Evidencia historica tipada. Opcional.                       |
| `--synthesized`  | Invariantes generadas por ECONOMIC. Repetible.              |
| `--value-model`  | Modelo VALUE usado como contexto advisory. Opcional.        |
| `--attack-paths` | Rutas VALUE usadas como contexto advisory. Opcional.        |
| `--candidates`   | Candidatos ligados al refinement. Repetible.                |
| `--out`          | Directorio de salida. Default: `solguard-invariant-output`. |

## Salidas

Schema:

```text
invariant.v0.8
```

Archivos:

- `invariants.json`
- `invariants.coverage.json`
- `invariants.md`
- `summary.txt`

El root de salida debe no existir. El productor escribe los cuatro archivos en
un directorio staging hermano y publica el bundle completo con un unico rename
create-only. Una colision con un root existente, aunque este vacio o contenga
una pasada incompleta, falla cerrada sin modificarlo. Por tanto, cada root
publicado pertenece a una sola ejecucion y no puede mezclar archivos viejos y
nuevos.

`invariants.coverage.json` liga el primario, su `stage_coverage.v1`, bytes,
SHA-256 streaming y conteos materializados. Solo sustituye la lectura completa
para observabilidad cuando el primario excede el limite de parseo; nunca
sustituye evidencia de una invariante.

Cada invariante conserva hasta 8.192 referencias de evidencia y 8.192 IDs de
procedencia tras deduplicacion determinista. Alcanzar exactamente el limite es
completo; la primera identidad omitida genera `coverage_debt` con contadores
observed/retained/omitted, no un recorte silencioso.

La procedencia semantica y la evidencia fisica permanecen separadas. Un
`trace-economic-evidence-*` recibido en
`economic_checks[].evidence.evidence_ids` identifica el check y se conserva
solo en `source_id`/`source_ids`. Los `EvidenceRef` se construyen exclusivamente
desde `source_evidence_ids` y cada ID debe resolver exactamente la autoridad
MAP/TRACE `{evidence_id,file,line}`. Un ID semantico no localizado no puede
autorizar una invariante ni convertirse en evidencia TRACE.

Core puede crear la vista de transporte `invariant.bounded_runtime.v1` con un
maximo de 8.192 invariantes source-exact y 256 MiB de objetos retenidos,
seleccionados mediante `candidate_attack_path_anchor_score_v1`. Esa cifra no es
el limite del fichero: el sobre JSON completo tiene un cap independiente de
335.544.320 bytes y debe declarar exactamente
`summary.max_runtime_artifact_bytes=335544320`. Core comprueba los bytes
serializados antes de publicar la vista; VALIDATE y FILTER comprueban el tamano
fisico antes de cargarla y rechazan cualquier drift del campo.

La vista liga path canonico, schema, bytes, SHA-256 y coverage ledger del
`invariant.v0.8` original. Los objetos retenidos y las relaciones cuyos dos
extremos estan retenidos se rehidratan desde ese primario, nunca desde campos
compactos. `invariant.selection_manifest.v1` recompone desde los dos inputs
fisicos el inventario completo de invariantes y relaciones, el orden de ranking,
los hashes de cada objeto seleccionado, los limites y los anchors. Una relacion
con un extremo inexistente, un contador incoherente, overflow de aritmetica
checked o sustitucion del manifest invalida la vista y falla duro antes de
evaluar. Invariantes y relaciones participan juntas en el limite de
materializacion.

Una deuda bounded coherente se cuantifica mediante
`omitted_anchor_occurrences`, `omitted_evidence_occurrences` y
`omitted_relationships`; este ultimo incluye relaciones que cruzan la frontera
retained/omitted. Cualquier contador positivo conserva un diagnostico valido,
pero obliga a que todos los resultados VALIDATE sean `inconclusive`, con la
razon cerrada correspondiente:
`bounded_invariant_anchor_coverage_debt`,
`invariant_evidence_coverage_debt` o
`bounded_invariant_relationship_coverage_debt`. FILTER debe publicar su output
estructural, pero sin ningun resultado terminal de admision.

Si la materializacion exacta no cabe, `retained_objects_verified=false` aplica
la misma regla global y exige vectores de invariantes/relaciones vacios. Un
source ausente, externo, symlinked, inestable o divergente invalida la vista;
no se representa como deuda coherente.

En los outputs downstream, `metadata.source_hashes.invariants` sella siempre el
artefacto runtime realmente consumido y
`metadata.source_hashes["invariants:source"]` sella siempre el primario
inmutable seleccionado. En modo directo ambos hashes son iguales; con la vista
bounded deben ser distintos. Una etiqueta ausente, adicional o stale falla
cerrada.

La frontera de transporte no confia en un `stat` previo. INVARIANT lee y hashea
sus JSON desde un unico descriptor regular con techo de bytes y vuelve a
comparar identidad fisica y path al terminar; el traversal TRACE queda
confinado al root canonico y rechaza symlinks. Core, VALIDATE y FILTER aplican
la misma disciplina al source y a la vista bounded, incluidos reparse points,
escapes, sustituciones y cambios entre la apertura y el EOF. El sidecar de
cobertura se lee con un maximo de 100 MiB; Core puede usarlo por encima de 96
MiB y el gate de Deploy mantiene 100 MiB como limite inline. Estas
comprobaciones cierran la admision de evidencia ante una carrera TOCTOU
detectable; no convierten una vista parcial en evidencia completa.

## Pasada inicial, refinement y seleccion

En el pipeline de Core, la pasada inicial se publica en
`tool-outputs/invariant/` y la pasada enriquecida con `--candidates` en
`tool-outputs/invariant-candidate/`. Ambos roots son permanentes, no se
reutilizan ni se renombran, y sus cuatro archivos de productor son inmutables:
el refinement no reemplaza ni consume destructivamente el bundle inicial. Si
hace falta transporte bounded, Core crea
`tool-outputs/candidates/bounded_invariants.json` para la pasada inicial o
`tool-outputs/invariant-candidate/bounded_invariants.json` para la candidata;
cada vista queda hash-bound al primario seleccionado y tampoco se mueve tras
sellarse.

Core, no el CLI `solguard-invariant`, publica de forma create-only
`tool-outputs/invariant-selection.json`. `invariant.selection.v1` contiene
exactamente `schema_version`, `tool_version`, `reason`, `initial`, `selected` y
`candidate_attempt`; `initial` y `selected` contienen exactamente
`primary_path` y `sha256`, mientras `candidate_attempt` contiene exactamente
`status`, `primary_path`, `sha256` y `error`.

Hay dos estados validos:

- `candidate_enriched`: `selected` liga el primario candidato,
  `candidate_attempt.status=selected`, su SHA-256 coincide con `selected` y
  `error=null`.
- `initial_fallback`: `selected` es identico a `initial`,
  `candidate_attempt.status=failed`, `sha256=null` y `error` es un string no
  vacio.

El path candidato permanece siempre
`invariant-candidate/invariants.json`; todos los paths son relativos a
`tool-outputs` y usan `/`. Antes de seleccionar el candidato, Core valida el
bundle exacto de cuatro archivos, primario y coverage hash-bound, cobertura
completa sin deuda, capability `candidate_derived_invariants` y el hash exacto
de `candidates:0`. Candidate binding, VALIDATE, FILTER, el funnel y
`AnalyzeOutputs.invariant_dir` usan el mismo bundle `selected`. Un refinement
fallido conserva el inicial como fallback explicito, pero marca CANDIDATES
`completed_with_errors`; no representa una ejecucion limpia.

## Catalogo

El catalogo v0.8 cubre familias como:

- conservacion de assets;
- consistencia shares/assets;
- solvencia;
- deuda/collateral;
- rewards;
- fees;
- backing de supply;
- validez temporal y transiciones;
- frescura de permisos;
- binding cross-chain;
- ejecucion de gobernanza;
- assumptions externas;
- disponibilidad.

### Autorizacion por actor

Un binding TRACE `trace.actor_authorization_binding.v1` solo se materializa si
esta `resolved`, su status es `violated`, la regla es exactamente
`authorization.caller_must_match_subject_or_allowance_spender` y la ruta
contiene las cuatro superficies source-backed exigidas. INVARIANT lo representa
como familia `permission_freshness`, predicado tipado
`actor_authorization_binding` y operador
`caller_matches_subject_or_allowance_spender`.

El scope conserva por separado caller, subject, allowance owner/spender,
amount y recipient. Un binding satisfecho, una ruta incompleta o evidencia sin
ubicacion exacta no crea una invariante resuelta. Esta propiedad formaliza una
obligacion aplicable; VALIDATE sigue siendo la autoridad del veredicto.

## Determinismo

Los IDs de invariantes dependen de:

- familia;
- version de regla;
- predicado normalizado;
- scope normalizado.

No dependen de timestamps, paths absolutos, orden de evidencia, confianza ni
version de herramienta.

## Knowledge historico

`--knowledge` solo puede alimentar invariantes si el conocimiento ya esta
normalizado con familia, predicado, scope y version de regla. Texto legacy o
similitud textual se conserva como fuente omitida; no crea reglas nuevas.

En el pipeline `v0.8`, el historical retrieval real se difiere hasta despues de
VALIDATE. Por defecto, `historical_evidence.json` es un placeholder
pre-validacion y no debe introducir propiedades nuevas. El enriquecimiento
historico post-candidate sirve para explicar y comparar resultados ya
validados, no para modificar `invariants.json`.

## Limites

- No ejecuta codigo.
- No usa SMT.
- No confirma explotabilidad.
- Una condicion de ruptura es una forma tipada de evaluar una hipotesis, no un
  finding.
