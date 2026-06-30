# 04. SolGuard Core

`solguard-core` es una crate Rust dentro de `solguard-database`. No es una CLI de
analisis de protocolos. Es la biblioteca que transforma informes de auditoria en
payloads estructurados para la base de conocimiento.

## API publica

La API principal es:

```rust
use solguard_core::{ingest_document, IngestConfig};

let payload = ingest_document(path, &IngestConfig::default())?;
```

`IngestConfig` permite sobreescribir metadata:

- `title`
- `protocol_name`
- `ecosystem`
- `auditor`
- `report_type`
- `published_date`

## Pipeline

`ingest_document` ejecuta:

1. Carga del documento.
2. Resolucion de fuente y hash.
3. Normalizacion a Markdown.
4. Deteccion de perfil documental.
5. Extraccion de metadata del reporte.
6. Seleccion de estrategia de findings.
7. Extraccion de findings candidatos.
8. Extraccion de snippets de codigo por finding.
9. Chunking del documento.
10. Construccion de `IngestPayload`.

## Contrato de payload

Version actual:

```text
schema_version: 2
```

Estructura:

- `source`: tipo, titulo, URL, path local, sha256 y metadata.
- `report`: titulo, protocolo, ecosistema, auditor, fechas, raw text,
  markdown normalizado y metadata.
- `findings`: findings estructurados.
- `chunks`: particiones para indexacion/retrieval.

## Findings

Cada finding puede incluir:

- fingerprint;
- titulo;
- severidad;
- confidence;
- taxonomia;
- contratos y funciones afectadas;
- invariant roto;
- root cause;
- attack steps;
- impacto;
- exploitability;
- preconditions;
- primitive;
- impact escalation;
- severidad/impacto aceptado;
- tipo de PoC;
- codigo vulnerable y fixed;
- commits vulnerable/fixed;
- mitigation;
- triage result;
- recommendation;
- snippets de codigo.

## Perfil documental

`document_profile` detecta familias y estrategias. Estrategias actuales:

- `SeverityIdHeadings`
- `NumericSectionHeadings`
- `ContestIssueHeadings`
- `SingleFindingMarkdown`
- `GenericHeadings`

La seleccion de estrategia evita tratar cualquier heading numerico como finding
si el formato del informe no lo justifica.

## PDFs

La normalizacion de PDFs conserva marcadores de pagina
`[[solguard-pdf-page:N]]`, repara mojibake comun, recompone prosa partida y
mantiene metadata de paginas en chunks/findings cuando aplica.

## Relacion con backend/database

`solguard-backend` usa esta crate en `/ingest`. Despues guarda payloads y llama
al conector de `solguard-database` para insertar en SQLite.

## Limites

- No decide si un finding historico aplica al codigo actual.
- No ejecuta auditorias.
- No habla con Ollama.
- Puede marcar extracciones como `needs_review` cuando la estructura no es
  suficientemente fiable.
