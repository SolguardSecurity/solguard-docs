# Solguard Core

`solguard-core` no es una CLI como `solguard-map`, `solguard-trace` o `solguard-diff`. Es una crate Rust reutilizable que vive dentro del workspace de `solguard-database` y que el resto del ecosistema usa como biblioteca técnica para ingesta documental. En el estado actual del stack, esta es la librería Rust personalizada más clara y reutilizada por Solguard, y `solguard-backend` depende de ella directamente.

## Papel dentro del ecosistema

La crate expone una capacidad central: convertir documentos de auditoría en payloads estructurados que puedan insertarse en `solguard-database`. Esto significa que `solguard-core` actúa como biblioteca de normalización, extracción y modelado de informes, findings, chunks y fragmentos de código.

Su función no es servir consultas, montar una API ni hacer scoring de auditoría de repositorios. Su función es resolver la transición desde un documento bruto hasta un artefacto de conocimiento estructurado y persistible.

## API pública

La superficie pública de la crate es deliberadamente pequeña. Desde `src/lib.rs` se reexportan el tipo de error, el alias de resultado, los tipos del modelo y, sobre todo, `IngestConfig` e `ingest_document`.

Esa decisión es importante porque concentra la experiencia pública de la librería en una sola operación principal. El consumidor no necesita orquestar manualmente todos los submódulos; basta con suministrar un path y una configuración de ingesta para obtener un `IngestPayload`.

## Pipeline de ingesta

El núcleo funcional está en `src/pipeline.rs`. La función `ingest_document` ejecuta un pipeline secuencial bastante claro:

1. carga el documento desde disco,
2. resuelve metadatos básicos de origen,
3. normaliza el contenido a Markdown,
4. detecta el perfil del documento,
5. extrae metadatos del informe,
6. selecciona una estrategia de extracción de findings,
7. transforma borradores de finding en payloads estructurados,
8. extrae fragmentos de código por finding,
9. fragmenta el documento completo en chunks,
10. y construye el `IngestPayload` final.

Este orden expresa una filosofía concreta: primero se normaliza el documento, luego se clasifica su formato, después se decide cómo parsearlo y solo al final se serializa el conocimiento estructurado.

## Módulos funcionales

`document_io` carga el documento y gestiona su origen. `pdf_text` resuelve la extracción de texto desde PDF. `normalization` transforma texto fuente a Markdown canónico. `document_profile` detecta familia documental y estrategia de parseo. `report_metadata` extrae datos como cabecera, periodo de auditoría o conteos de issues. `finding_strategies` selecciona la estrategia adecuada de extracción. `findings` materializa los findings. `code` detecta y clasifica snippets de código. `chunking` parte el documento en unidades reutilizables para retrieval posterior. `taxonomy` y `types` definen la semántica estructurada de la salida.

Esta modularidad hace que la crate sea una biblioteca real y no una única función grande y opaca.

## Detección de perfil documental

Uno de los puntos más interesantes de `solguard-core` es `document_profile`. Este módulo intenta reconocer familias documentales como Zenith, Code4rena, Sherlock, Cantina, OffsideLabs o un formato genérico. Además, asigna una `ParserStrategy` concreta, como `SeverityIdHeadings`, `NumericSectionHeadings`, `ContestIssueHeadings`, `SingleFindingMarkdown` o `GenericHeadings`.

Esto es importante porque el parser no trata todos los informes igual. Primero intenta entender de qué clase de documento se trata y solo entonces decide cómo extraer findings y metadatos.

## Modelo de datos estructurado

El tipo central de salida es `IngestPayload`. Ese payload contiene:

- `source`, con metadatos del documento original,
- `report`, con texto bruto, Markdown normalizado y metadatos enriquecidos,
- `findings`, con los hallazgos estructurados,
- y `chunks`, con particiones del documento útiles para indexación o retrieval.

Dentro de `FindingPayload`, la librería captura severidad, fingerprint, taxonomía, contratos y funciones afectadas, causa raíz, impacto, explotabilidad, precondiciones, recomendación, estado de extracción, datos estructurados y snippets de código.

Esto confirma que `solguard-core` no produce una simple conversión de formato. Produce un modelo de conocimiento preparado para indexación, búsqueda y análisis posterior.

## Taxonomía y snippets de código

La crate también normaliza la taxonomía de findings y clasifica fragmentos de código. Los snippets pueden ser `diff`, `vulnerable`, `new_code`, `fixed`, `proof_of_concept` o `unknown`. Esta capacidad es especialmente útil porque muchos informes incluyen pruebas, diffs o extractos relevantes que más tarde pueden utilizarse para retrieval contextual o para enriquecer findings en la base.

Desde el punto de vista de producto, esto amplía el valor de la base de conocimiento: no solo se guardan textos de findings, sino también artefactos técnicos asociados a ellos.

## Relación con `solguard-backend`

`solguard-backend` usa `solguard-core` directamente durante la ingesta. Cuando el backend recibe una ruta por `/ingest`, invoca `ingest_document`, escribe el payload JSON en disco y luego llama al conector de `solguard-database` para insertarlo en SQLite. Por tanto, `solguard-core` funciona como biblioteca de parsing e ingestión compartida entre la infraestructura documental y el backend operativo.

## Rol estratégico

Dentro del ecosistema Solguard, `solguard-core` es una biblioteca fundacional. No compite con las herramientas deterministas de mapeo, trazado o diff, porque resuelve otra fase del sistema: la estructuración del conocimiento documental. Su valor está en estandarizar cómo se transforman informes reales de auditoría en datos consistentes y reutilizables para búsqueda, análisis y razonamiento posterior.
