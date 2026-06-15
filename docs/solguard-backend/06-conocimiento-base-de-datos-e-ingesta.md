# Conocimiento, Base de Datos e Ingesta

La relación entre `solguard-backend` y `solguard-database` es central para entender el sistema. El backend no almacena conocimiento como repositorio primario, pero sí lo consulta, lo resume y lo alimenta mediante un pipeline de ingesta documental.

## Papel de `solguard-database`

La base SQLite de `solguard-database` actúa como memoria estructurada del sistema. Desde el backend se consumen conteos agregados, taxonomías, findings normalizados, chunks textuales y embeddings asociados a esos findings. Esa información se usa tanto para respuestas directas como para construir contexto útil para la IA.

La ventaja de este diseño es que la base de conocimiento no depende del modelo para ser útil. Puede responder preguntas agregadas, devolver muestras representativas y soportar retrieval contextual incluso si la capa de IA está caída.

## Resumen autoritativo de conocimiento

El backend puede generar un resumen autoritativo del contenido de la base. Ese resumen incluye disponibilidad de la base, número de reportes, número de findings, distribución por severidad, muestras taxonómicas y rankings de clases de bug, categorías de impacto, tipos de causa raíz y tipos de componente afectados.

Esa salida aparece en `/info`, pero también alimenta respuestas más específicas cuando una consulta del usuario pide conteos o rankings explícitos. En esos casos, el backend puede evitar completamente la llamada al modelo y responder desde datos estructurados.

## Contexto de búsqueda enriquecido

Cuando una consulta requiere recuperación contextual, el backend construye un `KnowledgeSearchContext`. Para ello mezcla varias estrategias. Primero deriva términos compatibles con SQLite FTS. Después añade filtros taxonómicos cuando detecta familias conceptuales relevantes. Posteriormente incorpora findings y chunks recuperados, y también utiliza embeddings locales generados por hash para aproximar búsqueda vectorial sin depender de un servicio externo adicional.

El resultado no es un simple bloque de texto. También se devuelve metadata de recuperación: términos FTS usados, filtros estructurados, filtros taxonómicos, términos descartados, invariantes seleccionados y número de findings o chunks recuperados. Esto hace auditable la propia fase de retrieval.

## Pipeline de ingesta

La ingesta comienza con un archivo o carpeta local. Si la entrada es válida, el servicio procesa los documentos compatibles con `solguard_core::ingest_document`, una dependencia reutilizada desde `solguard-database`. Ese paso convierte PDF, Markdown o texto plano en un payload estructurado que contiene metadatos del informe, findings y datos fuente normalizados.

Ese payload se persiste primero dentro de `SOLGUARD_BACKEND_DATA_DIR/payloads/` usando como nombre el `sha256` del documento de origen. Esta decisión permite conservar trazabilidad y reutilizar artefactos de ingesta sin depender solo de la base de datos final.

Después, el backend invoca el conector CLI de `solguard-database` para insertar el payload en SQLite. Si el conector todavía no está compilado, intenta construirlo con Bun antes de la inserción.

## Semántica operacional de la ingesta

La ruta de ingesta está diseñada para tolerar fallos parciales. En un directorio puede haber documentos válidos, documentos incompatibles y documentos que fallen durante la normalización o la inserción. El backend no aborta todo el lote al primer error; acumula resultados y devuelve un informe de ejecución con insertados, fallidos y omitidos.

Este comportamiento es importante en flujos reales, donde la calidad documental de las fuentes puede ser heterogénea. La infraestructura de backend prioriza la continuidad del batch y la observabilidad del resultado.

## Principio de diseño

La clave de esta capa es que conocimiento e ingesta están acoplados por contrato, pero desacoplados por implementación. La ingesta escribe artefactos reproducibles y llama a un conector externo; la recuperación consulta una base ya estructurada. Eso permite evolucionar uno de los lados sin rehacer completamente el otro.
