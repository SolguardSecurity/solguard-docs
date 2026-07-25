# Registro de cambios

## 24 de julio de 2026 — autoridad MAP tipada y proyección TRACE separada

Commit funcional: `e8d30d719e7c6e0b411cf3f7b47221342d400f5d`.

### Qué se ha modificado

- ECONOMIC solo admite evidencia MAP desde `EvidenceItem` producer canónico.
  Recompone el `ev-<fnv64>`, exige la forma exacta de seis campos y rechaza IDs
  de owner, copias anidadas y colisiones.
- Las rutas inline y proyectada construyen el mismo ledger físico y autorizan
  el mismo output. El padding no consumido puede recorrerse por streaming sin
  convertirse en evidencia ni ocupar el presupuesto semántico.
- La adquisición TRACE separa el techo físico del wire del presupuesto
  retenido: índice hasta 100 MiB, primario físico hasta 4 GiB, 100.000
  primarios y 64 GiB físicos agregados; la proyección semántica retenida queda
  en 64 MiB por primario y 256 MiB por batch.
- El contrato TRACE exact-empty y la identidad de cada
  `trace-evidence-v1-*` se verifican con la misma política compartida. Un vacío
  exacto expresa ausencia de sujetos, no evidencia positiva.

### Por qué

El anterior límite agregado mezclaba bytes físicos verificados y memoria
semántica retenida. Además, aceptar IDs por forma permitía que un documento
derivado pareciera autoridad MAP. La separación permite verificar artefactos
grandes sin cargar semántica irrelevante y mantiene la procedencia cerrada.

### Evidencia de validación disponible

Se añadieron tests de paridad inline/proyectada, padding superior a 96 MiB,
límites N/N+1, links en ancestors, budgets físicos/retained, evidencia anidada
y exact-empty. Compound `r6` completó ECONOMIC y la evaluación posterior marcó
la fase completa. No se ha medido rendimiento end-to-end del conjunto.

### Límites y riesgos residuales

- `src/engine.rs` conserva 5.630 líneas.
- El contrato TRACE sigue vendorizado; el prebuild debe mantener la comparación
  byte-exacta entre consumidores.
- El perfil TRACE se valida pero no se persiste como campo dedicado de output.
- El techo retained de 256 MiB puede rechazar un batch semántico legítimo
  aunque el wire físico sea admisible.
- Hashes e identidad reducen TOCTOU pero no sustituyen CAS/read-only mounts.
- La publicación staged no afirma durabilidad crash-proof frente a cualquier
  filesystem o administrador hostil.
- No existe todavía aceptación 8/8, v1-v8/labs, holdout, CI remoto ni medición
  nueva de rendimiento para este árbol sin commit.

## 22 de julio de 2026 — sincronización del contrato TRACE compartido

El primer prebuild posterior al endurecimiento de la medición se detuvo antes
de compilar porque la comparación física del contrato TRACE detectó una deriva
real. La copia vendorizada de ECONOMIC aún tenía 191.980 bytes y SHA-256
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

## Del 21 al 22 de julio de 2026 — fase de endurecimiento de la macroauditoría

### Alcance y base de evidencias

Esta entrada describe los cinco commits realizados en el repositorio entre el
21 y el 22 de julio de 2026. Es un registro factual de implementación, no una
nota de versión que afirme una mejora en el recall de vulnerabilidades.

El rango revisado es
`c91e21bee751d25df80b85ebba7bc4fc50e0a47c..a77087f2b1c05331d29be9a9d0bb56f3c24325f7`:

| Commit | Propósito |
| --- | --- |
| `1553d7af47c61415d7109ef887dd1402ed265706` | Añadir colecciones acotadas, consumo factorizado del grafo de rutas, manejo acotado de inputs y resúmenes de outputs vinculados mediante hash. |
| `126d21f8a5c61b74bc5f68ff798b3fc125a28145` | Cerrar la autoridad del grafo y las evidencias, y preservar la procedencia TRACE nativa frente a MAP. |
| `486c8a43b6abcddd06505e7593b758bcd8eaa0e3` | Extraer helpers y tests del motor, hacer transaccional la publicación de outputs y endurecer los schemas obligatorios de entrada. |
| `758ffc97bb18ee003de21aa53c0418e7286ef62f` | Fijar el toolchain de Rust e imponer gates de CI multiplataforma y locked. |
| `a77087f2b1c05331d29be9a9d0bb56f3c24325f7` | Sustituir el descubrimiento recursivo de TRACE por verificación TRACE v2 acotada y guiada primero por el manifiesto. |

En ese rango, Git registra 20 rutas modificadas, 14.667 inserciones y 2.619
eliminaciones. Esas cifras incluyen las 5.047 líneas del contrato canónico
TRACE vendorizado y no representan por sí solas nueva lógica neta de detección.

### Límite de responsabilidad

ECONOMIC sigue siendo un productor determinista de clasificaciones económicas,
relaciones, ecuaciones, escenarios, material de invariantes
concretos/sintetizados e hipótesis económicas. Esta fase no lo convirtió en
autoridad de veredicto ni de publicación:

- ECONOMIC no emite findings `supported`, `refuted` o `inconclusive`.
- No toma decisiones de admisión de FILTER ni ejecuta PoCs.
- Las comprobaciones económicas dirigidas a candidatos son evidencia para el
  procesamiento posterior de VALIDATE, no findings.
- Los inputs no resueltos, sobreaproximados, truncados o únicamente compatibles
  continúan siendo deuda explícita; no se interpretan como evidencia negativa.

### Antes y después

Antes de este rango, el código Rust first-party bajo `src/` contenía 7 archivos
y 8.529 líneas. Solo `src/engine.rs` contenía 7.030 líneas. El inventario de
tests incluía 39 funciones `#[test]`.

En `a77087f2b1c05331d29be9a9d0bb56f3c24325f7`, `src/` first-party contiene 12
archivos Rust y 15.087 líneas. `src/engine.rs` tiene 5.630 líneas, con módulos
separados para validación del grafo de rutas, cobertura de colecciones,
evidencias/helpers, contratos consumidores de TRACE y tests del motor. El
inventario ejecutable es de 83 tests.

Esta es una modularización parcial, no la finalización del objetivo de
mantenibilidad. El motor principal continúa siendo un módulo grande de 5.630
líneas y se registra más adelante como deuda residual.

### Contratos de entrada y autoridad física

#### Entrada JSON general

- El JSON se decodifica y su SHA-256 se calcula mediante el mismo lector
  acotado, en lugar de retener primero un segundo buffer completo de bytes.
- Un artefacto de entrada normal está limitado a 512 MiB y se rechaza antes de
  materializarlo como tipo si su tamaño físico supera ese límite.
- La identidad del archivo abierto se registra y se comprueba después de EOF.
  Unix utiliza dispositivo/inodo/número de enlaces; Windows utiliza número de
  serie del volumen, índice del archivo y número de enlaces.
- Los symlinks, reparse points de Windows, inputs con hardlinks y sustituciones
  de ruta del mismo tamaño fallan de forma cerrada.
- Los artefactos obligatorios MAP, TRACE, de protocolo y de candidato se
  comprueban contra sus versiones de schema soportadas. Un artefacto opcional
  solicitado que esté mal formado es un error, no un input ausente.
- Las claves duplicadas de objetos JSON se rechazan en vez de resolverse
  silenciosamente mediante deserialización donde prevalece la última clave.

#### Adquisición TRACE guiada primero por el manifiesto

El comportamiento anterior recorría recursivamente un directorio TRACE e
interpretaba cada archivo JSON encontrado. La ruta actual
`trace-consumer-input.v2` lee primero el `index.json` físico y adquiere
únicamente los primarios declarados por ese manifiesto.

El límite del consumidor es:

- `index.json`: como máximo 16 MiB;
- un primario TRACE declarado: como máximo 192 MiB;
- primarios declarados: como máximo 4.096;
- manifiesto más todos los primarios retenidos: como máximo 256 MiB;
- la ruta de un primario debe ser exactamente `traces/<name>.json`, sin ruta
  absoluta, barra invertida, traversal al padre ni un directorio más profundo;
- los padres físicos y los primarios deben ser rutas regulares, sin links ni
  reparse points;
- un primario debe tener un único enlace físico y no puede ser alias de otra
  entrada del manifiesto;
- la cantidad, el orden, la longitud en bytes y el SHA-256 en minúsculas de los
  targets del manifiesto deben coincidir con los primarios físicos.

El inventario léxico se utiliza únicamente para el preflight de recursos. La
autoridad solo se concede después de que el verificador canónico vendorizado
`solguard-trace-contract` acepte el batch físico exacto y sus contratos
`trace.contract_manifest.v2`, de agregado, target, cobertura, materialización,
evaluación factorizada y autoridad de claims. Después, los primarios se vuelven
a abrir, se recalcula su hash y se comparan con los bindings verificados antes
de que sus valores DOM entren en ECONOMIC.

Los archivos no declarados, como los metadatos del pipeline, no se recorren ni
se tratan como evidencia TRACE. Un archivo directo `trace.v0.9` solo continúa
siendo legible como `standalone_compatibility_degraded`: se eliminan sus
miembros con autoridad, se añade la limitación
`trace_standalone_compatibility_without_v2_batch_authority` y el input puede
aportar diagnósticos positivos, pero no autorizar completitud ni evidencia
negativa.

#### Perfiles de análisis y origen de señales

El verificador canónico solo acepta los perfiles de análisis TRACE
`compatibility` y `generic_blind`. El perfil se sella en el batch y debe
coincidir con cada primario. Bajo `generic_blind`, el primario debe anunciar
`trace.signal_origins.v1`; los ledgers de origen de mismatches, invariantes y
prioridades deben ser completos, ordenados y coherentes; `known_pattern` está
prohibido; y el resumen de patrones de bugs del candidato debe derivarse
exactamente de los títulos de los mismatches. Un input legacy de compatibilidad
no puede introducir campos de origen sin sellar.

Esto establece la integridad del input para el perfil seleccionado. Por sí solo
no demuestra que una ejecución fuera blind ni que el detector generalizara.

#### Verificador TRACE vendorizado

`Cargo.toml` consume ahora `vendor/solguard-trace-contract` como dependencia
local del repositorio. En el checkout documentado, el código vendorizado de
ECONOMIC, VALUE y CORE es idéntico byte a byte con SHA-256
`80535fc76f3b2bf2e4c3b19987e31dc0e5fee90bc3b598148493c002b8c1a162`.
La copia local elimina de un CI limpio una dependencia hermana no publicada,
pero convierte una futura deriva entre repositorios en un riesgo de
mantenimiento que debe comprobarse explícitamente.

### Cierre de evidencias e identidad

- La evidencia MAP solo se admite mediante las colecciones MAP que ECONOMIC
  consume realmente.
- Los `evidence_items` TRACE de nivel superior deben ser evidencia nativa
  `source=solguard-trace` con exactamente una identidad canónica
  `trace-evidence-v1-<sha256>`.
- Las copias MAP de `solguard_map_context` conservan procedencia MAP y no pueden
  satisfacer corroboración TRACE independiente.
- `trace-economic-evidence-*` es únicamente linaje semántico. Su evidencia
  física debe resolverse mediante `source_evidence_ids` respaldados por MAP.
- Las referencias de evidencia se reconcilian mediante namespace, archivo
  exacto y línea positiva. Las referencias desconocidas, ambiguas, falsificadas
  o parcialmente especificadas se descartan.
- Una validación terminal del modelo completo rechaza referencias que ya no
  coincidan con el índice cerrado de autoridad de inputs.
- `economic_flow_identity.v2` se recalcula desde la ruta MAP completa y su
  autoridad de operación, edge, value-link, asset-leg, cantidad, contabilidad y
  función. Los fallbacks por componente, substring o mismo activo no pueden
  crear un binding de ruta exacto.
- Las ecuaciones y los scopes sintetizados que nombran un flujo conservan
  exactamente un par `{flow_id, route_digest}`. Se preservan tanto el orden de
  la ruta como el orden causal de `branch_path`.

### Razonamiento nativo sobre grafos

El nuevo consumidor `economic_route_graph.v1` valida el grafo MAP cerrado y
direccionado por contenido, incluidas las referencias a raíces, fragmentos,
eventos y llamadas; los IDs y el digest canónicos; los conjuntos de identidades
ordenados; y el ledger upstream exacto `economic_route_graph_coverage.v1`.

El razonamiento está factorizado en vez de expandir un producto cartesiano de
rutas:

- los límites duros son 100.000 raíces, 100.000 fragmentos, 500.000 choices,
  500.000 eventos y 500.000 alternativas de llamada;
- los hechos `may` sobreviven a la sobreaproximación;
- los hechos `must` requieren cierre exacto y exhaustivo de raíces, fragmentos,
  llamadas y targets;
- las alternativas parciales u opacas no pueden demostrar ausencia ni fabricar
  un `economic_flow_identity.v2`;
- el ledger upstream completo de cobertura se conserva literalmente;
- ECONOMIC emite `economic_route_graph_consumption.v1` con
  `consumer=solguard-economic`, `scope=full_graph` y cero omisión local para un
  grafo aceptado;
- `economic_route_graph_reasoning.v1` registra los resúmenes `may`/`must` de
  raíces y fragmentos una vez por elemento del grafo, en vez de una vez por
  cada ruta posible.

El input MAP legacy continúa siendo diagnóstico, pero las capacidades y los
recibos nativos del grafo se omiten cuando no hay un grafo válido.

### Materialización económica acotada

`economic_collection_coverage.v1` se integra en ambos outputs primarios y se
proyecta en ambos sidecars de cobertura. Cada presupuesto cierra la aritmética
de elementos observados, duplicados, totales, retenidos, omitidos y bytes
después de deduplicar por identidad canónica. Cualquier omisión cambia el estado
global a `degraded` y se conserva como deuda de cobertura.

Los límites actuales son:

| Colección | Límite de cantidad | Límite de bytes de JSON compacto |
| --- | ---: | ---: |
| Relaciones económicas | 20.000 | 128 MiB |
| Escenarios económicos | 4.096 | 128 MiB |
| Invariantes concretos | 4.096 | 256 MiB |
| Hipótesis económicas | 4.096 | 128 MiB |
| Invariantes sintetizados | 4.096 | 256 MiB |
| Bindings de estado por ecuación | 256 | 16 MiB |
| Relaciones por ecuación | 512 | 32 MiB |

Los presupuestos por ecuación son independientes, por lo que la capacidad no
utilizada en una ecuación no puede ocultar una omisión en otra. El particionado
por componentes y la coincidencia local al source sustituyen los productos de
relaciones de todo el protocolo.

También se endurecieron los claims de recibos limitados al flujo. El movimiento
únicamente contable no establece `actual_received_covers_credited_amount`; la
autoridad de recepción no nativa requiere una transferencia respaldada por
source y resuelta, además de un productor de recibo compatible en la misma ruta
exacta; el movimiento del ledger `internal_token` no es un recibo externo. El
valor nativo solo se vuelve concreto para una única función payable exacta con
un paso `msg.value` resuelto y evidencia localizada. Un `value` desnudo de Vyper
se rechaza cuando un parámetro local lo oculta.

### Contratos de output y límite de publicación

Los schemas primarios estables siguen siendo `economic_model.v0.1`,
`synthesized_invariants.v0.1` y `economic_index.v0.1`; esta fase añadió campos,
sidecars y capacidades de forma aditiva.

La publicación trata ahora un informe como un único bundle terminal:

1. El root de output solicitado no debe existir previamente.
2. ECONOMIC reserva un directorio de staging único junto al root final.
3. El JSON se transmite a archivos temporales exclusivos, se vacía y se
   sincroniza.
4. Cada artefacto instalado se vuelve a abrir y se comprueba contra su longitud
   serializada en bytes y su SHA-256.
5. El directorio staged debe contener exactamente el inventario declarado de
   archivos regulares, no vacíos y sin links.
6. Solo entonces se renombra el directorio completo al root final.
7. Un fallo elimina el directorio privado de staging y no deja un informe
   parcial aceptado en el root solicitado.

El bundle normal contiene los dos primarios, sus dos sidecars
`solguard-coverage-manifest.v1`, `index.json`, `economic_model.md` y
`summary.txt`; cuando se solicita, el artefacto de candidato se incluye en la
misma transacción. El modo solo candidato publica su propio bundle nuevo de un
único artefacto.

Cada sidecar vincula el basename, el schema, los bytes exactos y el SHA-256 del
primario. Proyecta observabilidad acotada,
`economic_collection_coverage.v1`, salud de transiciones y, cuando existe,
cobertura/consumo del grafo. Nunca reemplaza a la evidencia económica.

### Modularización interna

- `src/coverage.rs` es propietario de la selección determinista por
  cantidad/bytes y de la aritmética de cobertura.
- `src/route_graph.rs` es propietario de los tipos wire del grafo, la
  validación, el razonamiento factorizado y los tests centrados en el grafo.
- `src/trace_contract.rs` es propietario del inventario TRACE del consumidor,
  los límites, el downgrade de compatibilidad y el wrapper JSON sin duplicados.
- `src/engine/evidence_and_helpers.rs` es propietario de la reconciliación de
  evidencias y de las utilidades compartidas del motor.
- `src/engine/tests.rs` elimina el gran bloque de tests dentro del módulo del
  archivo principal del motor, preservando el acceso de tests a módulos
  privados.
- `src/output.rs` es propietario de la publicación staged del bundle y de la
  construcción de sidecars.

No se renombró ningún flag de CLI ni ningún nombre de archivo de output
existente. La librería obtuvo módulos aditivos de grafo de rutas/cobertura y un
punto de entrada combinado de publicación
`write_report_with_candidate_evidence`.

### CI y toolchain

- `rust-toolchain.toml` fija Rust `1.96.0` con perfil minimal y los componentes
  `rustfmt` y `clippy`.
- GitHub Actions se ejecuta de forma independiente en `ubuntu-24.04` y
  `windows-2025`, con timeout de 60 minutos y `fail-fast: false`.
- El checkout está fijado mediante el commit completo de la action y no
  persiste credenciales.
- Los permisos del workflow son `contents: read`.
- Los gates de CI son formato, Clippy locked con warnings como errores, tests
  locked sobre todos los targets/features y build release locked sobre todos
  los targets/features.

### Verificación realizada el 22 de julio de 2026

La auditoría documental volvió a ejecutar localmente el checkout actual:

- `cargo fmt --all -- --check` — correcto.
- `cargo clippy --locked --all-targets --all-features -- -D warnings` —
  correcto.
- `cargo test --locked --all-targets --all-features` — correcto: 78 tests de
  librería, 0 tests de binario y 5 tests de integración; 83/83 en total, 0
  fallidos y 0 ignorados.
- `cargo test --locked --all-targets --all-features -- --list --format terse` —
  correcto y listó exactamente 83 tests ejecutables.
- `cargo build --locked --release --all-targets --all-features` — correcto.
- `cargo metadata --locked --no-deps --format-version 1` — correcto con un
  paquete en el workspace.
- El SHA-256 del source TRACE vendorizado se comparó con las copias de VALUE y
  CORE, y fue idéntico en este checkout.

### No ejecutado y claims no demostrados

- No se ejecutó ningún benchmark v1-v8, replay de los 90 labs, canario ni
  holdout independiente.
- En esta revisión documental no se observó ninguna ejecución remota de GitHub
  Actions.
- `SOLGUARD_TRACE_V2_SMOKE_ROOT` y `SOLGUARD_TRACE_V2_NEGATIVE_ROOT` no estaban
  definidos, por lo que no se ejecutó la rama opcional con artefactos reales del
  smoke test físico TRACE v2.
- No se midió ninguna comparación de tiempo de reloj, pico de memoria,
  throughput, recall, precisión o falsos positivos.
- Los 83 tests correctos demuestran los contratos y comportamientos probados;
  no demuestran generalización blind, utilidad para bug bounty ni calidad de
  detección.

### Riesgos residuales y siguientes pasos

- `src/engine.rs` sigue teniendo 5.630 líneas. Una extracción posterior debe
  preservar los invariantes privados y mantener tests de paridad de
  comportamiento alrededor de cada límite.
- El verificador canónico TRACE se copia en varios repositorios. Las tres copias
  son ahora idénticas byte a byte, pero el CI no las compara actualmente contra
  una única fuente de verdad compartida; sigue siendo necesario un mecanismo
  coordinado de sincronización/comprobación.
- ECONOMIC valida el perfil TRACE sellado, pero solo expone en sus capacidades
  la clase de autoridad resultante; no persiste el perfil seleccionado como un
  campo de output dedicado.
- La adquisición guiada primero por el manifiesto todavía materializa los
  primarios TRACE aceptados como `serde_json::Value` después de verificarlos. El
  límite agregado de 256 MiB del consumidor es, por tanto, intencionado y puede
  rechazar un batch productor mayor que, de otro modo, sería válido.
- Los descriptores estables, hashes, rechazo de links y comprobaciones
  posteriores a la lectura reducen las carreras en un host mutable, pero no
  sustituyen inputs inmutables respaldados por CAS ni montajes read-only.
- El renombrado del directorio y la sincronización de archivos aportan un límite
  fuerte de publicación local, pero la implementación no afirma durabilidad
  crash-proof en todos los filesystems ni protección frente a un administrador
  hostil.
- Los tests de grafos y colecciones establecen comportamiento lineal acotado y
  fail-closed sobre fixtures, no rendimiento end-to-end medido sobre datos de
  protocolos de producción.
- La salud de producto y la elegibilidad de release siguen siendo propiedad de
  los gates de CORE/deploy y requieren evidencia externa de ejecución nueva.
