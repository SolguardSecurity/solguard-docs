# 03. Benchmark 3: 20 Protocolos v3

Ruta:

```text
solguard-deploy/benchmarks/v3
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

## Resultado v0.8.0

| Metrica | Valor |
| --- | ---: |
| Protocolos configurados | 20 |
| Protocolos scoreables | 19 |
| Vulnerabilidades scoreables | 22 |
| Tiempo | 04:26:35 |
| Findings reportados | 31 |
| Falsos positivos | 7 |
| Duplicados | 2 |
| Detectados | 22 |
| Recall | 100% |

`Tapioca-DAO` queda excluido del conteo scoreable de `v0.8.0` porque el snapshot
fallo al descargarse con HTTP 404. El cierre benchmark se calcula sobre los 19
protocolos de v3 que si tienen codigo disponible.

## Archivos principales

- `ground-truth-working.json`: bugs esperados y criterios de identificacion.
- `<SOLGUARD_PROJECTS_DIR>/v3/results.json`: resultados agregados de ejecucion.
- `<SOLGUARD_PROJECTS_DIR>/v3/<project>/tool-outputs/`: artefactos por protocolo.
