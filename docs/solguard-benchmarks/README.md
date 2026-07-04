# SolGuard Benchmarks

Esta carpeta documenta los tres benchmarks reales que existen en
`solguard-deploy`. Cada benchmark es un corpus local de protocolos vulnerables
conocidos, snapshots definidos y un archivo de ground truth asociado.

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

## Resultado de cierre v0.8.0

El cierre benchmark de `v0.8.0` se calcula sobre 63 protocolos scoreables. El
protocolo `Tapioca-DAO` de v3 queda excluido por el fallo conocido de descarga
HTTP 404.

| Grupo | Protocolos scoreables | Vulnerabilidades scoreables | Tiempo | Findings reportados | Falsos positivos | Duplicados | Detectados | Recall |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Benchmark v1 | 24 | 380 | 06:06:34 | 432 | 15 | 49 | 380 | 100% |
| Benchmark v2 | 20 | 20 | 03:23:31 | 40 | 20 | 0 | 20 | 100% |
| Benchmark v3 | 19 | 22 | 04:26:35 | 31 | 7 | 2 | 22 | 100% |
| **Total benchmarks** | **63** | **422** | **13:56:40** | **503** | **42** | **51** | **422** | **100%** |

La prueba de cierre usa el full scan congelado del 04/07/2026 mas una
revalidacion targeted real del unico miss benchmark (`Lybra Finance` H-03). No
incluye labs en el criterio de cierre.

## Evaluacion offline

Para iterar sin repetir 15-19 horas de escaneo completo, `solguard-deploy`
incluye un evaluador offline:

```text
solguard-deploy/benchmarks/offline-gates.mjs
```

El evaluador lee outputs ya generados, `ground-truth-working.json` y
`validation_results.json`, y simula gates de publicacion o cambios de soporte.
Sirve para medir rapidamente:

- cuantos falsos positivos caen o suben;
- cuantos bugs reales se pierden o recuperan;
- que protocolos cambian;
- si el recall benchmark sigue cerrado.

El cierre `v0.8.0` uso el gate benchmark-only
`recall-rescue-role-check-projection`, despues confirmado con una revalidacion
real targeted de Lybra Finance.
