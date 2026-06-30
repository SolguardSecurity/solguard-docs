# 03. Configuracion y Comandos

La configuracion se divide entre el proceso Rust externo y el proceso Node
interno. `bun start` es el arranque normal porque levanta primero Node y despues
el servidor Rust.

## Variables obligatorias

| Variable | Usada por | Descripcion |
| --- | --- | --- |
| `INTERNAL_API_KEY` | Rust y Node | Token compartido entre API externa y servicio interno. |
| `VERSION` | Rust y Node | Version publicada en `/health` e `/info`. |
| `OLLAMA_MODEL` | Node | Modelo local que usara Ollama. |

Si alguna obligatoria falta, el proceso que la necesita falla al arrancar.

## Puertos y Ollama

| Variable | Default | Descripcion |
| --- | ---: | --- |
| `INTERNAL_PORT` | `4000` | Puerto local de Express interno. |
| `EXTERNAL_PORT` | `5000` | Puerto local de la API Axum. |
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | Endpoint local de Ollama. |
| `OLLAMA_TIMEOUT_MS` | `600000` | Timeout de llamadas a Ollama en milisegundos. |

Ambos servidores escuchan solo en `127.0.0.1`.

## Paths del backend

| Variable | Default |
| --- | --- |
| `SOLGUARD_DATABASE_PATH` | `../solguard-database/data/solguard.sqlite` |
| `SOLGUARD_DATABASE_CONNECTOR_DIR` | `../solguard-database/apps/db-connector` |
| `SOLGUARD_BACKEND_DATA_DIR` | `data` |
| `SOLGUARD_PROJECTS_DIR` | `%USERPROFILE%/Documents/Solguard` |
| `SOLGUARD_MAP_DIR` | `../solguard-map` |
| `SOLGUARD_TRACE_DIR` | `../solguard-trace` |
| `SOLGUARD_DIFF_DIR` | `../solguard-diff` |
| `SOLGUARD_DISCOVER_DIR` | `../solguard-discover` |
| `SOLGUARD_ECONOMIC_DIR` | `../solguard-economic` |
| `SOLGUARD_INVARIANT_DIR` | `../solguard-invariant` |
| `SOLGUARD_VALIDATE_DIR` | `../solguard-validate` |

Los paths relativos se resuelven desde el directorio de trabajo del backend.

## Parametros de analisis

| Variable | Default | Reglas |
| --- | ---: | --- |
| `SOLGUARD_TRACE_MAX_TARGETS` | `192` | Entero positivo. |
| `SOLGUARD_TRACE_MAX_DEPTH` | `4` | Entero positivo. |
| `SOLGUARD_MODEL_DISCOVERY_BATCHES` | `5` | Entero no negativo; `0` desactiva llamadas de descubrimiento con modelo. |
| `SOLGUARD_MODEL_DISCOVERY_TIMEOUT_SECS` | `75` | Entero positivo. |

Guards internos actuales:

- Repos con mas de `150` archivos fuente soportados usan `map --fast`.
- Un `map --deep` que excede su ventana acotada se reintenta con `--fast`.
- Las fases externas tienen timeouts largos para evitar ejecuciones colgadas,
  pero el pipeline registra `fallback`, `degraded` o `completed_with_errors`
  cuando no se obtiene salida completa.

## Binaries configurables

| Variable | Default |
| --- | --- |
| `CARGO_BIN` | `cargo` |
| `GIT_BIN` | `git` |
| `BUN_BIN` | `bun` |
| `NODE_BIN` | `node` |

## Archivos `.env`

Node carga variables sin sobrescribir las ya existentes en el entorno.

En desarrollo:

```text
.env.development
.env.develpment
.env
```

En `NODE_ENV=production` o `NODE_ENV=test`:

```text
.env.production / .env.test
.env
```

La variante `.env.develpment` se conserva porque existe en el cargador actual.

## Comandos habituales

Instalar dependencias Node:

```powershell
bun install
```

Construir TypeScript:

```powershell
bun run build
```

Ejecutar tests Node:

```powershell
bun run test
```

Ejecutar tests Rust:

```powershell
cargo test
```

Formatear la capa Node/TS del backend:

```powershell
bun run fmt
```

Arrancar backend completo:

```powershell
bun start
```

Arrancar solo Rust, si el servicio interno ya esta levantado:

```powershell
cargo run --bin solguard-backend
```

Reconstruir candidatos desde un proyecto existente:

```powershell
cargo run --bin solguard-backend -- rebuild-candidates "<project-dir>"
```

Este ultimo comando no arranca HTTP; imprime el resultado JSON de la
reconstruccion.
