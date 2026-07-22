# SolGuard Deploy

`solguard-deploy` prepara, sella, ejecuta y evalua las superficies operacionales
de Solguard. No contiene detectores de producto y no debe usar el ground truth
antes de congelar las salidas correspondientes.

## Responsabilidad

- prebuild canonico y receipts de binarios;
- runners de v1-v8, labs y scan-only;
- identidad de repositorios, modelos, configuracion y fuentes;
- autoridad de catalogos y command-receipt chain;
- gates de integridad de medicion y product health;
- evaluacion post-hoc, FILTER replay y EXPLOIT replay;
- finalize/verify de una ejecucion aceptada.

Core sigue siendo el motor del producto. Deploy no puede fabricar un PASS de
FILTER, un `supported` de VALIDATE ni una reproduccion EXPLOIT.

## Runtime config v2 sin secretos

`solguard-scan-runtime-config.v2` contiene solo configuracion durable y
allowlisted. `INTERNAL_API_KEY` y `EXTERNAL_API_KEY` se eliminan del objeto
publico antes de calcular `backend.environment_sha256`.

Las credenciales se materializan aparte como:

- documento `solguard-backend-secrets.v1`;
- descriptor `solguard-backend-secret-authority.v1` con path, bytes y SHA-256.

El fichero debe ser regular, single-link, bounded, con JSON estricto y claves
interna/externa distintas. Se vuelve a comprobar antes de inyectarlas al
Backend. La autoridad es efimera: un prepare fallido y cualquier salida de run
deben destruir el fichero y su root privado. Si fallan operacion y cleanup, se
conservan ambos errores; el cleanup no oculta la causa original.

Los modos prepare-only conservan la autoridad exclusivamente para el run
preparado posterior. No es una configuracion que deba copiarse a receipts,
logs, `.env` o runtime config.

Los modos POSIX restringen el fichero. La macroauditoria no demostro de forma
independiente una politica ACL equivalente en Windows; esa es una limitacion
operacional que no debe describirse como cerrada solo por pasar tests POSIX.

## Backend autenticado

Todos los runners administrados generan o reciben una `EXTERNAL_API_KEY`
valida, llaman a la API con `x-solguard-api-key` y mantienen separada la clave
Rust -> Node. El health publico solo sirve como liveness minima; el handshake de
paths, roots, contrato y binario se solicita autenticado.

## Perfil de analisis de release

Release, los canarios que lo habilitan y labs solicitan
`analysis_profile=generic_blind` dentro de `solguard-runtime-policy.v2`. El
request HTTP combina ese perfil con `mode=audit_only` y `run_exploit=false`.
Benchmarks y labs comprueban que la respuesta autenticada de Backend devuelve
el mismo `generic_blind`; una respuesta ausente, `compatibility` u otro perfil
falla cerrada. La clausura runtime y la aceptacion de canarios vuelven a
validarlo, por lo que no basta con fijar una variable ambiental sin que el
contrato y Backend coincidan.

`compatibility` se conserva para superficies historicas o de transicion, pero
no satisface el contrato de release actual. Esta exigencia describe la politica
implementada; todavia no existe un canario ni replay nuevo que demuestre sus
resultados.

## Contrato runtime Ollama de la cadena r3

Los planes release y measurement contienen
`solguard-ollama-runtime-policy.v1` con cinco campos cerrados:

- `context_length=32768`;
- `gpu_required=true`;
- `gpu_backend=vulkan`;
- `host=http://127.0.0.1:11435`;
- su `schema_version` exacta.

Setup exige que el endpoint declarado por la policy sea exactamente
`http://127.0.0.1:11435`. Esa identidad queda ademas sellada por `OLLAMA_HOST`
en el entorno semantico, por la acceptance de canarios y por el lock de
medicion.

El entorno semantico allowlisted sella conjuntamente:

- `OLLAMA_NUM_CTX=32768`, que Backend envia como `options.num_ctx` en cada
  `/api/chat`;
- `OLLAMA_CONTEXT_LENGTH=32768`, para el contexto por defecto del daemon;
- `OLLAMA_VULKAN=true`, como backend GPU requerido;
- `OLLAMA_NOPRUNE=true`, para no podar el model store compartido;
- `OLLAMA_NUM_PARALLEL=1`, para una unica secuencia de inferencia por daemon.

Faltar o cambiar cualquiera de los cinco valores incumple la politica.

El orquestador exige el endpoint canonico dedicado
`http://127.0.0.1:11435`. Verifica primero el prebuild receipt y solo despues
ejecuta Git, comprueba que el puerto este libre o arranca el binario Ollama
gestionado. No acepta ni reutiliza un daemon previo. El daemon y sus runners se
asignan a un Job Object Windows kill-on-close; el listener debe pertenecer al
PID gestionado y el cleanup debe volver a dejar libre el endpoint. Un fallo de
cleanup impide informar exito y se conserva junto al fallo operacional, si lo
hubo.

Sobre ese proceso ejecuta un probe real `POST /api/generate` con
`num_ctx=32768`, seguido por `GET /api/ps`. El preflight exige exactamente una
entrada del modelo solicitado, `context_length=32768`, tamano total positivo y
offload completo `size_vram == size`. Un mismatch aborta antes de los canarios.
`/api/ps` no publica el nombre del backend GPU: la igualdad demuestra residencia
completa del modelo observado en VRAM, mientras Vulkan queda sellado por el
environment del daemon dedicado. Las respuestas del probe se consumen por
streaming bajo un limite estricto de 1 MiB.

Antes de iniciar la matriz, el mismo orquestador valida tambien la autoridad
finalizada de `labs-v2`: 90 protocolos, 90 entradas de ground truth, un finding
declarado por protocolo y commits/snapshots coherentes. Para cada entrada crea
una autoridad Git efimera, hace fetch del SHA exacto, `rev-parse` y `fsck`, con
concurrencia maxima cuatro y cleanup obligatorio. No genera todavia los 90 ZIP
finales ni demuestra que la red siga disponible cuando llegue `labs-release`.

El writer de identidad de canarios emite
`solguard-canary-release-binding.v2`. Este binding anidado es distinto del
envelope `solguard-canary-acceptance.v1`: v2 conserva las identidades de
prebuild, repositorios, binarios, runtime, modelo y manifest y anade de forma
cerrada `schema_version`, `ollama_context_length=32768` y
`ollama_vulkan=true`; `ollama_host` sigue ligado y debe coincidir con la policy
y el entorno. El lector puede abrir la forma legacy v1 sin esos tres campos para
evidencia historica. Cuando el entorno contiene el contrato Ollama r3 completo,
el lock exige exactamente el binding v2: legacy no se reetiqueta, no se
completa por inferencia y no autoriza prepare, run o finalize actuales.

## Source roots y runtime disjunto

Cada target recibe paths absolutos y frescos para projects, runtime mutable,
base de datos y outputs sellables. `SOLGUARD_LOCAL_SOURCE_ROOTS` se deriva de la
fuente exacta materializada para ese target; no se reutiliza `projects_dir` como
permiso de source. Logs, database y runtime no forman parte del arbol de outputs
sellado.

El runtime vuelve a comprobar source bytes, SHA-256 raw, tree hash semantico y
handoff/receipt de Core. Los ocho runners benchmark, scan-only y ambos runners
de labs usan la misma autoridad de source.

## Git sellado

La adquisicion Git comun acepta una URL HTTPS canonica de `github.com` y un
commit lowercase exacto de 40 hex. Rechaza credenciales, query, fragment,
puerto, refs movibles y esquemas alternativos.

Git se ejecuta con binario fijado, home/config aislados, hooks desactivados,
submodulos y protocolos locales/ext deshabilitados, timeout/output bounded y
terminacion del arbol de procesos. Usa un repositorio bare efimero, fetch del
objeto exacto, `rev-parse`, `fsck` y archive/materializacion verificada. Cleanup
es obligatorio y conserva conjuntamente errores de operacion y limpieza.

Esto reduce ejecucion accidental de configuracion del repositorio. No convierte
un proceso host en una frontera OCI/VM.

## Clausuras de ejecucion actuales

### Legacy v1-v8

`solguard-benchmark-execution-contract.v1` contiene exactamente 35
componentes:

- 24 modulos JavaScript alcanzables estaticamente por los runners, incluido el
  helper de autenticacion Backend;
- 11 recursos corpus/runtime.

El test de clausura recompone los imports y exige igualdad exacta. Este contrato
es una frontera de resume de regresion conocida, no una attestation blind.

### Scan v2

`solguard-scan-execution-contract.v2` contiene exactamente 29 componentes:

- 20 modulos JavaScript;
- 9 recursos sellados.

Incluye runtime config v2, autenticacion/autoridad de secretos, source
authority, catalogo, paths, ranking productivo, contratos y schemas. Ground
truth, matcher y evaluator quedan fuera. El worker rehashea componentes y
estado de toolchain antes y despues; detectar drift no demuestra aislamiento de
capacidades.

Los verificadores post-scan que no son imports del worker pertenecen al TCB de
pre-release y se ligan por worktree/prebuild/measurement lock. No deben anadirse
artificialmente a una clausura de imports para inflar su cobertura.

## Medicion v2 y telemetria v3

El productor actual crea `solguard-measurement-pre-run-lock.v2` y, tras una
ejecucion valida, `solguard-measurement-baseline.v2`. V2 hace explicita una de
dos historias mutuamente excluyentes:

- `bootstrap`: no existen artefactos historicos retenidos que puedan verificarse
  criptograficamente. Los descriptores anteriores y la comparacion quedan
  `null`; no se importan agregados documentados y la mejora del detector es
  `unavailable_without_previous_baseline`.
- `comparative`: existen measurement, loss ledger y manifest historicos
  byte-bound; solo entonces se crea `solguard-measurement-comparison.v1` y puede
  hablarse de comparacion sobre regresion conocida.

El primer root preparado por `setup-release.ps1` usa honestamente
`--bootstrap-baseline`. Ese run, si llega a finalizar y verificarse, establece
la primera baseline util para comparaciones posteriores; no puede comparar
contra evidencia que no fue preservada. Los validadores siguen aceptando los
locks/baselines v1 almacenados como compatibilidad historica, pero ningun run
nuevo debe emitirse como v1.

`solguard-resource-telemetry.v3` separa tres alcances:

- arbol supervisado: RSS, memoria virtual/privada, CPU acumulada, pico de CPU
  respecto a un procesador logico e IO de transferencia read/write;
- host: RAM usada/disponible y CPU global; GPU por contadores CIM de Windows
  (ruta aplicable a AMD cuando el host expone esos contadores) o,
  opcionalmente, mediante un `nvidia-smi` fisico; y VRAM reportada por la API
  local `/api/ps` de Ollama;
- filesystem del run: usados, libres y disponibles mediante `statfs`.

Cuando el runtime Ollama actual esta observado, telemetry v3 conserva ademas
`model_name`, `context_length`, `model_size_bytes`,
`model_size_vram_bytes` y `observed_at_ms`; valida contexto `32768`, tamanos
positivos y offload completo mediante igualdad entre tamano total y VRAM.
Pipeline measurement v2
proyecta `ollama_model_name`, `ollama_context_length`,
`ollama_model_size_bytes` y `ollama_model_size_vram_bytes`. Estos campos son
capacidad implementada; no existe todavia un receipt r3 real que los contenga.

El runbook canonico muestrea el arbol cada 5 segundos y sistema/storage cada 30
segundos. El ejecutable de tabla de procesos y el `nvidia-smi` opcional deben
ser ficheros fisicos regulares: se fijan por realpath, bytes y SHA-256 antes de
ejecutar y se reatestiguan al terminar. El root de storage tambien queda ligado
a una ruta fisica. El runbook Windows de fase 1 liga PowerShell y usa la ruta
CIM; `--nvidia-smi-executable` es una capacidad opcional de telemetry v3, no un
provider configurado por defecto en ese runbook.

Las atribuciones son deliberadamente limitadas: RAM/CPU del host y GPU son
system-wide, la VRAM de Ollama no demuestra consumo exclusivo del child, los
bytes de IO de proceso no son bytes fisicos de disco y el uso del filesystem no
equivale al tamano de outputs. La ruta CIM no identifica por si sola el vendor y
deja la capacidad VRAM total como `null`; solo informa los contadores que el
host expone. El muestreo puede perder procesos muy cortos, detached o
reparented. Sensores no disponibles permanecen `null`/`unavailable`, nunca cero.
V1 y v2 se pueden leer como receipts historicos; el nuevo runbook produce v3.
La compatibilidad de lectura no permite que un receipt legacy sustituya la
telemetria r3 exigida por el lock actual.

`solguard-pipeline-measurement.v2` conserva recall de regresion conocida,
volumen y ruido, y anade una vista operacional reproducible:

- tiempos batch, secuenciales, por protocolo y por fase;
- distribuciones `min/mean/p50/p95/max` con metodo R7 y cobertura explicita;
- throughput de protocolos, completados, candidatos y findings supported por
  hora;
- eficiencia por protocolo completado para CPU, IO y bytes declarados;
- resumen de telemetria v3 y manifest de outputs limitado a los manifests
  firmados de cada command receipt.

La precision real sigue siendo `null` sin adjudicacion independiente. El
`known_bug_precision_proxy` y los ratios de ruido sobre v1-v8/labs no son
precision de producto ni evidencia blind. El lector conserva compatibilidad
con `solguard-pipeline-measurement.v1`, mientras finalize produce v2. Leer v1
no lo reinterpreta como la medicion v2 producida y ligada por una cadena r3.

## Orquestador cerrado de release

`scripts/measurement/setup-release.ps1` es la entrada canonica para el siguiente
intento. Valida plan, prebuild receipt, binarios Node/Git/Git Bash/Ollama y
`taskkill` exactos, repositorios limpios, modelo Ollama local, espacio libre y
roots de evidencia fisicamente ausentes/disjuntos antes de publicar evidencia.
El receipt queda verificado antes de ejecutar Git, arrancar el daemon gestionado
o iniciar cualquier inferencia/scan. El minimo por defecto es 300 GiB libres en
cada volumen de output relevante.

`-ValidateOnly` ejecuta esas precondiciones, incluido daemon/modelo y el
preflight de red. Puede crear logs diagnosticos no autoritativos bajo
`$CanaryBase/_runtime-logs`. No crea ni modifica roots de evidencia de canarios
o release, ni publica o cambia la acceptance. La existencia de esos logs no
autoriza ningun paso posterior.

La secuencia cerrada es:

1. Verificar preliminarmente el prebuild receipt antes del daemon gestionado y
   de cualquier proceso de inferencia o scan; cada canario recibe y valida
   despues esa misma identidad sin recompilar.
2. Fijar los cinco valores del entorno Ollama, exigir el endpoint dedicado
   `127.0.0.1:11435`, arrancar el ejecutable receipt-bound y pasar el probe de
   contexto/offload completo; despues ejecutar el preflight temprano del
   catalogo y los 90 remotes de labs.
3. Ejecutar o revalidar, nunca en paralelo, exactamente estos ocho canarios:
   `v1:Compound-Finance`, `v1:Monad`, `v2:Size`, `v2:LoopFi`,
   `v4:Morpheus`, `v5:Timeswap`, `v6:Morpheus` y `v8:Vyper`.
4. Crear/revalidar `solguard-canary-acceptance.v1`; deben aprobar los ocho de
   ocho con product health y FILTER validos bajo una identidad comun.
5. Preparar un root nuevo con lock v2 en modo bootstrap y el acceptance 8/8.
6. Ejecutar `v1-v8-release` con las ocho suites y `--parallel 8`.
7. Solo si el comando anterior termina correctamente, ejecutar
   `labs-release` sobre los 90 labs.
8. Ejecutar `finalize` y verificar la baseline firmada con `verify`.

Durante la parte larga, el runbook mantiene
`SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)` y restaura el
estado al salir. Esto solicita a Windows que no suspenda el sistema mientras
vive el proceso; no es una garantia absoluta de continuidad. No evita un corte
electrico, reinicio forzado o Windows Update, fallo de driver/GPU ni una perdida
de red posterior al preflight.

### Incidente del primer prebuild `r1`

El primer intento posterior al commit Deploy `0d1f1df`, iniciado con los 14
repositorios requeridos limpios, aborto antes de compilar. La comprobacion
byte-exacta encontro Core con 191980 bytes, Validate y Discover con 191984 bytes
por una asercion que rustfmt 2024 y 2021 representaban de forma distinta, y
FILTER con 176486 bytes sobre el contrato anterior sin `generic_blind`.

El intento no publico prebuild receipt y no alcanzo ningun canario ni replay.
El root `r1` no se reanuda ni reutiliza. La correccion usa una forma estable bajo
ambas ediciones y sincroniza exactamente siete copias: Core, Validate, Discover,
FILTER y los vendors de VALUE, ECONOMIC e INVARIANT. El prebuild comprueba esas
siete rutas fisicas antes de compilar y falla cerrado ante cualquier deriva.
Haber cerrado esta paridad no constituye un acceptance 8/8 ni mide recall,
precision, ruido, velocidad o generalizacion.

### Retirada del prebuild `r2`

El receipt `r2` se conserva como evidencia de la cadena que sello, pero precede
al contexto por request de Backend y a la politica Ollama/GPU sellada de Deploy.
Los cambios de source, plan y binarios hacen que sea incompatible con la cadena
operativa `r3`: no debe reutilizarse, reetiquetarse ni emplearse para autorizar
sus canarios. `r3` necesita un prebuild receipt create-only y roots nuevos.

Esta retirada no afirma que `r2` fuera criptograficamente falso; limita su
autoridad al contenido historico que realmente comprometio. Tampoco registra un
prebuild `r3` como ejecutado o correcto.

Un canario o root existente solo se reutiliza como input tras revalidarlo; un
fallo no se reanuda en sitio. Si existe un acceptance pero falta cualquiera de
sus ocho roots, el orquestador falla. No se ha ejecutado todavia esta secuencia:
no existen acceptance 8/8, replay, baseline v2 final ni verificacion que puedan
sostener resultados de producto.

## Publicacion y gates

`solguard-pre-release-check.v3` separa:

- `measurement_integrity`: evidencia completa y recomputable;
- `product_health`: politica estricta de promocion.

Una medicion coherente pero degradada puede conservarse con
`product_release_eligible=false`; release exige ambos gates aplicables sin
soft-fail. Un root fallido se preserva, no se reusa ni se continua como si fuese
una ejecucion limpia.

## Estado actual

La infraestructura endurecida esta implementada, pero la aceptacion de producto
sigue congelada. A fecha de esta documentacion:

- no hay evidencia preservada de 8/8 canarios aceptados;
- no se ha completado un nuevo `v1-v8-release` con estas mejoras;
- no se han completado los 90 labs con esta identidad;
- no existe una salida canonica de telemetry v3/pipeline measurement v2;
- no existe prebuild receipt, probe preservado ni telemetry receipt de la
  cadena r3;
- finalize, baseline v2 y verify de ese futuro root no existen;
- el holdout independiente no se ha abierto ni ejecutado.

No se puede inferir recall, precision, ruido, velocidad o generalizacion de los
tests de Deploy. Los checks locales de codigo y contratos no equivalen a
ejecutar canarios o replay. GitHub Actions remoto tampoco se ejecuto porque no
hubo push.
