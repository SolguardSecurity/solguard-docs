# 02. Arquitectura General

El backend esta compuesto por dos procesos locales y varias herramientas de
analisis que se invocan como dependencias de workspace.

```text
cliente / runner
    |
    v
Rust HTTP API (Axum, 127.0.0.1:EXTERNAL_PORT)
    |
    +-- proyectos, ingesta, busqueda, orquestacion
    |
    +-- herramientas locales: map, diff, trace, discover, economic, invariant, validate
    |
    +-- SQLite de conocimiento via solguard-database
    |
    v
Node internal API (Express, 127.0.0.1:INTERNAL_PORT)
    |
    v
Ollama local
```

## Proceso Rust externo

El binario `solguard-backend` arranca en `src/main.rs`, carga `Config` desde
entorno, crea `InternalClient`, registra las rutas de `src/routes/mod.rs` y
escucha en `127.0.0.1:{EXTERNAL_PORT}`.

Capas relevantes:

- `controllers/`: validacion HTTP, serializacion de respuestas y errores.
- `routes/`: tabla de rutas Axum.
- `middlewares/`: CORS y trazas HTTP.
- `services/`: logica de negocio y orquestacion.
- `config.rs`: variables de entorno, defaults y paths de herramientas.

El mismo binario tambien soporta el subcomando:

```powershell
cargo run --bin solguard-backend -- rebuild-candidates <project-dir>
```

Ese modo no levanta servidor; reconstruye candidatos desde artefactos existentes
y devuelve JSON por stdout.

## Proceso Node interno

`bun start` ejecuta `node/start.ts`. Ese script:

1. Carga `.env.development`, `.env.develpment` y `.env` en desarrollo.
2. Arranca Express en `127.0.0.1:{INTERNAL_PORT}`.
3. Lanza `cargo run --bin solguard-backend` como proceso hijo.
4. Propaga `INTERNAL_PORT`, `EXTERNAL_PORT`, `INTERNAL_API_KEY`,
   `OLLAMA_MODEL` y `VERSION` al proceso Rust.

El servicio interno no debe exponerse fuera de localhost. Todas sus rutas exigen
`x-internal-api-key` o `Authorization: Bearer <token>`.

## Herramientas externas

El motor de analisis usa repos hermanos por path configurable:

- `solguard-map`
- `solguard-diff`
- `solguard-trace`
- `solguard-discover`
- `solguard-economic`
- `solguard-invariant`
- `solguard-validate`

El backend no asume que todas las fases seran perfectas. Si una fase falla,
agota timeout o genera salida degradada, el pipeline lo registra y conserva los
artefactos disponibles para diagnostico.

## Workspace de proyectos

Por defecto los proyectos viven en:

```text
%USERPROFILE%\Documents\Solguard
```

Cada proyecto contiene metadatos (`program.json`, `program.md`), artefactos de
herramientas bajo `tool-outputs/`, informes bajo `reports/` y documentos de
resumen en la raiz del proyecto.

## Frontera entre determinismo y modelo

El modelo local ayuda a buscar, redactar o proponer senales en paquetes acotados.
No es autoridad final para verdictos. Las decisiones que promocionan un finding
dependen de validacion, evidencia estructurada, referencias a artefactos y
clasificacion explicita en `validation_results.json`.
