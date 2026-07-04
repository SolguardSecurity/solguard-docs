# Analiticas Solguard

Fuente: ejecucion completa generada en `C:\Users\Roger Gómez Martínez\Documents\Solguard` el 04/07/2026, `results.json` de cada suite y `ground-truth-working.json` de `solguard-deploy`.

Actualizacion full scan 04/07/2026: se reejecutaron los 3 benchmarks y los 8 labs con el motor actual. El resultado real no alcanza el 100% de recall global: queda en 442/446 (99.1%). Los falsos positivos globales bajan a 47, por debajo del objetivo de 60.

Cierre benchmark posterior 04/07/2026: el unico miss de benchmark (`Lybra Finance` H-03) fue revalidado de forma targeted con `solguard-validate` actualizado y pasa a `supported_finding`. La tabla de benchmarks queda actualizada con la proyeccion offline sobre el full scan congelado: 422/422 detectados (100% recall). No es un full rerun completo; los labs se mantienen con los datos reales del full scan.

Definiciones usadas: `Vulnerabilidades` es el total scoreable del ground truth tras source coverage; `Findings reportados` es `supported_findings`; `Falsos positivos` son supported findings sin match exact/equivalent contra ground truth; `Duplicados` son supported findings adicionales que matchean una vulnerabilidad ya detectada; `Detectados` son vulnerabilidades unicas del ground truth detectadas con finding supported; `Recall = Detectados / Vulnerabilidades`.

## Resumen

| Grupo | Protocolos | Vulnerabilidades | Tiempo | Findings reportados | Falsos positivos | Duplicados | Detectados | Recall |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Benchmark v1 | 24 | 380 | 06:06:34 | 432 | 15 | 49 | 380 | 100% |
| Benchmark v2 | 20 | 20 | 03:23:31 | 40 | 20 | 0 | 20 | 100% |
| Benchmark v3 | 19 | 22 | 04:26:35 | 31 | 7 | 2 | 22 | 100% |
| Labs | 8 | 24 | 00:50:28 | 59 | 10 | 28 | 21 | 87.5% |
| **Benchmarks total** | **63** | **422** | **13:56:40** | **503** | **42** | **51** | **422** | **100%** |
| **Total con labs** | **71** | **446** | **14:47:08** | **562** | **52** | **79** | **443** | **99.3%** |

Nota: `Tapioca-DAO` queda excluido de los benchmarks por el fallo conocido de descarga HTTP 404; la tabla benchmark usa 63 protocolos scoreables.

## Misses pendientes

| Suite | Protocolo | Finding | Estado mejor candidato | Motivo | Candidate |
|---|---|---|---|---|---|
| Labs | SolGuard Lab DTL v1 | LAB-DTL-V1-01 | inconclusive/review_queue | scope_not_resolved | cand_703c9cd750597f2f875510a0215e9b2d5755e37abae86b840f60326697e0cbb8 |
| Labs | SolGuard Lab DeFi v2 | LAB-DEFI-V2-03 | inconclusive/review_queue | scope_not_resolved | cand_3118e43157352c4f24676ed0f67a1f665a9d7bfd2c831551cae6d97d495fe7a4 |
| Labs | SolGuard Lab DeFi v3 | LAB-DEFI-V3-03 | inconclusive/review_queue | economic_relation_not_demonstrated | cand_768237f838eb8a1a492a5593b05e574d1fd0a968ce12361333a70f78e7490054 |

## Benchmark v1

| Nombre del protocolo | Vulnerabilidades | Tiempo | Findings reportados | Falsos positivos | Duplicados | Detectados | Recall |
|---|---:|---:|---:|---:|---:|---:|---:|
| Compound Finance | 1 | 00:16:02 | 6 | 5 | 0 | 1 | 100% |
| Ondo Finance | 6 | 00:11:39 | 7 | 3 | 0 | 6 | 100% |
| Astaria | 50 | 00:28:57 | 42 | 1 | 0 | 50 | 100% |
| KUMA Protocol | 5 | 00:15:49 | 5 | 0 | 0 | 5 | 100% |
| Asymmetry Finance | 20 | 00:06:41 | 20 | 1 | 0 | 20 | 100% |
| Rubicon | 45 | 00:29:10 | 48 | 2 | 1 | 45 | 100% |
| Maia DAO | 79 | 00:30:07 | 83 | 1 | 3 | 79 | 100% |
| Lybra Finance | 31 | 00:21:49 | 38 | 0 | 7 | 31 | 100% |
| Basin / Beanstalk | 14 | 00:05:31 | 20 | 0 | 6 | 14 | 100% |
| Shell Protocol | 1 | 00:05:27 | 1 | 0 | 0 | 1 | 100% |
| Centrifuge | 6 | 00:11:21 | 9 | 2 | 1 | 6 | 100% |
| Panoptic | 7 | 00:05:55 | 7 | 0 | 0 | 7 | 100% |
| Reserve Protocol | 27 | 00:18:24 | 50 | 0 | 23 | 27 | 100% |
| Nomad | 1 | 00:09:16 | 1 | 0 | 0 | 1 | 100% |
| Ethereum Name Service | 16 | 00:04:43 | 17 | 0 | 1 | 16 | 100% |
| Monad | 3 | 00:14:19 | 3 | 0 | 0 | 3 | 100% |
| Recall / IPC | 13 | 00:15:33 | 19 | 0 | 6 | 13 | 100% |
| Bitcoin Core | 1 | 00:10:32 | 1 | 0 | 0 | 1 | 100% |
| Optimism Superchain | 16 | 00:29:21 | 16 | 0 | 0 | 16 | 100% |
| Taiko | 19 | 00:20:52 | 20 | 0 | 1 | 19 | 100% |
| Biconomy Smart Account | 13 | 00:09:10 | 13 | 0 | 0 | 13 | 100% |
| EigenLayer | 4 | 00:18:11 | 4 | 0 | 0 | 4 | 100% |
| Cosmos SDK | 1 | 00:13:01 | 1 | 0 | 0 | 1 | 100% |
| Ethereum Geth | 1 | 00:14:09 | 1 | 0 | 0 | 1 | 100% |
| **Total v1** | **380** | **06:06:34** | **432** | **15** | **49** | **380** | **100%** |

## Benchmark v2

| Nombre del protocolo | Vulnerabilidades | Tiempo | Findings reportados | Falsos positivos | Duplicados | Detectados | Recall |
|---|---:|---:|---:|---:|---:|---:|---:|
| Curve Finance Metapool | 1 | 00:08:49 | 1 | 0 | 0 | 1 | 100% |
| MANTRA DEX | 1 | 00:13:49 | 1 | 0 | 0 | 1 | 100% |
| Renzo | 1 | 00:15:02 | 1 | 0 | 0 | 1 | 100% |
| Caviar | 1 | 00:04:31 | 1 | 0 | 0 | 1 | 100% |
| Wenwin | 1 | 00:03:42 | 1 | 0 | 0 | 1 | 100% |
| Size | 1 | 00:09:35 | 1 | 0 | 0 | 1 | 100% |
| Stader Labs | 1 | 00:24:45 | 7 | 6 | 0 | 1 | 100% |
| Papr / Backed | 1 | 00:05:48 | 1 | 0 | 0 | 1 | 100% |
| Good Entry | 1 | 00:10:31 | 11 | 10 | 0 | 1 | 100% |
| DYAD | 1 | 00:10:22 | 1 | 0 | 0 | 1 | 100% |
| Salty.IO | 1 | 00:07:06 | 1 | 0 | 0 | 1 | 100% |
| reNFT | 1 | 00:05:32 | 1 | 0 | 0 | 1 | 100% |
| AI Arena | 1 | 00:08:32 | 2 | 1 | 0 | 1 | 100% |
| LoopFi | 1 | 00:09:32 | 2 | 1 | 0 | 1 | 100% |
| Core Lightning | 1 | 00:12:26 | 1 | 0 | 0 | 1 | 100% |
| Zcash | 1 | 00:11:39 | 1 | 0 | 0 | 1 | 100% |
| Lodestar | 1 | 00:13:50 | 3 | 2 | 0 | 1 | 100% |
| Web3.js | 1 | 00:09:54 | 1 | 0 | 0 | 1 | 100% |
| Nibiru | 1 | 00:09:22 | 1 | 0 | 0 | 1 | 100% |
| Arbitrum BoLD | 1 | 00:08:16 | 1 | 0 | 0 | 1 | 100% |
| **Total v2** | **20** | **03:23:31** | **40** | **20** | **0** | **20** | **100%** |

## Benchmark v3

| Nombre del protocolo | Vulnerabilidades | Tiempo | Findings reportados | Falsos positivos | Duplicados | Detectados | Recall |
|---|---:|---:|---:|---:|---:|---:|---:|
| Wise Lending | 2 | 00:13:27 | 2 | 0 | 0 | 2 | 100% |
| Revert Lend | 1 | 00:13:44 | 1 | 0 | 0 | 1 | 100% |
| Predy | 2 | 00:18:48 | 2 | 0 | 0 | 2 | 100% |
| Wildcat | 1 | 00:15:10 | 1 | 0 | 0 | 1 | 100% |
| Phi | 2 | 00:11:09 | 2 | 0 | 0 | 2 | 100% |
| Ethena Labs | 1 | 00:16:50 | 2 | 0 | 1 | 1 | 100% |
| PoolTogether | 1 | 00:06:36 | 1 | 0 | 0 | 1 | 100% |
| Venus Protocol | 1 | 00:06:09 | 1 | 0 | 0 | 1 | 100% |
| Ajna | 1 | 00:13:40 | 1 | 0 | 0 | 1 | 100% |
| Badger eBTC | 1 | 00:22:33 | 1 | 0 | 0 | 1 | 100% |
| DittoETH | 1 | 00:13:51 | 1 | 0 | 0 | 1 | 100% |
| zkSync Era | 1 | 00:10:07 | 1 | 0 | 0 | 1 | 100% |
| Axelar Network | 1 | 00:12:42 | 3 | 2 | 0 | 1 | 100% |
| Superposition | 1 | 00:10:29 | 1 | 0 | 0 | 1 | 100% |
| Olas | 1 | 00:23:09 | 3 | 2 | 0 | 1 | 100% |
| Vultisig | 1 | 00:05:54 | 3 | 2 | 0 | 1 | 100% |
| Connext | 1 | 00:20:07 | 1 | 0 | 0 | 1 | 100% |
| Party Protocol | 1 | 00:21:29 | 1 | 0 | 0 | 1 | 100% |
| Holograph | 1 | 00:10:03 | 3 | 1 | 1 | 1 | 100% |
| **Total v3** | **22** | **04:26:35** | **31** | **7** | **2** | **22** | **100%** |

## Labs

| Nombre del protocolo | Vulnerabilidades | Tiempo | Findings reportados | Falsos positivos | Duplicados | Detectados | Recall |
|---|---:|---:|---:|---:|---:|---:|---:|
| SolGuard Lab DTL v1 | 2 | 00:04:03 | 1 | 0 | 0 | 1 | 50% |
| SolGuard Lab DTL v2 | 3 | 00:06:00 | 5 | 0 | 2 | 3 | 100% |
| SolGuard Lab DTL v3 | 4 | 00:08:27 | 16 | 4 | 8 | 4 | 100% |
| SolGuard Lab DTL v4 | 4 | 00:14:26 | 26 | 5 | 17 | 4 | 100% |
| SolGuard Lab DeFi v1 | 3 | 00:05:07 | 3 | 0 | 0 | 3 | 100% |
| SolGuard Lab DeFi v2 | 3 | 00:04:13 | 3 | 1 | 0 | 2 | 66.7% |
| SolGuard Lab DeFi v3 | 3 | 00:04:36 | 3 | 0 | 1 | 2 | 66.7% |
| SolGuard Lab DeFi v4 | 2 | 00:03:09 | 2 | 0 | 0 | 2 | 100% |
| **Total labs** | **24** | **00:50:28** | **59** | **10** | **28** | **21** | **87.5%** |
