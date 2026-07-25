# Changelog

Este documento registra cambios comprobables de `solguard-invariant`. No es una
lista de capacidades aspiracionales ni una medición de calidad de detección.

## 24 de julio de 2026 — separación estricta entre linaje y evidencia física

Commit funcional: `e3d9637c4f4de9f92eb0d58f815bbc996496ee99`.

### Qué se ha modificado

- `source-*` y `native-source-*` son exclusivamente linaje en `source_ids`.
  Para cerrar una referencia deben existir uno o más `ev-*` MAP canónicos en la
  misma línea y una única función MAP con evidencia que posea el punto por
  fichero, rango y símbolo exactos.
- Se eliminó el fallback desde una línea interior a la evidencia de definición
  de la función. Una línea sin item exacto permanece no resuelta.
- Paths absolutos solo son admisibles dentro de `repository.root`; los paths
  relativos rechazan aliases, segmentos vacíos, `.`/`..` y separadores
  ambiguos. Un path externo nunca se reduce a basename.
- La deuda se conserva por referencia declarada. Un ID unknown, unbound,
  ambiguo o parcial deja condición e invariante `unresolved` aunque otras refs
  válidas sobrevivan.
- El merge de duplicados conserva evidencia y linaje, pero propaga el estado
  más débil; una contribución unresolved no queda ocultada por otra resolved.
- La proyección MAP transporta el ledger tipado completo con paridad inline,
  dos pasadas físicas y límites de nodos/profundidad/bytes. TRACE separa wire
  físico —100 MiB de índice, 4 GiB por primario y 64 GiB agregados— de la
  proyección retenida —64 MiB por primario y 256 MiB por batch—.

### Por qué

La procedencia semántica explica de dónde surgió una hipótesis, pero no prueba
que exista una observación física en el código. Este cambio evita que el
linaje, un basename parecido o una contribución duplicada conviertan deuda en
autoridad.

### Evidencia de validación disponible

Se añadieron tests de línea interior, función ambigua, paths fuera del root,
deuda parcial, merge de duplicados, paridad MAP proyectada, límites y
sustitución física. Compound `r6` completó INVARIANT y seleccionó su artefacto
candidate-derived para downstream. No se ha ejecutado la matriz completa.

### Límites y riesgos residuales

- `src/engine.rs` tiene ahora 5.770 líneas y sigue siendo el principal candidato
  para una extracción mecánica con paridad.
- El contrato TRACE continúa vendorizado y sujeto a paridad de prebuild.
- Los límites semánticos retained pueden rechazar honestamente un batch válido
  para otro consumidor.
- La identidad física no sustituye CAS/read-only mounts ni elimina toda carrera
  de un host hostil.
- `generic_blind` cierra la forma de procedencia; no demuestra aislamiento de
  oráculo, recall blind o generalización.
- No existe todavía aceptación 8/8, replay v1-v8/labs, holdout o CI remoto para
  este árbol sin commit.

## 22 de julio de 2026 — sincronización del contrato TRACE compartido

El primer prebuild posterior al endurecimiento de la medición se detuvo antes
de compilar porque la comparación física del contrato TRACE detectó una deriva
real. La copia vendorizada de INVARIANT aún tenía 191.980 bytes y SHA-256
`80535fc76f3b2bf2e4c3b19987e31dc0e5fee90bc3b598148493c002b8c1a162`,
mientras que la fuente canónica preparada en CORE tenía 191.990 bytes y SHA-256
`cfb01f0fa154352acd2400652fbb602fd86ead50bdeb271e9a3911c62fe47241`.

La diferencia de esta copia era únicamente la forma, compatible con rustfmt
2021 y 2024, de una aserción del test que rechaza patrones obsoletos bajo
`generic_blind`; no cambia la semántica del verificador ni añade detección. Se
ha sustituido el source vendorizado por los bytes exactos de
`solguard-core/crates/solguard-trace-contract/src/lib.rs` y se ha comprobado la
igualdad completa, no solo una coincidencia de API.

La regla `.gitattributes`
`vendor/solguard-trace-contract/src/lib.rs text eol=lf` fija también la
representación física en LF, de modo que `core.autocrlf` no pueda transformar
la copia durante checkout y provocar deriva en un host Windows.

La paridad deja de depender exclusivamente de una revisión manual: el prebuild
canónico compara de forma fail-closed las siete copias de CORE, VALIDATE,
DISCOVER, FILTER, VALUE, ECONOMIC e INVARIANT, vuelve a comprobar que no cambien
durante la compilación y dispone de una prueba que introduce deriva deliberada
en un vendor. Cualquier byte distinto bloquea la cadena antes de publicar un
receipt. Esto corrige reproducibilidad contractual; no aporta resultados de
canarios, benchmarks, recall, precisión ni rendimiento.

## 2026-07-21 – 2026-07-22: macroauditoría de autoridad y operación

### Alcance y evidencia usada

La entrada anterior a esta ronda es el commit
`fa0d128f8c5bc2ff0fbc1c108207ed03a7aac11a`. La ronda de producto termina en
`31759cf4dc9df0a0f0743e1a5767cf7cfec839ef` y comprende estos commits:

- `ad38155a562fc67f285c949a987fa50a04d907a9`: carga JSON proyectada,
  publicación del bundle por staging y errores fail-closed; 9 archivos, 1.676
  inserciones y 70 eliminaciones.
- `d232113fec53724ca426fcc25073ab1dfeba5f01`: cierre de evidencia a tuplas
  físicas; 7 archivos, 1.310 inserciones y 128 eliminaciones.
- `9e5f75636821c8045ec15e90302de3504f4d8d5a`: binding exacto de evidencia
  acotada; 4 archivos, 470 inserciones y 188 eliminaciones.
- `4b140512ea74bdc188b7e89250ffa1e5b9f32e17`: gates CI bloqueados y toolchain
  fijado; 2 archivos, 21 inserciones y 13 eliminaciones.
- `31759cf4dc9df0a0f0743e1a5767cf7cfec839ef`: verificación canónica de TRACE
  v2 y dependencia vendorizada; 11 archivos, 6.151 inserciones y 82
  eliminaciones.

Los conteos de código siguientes excluyen `target/` y el código bajo
`vendor/`: se pasó de 9 archivos Rust y 6.046 líneas a 10 archivos y 10.000
líneas. El archivo mayor pasó de `src/engine.rs` con 3.557 líneas a ese mismo
archivo con 4.759. El crecimiento procede de validadores, contabilidad de
cobertura y pruebas; no constituye por sí mismo una mejora de detección ni de
rendimiento.

### Antes de esta ronda

- Los artefactos JSON no compartían todavía el actual borde de lectura
  acotada, proyección de campos consumidos, hash completo e identidad física
  estable.
- Un ID de evidencia podía llegar al motor sin el cierre actual a namespace,
  fichero y línea publicados por el primario físico.
- La salida no se publicaba mediante la transacción actual de cuatro
  artefactos completos en un root nuevo.
- El consumidor TRACE no exigía todavía el manifiesto producer v2 completo ni
  diferenciaba una entrada standalone de un batch con autoridad actual.
- El workflow no fijaba la versión Rust ni aplicaba la misma matriz bloqueada
  de formato, Clippy, tests y release en Windows y Linux.

### Responsabilidad después de la ronda

La responsabilidad sigue siendo generar propiedades tipadas a partir de
artefactos estructurados. INVARIANT no valida explotabilidad, no ejecuta código
y no emite `supported`, `refuted`, `pass` o `reject`.

La ronda endurece el significado de la evidencia que puede quedar ligada a
una propiedad. Una hipótesis que pierde todas sus referencias físicas permanece
visible como `unresolved`; no se corrige por similitud textual ni se promociona
por confianza, nombre o score.

### Entradas y adquisición física

- Cada JSON solicitado tiene un límite raw inclusivo de 512 MiB.
- MAP, invariantes sintetizados, candidatos y los artefactos advisory de VALUE
  conservan solo los campos consumidos, pero SHA-256 cubre todos los bytes del
  primario.
- Parse y hash usan el mismo descriptor. Al final se reconcilian longitud,
  metadata, identidad de fichero y número de links; symlinks, reparse points,
  hardlinks y sustituciones durante lectura fallan cerrados.
- Un flag opcional deja de ser opcional una vez suministrado: un path ausente
  o un JSON TRACE con schema no admitido es error, no una colección vacía.
- La autoridad MAP se extrae durante el mismo parse estable aunque el objeto
  contenedor no quede retenido en la proyección materializada.

### Autoridad exacta de evidencia

- Los namespaces físicos quedan cerrados: MAP usa `ev-*`; TRACE usa
  `trace-evidence-v1-<64hex>`; source usa las identidades admitidas por el
  contrato de candidatos.
- La autoridad se indexa por `(evidence_id, file, line)`, no como un set global
  de strings.
- Si fichero y línea faltan conjuntamente, solo se completan cuando el ID
  resuelve una única ubicación. Descriptores parciales, IDs ambiguos, fichero o
  línea ajenos y aliases bajo un padre con otra localización fallan cerrados.
- TRACE solo aporta autoridad desde `evidence_items` top-level con
  `source=solguard-trace`. Una copia MAP dentro de `solguard_map_context` no se
  convierte en evidencia TRACE.
- `trace-economic-evidence-*` permanece como linaje semántico en
  `source_id`/`source_ids`. Solo los `source_evidence_ids` respaldados por MAP
  pueden crear `EvidenceRef` físicos.
- Los candidatos derivados deben conservar versión de regla, source hash y
  localizaciones coherentes; una referencia source no puede relabelarse como
  MAP o TRACE.
- `native-source-*` y `source-*` permanecen solo como linaje en `source_ids`.
  Su cierre físico exige un `EvidenceItem` MAP canónico en el mismo
  `file+line` y una única función MAP respaldada por evidencia que posea ese
  punto por fichero, rango y símbolo exacto. Ya no existe fallback desde una
  línea interior hacia la evidencia de definición de la función.
- Los paths de autoridad absolutos se aceptan únicamente dentro de
  `repository.root`; los relativos rechazan segmentos vacíos, `.`/`..`,
  separadores duplicados y aliases de plataforma. Un absoluto externo o sin
  root nunca se reduce al basename.
- El cierre de evidencia conserva deuda por cada referencia declarada:
  `unknown`, `unbound`, ambigua o con descriptor parcial deja la condición y el
  invariante `unresolved` aunque sobrevivan otras refs físicas válidas.
- La fusión de invariantes duplicados conserva refs físicas y linaje, pero
  propaga la resolución más débil. Una contribución no resuelta ya no puede
  ocultarse detrás de otra marcada `resolved`.

### TRACE v2 manifest-first y perfiles de análisis

- Un directorio TRACE actual se abre por su `index.json` antes de cargar sus
  primarios. El schema obligatorio es `trace.batch_index.v1` y los miembros
  físicos se limitan a rutas seguras `traces/<archivo>.json` declaradas una vez.
- El wrapper de INVARIANT limita el índice a 16 MiB, cada primario a 192 MiB,
  el batch a 4.096 primarios y la suma índice+primarios a 256 MiB. Los límites
  son inclusivos y la primera unidad por encima falla cerrada.
- Tras el preflight, `solguard-trace-contract` reabre el batch y verifica
  `trace.contract_manifest.v2`, binding de bytes/SHA-256, agregados, targets,
  materialización y cierre de schemas. INVARIANT vuelve a comprobar que orden,
  tamaño, hash e identidad física coinciden antes de materializar cada DOM.
- El perfil del batch queda sellado como `compatibility` o `generic_blind`.
  En `generic_blind`, `trace.signal_origins.v1` es obligatorio, los ledgers de
  origen deben corresponder exactamente a mismatches e invariantes y
  `known_pattern` está prohibido. Ausencia, duplicación, reordenación o stale
  origin falla la verificación producer v2.
- Un `trace.v0.9` suelto sigue siendo legible solo como
  `standalone_compatibility_degraded`: se eliminan miembros/capabilities de
  autoridad producer y se añade deuda tipada. El report de INVARIANT queda con
  `coverage_debt`; ese modo no equivale a un batch v2 autorizado.

### Vendoring y reproducibilidad

- La verificación canónica TRACE se consume mediante
  `vendor/solguard-trace-contract`, declarada como path interno del propio
  repositorio.
- El paquete vendorizado conserva el golden de JSON canónico UTF-8 y los
  contratos de profile/signal-origin del productor. Esto evita una dependencia
  path hacia otro checkout durante build.
- La copia vendorizada no se actualiza automáticamente: cualquier cambio del
  contrato canónico requiere sincronización explícita y pruebas de paridad.

### Cobertura y límites semánticos

- `stage_coverage.v1` registra de forma aditiva cada colección acotada con
  `observed`, `retained`, `omitted`, límite y estado.
- Cada invariante retiene como máximo 8.192 referencias de evidencia y 8.192
  source IDs. El valor exacto del límite sigue siendo `complete`; N+1 produce
  deuda explícita.
- Sumas/restas usan aritmética comprobada. Overflow, `retained > observed`,
  límite incoherente o receipt falsificado son errores, no contadores
  saturados.
- Omisiones coherentes de anchors, evidencia/source o relaciones bounded son
  diagnóstico terminal para consumidores posteriores. No se presentan como
  evidencia negativa.

### Publicación de salidas

- El bundle contiene exactamente `invariants.json`,
  `invariants.coverage.json`, `invariants.md` y `summary.txt`.
- Los cuatro miembros se escriben con create-new en un staging hermano, se
  validan y se publican mediante un único rename al root final.
- Cualquier root final preexistente, aunque esté vacío, bloquea la publicación
  y queda intacto. Un fallo intermedio elimina solo el staging privado.
- `invariants.coverage.json` es un `solguard-coverage-manifest.v1` ligado por
  path, schema, bytes y SHA-256 al primario. Corrobora cobertura; nunca lo
  sustituye como evidencia.

### Modularización y mantenibilidad

- Se incorporó `src/trace_contract.rs` como adaptador local entre adquisición
  INVARIANT y el verificador vendorizado.
- El mayor archivo actual es `src/engine.rs` con 4.759 líneas; ningún archivo
  Rust propio supera 6.000 líneas.
- La ronda aumentó la superficie total de código y tests. No se presenta esa
  ampliación como optimización de tiempo o memoria: solo los límites y la
  estrategia streaming descritos arriba están demostrados por contrato/tests.

### CI y verificación ejecutada

El workflow fija Rust `1.96.0`, usa runners `ubuntu-24.04` y `windows-2025`,
permisos `contents: read`, checkout sin credenciales persistentes y cuatro
gates bloqueantes con `--locked` y todas las features/targets.

Verificación local sobre `31759cf4dc9df0a0f0743e1a5767cf7cfec839ef`:

- `cargo test --locked --all-targets --all-features`: 62 pasados, 0 fallidos,
  0 ignorados (35 unitarios de librería, 18 de `invariant_engine` y 9 de
  `strict_negative`; el binario no define tests).
- Los gates documentales finales de este commit se enumeran en su mensaje de
  entrega; no se sustituyen por el conteo de tests anterior.

### No ejecutado y afirmaciones no establecidas

- No se ejecutaron benchmarks v1–v8, los 90 labs, holdouts ni protocolos reales.
- No se midió recall, precision, generalización, tiempo, memoria o throughput.
- No se ejecutó una GitHub Actions remota desde esta documentación.
- No se ejecutó código de protocolo, SMT, symbolic execution ni explotación.
- Los tests prueban contratos, límites y comportamiento fail-closed; no prueban
  que se descubran vulnerabilidades nuevas.

### Riesgos residuales

- `src/engine.rs` sigue concentrando 4.759 líneas y es el principal candidato
  para una futura extracción mecánica, siempre con paridad de tests.
- El contrato TRACE está vendorizado. Una actualización upstream no llega sola
  y puede producir drift si no se compara la copia antes de release.
- Los límites locales de 192 MiB por primario y 256 MiB agregados son más
  estrictos que el wire cap general de TRACE; un batch válido para otro
  consumidor puede ser rechazado honestamente por INVARIANT.
- Las comprobaciones de identidad reducen sustituciones observables, pero no
  sustituyen un CAS/read-only mount ni eliminan toda carrera hostil del sistema
  operativo.
- La aceptación estructural de `generic_blind` no demuestra aislamiento de
  oráculo, recall blind ni generalización. Solo demuestra coherencia del perfil
  y de sus ledgers de origen.
