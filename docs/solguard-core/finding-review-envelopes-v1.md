# Findings y revisiones canónicos v1

## Estado y autoridad

`solguard-core` publica en C1-009 los contratos de lectura
`solguard-finding-envelope.v1` y `solguard-review-envelope.v1`. La publicación
prepara schemas y goldens; no activa el writer de producto. `DECIDE-604` sigue
siendo la única autoridad futura para escribir estos artefactos en runtime.

La vista Docs/UI C1-009D fija exactamente:

- Core `1ad350d8d3f54c227ca8f81b9cb42c4bf6a0494b`, con evidence root
  `sha256:319c7e246aefbf41934bde419021f8bd38566c4add32d3032cb52e5f26a8a7c7`;
- Deploy `cb223071c0dab18190041129490702b8282f27bb`, con evidence root
  `sha256:def7ed84d98fca40317a79193e4b11e5b02db91fd900c1a3959c7a71744c792a`.

Ambas referencias son implementaciones draft pendientes de aceptación
independiente. No aceptan C1-009, C1-009C, C1-009D ni TRUTH-105 y no demuestran
recall, precisión, severidad, rendimiento o generalización.

## Colecciones y roles

| Rol del consumidor              | Ruta canónica futura     | Contrato de cada miembro       | Semántica de presentación                                                    |
| ------------------------------- | ------------------------ | ------------------------------ | ---------------------------------------------------------------------------- |
| `finding_envelopes_all`         | `finding_envelopes.json` | `solguard-finding-envelope.v1` | Conserva todo FILTER Pass, incluido un Pass inelegible o duplicado.          |
| `published_findings_projection` | `findings.json`          | `solguard-finding-envelope.v1` | Sólo `publication_eligibility=eligible` con rol `unique` o `representative`. |
| `product_review_envelopes`      | `review_queue.json`      | `solguard-review-envelope.v1`  | Conserva FILTER `review                                                      | reject`; nunca suma findings. |

Cada ruta es un array tipado por su rol, incluido `[]`. Un array vacío no puede
inferirse como otra colección. Los alias `FindingEnvelope.v1`,
`finding-envelope.v1`, `ReviewEnvelope.v1` y `review-envelope.v1` no son IDs de
schema válidos.

Durante la transición, `tool-outputs/validate/validation_results.json` y
`tool-outputs/candidates/review_projection.json` siguen siendo legibles como
diagnóstico legacy. No se convierten, reparan ni reetiquetan como envelopes
canónicos. Si una ruta canónica existe pero es inválida, el consumidor falla;
no cae al legacy.

## Proyección Docs/UI

La vista de presentación deriva únicamente campos cerrados del envelope
validado:

- finding: identidad, candidato, claim y materialidad declarada, scope, ruta,
  invariante, estado del proof, coverage, elegibilidad, rol de presentación y
  referencias a verdict/admission/source/runtime;
- review: identidad, candidato, verdict técnico, estado y clase de admisión,
  checks y contexto pendientes, deuda, siguiente acción y referencias
  inmutables.

La UI no inventa `confidence`, severidad de programa o `duplicate_of`. Tampoco
reconstruye un envelope ni convierte una review en finding. El conteo de
findings publicados se deriva sólo de elegibilidad y rol; el digest SHA-256 de
los bytes fuente acompaña la vista.

El consumidor rechaza JSON no estricto, UTF-8 inválido, schemas o campos
desconocidos, mezcla de roles, IDs duplicados, una colección pública con un
miembro inelegible, hardlinks, entradas no regulares, cambios concurrentes y
bundles por encima de 32 MiB. Ese límite es de la vista documental; no cambia el
límite de 512 MiB del lector Deploy.

## Uso de la vista de sólo lectura

```powershell
node changelogs/25-26-jul-2026/tasks/readers/findings-docs-ui-projection.mjs `
  --input C:\evidence\project\findings.json `
  --role published_findings_projection `
  --format markdown
```

La salida se escribe únicamente en stdout. No existe `--out`, modo writer,
apply, reparación ni cambio del ledger. Hasta activar y aceptar la autoridad
runtime posterior, la ausencia de las tres rutas canónicas no es una capacidad
medida ni un fallo que esta documentación pueda reinterpretar.
