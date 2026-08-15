# Findings y revisiones canónicos v1

## Estado y autoridad

`solguard-core` publica los contratos
`solguard-finding-envelope.v1` y `solguard-review-envelope.v1`. El writer de
runtime y su cadena de bundles quedaron autorizados por `DECIDE-604`, aceptado
en la revisión 445 del ledger de desarrollo con evidence root
`62ce464dc9125261d122310d97120f1cfffd5a2dd34671f401cd29526dbda3e3` y
verifier root
`c6a5b82fdfed619dd75c3e1fb9acdec3aa9fa8e6b325edf433701b470afe6111`.

Esta página sigue siendo una vista Docs/UI de solo lectura: no reautoriza el
writer, no acepta contribuciones y no eleva el assurance
`development / single-custodian` a custodia independiente. La frontera de
ataques que protege esta transición se fija en el
[Threat model del finding v1](./finding-threat-model-v1.md); `DECIDE-605`
permanece pendiente en la revisión fuente 446. Ninguna de estas publicaciones
demuestra recall, precisión, severidad, rendimiento o generalización.

## Colecciones y roles

| Rol del consumidor              | Ruta canónica futura     | Contrato de cada miembro       | Semántica de presentación                                                    |
| ------------------------------- | ------------------------ | ------------------------------ | ---------------------------------------------------------------------------- |
| `finding_envelopes_all`         | `finding_envelopes.json` | `solguard-finding-envelope.v1` | Conserva todo FILTER Pass, incluido un Pass inelegible o duplicado.          |
| `published_findings_projection` | `findings.json`          | `solguard-finding-envelope.v1` | Sólo `publication_eligibility=eligible` con rol `unique` o `representative`. |
| `product_review_envelopes`      | `review_queue.json`      | `solguard-review-envelope.v1`  | Conserva FILTER `review` o `reject`; nunca suma findings.                     |

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
