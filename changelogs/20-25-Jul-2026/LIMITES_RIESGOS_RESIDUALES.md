# Límites y riesgos residuales

Estos son los límites y riesgos residuales de la infraestructura detectados por
la auditoría del 22 de julio de 2026 y por el cierre previo al nuevo replay.

> Están omitidos `solguard-cli` y `solguard-exploit` porque permanecen
> temporalmente congelados para este producto `detection_only`.

Estado de la lista:

- `[x]`: limitación concreta corregida y validada a nivel de implementación;
- `[ ]`: riesgo permanente, evidencia externa pendiente o capacidad todavía no
  demostrada.

Marcar una infraestructura de medición como implementada no equivale a disponer
ya de una medición real. Los canarios y replays continúan abiertos hasta que sus
roots y receipts finalizados se conserven y verifiquen.

## Solguard Deploy

- [ ] Todavía no existen un prebuild receipt r3 aceptado ni receipts finalizados
  y verificados del nuevo ciclo para los ocho canarios, v1-v8, labs,
  `finalize` y `verify`. Un prebuild solo prepara y sella la cadena; por sí
  mismo no es evidencia de producto.
- [x] El prebuild `r2` queda conservado como evidencia histórica, pero retirado
  e incompatible con r3: no sella el entorno runtime actual, el daemon dedicado
  ni el Backend que envía el contexto por request. No se borra ni se reutiliza.
- [ ] No se abrio ni ejecuto un holdout.
- [x] Existe un contrato versionado y fail-closed para medir tiempos por suite,
  protocolo y fase; RAM, CPU e IO del árbol; CPU/RAM del host; GPU; Ollama;
  storage; manifests firmados; throughput; eficiencia; recall conocido y ruido.
  La extensión r3 exige además nombre de modelo, contexto exacto, tamaños
  positivos total/VRAM y su igualdad para considerar completa la observación de
  Ollama.
- [x] `solguard-ollama-runtime-policy.v1` fija `context_length=32768`,
  `gpu_required=true`, `gpu_backend=vulkan` y
  `host=http://127.0.0.1:11435`; `OLLAMA_NUM_CTX=32768`,
  `OLLAMA_CONTEXT_LENGTH=32768`, `OLLAMA_NUM_PARALLEL=1`,
  `OLLAMA_NOPRUNE=true` y `OLLAMA_VULKAN=true` forman parte de la identidad
  semántica release.
- [x] El orquestador verifica el receipt de prebuild antes de iniciar su daemon
  gestionado y receipt-bound en `127.0.0.1:11435`, carga el modelo mediante
  `/api/generate`, consulta `/api/ps` y falla antes de los canarios si no observa
  el modelo exacto, contexto 32768 o residencia GPU completa
  (`size_vram == size`). También adelanta el preflight del catálogo y hace fetch
  exacto, `rev-parse` y `fsck` de los 90 commits fijados con concurrencia cuatro
  y cleanup obligatorio.
- [x] El receipt liga Node, Git, Git Bash, Ollama y `taskkill`; el cleanup mata
  únicamente el árbol del daemon gestionado, incluido mediante un Job Object
  Windows kill-on-close. El receipt se verifica antes de Git, daemon,
  inferencia o scan; el listener debe pertenecer al PID gestionado y el puerto
  debe quedar libre para que el setup pueda devolver exito.
- [x] El writer canario actual usa `solguard-canary-release-binding.v2` para
  sellar contexto y política Vulkan. El lector legacy se conserva para validar
  evidencia histórica, no para promoverla a identidad r3 ni autorizar el lock
  actual.
- [x] `-ValidateOnly` no crea ni modifica roots de evidencia canarios/release ni
  el acceptance, pero sí puede crear logs diagnósticos no autoritativos en
  `$CanaryBase/_runtime-logs` y ejecutar los preflights de daemon, modelo y red.
- [ ] `SetThreadExecutionState` inhibe la suspensión mientras vive el proceso,
  pero no evita cortes eléctricos, reinicios forzados o Windows Update, fallos
  del driver/GPU ni una pérdida de red posterior al preflight. El overnight no
  tiene garantía absoluta.
- [ ] Todavía no existe una medición nueva, firmada y verificada de recall,
  precisión, ruido, latencia, throughput, RAM, CPU, GPU, IO o storage sobre
  v1-v8 y labs. La precisión real seguirá siendo `null` sin adjudicación
  independiente.
- [x] La cadena release de v1-v8 y labs solicita y verifica
  `analysis_profile=generic_blind`; la política runtime v2 y la aceptación
  canaria rechazan `compatibility` aunque sus hashes internos se recalculen.
- [x] El modo bootstrap está separado del comparativo en los locks y baselines
  v2; no importa agregados históricos ni publica una mejora inexistente.
- [ ] Los outputs históricos fueron eliminados tras documentarlos. El primer run
  nuevo no podrá producir una comparación criptográfica: si finaliza y se
  verifica, se convertirá en la baseline para el siguiente replay.
- [x] El orquestador canónico valida el único prebuild, ejecuta ocho canarios
  secuenciales, exige 8/8, ejecuta v1-v8 con `--parallel 8`, permite labs solo
  tras código cero y reserva `finalize`/`verify` para la cadena completa.
- [x] El gate FILTER recompone el set físico exacto de inputs de producto,
  incluido `value/attack_paths.json`; ausencia, hash stale o una key extra
  falla cerrado. La omisión de ese input en Deploy está cubierta por una
  regresión del evaluador.
- [ ] Los 1.114 tests descubiertos (1.106 correctos, 0 fallos y 8 omitidos)
  validan contratos y fallos simulados; no sustituyen un replay real ni prueban
  que un backend/modelo externo complete todos los protocolos.
- [ ] Ocho tests quedaron omitidos por sus condiciones de entorno. La suite final
  fue verde con esos skips declarados, no 1.114/1.114 ejecutados.
- [ ] La autoridad de secretos crea un archivo efimero. En Windows no existe aqui
  una prueba independiente de ACL owner-only.
- [ ] La autenticacion por clave compartida y loopback no es aislamiento de red ni
  seguridad multi-tenant.
- [ ] El worker scan sigue siendo un proceso host y su closure no es una capability
  attestation.
- [ ] Git sellado limita configuracion, commit y proceso, pero depende de GitHub,
  TLS, el ejecutable Git local fijado y el host.
- [ ] La modularizacion mejora ownership y tamano por archivo; no demuestra menos
  CPU, memoria, bugs o tiempo de ejecucion.
- [ ] v1-v8 y labs siguen siendo regresion conocida. Ningun cambio de este commit
  demuestra deteccion ciega o generalizacion.
- [ ] El CI remoto no puede declararse verde hasta una ejecucion real de GitHub
  Actions sobre el commit publicado.

## Solguard Backend

- [x] Backend valida `OLLAMA_NUM_CTX`, usa `32768` por defecto y envía
  `options.num_ctx` en cada `/api/chat`. Los tests Node cubren default, límites,
  entradas no canónicas y el body real de la request (27/27 locales).
- [ ] No se ejecutaron canarios, benchmarks, labs ni holdout.
- [ ] Los 43 tests cubren transporte y contratos; no miden recall o precision.
- [ ] No existe una medicion nueva de throughput o latencia HTTP.
- [ ] La validacion de ACL de Windows no se puede inferir de permisos POSIX.
- [ ] La seguridad del host sigue dependiendo de operar en una maquina local
  confiable, proteger las credenciales y no publicar los puertos fuera del
  limite previsto.

## Solguard Map

- [ ] Los parsers heurísticos y fallbacks siguen siendo aproximaciones. Una deuda
  de cobertura impide autoridad de ausencia, pero no convierte la aproximación
  en AST completo.
- [ ] Los límites físicos son defensas operativas; un repositorio legítimo que los
  exceda fallará cerrado y requerirá una decisión explícita de producto.
- [ ] El modo standalone sin `--source-integrity` no ofrece la misma autoridad que
  el pipeline orquestado.
- [ ] MAP enumera y estructura evidencia. No confirma explotabilidad, impacto ni
  vulnerabilidades y no debe presentarse como auditor final.
- [ ] No se ejecutó CI remoto, un replay v1-v8, los 90 labs, canarios ni un holdout
  blind durante este cierre documental.

## Solguard Trace

- [x] Los callers canónicos de benchmarks y labs que preparan este release
  solicitan y verifican `generic_blind` explícitamente de extremo a extremo.
- [ ] `compatibility` sigue siendo el perfil por defecto para callers históricos
  ajenos a esa cadena. Cualquier caller nuevo con separación blind debe seguir
  declarando y verificando `generic_blind`.
- [ ] La clausura depende de aristas y bindings MAP. TRACE no puede reparar una
  función ausente o una llamada ambigua en MAP; ese caso conserva deuda o falla.
- [ ] Los límites son deliberadamente cerrados. Un proyecto legítimo que supere 256
  ficheros, 32 MiB o una dependencia de 8 MiB no se analizará parcialmente como
  si fuera completo.
- [ ] El techo de cache contabiliza bytes de fuentes como proxy de retención; no es
  un límite de RSS impuesto por el sistema operativo.
- [ ] Los fallbacks deterministas siguen siendo heurísticos donde no existe una
  autoridad AST exacta.
- [ ] Solo se ejecutó Compound como canario diagnóstico de regresión conocida.
  Falta la aceptación 8/8, v1-v8, 90 labs, holdout blind y una medición de
  rendimiento finalizada para esta identidad.

## Solguard Validate

- [x] `trace_contract_v2.rs` continúa como copia local para conservar builds
  autónomos, pero el prebuild compara ahora byte a byte las siete copias del
  contrato. El primer intento real detectó y bloqueó la deriva antes de compilar.
- [x] `map-target-route-consumer.v1` vuelve a ser byte-idéntico en VALIDATE y
  FILTER. Toda arista callable MAP resuelta exige IDs exactos de símbolo en
  origen y destino; un endpoint vacío o que aliasa evidencia física falla
  cerrado, y coordinación sella el SHA-256 común.
- [ ] La identidad estable y la doble lectura reducen TOCTOU observable, pero no
  sustituyen CAS, mounts read-only o APIs handle-relative para toda la
  ejecución.
- [ ] Los bounds deliberadamente fail-closed pueden rechazar artefactos legítimos
  mayores; ampliarlos requiere revisión de contrato y tests N/N+1.
- [ ] La adquisición TRACE está cerrada por manifiesto. Los árboles suplementarios
  no TRACE conservan sus propios walkers/bounds y no heredan automáticamente
  esa misma autoridad.
- [ ] `scripts/check-standalone-metadata.mjs` existe y pasa localmente, pero el
  workflow Rust actual no contiene un step que lo invoque. Es un gap CI
  documental/operacional pendiente, no un gate remoto demostrado.
- [ ] El perfil `generic_blind` no prueba separación de oráculo ni mejora de
  detección; solo evita que ese artefacto mezcle origins prohibidos.

## Solguard Value

- [ ] `src/engine.rs` tiene ahora 6.348 líneas; `src/engine/tests.rs`, 3.204;
  `src/route_graph.rs`, 1.974; `src/proof_requests.rs`, 1.954; y
  `src/input.rs`, 2.638. El motor vuelve a superar 6.000 líneas y requiere una
  extracción por ownership con paridad, no una reducción cosmética.
- [x] El contrato TRACE canónico continúa vendorizado, pero el prebuild compara
  automáticamente su hash y bytes contra las otras seis copias antes y después
  de compilar; `.gitattributes` fija además LF en el vendor.
- [ ] VALUE verifica el perfil TRACE sellado, pero registra la clase de autoridad
  resultante en vez de persistir un campo de perfil dedicado en sus outputs.
- [ ] VALUE separa la adquisición física TRACE —100 MiB de índice, 4 GiB por
  primario, 100.000 primarios y 64 GiB agregados— de la proyección semántica
  retained —64 MiB por primario y 256 MiB por batch—. El techo retained sigue
  pudiendo rechazar un batch semántico legítimo mayor.
- [ ] Un techo MAP de 256 MiB puede rechazar un MAP legítimo mayor. La proyección
  semántica solo es completa para los campos conocidos por la implementación
  VALUE actual; los nuevos campos MAP consumidos deben añadirse a la vez a las
  rutas inline y proyectada.
- [ ] La identidad de archivos, los hashes y el rechazo de links reducen las
  carreras en un host mutable, pero no sustituyen inputs inmutables respaldados
  por CAS, montajes read-only ni APIs de filesystem relativas a handles.
- [ ] El renombrado staged en el mismo parent es un límite fuerte de publicación,
  pero no se afirma durabilidad crash-proof en todos los filesystems ni
  seguridad frente a un administrador hostil.
- [ ] Los tests estructurales de grafos y pruebas no miden runtime ni memoria
  end-to-end sobre protocolos reales grandes.
- [x] CORE/FILTER/deploy consumen y recomputan de forma independiente el
  `value/attack_paths.json` físico y su deuda. Missing, stale y extra están
  cubiertos por tests.
- [ ] Falta repetir ese contrato en aceptación 8/8, v1-v8 y labs.

## Solguard Discover

- [ ] DISCOVER sigue dependiendo de la completitud y autoridad de MAP/TRACE. Puede
  exponer deuda, pero no recuperar semántica que upstream no produjo.
- [ ] El modelo es inferido; incluso con inputs exactos, una hipótesis sigue siendo
  candidata hasta VALIDATE/FILTER y revisión humana.
- [ ] `max_working_set_bytes` es un estimador estructural, no un límite de RSS
  impuesto por el sistema operativo.
- [ ] El walker falla en corpus legítimos que excedan sus techos. Esa decisión es
  preferible a ocultar omisiones, pero requiere una política explícita si el
  producto necesita repositorios mayores.
- [ ] Compatibilidad histórica sigue siendo legible para diagnóstico, pero no debe
  confundirse con autoridad release-clean v2.
- [ ] No se ejecutaron v1-v8, 90 labs, canarios, holdout blind ni medidas de tiempo,
  memoria, recall, precisión o ruido.

## Solguard Economic

- [ ] `src/engine.rs` sigue teniendo 5.630 líneas. Una extracción posterior debe
  preservar los invariantes privados y mantener tests de paridad de
  comportamiento alrededor de cada límite.
- [x] El verificador canónico TRACE continúa vendorizado, pero el prebuild lo
  compara byte a byte contra las otras seis copias antes y después de compilar;
  `.gitattributes` fija LF en esta copia.
- [ ] ECONOMIC valida el perfil TRACE sellado, pero solo expone en sus capacidades
  la clase de autoridad resultante; no persiste el perfil seleccionado como un
  campo de output dedicado.
- [ ] ECONOMIC separa la adquisición física TRACE —100 MiB de índice, 4 GiB por
  primario, 100.000 primarios y 64 GiB agregados— de la proyección semántica
  retained —64 MiB por primario y 256 MiB por batch—. El techo retained sigue
  pudiendo rechazar un batch semántico legítimo mayor.
- [ ] Los descriptores estables, hashes, rechazo de links y comprobaciones
  posteriores a la lectura reducen las carreras en un host mutable, pero no
  sustituyen inputs inmutables respaldados por CAS ni montajes read-only.
- [ ] El renombrado del directorio y la sincronización de archivos aportan un límite
  fuerte de publicación local, pero la implementación no afirma durabilidad
  crash-proof en todos los filesystems ni protección frente a un administrador
  hostil.
- [ ] Los tests de grafos y colecciones establecen comportamiento lineal acotado y
  fail-closed sobre fixtures, no rendimiento end-to-end medido sobre datos de
  protocolos de producción.
- [ ] La salud de producto y la elegibilidad de release siguen siendo propiedad de
  los gates de CORE/deploy y requieren evidencia externa de ejecución nueva.

## Solguard Invariant

- [ ] `src/engine.rs` concentra ahora 5.770 líneas y es el principal candidato
  para una futura extracción mecánica, siempre con paridad de tests.
- [x] El contrato TRACE continúa vendorizado, pero el prebuild compara esta copia
  con las otras seis copias antes y después de compilar;
  `.gitattributes` fija LF para que la identidad no dependa de `core.autocrlf`.
- [ ] INVARIANT admite hasta 4 GiB físicos por primario y 64 GiB físicos
  agregados, pero conserva límites semánticos retained de 64 MiB por primario y
  256 MiB por batch. Un batch válido para otro consumidor puede seguir siendo
  rechazado honestamente.
- [ ] Las comprobaciones de identidad reducen sustituciones observables, pero no
  sustituyen un CAS/read-only mount ni eliminan toda carrera hostil del sistema
  operativo.
- [ ] La aceptación estructural de `generic_blind` no demuestra aislamiento de
  oráculo, recall blind ni generalización. Solo demuestra coherencia del perfil
  y de sus ledgers de origen.

## Solguard Database

- [ ] No se ejecutaron benchmarks, labs, canarios ni una medicion de latencia,
  throughput, RAM o tamano de la base.
- [ ] No se midio recall, precision ni generalizacion de las heuristicas de parsing
  o recuperacion.
- [ ] El test de rechazo de symlink del conector quedo omitido por restricciones
  del host Windows; la rama de rechazo existe, pero ese fixture concreto no
  aporta evidencia runtime en esta ejecucion.
- [ ] Un OCR configurado sigue siendo un ejecutable de confianza y puede consumir
  recursos dentro de los limites que el sistema operativo permita; no es un
  sandbox de codigo hostil.
- [ ] Los documentos y JSON se acotan pero se materializan en memoria para sus
  parsers; los limites no equivalen a una medicion de RSS.
- [ ] SQLite no incorpora cifrado, control de acceso multiusuario ni aislamiento de
  servicio en este repositorio.
- [ ] Los workflows estan validados localmente como configuracion, pero su estado
  remoto no puede declararse verde sin una ejecucion de GitHub Actions.

## Solguard Diff

- [ ] El binario Git instalado sigue siendo una dependencia de confianza. DIFF
  canoniza su path, pero no fija su hash ni distribuye un Git propio.
- [ ] La API de GitHub es una frontera de red best effort. Rate limits, permisos,
  respuestas parciales y el techo de 3.000 ficheros pueden dejar el change set
  incomplete; esa deuda es visible, no recuperada.
- [ ] Una adquisición incompleta se publica para revisión manual. Los consumidores
  deben comprobar `acquisition.status`/`diff_manifest.json` antes de razonar
  sobre ausencia de cambios.
- [ ] El scoring usa heurísticas y contexto MAP; una prioridad alta no equivale a
  impacto, severidad o exploitabilidad.
- [ ] La sincronización de metadata del directorio no está disponible de forma
  portable mediante `std` estable en Windows; los ficheros sí se flushan antes
  del rename.
- [ ] No se ejecutaron benchmarks/labs/canarios, peticiones reales a GitHub, CI
  remoto ni mediciones de rendimiento durante este cierre documental.

## Solguard Filter

- [ ] `src/input.rs` tiene ahora 6.089 líneas y supera el objetivo de 6.000. Es el
  siguiente candidato a extracción mecánica con paridad estricta.
- [x] `trace_contract_v2.rs` replica el contrato compartido, pero el prebuild
  verifica ahora su igualdad byte a byte junto con Core, Validate, Discover y
  los tres vendors. La copia desactualizada de FILTER fue detectada y corregida;
  el intake reconcilia también el perfil verificado con el índice retenido.
- [x] `source-integrity.v1` conserva copias byte-idénticas en MAP, TRACE y FILTER.
  El verificador de receipt TRACE existente y de su upstream MAP se promovió al
  contrato común, su SHA-256 se actualizó en `solguard-agents` y el validador de
  coordinación vuelve a exigir paridad física.
- [ ] Los fragments incluidos por `include!` no son necesariamente descubiertos
  por `cargo fmt`; por eso esta ronda ejecuta también `rustfmt --check` directo
  sobre los tres archivos.
- [ ] Los bounds fail-closed pueden rechazar honestamente artefactos mayores. Un
  aumento requiere revisión de contrato y tests N/N+1, no solo cambiar una
  constante.
- [ ] Las comprobaciones de handle/path reducen TOCTOU observable, pero no
  sustituyen CAS/read-only mounts ni aislamiento host completo.
- [ ] `scripts/check-standalone-metadata.mjs` existe y pasa localmente, pero el
  workflow Rust actual no contiene un step que lo ejecute. No es un gate CI
  remoto demostrado.
- [ ] `generic_blind` sella origins; no prueba separación de oráculo ni
  generalización.

## Solguard Core

- [x] El bundle orquestado FILTER incluye `source_integrity.json` cuando esa
  autoridad fue entregada. FILTER, `tool_phase.json`, el receipt de output y
  Core exigen el mismo inventario físico exacto y las divergencias quedan
  cubiertas por regresiones.
- [ ] Los tests demuestran invariantes de software y caminos de fallo; no demuestran
  calidad de findings en protocolos reales.
- [x] La infraestructura externa conserva los tiempos y estados emitidos por
  Core y los integra con telemetría de proceso/sistema y evaluación post-hoc,
  sin introducir ground truth ni labels en el orquestador.
- [x] La identidad r3 cierra fuera de Core la ventana de contexto del modelo:
  Backend la aplica por request y Deploy la sella, prueba y registra. No se ha
  añadido configuración de Ollama ni lógica de benchmark al motor.
- [x] Una cohorte candidate-directed sin requests materializa ahora un
  `solguard-value-proof-responses.v1` vacío en un root ausente y rechaza un
  destino no regular. La conducta está cubierta por regresiones.
- [ ] No existe todavía una medición nueva y firmada de tiempo, RAM, CPU, GPU,
  IO, storage, precisión, ruido o recall sobre el pipeline completo.
- [x] La aceptación profesional preparada exige y verifica `generic_blind`
  end-to-end para canarios, benchmarks y labs.
- [ ] `compatibility` sigue disponible como transición para otros callers; su
  retirada global requiere una decisión de compatibilidad separada.
- [ ] La robustez ante ACLs depende de primitives distintas por sistema operativo;
  los tests de modo POSIX no sustituyen una validacion independiente de ACL de
  Windows.
- [x] VALIDATE y FILTER reciben el `value/attack_paths.json` físico original,
  no la proyección candidate-derived; selección, hashes y source-integrity se
  verifican de nuevo antes de la decisión terminal.
