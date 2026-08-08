# Estado actual del plan de mejora

> **Vista humana no autoritativa.** Este documento refleja exclusivamente el
> corte del acceptance ledger externo en la revisión **327**. Marcar una casilla
> aquí no acepta ningún trabajo ni modifica el ledger. La autoridad sigue siendo
> el snapshot externo firmado y sus receipts.

## Identidad del corte

| Campo | Valor |
|---|---|
| Programa | `solguard-detection-maturity-2026-07-25` |
| Versión | `solguard-detection-maturity-2026-07-25.4` |
| Revisión del ledger | `327` |
| Modo de assurance | `development` |
| Nivel de assurance | `single-custodian` |
| SHA-256 del snapshot | `f0829ca7ea1b8691094ef951802525897cbece3eee39e1fc2062068de09bc45e` |
| SHA-256 de la proyección checklist | `d1dbc4dd80e1f8d3d42674456dc4cde5bb45297847d323121af125fe5e7c04a7` |
| Fecha de revisión humana | `2026-08-08` |

Snapshot autoritativo usado:

```text
C:\Users\Roger Gómez Martínez\.solguard\acceptance-ledger\evidence-store-20260801T2323Z\ledger\snapshots\000000000327-f0829ca7ea1b8691094ef951802525897cbece3eee39e1fc2062068de09bc45e.json
```

Proyección externa correspondiente:

```text
C:\Users\Roger Gómez Martínez\.solguard\acceptance-ledger\evidence-store-20260801T2323Z\ledger\checklists\000000000327-d1dbc4dd80e1f8d3d42674456dc4cde5bb45297847d323121af125fe5e7c04a7.md
```

## Estado por fase

Una fase sólo aparece con `[X]` cuando están satisfechas en esta revisión todas
sus contribuciones y sus puertas formales de cierre. Una implementación o PR
fusionada, por sí sola, no basta.

- [ ] **G0 — Baseline, vocabulario y gobierno.** Incompleta: `32/34`
  contribuciones aceptadas. Siguen pendientes `C0-001A`, `C0-001B` y la puerta
  `BASELINE-009`.
- [ ] **T1 — Reparar verdad y medición.** Sus `41/41` contribuciones están
  aceptadas, pero `TRUTH-109` y `TRUTH-110` siguen pendientes. Por eso T1 no
  está cerrada formalmente.
- [X] **R2 — Runtime inmutable por ejecución.** `93/93` contribuciones y las
  puertas formales de R2 están aceptadas.
- [X] **S3 — Substrato semántico y bindings.** `59/59` contribuciones del tren
  C3-A y `IR-301` a `IR-308` están aceptadas.
- [ ] **W4 — World model e hipótesis.** En curso: `53/68` contribuciones
  aceptadas. Están aceptadas las puertas `MODEL-401`, `MODEL-402`, `MODEL-403`,
  `MODEL-405`, `MODEL-408-DISCOVER`, `MODEL-408-TRACE` y `MODEL-410`. Siguen
  pendientes `C3-013F`, `C3-013G`, `C3-013H`, `C3-013I`, `C3-015E`,
  `C3-015F`, `C3-015G`, `C3-015H`, `C3-016C`, `C3-017`,
  `C3-017A`, `C3-020`, `C3-021`,
  `C3-022` y `C3-023`. Las demás puertas de W4, incluida `MODEL-406`, y el
  derivado `MODEL-408` permanecen pendientes.
- [ ] **P5 — Prueba económica iterativa.** Pendiente.
- [ ] **D6 — Decisión y producto.** Pendiente.
- [ ] **L7.** Pendiente.
- [ ] **O8 — Plataforma y operación.** Pendiente.
- [ ] **K9.** Pendiente.
- [ ] **B10.** Pendiente.
- [ ] **R11.** Pendiente.

## Resumen global del ledger

Estos contadores abarcan todo el programa; no representan un porcentaje lineal
de fases completadas.

| Tipo de elemento | Aceptados o satisfechos | Total | Pendientes o no satisfechos |
|---|---:|---:|---:|
| Contribuciones | 278 | 1103 | 825 |
| Puertas primarias | 57 | 440 | 383 |
| Puertas derivadas | 3 | 128 | 125 |
| **Total** | **338** | **1671** | **1333** |

No hay elementos reabiertos ni cierres operativos `non-pass` en la revisión
327.

## Por qué la checklist maestra conserva `[ ]`

La [checklist maestra](07_CHECKLIST_MAESTRA.md) incluida en el repositorio es la
proyección **seed rev 0**, congelada como parte de la especificación. No es la
vista viva del progreso y no debe marcarse a mano.

En esa checklist:

- `contribs=N` indica cuántas contribuciones exige una puerta; no expresa su
  estado de cierre;
- `terminalizable=true|false` describe si el nodo admite una transición terminal
  no satisfactoria bajo el contrato; tampoco significa completado;
- las casillas de progreso válidas se derivan del ledger externo, no de una
  edición de Markdown.

## Regla de actualización

Este archivo debe reemplazarse de forma atómica al consultar una revisión más
reciente. La nueva versión debe actualizar conjuntamente la revisión, los dos
SHA-256, los contadores, los bloqueos y las casillas. Nunca se debe convertir
este resumen en evidencia de aceptación.

Referencias de especificación:

- [Programa estructural](02_PROGRAMA_ESTRUCTURAL.md)
- [Checklist maestra seed](07_CHECKLIST_MAESTRA.md)
- [Contratos del ledger y dependencias](09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md)
