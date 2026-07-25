# Changelog

Este archivo describe cambios verificables de `solguard-backend`. El backend es
un adaptador HTTP; ninguna entrada de este changelog implica que posea logica de
deteccion o que haya mejorado la calidad de findings.

## 2026-07-25 - Exportacion CSV de resultados por test

- `GET /benchmarks/export?test=<valor>` devuelve todas las filas de
  `benchmark_results` cuya identidad `test` coincide exactamente.
- La ruta requiere la autenticacion externa, repite la separacion fisica entre
  la base historica y la de benchmark, y delega la consulta/exportacion a
  `solguard-database` en una tarea bloqueante.
- Responde `text/csv`, fuerza descarga, deshabilita cache y expone el numero de
  filas mediante `x-solguard-benchmark-rows`.
- La exportacion es de `benchmark_results`; no incorpora
  `benchmark_phase_metrics` ni ejecuta benchmarks.

## 2026-07-24 - Ingesta CSV de metricas de benchmark en base separada

### Contrato resultante

- `POST /benchmarks/ingest` acepta bodies `text/csv` o `application/csv` bajo
  la autenticacion, limite de body y limite de concurrencia externos existentes.
- Backend no interpreta outputs de herramientas ni ejecuta benchmarks. Delega
  los bytes a `solguard-database::benchmark::ingest_csv_bytes` en una tarea
  bloqueante acotada por los gates HTTP.
- `SOLGUARD_BENCHMARK_DB_PATH` selecciona exclusivamente la nueva base; la
  ruta por defecto es `../solguard-database/data/benckmarks.sqlite`, junto a la
  base principal del repositorio database pero fisicamente separada; la
  configuracion rechaza que sea la misma ruta fisica que
  `SOLGUARD_DATABASE_PATH` y el handler repite esa comprobacion antes de cada
  ingesta.
- La respuesta versionada reporta filas recibidas, insertadas, actualizadas y
  metricas de fase escritas. Los errores de validacion son `400`; los fallos de
  almacenamiento son `500`, con detalle privado ligado a un `incident_id`.
- La identidad idempotente es `test+benckmark+protocolo`. Duplicados dentro del
  CSV fallan atomicamente; nuevos requests hacen UPSERT del snapshot completo.
- El CSV transporta solo escalares medibles y fases
  `phase.<fase>.{status,duration_ms}`; no contiene ni persiste outputs JSON.

### Cobertura local

- configuracion default, override y rechazo de reuse de la base principal;
- rechazo de aliases lexicos, canonicos y hardlinks de la base principal;
- autenticacion obligatoria y `413` por el limite global de body antes de DB;
- tipos MIME CSV validos e invalidos;
- insert y posterior update sin duplicar la identidad;
- reemplazo completo de fases al actualizar;
- batch duplicado rechazado sin filas parciales;
- fallo de almacenamiento traducido sin filtrar rutas;
- comprobacion SQLite de que la base principal queda intacta.

Estas pruebas validan transporte, atomicidad delegada y separacion de bases. No
ejecutan benchmarks ni demuestran mejoras de recall, precision o rendimiento.

## 2026-07-22 - Contexto Ollama explicito y reproducible por request

### Problema corregido

El adaptador Node fijaba temperatura, muestreo, seed y limite de salida en cada
request `/api/chat`, pero no enviaba `num_ctx`. El contexto efectivo dependia
por tanto de como se hubiera iniciado el daemon Ollama. En Windows, la
aplicacion puede conservar un contexto distinto del fallback `ollama serve`;
dos ejecuciones con el mismo binario y modelo podian recibir ventanas de
contexto diferentes sin que Backend lo expresara en su contrato.

### Contrato resultante

- `InternalConfig` incorpora `ollamaNumCtx`.
- La variable exacta `OLLAMA_NUM_CTX` tiene default `32768`.
- Solo se admiten enteros decimales canonicos entre `1` y `1048576`.
- `OllamaService` vuelve a validar el numero en su constructor, incluso cuando
  un caller lo instancia sin pasar por el parser de entorno.
- Cada request `/api/chat` envia `options.num_ctx` junto al resto de parametros
  deterministas.
- El proceso Rust hijo recibe el valor numerico normalizado en su entorno.

El limite superior es una defensa de recursos del host generico, no una
afirmacion de que todos los modelos acepten un millon de tokens. Ollama puede
aplicar un limite menor segun el modelo. El release local debe sellar
explicitamente `32768` para `qwen2.5-coder:7b`.

### Pruebas incorporadas

- default exacto `32768`;
- overrides validos en el minimo, valor release y maximo;
- rechazo de vacio, cero, negativos, signo explicito, ceros a la izquierda,
  fracciones, notacion exponencial, whitespace final, overflow del limite y
  enteros no seguros;
- validacion defensiva del constructor con `NaN` e infinito;
- comprobacion byte-logica de que `num_ctx=32768` entra en el body real de
  `/api/chat`.

### Validacion local del cambio

- Prettier sobre todos los archivos formateables afectados: correcto;
- `bun run build`: correcto;
- `bun run test`: 27 aprobados, 0 fallidos y 0 omitidos;
- `cargo fmt --check`: correcto;
- `cargo clippy --locked --all-targets -- -D warnings`: correcto;
- `cargo test --locked`: 43 aprobados y 0 fallidos;
- `cargo build --release --locked`: correcto.

Estas puertas validan compilacion, formato y contratos locales. No sustituyen
los canarios ni una medicion release.

### Antes y despues

| Antes                                                             | Despues                                            |
| ----------------------------------------------------------------- | -------------------------------------------------- |
| contexto heredado implicitamente del daemon                       | `num_ctx` explicito en cada request                |
| arranque de Ollama capaz de cambiar semantica sin cambiar Backend | valor configurable y sellable por `OLLAMA_NUM_CTX` |
| configuracion numerica sin contrato propio                        | decimal canonico, positivo y acotado               |
| constructor confiaba en el caller                                 | validacion redundante en parser y servicio         |

### Limites de la evidencia

- No se ejecutaron canarios, benchmarks, labs ni holdout.
- Este cambio cierra una fuente de deriva de contexto; no demuestra una mejora
  de recall, precision, ruido o velocidad.
- `solguard-deploy` sella coordinadamente `OLLAMA_NUM_CTX=32768` en el entorno
  semantico r3 y exige ese valor en release. Esta integracion contractual no
  significa que ya exista un prebuild, canario o replay r3 ejecutado.
- No se cambia ninguna regla de deteccion ni se introduce conocimiento de
  protocolos o benchmarks.

## 2026-07-22 - Frontera HTTP autenticada y delegacion estricta a Core

Commits de producto documentados:

- `1afb753` - `feat(backend): enforce authenticated bounded HTTP contracts`
- `ff6f3ec` - `ci(backend): enforce locked cross-platform gates`
- `0a74891` - `feat(backend): enforce core authority at the HTTP boundary`

### Responsabilidad resultante

Backend conserva solamente cuatro funciones:

1. iniciar el host Rust/Axum y el adaptador interno Node/Ollama;
2. autenticar, limitar y deserializar requests HTTP;
3. traducir DTOs sin cambiar decisiones de producto;
4. delegar proyectos, ingesta, busqueda y analisis a `solguard-core`.

No ejecuta MAP/TRACE/DISCOVER, no genera candidatos, no decide verdicts y no
admite FILTER/EXPLOIT. La recuperacion de ingesta se invoca al arrancar, pero la
maquina de estados, los journals y la decision de recuperacion pertenecen a
Core.

### Autenticacion externa e interna

La API externa requiere `EXTERNAL_API_KEY` en la cabecera
`x-solguard-api-key`, salvo el estado publico minimo de `GET /health` y el
preflight CORS. La clave:

- es obligatoria en una ejecucion normal;
- debe tener entre 32 y 256 bytes ASCII imprimibles sin espacios;
- debe ser distinta de `INTERNAL_API_KEY`;
- se compara mediante un verificador opaco y no se incluye en errores;
- no se deriva ni se sustituye silenciosamente por una constante.

La interfaz Rust -> Node conserva una credencial distinta mediante
`x-internal-api-key`. Deploy materializa ambas como autoridad efimera fuera de
la configuracion durable; backend solo las consume desde el entorno del proceso.

### Limites antes de llegar a Core

La frontera Axum aplica controles antes de invocar un controller:

- body JSON configurable y acotado a un maximo de 16 MiB;
- concurrencia externa configurable entre 1 y 64 requests;
- origen CORS exacto desde una allowlist canonica `scheme://host[:port]`;
- rechazo de API keys ausentes, incorrectas o repetidas;
- DTOs cerrados y validacion de campos vacios, enums y query parameters;
- errores publicos con codigo e `incident_id`, sin rutas locales, secretos ni
  diagnosticos internos.

El endpoint de base de datos expone solo tablas y campos allowlisted y pagina
los resultados. Los nombres de tablas internos o valores sensibles no se
reflejan en respuestas de rechazo.

### `GET /health` publico y autenticado

La vista publica conserva solo estado de servicio, version y SHA-256 del binario
cargado. La attestation gestionada por Deploy requiere autenticacion e incluye:

- SHA-256 del contrato de ejecucion;
- `projects_dir` y `database_path` canonicos;
- `local_source_roots` exactos;
- rutas runtime de cada herramienta;
- SHA-256 del ejecutable release que Rust ha vuelto a comprobar.

Esto permite al runner demostrar que habla con el proceso que arranco sin
convertir `/health` en una filtracion de rutas para clientes no autenticados.

### Analisis y perfil TRACE

`POST /analyze` transporta el campo cerrado `analysis_profile`:

- `compatibility` es el default de compatibilidad;
- `generic_blind` selecciona el perfil general sellado por Core/TRACE;
- cualquier valor desconocido se rechaza durante deserializacion.

El mismo perfil se refleja en la respuesta. Backend no interpreta el perfil ni
cambia seeds, presupuestos, candidatos o decisiones FILTER.

El request ZIP conserva el handoff cerrado
`solguard-source-authority-handoff.v1`. Las rutas locales y Git no pueden usar
ese objeto para adquirir autoridad de ZIP.

### Proyectos e ingesta

Las rutas dejaron de convertir aliases en identidades validas. Un nombre de
proyecto no canonico recibe un error `project_rejected`; un nombre canonico se
entrega a Core, que hace la creacion create-only y valida la frontera fisica.

`POST /ingest` entrega la ruta a la politica `ingest_roots` de Core. Los errores
publicos no contienen el path rechazado. Al arrancar, backend llama
`reconcile_pending_transactions`; si Core recupera transacciones, backend solo
registra el contador. Un journal invalido impide el arranque en vez de ser
ignorado.

### Configuracion

El contrato de entorno separa ahora:

- credenciales interna y externa;
- allowlist CORS;
- limites de body y concurrencia;
- `SOLGUARD_PROJECTS_DIR`;
- `SOLGUARD_LOCAL_SOURCE_ROOTS`;
- `SOLGUARD_INGEST_ROOTS`;
- rutas exactas de base de datos y herramientas;
- binario release y su digest para ejecuciones gestionadas.

Las listas de roots usan paths absolutos y la validacion definitiva de identidad
fisica pertenece a Core.

### CI y verificacion

`ff6f3ec` fija el toolchain Rust y usa comandos locked en Windows y Linux. La
validacion local del bloque fue:

- `cargo fmt --check`: correcto;
- `cargo clippy --locked --all-targets -- -D warnings`: correcto;
- `cargo test --locked`: 43 tests correctos, 0 fallos;
- `cargo build --release --locked`: correcto;
- build y tests Node/Bun declarados por el repositorio: correctos durante el
  bloque de producto;
- `git diff --check`: correcto.

Los YAML y comandos de CI se validaron localmente. No se afirma que los jobs
remotos de GitHub Actions hayan pasado: no se hizo push desde esta sesion.

### Antes y despues

| Antes                                                   | Despues                                                   |
| ------------------------------------------------------- | --------------------------------------------------------- |
| API externa sin una credencial separada cerrada         | clave externa obligatoria, distinta y validada            |
| body/concurrencia dependientes de defaults de framework | limites configurados y testeados antes del handler        |
| CORS sin autoridad canonica explicita                   | allowlist de origen exacto                                |
| errores capaces de reflejar detalles locales            | error estable + incident ID sin path/secret               |
| alias de proyecto saneado a otra identidad              | identidad canonica o rechazo                              |
| health gestionado visible como un unico objeto          | vista publica minima y attestation autenticada            |
| perfil TRACE implicito                                  | enum `analysis_profile` transportado sin reinterpretacion |
| recovery de ingesta no integrado al host                | reconciliacion Core-owned antes de escuchar HTTP          |

### Limites de la evidencia

- No se ejecutaron canarios, benchmarks, labs ni holdout.
- Los 43 tests cubren transporte y contratos; no miden recall o precision.
- No existe una medicion nueva de throughput o latencia HTTP.
- La validacion de ACL de Windows no se puede inferir de permisos POSIX.
- La seguridad del host sigue dependiendo de operar en una maquina local
  confiable, proteger las credenciales y no publicar los puertos fuera del
  limite previsto.

La afirmacion permitida es que el adaptador HTTP es mas estricto, bounded y
observable. No se afirma que Solguard detecte mas bugs como consecuencia de
estos cambios.
