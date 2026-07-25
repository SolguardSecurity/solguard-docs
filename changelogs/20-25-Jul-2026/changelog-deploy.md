# Changelog

Este archivo documenta cambios comprobables de `solguard-deploy`. Este
repositorio ejecuta, sella y evalua workflows; no es el motor que descubre
vulnerabilidades. Por tanto, sus gates no constituyen por si solos evidencia de
recall, precision, velocidad o generalizacion.

## 2026-07-24 - Cierre de contratos de detección y diagnóstico Compound r3-r6

Commit funcional: `566b1633341fecd819b17b27b2e49da5133ca14a`.

### Qué se ha modificado

- Los gates recomponen el ledger MAP canónico, la selección TRACE v3, receipts
  producer-v2, autoridad exact-empty, evidencia nativa y budgets físicos sin
  promover contratos legacy.
- Los streamers de artefactos grandes separan bytes físicos y payload
  seleccionado; prueban límites N-1/N/N+1, duplicate keys y exact-empty por
  encima de 100 MiB sin depender del modo inline.
- El prebuild ejecuta smokes reales de MAP runtime y del contrato de detección
  cruzado antes de publicar receipt.
- Los runners v1-v8 y labs transportan la autoridad local exacta, secretos
  internos fuertes y diferenciados y el contrato runtime del Backend.
- El gate FILTER exige el conjunto exacto de hashes físicos, incluido
  `value/attack_paths.json`; missing, stale o extra falla cerrado.

### Secuencia factual de Compound

- `dirty-contract-r3`: analyzer completo en 1:24:34, pero gate set FILTER
  incompatible, MAP/TRACE inválidos para el contrato vigente, ausencia de
  `filter_results.json` y 10 errores de product health.
- `dirty-contract-r4`: MAP, TRACE, DISCOVER, ECONOMIC, VALUE e INVARIANT
  terminaron; el request fue rechazado después del pase candidate-derived. Core
  incorporó un `proof_responses.json` vacío, cerrado y create-only para la
  cohorte sin requests.
- `dirty-contract-r5`: analyzer completo en 1:06:52 y 1/1 match conocido, pero
  Core rechazó el inventario FILTER porque el productor incluía
  `source_integrity.json`; cinco errores.
- `dirty-contract-r6`: analyzer completo en 1:02:25, todas las fases
  `completed`, `filter_results.json` presente, 559 candidatos, 5 findings
  soportados, 225 review y 1/1 match conocido. El reporte persistido conservó
  un único error: `FILTER does not preserve exact physical input authority`.
- La causa final fue un bug del evaluador: el set esperado omitía
  `attack_paths`, aunque Core y FILTER sí lo habían ligado. Tras corregirlo,
  una reevaluación offline del root inmutable `r6` pasó measurement integrity y
  product health sin issues. El reporte histórico no se sobrescribe.

### Validación ejecutada

- La suite completa de Deploy descubrió 1.114 tests: 1.106 correctos, 0 fallos
  y 8 omitidos por condiciones de entorno.
- Los tres tests cruzados ejecutados por setup —FILTER/verificador real,
  VALIDATE→FILTER y gate Core— pasaron.
- El root real `r6` se reabrió offline con el evaluador corregido y resultó
  release-eligible para ese canario aislado.

### Límites y riesgos residuales

- No existe un prebuild definitivo aceptado de esta identidad ni aceptación
  canaria 8/8.
- No se ejecutaron v1-v8, 90 labs, `finalize`, `verify` o holdout.
- El 1/1 de Compound es recall conocido de un protocolo, no generalización.
- Los ocho tests omitidos siguen sin aportar evidencia en este host.
- ACL owner-only Windows, aislamiento multi-tenant, capability attestation del
  worker y protección absoluta frente a suspensión/power/driver siguen fuera
  de lo demostrado.
- Los límites, modularización y tests no prueban menos RAM, CPU, ruido o tiempo
  end-to-end.
- GitHub Actions remoto sigue pendiente de una ejecución sobre los commits que
  finalmente se publiquen.

## 2026-07-22 - Atestacion fisica del Backend y smoke real obligatorio

### Incidente r4 y primera perdida

El prebuild `professional-r4` verifico 14 repositorios y 24 binarios. El unico
canario ejecutado, `v1:Compound-Finance`, arranco Bun y el Backend Rust, pero
fallo en 6.823 ms dentro de `Backend.start()` con `Managed backend runtime
attestation mismatch`. No llego al preflight de modelo del runner, MAP ni a
ninguna fase de deteccion. Los otros siete canarios, la aceptacion 8/8, v1-v8,
labs, `finalize` y `verify` no se ejecutaron. El root y receipt r4 se conservan
como evidencia consumida y no son reutilizables.

El artefacto r4 solo retuvo el error generico. Una reproduccion aislada contra
el Backend real comprobo despues que los SHA-256 del binario y del contrato
coincidian, pero Rust devolvia paths fisicos existentes con la forma Windows
verbatim `\\?\...` y podia expandir una representacion corta 8.3. El runner
comparaba esa respuesta con `path.resolve` de forma lexical. Eran dos nombres
del mismo objeto fisico, no dos roots distintos.

### Correccion y cierre preventivo

- `backend-runtime-attestation.mjs` es el evaluador comun de v1-v8 y labs.
  Verifica estado, servicio, SHA-256 del Backend y del contrato, conjunto exacto
  de keys, trece paths runtime y un unico `local_source_root`. Los errores
  publican nombres de campos, nunca sus valores ni secretos.
- La atestacion live exige que los roots existan y compara identidad fisica
  canonica; admite variantes Windows solo si resuelven al mismo objeto. La
  validacion offline del contrato sellado conserva igualdad lexical estricta.
  Roots ausentes, adicionales, hermanos, prefijos parecidos o destinos fisicos
  distintos siguen fallando cerrado.
- El evaluador entra en la clausura legacy: ahora son 36 componentes, formados
  por 25 modulos JavaScript alcanzables y 11 recursos corpus/runtime, sin
  cambiar el schema del contrato.
- `backend-runtime-smoke.mjs` levanta el Bun interno y el binario Rust exacto en
  puertos, database, projects y source root efimeros. Comprueba que health
  publica y con clave incorrecta no expongan la atestacion y que health
  autenticada cierre hashes y los 14 paths. No llama a `/analyze` ni al modelo.
- El smoke reutiliza el supervisor de procesos con Job Object kill-on-close en
  Windows y process group en POSIX. Drena descendientes aunque muera el
  launcher, limita incrementalmente health a 1 MiB y exige cleanup de procesos,
  puertos y temporal. El prebuild lo ejecuta antes de publicar el receipt y
  setup lo repite antes de iniciar Ollama; no existe bypass release.

### Validacion y limites

La suite completa final de Deploy descubrio 1.082 tests: 1.074 pasaron, 0
fallaron y 8 quedaron omitidos por condiciones de plataforma, en 131,5995386
segundos. Incluyo el caso de un launcher que muere dejando un descendiente. El
smoke final con el Backend real termino en 815 ms, verifico 14 paths y dejo
libres `4399`/`5399` y cero roots temporales.

Estas son pruebas de ingenieria del arranque y de sus contratos. No se ha
ejecutado un canario nuevo con esta identidad y no demuestran recall, precision,
ruido, rendimiento del scan ni generalizacion. La siguiente evidencia valida
requiere commits limpios, prebuild y roots r5 nuevos.

## 2026-07-22 - Autoridad local exacta en los runners v1-v8

### Incidente observado

La primera ejecucion canaria de la cadena `professional-r3` supero la
verificacion del prebuild receipt, el arranque del Ollama dedicado, la sonda del
modelo y el preflight de los 90 commits fijados. Sin embargo,
`v1:Compound-Finance` fallo antes de MAP. Backend rechazo el ZIP local con el
mensaje exacto `local ZIP analysis source is disabled; configure
SOLGUARD_LOCAL_SOURCE_ROOTS`.

El snapshot materializado no era la causa: el archivo tenia 2.624.741 bytes y
SHA-256
`79062d620e45ac2d771279aeb151be9ff8fbbfc559047965635e5e0a179ef993`.
El defecto estaba en los ocho runners legacy `protocols-v1.mjs` a
`protocols-v8.mjs`: conocian `snapshotDir`, pero no lo concedian al Backend como
raiz local autorizada. El intento creo evidencia parcial solo en el root de
Compound. La cadena `r3` se conserva como evidencia fallida y queda retirada;
sus roots no se reutilizan.

### Correccion contractual

- Los ocho runners derivan `SOLGUARD_LOCAL_SOURCE_ROOTS` exclusivamente del
  `snapshotDir` absoluto, normalizado y propio de la suite. No heredan una
  autoridad ambiental y no admiten multiples roots, delimitadores ambiguos ni
  la raiz de un filesystem.
- El directorio autorizado se crea fisicamente antes de iniciar Backend.
- La salud gestionada debe devolver exactamente un `local_source_roots` y debe
  coincidir con el snapshot esperado. Ausencia, roots extra, paths hermanos,
  prefijos parecidos y formas no canonicas fallan cerrado.
- `snapshot_dir` y `local_source_roots` forman parte de la configuracion
  hasheada de `solguard-benchmark-execution-contract.v1`, por lo que cualquier
  deriva invalida resume. La aceptacion canaria los vuelve a reconciliar contra
  `<suite-root>/snapshots` antes de comparar la identidad comun de los ocho
  canarios.
- El helper vive en `toolchain-git-state.mjs`, ya incluido en la clausura
  sellada. El cierre legacy permanece en exactamente 35 componentes y no cambia
  el schema del contrato.
- El orquestador comprueba antes de iniciar la inferencia los veintidos
  endpoints loopback canonicos: benchmarks `4401-4408`/`5401-5408` y los tres
  workers de labs `4490-4492`/`5490-5492`. Un listener residual detiene la
  cadena antes de gastar tiempo de modelo o crear evidencia canaria. Ademas fija
  las bases de puerto de `full-run.sh` en `4400/5400`, por lo que variables
  ambientales residuales no pueden desplazar los canarios a endpoints distintos
  de los comprobados. El plan debe sellar exactamente `--parallel 3` para labs;
  asi el rango preflightado de tres workers no puede quedar corto por una deriva
  futura del plan.

### Validacion y limites

Las pruebas dirigidas terminaron 70/70. La suite completa de Deploy descubrio
1.076 tests: 1.068 pasaron, 0 fallaron y 8 quedaron omitidos por sus condiciones
de plataforma, en 130,07 segundos. Tambien paso `git diff --check`.

Estas comprobaciones prueban el contrato, sus rechazos y el cableado comun de
v1-v8. No se ha repetido ningun canario con esta correccion y no existe todavia
aceptacion 8/8 para la identidad nueva. Por tanto, este cambio no demuestra
recall, precision, reduccion de ruido, rendimiento ni generalizacion blind.

## 2026-07-22 - Cadena profesional de medicion previa al nuevo replay

### Alcance y limite de la fase

Esta fase prepara una ejecucion nueva de los ocho canarios, v1-v8 y los 90 labs.
No se han ejecutado todavia esos corpora y, por tanto, este cambio no afirma una
mejora de recall, precision, ruido o velocidad. Los resultados antiguos fueron
eliminados despues de documentarlos y ya no pueden usarse como evidencia
criptografica comparable.

La responsabilidad permanece separada: Core y las herramientas producen
evidencia de deteccion; Deploy fija la ejecucion, mide recursos y realiza la
evaluacion post-hoc contra el corpus conocido. Ground truth, recall y precision
no se introducen en Core ni en los inputs del scan.

### Contrato Ollama nocturno y preflight temprano

El plan autoritativo sella ahora `solguard-ollama-runtime-policy.v1`: endpoint
dedicado `127.0.0.1:11435`, contexto 32768, politica Vulkan requerida y GPU
obligatoria. El entorno semantico liga `OLLAMA_NUM_CTX=32768` para Backend,
`OLLAMA_CONTEXT_LENGTH=32768` para el daemon, `OLLAMA_NUM_PARALLEL=1`,
`OLLAMA_NOPRUNE=true` y `OLLAMA_VULKAN=true`. Cada request de la sonda envia
ademas `options.num_ctx=32768`; no se confia en defaults del servidor.

`setup-release.ps1` verifica primero el receipt de prebuild y solo despues
ejecuta las comprobaciones Git, inicia el `ollama.exe` exacto ligado por ese
receipt o permite cualquier inferencia/scan. Exige que el endpoint dedicado
este libre, no reutiliza ni detiene el daemon de usuario y asigna el proceso a
un Job Object Windows `KILL_ON_JOB_CLOSE`; `taskkill.exe` permanece sellado como
primera terminacion explicita. Verifica ademas que el listener pertenece al PID
gestionado y que el puerto queda libre tras el cleanup.
Stdout y stderr del daemon se redirigen a nombres create-only con UTC y UUID
bajo `_runtime-logs`; sus rutas se imprimen para diagnostico. Esos logs no son
evidencia autoritativa ni entran en las metricas del replay.
Una peticion minima de un token carga el modelo y `/api/ps` debe devolver el
modelo exacto, `context_length=32768` y residencia GPU completa
(`size_vram === size`). `size_vram > 0` ya no se acepta porque solo probaria
offload parcial. Vulkan queda descrito como politica solicitada; `/api/ps` no
permite afirmar que el backend observado sea Vulkan. Ambas respuestas se leen
por streaming con un limite estricto de 1 MiB; no se materializa primero un
cuerpo sin cota.

Antes de crear el primer root canario se ejecuta tambien el preflight de los 90
labs. Esta comprobacion valida catalogo y ground truth y, con concurrencia
maxima cuatro, crea autoridades Git efimeras para hacer fetch del SHA exacto,
`rev-parse` y `fsck` de cada commit. Los repositorios y el root temporal tienen
cleanup obligatorio y el preflight normal de `labs-release` se conserva como
autoridad posterior. No genera los 90 ZIP finales ni garantiza que la red siga
disponible horas despues.

Durante una ejecucion real en Windows, el orquestador mantiene temporalmente el
sistema despierto mediante `SetThreadExecutionState`; restaura el estado en
`finally` y conserva juntos un error operacional y cualquier fallo de cleanup.
No publica exito si el Job Object, el daemon, el puerto o el estado de energia
no quedan cerrados. No modifica el plan de energia del equipo. `ValidateOnly`
no adquiere esa inhibicion, aunque si realiza los preflights externos y carga
temporalmente el modelo.

Telemetria v3 conserva lectura de receipts legacy, pero los receipts nuevos
retienen la ultima observacion Ollama exacta por comando. La baseline release
strict exige modelo, contexto y residencia GPU completa; una observacion legacy
puede leerse, pero no autoriza una baseline nueva. La misma compatibilidad se
mantiene en los resumenes `pipeline-measurement.v2`.

La identidad nueva de canarios usa
`solguard-canary-release-binding.v2` para versionar explicitamente contexto y
politica Vulkan. El lector de `solguard-canary-acceptance.v1` conserva el binding
legacy sin esos campos para verificar evidencia historica, mientras que una
preparacion release nueva exige binding v2 y el entorno Ollama sellado. De igual
forma, los locks release v1/v2 historicos siguen siendo verificables; solo los
locks construidos desde el plan actual adquieren elegibilidad bajo el gate
Ollama nuevo.

Estas garantias estan cubiertas por pruebas unitarias y de contrato. En este
cambio no se han ejecutado canarios, v1-v8 ni labs y no se afirma ninguna mejora
de deteccion, recall, precision, ruido o tiempo total.

### Perfil de analisis release cerrado

Los runners canonicos de v1-v8 y labs envian ahora
`analysis_profile=generic_blind` y verifican que Backend devuelva exactamente
ese perfil. La politica reproducible pasa a `solguard-runtime-policy.v2`, con
campos exactos y el perfil incluido en su identidad.

La aceptacion 8/8 rechaza un resultado `compatibility` incluso si se han
recalculado coherentemente los hashes internos. Esto corrige una ambiguedad
real: antes, la peticion release no declaraba el perfil y heredaba el default de
transicion `compatibility`. El cambio no demuestra generalizacion; solo impide
que una ejecucion profesional preparada como blind use silenciosamente el
perfil equivocado.

### Bootstrap honesto y comparacion preservada

`current-pipeline prepare` exige ahora exactamente uno de dos modos:

- `--previous-artifacts-root`, para una comparacion respaldada por artefactos
  historicos retenidos;
- `--bootstrap-baseline`, cuando no existe esa evidencia fisica.

Los contratos `solguard-measurement-pre-run-lock.v2` y
`solguard-measurement-baseline.v2` sellan el modo elegido. En bootstrap todos
los descriptores historicos y `comparison.json` deben estar ausentes, y las
claims fijan `comparison_available=false` y
`detector_improvement=unavailable_without_previous_baseline`. `finalize` y
`verify` fallan si se mezclan ambos modos. La primera ejecucion bootstrap sera
la nueva referencia autoritativa para comparaciones futuras; no reconstruye ni
importa agregados documentales antiguos como si fueran artefactos firmados.

### Telemetria de recursos v3

`solguard-resource-telemetry.v3` amplia la supervision externa con:

- RSS, memoria virtual y privada del arbol de procesos;
- tiempo CPU e IO de lectura/escritura acumulados del arbol supervisado;
- pico de utilizacion CPU del arbol, expresado respecto de una CPU logica;
- RAM usada/disponible y CPU del host;
- uso y utilizacion GPU en Windows mediante contadores CIM vendor-neutral, y
  NVIDIA solo mediante un ejecutable fisico explicito;
- VRAM observada por Ollama;
- uso, espacio libre y disponible del filesystem que contiene el run root;
- cadencias separadas para proceso y sistema, cobertura, calidad y limitaciones
  explicitas.

El runbook usa el PowerShell fisico sellado por el pre-run lock, liga su hash y
tamano al receipt, lo reatesta al cierre y liga tambien el hash del storage root.
No se permite fallback por `PATH` en v3. Sustitucion de provider, regresion de
counters, overflow, muestras incompletas o deriva fisica degradan o invalidan
la evidencia segun su contrato.

Las atribuciones quedan cerradas: CPU, RAM e IO del arbol son observaciones del
proceso supervisado; CPU/RAM del host, GPU y filesystem son medidas globales y
no consumo exclusivo de Solguard. El IO es transferencia contabilizada por el
proceso, no IO fisico de disco. En una sonda local corta sobre Windows/AMD el
receipt v3 y su schema se verificaron y se observaron CPU, RAM, GPU, Ollama y
storage; esa sonda no mide el pipeline ni prueba una mejora.

### Medicion de pipeline v2

`solguard-pipeline-measurement.v2` conserva recall conocido, macro-recall,
ruido, densidad y loss ledger, y anade:

- distribuciones R7 `min/mean/p50/p95/max` de duracion por protocolo y fase;
- protocolos completados, candidatos y findings soportados por hora;
- CPU e IO del arbol por protocolo completado;
- files/bytes de los manifests de output firmados y bytes por protocolo;
- resumen de cobertura y calidad de RAM, CPU, IO, GPU, Ollama y storage.

Los bytes de output proceden solo de los manifests contenidos en command
receipts Ed25519 ya verificados; no se infieren recorriendo un root mutable. El
collector reconcilia esos receipts con cada receipt de telemetria y la
verificacion final vuelve a ligar ambos conjuntos.

La precision real sigue siendo `null` hasta que exista adjudicacion
independiente. `known_bug_precision_proxy` se conserva con una advertencia
explicita: un finding no enlazado al ground truth conocido no es automaticamente
un falso positivo. La comparacion v1/v2 admite las nuevas metricas operacionales
solo como `partially_comparable`, porque host, modelo y contencion tambien deben
ser equivalentes antes de interpretar un delta.

La baseline release v2 exige cobertura completa de CPU, IO, RAM, GPU, Ollama y
storage para ambos comandos, manifests firmados completos, duracion por
protocolo y metricas de eficiencia completas. Una medida ausente no se convierte
en cero ni permite publicar una baseline supuestamente completa.

### Orquestador canonico

`scripts/measurement/setup-release.ps1` implementa una unica cadena fail-closed:

1. valida paths fisicos, espacio, modelo local, plan, claves, repos limpios y el
   receipt del unico prebuild;
2. ejecuta secuencialmente los ocho canarios exactos en roots independientes y
   conserva cualquier fallo sin borrar ni reintentar en el mismo root;
3. exige aceptacion 8/8, estado limpio y `filter_results.json`;
4. prepara un root fisicamente ausente en modo bootstrap, sin recompilar;
5. ejecuta v1-v8 con el `--parallel 8` sellado;
6. vuelve a comprobar espacio y solo entonces ejecuta labs si v1-v8 termino con
   codigo cero;
7. ejecuta `finalize` y `verify` solo tras ambos comandos.

`-ValidateOnly` comprueba precondiciones sin crear ni modificar roots de
evidencia canarios/release ni la acceptance. Si puede crear los logs
diagnosticos no autoritativos de `_runtime-logs`, arrancar y detener el daemon
dedicado, cargar temporalmente el modelo y ejecutar los preflights externos. La reanudacion esta
limitada a canarios ya cerrados y revalidados; un release preparado o fallido no
se reutiliza. El ejecutable Node se resuelve a un fichero fisico y debe coincidir
con la identidad del receipt, igual que Git y Git Bash.

### Incidente real del primer prebuild y cierre de paridad TRACE

El primer intento de prebuild posterior al commit `0d1f1df` se detuvo antes de
compilar. El gate fisico encontro que el contrato TRACE compartido no era
byte-identico: Core y Validate diferian por formato, mientras que FILTER aun
conservaba la copia anterior al perfil `generic_blind`. No se publico receipt y
ese root no se reutiliza.

La correccion mantiene una unica fuente canonica en
`solguard-core/crates/solguard-trace-contract/src/lib.rs`, usa una construccion
estable bajo rustfmt 2021 y 2024 y vuelve a sincronizar todos los consumidores.
Ademas, el prebuild amplia su comparacion fail-closed de cuatro a siete copias:
Core, Validate, Discover, FILTER y los vendors de VALUE, ECONOMIC e INVARIANT.
El test de prebuild incluye ahora esos siete paths y demuestra que la deriva de
un vendor tambien bloquea la cadena. Esto corrige paridad de contrato; no es un
resultado de canarios ni una mejora medida del detector.

### Validacion local de implementacion

Se han ejecutado pruebas dirigidas para perfil, canarios, bootstrap, schemas,
telemetria, medicion v2, manifests, comparacion y orquestador. Tambien se han
compilado de forma estricta con AJV los schemas v2/v3 y se ha realizado la sonda
Windows/AMD descrita arriba. Tras los cierres finales del runtime, la suite
completa descubrio 1.066 tests: 1.058 correctos, 0 fallos y 8 omitidos por
capacidades opcionales del host, en 130,6 segundos. Este resultado no sustituye
los canarios ni el replay real.

## 2026-07-22 - Macroauditoria de autoridad de ejecucion y mantenibilidad

### Alcance y commits funcionales

- `09b86cd` - `feat(deploy): seal scan authority and modularize release gates`.
- `a8abf97` - `fix(deploy): unify scan execution component authority`.

La fase endurece la preparacion y ejecucion de scans, benchmarks conocidos y
labs. No anade reglas de vulnerabilidad, excepciones por protocolo ni
tratamiento especial de findings conocidos.

### Responsabilidad despues de la fase

`solguard-deploy` es responsable de:

- materializar entradas autorizadas y lanzar procesos con configuracion
  acotada;
- sellar componentes, repositorios, binarios y artefactos de una ejecucion;
- mantener separados scan, evaluacion y ground truth;
- ejecutar gates fail-closed y conservar diagnosticos de fallo;
- definir CI, runbooks y contratos de medicion reproducibles.

No es responsable de:

- decidir que una vulnerabilidad existe;
- elevar autoridad de MAP/TRACE/DISCOVER/VALIDATE/FILTER;
- convertir v1-v8 o labs-90 en evidencia blind;
- afirmar que una ejecucion es segura frente a un host comprometido;
- ocultar un fallo operacional para conseguir una release verde.

### Antes de esta fase

La infraestructura ya sellaba una superficie amplia, pero conservaba varios
gaps de madurez:

- las claves interna y externa del backend podian viajar dentro del mismo objeto
  de environment que se serializaba como runtime config;
- el ciclo prepare/run no tenia una autoridad fisica efimera comun para secretos
  ni cleanup obligatorio en todas las ramas de error;
- no todas las peticiones gestionadas compartian un helper de autenticacion
  externa;
- adquisiciones Git de labs dependian de una superficie Git mas ambiental, con
  mas configuracion heredable y una frontera de cleanup menos explicita;
- el health handshake no cerraba de forma uniforme los roots locales de source
  junto con los paths de todas las herramientas;
- el closure scan no incluia aun los nuevos modulos de auth/secrets y el closure
  legacy no incluia el import de auth del runner;
- `detection-coverage-check.mjs` y el test principal de pre-release superaban
  diez mil lineas, dificultando ownership, review y pruebas dirigidas.

### Runtime config v2 sin valores secretos

Se incorpora `solguard-scan-runtime-config.v2` y su JSON Schema Draft 2020-12.
El objeto mantiene exact keys y contiene run, batch, suite, output/runtime roots,
backend, timeouts y targets. Dentro de backend fija:

- directorios de backend y core;
- ejecutables absolutos Bun, Cargo, Git, Node y, en Windows, taskkill;
- puertos interno y externo;
- environment publico y su SHA-256;
- paths absolutos del conector database y las diez herramientas de pipeline;
- un descriptor de autoridad de secretos;
- targets con source path, bytes, raw SHA-256 y semantic tree SHA-256.

`INTERNAL_API_KEY` y `EXTERNAL_API_KEY` estan prohibidas en el environment
serializado. El schema no acepta propiedades adicionales y el contrato de
ejecucion sella tambien el propio schema.

Esto evita que los recibos/configs normales persistan el valor de las claves.
No significa que las claves nunca existan en memoria ni en disco: se
materializan temporalmente en una autoridad separada para cruzar la frontera
prepare/run.

### Autoridad efimera de secretos

`backend-secret-authority.mjs` divide el environment publico de dos secretos
distintos:

- `INTERNAL_API_KEY`: 16-256 bytes ASCII imprimibles sin whitespace;
- `EXTERNAL_API_KEY`: 32-256 bytes ASCII imprimibles sin whitespace.

El documento `solguard-backend-secrets.v1` se crea de forma exclusiva bajo el
control root, con un maximo de 4096 bytes. Su descriptor
`solguard-backend-secret-authority.v1` solo contiene schema, path absoluto
canonico, bytes y SHA-256.

Antes de consumirlo o destruirlo se comprueba:

- root fisico dentro de la autoridad esperada;
- archivo regular, no symlink y con un solo link;
- tamano exacto antes y despues de abrir;
- estabilidad por handle durante la lectura;
- SHA-256 exacto;
- JSON estricto y exact keys;
- claves validas y diferentes.

En POSIX, directorio y archivo se fuerzan a `0700`/`0600`. En Windows se
verifica identidad fisica y single-link, pero este modulo no demuestra de forma
independiente que la ACL sea exclusiva; esa limitacion queda abierta y
documentada.

La semantica de ciclo de vida es deliberada:

- prepare exitoso conserva la autoridad porque un run posterior debe consumir
  exactamente el secreto preparado;
- cualquier fallo despues de materializar durante prepare intenta destruirla;
- run consume el documento y siempre intenta destruirlo al cerrar, tanto en
  exito como en fallo;
- si fallan a la vez la operacion y el cleanup se devuelve `AggregateError` con
  ambos, en lugar de ocultar uno;
- los buffers leidos se rellenan con cero antes de liberarse como mitigacion
  best-effort, no como garantia del runtime JavaScript.

### Autenticacion externa comun

`backend-auth.mjs` es la fuente comun del header
`x-solguard-api-key`, validacion y generacion de la clave externa. Los runners
v1-v8, scan-only, labs-v1 y labs-v2 usan esa frontera en sus peticiones
gestionadas.

El valor generado incorpora 32 bytes aleatorios codificados en base64url y se
valida con el mismo contrato de 32-256 bytes imprimibles. Esto evita peticiones
anonimas accidentales al backend gestionado. La autenticacion sigue siendo una
clave compartida local; no es una identidad de usuario ni una politica de red
multi-tenant.

### Runtime paths y source roots

El launcher entrega al backend paths absolutos de database, MAP, TRACE, DIFF,
DISCOVER, ECONOMIC, VALUE, INVARIANT, VALIDATE, FILTER y EXPLOIT. Para cada
target entrega tambien `SOLGUARD_LOCAL_SOURCE_ROOTS` con el parent exacto del
snapshot; labs usan su snapshot root sellado.

El backend gestionado debe responder `/health` con:

- el SHA-256 del execution contract esperado;
- projects root y database path exactos;
- todos los runtime tool paths exactos;
- el array exacto de local source roots.

Un port ocupado por otro backend, un path distinto o una atestacion incompleta
falla antes de enviar `/analyze`. Esto cierra errores de configuracion y proceso
equivocado; no convierte `/health` en una atestacion hardware.

### Adquisicion Git sellada para labs

`sealed-git-cache.mjs` sustituye adquisiciones Git ambientales por una frontera
explicita:

- URL HTTPS canonica de `github.com`, sin credenciales, puerto, query o
  fragment;
- owner/repository validos y commit lowercase de 40 hex;
- ejecutable Git dentro del conjunto absoluto fijado para Windows/Unix;
- HOME/XDG aislados, config system/global deshabilitada y prompt/credential
  helper anulados;
- hooks dirigidos a un directorio vacio;
- submodule recursion, maintenance, auto-gc y smudge LFS deshabilitados;
- protocolos `file` y `ext` prohibidos; solo HTTPS;
- output combinado acotado a 8 MiB, timeout por defecto de 30 minutos y drenaje
  del arbol de procesos;
- bare repo efimero, fetch del SHA exacto sin tags ni `FETCH_HEAD`,
  `rev-parse <sha>^{commit}`, `fsck --strict --no-dangling` y archive;
- cleanup obligatorio del root efimero.

Si la operacion y la limpieza fallan, ambos errores se conservan. La red y el
servidor GitHub siguen siendo dependencias externas; el commit y los bytes se
verifican, pero este modulo no es un mirror offline independiente.

### Closure de ejecucion scan: 29 componentes

`solguard-scan-execution-contract.v2` sella ahora exactamente 29 componentes:

- 20 modulos JavaScript alcanzables por el worker, incluidos auth, autoridad de
  secretos, Git material y productor/consumidor del contrato;
- 9 recursos sellados: catalogo materializado, trust root, clave publica y seis
  schemas.

La superficie sigue excluyendo ground truth, splits, matcher y evaluador. El
worker reabre y rehashea los 29 componentes y recomputa los 13 estados de
repositorio antes y despues del scan.

El closure tiene una unica lista autoritativa exportada por
`toolchain-git-state.mjs`. El productor exige exact keys contra esa lista y
`protocols-scan.mjs` importa y reexporta la misma identidad para validar y
reabrir bytes. No hay dos arrays manuales que puedan divergir silenciosamente.

### Closure legacy: 35 componentes

El closure `solguard-benchmark-execution-contract.v1` usado por regresion
conocida y por identidad de canarios contiene 35 componentes. La incorporacion
de `backend-auth.mjs` al runner aumento la closure estatica y el builder
canonico se actualizo; canary acceptance reconstruye exactamente la misma
superficie.

`trace-producer-v2.mjs` permanece deliberadamente fuera de los closures worker
scan y legacy porque es TCB post-scan de detection/pre-release. Sus bytes se
sellan mediante el worktree material de deploy, prebuild y measurement lock; no
queda presentado como una dependencia del worker que no es.

### Hallazgos detectados durante el propio cierre

La madurez no se dio por supuesta. Los gates encontraron dos inconsistencias
reales durante la fase:

1. La primera suite completa del cambio de auth encontro que el import local
   `backend-auth.mjs` habia ampliado el grafo estatico del runner legacy sin
   ampliar su lista sellada. Se anadio al builder canonico, se actualizaron los
   tests de canary/runner y se revalido con 16/16 tests dirigidos mas la suite
   completa.
2. La revision documental posterior encontro que el productor del scan
   construia 29 componentes, incluido `git_material_module`, mientras el
   consumidor mantenia un array local de 28. Eso podia hacer que el worker
   rechazase el contrato real. `a8abf97` elimino la segunda autoridad, impuso
   exact keys en el productor y anadio un test que construye el contrato real,
   lo valida en el consumidor y reabre los 29 componentes. La correccion paso
   37/37 tests dirigidos y despues la suite completa.

Estos fallos no se ocultaron ni se convirtieron en excepciones. Ambos se
resolvieron en la definicion general de closure.

### Modularizacion de detection coverage

`detection-coverage-check.mjs` paso de 12394 a 5956 lineas. La logica extraida
se distribuye en modulos con ownership tematico:

- `detection-coverage-primitives.mjs`: 95 lineas;
- `detection-coverage-route-graph-contract.mjs`: 61 lineas;
- `detection-coverage-trace-factorized.mjs`: 2216 lineas;
- `detection-coverage-trace-selection.mjs`: 2036 lineas;
- `detection-coverage-stage-contracts.mjs`: 991 lineas;
- `detection-coverage-downstream.mjs`: 1720 lineas.

La compatibilidad de los 12 exports publicos se comprobo byte-semantica a nivel
de superficie. La refactorizacion no cambia thresholds, decisiones ni familias
de deteccion y no se presenta como una mejora de velocidad.

El total de lineas de todos los modulos no es menor que el antiguo monolito: la
ganancia medida es que ningun archivo de esta superficie supera 6000 lineas y
las responsabilidades pueden revisarse/probarse por separado. No se usa una
reduccion de LoC agregada inexistente como claim.

### Modularizacion del test pre-release

`test/benchmark/benchmark-pre-release-check.test.mjs` paso de 10364 a 2970 lineas. Se
extrajeron:

- `benchmark-pre-release-check-downstream.test.mjs`: 3048 lineas;
- `benchmark-pre-release-check-fixtures.mjs`: 4689 lineas.

La suite conserva sus nombres/casos y fixtures compartidos. Igual que en
produccion, la suma de lineas no se presenta como reduccion agregada; el cambio
reduce el archivo monolitico y separa fixtures de decisiones downstream.

### CI y reproducibilidad

El workflow `CI`:

- limita permisos a `contents: read`;
- fija checkout, Node setup y Bun setup por SHA;
- fija Node `24.16.0` y Bun `1.3.14`;
- instala con lockfile congelado;
- ejecuta en `ubuntu-24.04` y `windows-2025`;
- exige Prettier, `bash -n` sobre los runners principales y la suite Node
  completa;
- cancela runs obsoletos del mismo workflow/ref.

GitHub Actions remoto no se ejecuto durante esta sesion porque no se hizo push.

### Validacion local final

Sobre `a8abf97`:

- tests dirigidos de la autoridad unificada: 37 correctos, 0 fallos;
- `bun run test`: 1026 tests descubiertos, 1018 correctos, 0 fallos y 8
  omitidos por condiciones/fixtures de entorno;
- recheck documental de auth, secretos, scan contract, scan runtime y Git
  sellado: 33 tests descubiertos, 32 correctos, 0 fallos y 1 omitido porque los
  mode bits POSIX no estan disponibles en Windows;
- Prettier completo: correcto;
- `bash -n scripts/benchmarks/full-run.sh scripts/labs-v2/run.sh`: correcto;
- `git diff --check`: correcto.

La primera correccion de closure auth habia pasado ademas 16/16 tests dirigidos
antes de repetir la suite completa. Los checks documentales finales se
registran en el commit de este archivo.

### Trabajo no ejecutado y limites de la evidencia

- No se ejecutaron v1-v8, labs, canarios, prebuild, prepare, release, finalize ni
  verify durante esta macroauditoria documental.
- No se abrio ni ejecuto un holdout.
- No se midieron recall, precision, ruido, latencia, throughput, consumo de RAM,
  GPU o disco, ni una reduccion de tiempo end-to-end.
- Los 1026 tests validan contratos y fallos simulados; no sustituyen un replay
  real ni prueban que un backend/modelo externo complete todos los protocolos.
- Ocho tests quedaron omitidos por sus condiciones de entorno. La suite final
  fue verde con esos skips declarados, no 1026/1026 ejecutados.
- La autoridad de secretos crea un archivo efimero. En Windows no existe aqui
  una prueba independiente de ACL owner-only.
- La autenticacion por clave compartida y loopback no es aislamiento de red ni
  seguridad multi-tenant.
- El worker scan sigue siendo un proceso host y su closure no es una capability
  attestation.
- Git sellado limita configuracion, commit y proceso, pero depende de GitHub,
  TLS, el ejecutable Git local fijado y el host.
- La modularizacion mejora ownership y tamano por archivo; no demuestra menos
  CPU, memoria, bugs o tiempo de ejecucion.
- v1-v8 y labs siguen siendo regresion conocida. Ningun cambio de este commit
  demuestra deteccion ciega o generalizacion.
- El CI remoto no puede declararse verde hasta una ejecucion real de GitHub
  Actions sobre el commit publicado.
