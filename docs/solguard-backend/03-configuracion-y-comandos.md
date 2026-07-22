# 03. Configuracion y Comandos

El proceso HTTP carga el entorno y entrega al core la configuracion de sus
dependencias. La propiedad conceptual se divide aunque el mismo proceso lea las
variables al arrancar.

## Host HTTP y modelo

| Variable                             | Default                  | Responsabilidad                                                                       |
| ------------------------------------ | ------------------------ | ------------------------------------------------------------------------------------- |
| `EXTERNAL_PORT`                      | `5000`                   | API Axum local.                                                                       |
| `INTERNAL_PORT`                      | `4000`                   | Servicio Node local.                                                                  |
| `INTERNAL_API_KEY`                   | obligatorio              | Autenticacion entre procesos locales.                                                 |
| `EXTERNAL_API_KEY`                   | obligatorio              | API externa; 32-256 bytes ASCII imprimibles, sin whitespace y distinta de la interna. |
| `EXTERNAL_ALLOWED_ORIGINS`           | origins Tauri locales     | Allowlist CORS exacta de origins canonicos; puede sustituirse de forma explicita.      |
| `EXTERNAL_BODY_LIMIT_BYTES`          | `1048576`                | Limite de body JSON; nunca puede superar 16 MiB.                                      |
| `EXTERNAL_MAX_IN_FLIGHT`             | `8`                      | Concurrencia externa; rango admitido 1-64.                                            |
| `VERSION`                            | obligatorio              | Version publicada por health/info.                                                    |
| `OLLAMA_MODEL`                       | obligatorio              | Modelo local.                                                                         |
| `OLLAMA_HOST`                        | `http://127.0.0.1:11434` | Endpoint Ollama.                                                                      |
| `OLLAMA_TIMEOUT_MS`                  | `600000`                 | Timeout del adaptador de modelo.                                                      |
| `SOLGUARD_EXECUTION_CONTRACT_SHA256` | ausente                  | Attestation opcional de 64 hex que inyecta `solguard-deploy` en procesos gestionados. |
| `SOLGUARD_BACKEND_BIN`               | ausente                  | Path absoluto al binario release canonico en ejecuciones gestionadas.                 |
| `SOLGUARD_BACKEND_BIN_SHA256`        | ausente                  | SHA-256 lowercase esperado del binario release gestionado.                            |

Ambos servidores escuchan solo en `127.0.0.1`.

La allowlist CORS por defecto contiene `http://localhost:1420`,
`http://tauri.localhost` y `tauri://localhost`. Si se sustituye, cada entrada
debe ser un origin canonico exacto; wildcard, origin opaco, path, query o
fragmento se rechazan.

## Workspace y conocimiento

| Variable                          | Default                                     |
| --------------------------------- | ------------------------------------------- |
| `SOLGUARD_PROJECTS_DIR`           | `%USERPROFILE%/Documents/Solguard`          |
| `SOLGUARD_LOCAL_SOURCE_ROOTS`     | sin default implicito seguro                |
| `SOLGUARD_INGEST_ROOTS`           | sin default implicito seguro                |
| `SOLGUARD_DATABASE_PATH`          | `../solguard-database/data/solguard.sqlite` |
| `SOLGUARD_DATABASE_CONNECTOR_DIR` | `../solguard-database/apps/db-connector`    |
| `SOLGUARD_BACKEND_DATA_DIR`       | `data`                                      |

Las listas de roots contienen paths absolutos. `SOLGUARD_PROJECTS_DIR` concede
autoridad para estado gestionado; no autoriza automaticamente targets locales
ni informes. Core vuelve a comprobar contencion e identidad fisica bajo
`SOLGUARD_LOCAL_SOURCE_ROOTS` o `SOLGUARD_INGEST_ROOTS`, respectivamente.

`EXTERNAL_API_KEY` e `INTERNAL_API_KEY` no deben persistirse dentro del runtime
config v2 de Deploy. Los runners las materializan en una autoridad efimera
single-link y las inyectan solo al proceso Backend; el cleanup es obligatorio
tanto tras un prepare fallido como tras run.

## Herramientas del core

| Variable                                                  | Default                 |
| --------------------------------------------------------- | ----------------------- |
| `SOLGUARD_MAP_DIR`                                        | `../solguard-map`       |
| `SOLGUARD_TRACE_DIR`                                      | `../solguard-trace`     |
| `SOLGUARD_DIFF_DIR`                                       | `../solguard-diff`      |
| `SOLGUARD_DISCOVER_DIR`                                   | `../solguard-discover`  |
| `SOLGUARD_ECONOMIC_DIR`                                   | `../solguard-economic`  |
| `SOLGUARD_VALUE_DIR`                                      | `../solguard-value`     |
| `SOLGUARD_INVARIANT_DIR`                                  | `../solguard-invariant` |
| `SOLGUARD_VALIDATE_DIR`                                   | `../solguard-validate`  |
| `SOLGUARD_FILTER_DIR`                                     | `../solguard-filter`    |
| `SOLGUARD_EXPLOIT_DIR`                                    | `../solguard-exploit`   |
| `SOLGUARD_FILTER_TIMEOUT_MS`                              | `1200000`               |
| `SOLGUARD_FILTER_TRACE_EVIDENCE_VERIFIER_TIMEOUT_SECONDS` | `900`                   |
| `SOLGUARD_FILTER_TIMEOUT_MARGIN_MS`                       | `300000`                |

Estos paths y sus timeouts pertenecen al pipeline del core aunque backend los
propague al construir el contexto de ejecucion. Los paths relativos conservan
la resolucion usada antes de la migracion cuando se arranca backend directamente.
Los runners reproducibles de deploy los convierten a paths fisicos absolutos y
rechazan cualquier diferencia entre prebuild, fingerprint y ejecucion.
El timeout externo de FILTER debe ser mayor o igual que el timeout del
verificador convertido a milisegundos mas el margen obligatorio; una
configuracion N-1 se rechaza antes de ejecutar procesos.

`SOLGUARD_CORE_DIR` es una variable de `solguard-deploy` para localizar el
repositorio durante prebuilds y fingerprints. No selecciona dinamicamente otra
libreria dentro del binario backend ya compilado.

En benchmark, labs y release, las dos variables de binario son inseparables. El
host Node acepta unicamente el path fisico absoluto
`solguard-backend/target/release/solguard-backend[.exe]`, rechaza debug, paths
alternativos, links/reparse points y drift de SHA-256, y solo entonces crea el
proceso. Rust vuelve a identificar y hashear el ejecutable realmente cargado
(`/proc/self/exe` en Linux y `current_exe` bloqueado en Windows); un mismatch
termina el arranque. `/health.backend_binary_sha256` expone ese digest
autocalculado, y el runner propietario exige igualdad exacta con el descriptor
sellado. Fuera de ejecucion gestionada, la ausencia de ambas variables conserva
el arranque de desarrollo, pero nunca satisface un gate release.

## Arranque y pruebas del backend

```powershell
bun install
bun run build
bun run test
cargo test --locked
bun start
```

Si el servicio interno ya esta disponible:

```powershell
cargo run --locked --bin solguard-backend
```

## CLI del core

Los comandos sin HTTP que reutilizan servicios del pipeline pertenecen al
binario `solguard-core`:

```powershell
cargo run --locked --manifest-path "../solguard-core/Cargo.toml" --bin solguard-core -- rebuild-candidates "<project-dir>"
cargo run --locked --manifest-path "../solguard-core/Cargo.toml" --bin solguard-core -- replay-candidates "<project-dir>" --raw-candidates "<raw.json>" --invariants "<invariants.json>" --out "<dir>"
cargo run --locked --manifest-path "../solguard-core/Cargo.toml" --bin solguard-core -- refresh-poc-plans "<project-dir>"
```

Los aliases historicos que `solguard-deploy` acepta para localizar el binario
son solo compatibilidad del runner; no devuelven la propiedad del replay al
backend.
