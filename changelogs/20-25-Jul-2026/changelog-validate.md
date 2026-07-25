# Changelog

Este documento registra cambios comprobables de `solguard-validate`. Los
resultados de tests describen contratos y comportamiento fail-closed; no son
evidencia de recall, precision, generalizacion o explotabilidad.

## 2026-07-24: veredicto ligado a MAP, TRACE e INVARIANT físicos

Commit funcional: `b2d4b9141ef950ba8500888a1c85326f776419e0`.

### Qué se ha modificado

- VALIDATE recompone el `EvidenceItem` MAP exacto y solo acepta membresía en los
  paths producer cerrados. Un owner, un documento supplemental o un objeto con
  forma parecida no puede registrar autoridad.
- El consumidor compartido de rutas MAP exige `source_symbol_id` y
  `target_symbol_id` no vacíos en toda arista callable resuelta y rechaza que
  esos endpoints suplanten un ID de evidencia. VALIDATE y FILTER conservan
  bytes exactos del mismo contrato.
- Los artefactos supplemental conservan claims y linaje, pero no heredan ni
  fabrican autoridad MAP/TRACE. Un location forjado o un source ID propio no
  soporta un veredicto.
- La adquisición MAP grande conserva paridad inline/proyectada, detecta
  duplicate keys, sella bytes/hash/identidad y vuelve a comprobar el descriptor
  después de proyectar.
- TRACE separa el límite físico del primario del límite semántico retained,
  valida source-integrity exacto, compact primaries y exact-empty, y conserva la
  aritmética de materialización/selección.
- El input INVARIANT seleccionado se liga físicamente mediante
  `invariant.selection_manifest.v1`; se aceptan confidences fraccionales
  finitas sin convertir rounding en autoridad.

### Por qué

VALIDATE es el primer punto que emite un veredicto. Por ello, una coincidencia
de ID o un artefacto derivado no puede cerrar por sí solo evidencia que MAP o
TRACE no hayan publicado físicamente.

### Evidencia de validación disponible

Se añadieron regresiones de paridad MAP, nested duplicates, TOCTOU,
source-integrity, supplemental laundering, forged locations, exact-empty,
proyección TRACE y selección INVARIANT. Compound `r6` completó VALIDATE y la
evaluación posterior clasificó la fase completa. No es evidencia de precisión
global.

### Límites y riesgos residuales

- Las copias del contrato TRACE siguen requiriendo comparación byte-exacta.
- Doble lectura e identidad reducen TOCTOU, pero no sustituyen CAS/read-only
  mounts.
- Los bounds pueden rechazar artefactos legítimos mayores.
- Los árboles supplemental conservan walkers y límites propios aunque ya no
  puedan autoautorizar evidencia.
- El checker standalone de metadata sigue sin ser un gate demostrado de CI
  remoto.
- `generic_blind` no prueba separación de oráculo ni calidad de detección.
- No existe todavía aceptación 8/8, v1-v8/labs, holdout o CI remoto para este
  árbol sin commit.

## 2026-07-22: paridad física del contrato TRACE antes del prebuild

El primer prebuild de la nueva cadena inmutable se detuvo antes de compilar y
no emitió receipt. La comparación byte a byte encontró que la fuente canónica
de Core tenía 191.980 bytes y las copias de Validate y Discover 191.984 bytes.
El único diff en estos dos consumidores era una aserción que `rustfmt` expresaba
de forma distinta bajo las ediciones 2024 y 2021. La inspección completa
encontró además que FILTER conservaba una copia anterior de 176.486 bytes y
omitía el cierre de señales para `generic_blind`.

En Validate no faltaba esa lógica funcional: el defecto local era de paridad
física. La expresión canónica se reformuló para pasar `rustfmt --check` bajo
ambas ediciones y `src/trace_contract_v2.rs` se resincronizó mecánicamente desde
`solguard-core/crates/solguard-trace-contract/src/lib.rs`. Tras la copia, ambos
ficheros tienen 191.990 bytes y SHA-256
`cfb01f0fa154352acd2400652fbb602fd86ead50bdeb271e9a3911c62fe47241`.

El gate de prebuild compara esta identidad junto con Discover, FILTER y los
vendors de VALUE, ECONOMIC e INVARIANT. El intento fallido no se reutiliza. Esta
corrección demuestra paridad del contrato y bloqueo de deriva; no aporta datos
de recall, precisión, ruido, rendimiento ni generalización.

La validación local de este cambio pasó `rustfmt --check` directo en ediciones
2021 y 2024, `cargo fmt --all -- --check`, Clippy locked con todos los
targets/features, 270 tests sin fallos, build release locked con todos los
targets/features y el gate de metadata autónoma. No se ejecutaron canarios,
benchmarks ni labs.

## 2026-07-21 – 2026-07-22: macroauditoría de autoridad, veredicto y estructura

### Alcance y commits auditados

La base anterior a la ronda es
`25b9a223525c62164ece61da8c9521417070d681`. La ronda de producto termina en
`21d51226a71f58ccec53f205a7327b4467511735`:

- `796e5b9e8cea1f9bc64c24b6820fb8f98b890fa1`: primera separación de
  responsabilidades, autoridad estructurada y selección de invariantes/TRACE;
  14 archivos, 19.705 inserciones y 718 eliminaciones.
- `7bcaec84503179f3f330e8e024b35f9b454aaf92`: autoridad física TRACE, MAP e
  INVARIANT y contratos producer v2; 14 archivos, 8.347 inserciones y 307
  eliminaciones.
- `07b90b1f4eefcb9b59335824c15fa2418a8fe610`: cierre de veredictos,
  publicación transaccional y modularización; 30 archivos, 36.709 inserciones y
  36.507 eliminaciones.
- `562d90fb8f293d3a3dc35c4a56e9638681405cd3`: toolchain y gates CI
  cross-platform bloqueados; 3 archivos, 27 inserciones y 17 eliminaciones.
- `21d51226a71f58ccec53f205a7327b4467511735`: adquisición TRACE manifest-first,
  budgets agregados y perfiles de origen; 14 archivos, 1.250 inserciones y 74
  eliminaciones.

Excluyendo `target/`, se pasó de 8 archivos Rust y 23.213 líneas a 40 archivos
y 51.169 líneas. El máximo bajó de `src/engine.rs` con 16.271 líneas a
`src/trace_contract_v2.rs` con 5.048. La superficie total aumentó por los
verificadores y controles adversariales; no se interpreta como una ganancia de
rendimiento o detección.

### Antes de esta ronda

- `engine`, `input` y la integración principal concentraban decenas de miles de
  líneas en tres archivos y mezclaban adquisición, binding, decisión y tests.
- Los artefactos TRACE y MAP grandes no compartían aún la paridad actual entre
  rama inline y proyección streaming con identidad física estable.
- La vista bounded de INVARIANT no exigía todavía la recomputación completa de
  su source y `invariant.selection_manifest.v1`.
- La autoridad producer TRACE y la autoridad downstream de cada veredicto no
  estaban separadas con los contratos v2/v1 actuales.
- La salida no tenía el actual bundle create-only validado antes de publicar.
- CI no fijaba Rust ni ejecutaba la matriz actual de targets/features en los
  dos sistemas operativos.

### Responsabilidad y frontera terminal

VALIDATE conserva una responsabilidad única: clasificar candidatos canónicos
como `supported`, `refuted` o `inconclusive` contra invariantes y evidencia
física. No admite explotación, no calcula impacto material y no sustituye a
FILTER.

- `supported` exige precondiciones, ruta causal, transición/delta, ruptura
  tipada y ausencia de una protección efectiva con el scope correcto.
- `refuted` exige una contradicción positiva y localizada. Ausencia de evidencia
  o de ruta no se convierte en refutación.
- Cualquier deuda coherente de cobertura o autoridad MAY conserva el registro
  pero fuerza `inconclusive`.
- Inputs alterados, schemas incompatibles, arithmetic overflow, paths inseguros
  o manifiestos incoherentes fallan la ejecución completa en vez de producir un
  veredicto degradado silencioso.

### Entradas obligatorias y suplementos

- Se sellan antes de evaluar: `canonical_candidates.v0.8`,
  `invariant.v0.8` o `invariant.bounded_runtime.v1`, `audit_map.v0.10` y TRACE
  actual.
- Las colecciones top-level autoritativas son obligatorias y no pueden
  desaparecer mediante defaults serde.
- Un suplemento sigue siendo opcional solo mientras no se suministre su flag.
  Una ruta solicitada debe existir y contener JSON admisible.
- VALUE proof, evidencia económica candidata, DISCOVER y otros suplementos son
  evidencia auxiliar, nunca un veredicto. No pueden saltarse la invariante, la
  transición, las precondiciones o las protecciones.

### Adquisición TRACE manifest-first

- Para un directorio actual se abre `index.json` con parser estricto y límite
  de 100 MiB antes de enumerar el árbol o materializar un primario.
- Solo después de extraer rutas seguras y únicas del manifiesto se realiza un
  walker iterativo. La foto física se repite al final y el índice se reabre,
  hashea y compara para detectar membership o manifest drift.
- El árbol se limita a 200.000 entradas, 16.384 directorios, profundidad 32 y
  32 MiB agregados de bytes de path. Symlinks, reparse points, hardlinks,
  padres no regulares y JSON no declarado fallan cerrados.
- El batch admite como máximo 100.000 primarios declarados, 64 GiB agregados de
  bytes físicos y 768 MiB de JSON retenido por este consumidor.
- El preflight estructural limita índice y cada primario a 4.000.000 nodos;
  metadata root se limita a 2.000.000 nodos. `phase.json` tiene cap de 1 MiB y
  `evidence_verification.json` usa su cap físico independiente de 64 MiB.
- Cada primario mantiene el wire cap inclusivo de 4 GiB. El umbral de 100 MiB
  solo selecciona carga inline o proyección streaming; no cambia autoridad.
- La proyección de artefactos grandes conserva target, MAP context, ledger
  nativo, mismatches, invariantes, evaluaciones factorizadas/target-route,
  claims, capabilities y el economic route graph consumido. Campos opacos
  desconocidos no se convierten en evidencia.

### Perfil de análisis y origen de señales

- `metadata.filters.analysis_profile` queda cerrado a `compatibility` o
  `generic_blind` y sellado por `trace.batch_selection` y
  `trace.contract_manifest.v2`.
- Todos los primarios deben declarar el mismo perfil que el batch.
- `generic_blind` exige la capability `trace.signal_origins.v1`, prohíbe
  `known_pattern`, exige paridad exacta de origins para mismatches e
  invariantes y deriva `candidate_bug_patterns` del conjunto exacto de
  mismatches.
- Origins ausentes, adicionales, duplicados, reordenados, stale o re-sellados
  invalidan el contrato. El modo legacy no puede introducir campos origin no
  sellados.
- `metadata.trace_input.analysis_profile`, `summary.txt` y el Markdown hacen el
  perfil observable. Un report que afirma producer v2 sin perfil reconocido
  pierde autoridad terminal.
- Este perfil prueba coherencia de artefactos, no aislamiento de proceso ni
  generalización blind.

### Autoridad TRACE y MAP

- `trace.contract_manifest.v2` se recalcula desde los primarios físicos: graph
  y coverage, evaluaciones factorizadas, target-route closure/evaluations,
  `trace.claim_authority.v2`, cinco receipts de materialización y agregados.
- Producer `trace.claim_authority.v2` y downstream
  `trace.claim_authority.v1` permanecen separados. Un producer correcto no
  decide el veredicto y un claim downstream no sustituye al producer.
- `trace.batch_selection.v3` exige cobertura física completa; `top` limita solo
  el prefijo `trace.batch_deep_enrichment.v1`. V2 queda diagnostic-only.
- `trace.evidence_verification.v2` se trata como metadata root con cap de 64
  MiB y policy v3. Un receipt v1 nunca autoriza una decisión terminal actual.
- TRACE target, roots y receipts se unen contra una única función MAP por
  identidad exacta; `solguard_map_context` solo corrobora.
- MAP inline y >100 MiB comparten la recomputación de
  `map_function_identity_manifest.v1` y del par
  `solguard-coverage-manifest.v2`/`solguard-map-coverage.v2`. El MAP físico se
  limita a 256 MiB, source projection a 64 MiB, inventario CFG agregado a 256
  MiB y cada miembro CFG a 64 MiB.
- `trace.evidence_authority_paths.v1` cierra las rutas JSON que pueden aportar
  IDs. Por primario se aplican 2.000.000 nodos, 250.000 ocurrencias, 100.000 IDs
  únicos y 16 MiB de bytes de identidad.

### INVARIANT bounded

- `invariant.bounded_runtime.v1` es una vista, no evidencia independiente. El
  source `invariant.v0.8` se transmite desde handle estable y se comprueban
  path, parent, identidad, links, bytes, SHA-256 y schema.
- `invariant.selection_manifest.v1` se recomputa con el source y
  `attack_paths.json`: anchors, ranking/bytes, IDs retenidos y endpoints de
  relaciones deben coincidir.
- La selección admite 8.192 objetos y 256 MiB serializados; el sobre completo
  tiene cap separado de 320 MiB y debe declarar
  `summary.max_runtime_artifact_bytes=335544320`.
- `retained_objects_verified=false` es diagnóstico válido solo con vectores
  semánticos vacíos y fuerza todos los resultados a `inconclusive`.
- `source_hashes` contiene exactamente `invariants` para el runtime consumido e
  `invariants:source` para el primario. Son iguales en modo directo y distintos
  en bounded.

### Publicación

- El bundle final contiene exactamente `validation_results.json`,
  `validation_results.md` y `summary.txt`.
- Los tres miembros se escriben con create-new en un staging hermano, se
  validan y se publican con un único rename a un root ausente.
- Un root preexistente bloquea la publicación y queda intacto. Un fallo elimina
  solo el staging privado.
- El JSON conserva todos los resultados, incluidos negativos e inconclusos; el
  Markdown no presenta resultados negativos como hallazgos soportados.

### Modularización

El commit `07b90b1...` hizo una extracción mecánica con estas medidas:

- `src/engine.rs`: 19.699 a 46 líneas, con 12 módulos bajo `src/engine/`.
- `src/input.rs`: 7.645 a 41 líneas, con 8 módulos bajo `src/input/`.
- `tests/validation_engine.rs`: 9.244 a 45 líneas, con 6 módulos bajo
  `tests/validation_engine/`.
- En el estado final ningún archivo Rust supera 6.000 líneas; el mayor es
  `src/trace_contract_v2.rs` con 5.048.

La modularización no cambió schemas o rutas CLI por sí misma. Los cambios de
contrato están identificados por separado arriba.

### CI y verificación ejecutada

El workflow fija Rust `1.96.0`, runners `ubuntu-24.04` y `windows-2025`,
checkout por SHA sin credenciales persistentes, permisos read-only y estos
gates: fmt, Clippy `-D warnings`, tests y release con lockfile, todos los
targets y todas las features.

Verificación local sobre `21d51226a71f58ccec53f205a7327b4467511735`:

- `cargo test --locked --all-targets --all-features`: 270 pasados, 0 fallidos,
  0 ignorados (112 unitarios de librería y 158 de integración; el binario no
  define tests).
- El smoke `physical_v2` forma parte del binario de tests, pero sin
  `SOLGUARD_TRACE_V2_SMOKE_ROOT` retorna sin abrir un artefacto real. El conteo
  anterior no demuestra un smoke físico externo.
- Los gates documentales finales y `cargo metadata` se enumeran en la entrega
  del commit documental.

### No ejecutado y afirmaciones no establecidas

- No se ejecutaron benchmarks, labs, holdouts ni auditorías de protocolos.
- No se midió recall, precision, generalizacion, ruido, tiempo, memoria o
  throughput.
- No se ejecutó GitHub Actions remota ni `actionlint` como parte de esta ronda
  documental.
- No se ejecutó el smoke TRACE v2 contra un root externo sellado.
- No se ejecutaron PoCs, explotación, symbolic execution ni comportamiento
  runtime del protocolo.

### Riesgos residuales

- `trace_contract_v2.rs` es una copia local del contrato compartido, no una
  dependencia centralizada. Puede derivar de otros consumidores si no se
  compara de forma automatizada.
- La identidad estable y la doble lectura reducen TOCTOU observable, pero no
  sustituyen CAS, mounts read-only o APIs handle-relative para toda la
  ejecución.
- Los bounds deliberadamente fail-closed pueden rechazar artefactos legítimos
  mayores; ampliarlos requiere revisión de contrato y tests N/N+1.
- La adquisición TRACE está cerrada por manifiesto. Los árboles suplementarios
  no TRACE conservan sus propios walkers/bounds y no heredan automáticamente
  esa misma autoridad.
- `scripts/check-standalone-metadata.mjs` existe y pasa localmente, pero el
  workflow Rust actual no contiene un step que lo invoque. Es un gap CI
  documental/operacional pendiente, no un gate remoto demostrado.
- El perfil `generic_blind` no prueba separación de oráculo ni mejora de
  detección; solo evita que ese artefacto mezcle origins prohibidos.
