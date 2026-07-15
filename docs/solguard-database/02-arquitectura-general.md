# Arquitectura General

La arquitectura de `solguard-database` está diseñada como una combinación de biblioteca Rust, almacenamiento SQLite local y conector de escritura en TypeScript. Esta combinación puede parecer heterogénea, pero responde a una separación deliberada de responsabilidades.

## División por capas

La capa Rust se encarga de transformar documentos en conocimiento estructurado. Su núcleo es `solguard-database::solguard-core`, una crate reutilizable que resuelve carga de documentos, extracción de texto, normalización a Markdown, perfilado documental, selección de estrategias de findings, taxonomía y chunking. No debe confundirse con `solguard-pipeline-core`.

La capa TypeScript no intenta parsear documentos. Se ocupa de la persistencia SQLite. Su trabajo es validar payloads, ejecutar migraciones, abrir la base local, insertar datos de forma transaccional y mantener consistencia entre tablas derivadas, FTS, embeddings y métricas.

SQLite actúa como plano de persistencia local. No es una caché temporal. Es la memoria indexada del sistema y se mantiene en disco aunque recompiles el backend o la crate Rust.

## Razón de la separación Rust + TypeScript

Rust concentra la lógica semántica porque ahí vive la parte sensible del procesamiento documental. TypeScript concentra la escritura porque el conector SQLite actual está montado como herramienta de integración local y CLI técnica. Este diseño evita que el parsing y el almacenamiento queden soldados en una única implementación monolítica.

Además, esta separación permite que `solguard-pipeline-core` use la crate documental directamente para ingesta y deje al conector la responsabilidad final de insertar el payload resultante en la base. El backend conserva solo el endpoint HTTP que delega la operación.

## Topología del repositorio

`crates/solguard-core` es el document-ingestion core de este repositorio. `apps/db-connector` es el adaptador de persistencia y administración técnica de la base. `migrations` contiene el esquema inicial. `data` es el directorio de persistencia local, donde se espera encontrar `solguard.sqlite` y, opcionalmente, artefactos auxiliares como payloads o exports.

La estructura no describe microservicios distribuidos. Describe un workspace local con piezas coordinadas pero desacopladas.

## Flujo interno de trabajo

Cuando entra un documento, la capa Rust produce un `IngestPayload`. Ese payload no es todavía una fila SQL; es una representación intermedia de alto nivel con fuente, informe, findings y chunks. Después, el conector TypeScript valida ese payload y lo escribe en SQLite dentro de una transacción que actualiza la tabla base y también todas las tablas e índices derivados.

Este flujo es importante porque la normalización y la persistencia están separadas por un contrato explícito: el esquema del `IngestPayload`.

## Persistencia local y estado

La base está pensada para vivir localmente por defecto. `data/solguard.sqlite` es el archivo principal. Junto a ella pueden existir carpetas de `raw`, `normalized`, `payloads` y `exports`. Esas carpetas no son la base de conocimiento principal, pero sí son útiles como artefactos intermedios o de trazabilidad.

La persistencia local también explica por qué el sistema usa SQLite con modo `WAL`. Busca una base simple, portable y suficientemente capaz para queries estructuradas, FTS y almacenamiento documental sin requerir un despliegue de servidor adicional.

## Relación con el resto del stack

`solguard-database` está debajo del pipeline core desde el punto de vista de orquestación. No decide cuándo consultar conocimiento ni cómo introducirlo en un prompt. Sin embargo, condiciona fuertemente la calidad del sistema completo, porque es la capa que define qué datos estructurados existen, qué taxonomías son queryables y qué evidencia textual se puede recuperar cuando el core necesita contexto para una búsqueda o un análisis.
