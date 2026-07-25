# Changelog

Este documento registra cambios comprobables de `solguard-filter`. FILTER es
un gate de admisión; sus tests no demuestran recall, precision, generalizacion
ni explotabilidad.

## 2026-07-24: admisión terminal ligada al bundle físico exacto

Commit funcional: `5d6d8bc82b3e4644fcccbe30caa4c898c27a02d2`.

### Qué se ha modificado

- FILTER exige la autoridad TRACE actual, sus receipts producer-v2, selección,
  evidence-verification y source-integrity. Un manifest legacy o un receipt
  estructuralmente parecido queda como deuda, no como autoridad terminal.
- `source_integrity.json` forma parte del bundle de producto cuando Core entrega
  esa autoridad. El `tool_phase.json`, el receipt de output y el validador de
  Core deben declarar exactamente los mismos artefactos físicos.
- `metadata.source_hashes` queda cerrado sobre todos los inputs de producto,
  incluido el `value/attack_paths.json` físico. Ausencia, hash stale o una key
  extra falla cerrado.
- El verificador del receipt TRACE existente y de su upstream MAP forma parte
  del contrato compartido `source-integrity.v1`. Sus tres copias MAP/TRACE/FILTER
  son byte-idénticas y el registro de coordinación fija su SHA-256 actual; una
  deriva vuelve a bloquear la validación.
- El grafo exact-empty autoriza cobertura negativa únicamente: no puede apoyar
  un finding, una ref, una evaluación factorized vacía ni una decisión terminal.
- El primario TRACE compacto solo aporta autoridad local; no puede reclamar
  deep graph authority que no materializó.
- MAP, TRACE e INVARIANT preservan forma cerrada, identidad, selección y
  aritmética antes de aplicar los gates de admisión.
- El contrato de ruta MAP compartido con VALIDATE exige identidades exactas de
  símbolo en ambos extremos de cada callable resuelto. Un endpoint vacío o que
  aliasa un `evidence_id` falla antes de que FILTER use la arista; ambas copias
  vuelven a estar registradas con bytes idénticos.

### Por qué

FILTER es el último límite antes de presentar findings. El canario demostró que
un productor podía terminar correctamente y aun así ser rechazado si Core y el
gate externo no compartían el inventario exacto. El contrato ahora distingue
claramente producto incompleto de artefacto válido con cero autoridad positiva.

### Evidencia de validación disponible

Las pruebas cubren source-integrity ausente/extra, hashes stale, `attack_paths`
físico, exact-empty, compact TRACE y selección INVARIANT. En Compound `r6`,
FILTER publicó `filter_results.json`, Markdown, summary, `tool_phase.json`,
`source_integrity.json` y el receipt Core, y la fase terminó `completed`.

### Límites y riesgos residuales

- `src/input.rs` tiene ahora 6.089 líneas y vuelve a superar el objetivo de
  6.000; requiere extracción mecánica con paridad.
- Los fragments `include!` necesitan `rustfmt --check` directo además de Cargo.
- El contrato TRACE vendorizado requiere paridad de prebuild.
- Bounds e identidad física no sustituyen CAS, read-only mounts o aislamiento
  completo del host.
- El checker standalone de metadata no es todavía un gate demostrado de CI
  remoto.
- `generic_blind` cierra origins, no demuestra generalización.
- Compound `r6` no es aceptación 8/8: el reporte persistido del gate falló por
  un contrato Deploy desfasado y la reevaluación corregida fue offline.

## 2026-07-22: recuperación del cierre `generic_blind` y paridad TRACE

El primer prebuild de la nueva cadena inmutable se detuvo antes de compilar y
no emitió receipt. La comparación byte a byte detectó primero una diferencia de
formato entre Core, Validate y Discover. La inspección completa reveló el fallo
funcional relevante para FILTER: `src/trace_contract_v2.rs` conservaba una
copia anterior de 176.486 bytes y carecía de 391 líneas presentes en la fuente
canónica, incluido el cierre del perfil `generic_blind`.

La copia local se sustituyó mecánicamente por
`solguard-core/crates/solguard-trace-contract/src/lib.rs`. Ahora tiene 191.990
bytes y SHA-256
`cfb01f0fa154352acd2400652fbb602fd86ead50bdeb271e9a3911c62fe47241`, idéntico
a Core, Validate y Discover. FILTER vuelve a transportar y verificar el perfil
sellado `compatibility|generic_blind`; para `generic_blind` exige la capacidad y
el ledger `trace.signal_origins.v1`, rechaza `known_pattern` y reconcilia las
proyecciones de señales del índice con cada primario. El intake reconcilia
además el perfil retenido en el índice con el perfil devuelto por el receipt
producer v2 después de verificar todos los primarios; una deriva tardía falla
cerrada.

Clippy detectó que el perfil recién recuperado todavía no se consumía desde el
intake de FILTER. La integración descrita arriba cerró ese gap sin modificar la
copia común. La suite encontró también una fixture producer-v2 antigua sin
`metadata.filters` ni las colecciones de señales obligatorias; se migró
explícitamente a `compatibility` en vez de reintroducir defaults laxos.

La fuente común pasa `rustfmt --check` bajo las ediciones 2021 y 2024. El gate
de prebuild compara además los tres vendors consumidores y bloquea cualquier
nueva deriva antes de compilar. El intento fallido no se reutiliza y no llegó a
ejecutar canarios. Este cambio recupera un contrato de admisión ausente; no
demuestra recall, precisión, reducción de ruido, rendimiento ni generalización.

La validación local final pasó `cargo fmt --all -- --check`, Clippy locked con
todos los targets/features, 330 tests con 2 ignorados y cero fallos, build
release locked con todos los targets/features y el gate de metadata autónoma.
No se ejecutaron canarios, benchmarks ni labs.

## 2026-07-21 – 2026-07-22: macroauditoría de admisión terminal

### Alcance y commits auditados

La base anterior a la ronda es
`3a59b5579a2f277cc2570adf6a7025a79c14527e`. La ronda de producto termina en
`ad5a1e4ba3ac3afb7ed3c22aac0e4ef4dc9141f3`:

- `6d53049407aa33a6e813d0c32cd27ccab1351a11`: contratos de TRACE, invariant
  bounded, source integrity y fixtures físicos; 21 archivos, 22.592
  inserciones y 533 eliminaciones.
- `14a9936d39de90aa82901cc06b18096778e56d29`: admisión sobre autoridad MAP,
  TRACE e INVARIANT estable; 17 archivos, 10.601 inserciones y 427
  eliminaciones.
- `7d72036c0e30b05b460b0428d9c66d3d0d19a58b`: frontera terminal
  orchestrated/untrusted, publicación create-only y modularización de input; 10
  archivos, 2.171 inserciones y 1.609 eliminaciones.
- `c3c4ee0e9a43d7e61da37334f3c3482aed529cf9`: toolchain y gates CI
  cross-platform bloqueados; 3 archivos, 28 inserciones y 17 eliminaciones.
- `53d8926d6cc38f33b4e72ec6c5daff57a47aab4f`: adquisición TRACE
  manifest-first, budgets agregados y signal origins; 4 archivos, 1.285
  inserciones y 143 eliminaciones.
- `ad5a1e4ba3ac3afb7ed3c22aac0e4ef4dc9141f3`: partición mecánica de la suite
  de workflow; 4 archivos, 5.468 inserciones y 5.464 eliminaciones.

Excluyendo `target/`, se pasó de 9 archivos Rust y 9.626 líneas a 25 archivos
y 42.733 líneas. El mayor archivo anterior era
`tests/filter_workflow.rs` con 3.345 líneas; el mayor actual es `src/input.rs`
con 5.814. El crecimiento procede de verificadores físicos, contratos
cerrados y pruebas adversariales; no constituye una medición de detección o
rendimiento.

### Antes de esta ronda

- La invocación local y la invocación de producto no estaban separadas por los
  dos contratos de salida actuales.
- FILTER no reabría todavía toda la autoridad producer TRACE/MAP/INVARIANT con
  los contratos y bounds actuales antes de permitir una decisión terminal.
- La adquisición de directorios TRACE podía llegar a enumerar/cargar antes de
  que el índice bounded fijara el universo exacto.
- La publicación no garantizaba todavía el bundle actual, source-integrity
  receipt y root create-only en una sola transacción.
- `tests/filter_workflow.rs` creció durante el hardening hasta 7.680 líneas y
  dejó de ser mantenible como un único archivo.
- CI no fijaba Rust ni aplicaba la matriz actual locked de formato, Clippy,
  tests y release en Windows/Linux.

### Responsabilidad y frontera terminal

FILTER conserva una responsabilidad cerrada: reevaluar solo resultados
`supported` de VALIDATE contra evidencia inmutable y fuente localizada antes
de EXPLOIT.

- `pass` requiere todos los hard gates y
  `exploit_eligibility.eligible=true`.
- Evidencia ausente, incompleta, MAY o ambigua produce `review`; nunca se
  transforma en `reject` por ausencia.
- `reject` exige contradicción concreta, protección efectiva, input stale o
  inseguro, efecto imposible o duplicado demostrado.
- Scores no sobreescriben gates. Dedupe no eleva autoridad.
- Ground truth, labels de benchmark, IDs conocidos y nombres de protocolos
  continúan prohibidos como inputs de producto.

### Dos modos de ejecución

- El modo de producto es `orchestrated`. Exige `--source-integrity`,
  `--trace-source-integrity` y un directorio TRACE físico. Produce
  `filter.v0.1`, `filter_results.json` y un source-integrity receipt ligado al
  artefacto final.
- Sin source integrity el caller debe declarar explícitamente
  `--standalone-untrusted`. Este modo produce `filter.untrusted.v0.1` y
  `filter_results.untrusted.json`.
- `standalone_untrusted` fuerza cero `pass`, cero EXPLOIT-eligible y downgrades
  conservadores aunque otras comprobaciones locales sean positivas. No puede
  hacerse pasar por salida de producto cambiando un filename.
- La CLI falla si no se elige una de las dos fronteras; ya no existe fallback
  silencioso desde producto a diagnóstico.

### Entradas y autoridad física

- VALIDATE, candidatos, invariantes, MAP y cada suplemento solicitado se
  reconcilian contra schemas y SHA-256 consumidos upstream.
- Las labels de invariant quedan cerradas a `invariants` para el runtime e
  `invariants:source` para el primario. Igualdad es modo directo; hashes
  distintos son obligatorios en bounded.
- MAP y TRACE se leen desde handles estables, con path/parent canónicos,
  identidad física, link count, longitud y SHA-256 comprobados antes y después.
- Duplicate keys, trailing JSON, symlinks, reparse points, hardlinks, aliasing
  físico, sustitución y drift fallan cerrados.

### TRACE manifest-first y cierre exacto del árbol

- Un directorio TRACE abre `index.json` con schema estricto y cap de 100 MiB
  antes de sellar el árbol o cargar primarios. El orden de primarios procede
  del manifiesto, no del orden del filesystem.
- El árbol se sella antes y después de adquisición. Debe contener exactamente
  el índice, primarios/companions declarados y metadata root admitida; JSON
  extra o membership drift falla cerrado.
- El batch se limita a 100.000 reports, 64 GiB de bytes físicos primarios, 512
  MiB de proyección agregada, 768 MiB de heap retenido estimado, 8.000.000
  nodos retenidos y profundidad de proyección 128.
- El árbol TRACE tiene un máximo derivado de 300.008 entradas, profundidad
  física 2 y 72 GiB agregados. Los primarios siguen sujetos al cap wire
  inclusivo de 4 GiB cada uno.
- Metadata root `phase.json` se limita a 16 MiB y
  `evidence_verification.json` a 64 MiB. El índice se limita a 100 MiB.
- Colecciones JSON suplementarias no TRACE usan un walker separado: 4.096
  entradas, profundidad 8, 1.024 JSON, 256 MiB por fichero y 512 MiB agregados.
- La rama >100 MiB mantiene el hash de todos los bytes, no usa un sidecar
  semántico TRACE y conserva la superficie de autoridad necesaria mediante
  proyección bounded.

### Perfil de análisis y signal origins

- `analysis_profile` queda cerrado a `compatibility` o `generic_blind` y debe
  coincidir entre índice y primarios.
- `generic_blind` exige exactamente una capability
  `trace.signal_origins.v1`, prohíbe `known_pattern` y liga cada mismatch,
  invariante y prioridad a su ledger exacto.
- `candidate_bug_patterns` de generic-blind debe ser exactamente la proyección
  ordenada/deduplicada de mismatches; no admite un catálogo paralelo.
- Origins ausentes, extra, duplicados, reordenados, stale o arbitrariamente
  re-sellados invalidan el primario. Compatibility legacy no puede introducir
  campos origin que su manifiesto no selló.
- Este contrato evita mezcla de origins dentro del artefacto; no prueba por sí
  solo aislamiento del scanner ni generalización blind.

### TRACE producer, evidencia y selección

- FILTER recalcula `trace.contract_manifest.v2`, graph/coverage, evaluaciones
  factorizadas y target-route, `trace.claim_authority.v2`, los cinco receipts
  de materialización y manifests/agregados.
- El claim producer v2 no sustituye a `trace.claim_authority.v1` de VALIDATE.
  Una decisión TRACE terminal necesita ambos contratos coherentes.
- `trace.batch_selection.v3` exige `selected_targets == eligible_targets`;
  `top` solo acota `trace.batch_deep_enrichment.v1`. V2 es diagnostic-only.
- El receipt actual es `trace.evidence_verification.v2` bajo policy v3. FILTER
  ejecuta un verificador single-link desde entorno vacío, compara receipt
  adjacent/stdout/fresh y aplica timeout interno de 900 s con margen externo
  requerido de 300 s. Un receipt v1 solo permite review.
- `trace.evidence_authority_paths.v1` cierra las rutas que conceden IDs. Por
  primario se limitan 2.000.000 nodos, 250.000 ocurrencias, 100.000 IDs únicos
  y 16 MiB de bytes de IDs.
- Cada `evidence_items[*]` debe recomputar una única identidad
  `trace-evidence-v1-<sha256>` desde target, rango y payload exactos. MAP context
  no puede satisfacer el lado TRACE.

### MAP e INVARIANT bounded

- MAP target identity se une contra el primario y
  `map_function_identity_manifest.v1` con 100.000 entradas y 24 MiB de prefijo
  canónico. Colisiones, omisión o deuda impiden autoridad exacta.
- La autoridad de ruta actual requiere el par
  `solguard-coverage-manifest.v2`/`solguard-map-coverage.v2`, cinco receipts CFG
  y tool versions iguales. El MAP físico se limita a 256 MiB, source a 64 MiB,
  CFG agregado a 256 MiB y cada CFG a 64 MiB.
- `invariant.bounded_runtime.v1` se rehidrata desde el
  `invariant.v0.8` físico y se recomputa
  `invariant.selection_manifest.v1` junto a `attack_paths.json`.
- La selección bounded admite 8.192 objetos y 256 MiB; el envelope completo
  tiene cap independiente de 320 MiB. Compact metadata nunca es evidencia.
- Omisión coherente de anchors, evidencia/source o relaciones exige que
  VALIDATE ya sea inconclusive y deja FILTER sin decisiones terminales.
  Tamper, overflow, endpoints colgantes o contadores incoherentes son error.

### Publicación

- Todo output root debe estar ausente. Los miembros se escriben create-new en
  un staging hermano, se validan y se publican mediante un único rename.
- Orchestrated publica `filter_results.json`, `filter_results.md`,
  `summary.txt`, `phase.json` y `source_integrity.json` en la misma
  transacción.
- Standalone publica `filter_results.untrusted.json`,
  `filter_results.untrusted.md`, `summary.txt` y `phase.json`; no publica el
  artefacto de producto ni source-integrity receipt.
- Un root preexistente queda intacto. Un fallo elimina solo el staging privado.

### Modularización

- En `7d72036...`, `src/input.rs` bajó de 7.126 a 5.581 líneas mediante
  extracción de recomputación del economic route graph y tests de input. Tras
  el hardening manifest-first posterior termina en 5.814.
- En `ad5a1e4...`, `tests/filter_workflow.rs` bajó de 7.680 a 2.220 líneas.
  Las particiones actuales son `semantic_checkers.rs` (2.434 líneas/101
  tests), `input_and_trace_contracts.rs` (2.304/80) y
  `bounded_invariants_and_reporting.rs` (726/26).
- Se usó `include!` para conservar los nombres completos históricos del
  harness. La paridad estática fue 207/207 funciones `#[test]`; el binario de
  integración continúa listando 212 tests en Windows al incluir los tests de
  módulos auxiliares y excluir dos casos Unix por `cfg`.
- Ningún archivo Rust actual supera 6.000 líneas. `src/input.rs`, con 5.814,
  queda cerca del límite y requiere vigilancia en la siguiente ronda.

### CI y verificación ejecutada

El workflow fija Rust `1.96.0`, usa `ubuntu-24.04` y `windows-2025`, checkout
por SHA sin persistir credenciales, permisos read-only y gates locked de fmt,
Clippy, tests y release para todos los targets/features.

Verificación local sobre `ad5a1e4ba3ac3afb7ed3c22aac0e4ef4dc9141f3`:

- `cargo test --locked --all-targets --all-features`: 327 pasados, 0 fallidos y
  2 ignorados. Son 116 pasados/1 ignorado en librería, 0 en el binario y 211
  pasados/1 ignorado en integración.
- Los dos ignorados requieren binarios release externos de TRACE y, para el
  canario de extremo a extremo, VALIDATE. No se cuentan como evidencia
  ejecutada.
- `node scripts/check-standalone-metadata.mjs` pasó localmente con
  `authorized_external=0`.
- Los gates documentales finales se enumeran en la entrega del commit.

### No ejecutado y afirmaciones no establecidas

- No se ejecutaron benchmarks, labs, holdouts, canarios de producto ni
  protocolos reales.
- No se midió recall, precision, ruido, generalizacion, tiempo, memoria o
  throughput.
- No se ejecutó GitHub Actions remota ni `actionlint` durante este trabajo
  documental.
- No se ejecutaron los dos tests ignorados ni el smoke físico v2 con
  `SOLGUARD_TRACE_V2_SMOKE_ROOT`.
- No se ejecutaron PoCs, EXPLOIT ni comportamiento runtime del protocolo.
- La partición de tests no modifica detección ni demuestra mejora funcional.

### Riesgos residuales

- `src/input.rs` tiene 5.814 líneas. Está bajo el límite acordado, pero es el
  siguiente candidato a extracción mecánica con paridad estricta.
- `trace_contract_v2.rs` replica un contrato compartido; sin una prueba
  automatizada de sincronización puede derivar respecto de otros consumidores.
- Los fragments incluidos por `include!` no son necesariamente descubiertos
  por `cargo fmt`; por eso esta ronda ejecuta también `rustfmt --check` directo
  sobre los tres archivos.
- Los bounds fail-closed pueden rechazar honestamente artefactos mayores. Un
  aumento requiere revisión de contrato y tests N/N+1, no solo cambiar una
  constante.
- Las comprobaciones de handle/path reducen TOCTOU observable, pero no
  sustituyen CAS/read-only mounts ni aislamiento host completo.
- `scripts/check-standalone-metadata.mjs` existe y pasa localmente, pero el
  workflow Rust actual no contiene un step que lo ejecute. No es un gate CI
  remoto demostrado.
- `generic_blind` sella origins; no prueba separación de oráculo ni
  generalización.
