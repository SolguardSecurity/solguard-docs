# 03. Configuracion y Comandos

El proceso HTTP carga el entorno y entrega al core la configuracion de sus
dependencias. La propiedad conceptual se divide aunque el mismo proceso lea las
variables al arrancar.

## Host HTTP y modelo

| Variable | Default | Responsabilidad |
| --- | --- | --- |
| `EXTERNAL_PORT` | `5000` | API Axum local. |
| `INTERNAL_PORT` | `4000` | Servicio Node local. |
| `INTERNAL_API_KEY` | obligatorio | Autenticacion entre procesos locales. |
| `VERSION` | obligatorio | Version publicada por health/info. |
| `OLLAMA_MODEL` | obligatorio | Modelo local. |
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | Endpoint Ollama. |
| `OLLAMA_TIMEOUT_MS` | `600000` | Timeout del adaptador de modelo. |
| `SOLGUARD_EXECUTION_CONTRACT_SHA256` | ausente | Attestation opcional de 64 hex que inyecta `solguard-deploy` en procesos gestionados. |

Ambos servidores escuchan solo en `127.0.0.1`.

## Workspace y conocimiento

| Variable | Default |
| --- | --- |
| `SOLGUARD_PROJECTS_DIR` | `%USERPROFILE%/Documents/Solguard` |
| `SOLGUARD_DATABASE_PATH` | `../solguard-database/data/solguard.sqlite` |
| `SOLGUARD_DATABASE_CONNECTOR_DIR` | `../solguard-database/apps/db-connector` |
| `SOLGUARD_BACKEND_DATA_DIR` | `data` |

## Herramientas del core

| Variable | Default |
| --- | --- |
| `SOLGUARD_MAP_DIR` | `../solguard-map` |
| `SOLGUARD_TRACE_DIR` | `../solguard-trace` |
| `SOLGUARD_DIFF_DIR` | `../solguard-diff` |
| `SOLGUARD_DISCOVER_DIR` | `../solguard-discover` |
| `SOLGUARD_ECONOMIC_DIR` | `../solguard-economic` |
| `SOLGUARD_VALUE_DIR` | `../solguard-value` |
| `SOLGUARD_INVARIANT_DIR` | `../solguard-invariant` |
| `SOLGUARD_VALIDATE_DIR` | `../solguard-validate` |
| `SOLGUARD_FILTER_DIR` | `../solguard-filter` |
| `SOLGUARD_EXPLOIT_DIR` | `../solguard-exploit` |

Estos paths y sus timeouts pertenecen al pipeline del core aunque backend los
propague al construir el contexto de ejecucion. Los paths relativos conservan
la resolucion usada antes de la migracion cuando se arranca backend directamente.
Los runners reproducibles de deploy los convierten a paths fisicos absolutos y
rechazan cualquier diferencia entre prebuild, fingerprint y ejecucion.

`SOLGUARD_CORE_DIR` es una variable de `solguard-deploy` para localizar el
repositorio durante prebuilds y fingerprints. No selecciona dinamicamente otra
libreria dentro del binario backend ya compilado.

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
