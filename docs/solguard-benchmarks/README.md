# SolGuard Benchmarks

`solguard-deploy` contiene las suites versionadas v1-v8. Cada suite es un corpus
local de protocolos conocidos, snapshots definidos y un archivo de ground truth
asociado. Esta carpeta conserva documentacion detallada de los corpus historicos
v1-v3; la ausencia de una pagina dedicada para v4-v8 no elimina esas suites del
runner ni de los contratos de evaluacion actuales.

## Indice

1. [Benchmark 1: 24 protocolos v1](01-benchmark-1.md)
2. [Benchmark 2: 20 protocolos v2](02-benchmark-2.md)
3. [Benchmark 3: 20 protocolos v3](03-benchmark-3.md)

## Rutas actuales

El ground truth versionado vive en:

```text
solguard-deploy/benchmarks/v1/ground-truth-working.json
solguard-deploy/benchmarks/v2/ground-truth-working.json
solguard-deploy/benchmarks/v3/ground-truth-working.json
solguard-deploy/benchmarks/v4/ground-truth-working.json
solguard-deploy/benchmarks/v5/ground-truth-working.json
solguard-deploy/benchmarks/v6/ground-truth-working.json
solguard-deploy/benchmarks/v7/ground-truth-working.json
solguard-deploy/benchmarks/v8/ground-truth-working.json
```

Los resultados de ejecucion se escriben bajo el directorio de proyectos de
SolGuard, por ejemplo:

```text
<SOLGUARD_PROJECTS_DIR>/v1/results.json
<SOLGUARD_PROJECTS_DIR>/v2/results.json
<SOLGUARD_PROJECTS_DIR>/v3/results.json
```

## Resumen del corpus

| Benchmark | Ruta | Protocolos | Expected declarados | Enfoque |
| --- | --- | ---: | ---: | --- |
| 1 | `solguard-deploy/benchmarks/v1` | 24 | 397 | Corpus amplio DeFi/DLT. |
| 2 | `solguard-deploy/benchmarks/v2` | 20 | 20 | Corpus multi-lenguaje de un bug por protocolo. |
| 3 | `solguard-deploy/benchmarks/v3` | 20 | 23 | Corpus DeFi/cross-chain mas reciente. |

## Estado de la frontera de evaluacion E0+M1

Cada runner v1-v8 escribe
`tool-outputs/benchmark/product_priority_ranking.json` despues del analisis del
producto. `solguard-product-priority-ranking.v2` se calcula desde candidatos
canonicos, VALIDATE y diagnosticos de modelo, con
`ranking_basis=product_artifacts_only`. El evaluador recalcula el objeto
canonico completo desde esos artefactos, rechaza cualquier campo cambiado o
extra y devuelve su recomputacion verificada.

Ese snapshot demuestra integridad del orden derivado de artefactos, no una
ejecucion pre-oracle o blind. Scanner y evaluator siguen compartiendo runner,
proceso, workspace y capacidad de leer el oracle; el execution contract actual
tambien conoce el descriptor de ground truth antes del scan. Por eso el snapshot
declara `oracle_capability_separated=false`, `scan_attestation=null` y una
`recall_at_eligibility` negativa.

`solguard-audit-ranking.v3` conserva el orden product-derived y agrega finding
ID, match status y severidad como anotaciones de evaluacion. El agregado usa
`solguard-benchmark-audit-ranking.v3`. Los envelopes actuales son:

- `solguard-real-protocol-results.v3` para los runners v1-v8;
- `solguard-lab-results.v2` para ambos runners de labs;
- `solguard-benchmark-evaluation.v2` para la evaluacion agregada;
- `solguard-benchmark-matches.v2` para matches individuales.

En todos los runners actuales, `recall_at` es `null` y no elegible.
`diagnostic_recall_at` usa `ground_truth_status.product_priority_rank` para
diagnosticar el orden product-derived, pero es solo una metrica de desarrollo:
no demuestra Recall@K ciego, generalizacion ni calidad de release. La separacion
fisica de proceso, archivos y capacidades, seguida de una attestation verificable
del scan, sigue pendiente; E0 permanece abierto.

En tier `release`, `full-run.sh` ejecuta obligatoriamente
`solguard-pre-release-check.v2` despues de cerrar las suites y escribir el
summary agregado. El release no usa `--soft-fail`: un error bloqueante impide
declarar exito. `--soft-fail` solo sirve para informes diagnosticos manuales.

Los manifests bajo `solguard-deploy/benchmarks/baselines/` usan
`solguard-offline-baseline-manifest.v1` para hashear resultados, receipts,
artefactos referenciados y commits declarados. El manifest actual
`legacy-offline-2026-07-15.json` de v1-v8 y 90 labs clasifica todas las
colecciones como `legacy_backend_bound`, declara
`claims.post_migration_parity=not_established` y no esta completo por referencias
missing/mismatch. Es evidencia historica congelada, no una demostracion de
paridad tras la migracion a core. Esa afirmacion exige una nueva ejecucion
core-bound y un manifest que pase el modo estricto.

## Resultado historico de cierre v0.8.0

El cierre benchmark de `v0.8.0` se calcula sobre 63 protocolos scoreables. El
protocolo `Tapioca-DAO` de v3 queda excluido por el fallo conocido de descarga
HTTP 404.

| Grupo | Protocolos scoreables | Vulnerabilidades scoreables | Tiempo | Findings reportados | Falsos positivos | Duplicados | Detectados | Match recall historico |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Benchmark v1 | 24 | 380 | 06:06:34 | 432 | 15 | 49 | 380 | 100% |
| Benchmark v2 | 20 | 20 | 03:23:31 | 40 | 20 | 0 | 20 | 100% |
| Benchmark v3 | 19 | 22 | 04:26:35 | 31 | 7 | 2 | 22 | 100% |
| **Total benchmarks** | **63** | **422** | **13:56:40** | **503** | **42** | **51** | **422** | **100%** |

La ultima columna es recall de matching sobre un corpus conocido; no es
`recall_at`, Recall@K ciego ni evidencia de generalizacion. La prueba de cierre
usa el full scan congelado del 04/07/2026 mas una
revalidacion targeted real del unico miss benchmark (`Lybra Finance` H-03). No
incluye labs en el criterio de cierre.

## Evaluacion offline historica

Para iterar sin repetir 15-19 horas de escaneo completo, `solguard-deploy`
incluye un evaluador offline:

```text
solguard-deploy/benchmarks/offline-gates.mjs
```

El evaluador historico lee outputs ya generados, `ground-truth-working.json` y
`validation_results.json`, y simula gates de publicacion o cambios de soporte.
Sirve para medir rapidamente:

- cuantos falsos positivos caen o suben;
- cuantos bugs reales se pierden o recuperan;
- que protocolos cambian;
- si el recall benchmark sigue cerrado.

El cierre `v0.8.0` uso el gate benchmark-only
`recall-rescue-role-check-projection`, despues confirmado con una revalidacion
real targeted de Lybra Finance. Este resultado historico no sustituye el futuro
scan receipt pre-oracle con attestation, el baseline manifest ni el pre-release
check actuales.
