# API Externa y Rutas HTTP

La API externa es la superficie pública del backend y está implementada en Axum. Todas las rutas se registran en `src/routes/mod.rs` y comparten el mismo `AppState`, que contiene la configuración resuelta y el cliente interno usado para hablar con la capa Node.

## Estructura general

La API sigue un patrón directo: cada ruta delega en un controlador y cada controlador traduce el contrato HTTP hacia un servicio interno del backend. La capa de error usa `ApiError`, que normaliza respuestas JSON con un campo `error` y permite diferenciar, de forma básica, entre errores de entrada y errores de upstream.

## Rutas de estado

`GET /health` devuelve un estado mínimo del backend Rust. Su objetivo es confirmar que el servidor externo está vivo y qué versión expone.

`GET /info` devuelve una vista más amplia del sistema. Incluye versión, puertos, estado del servicio interno cuando responde, información del modelo interno y un resumen del estado de la base de conocimiento. Esta ruta es especialmente útil como endpoint de diagnóstico porque combina señales de varias capas.

## Rutas de workspace y proyectos

`POST /install` crea el workspace local de Solguard en el directorio de proyectos configurado. No crea un proyecto concreto, sino la carpeta raíz que alojará futuros objetivos de auditoría.

`GET /projects` enumera los proyectos existentes dentro del workspace local. Si encuentra `program.json` dentro de cada carpeta, usa ese archivo como metadato principal; en caso contrario, infiere el nombre desde el directorio.

`POST /projects/init` crea un nuevo proyecto local. Sanitiza el nombre, crea la carpeta del proyecto, crea `tool-outputs/` y escribe dos artefactos iniciales: `program.json` y `program.md`. Esta ruta es la que prepara el contenedor persistente donde luego se escribirán evidencias y resultados de análisis.

## Ruta de búsqueda asistida

`POST /search` es la ruta que conecta la base de conocimiento con la capa de IA. Acepta una consulta y un modo opcional. Los modos disponibles son `general`, `knowledge` y `hybrid`.

En `general`, no se construye contexto desde la base de datos. En `knowledge` y `hybrid`, Rust genera un contexto a partir de `solguard-database`. Además, en `knowledge`, si la consulta parece un agregado claro, el backend puede responder de forma directa sin pasar por el modelo, devolviendo una respuesta autoritativa basada en datos reales de la base.

La respuesta de esta ruta incluye también metadatos de recuperación. Ese detalle es importante porque permite distinguir entre respuesta generada por modelo y evidencia objetiva derivada del sistema de recuperación.

## Ruta de ingesta

`POST /ingest` procesa un archivo individual o una carpeta completa. Soporta `pdf`, `md`, `markdown` y `txt`. Si la entrada es un directorio, recorre los archivos de forma recursiva y excluye explícitamente `README.md`.

El resultado de la ingesta no es solo una confirmación binaria. La respuesta detalla cuántos documentos se procesaron, cuáles se insertaron, cuáles se omitieron y qué fallos ocurrieron. Esto convierte la ruta en un endpoint de batch ingestion con tolerancia a fallos parciales.

## Ruta de análisis

`POST /analyze` es la ruta más compleja del backend. Recibe un nombre de proyecto y un objetivo, que puede ser un directorio local, una URL Git o un archivo `.zip`. A partir de esa entrada, el backend resuelve el código fuente, ejecuta herramientas deterministas, consulta conocimiento contextual, genera hipótesis y escribe múltiples artefactos persistentes dentro del proyecto.

No devuelve solo una cadena de texto. Devuelve un estado estructurado con la ruta del proyecto, la ruta del código fuente resuelto, el resultado de cada herramienta ejecutada y las ubicaciones de los artefactos generados.

## Consideraciones de contrato

La API externa es deliberadamente local y orientada a automatización. No está diseñada como una API REST pública de terceros, sino como una interfaz técnica consumida por herramientas de Solguard. Eso explica varias decisiones del contrato: rutas directas, fuerte dependencia del filesystem local y respuestas que incluyen paths del sistema operativo como parte del resultado.
