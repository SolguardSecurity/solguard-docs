# Estado actual del plan de mejora

> **Vista humana no autoritativa.** Este documento refleja exclusivamente el
> corte del acceptance ledger externo en la revisión **453**. Marcar una casilla
> aquí no acepta ningún trabajo ni modifica el ledger. La autoridad sigue siendo
> el snapshot externo firmado y sus receipts.

## Identidad del corte

| Campo | Valor |
|---|---|
| Programa | `solguard-detection-maturity-2026-07-25` |
| Versión | `solguard-detection-maturity-2026-07-25.4` |
| Revisión del ledger | `453` |
| Modo de assurance | `development` |
| Nivel de assurance | `single-custodian` |
| SHA-256 del snapshot | `97a723b9ebb8f77e18b29f683060b2806790443254a351904888f29e5fe53b9c` |
| SHA-256 de la proyección checklist | `36e87c50b3bb2cd0dd26683c52e1a5670201125c6a7fba3bd6da7d30e9042fae` |
| Fecha de revisión humana | `2026-08-15` |

Snapshot autoritativo usado:

```text
C:\Users\Roger Gómez Martínez\.solguard\acceptance-ledger\evidence-store-20260801T2323Z\ledger\snapshots\000000000453-97a723b9ebb8f77e18b29f683060b2806790443254a351904888f29e5fe53b9c.json
```

Proyección externa correspondiente:

```text
C:\Users\Roger Gómez Martínez\.solguard\acceptance-ledger\evidence-store-20260801T2323Z\ledger\checklists\000000000453-36e87c50b3bb2cd0dd26683c52e1a5670201125c6a7fba3bd6da7d30e9042fae.md
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
- [X] **W4 — World model e hipótesis.** `68/68` contribuciones aceptadas. Las
  puertas primarias `MODEL-401` a `MODEL-407`, los cuatro componentes primarios
  de `MODEL-408` y `MODEL-409` a `MODEL-411` están aceptadas; el derivado
  `MODEL-408` está satisfecho.
- [X] **P5 — Prueba económica iterativa.** `50/50` contribuciones y las
  `15/15` puertas primarias del tren `PROOF-5*` están aceptadas. `C4-012` quedó
  aceptada en la revisión 430 y `PROOF-506` cerró formalmente P5 en la 431.
- [ ] **D6 — Decisión y producto.** Implementación completa donde las
  dependencias lo permiten: `14/16` contribuciones aceptadas. `C4-022` y
  `C4-022A` permanecen pendientes. Están aceptadas `DECIDE-601`, `DECIDE-602`,
  `DECIDE-603-VALIDATE`, `DECIDE-603-CORE` y `DECIDE-604` a `DECIDE-608`;
  `DECIDE-606` quedó aceptada en la revisión 453. El cierre formal sigue
  bloqueado por `MEASURE-901 → C4-022 → DECIDE-603-DEPLOY → C4-022A →
  DECIDE-603-E2E → DECIDE-603`. Por eso la fase conserva `[ ]`.
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
| Contribuciones | 369 | 1103 | 734 |
| Puertas primarias | 92 | 440 | 348 |
| Puertas derivadas | 6 | 128 | 122 |
| **Total** | **467** | **1671** | **1204** |

No hay elementos actualmente reabiertos ni cierres operativos `non-pass` en la
revisión 453.

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
