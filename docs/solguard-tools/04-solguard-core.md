# 04. Los dos componentes llamados Core

El workspace contiene dos componentes Rust distintos. La palabra `core` sola es
ambigua y no debe usarse para asignar responsabilidades.

## `solguard-pipeline-core`

Es el paquete del repositorio hermano `solguard-core`. Expone la libreria
`solguard_core` y el binario `solguard-core`. Posee el pipeline de auditoria,
los servicios de analisis, la ejecucion de herramientas, candidates, journals,
FILTER, EXPLOIT, impacto y reportes.

La descripcion completa esta en
[SolGuard Pipeline Core](../solguard-core/README.md).

## `solguard-database::solguard-core`

Es la crate historica ubicada en
`solguard-database/crates/solguard-core`. Se dedica exclusivamente a convertir
PDF, Markdown y texto de auditorias en payloads documentales para la base de
conocimiento. No ejecuta auditorias ni herramientas del pipeline.

Su API principal conserva el identificador Rust historico:

```rust
use solguard_core::{ingest_document, IngestConfig};

let payload = ingest_document(path, &IngestConfig::default())?;
```

Esa coincidencia de identificador no significa que las crates sean la misma.
Cuando ambas dependencias aparezcan en un manifest, debe usarse un alias Cargo
explicito para la crate documental.

## Regla editorial

- Use `solguard-pipeline-core` o "pipeline core" para el motor de auditoria.
- Use `solguard-database::solguard-core` o "document-ingestion core" para la
  crate de ingesta.
- Reserve `solguard-core` como nombre del repositorio y del binario del motor,
  nunca como descripcion no calificada de la crate documental.
