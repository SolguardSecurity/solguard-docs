# Conector SQLite y Escritura Transaccional

La escritura en la base SQLite no la hace directamente `solguard-database::solguard-core`. La hace el conector de `apps/db-connector`, implementado en TypeScript. Este conector es el responsable de abrir la base, ejecutar migraciones, validar payloads y persistir de forma transaccional tanto las tablas principales como los artefactos derivados.

## CLI técnica

El archivo `src/cli.ts` expone varios comandos:

- `init`, para inicializar el esquema SQLite;
- `insert`, para insertar un único payload JSON;
- `insert-batch`, para insertar varios payloads;
- `known-sources`, para consultar qué `sha256` ya existen.

Esto demuestra que el conector no es un ORM generalista para la aplicación entera. Es una herramienta técnica de administración y persistencia enfocada a la base documental.

## Apertura y configuración de la base

`db.ts` abre la base mediante `DatabaseSync` de Node SQLite, garantiza la existencia del directorio y activa `foreign_keys` y `WAL`. La función `withDatabase` encapsula apertura y cierre, lo que deja una superficie simple para el resto del conector.

La base, por tanto, se trata como un archivo local controlado, no como un servicio externo.

## Validación de payloads

Antes de insertar, `payload.ts` valida exhaustivamente el JSON. Comprueba el `schema_version`, el tipo y forma de `source`, `report`, `findings`, `taxonomy`, `code_snippets` y `chunks`. Si el payload no cumple el contrato, la inserción no continúa.

Esto es importante porque protege el esquema SQLite y evita que una modificación accidental en la crate Rust degrade silenciosamente la calidad del dataset persistido.

## Inserción transaccional

La lógica real vive en `repository.ts`. La inserción comienza ejecutando migraciones, abre una transacción `BEGIN IMMEDIATE` y procesa cada payload.

Primero hace `upsert` de la fuente. Después hace `upsert` del reporte. A continuación limpia datos derivados previos de ese reporte, incluidos findings, chunks, embeddings, filas FTS y métricas de calidad. Solo entonces vuelve a insertar findings, taxonomías, snippets, chunks, embeddings y métricas.

Este comportamiento equivale a una reconstrucción controlada de las derivaciones del reporte. La base no intenta mezclar estado nuevo y viejo del mismo informe; reemplaza las derivaciones de forma coherente.

## Derivaciones persistidas

Durante la inserción se generan varios efectos derivados:

- filas en `finding_search`,
- filas en `chunk_search`,
- embeddings locales para findings y chunks,
- taxonomía relacional adicional,
- invariantes inferidas,
- métricas de calidad de parsing.

Eso significa que la escritura no es una mera inserción plana. Cada payload se expande en múltiples estructuras pensadas para consulta posterior.

## Deduplicación e incrementalidad

La unicidad de `sha256` en `sources` y de `fingerprint` por reporte en `findings` permite deduplicación e ingesta incremental. Además, `knownSources.ts` permite consultar qué documentos ya se conocen antes de procesar lotes grandes.

Esta capacidad es relevante para el backend, donde una ingesta batch no debería reinsertar ciegamente documentos ya procesados.

## Observabilidad y explotación del dataset

`dbInfo.ts` agrega una capa de observabilidad sobre la base. Puede devolver conteos de PDFs, reportes, findings, snippets y chunks, además de distribuciones por severidad y por PDF. Aunque no forma parte del retrieval principal del backend, sirve para inspeccionar salud, volumen y calidad general del dataset.

En conjunto, el conector SQLite convierte los payloads de `solguard-database::solguard-core` en una base documental transaccional, indexada y apta para búsqueda estructurada, FTS y recuperación contextual.
