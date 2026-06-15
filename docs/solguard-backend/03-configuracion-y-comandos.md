# Configuración y Comandos

La configuración de `solguard-backend` está distribuida entre la carga de entorno de Rust y la carga de entorno de Node. Ambos lados comparten variables comunes, pero cada uno las interpreta según su propia responsabilidad operativa.

## Variables obligatorias

Hay tres grupos de variables críticas. El primero define la topología local del sistema: `INTERNAL_PORT` y `EXTERNAL_PORT`. El segundo define el cierre de seguridad del plano interno: `INTERNAL_API_KEY`. El tercero define la capa de IA: `OLLAMA_MODEL`, `OLLAMA_HOST` y `OLLAMA_TIMEOUT_MS`. A esto se suma `VERSION`, usada como metadato público y privado del servicio.

Rust además consume rutas y binarios auxiliares: `SOLGUARD_DATABASE_PATH`, `SOLGUARD_DATABASE_CONNECTOR_DIR`, `SOLGUARD_BACKEND_DATA_DIR`, `SOLGUARD_PROJECTS_DIR`, `SOLGUARD_MAP_DIR`, `SOLGUARD_TRACE_DIR`, `SOLGUARD_DIFF_DIR`, `CARGO_BIN`, `GIT_BIN`, `BUN_BIN` y `NODE_BIN`.

Si esas variables no se definen, el backend aplica valores por defecto razonables orientados a una instalación de desarrollo local dentro de un workspace donde conviven varios repositorios de Solguard.

## Resolución de configuración en Rust

`src/config.rs` construye un objeto `Config` a partir del entorno. Ese objeto no solo guarda puertos y tokens, sino también todas las rutas operativas usadas durante el análisis: ubicación de la base SQLite, directorios de herramientas, carpeta de datos local y workspace de proyectos.

La construcción de `Config` también define convenciones importantes. El directorio de proyectos, por ejemplo, por defecto se resuelve a `Documents/Solguard` dentro del perfil del usuario en Windows. Esto hace que el backend gestione su propio workspace fuera del repositorio fuente.

## Resolución de configuración en Node

La capa Node carga variables desde archivo con `node/utils/env.ts`. En desarrollo intenta leer `.env.development`, `.env.develpment` y `.env`; en producción o test intenta `.env.<modo>` y después `.env`. La lectura es conservadora: si una variable ya existe en `process.env`, no se sobrescribe.

Después de cargar el entorno, `readInternalConfig()` valida puertos, timeout, modelo, clave interna y versión. Con ello se evita que el servidor interno arranque en un estado ambiguo.

## Comandos de desarrollo

La base de comandos del backend es simple y está pensada para trabajo local:

- `bun install` instala dependencias del plano Node/TypeScript.
- `bun run fmt` formatea la capa TypeScript con Prettier.
- `bun run test` compila TypeScript y ejecuta los tests del plano Node.
- `cargo test` ejecuta los tests del plano Rust.
- `bun start` arranca el sistema completo, incluyendo Node interno y servidor Rust.

La elección de `bun start` como punto de entrada principal no es accidental. En este diseño, Bun funciona como supervisor liviano del backend híbrido, delegando en `cargo` el arranque del proceso Rust.

## Binarios y herramientas auxiliares

El backend depende de herramientas externas dentro del ecosistema Solguard. `cargo` se usa para lanzar `solguard-map`, `solguard-trace` y `solguard-diff` a partir de sus respectivos `Cargo.toml`. `git` se usa para clonar objetivos remotos cuando el análisis apunta a un repositorio URL. `node` se usa para invocar el conector CLI de `solguard-database`. `bun` se usa para compilar dicho conector si todavía no existe su artefacto `dist/cli.js`.

Esto implica que la configuración del entorno no solo decide puertos o modelos. También define la capacidad real del backend para completar una ingesta o una ejecución de análisis extremo a extremo.

## Convención de ejecución

El backend está diseñado para ejecutarse en local, con rutas relativas a repositorios hermanos y con herramientas presentes en la máquina del operador. No hay, por ahora, un modelo desacoplado de despliegue distribuido. La documentación técnica debe leerse bajo esa premisa: `solguard-backend` es una pieza de orquestación local avanzada, no un servicio SaaS remoto.
