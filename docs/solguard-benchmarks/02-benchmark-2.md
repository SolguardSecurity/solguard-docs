# 02. Benchmark 2: 20 Protocolos v2

Ruta:

```text
solguard-deploy/benchmarks/v2
```

Este benchmark tiene 20 protocolos y declara un bug esperado por protocolo. Es
un corpus mas pequeno que el benchmark 1, pensado para probar familias concretas
y escenarios multi-lenguaje.

## Corpus

| Campo | Valor |
| --- | ---: |
| Protocolos | 20 |
| Expected bugs declarados | 20 |
| Vyper | 1 |
| Rust | 1 |
| Solidity | 13 |
| C | 1 |
| C++ | 1 |
| TypeScript | 1 |
| JavaScript | 1 |
| Go + Solidity | 1 |

Incluye Curve Finance Metapool, MANTRA DEX, Renzo, Caviar, Wenwin, Size, Stader
Labs, DYAD, Salty.IO, reNFT, Core Lightning, Zcash, Lodestar, Web3.js, Nibiru y
Arbitrum BoLD.

## Resultado v0.8.0

| Metrica | Valor |
| --- | ---: |
| Protocolos scoreables | 20 |
| Vulnerabilidades scoreables | 20 |
| Tiempo | 03:23:31 |
| Findings reportados | 40 |
| Falsos positivos | 20 |
| Duplicados | 0 |
| Detectados | 20 |
| Recall | 100% |

El benchmark v2 queda cerrado con recall completo. El coste principal de
precision en este grupo sigue concentrado en findings adicionales de protocolos
de un solo bug, especialmente Stader Labs y Good Entry.

## Archivos principales

- `ground-truth-working.json`: bugs esperados y criterios de identificacion.
- `<SOLGUARD_PROJECTS_DIR>/v2/results.json`: resultados agregados de ejecucion.
- `<SOLGUARD_PROJECTS_DIR>/v2/<project>/tool-outputs/`: artefactos por protocolo.
