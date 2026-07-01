# Analiticas Solguard

Fuente: resultados generados en `C:\Users\Roger G?mez Mart?nez\Documents\Solguard` y ground truth de `ground-truth-working.json` en `solguard-deploy`.

Definiciones usadas: `Vulnerabilidades` es el total scoreable del ground truth tras source coverage; `Findings reportados` es `supported_findings`; `Falsos positivos` son supported findings sin match exact/equivalent contra ground truth; `Duplicados` son supported findings adicionales que matchean una vulnerabilidad ya detectada; `Detectados` son vulnerabilidades unicas del ground truth detectadas con finding supported; `Recall = Detectados / Vulnerabilidades`.

## Resumen

| Grupo | Protocolos | Vulnerabilidades | Tiempo | Findings reportados | Falsos positivos | Duplicados | Detectados | Recall |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Benchmark v1 | 24 | 380 | 05:36:58 | 350 | 96 | 28 | 237 | 62.4% |
| Benchmark v2 | 20 | 20 | 04:32:07 | 181 | 115 | 46 | 20 | 100% |
| Benchmark v3 | 19 | 22 | 05:19:00 | 153 | 116 | 15 | 22 | 100% |
| Labs | 8 | 24 | 01:10:30 | 113 | 38 | 55 | 20 | 83.3% |
| **Benchmarks total** | **63** | **422** | **15:28:05** | **684** | **327** | **89** | **279** | **66.1%** |
| **Total con labs** | **71** | **446** | **16:38:35** | **797** | **365** | **144** | **299** | **67.0%** |

Nota: `Tapioca-DAO` se excluye de los benchmarks porque fallo en descarga: Snapshot download returned HTTP 404.

## Benchmark v1

| Nombre del protocolo | Vulnerabilidades | Tiempo | Findings reportados | Falsos positivos | Duplicados | Detectados | Recall |
|---|---:|---:|---:|---:|---:|---:|---:|
| Compound Finance | 1 | 00:13:16 | 5 | 5 | 0 | 0 | 0% |
| Ondo Finance | 6 | 00:11:34 | 12 | 5 | 1 | 6 | 100% |
| Astaria | 50 | 00:30:13 | 56 | 3 | 5 | 48 | 96% |
| KUMA Protocol | 5 | 00:18:10 | 17 | 14 | 0 | 3 | 60% |
| Asymmetry Finance | 20 | 00:07:01 | 22 | 3 | 0 | 19 | 95% |
| Rubicon | 45 | 00:08:08 | 1 | 1 | 0 | 0 | 0% |
| Maia DAO | 79 | 00:27:30 | 71 | 4 | 0 | 69 | 87.3% |
| Lybra Finance | 31 | 00:04:43 | 0 | 0 | 0 | 0 | 0% |
| Basin / Beanstalk | 14 | 00:05:00 | 9 | 1 | 0 | 8 | 57.1% |
| Shell Protocol | 1 | 00:05:56 | 3 | 1 | 1 | 1 | 100% |
| Centrifuge | 6 | 00:10:58 | 6 | 3 | 0 | 3 | 50% |
| Panoptic | 7 | 00:06:15 | 8 | 0 | 1 | 7 | 100% |
| Reserve Protocol | 27 | 00:16:16 | 40 | 10 | 5 | 25 | 92.6% |
| Nomad | 1 | 00:09:24 | 1 | 1 | 0 | 0 | 0% |
| Ethereum Name Service | 16 | 00:03:04 | 1 | 0 | 0 | 3 | 18.8% |
| Monad | 3 | 00:14:38 | 4 | 4 | 0 | 0 | 0% |
| Recall / IPC | 13 | 00:15:22 | 17 | 0 | 5 | 12 | 92.3% |
| Bitcoin Core | 1 | 00:11:13 | 8 | 8 | 0 | 0 | 0% |
| Optimism Superchain | 16 | 00:27:00 | 3 | 3 | 0 | 0 | 0% |
| Taiko | 19 | 00:20:28 | 17 | 2 | 0 | 17 | 89.5% |
| Biconomy Smart Account | 13 | 00:09:18 | 12 | 5 | 0 | 12 | 92.3% |
| EigenLayer | 4 | 00:33:36 | 32 | 18 | 10 | 4 | 100% |
| Cosmos SDK | 1 | 00:13:18 | 3 | 3 | 0 | 0 | 0% |
| Ethereum Geth | 1 | 00:14:24 | 2 | 2 | 0 | 0 | 0% |
| **Total v1** | **380** | **05:36:58** | **350** | **96** | **28** | **237** | **62.4%** |

## Benchmark v2

| Nombre del protocolo | Vulnerabilidades | Tiempo | Findings reportados | Falsos positivos | Duplicados | Detectados | Recall |
|---|---:|---:|---:|---:|---:|---:|---:|
| Curve Finance Metapool | 1 | 00:08:37 | 1 | 0 | 0 | 1 | 100% |
| MANTRA DEX | 1 | 00:18:38 | 7 | 6 | 0 | 1 | 100% |
| Renzo | 1 | 00:25:52 | 38 | 5 | 32 | 1 | 100% |
| Caviar | 1 | 00:04:47 | 3 | 2 | 0 | 1 | 100% |
| Wenwin | 1 | 00:04:07 | 4 | 3 | 0 | 1 | 100% |
| Size | 1 | 00:13:16 | 16 | 5 | 10 | 1 | 100% |
| Stader Labs | 1 | 00:47:09 | 44 | 43 | 0 | 1 | 100% |
| Papr / Backed | 1 | 00:06:57 | 3 | 1 | 1 | 1 | 100% |
| Good Entry | 1 | 00:09:42 | 5 | 3 | 1 | 1 | 100% |
| DYAD | 1 | 00:13:33 | 11 | 10 | 0 | 1 | 100% |
| Salty.IO | 1 | 00:07:59 | 1 | 0 | 0 | 1 | 100% |
| reNFT | 1 | 00:07:07 | 2 | 1 | 0 | 1 | 100% |
| AI Arena | 1 | 00:09:58 | 3 | 2 | 0 | 1 | 100% |
| LoopFi | 1 | 00:09:48 | 1 | 0 | 0 | 1 | 100% |
| Core Lightning | 1 | 00:15:22 | 4 | 3 | 0 | 1 | 100% |
| Zcash | 1 | 00:16:12 | 9 | 8 | 0 | 1 | 100% |
| Lodestar | 1 | 00:18:06 | 12 | 11 | 0 | 1 | 100% |
| Web3.js | 1 | 00:14:49 | 5 | 2 | 2 | 1 | 100% |
| Nibiru | 1 | 00:10:04 | 5 | 4 | 0 | 1 | 100% |
| Arbitrum BoLD | 1 | 00:09:55 | 7 | 6 | 0 | 1 | 100% |
| **Total v2** | **20** | **04:32:07** | **181** | **115** | **46** | **20** | **100%** |

## Benchmark v3

| Nombre del protocolo | Vulnerabilidades | Tiempo | Findings reportados | Falsos positivos | Duplicados | Detectados | Recall |
|---|---:|---:|---:|---:|---:|---:|---:|
| Wise Lending | 2 | 00:14:58 | 9 | 4 | 3 | 2 | 100% |
| Revert Lend | 1 | 00:23:18 | 24 | 22 | 1 | 1 | 100% |
| Predy | 2 | 00:18:18 | 3 | 1 | 0 | 2 | 100% |
| Wildcat | 1 | 00:22:05 | 11 | 6 | 4 | 1 | 100% |
| Phi | 2 | 00:14:15 | 6 | 4 | 0 | 2 | 100% |
| Ethena Labs | 1 | 00:17:22 | 3 | 2 | 0 | 1 | 100% |
| PoolTogether | 1 | 00:12:51 | 16 | 13 | 2 | 1 | 100% |
| Venus Protocol | 1 | 00:05:43 | 2 | 1 | 0 | 1 | 100% |
| Ajna | 1 | 00:13:41 | 3 | 2 | 0 | 1 | 100% |
| Badger eBTC | 1 | 00:23:09 | 18 | 17 | 0 | 1 | 100% |
| DittoETH | 1 | 00:13:11 | 1 | 0 | 0 | 1 | 100% |
| zkSync Era | 1 | 00:12:26 | 6 | 5 | 0 | 1 | 100% |
| Axelar Network | 1 | 00:14:02 | 2 | 1 | 0 | 1 | 100% |
| Superposition | 1 | 00:13:49 | 6 | 5 | 0 | 1 | 100% |
| Olas | 1 | 00:24:09 | 5 | 4 | 0 | 1 | 100% |
| Vultisig | 1 | 00:07:04 | 4 | 3 | 0 | 1 | 100% |
| Connext | 1 | 00:28:59 | 20 | 16 | 3 | 1 | 100% |
| Party Protocol | 1 | 00:28:39 | 10 | 8 | 1 | 1 | 100% |
| Holograph | 1 | 00:10:50 | 4 | 2 | 1 | 1 | 100% |
| **Total v3** | **22** | **05:19:00** | **153** | **116** | **15** | **22** | **100%** |

## Labs

| Nombre del protocolo | Vulnerabilidades | Tiempo | Findings reportados | Falsos positivos | Duplicados | Detectados | Recall |
|---|---:|---:|---:|---:|---:|---:|---:|
| SolGuard Lab DTL v1 | 2 | 00:05:14 | 5 | 2 | 1 | 2 | 100% |
| SolGuard Lab DTL v2 | 3 | 00:07:16 | 11 | 5 | 3 | 3 | 100% |
| SolGuard Lab DTL v3 | 4 | 00:11:13 | 27 | 13 | 11 | 3 | 75% |
| SolGuard Lab DTL v4 | 4 | 00:17:10 | 35 | 11 | 21 | 3 | 75% |
| SolGuard Lab DeFi v1 | 3 | 00:07:41 | 2 | 1 | 0 | 1 | 33.3% |
| SolGuard Lab DeFi v2 | 3 | 00:08:10 | 12 | 1 | 8 | 3 | 100% |
| SolGuard Lab DeFi v3 | 3 | 00:08:25 | 11 | 0 | 8 | 3 | 100% |
| SolGuard Lab DeFi v4 | 2 | 00:05:17 | 10 | 5 | 3 | 2 | 100% |
| **Total labs** | **24** | **01:10:30** | **113** | **38** | **55** | **20** | **83.3%** |
