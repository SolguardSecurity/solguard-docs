# 01. Benchmark 1: 24 Protocolos v1

Ruta:

```text
solguard-deploy/benchmarks/v1
```

Este es el benchmark amplio inicial. Mezcla protocolos DeFi y DLT con muchos
casos Solidity y algunos casos fuera de Solidity.

## Corpus

| Campo | Valor |
| --- | ---: |
| Protocolos | 24 |
| Expected bugs declarados | 397 |
| Solidity | 18 |
| Solidity + Node/TypeScript | 1 |
| Rust + C++ | 1 |
| Rust + Solidity | 1 |
| C++ | 1 |
| Go | 2 |

Incluye, entre otros, Compound Finance, Ondo Finance, Astaria, Rubicon, Maia
DAO, Lybra Finance, Reserve Protocol, ENS, Optimism Superchain, Taiko,
EigenLayer, Cosmos SDK y Ethereum Geth.

## Resultado v0.8.0

| Metrica | Valor |
| --- | ---: |
| Protocolos scoreables | 24 |
| Vulnerabilidades scoreables | 380 |
| Tiempo | 06:06:34 |
| Findings reportados | 432 |
| Falsos positivos | 15 |
| Duplicados | 49 |
| Detectados | 380 |
| Recall | 100% |

La ejecucion completa congelada habia dejado v1 en 379/380. El unico miss era
`Lybra Finance` H-03. En el cierre de `v0.8.0`, la regla general de
`role-check return value` se revalido targeted sobre Lybra y el candidato paso a
`supported_finding`, dejando el benchmark v1 en 380/380.

## Archivos principales

- `ground-truth-working.json`: bugs esperados y criterios de identificacion.
- `<SOLGUARD_PROJECTS_DIR>/v1/results.json`: resultados agregados de ejecucion.
- `<SOLGUARD_PROJECTS_DIR>/v1/<project>/tool-outputs/`: artefactos por protocolo.
