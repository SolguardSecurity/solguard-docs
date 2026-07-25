# Changelog

Registro factual de cambios de `solguard-trace`. Las garantías descritas son
contratos de ejecución y evidencia comprobados en código/tests; no son métricas
de recall, precisión, velocidad ni generalización.

## 2026-07-24 - Clausura exacta de rutas, evidencia y materialización

Commit funcional: `c877b3a50221a8174d270377c18565fdb8952f3a`.

### Qué se ha modificado

- La clausura Solidity profunda resuelve cada extremo callable mediante la
  identidad MAP exacta de función/símbolo. Una sobrecarga con el mismo nombre
  visible, una identidad ausente o una identidad duplicada falla cerrado.
- El contrato factorized reconoce un grafo económico exactamente vacío como
  cobertura completa solo cuando todos sus inventarios, omisiones y deudas son
  cero. Esa autoridad vacía nunca crea evaluations, sujetos ni evidencia para
  un finding.
- El verificador recompone el wire completo de cada
  `trace-evidence-v1-<sha256>` y rechaza cambios de target, path, línea, kind,
  source o detalle normalizado.
- Los primarios se publican y describen en JSON compacto mediante streaming
  acotado. El Markdown legacy no autoritativo conserva contadores completos y
  muestra muestras deterministas con `observed/rendered/omitted`, sin retirar
  evidencia del primario.
- Selección, catálogo, procedencia, coverage y materialización comparten
  aritmética cerrada; los límites N/N+1 y el orden de prioridades tienen una
  única política.
- `source-integrity.v1` comparte ahora, con bytes exactos en MAP/TRACE/FILTER,
  el verificador de un receipt TRACE existente y de su receipt MAP upstream.
  Esta función cierra identidad de artefacto y árbol fuente; no concede
  autoridad de evidencia o finding.

### Por qué

TRACE no debe convertir una coincidencia nominal o un inventario vacío en
autoridad causal. El cambio liga cada ruta a MAP, separa ausencia exacta de
evidencia positiva y evita duplicar en memoria un primario grande solo para
serializarlo o calcular su descriptor.

### Evidencia de validación disponible

Se añadieron pruebas de sobrecargas, extremos ausentes/duplicados,
exact-empty, recomposición de evidencia, límites de ruta y muestras Markdown.
El canario real Compound `r6` terminó TRACE y la evaluación posterior lo
clasificó completo. Esto no sustituye los otros siete canarios ni un replay.

### Límites y riesgos residuales

- `compatibility` sigue siendo el default para callers históricos; el producto
  profesional debe exigir `generic_blind`.
- TRACE sigue dependiendo de funciones y aristas que MAP haya podido resolver.
- Los límites de clausura, cache y primarios son defensas fail-closed, no una
  medición de RSS ni garantía de aceptar cualquier corpus legítimo.
- Los fallbacks sin autoridad AST exacta siguen siendo heurísticos.
- No existe todavía aceptación 8/8, v1-v8/labs, holdout o CI remoto para este
  árbol sin commit.

## 2026-07-22 - Macroauditoría de evidencia genérica y clausura Solidity

### Alcance y commits

Esta entrada cubre:

- `146f9a43d97d9d3b130fe144790786f7dbd3b183` - frontera física y
  modularización del batch.
- `e3ebb7ea5485e4f98083a9d1a15b605e44fd61a7` - CI bloqueada y
  multiplataforma.
- `32d4ba3689296a1d7f4f29c40ba70c45fd3af837` - perfiles de análisis,
  procedencia de señales y clausura cross-file acotada.

No se añadió una regla de detección dirigida a Compound, Size, LoopFi, Vyper,
Timeswap, Morpheus, Monad ni a ningún benchmark concreto. Las familias conocidas
existentes se conservaron como compatibilidad y ahora se distinguen por origen.

### Responsabilidad cerrada

TRACE consume la autoridad física y semántica de MAP, construye evidencia
target-local, rutas causales y candidatos de revisión, y publica un árbol TRACE
sellado. No adquiere repositorios remotos, no valida una vulnerabilidad, no
explota contratos y no debe inventar evidencia fuera de fuentes físicas o
contratos MAP verificables.

- Un target deep se resuelve desde la identidad MAP seleccionada y su fuente
  física; no se selecciona por coincidencia libre de nombre.
- Evidencia nativa TRACE debe llevar localización positiva y autoridad de
  fichero verificable. Los IDs MAP conservan su procedencia MAP y no se
  relabelan como corroboración TRACE.
- Una omisión, ambigüedad, exceso de presupuesto o drift se convierte en deuda
  tipada o error cerrado según el contrato; nunca en evidencia negativa.

### `146f9a4` - frontera física y partición del batch

El antiguo `src/batch.rs` tenía 8.530 líneas y mezclaba contratos, selección,
detección, ensamblado y pruebas. El commit separó:

- `batch/candidate_utils.rs`: normalización y utilidades de candidatos.
- `batch/contracts.rs`: formas contractuales del batch.
- `batch/detection.rs`: coordinación de señales deterministas.
- `batch/selection.rs`: selección MAP/target.
- `batch/source_scope.rs`: alcance físico de fuentes.
- `batch/trace_build.rs`: ensamblado del reporte.
- `batch/context_scope_tests.rs`: regresiones de scope.
- `physical_source.rs`: descriptores estables, containment y revalidación.
- `known_patterns.rs`: compatibilidad conocida aislada del resto del motor.

La reorganización mantuvo el flujo funcional existente y permitió probar
límites por responsabilidad. En el árbol final, `src/batch.rs` tiene 5.942
líneas y ningún fichero Rust del repositorio supera 6.000; el mayor test,
`tests/trace_solidity.rs`, tiene 5.960.

### `e3ebb7e` - CI reproducible

- Toolchain Rust `1.96.0` fijada con `rustfmt` y `clippy`.
- Matriz `ubuntu-24.04` y `windows-2025`.
- `cargo fmt --all -- --check`.
- `cargo clippy --locked --all-targets --all-features -- -D warnings`.
- `cargo test --locked --all-targets --all-features`.
- `cargo build --locked --release --all-targets --all-features`.
- Acciones de terceros fijadas por SHA, checkout sin credenciales persistentes,
  permisos `contents: read`, timeout y concurrencia explícitos.

El workflow se inspeccionó y los gates equivalentes se ejecutaron localmente.
No se afirma que GitHub Actions remoto haya corrido después de estos commits.

### `32d4ba3` - perfiles y procedencia de señales

#### Perfiles cerrados

TRACE admite exactamente dos valores de `--analysis-profile`:

- `compatibility` es el valor por defecto. Conserva señales estructurales,
  reglas genéricas y familias conocidas preexistentes para no romper callers.
- `generic_blind` elimina de todos los canales puntuados cualquier señal con
  origen `known_pattern`. Solo admite `structural_generic` y `generic_rule`.

El contrato `trace.signal_origins.v1` vincula:

- `mismatches[].origin`;
- la matriz uno-a-uno entre `invariant_candidates[]` e
  `invariant_candidate_origins[]`;
- `ai_brief.priority_origins[]`;
- `metadata.analysis_profile` y la selección batch sellada;
- exactamente una capability `trace.signal_origins.v1`.

En `generic_blind`, `candidate_bug_patterns` se deriva de los títulos de los
mismatches admitidos, ordenados y deduplicados. No puede conservar un resumen
stale ni reintroducir una señal conocida por otro canal. El verificador vuelve
a calcular y valida este contrato desde las fuentes y el MAP físicos.

Este cambio separa procedencia; no demuestra que el conjunto genérico descubra
bugs desconocidos y no añade nuevas familias de vulnerabilidad.

#### Clausura Solidity cross-file

El deep analyzer dejó de limitarse al fichero primario cuando MAP demuestra
llamadas a otros endpoints físicos:

- La clausura se deriva exclusivamente del target y de aristas MAP resueltas
  `internal_call`, `direct_call`, `external_call` o `library_call`.
- Solo se materializan ficheros de símbolos callable con binding MAP. No se
  escanea ni parsea todo el corpus como proyecto Solidity.
- Un símbolo con dos bindings de fichero distintos es ambiguo y falla cerrado.
- Un miembro no Solidity dentro de la clausura falla cerrado.
- Cada proyecto deep admite como máximo 256 ficheros y 32 MiB agregados.
- Cada dependencia física admite como máximo 8 MiB.
- El catálogo global de descriptores admite 65.536 ficheros y 256 MiB.
- La cache de proyectos parsed usa LRU, con 16 proyectos y 64 MiB agregados.
  Eviction ocurre antes de cruzar cualquiera de los techos.
- La clave de cache incorpora path, bytes y SHA-256 de todo el conjunto
  ordenado de fuentes.
- Cada cache hit revalida todos los descriptores; al final del batch se
  revalidan de nuevo los catálogos. Drift, alias físico, overflow aritmético o
  sustitución invalidan la autoridad.
- Los receipts distinguen ficheros/bytes del proyecto, catálogo, cargas,
  materializaciones, hits y estado de cache.

El objetivo de esta clausura es preservar relaciones cross-file reales sin
recuperar el comportamiento no acotado de parsear el repositorio completo.

#### Evidencia física cross-file

- Un descriptor de evidencia puede apuntar a una dependencia de la clausura,
  pero el fichero debe estar contenido en el root, ser físico y conservar su
  descriptor estable.
- La línea debe ser positiva y existir físicamente en el fichero.
- El verificador rechaza un fichero externo, una línea inexistente, un alias o
  una fuente que cambió desde el sellado.
- Los tests cubren tanto la evidencia cross-file aceptada como las variantes
  fuera de scope y la materialización de una llamada Solidity en otro fichero.

### Antes y después

| Área | Antes | Después |
| --- | --- | --- |
| Procedencia | Una señal conocida y una genérica podían compartir canales sin un ledger cerrado | Cada señal puntuada tiene origen; `generic_blind` excluye `known_pattern` |
| Blind mode | No había una frontera de producto comprobable | Perfil explícito y verificable, sellado en index y primarios |
| Deep Solidity | El contexto profundo podía quedar reducido al fichero target | Clausura cross-file derivada de endpoints callable MAP |
| Corpus | Ampliar contexto podía implicar un proyecto demasiado amplio | 256 ficheros/32 MiB por proyecto, catálogo y cache acotados |
| Cache | Reutilización sin este contrato de clausura | LRU con clave por descriptor y revalidación en cada hit |
| Batch | Coordinación monolítica de 8.530 líneas | Responsabilidades separadas; ningún fichero supera 6.000 líneas |

### Validación local de cierre

Ejecutada el 22 de julio de 2026 sobre Windows:

```text
cargo test --locked --all-targets --all-features
resultado: 299 passed; 0 failed; 0 ignored

cargo test --locked --doc
resultado: correcto

cargo fmt --all -- --check
resultado: correcto

cargo clippy --locked --all-targets --all-features -- -D warnings
resultado: correcto

cargo build --locked --release --all-targets --all-features
resultado: correcto

git diff --check
resultado: correcto
```

Los 299 tests corresponden a 223 unit tests y 76 tests distribuidos entre los
binarios/integraciones reportados por Cargo. No representan protocolos ni
vulnerabilidades.

### Riesgos y trabajo pendiente explícito

- `compatibility` sigue siendo el perfil por defecto. Un caller que necesite
  separación blind debe solicitar y verificar `generic_blind` explícitamente.
- La clausura depende de aristas y bindings MAP. TRACE no puede reparar una
  función ausente o una llamada ambigua en MAP; ese caso conserva deuda o falla.
- Los límites son deliberadamente cerrados. Un proyecto legítimo que supere 256
  ficheros, 32 MiB o una dependencia de 8 MiB no se analizará parcialmente como
  si fuera completo.
- El techo de cache contabiliza bytes de fuentes como proxy de retención; no es
  un límite de RSS impuesto por el sistema operativo.
- Los fallbacks deterministas siguen siendo heurísticos donde no existe una
  autoridad AST exacta.
- No se ejecutaron benchmarks v1-v8, 90 labs, canarios, holdout blind ni una
  medición de rendimiento durante este cierre documental.

### Afirmaciones no respaldadas

No se afirma mejora de recall, precisión, tiempo, memoria, ruido, explotación o
generalización. Lo verificado es el cierre de procedencia, la clausura física
acotada, la revalidación de evidencia y la mantenibilidad del código.
