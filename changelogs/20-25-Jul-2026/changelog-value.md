# Registro de cambios

## 24 de julio de 2026 — proof closure física y frontera real de candidatos

Commit funcional: `913e61bfbd3d43e6ad07057d4f3d81c5e5c1e8b8`.

### Qué se ha modificado

- VALUE construye la autoridad MAP desde el wire exacto de `EvidenceItem`, con
  paridad entre MAP inline y proyectado. Owners, campos desconocidos,
  `economic_values` y copias nested no pueden autoautorizarse.
- La autoridad TRACE usa solo `evidence_items` nativo y recompone cada ID; los
  `source-*`, `native-source-*` y `trace-economic-evidence-*` permanecen
  linaje semántico y nunca sustituyen evidencia física.
- Una obligación `invariant_relation` solo cierra con el `invariant_id`
  solicitado, un único scope `{flow_id,route_digest}` y un conjunto no vacío de
  referencias MAP/TRACE físicamente reconciliadas.
- Las alternativas se factorizan por
  `{candidate_id,canonical_issue_key}` sin fusionar rutas distintas. Solo un
  modelo `technical_only` con `proof_rank<2` queda fuera de la frontera de
  producto; sigue siendo localizable por una request dirigida.
- El budget distingue paths raw, modelos técnicos no candidatos, paths
  elegibles, retenidos y omitidos. Solo omitir un elegible por encima de 4.096
  crea `ranked_attack_paths_truncated`.
- Los límites TRACE separan wire físico y proyección retained: 100 MiB de
  índice, 4 GiB por primario, 100.000 miembros, 64 GiB físicos, 64 MiB
  semánticos por primario y 256 MiB semánticos por batch.

### Por qué

La cantidad de modelos técnicos no debía consumir el mismo presupuesto que las
rutas candidatas, ni una request debía convertir su propio contenido o linaje
en prueba. El nuevo cierre preserva alternativas para búsqueda dirigida y
exige que la evidencia exista antes e independientemente de la request.

### Evidencia de validación disponible

Se añadieron tests de factorization determinista, rutas distintas, frontera
4.096/4.097, búsqueda dirigida de no-candidatos, evidencia MAP proyectada,
linaje, scopes de invariantes, límites físicos/retained y exact-empty. Compound
`r6` completó VALUE y produjo el `attack_paths.json` físico que se ligó después
a VALIDATE/FILTER. Es un canario conocido, no un benchmark completo.

### Límites y riesgos residuales

- `src/engine.rs` tiene ahora 6.348 líneas; `src/engine/tests.rs`, 3.204;
  `src/route_graph.rs`, 1.974; `src/proof_requests.rs`, 1.954; y
  `src/input.rs`, 2.638. El motor vuelve a superar el objetivo de 6.000 líneas
  y requiere una extracción por ownership con paridad, no una reducción
  cosmética.
- El contrato TRACE permanece vendorizado y requiere paridad de prebuild.
- VALUE valida el perfil TRACE pero no lo persiste como campo dedicado.
- Los límites retained de MAP/TRACE pueden rechazar inputs legítimos mayores.
- La proyección MAP debe evolucionar junto a cualquier nuevo campo consumido.
- La identidad física no sustituye CAS/read-only mounts y la publicación staged
  no afirma durabilidad crash-proof universal.
- La salud cross-repo se observó en Compound `r6`, pero no existe aceptación
  8/8, replay v1-v8/labs, holdout, CI remoto ni medición global nueva.

## 22 de julio de 2026 — sincronización del contrato TRACE compartido

El primer prebuild posterior al endurecimiento de la medición se detuvo antes
de compilar porque la comparación física del contrato TRACE detectó una deriva
real. La copia vendorizada de VALUE aún tenía 191.980 bytes y SHA-256
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

Esta entrada registra los cinco commits realizados en el repositorio entre el
21 y el 22 de julio de 2026. Describe cambios de implementación verificados; no
afirma que VALUE encuentre ahora más vulnerabilidades.

El rango revisado es
`cc64ab4805253b8fbf9620a8c6a303cca9492b7e..0d7bfb8394ecf8474eaa6fb91111211c1e18fc35`:

| Commit | Propósito |
| --- | --- |
| `c5a2633df4a40ae4e602ae4907f7f0e0495f7b61` | Añadir consumo MAP nativo sobre grafos, manejo acotado de inputs, sidecars de cobertura y schemas del grafo. |
| `7dee5235264d632b890384ee38cde7b7dabd0051` | Cerrar los namespaces de evidencia física y descartar efectos externos sin grounding. |
| `bd4c997cebab56bd5fcaa247dcd4b4b37898f00f` | Extraer módulos del motor, endurecer los presupuestos de materialización/pruebas y publicar outputs de forma transaccional. |
| `5e2f8124d8a37aff4429f84da76dc06f2fd25a65` | Añadir gates de GitHub Actions fijados y locked. |
| `0d7bfb8394ecf8474eaa6fb91111211c1e18fc35` | Sustituir el descubrimiento recursivo de TRACE por autoridad de pruebas TRACE v2 acotada y guiada primero por el manifiesto. |

En ese rango, Git registra 26 rutas modificadas, 15.736 inserciones y 5.292
eliminaciones. Las adiciones incluyen un contrato canónico TRACE vendorizado de
5.047 líneas y, por tanto, no miden por sí solas nuevo razonamiento de VALUE.

### Límite de responsabilidad

VALUE sigue siendo una fase de análisis determinista para activos, flujos de
valor, límites de autoridad, relaciones de estado/contabilidad, rutas de ataque
candidatas, screening de payability y proof packs opcionales.

- VALUE no emite findings confirmados ni veredictos de VALIDATE.
- Una prueba de valor `complete` significa que el input es estructuralmente
  consumible por VALIDATE; no significa `supported` ni explotable.
- VALUE no decide la admisión de FILTER ni ejecuta PoCs.
- Las solicitudes de prueba son instrucciones de búsqueda y nunca evidencia.
- El ground truth de benchmarks no es un input. El campo legacy
  `top20_ground_truth_overlap=0` se conserva únicamente como placeholder de
  compatibilidad v1 deprecado.

### Antes y después

Antes de este rango, el código Rust first-party bajo `src/` contenía 7 archivos
y 13.521 líneas. `src/engine.rs` contenía 10.167 líneas. El repositorio exponía
67 funciones `#[test]`.

En `0d7bfb8394ecf8474eaa6fb91111211c1e18fc35`, `src/` first-party contiene 13
archivos Rust y 18.228 líneas. `src/engine.rs` tiene 5.587 líneas; la lógica de
rutas de ataque, el razonamiento de pruebas, los helpers compartidos de valor,
los tests, la validación del grafo de rutas y el límite consumidor de TRACE
están separados en módulos dedicados. El inventario ejecutable es de 101 tests.

La extracción redujo materialmente el motor central, pero la modularización no
ha terminado: `src/engine.rs`, `src/engine/tests.rs`, `src/route_graph.rs`,
`src/proof_requests.rs` y `src/input.rs` continúan siendo módulos importantes.

### Contratos de entrada y autoridad física

#### Entradas de análisis obligatorias

- MAP, el modelo de protocolo, el modelo ECONOMIC y los invariantes sintetizados
  deben declarar sus schemas soportados exactos.
- Los schemas TRACE mal formados fallan de forma cerrada en vez de convertirse
  en un conjunto vacío de señales.
- El JSON se decodifica y su SHA-256 se calcula desde el mismo descriptor de
  archivo abierto.
- Se rechazan symlinks, reparse points de Windows, inputs con hardlinks, deriva
  de identidad física y sustituciones de ruta del mismo tamaño.
- Las claves JSON duplicadas se rechazan en los límites estrictos de control y
  TRACE.

MAP tiene un techo raw de 256 MiB. Por encima del umbral in-memory de 96 MiB se
transmite a una proyección semántica que conserva todos los campos consumidos
por VALUE, incluidas las rutas económicas completas y el grafo de rutas
factorizado completo. Los demás inputs JSON obligatorios tienen un techo de 512
MiB. El JSON de solicitudes de prueba dirigidas a candidatos tiene un techo de
64 MiB, además del límite semántico de 128 solicitudes.

#### Adquisición TRACE guiada primero por el manifiesto

Se eliminó el antiguo escaneo recursivo del directorio. VALUE abre ahora primero
el `index.json` físico, realiza el preflight de recursos únicamente sobre el
inventario `traces/<name>.json` declarado, exige que el verificador canónico v2
acepte el batch físico exacto y después vuelve a abrir y recalcular el hash de
cada binding verificado antes de que pueda aportar evidencia.

Los límites del consumidor son:

- `index.json`: 16 MiB;
- un primario: 192 MiB;
- cantidad de primarios: 4.096;
- manifiesto más todos los primarios retenidos: 256 MiB;
- ruta del primario: exactamente `traces/<name>.json` con dos componentes de
  ruta normales.

El traversal, las barras invertidas, las rutas absolutas/profundas, los
symlinks, reparse points, alias por hardlink, rutas duplicadas del manifiesto,
deriva en la cantidad/orden de targets y diferencias físicas de bytes/hash
fallan de forma cerrada. Los metadatos no declarados del pipeline no se enumeran
como evidencia TRACE.

La autoridad solo se devuelve después de que el
`solguard-trace-contract` canónico vendorizado acepte el
`trace.contract_manifest.v2` actual y sus contratos de cobertura,
materialización, evaluación factorizada, target-route y claims. Un archivo
directo `trace.v0.9` continúa disponible únicamente como
`standalone_compatibility_degraded`: se eliminan los miembros con autoridad, se
añade deuda explícita y se bloquean todas las pruebas VALUE completas.

#### Perfiles de análisis y origen de señales

El verificador canónico solo admite `compatibility` y `generic_blind`. Los
perfiles del batch y del primario deben coincidir. `generic_blind` exige
exactamente una capacidad `trace.signal_origins.v1` y ledgers completos y
ordenados de origen de mismatches, invariantes y prioridades; rechaza
`known_pattern`; y su resumen de patrones de bugs debe derivarse exactamente de
los títulos de los mismatches. Los artefactos de compatibilidad sin esa
capacidad no pueden transportar campos de origen sin sellar.

Estas comprobaciones establecen la integridad del perfil en el límite del
consumidor. Por sí solas no demuestran una ejecución blind ni generalización.

#### Verificador canónico vendorizado

`Cargo.toml` utiliza ahora el crate local del repositorio
`vendor/solguard-trace-contract`. En el checkout documentado, su source es
idéntico byte a byte a las copias de ECONOMIC y CORE, con SHA-256
`80535fc76f3b2bf2e4c3b19987e31dc0e5fee90bc3b598148493c002b8c1a162`.
Vendorizar hace autocontenido un checkout limpio de CI, pero exige una
sincronización deliberada entre repositorios cuando cambia el contrato
canónico.

### Autoridad de evidencias, flujos y pruebas

- La autoridad MAP y la autoridad TRACE nativa se indexan por separado.
- Los `evidence_items` TRACE de nivel superior deben declarar
  `source=solguard-trace` y una identidad canónica
  `trace-evidence-v1-<sha256>`.
- Las copias MAP bajo `solguard_map_context` no pueden proporcionar la mitad
  TRACE de `map_trace_reverified`.
- `trace-economic-evidence-*` continúa siendo linaje semántico. Las referencias
  económicas físicas deben resolverse mediante `source_evidence_ids`
  respaldados por MAP.
- Las referencias desconocidas, ambiguas, reubicadas, parcialmente descritas o
  falsificadas de archivo/línea se eliminan antes de construir rutas y pruebas.
- Los efectos externos solo se conservan cuando tanto el efecto como su
  evidencia a nivel de miembro continúan grounded en source. La normalización
  de evidencias preserva groundings físicos distintos en vez de colapsarlos por
  su texto visible.
- Cada `economic_flow_identity.v2` se recalcula contra la autoridad única de
  función, operación, causal-edge, value-link y asset-leg de MAP. La confianza,
  las fases derivadas, las cantidades y los hechos contables se vuelven a
  derivar; las rutas legacy, parciales, duplicadas o conflictivas no pueden
  cerrar gates de mismo flujo ni de prueba completa.
- Los adjuntos TRACE y ECONOMIC deben identificar un único
  `{flow_id, route_digest}` exacto y coincidente. Un componente, substring,
  símbolo similar o el mismo activo no puede sustituir esa identidad.
- El cierre de pruebas dirigido a candidatos es estricto: la solicitud es solo
  una query; deben coincidir las identidades de candidato/superficie/obligación;
  la evidencia MAP y TRACE debe volver a verificarse de manera independiente;
  el binding de invariante debe ser exacto; y la prueba standalone debe ser
  igual a la prueba integrada en la ruta devuelta.

### Autoridad de valor nativa sobre grafos

VALUE valida y preserva ahora `economic_route_graph.v1` como un programa MAP
cerrado y direccionado por contenido. La validación cubre las keys exactas de
los objetos, IDs y digest canónicos, raíces, fragmentos, choices, eventos,
alternativas de llamada, referencias opcionales al evidence ledger MAP y la
aritmética literal upstream de `economic_route_graph_coverage.v1`.

El consumo del grafo no es enumerativo:

- los límites son 100.000 raíces, 100.000 fragmentos, 500.000 choices, 500.000
  eventos y 500.000 alternativas de llamada;
- VALUE recorre linealmente los objetos retenidos del grafo y nunca expande los
  productos de branches/llamadas en todas las rutas;
- se preserva el espacio `may` exacto y sobreaproximado;
- la sobreaproximación, los eventos parciales y las alternativas opacas no
  pueden crear un flujo v2 exacto, una prueba completa ni
  `validate_consumable=true`;
- el grafo aceptado se copia sin modificaciones a `value_model.json`;
- `economic_route_graph_consumption.v1` informa de
  `consumer=solguard-value`, `scope=full_graph`, del estado y la deuda upstream
  literales, y de cero omisión local;
- las capacidades del grafo y la proyección del sidecar no aparecen con input
  MAP legacy.

Los schemas públicos obtuvieron definiciones aditivas para el grafo y el
recibo de consumo, y `value_model.schema.json` exige que los dos campos
opcionales aparezcan juntos.

### Materialización VALUE acotada

`solguard-value-budget.v1` se integra en cada output primario y registra
límites, cardinalidades observadas/retenidas, cantidades agregadas exactas de
deuda y muestras de diagnóstico acotadas.

La fase modificó los techos duros de la siguiente manera:

| Límite | Antes | Después |
| --- | ---: | ---: |
| Pasos de la secuencia de flujo | 192 | 4.096 |
| Referencias de evidencia por entidad | 4.096 | 8.192 |
| Rutas de ataque ordenadas | 50 | 4.096 |

Se conservan los límites existentes de 1.024 referencias string ordinarias,
1.024 referencias de identidad de flujo, 128 referencias de evidencia por
prueba y 32 referencias de evidencia por motivo de fallo de prueba. Son techos
de seguridad posteriores a la deduplicación determinista, no tamaños normales
esperados.

Las reglas terminales importantes son ahora explícitas:

- una ruta v2 completa por encima del límite de pasos se difiere entera;
- VALUE nunca publica un prefijo bajo el ID autoritativo de la ruta original;
- se consideran todas las rutas anteriores al ranking antes de la frontera de
  4.096 outputs ordenados;
- una ruta superviviente número 4.097 crea deuda exacta de cobertura
  `ranked_attack_paths_truncated`, mientras que exactamente 4.096 no lo hace;
- la selección de evidencias preserva diversidad de artefactos y anchors v2
  autoritativos;
- `budget.status=coverage_debt` es diagnóstico/degradado, no análisis completo;
- una prueba `complete` sobre un flujo incompleto es un contrato terminal no
  válido.

También se cerró el manejo de recibos nativos/no nativos. `msg.value` solo
elimina deuda para una única función payable exacta y un paso respaldado por
source y resuelto. Una resta genérica, campos agregados raw y movimiento
`internal_token` no establecen autoridad de recibo externo; la misma ruta exacta
debe contener una transferencia respaldada por source y resuelta, y un
productor de recibo compatible.

### Contratos de output y límite de publicación

Las versiones primarias estables siguen siendo `solguard-value-model.v1`,
`solguard-attack-paths.v1`, `solguard-payability-candidates.v1` y
`solguard-value-diagnostics.v1`. Los campos del grafo, los presupuestos y los
sidecars son aditivos.

La publicación normal de la CLI es una única transacción:

1. El root de output solicitado debe estar ausente.
2. VALUE reserva un directorio de staging único junto al root final.
3. El JSON primario se transmite a archivos temporales exclusivos, se vacía y
   se sincroniza.
4. Los bytes instalados y el SHA-256 se comprueban volviendo a abrir cada
   artefacto.
5. Se escriben cuatro sidecars de cobertura vinculados por hash y
   `summary.txt`.
6. `proof_responses.json` se incorpora al mismo bundle cuando se proporcionaron
   solicitudes de prueba.
7. El inventario exacto staged debe contener únicamente archivos regulares no
   vacíos.
8. El directorio completo solo se renombra a su ubicación final después de la
   validación.

Si hay un fallo, se elimina el directorio de staging y no se publica ningún
resultado parcial aceptado en el root solicitado. Los roots existentes,
archivos regulares, symlinks y destinos con hardlinks nunca se sobrescriben ni
se tratan como estado reanudable.

Cada sidecar `solguard-coverage-manifest.v1` vincula el basename, schema, bytes y
SHA-256 del primario con el presupuesto compartido exacto y el resumen tipado.
El sidecar del modelo de valor proyecta deuda exacta de materialización de
flujos; el sidecar de rutas de ataque proyecta integridad de las pruebas y
rechaza una prueba completa sobre un flujo incompleto; los otros dos utilizan
una proyección explícita `not_applicable.v1`. Los sidecars son observabilidad
acotada, no evidencia sustitutiva.

### Modularización interna

- `src/engine/attack_paths.rs` es propietario de la construcción,
  normalización, deduplicación y ordenación de rutas, y de sus métricas.
- `src/engine/proof_reasoning.rs` es propietario de la construcción de pruebas
  de valor y de la lógica estricta de readiness/bloqueos.
- `src/engine/value_helpers.rs` es propietario de la extracción compartida de
  flujos de valor y de los helpers de identidad y presupuesto.
- `src/engine/tests.rs` mueve los tests privados del motor fuera del archivo
  central.
- `src/route_graph.rs` es propietario del contrato wire del grafo, la
  validación, el recibo y los tests del grafo.
- `src/trace_contract.rs` es propietario de los límites del consumidor TRACE,
  el inventario, el downgrade de compatibilidad y el manejo de JSON sin
  duplicados.
- `src/output.rs` es propietario de la publicación staged exacta y de los
  manifiestos de cobertura.

La API pública de la librería obtuvo exports aditivos del grafo de rutas y
`write_outputs_with_proof_responses`, que permite a la CLI publicar los
artefactos primarios y las respuestas dirigidas a candidatos bajo un único
bundle terminal. No se renombraron los flags de CLI ni los nombres de archivos
de output primarios existentes.

### CI y toolchain

- `rust-toolchain.toml` fija Rust `1.96.0`, `rustfmt`, `clippy` y el perfil
  minimal.
- GitHub Actions se ejecuta en `ubuntu-24.04` y `windows-2025`, con resultados
  de matriz independientes, timeout de 60 minutos y `fail-fast: false`.
- El checkout está fijado mediante el commit completo de la action, no se
  persisten credenciales y los permisos del workflow son read-only.
- CI ejecuta formato, Clippy locked sobre todos los targets/features y con
  warnings como errores, tests locked sobre todos los targets/features y un
  build release locked.

### Verificación realizada el 22 de julio de 2026

La auditoría documental volvió a ejecutar localmente el checkout actual:

- `cargo fmt --all -- --check` — correcto.
- `cargo clippy --locked --all-targets --all-features -- -D warnings` —
  correcto.
- `cargo test --locked --all-targets --all-features` — correcto: 74 tests de
  librería, 0 tests de binario, 2 tests de CLI y 25 tests de integración de
  VALUE; 101/101 en total, 0 fallidos y 0 ignorados.
- `cargo test --locked --all-targets --all-features -- --list --format terse` —
  correcto y listó exactamente 101 tests ejecutables.
- `cargo build --locked --release --all-targets --all-features` — correcto.
- `cargo metadata --locked --no-deps --format-version 1` — correcto con un
  paquete en el workspace.
- El SHA-256 del source TRACE vendorizado se comparó con las copias de ECONOMIC
  y CORE, y fue idéntico en este checkout.

### No ejecutado y claims no demostrados

- No se ejecutó ningún benchmark v1-v8, replay de los 90 labs, canario ni
  holdout independiente.
- En esta revisión documental no se observó ninguna ejecución remota de GitHub
  Actions.
- `SOLGUARD_TRACE_V2_SMOKE_ROOT` y `SOLGUARD_TRACE_V2_NEGATIVE_ROOT` no estaban
  definidos, por lo que no se ejecutó la rama opcional con artefactos reales del
  smoke test físico TRACE v2.
- No se midió ninguna comparación de tiempo de reloj, pico de memoria,
  throughput, recall, precisión o ruido.
- Los 101 tests correctos demuestran los contratos y comportamientos probados,
  no generalización blind, explotabilidad ni rendimiento para bug bounty.

### Riesgos residuales y siguientes pasos

- `src/engine.rs` sigue teniendo 5.587 líneas; `src/engine/tests.rs` tiene 2.093
  líneas, `src/route_graph.rs` 1.969, `src/proof_requests.rs` 1.597 y
  `src/input.rs` 1.586. Una extracción posterior debe guiarse por límites
  coherentes de ownership, no únicamente por la cantidad de líneas.
- El contrato TRACE canónico está vendorizado en varios repositorios. Las
  copias son ahora idénticas, pero el workflow actual no impone automáticamente
  la sincronización entre repositorios.
- VALUE verifica el perfil TRACE sellado, pero registra la clase de autoridad
  resultante en vez de persistir un campo de perfil dedicado en sus outputs.
- Los primarios TRACE aceptados se materializan como `serde_json::Value`
  después de la verificación canónica. El techo agregado de 256 MiB del
  consumidor es deliberado y puede rechazar un batch mayor que, de otro modo,
  sería válido.
- Un techo MAP de 256 MiB puede rechazar un MAP legítimo mayor. La proyección
  semántica solo es completa para los campos conocidos por la implementación
  VALUE actual; los nuevos campos MAP consumidos deben añadirse a la vez a las
  rutas inline y proyectada.
- La identidad de archivos, los hashes y el rechazo de links reducen las
  carreras en un host mutable, pero no sustituyen inputs inmutables respaldados
  por CAS, montajes read-only ni APIs de filesystem relativas a handles.
- El renombrado staged en el mismo parent es un límite fuerte de publicación,
  pero no se afirma durabilidad crash-proof en todos los filesystems ni
  seguridad frente a un administrador hostil.
- Los tests estructurales de grafos y pruebas no miden runtime ni memoria
  end-to-end sobre protocolos reales grandes.
- La salud de release continúa dependiendo de que CORE/deploy consuma de forma
  independiente la deuda de VALUE y falle cerrado; ese comportamiento entre
  repositorios no se volvió a ejecutar aquí.
