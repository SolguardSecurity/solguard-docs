# 02. Arquitectura General

La arquitectura separa transporte y producto.

```text
cliente / runner
    |
    v
solguard-backend
  Axum + routes + controllers + DTO HTTP
  bootstrap Node/Ollama y adaptadores de proceso
    |
    | llamada Rust
    v
solguard-pipeline-core (lib solguard_core)
  proyectos + ingesta + conocimiento
  pipeline + tools + candidates + VALIDATE + FILTER + EXPLOIT + report
    |
    +-- herramientas locales
    +-- solguard-database::solguard-core para ingesta documental
    +-- SQLite y servicio interno cuando corresponde
```

## Backend

El binario `solguard-backend` carga la configuracion del host, construye las
dependencias del core, registra las rutas y escucha en localhost. Sus carpetas
de producto son deliberadamente pequenas:

- `routes/`: tabla de rutas Axum;
- `controllers/`: validacion HTTP y traduccion de respuestas/errores;
- `middlewares/`: autenticacion externa, limites, CORS y trazas HTTP;
- `main.rs`: bootstrap del proceso y wiring del core;
- `node/`: host local para el adaptador de modelo.

No debe aparecer una segunda implementacion de `analyze`, el journal o las
fases en backend.

La frontera HTTP usa DTOs cerrados, una allowlist de origen
`scheme://host[:port]`, body bounded y una cuota de requests concurrentes. Los
errores privados se registran con `incident_id`, pero la respuesta no refleja
paths locales, secretos ni el diagnostico interno.

## Core

El repositorio `solguard-core` contiene el paquete `solguard-pipeline-core`, la
libreria `solguard_core` y el binario `solguard-core`. Sus servicios son los
propietarios de la ejecucion y los artefactos.

La dependencia debe permanecer unidireccional:

```text
solguard-backend -> solguard-pipeline-core
solguard-pipeline-core -X-> solguard-backend
```

Esto permite usar el motor desde HTTP, tests o replays offline sin duplicar
logica.

## Proceso Node interno

El host Node conserva la comunicacion local con Ollama y el arranque coordinado
del proceso Rust. Esa capacidad es un adaptador proporcionado al core; no le da
al backend autoridad sobre candidatos o veredictos.

## Compatibilidad

Las rutas y DTOs productivos se mantienen de forma compatible, con campos
aditivos como `analysis_profile`. La seguridad de transporte si se endurece:
una request no autenticada ya no puede usar los endpoints productivos y un
nombre de proyecto no canonico se rechaza en vez de convertirse en otro nombre.
