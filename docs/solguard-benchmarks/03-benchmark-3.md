# 03. Benchmark 3: 20 Protocolos v3

Ruta:

```text
solguard-deploy/scripts/20-protocols-3
```

Este benchmark contiene 20 protocolos, principalmente DeFi Solidity, con algunos
casos cross-chain/L2 y proyectos con mas de un bug esperado.

## Corpus

| Campo | Valor |
| --- | ---: |
| Protocolos | 20 |
| Expected bugs declarados | 23 |
| Solidity | 16 |
| Rust + Solidity | 2 |
| Solidity + TypeScript | 2 |

Incluye Wise Lending, Revert Lend, Predy, Wildcat, Phi, Ethena Labs, Tapioca
DAO, PoolTogether, Venus Protocol, Ajna, Badger eBTC, zkSync Era, Axelar,
Superposition, Vultisig, Connext, Party Protocol y Holograph.

## Archivos principales

- `protocols.json`: catalogo de protocolos, commits, snapshots y expected bugs.
- `protocols.md`: vista legible del corpus.
- `ground-truth-working.json`: bugs esperados y criterios de identificacion.
