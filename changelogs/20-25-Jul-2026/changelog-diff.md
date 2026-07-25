# Changelog

Registro factual de cambios de `solguard-diff`. La herramienta prioriza cambios
para revisión; no confirma que un commit o pull request contenga una
vulnerabilidad.

## 2026-07-22 - Macroauditoría de adquisición completa y aislamiento Git

### Commits incluidos

- `71a0241926fc1b01140194752f41f6482cf90c01` - adquisición acotada,
  completitud explícita y publicación transaccional.
- `b54d4788139eb958547458e4548576cfc52bfcba` - CI bloqueada y
  multiplataforma.
- `d329f98f64d73b7bdbe6d123dbbb7a1abae6258f` - aislamiento de procesos Git y
  neutralización de configuración ejecutable del repositorio.

No se añadieron señales para protocolos concretos. El scoring sigue siendo una
prioridad heurística de revisión, no severidad ni finding confirmado.

### Responsabilidad cerrada

DIFF inspecciona historial/diffs de un repositorio Git local y, de forma
opt-in, contexto de pull requests de GitHub. Su autoridad termina en la
adquisición y clasificación de cambios:

- no clona repositorios;
- no ejecuta builds, hooks, textconv ni herramientas del repositorio;
- no confirma vulnerabilidades, impacto o explotabilidad;
- no presenta una adquisición parcial como completa;
- no reemplaza un bundle de salida existente.

### `71a0241` - adquisición acotada y completitud visible

#### Historial Git local

- El número de commits debe estar entre 1 y 1.000; cero o un valor superior se
  rechaza en vez de ajustarse silenciosamente.
- Cada commit admite hasta 10.000 ficheros.
- Cada patch admite hasta 8 MiB y el agregado de un commit hasta 128 MiB.
- La salida metadata de un comando Git está limitada a 16 MiB.
- Se usan `--end-of-options` y validación de revisiones para separar opciones de
  nombres de revisión.
- La lista de ficheros y cada patch deben parsearse por completo. Un record
  malformado, un SHA inválido o un exceso de presupuesto abortan; el commit no
  se marca como completo por aproximación.
- Cada commit local publica `ChangeSetAcquisition` con `status=complete`,
  `expected_files == received_files` y cero patches ausentes solo después de
  adquirir todos sus miembros.

#### Pull requests de GitHub

- El número solicitado debe estar entre 1 y 100.
- La lista de PR está limitada a 8 MiB, el detalle a 1 MiB y cada página de
  ficheros a 16 MiB.
- Los ficheros se paginan de 100 en 100 hasta el total declarado o el techo del
  proveedor de 3.000; ya no se detiene siempre en la primera página.
- Ficheros duplicados se rechazan.
- Si GitHub declara más de 3.000 ficheros, entrega menos miembros o no devuelve
  un patch, `acquisition.status` es `incomplete` y se publican razones,
  `expected_files`, `received_files`, `pages_fetched`, `provider_file_limit` y
  `missing_patches`.
- Una adquisición incompleta puede seguir generando un informe útil, pero su
  deuda queda visible en el change set, summary, Markdown y manifest. No tiene
  autoridad de conjunto completo.

#### Publicación

- Los ocho reportes se escriben create-only en un staging hermano, se flushan y
  se publican mediante rename de directorio.
- `diff_manifest.json` sella bytes y SHA-256 de los ocho reportes y resume la
  deuda de adquisición.
- Un output no vacío se rechaza sin sustituir evidencia existente.
- Un error elimina el staging propio. En Unix se sincronizan ficheros y
  directorios; en Windows se sincronizan ficheros y el rename es la frontera
  disponible en `std` estable.

### `b54d478` - CI reproducible

- Rust `1.96.0` fijado con `rustfmt` y `clippy`.
- Matriz `ubuntu-24.04` / `windows-2025`.
- Formato, Clippy estricto, tests y release de todos los targets/features con
  lockfile.
- Acciones fijadas por SHA, checkout sin persistir credenciales, permisos
  `contents: read`, timeout y concurrencia explícitos.

Los gates equivalentes se ejecutaron localmente. No se declara que GitHub
Actions remoto haya sido ejecutado tras estos commits.

### `d329f98` - Git como proceso no confiable

Aunque DIFF necesita ejecutar el binario Git instalado, ya no hereda la
configuración ejecutable del repositorio o del usuario:

- `SOLGUARD_GIT_BIN`, cuando se usa, debe ser un path absoluto a un fichero
  regular canonizado. Sin él, PATH se limita a 256 entradas y 32 KiB y solo se
  consideran directorios absolutos.
- Para cada invocación se crea un HOME temporal aislado y se limpian las
  variables de entorno salvo un conjunto mínimo del sistema.
- Se deshabilitan configuración de sistema/global, credential helpers, hooks,
  `diff.external`, fsmonitor, protocolo `file`, prompts, askpass y pagers.
- `--no-pager`, stdin nulo y `GIT_OPTIONAL_LOCKS=0` reducen superficies
  interactivas y efectos laterales.
- La URL remota se sanea antes de serializar; credenciales, query y fragment no
  se publican. Solo una forma GitHub válida puede habilitar el modo API.
- stdout y stderr se drenan en paralelo con buffers acotados. Stdout usa el
  límite de cada operación; stderr admite 1 MiB.
- Cada comando tiene timeout de 60 segundos. Un overflow o timeout termina el
  árbol de procesos y espera un cierre acotado de readers de 5 segundos.
- Unix usa un process group dedicado; Windows usa Job Objects con
  `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`. Así, un helper descendiente no puede
  mantener pipes abiertos después de finalizar el proceso Git padre.
- Tests específicos verifican que `diff.external`/textconv configurado dentro
  del repositorio no se ejecute y que un descendiente con pipes heredados se
  cierre al expirar el timeout.

### Antes y después

| Área | Antes | Después |
| --- | --- | --- |
| PR files | Primeros 100 ficheros | Paginación hasta el total declarado o 3.000, con deuda explícita |
| Patches ausentes | Podían quedar implícitos | `patch_available`, contador y estado incomplete |
| Completitud | El volumen observado no estaba sellado como contrato | `ChangeSetAcquisition` por commit/PR y summary agregado |
| Salida | Reportes sin manifest transaccional completo | Staging, rename y `diff_manifest.json` con hashes |
| Git config | Riesgo de ejecutar helpers configurados por repo/usuario | HOME/env aislados, hooks/textconv/credentials/protocolo file desactivados |
| Procesos | El hijo directo era la principal frontera | Grupo/Job Object, timeout, kill del árbol y readers acotados |

### Validación local de cierre

Ejecutada el 22 de julio de 2026 sobre Windows:

```text
cargo test --locked --all-targets --all-features
resultado: 29 passed; 0 failed; 0 ignored

cargo fmt --all -- --check
resultado: correcto

cargo clippy --locked --all-targets --all-features -- -D warnings
resultado: correcto

cargo build --locked --release --all-targets --all-features
resultado: correcto

git diff --check
resultado: correcto
```

Los 29 tests son 20 unit tests y 9 integraciones locales. No son análisis de
29 protocolos ni evidencia de bugs.

### Riesgos y límites residuales

- El binario Git instalado sigue siendo una dependencia de confianza. DIFF
  canoniza su path, pero no fija su hash ni distribuye un Git propio.
- La API de GitHub es una frontera de red best effort. Rate limits, permisos,
  respuestas parciales y el techo de 3.000 ficheros pueden dejar el change set
  incomplete; esa deuda es visible, no recuperada.
- Una adquisición incompleta se publica para revisión manual. Los consumidores
  deben comprobar `acquisition.status`/`diff_manifest.json` antes de razonar
  sobre ausencia de cambios.
- El scoring usa heurísticas y contexto MAP; una prioridad alta no equivale a
  impacto, severidad o exploitabilidad.
- La sincronización de metadata del directorio no está disponible de forma
  portable mediante `std` estable en Windows; los ficheros sí se flushan antes
  del rename.
- No se ejecutaron benchmarks/labs/canarios, peticiones reales a GitHub, CI
  remoto ni mediciones de rendimiento durante este cierre documental.

### Afirmaciones no realizadas

No se afirma mejora de recall, precisión, velocidad o detección de bugs nuevos.
Lo comprobado es la adquisición acotada, la exposición de deuda, el aislamiento
de Git y la publicación transaccional.
