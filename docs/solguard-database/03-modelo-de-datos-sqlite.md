# Modelo de Datos SQLite

El modelo de datos de `solguard-database` está definido en `migrations/001_init.sqlite.sql`. La base usa SQLite con `foreign_keys = ON` y `journal_mode = WAL`, y organiza el conocimiento en torno a fuentes, reportes, findings, snippets, chunks, taxonomías, embeddings y métricas de calidad.

## Entidades principales

La tabla `sources` representa la fuente documental original. Guarda tipo de fuente, título opcional, URL, ruta local, `sha256`, fecha de importación y metadatos. La unicidad por `sha256` permite ingesta incremental y evita duplicados físicos del mismo documento.

La tabla `reports` representa el informe ya normalizado y asociado a una fuente. Aquí viven campos como `protocol_name`, `ecosystem`, `auditor`, `report_type`, `published_date`, título, resumen, texto bruto, Markdown normalizado y metadatos del pipeline de parsing.

La tabla `findings` es el núcleo semántico de la base. Cada fila representa un hallazgo estructurado con fingerprint, severidad, confianza, taxonomía fuerte, contratos y funciones afectadas, causa raíz, impacto, explotabilidad, precondiciones, recomendación, texto bruto, Markdown normalizado y estado de extracción.

## Snippets y chunks

La tabla `code_snippets` almacena extractos de código asociados a findings. Cada snippet queda clasificado por índice, lenguaje, tipo de snippet y contenido bruto y normalizado. El esquema soporta tipos como `diff`, `vulnerable`, `new_code`, `fixed`, `proof_of_concept` y `unknown`.

La tabla `chunks` almacena fragmentos del informe a nivel de documento. Cada chunk está indexado por `chunk_index`, contenido, tipo de sección, recuento de tokens y metadatos. Esta tabla existe para soportar recuperación contextual y no depende de que un texto forme parte de un finding concreto.

## Taxonomía relacional

Aunque la tabla `findings` ya guarda taxonomía denormalizada en columnas como `bug_class`, `impact_category`, `root_cause_type` y `affected_component_type`, el esquema también incluye tablas relacionales adicionales: `bug_classes`, `finding_bug_classes`, `impact_categories`, `finding_impacts` y `finding_invariants`.

Esto permite dos niveles de consulta. Uno rápido y directo sobre columnas indexadas dentro de `findings`, y otro más expresivo mediante relaciones auxiliares para clases de bug, impactos e invariantes derivados.

## Embeddings y búsqueda textual

La tabla `embeddings` guarda embeddings locales asociados a findings o chunks. No depende de un servicio remoto: almacena `owner_type`, `owner_id`, modelo, dimensiones, vector serializado, hash textual y metadatos.

Además, existen dos tablas virtuales FTS5: `finding_search` y `chunk_search`. La primera indexa título, contenido y recomendación de findings. La segunda indexa contenido de chunks. Esto permite una búsqueda léxica rápida que luego el backend puede complementar con heurísticas estructuradas y embeddings locales.

## Métricas de calidad de parsing

La tabla `parser_quality_metrics` registra el rendimiento del pipeline de parsing por reporte. Guarda familia documental, estrategia de parser, estrategia de findings, cantidad de findings, cuántos fueron autoextraídos o requieren revisión, confianza media, conteo de snippets, snippets desconocidos, chunks y metadatos adicionales.

Esta tabla no está pensada para retrieval de auditoría, sino para observabilidad interna y control de regresiones del pipeline documental.

## Índices

El esquema crea índices sobre protocolo, fuente, fechas de creación, tipo de fuente, severidad, clases de bug, tipos de impacto, tipos de causa raíz, tipo de componente afectado, estado de extracción, fingerprints, tipo de snippet, lenguaje de snippet, dueño de embeddings y familia/estrategia del parser.

Estos índices muestran claramente la intención de consulta de la base: no solo buscar texto libre, sino también navegar por taxonomía, severidad, componente e historial de calidad del parsing.

## Semántica del modelo

El modelo de datos está pensado para auditoría asistida, no solo para archivado. Cada nivel de la base responde a una necesidad distinta:

- `sources` resuelve trazabilidad física del documento,
- `reports` conserva el texto y su forma normalizada,
- `findings` expresa el conocimiento principal,
- `code_snippets` conserva evidencia técnica puntual,
- `chunks` soporta retrieval contextual,
- `embeddings` habilita similitud local offline,
- `parser_quality_metrics` permite medir la salud del pipeline.

Esto hace que la base sea útil tanto para respuestas agregadas como para recuperación semántica y contextual durante un análisis real.
