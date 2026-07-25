# Changelog

Este archivo registra cambios comprobables de `solguard-core`. No atribuye
mejoras de recall, precision, velocidad end-to-end ni generalizacion sin un
replay firmado y comparable.

## 2026-07-24 - Evidence ledger común y cierre de fallos Compound r3-r6

Commit funcional: `7bafd1a8167303242a2523e3ede5cda675b194c4`.

### Contratos reforzados

- Core comparte una única adquisición TRACE física de dos pasadas entre
  DISCOVER y VALUE, con receipts de bytes, primarios, límites y autoridad.
- MAP se consume mediante un ledger tipado de `EvidenceItem`; los owners y
  documentos derivados no pueden registrar por sí mismos `ev-*`.
- TRACE exact-empty se acepta solo como cobertura negativa cerrada. No puede
  fabricar evaluaciones, subjects o evidencia terminal.
- Los inputs grandes se leen por proyección bounded con bytes/hash/identidad
  física estables, duplicate-key rejection y límites separados de wire y heap.
- El input INVARIANT de VALIDATE/FILTER se selecciona mediante un manifest
  create-only que liga el primario original, la proyección bounded y el
  `value/attack_paths.json` físico.
- FILTER recibe el `attack_paths.json` original y el source-integrity exacto.
  Core exige que `filter_results.json`, Markdown, summary, `tool_phase.json` y,
  cuando aplica, `source_integrity.json` coincidan con los receipts publicados.

### Fallos causales corregidos

1. Una cohorte sin requests candidate-directed dejaba sin materializar
   `proof_responses.json` y podía abortar después del INVARIANT candidato. Core
   crea ahora un bundle vacío válido únicamente en un root ausente y rechaza
   destinos que no sean fichero regular.
2. FILTER publicaba `source_integrity.json`, pero Core esperaba un inventario
   de tres artefactos auxiliares y rechazaba el `tool_phase` de cuatro. El
   contrato de artefactos es ahora exacto y condicionado por la autoridad
   realmente entregada.
3. El set de hashes externo de FILTER omitía el `value/attack_paths.json` que
   Core y FILTER sí habían sellado. Deploy se corrigió para exigir exactamente
   esa autoridad física.

### Evidencia real conservada

- Compound `r3` completó el analyzer, pero FILTER falló por un gate set anterior
  y el gate reportó 10 errores.
- Compound `r4` avanzó hasta la fase candidate-derived y fue rechazado; el nuevo
  fallback vacío tiene tests específicos de root ausente y destino no regular.
- Compound `r5` completó el analyzer con 1/1 bug conocido, pero Core rechazó el
  inventario de artefactos FILTER; el gate reportó cinco errores.
- Compound `r6` completó todas las fases en 1:02:25 de runner, publicó
  `filter_results.json`, produjo 559 candidatos, 5 findings soportados, 225
  elementos de review queue y 1/1 match conocido. Su reporte persistido falló
  con un único error porque Deploy omitía `attack_paths` del set esperado.
- La reevaluación offline del root `r6` con el contrato corregido devolvió
  measurement integrity y product health correctos, sin issues. El root no se
  reescribe ni se promociona retroactivamente.

Estos números son regresión conocida sobre un único protocolo y no demuestran
precisión, mejora global o generalización blind.

### Límites y riesgos residuales

- No existe aceptación 8/8, v1-v8/labs finalizados, holdout ni receipts
  `finalize`/`verify` para este árbol.
- Los tests y un canario conocido no prueban calidad de findings en protocolos
  nuevos.
- `compatibility` sigue disponible para callers de transición.
- La identidad física reduce carreras, pero no sustituye CAS/read-only mounts
  ni una prueba independiente de ACL Windows.
- La medición completa de RAM, CPU, GPU, IO, storage, ruido, precisión y recall
  continúa pendiente del nuevo replay firmado.

## 2026-07-22 - Contrato runtime r3 de Ollama y retirada de r2

### Frontera de responsabilidad

Este bloque no modifica el motor de `solguard-core`, sus reglas, candidatos,
seeds ni decisiones. Cierra una ambiguedad operacional externa que podia hacer
que dos ejecuciones con el mismo modelo usaran ventanas de contexto distintas:

- Backend incorpora `OLLAMA_NUM_CTX`, usa `32768` por defecto y envia
  `options.num_ctx=32768` en cada request `/api/chat` de la cadena release;
- Deploy incorpora `solguard-ollama-runtime-policy.v1` al plan con el host
  cerrado `http://127.0.0.1:11435` y sella
  `OLLAMA_NUM_CTX=32768`, `OLLAMA_CONTEXT_LENGTH=32768`,
  `OLLAMA_NUM_PARALLEL=1`, `OLLAMA_NOPRUNE=true` y `OLLAMA_VULKAN=true` como
  entorno semantico;
- el orquestador verifica el receipt de prebuild antes de ejecutar Git, iniciar
  su daemon gestionado y ligado al receipt en el endpoint dedicado
  `http://127.0.0.1:11435`, o cualquier proceso de inferencia/scan;
- el preflight carga el modelo con `/api/generate` y consulta despues `/api/ps`;
  exige el modelo exacto, `context_length=32768`, tamano positivo y residencia
  GPU completa (`size_vram == size`);
- el catalogo y los 90 commits fijados se comprueban temprano mediante fetch
  exacto, `rev-parse` y `fsck`, antes de gastar horas en los canarios;
- la telemetria runtime liga el nombre del modelo, contexto, tamano total y
  tamano en VRAM a los receipts que pretendan ser completos.

El receipt liga tambien los ejecutables host usados por el setup y su cleanup,
incluidos Node, Git, Git Bash, Ollama y `taskkill`. Un Job Object Windows
kill-on-close contiene el daemon y sus runners; el listener debe pertenecer al
PID gestionado y un fallo de cleanup impide devolver exito.
La identidad canaria actual se publica como
`solguard-canary-release-binding.v2`, que añade contexto y politica Vulkan. El
lector conserva el binding legacy para evidencia historica, pero esa forma no
se reinterpreta como autorizacion r3 ni satisface el lock actual.

La validacion local final de Deploy descubrio 1.066 tests: 1.058 pasaron, 0
fallaron y 8 quedaron omitidos por condiciones declaradas, en 130,6 segundos.
PowerShell 5.1, `node --check` y `git diff --check` tambien pasaron. Son pruebas
de contratos y fallos simulados; no son una ejecucion r3 del producto.

`OLLAMA_VULKAN=true` expresa la politica sellada y la igualdad de tamanos
demuestra que Ollama declara el modelo observado completamente residente en
GPU. El probe no es una atestacion hardware independiente del driver, no prueba
por si solo la implementacion interna de Vulkan ni convierte el host local en
un entorno aislado.

`SetThreadExecutionState` evita la suspension ordinaria mientras vive el
orquestador, pero no garantiza una noche ininterrumpida: no cubre corte
electrico, reinicio forzado o Windows Update, fallo del driver/GPU ni una
perdida de red posterior al preflight.

### Compatibilidad y evidencia pendiente

El prebuild `r2` se conserva como evidencia historica de los commits, binarios y
host que sello. No satisface el nuevo entorno semantico, no contiene el Backend
actual, el ejecutable/endpoint dedicado ni la nueva precondicion runtime de
Ollama; por tanto esta retirado para la cadena r3 y no debe borrarse,
reinterpretarse ni reutilizarse.

No existe todavia un prebuild receipt r3 aceptado, una aceptacion canaria 8/8,
un replay r3 de v1-v8 o de los 90 labs, ni receipts r3 de `finalize`/`verify`.
La precision real, las metricas finales, la reduccion de ruido y la
generalizacion blind permanecen abiertas. Este cambio mejora reproducibilidad y
fallo temprano; no demuestra una mejora de deteccion.

## 2026-07-22 - Cierre previo al replay y frontera de medicion

### Que cambia y que no cambia en Core

No se ha anadido ground truth, logica de benchmark, reglas por protocolo ni una
nueva familia de vulnerabilidad a `solguard-core`. Core conserva la propiedad
del pipeline y sus recibos por fase; `solguard-deploy` conserva la propiedad de
la ejecucion congelada, la telemetria externa y la evaluacion post-hoc de recall
y ruido.

Esta separacion es deliberada. Entregar labels conocidos, precision o resultados
esperados al orquestador contaminaria el scan y haria imposible interpretar una
regresion conocida como evidencia limpia de producto.

### Perfil profesional de la siguiente ejecucion

Los runners canonicos de benchmarks y labs solicitan y verifican ahora
`generic_blind` explicitamente. `compatibility` sigue disponible como default de
transicion para callers historicos, pero ya no puede entrar silenciosamente en
la cadena release preparada. El perfil forma parte de la identidad runtime y la
aceptacion canaria rechaza cualquier respuesta o contrato que devuelva otro
valor.

Esto cierra una configuracion ambigua, no demuestra deteccion ciega ni mejora de
recall. v1-v8 y los 90 labs siguen siendo regresion conocida.

### Medicion sin invadir el motor

La cadena externa preparada genera `solguard-resource-telemetry.v3` y
`solguard-pipeline-measurement.v2`. Medira, si el replay termina y se verifica:

- tiempos de suite, protocolo y fase, con distribuciones R7;
- RAM, CPU e IO del arbol supervisado;
- CPU/RAM del host, GPU, VRAM observada por Ollama y presion de storage;
- throughput, eficiencia y bytes/files de manifests firmados;
- candidatos, soporte, ruido, recall conocido y loss ledger.

Las medidas de host, GPU y filesystem son globales y no se atribuyen en
exclusiva a Core. El IO de proceso no equivale a IO fisico de disco. La
precision real permanece no disponible sin adjudicacion independiente; el
proxy de bugs conocidos no se presenta como precision.

Los outputs historicos ya documentados no se conservan fisicamente. Por ello la
proxima ejecucion usa un bootstrap versionado: no publica `comparison.json`, no
afirma mejora y, si finaliza correctamente, se convierte en la nueva baseline
autoritativa para comparaciones posteriores.

### Paridad fisica del contrato TRACE

El primer prebuild posterior a este cierre fallo antes de compilar porque su
comparacion byte a byte encontro deriva real entre las copias del contrato TRACE.
La fuente canonica de Core y Validate diferian por una unica expresion formateada
de modo distinto entre rustfmt 2024 y 2021; FILTER conservaba ademas la copia
anterior y no incluia el cierre de `generic_blind`.

La expresion comun se reescribio de forma estable bajo ambas ediciones y la
fuente canonica se resincronizo con Validate, Discover, FILTER y los vendors de
VALUE, ECONOMIC e INVARIANT. El gate de prebuild compara ahora las siete copias,
no solo cuatro. El intento fallido no produjo receipt y su root no se reutiliza.
Este cambio corrige paridad de contrato y evita deriva silenciosa; no mide recall
ni rendimiento.

La sincronizacion revelo ademas que FILTER no consumia el perfil devuelto por el
receipt producer-v2. Su intake reconcilia ahora ese valor con el perfil retenido
en el indice despues de verificar los primarios; una fixture legacy se actualizo
al wire actual de señales. Validate paso 270/270 tests, Discover 243/243 y FILTER
330 correctos, 0 fallos y 2 ignorados, ademas de Clippy, formato y builds release.
En ese punto, antes del addendum r3 posterior, la suite de Deploy paso 1.037
tests, 0 fallos y 8 omitidos de 1.045 descubiertos en 129,3 segundos. Core paso
su suite completa con 693 correctos,
0 fallos y 2 ignorados de 695, ademas de formato y Clippy estricto.

### Estado verificable de esta fase

Los contratos, schemas, gates y pruebas locales de la medicion estan
implementados, incluida una sonda corta Windows/AMD de la telemetria. Todavia no
se han ejecutado los ocho canarios, v1-v8 ni los 90 labs con esta cadena. Hasta
que existan `finalize`, `verify` y sus receipts preservados, sigue siendo falso
afirmar una nueva cifra de recall, precision, consumo o velocidad del producto.

## 2026-07-22 - Macroauditoria de limites y autoridad operacional

Commits de producto documentados:

- `58921c8` - `feat(core): harden runtime boundaries and modularize orchestration`
- `5a20341` - `ci(core): enforce locked cross-platform gates`
- `36b2b0f` - `feat(core): seal pipeline authority and durable boundaries`

### Objetivo del bloque

El cambio no amplia el catalogo de familias de vulnerabilidad ni introduce
selectores por protocolo. Su objetivo es que el pipeline existente opere sobre
inputs fisicos delimitados, conserve una autoridad verificable entre fases y
falle cerrado ante ambiguedad, deriva o recuperacion incompleta.

Antes de este bloque varias responsabilidades correctas estaban concentradas en
archivos monoliticos y algunos limites operacionales dependian de comprobaciones
lexicas o de operaciones de filesystem no transaccionales. Despues del bloque:

- Core sigue siendo el unico propietario de la orquestacion del producto;
- backend sigue siendo solo transporte HTTP;
- toda mutacion de proyectos e ingesta usa limites de filesystem comunes;
- TRACE se invoca con un perfil y un origen de evidencia explicitos;
- las operaciones recuperables publican recibos y journals durables;
- la modularizacion conserva las APIs y las decisiones existentes, pero separa
  dominios que pueden probarse y revisarse de forma independiente.

### Modularizacion sin cambio deliberado de semantica

El commit `58921c8` sustituyo cinco concentraciones de codigo por fachadas y
modulos con una responsabilidad concreta:

| Superficie anterior | Estado actual | Distribucion principal |
|---|---:|---|
| `analyzer/finalizers.rs`, 13.476 lineas en el diff previo | fachada de 6 lineas | calidad de candidato, binding causal, binding de invariantes, rendering, discovery de modelo y admision a VALIDATE |
| `analyzer/runtime.rs`, 26.772 lineas en el diff previo | fachada de 14 lineas | validacion contractual, ejecucion, runtime bounded de INVARIANT, contratos economicos MAP, proyecciones oversized, observabilidad y tool execution |
| `analyzer/tests.rs`, 22.978 lineas en el diff previo | fachada de 7 lineas | admision, evidencia, patrones cross-language, modelo/VALIDATE y tres grupos de patrones fuente |
| `filter.rs`, 12.359 lineas en el diff previo | fachada de 11 lineas | inputs/ejecucion, autoridad INVARIANT, autoridad TRACE y suites de contrato |
| `trace_projection.rs`, 6.107 lineas en el diff previo | fachada de 8 lineas | lector bounded, modelos consumidores, evaluacion factorized y tests |

Ningun fichero Rust rastreado de Core supera ahora 6.000 lineas. Esto reduce el
radio de cambio y hace visibles las dependencias entre fases; no se presenta
como evidencia de una mejora de deteccion ni como prueba de que todos los
modulos hayan alcanzado ya su tamano ideal.

### Frontera comun de filesystem

`src/services/filesystem_boundary.rs` centraliza reglas que antes podian
divergir entre proyectos, ingesta, Git y artefactos:

- componentes UTF-8/NFC canonicos y nombres de proyecto sin alias silenciosos;
- rechazo de `.`/`..`, separadores alternativos, componentes vacios, escapes y
  colisiones por normalizacion;
- comprobacion lexical y fisica de contencion bajo la raiz autorizada;
- rechazo de symlinks, reparse points y hardlinks cuando la autoridad exige un
  unico fichero fisico;
- apertura estable, limites inclusivos de bytes y revalidacion de identidad y
  metadata antes/despues de leer;
- publicacion create-only mediante staging hermano y renombrado atomico;
- eliminacion limitada a roots canonicos gestionados por Core.

Los nombres validos no se "arreglan" ni se renombran. Una request no canonica se
rechaza para impedir que dos nombres HTTP o dos rutas logicas apunten al mismo
estado fisico.

### Proyectos y fuentes locales

`projects.rs` aplica la frontera comun a creacion, listado, reset y resolucion:

- `init` es create-only y no adopta un directorio preexistente;
- `program.json` y los roots de source/output se publican de forma atomica;
- la ruta fisica del proyecto debe permanecer bajo `projects_dir` antes y
  despues de la operacion;
- los targets locales solo se admiten bajo `local_source_roots` configurados;
- una ruta local externa, enlazada, sustituida o ambigua falla antes de MAP;
- el lease por proyecto se mantiene durante toda la respuesta de analisis.

El cambio conserva los targets ZIP y Git, pero cada modalidad tiene una
autoridad separada. Una ruta local no puede hacerse pasar por ZIP ni por checkout
Git, y el handoff de source ZIP no se acepta en las otras modalidades.

### Ingesta durable y recuperacion

`src/services/ingest_transaction.rs` incorpora una transaccion durable para la
ingesta documental:

- intake limitado a `ingest_roots` fisicos configurados;
- plan cerrado de inputs antes de mutar base de datos o artefactos;
- journal create-only con identidad de transaccion, estado y hashes;
- staging separado de la publicacion final;
- commit y cleanup idempotentes;
- recuperacion de journals pendientes al arrancar el host;
- rechazo de journals desconocidos, truncados, reescritos o fuera de su root;
- preservacion conjunta del error operacional y del error de cleanup cuando
  ambos existen.

La recuperacion no convierte un input incompleto en exitoso: o bien termina una
transaccion cuyo estado durable autoriza el cierre, o falla cerrado y conserva
el diagnostico.

### Ejecucion de herramientas y autoridad de proceso

La ejecucion de herramientas se aislo en modulos explicitos y ahora vincula:

- ejecutable canonico y argumentos cerrados;
- cwd y roots de lectura/escritura permitidos;
- entorno allowlisted sin herencia accidental de opciones de loader;
- timeout con terminacion del arbol de procesos;
- output bounded y publicacion solo tras validar el contrato de fase;
- recibos de fase separados del journal `phase.json` de Core.

La ruta Git usa una autoridad de transporte cerrada: URL canonica, commit
exactamente fijado, entorno aislado, hooks y submodulos desactivados, checkout
efimero y recibo de identidad. No se ejecuta codigo del repositorio remoto para
inspeccionarlo.

### Perfil TRACE y procedencia de evidencia

El contrato compartido de TRACE incorpora un perfil de analisis tipado. Core
admite `compatibility` para consumidores legacy y `generic_blind` para ejecucion
general sin conocimiento del protocolo. El perfil se propaga como dato sellado,
no como texto libre.

Los seeds y señales llevan origen estructurado. Core distingue autoridad MAP,
evidencia TRACE nativa, contexto heredado y fuentes exploratorias; copiar un ID
a otro artefacto no cambia su procedencia. El binding a VALIDATE/FILTER sigue
requiriendo la autoridad fisica y los contratos ya definidos para cada fase.

Este cambio no agrega nombres de protocolos, IDs de benchmarks ni ground truth
al pipeline de producto.

### Configuracion y salud operacional

`CoreConfig` declara de forma separada:

- `projects_dir` para estado gestionado por Core;
- `local_source_roots` para targets locales autorizados;
- `ingest_roots` para documentos autorizados;
- rutas exactas de herramientas y base de datos;
- presupuestos y timeouts por frontera.

La separacion evita que `projects_dir`, un root de ingesta y un root de source
adquieran permisos implicitos entre si.

### CI reproducible

El commit `5a20341` fija el toolchain Rust del repositorio y endurece el workflow
multiplataforma. Los comandos canónicos usan lockfile y tratan warnings de
Clippy como errores. La validacion local de este bloque fue:

- `cargo fmt --check`: correcto;
- `cargo clippy --locked --all-targets --all-features -- -D warnings`: correcto;
- `cargo test --locked --all-targets --all-features`: 695 tests, 693 correctos,
  0 fallos y 2 ignorados por fixtures externos;
- `cargo build --release --locked --all-targets --all-features`: correcto;
- `git diff --check`: correcto.

Los workflows fueron validados localmente como archivos y comandos. No se
afirma que GitHub Actions remoto este verde porque esta sesion no hizo push ni
ejecuto jobs en GitHub.

### Antes y despues

| Antes | Despues |
|---|---|
| mutaciones repartidas con reglas de path no uniformes | una frontera de filesystem compartida y testeada |
| creacion de proyecto capaz de aceptar alias saneados | nombre canonico o rechazo; creacion create-only |
| ingesta sin journal de recuperacion de extremo a extremo | transaccion durable, recovery y cleanup verificados |
| ejecucion y validacion contractual concentradas en monolitos | modulos separados por autoridad y responsabilidad |
| origen de señales parcialmente implicito | origen tipado y perfil TRACE sellado |
| gates CI con variacion de toolchain/comandos | toolchain fijado y comandos locked multiplataforma |

### Limites y riesgos residuales

- No se ejecutaron canarios, v1-v8, labs ni holdout durante este bloque.
- Los tests demuestran invariantes de software y caminos de fallo; no demuestran
  calidad de findings en protocolos reales.
- No existe una medicion nueva de tiempo, RAM, GPU, precision o recall.
- `compatibility` sigue disponible por transicion; la aceptacion profesional
  debe exigir el perfil declarado por el producto y verificarlo end-to-end.
- La robustez ante ACLs depende de primitives distintas por sistema operativo;
  los tests de modo POSIX no sustituyen una validacion independiente de ACL de
  Windows.

La conclusion permitida es limitada: Core tiene fronteras operacionales y
contratos internos sustancialmente mas estrictos y mejor aislados. La conclusion
que aun no esta permitida es que Solguard detecte mas bugs o produzca menos
ruido; eso requiere el replay nuevo que permanece congelado.
