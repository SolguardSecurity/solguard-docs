# 01. Benchmark 1: 24 Protocolos v1

Ruta:

```text
solguard-deploy/scripts/24-protocols-v1
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

## Archivos principales

- `protocols.json`: catalogo de protocolos, commits, snapshots y expected bugs.
- `protocols.md`: vista legible del corpus.
- `ground-truth-working.json`: bugs esperados y criterios de identificacion.
