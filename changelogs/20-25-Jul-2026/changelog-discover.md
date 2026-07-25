# Changelog

Registro factual de cambios en `solguard-discover`. Este documento describe
contratos, límites y pruebas del código; no convierte regresiones conocidas en
evidencia blind ni atribuye métricas no medidas.

## 2026-07-24 - World model ligado a autoridad MAP/TRACE física

Commit funcional: `83773201bccc171cd6f6414e05db6752176e6fa4`.

### Qué se ha modificado

- DISCOVER construye su modelo solo con `EvidenceItem` MAP canónico de paths
  producer cerrados. Un `ev-*` copiado en un campo desconocido o un owner sin
  membresía física no entra en actores, assets, superficies o hipótesis.
- TRACE pasa a ser input obligatorio y manifest-first. Un directorio con solo
  `phase.json`, un índice de schema antiguo o JSON sueltos no puede degradarse a
  un fallback que parezca autoridad actual.
- La adquisición distingue bytes físicos de bytes semánticos retenidos y
  verifica inventario, primarios y dos pasadas antes de inferir.
- El grafo económico exactamente vacío es aceptable solo como cobertura
  negativa cerrada; no fabrica evaluaciones ni evidencia.
- En `generic_blind`, el orden de selección ignora scores heredados legacy y
  prioriza estructura pública/runtime y alcance del target.
- Los contratos de recursos y receipts semánticos usan enums, unidades,
  aritmética y orden canónico cerrados.

### Por qué

Un world model útil debe conservar hipótesis abiertas sin inventar autoridad.
Antes, un input legacy o una copia de evidencia en un lugar no declarado podía
parecer suficiente para continuar. Ahora la pérdida upstream permanece visible
y el modelo no la convierte en un cero sano.

### Evidencia de validación disponible

Se añadieron pruebas de evidencia MAP anidada, TRACE ausente/legacy,
exact-empty, límites de primarios, orden `generic_blind` y receipts de recursos.
El canario Compound `r6` terminó DISCOVER con la fase clasificada completa por
la evaluación posterior. No es prueba de generalización.

### Límites y riesgos residuales

- DISCOVER no recupera semántica que MAP/TRACE no hayan producido.
- Las hipótesis siguen necesitando VALIDATE, FILTER y revisión humana.
- `max_working_set_bytes` es un estimador estructural, no un límite de RSS.
- Los walkers y primarios tienen techos fail-closed que pueden rechazar corpus
  legítimos mayores.
- La compatibilidad histórica sigue siendo solo diagnóstica.
- No existe todavía aceptación 8/8, replay v1-v8/labs, holdout o CI remoto para
  este árbol sin commit.

## 2026-07-22 - Paridad física del contrato TRACE antes del prebuild

El primer prebuild de la nueva cadena inmutable se detuvo antes de compilar y
no emitió receipt. La comparación byte a byte encontró que la fuente canónica
de Core tenía 191.980 bytes y las copias de Discover y Validate 191.984 bytes.
El único diff en estos dos consumidores era una aserción que `rustfmt` expresaba
de forma distinta bajo las ediciones 2024 y 2021. La inspección completa
encontró además que FILTER conservaba una copia anterior de 176.486 bytes y no
contenía el cierre de señales para `generic_blind`.

En Discover no faltaba esa lógica funcional: el defecto local era de paridad
física. La expresión canónica se reformuló para pasar `rustfmt --check` bajo
ambas ediciones y `src/trace_contract_v2.rs` se resincronizó mecánicamente desde
`solguard-core/crates/solguard-trace-contract/src/lib.rs`. Tras la copia, ambos
ficheros tienen 191.990 bytes y SHA-256
`cfb01f0fa154352acd2400652fbb602fd86ead50bdeb271e9a3911c62fe47241`.

El gate de prebuild compara esta identidad junto con Validate, FILTER y los
vendors de VALUE, ECONOMIC e INVARIANT. El intento fallido no se reutiliza. Esta
corrección demuestra paridad del contrato y bloqueo de deriva; no aporta datos
de recall, precisión, ruido, rendimiento ni generalización.

La validación local de este cambio pasó `rustfmt --check` directo en ediciones
2021 y 2024, `cargo fmt --all -- --check`, Clippy locked con todos los
targets/features, 243 tests sin fallos y build release locked con todos los
targets/features. No se ejecutaron canarios, benchmarks ni labs.

## 2026-07-22 - Macroauditoría del world model y de sus entradas físicas

### Commits incluidos

- `567e242a856f5175887bc912b3d32ad3c8324876` - partición del motor y
  endurecimiento de intake.
- `d57aef24a2d7048f4a5997b272cf43938cf67d7e` - gates CI bloqueados.
- `fd12cf096cf000ec80db56d037e96291e5ce4194` - walker físico acotado y
  verificación de la autoridad de señales TRACE.

No se introdujeron reglas dirigidas a protocolos o benchmarks concretos. La
fase sigue construyendo un world model a partir de MAP, TRACE y fuentes, y no
confirma por sí sola una vulnerabilidad.

### Responsabilidad cerrada

DISCOVER consume artefactos sellados y fuentes físicas para construir
`protocol_model.json`, `coverage_contract.json`, `index.json` y representaciones
de revisión. Su responsabilidad es relacionar actores, estados, activos, rutas,
reglas e hipótesis con evidencia; no adquirir repositorios, reescribir MAP o
TRACE, validar explotación ni ocultar degradaciones de upstream.

- MAP requerido se procesa mediante una proyección semántica acotada, pero su
  dependencia sigue ligada al hash del fichero completo.
- TRACE sellado se valida contra su manifest, selección, primarios y contratos
  internos antes de admitir semántica.
- Las fuentes opcionales se enumeran completamente dentro de una frontera
  física y se seleccionan en orden determinista.
- Una omisión o incoherencia se refleja en `semantic_coverage.v2` y en
  `discover_coverage_contract.v2`; no se interpreta como ausencia de riesgo.

### `567e242` - modularización y entrada verificable

Antes de este commit, `src/engine.rs` tenía 10.863 líneas y `src/input.rs`
8.081. El cambio distribuyó responsabilidades:

- `engine/world_graph.rs`: construcción y recorrido del grafo causal.
- `engine/rule_model.rs`: reglas e invariantes del modelo.
- `engine/hypotheses.rs`: hipótesis blind/generales.
- `engine/model_construction.rs`: coordinación del modelo.
- `engine/scenario_evidence.rs`: escenarios y evidence binding.
- `engine/tests.rs`: tests internos del motor.
- `input/artifact_loading.rs`: apertura y medición de artefactos.
- `input/trace_contract.rs`: admisión del contrato TRACE.
- `input/trace_projection.rs`: proyección semántica TRACE.
- `input/tests.rs`: pruebas de contratos de entrada.
- `physical_source.rs`: frontera de fuentes físicas.

En el árbol final, los coordinadores `engine.rs` e `input.rs` tienen 65 y 205
líneas. El mayor fichero Rust es `trace_contract_v2.rs`, con 5.048; ningún
fichero supera 6.000 líneas.

La partición no elimina validaciones: las movió a módulos con ownership
específico y mantuvo los contratos `protocol_model.v0.1`,
`discover_coverage_contract.v2`, `economic_route_graph_consumption.v1` y
`discover_index.v0.1`.

### `d57aef2` - CI reproducible

- Rust `1.96.0`, `rustfmt` y `clippy` fijados.
- Matriz `ubuntu-24.04` / `windows-2025`.
- Formato, Clippy estricto, tests y release para todos los targets/features con
  `--locked`.
- Acciones fijadas por SHA, checkout sin credenciales persistentes, permisos
  read-only, timeout y concurrencia definidos.

Los gates equivalentes fueron ejecutados localmente. GitHub Actions remoto no
se ejecutó como parte de este cierre y no se declara verde remotamente.

### `fd12cf0` - autoridad de fuentes y señales TRACE

#### Walker físico acotado

La enumeración de fuentes dejó de depender de un traversal recursivo sin una
frontera completa. El walker actual es iterativo, conserva orden UTF-8
determinista y usa límites inclusivos:

- profundidad máxima: 64 componentes;
- entradas totales: 262.144;
- entradas por directorio: 65.536;
- directorios abiertos: 65.536;
- path relativo: 4.096 bytes UTF-8;
- nombres mantenidos por frames activos: 64 MiB;
- paths relativos retenidos: 64 MiB;
- fichero físico individual: 256 MiB como techo de la frontera física; los
  límites semánticos de producto siguen siendo menores y separados.

El walker:

- inspecciona cada entrada física y rechaza symlinks, reparse points y tipos no
  regulares;
- detecta dos nombres para la misma identidad física, incluidos hardlinks;
- liga cada fichero a path canónico, parent, identidad, bytes y timestamps;
- computa una huella del árbol;
- reenumera y compara el árbol tras la lectura para detectar drift;
- cuenta la cardinalidad elegible exacta aunque solo retenga el prefijo
  semántico permitido por `max_source_files`;
- falla cerrado al primer exceso en vez de publicar un model incompleto como
  exacto.

El orden determinista evita que el orden de `read_dir` decida qué fuentes
entran. El ledger distingue `eligible_observed` de `retained`; una omisión por
el límite de producto queda registrada como cobertura semántica.

#### Contrato de perfiles TRACE

DISCOVER valida el perfil sellado por TRACE antes de usar sus señales:

- valores cerrados: `compatibility` y `generic_blind`;
- el perfil del primario debe coincidir con el de la selección batch;
- `generic_blind` exige exactamente una capability
  `trace.signal_origins.v1`;
- `known_pattern` se rechaza en mismatches, invariantes y prioridad cuando el
  perfil es `generic_blind`;
- el ledger de invariantes debe ser uno-a-uno, canónico y sin duplicados;
- los orígenes de prioridad deben ser ordenados, únicos y coherentes con score;
- el resumen `candidate_bug_patterns` debe ser una derivación exacta de los
  mismatches admitidos;
- un artifact legacy de compatibilidad sin ledger puede diagnosticarse, pero
  no puede añadir campos de procedencia no autorizados.

La validación se incorporó tanto a la proyección TRACE como al verificador v2.
Un manifest resealed con perfil, origen o resumen incoherentes no adquiere
autoridad por ser JSON válido.

#### Intake TRACE y source intent

- Se mantuvo `trace.contract_manifest.v2` como autoridad actual y el contrato
  de dos pasadas lógicas/cuatro lecturas físicas por primario.
- Se conservaron envelope, closure, evaluations, claims y materialization
  aunque la proyección semántica opcional de un primario deba reducirse.
- Source intent utiliza el walker físico común, excluye documentos explícitos
  de known issues y vuelve a verificar el árbol tras inferir señales.
- Eliminar un campo o agotar un deadline no fabrica un cero exacto: usa
  `not_started`, `lower_bound` o deuda tipada según corresponda.

### Antes y después

| Área | Antes | Después |
| --- | --- | --- |
| Motor | `engine.rs` de 10.863 líneas | Coordinador de 65 líneas y módulos por responsabilidad |
| Entrada | `input.rs` de 8.081 líneas | Coordinador de 205 líneas y módulos de loading/TRACE/proyección/tests |
| Traversal de fuentes | Selección dependiente de una frontera menos explícita | Walker iterativo con límites, identidades, huella y segunda enumeración |
| Perfil TRACE | El contenido podía leerse sin validar un ledger cerrado de procedencia | Perfil batch/primario y `trace.signal_origins.v1` verificados |
| Blind | Riesgo de reintroducir known patterns por canales secundarios | `known_pattern` prohibido en todos los canales puntuados de `generic_blind` |
| Degradación | Riesgo de confundir un input reducido con ausencia | Omisiones y fases no iniciadas quedan en cobertura tipada |

### Validación local de cierre

Ejecutada el 22 de julio de 2026 sobre Windows:

```text
cargo test --locked --all-targets --all-features
resultado: 243 passed; 0 failed; 0 ignored

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

Los 243 tests son 236 tests de librería y 7 tests CLI. No equivalen a
protocolos, bugs ni casos holdout.

### Riesgos y límites residuales

- DISCOVER sigue dependiendo de la completitud y autoridad de MAP/TRACE. Puede
  exponer deuda, pero no recuperar semántica que upstream no produjo.
- El modelo es inferido; incluso con inputs exactos, una hipótesis sigue siendo
  candidata hasta VALIDATE/FILTER y revisión humana.
- `max_working_set_bytes` es un estimador estructural, no un límite de RSS
  impuesto por el sistema operativo.
- El walker falla en corpus legítimos que excedan sus techos. Esa decisión es
  preferible a ocultar omisiones, pero requiere una política explícita si el
  producto necesita repositorios mayores.
- Compatibilidad histórica sigue siendo legible para diagnóstico, pero no debe
  confundirse con autoridad release-clean v2.
- No se ejecutaron v1-v8, 90 labs, canarios, holdout blind ni medidas de tiempo,
  memoria, recall, precisión o ruido.

### Afirmaciones no realizadas

La macroauditoría prueba modularización, validación física y coherencia de
contratos en tests locales. No prueba descubrimiento de bugs nuevos ni que
DISCOVER sea más rápido o más preciso en protocolos reales.
