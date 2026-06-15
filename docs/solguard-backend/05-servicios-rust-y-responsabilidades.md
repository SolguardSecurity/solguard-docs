# Servicios Rust y Responsabilidades

La mayor parte de la lógica del backend vive en `src/services`. Esta capa es el núcleo operativo real del servidor Rust. Los controladores apenas validan entradas y serializan salidas; la semántica del sistema se concentra en los servicios.

## `projects`

El servicio `projects` gestiona el workspace local de auditoría. Su responsabilidad incluye crear el directorio raíz de trabajo, inicializar proyectos concretos, listar proyectos existentes y resolver la ruta estándar de un proyecto a partir de su nombre.

Una decisión importante de este servicio es la sanitización del nombre del proyecto. Los nombres se normalizan para generar rutas de filesystem estables, evitando que el backend dependa de nombres arbitrarios introducidos por el cliente.

Además, `ensure_project` permite que el pipeline de análisis trabaje con una semántica idempotente: si el proyecto ya existe con `program.json`, se reutiliza; si no existe, se crea automáticamente.

## `internal_client`

`internal_client` encapsula toda la comunicación Rust -> Node. Implementa tres operaciones: `health`, `info` y `search`. Cada una firma la petición con `x-internal-api-key` y valida el resultado antes de deserializarlo.

Esta pieza es importante porque concentra la frontera entre el backend determinista y la capa de IA. El resto del sistema no necesita conocer detalles de Express ni de Ollama. Solo conoce un cliente tipado que devuelve estructuras internas bien definidas.

## `knowledge`

El servicio `knowledge` es la puerta de entrada de Rust a `solguard-database`. Trabaja directamente sobre SQLite mediante `rusqlite` y produce dos tipos de salidas: resúmenes agregados de base de datos y contextos de búsqueda enriquecidos para la IA.

Su comportamiento es más rico de lo que parece a primera vista. No se limita a hacer una búsqueda textual. Construye perfiles de recuperación, deriva términos FTS, extrae filtros taxonómicos, selecciona invariantes relevantes y combina hits de findings, chunks y embeddings locales. Además, es capaz de responder directamente a ciertas consultas agregadas sin pasar por el modelo.

Por tanto, `knowledge` funciona como un sistema híbrido de retrieval estructurado y heurístico, pero manteniendo a SQLite y a la taxonomía de findings como base de autoridad.

## `ingest`

`ingest` transforma documentos fuente en payloads compatibles con `solguard-database` y coordina su inserción. Utiliza `solguard_core::ingest_document` para producir un payload normalizado, lo escribe como JSON dentro de `data/payloads` y después invoca el conector CLI de `solguard-database` para insertar ese payload en la base.

Este servicio también resuelve el caso batch. Si la entrada es una carpeta, recorre todos los documentos compatibles, omite `README.md`, acumula éxitos, fallos y archivos omitidos y devuelve un resumen completo.

Su papel arquitectónico es relevante porque convierte al backend en puente entre documentación desestructurada y conocimiento estructurado listo para consulta posterior.

## `analyze` y `analyzer`

`analyze.rs` solo reexporta el motor real, que vive en `services/analyzer`. Este submódulo concentra la lógica más sofisticada del backend: resolución del objetivo, preparación del workspace, ejecución de herramientas externas, recuperación de conocimiento, construcción de semillas de hipótesis, interacción con la IA y escritura de artefactos de salida.

`runtime.rs` coordina todo el flujo. `support.rs` agrupa utilidades de soporte como extracción de ZIPs, compactado de textos y escritura del log. `types.rs` define el contrato estructural del resultado. `seeds.rs` y `finalizers.rs` convierten evidencia determinista en hipótesis semiestructuradas y, posteriormente, en borradores de findings y material de validación.

## Middlewares y observabilidad

Aunque no están en `services`, los middlewares complementan esta capa. El backend aplica `TraceLayer` para trazas HTTP y un `CorsLayer::permissive()` para evitar fricción en desarrollo. Esto refuerza la idea de que el backend actual está optimizado para uso local y experimentación controlada, no para exposición endurecida a internet pública.
