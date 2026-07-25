# Changelog

Este archivo documenta cambios comprobables de `solguard-database`. No atribuye
mejoras de recall, precision, velocidad o generalizacion a cambios que no se han
medido con un corpus y un protocolo de evaluacion independientes.

## 2026-07-25 - Exportacion CSV por test

- `solguard_core::benchmark::export_csv_by_test` abre la base de benchmark en
  modo solo lectura y exporta todas las filas de `benchmark_results` cuyo
  `test` coincide exactamente.
- El CSV incluye todas las columnas de la tabla, tambien las gestionadas por
  SQLite, y ordena de forma determinista por `benckmark` y `protocolo`.
- `benchmark_phase_metrics` queda fuera de esta exportacion de tabla.
- La salida falla de forma explicita si supera 10000 filas u 8 MiB; nunca
  devuelve una seleccion parcial.

## 2026-07-24 - Almacenamiento separado de mediciones de benchmark

- Se anade `migrations/benchmark/001_init.sqlite.sql` para una SQLite dedicada,
  configurable mediante `SOLGUARD_BENCHMARK_DB_PATH` y separada de la base de
  conocimiento historico.
- Su ruta por defecto es `data/benckmarks.sqlite`, junto a
  `data/solguard.sqlite` pero con schema e identidad SQLite independientes.
- `benchmark_results` versiona snapshots por el triple unico
  `(test, benckmark, protocolo)` y guarda solo metricas comparables de
  ejecucion, deteccion, recall, volumen del funnel, FILTER y product health.
- `benchmark_phase_metrics` normaliza estado y duracion por fase sin guardar
  outputs de herramienta.
- `solguard_core::benchmark::ingest_csv_bytes` aplica limites, aliases
  documentados, validacion completa, rechazo de duplicados internos y UPSERT
  atomico. La API distingue errores de validacion y almacenamiento.
- La prevalidacion limita timestamps RFC 3339 a 64 caracteres, igual que el
  schema, para que el rechazo sea un error de entrada y no de almacenamiento.
- La base declara `application_id=0x5347424D`; paths preexistentes sin identidad
  solo se adoptan cuando sus objetos y su migracion coinciden exactamente con
  el schema v1 anterior.
- La migracion rechaza bases con objetos ajenos al schema de benchmark para no
  modificar accidentalmente `data/solguard.sqlite`.
- Estos cambios crean capacidad de medicion persistente; no demuestran por si
  mismos ninguna mejora de recall, precision, velocidad o generalizacion.

## 2026-07-22 - Macroauditoria de madurez y cierre de fronteras

### Alcance y commits funcionales

La fase documentada corresponde a estos commits funcionales ya presentes en
`main`:

- `54989dc` - `feat(database): harden ingestion and bounded retrieval`.
- `9304471` - `ci(database): enforce locked cross-platform gates`.

La fase no cambia el papel de este repositorio: sigue siendo la capa local de
ingesta, normalizacion, persistencia SQLite y recuperacion de conocimiento
historico. No se le ha dado autoridad para orquestar auditorias, ejecutar
MAP/TRACE, decidir veredictos ni acceder a un oracle de benchmark.

### Antes de esta fase

Las rutas principales eran funcionales, pero varias fronteras dependian en
exceso del comportamiento nominal del operador o del sistema de archivos:

- la lectura de documentos y payloads no tenia una politica uniforme de tamano,
  identidad fisica y estabilidad durante la lectura;
- el OCR externo se configuraba mediante una cadena de comando susceptible de
  interpretacion por shell y no tenia una frontera comun de proceso, tiempo y
  captura de salida;
- el conector aceptaba lotes y consultas sin todos los limites de cardinalidad,
  bytes e identidades ahora establecidos;
- la recuperacion historica podia depender de una preseleccion limitada antes
  del ranking, perdiendo candidatos validos situados mas alla de ese corte;
- la inicializacion SQLite no declaraba de forma completa sus opciones de
  concurrencia y reduccion de superficie;
- la migracion completa no estaba protegida como una unica unidad atomica ante
  un fallo tardio;
- el workflow no fijaba de manera uniforme versiones, lockfiles, permisos y
  matrices Windows/Linux.

### Lectura fisica y acotada de documentos

La biblioteca Rust abre una instantanea fisica del documento en lugar de
confiar unicamente en una ruta textual:

- admite solo archivos regulares;
- rechaza enlaces simbolicos y, en Windows, reparse points;
- canonicaliza la ruta y compara la identidad del archivo abierto con una
  segunda apertura de verificacion;
- comprueba longitud y tiempo de modificacion antes y despues de la lectura;
- calcula SHA-256 sobre los mismos bytes que entrega al parser;
- aplica un limite inclusivo de `268435456` bytes (256 MiB) al documento;
- aplica un limite de `134217728` bytes (128 MiB) al texto extraido;
- exige UTF-8 valido para documentos de texto.

Este cierre detecta sustituciones ordinarias de ruta y cambios durante la
lectura. No convierte un host comprometido en una raiz de confianza ni afirma
inmutabilidad frente a un atacante con control del kernel.

### OCR externo sin shell y con proceso acotado

La variable historica `SOLGUARD_OCR_TEXT_COMMAND` se rechaza expresamente. La
configuracion admitida se divide en campos estructurados:

- `SOLGUARD_OCR_PROGRAM`: ruta absoluta a un archivo ejecutable regular;
- `SOLGUARD_OCR_ARGS_JSON`: array JSON de argumentos que contiene exactamente
  un elemento `{pdf}` completo;
- `SOLGUARD_OCR_TIMEOUT_MS`: timeout opcional entre `100` y `600000` ms; el
  valor por defecto es `120000` ms.

Se rechazan rutas a shells conocidos, enlaces simbolicos y reparse points. Los
argumentos no pasan por un shell, tienen un maximo de 64 entradas, 8192 bytes
por argumento y 524288 bytes para el documento JSON de argumentos. La captura
queda limitada a 32 MiB de stdout y 1 MiB de stderr.

`bounded_process` aplica deadline, captura acotada y terminacion del proceso. En
Windows usa un Job Object con `KILL_ON_JOB_CLOSE`; en Unix gestiona el grupo de
procesos. Esta frontera reduce procesos abandonados, pero el programa OCR sigue
siendo codigo local de confianza elegido por el operador.

### Ingesta JSON y lotes del conector

El conector TypeScript incorpora una lectura estable comun para payloads:

- ruta no vacia y resuelta localmente;
- archivo regular y no symlink;
- identidad `dev`/`ino`, ruta real, tamano y `mtime` verificados alrededor de la
  lectura por handle;
- decodificacion UTF-8 fatal;
- limite inclusivo de 256 MiB por JSON;
- limite de 2048 archivos por `insert-batch`.

La CLI valida argumentos globales y argumentos propios de cada subcomando antes
de abrir o modificar SQLite. Las colecciones del payload tambien se validan en
los bordes N-1/N/N+1 antes de procesar filas.

### Frontera SQLite y migraciones

La apertura de la base local ahora declara:

- extensiones deshabilitadas;
- literales entre comillas dobles deshabilitados;
- claves foraneas habilitadas;
- `busy_timeout=10000` ms;
- `journal_mode=WAL`;
- `synchronous=NORMAL`;
- `trusted_schema=OFF`.

La conexion se cierra tanto en salida normal como en error. La secuencia de
migraciones se aplica dentro de una transaccion y revierte el conjunto completo
si falla un paso tardio. `003_retrieval_index.sqlite.sql` anade el indice usado
por la recuperacion y el upgrader de bases historicas sigue siendo idempotente.

### Recuperacion historica acotada y anti-contaminacion

El contrato de salida permanece
`solguard-historical-pattern-retrieval.v1`. La consulta queda limitada a:

- 4096 bytes de texto;
- 64 tokens buscables;
- 1024 bytes por identidad de protocolo, reporte, finding o SHA;
- un `limit` normalizado por el contrato existente.

El motor itera el corpus admitido completo y mantiene un top-K acotado y
determinista. Ya no usa el antiguo corte de 4096 filas antes del ranking; una
coincidencia posterior puede desplazar correctamente a una anterior. Los
empates se ordenan por score y titulo.

Los modos conservan responsabilidades distintas:

- `blind`: deshabilita la base y devuelve cero patrones;
- `leave-one-protocol-out`: excluye el protocolo objetivo y las identidades
  exactas adicionales;
- `leave-one-report-out`: exige y excluye reporte o SHA;
- `assisted`: exige y excluye al menos reporte, finding o SHA exactos;
- `full-assisted`: hace visible el corpus y queda marcado como investigacion,
  no como evidencia valida de benchmark.

Los filtros se aplican en SQL y se vuelven a comprobar al construir el
resultado. Las pruebas incluyen exclusion case-insensitive y cierre seguro
cuando el folding Unicode no puede sostener la identidad prometida.

### Contratos que no cambiaron

- El payload de ingesta conserva compatibilidad con schema v1 y exige los
  campos historicos completos para schema v2.
- La recuperacion es enriquecimiento historico; no concede autoridad a
  INVARIANT, VALIDATE ni FILTER.
- Las heuristicas de taxonomia y parsing no se presentan como un clasificador
  perfecto.
- SQLite sigue siendo almacenamiento local; este repositorio no expone por si
  solo un servicio de red ni una capa de autenticacion.

### CI y reproducibilidad

El workflow `CI` ahora:

- usa permisos `contents: read` y cancela ejecuciones obsoletas del mismo ref;
- fija los actions por SHA;
- fija Rust `1.96.0`, Node `24.16.0` y Bun `1.3.14`;
- ejecuta Rust en `ubuntu-24.04` y `windows-2025`;
- usa `--locked`, todos los targets y todas las features para clippy, tests y
  build release;
- instala dependencias del conector con `bun install --frozen-lockfile` y
  ejecuta build y tests en ambos sistemas.

Esto define gates remotos reproducibles. No se ejecuto GitHub Actions remoto en
esta sesion porque no se hizo push.

### Validacion local del cierre documental

Ejecutado el 2026-07-22 sobre el arbol del commit `9304471` mas esta
documentacion:

- `cargo fmt --all -- --check`: correcto.
- `cargo clippy --workspace --all-targets --locked -- -D warnings`: correcto.
- `cargo test --workspace --locked`: 65 tests Rust correctos, 0 fallos.
- `npm.cmd test` desde `apps/db-connector`: TypeScript compilado; 33 tests
  descubiertos, 32 correctos, 0 fallos y 1 omitido porque Windows no permitio
  crear el symlink de fixture (`EPERM`).
- `cargo build --locked --release --workspace --all-targets --all-features`:
  correcto.

Los checks documentales finales se registran en el commit que incorpora este
archivo.

### Riesgos y trabajo no ejecutado

- No se ejecutaron benchmarks, labs, canarios ni una medicion de latencia,
  throughput, RAM o tamano de la base.
- No se midio recall, precision ni generalizacion de las heuristicas de parsing
  o recuperacion.
- El test de rechazo de symlink del conector quedo omitido por restricciones
  del host Windows; la rama de rechazo existe, pero ese fixture concreto no
  aporta evidencia runtime en esta ejecucion.
- Un OCR configurado sigue siendo un ejecutable de confianza y puede consumir
  recursos dentro de los limites que el sistema operativo permita; no es un
  sandbox de codigo hostil.
- Los documentos y JSON se acotan pero se materializan en memoria para sus
  parsers; los limites no equivalen a una medicion de RSS.
- SQLite no incorpora cifrado, control de acceso multiusuario ni aislamiento de
  servicio en este repositorio.
- Los workflows estan validados localmente como configuracion, pero su estado
  remoto no puede declararse verde sin una ejecucion de GitHub Actions.
