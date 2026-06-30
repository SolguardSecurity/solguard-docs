# 02. Benchmark 2: 20 Protocolos v2

Ruta:

```text
solguard-deploy/scripts/20-protocols-2
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

## Archivos principales

- `protocols.json`: catalogo de protocolos, commits, snapshots y expected bugs.
- `protocols.md`: vista legible del corpus.
- `ground-truth-working.json`: bugs esperados y criterios de identificacion.
