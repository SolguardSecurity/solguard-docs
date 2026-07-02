# Analiticas Solguard

Fuente: resultados generados en `C:\Users\Roger G?mez Mart?nez\Documents\Solguard` y ground truth de `ground-truth-working.json` en `solguard-deploy`.

Actualizacion post-mejoras: Rubicon fue reejecutado con las mejoras globales de deteccion deterministica de orderbooks y promocion estricta de cadenas fuente. Compound Finance fue reejecutado con la deteccion global de drift en indices de reward/borrow. Lybra Finance fue reejecutado con el motor actual y recupero sus patrones deterministas de stablecoin/rewards/governance. Nomad fue reejecutado con el motor actual y recupero el patron determinista de inicializacion de Replica/trusted root. Ethereum Name Service fue reejecutado con el motor actual y recupero todos los patrones deterministas de NameWrapper, DNSSEC y registrar. Monad fue reejecutado con el motor actual y recupero los 3 bugs scoreable sin falsos positivos. Bitcoin Core fue reejecutado con el motor actual y recupero el patron determinista de doble gasto UTXO en CheckBlock. Optimism Superchain fue reejecutado con el motor actual y recupero los patrones deterministas de FaultDisputeGame, PreimageOracle, MIPS y DisputeGameFactory. Cosmos SDK fue reejecutado con una promocion global estricta para patrones nativos DLT de reward-pool overflow. Ethereum Geth fue reejecutado con soporte global para cadenas fuente nativas EVM RETURNDATACOPY/return-data. Biconomy Smart Account fue reejecutado con anclaje global ERC-1271 a isValidSignature, gate global para superficies no productivas y validacion estricta de relaciones economicas actual_received. Taiko fue reejecutado con deteccion global de tags ASN.1 de validez de certificado y promocion estricta para patrones deterministas de pausa/fee payout. EigenLayer fue reejecutado con el motor actual y quedo filtrado por la validacion estricta global de relaciones economicas actual_received. Recall / IPC fue reejecutado con promocion global estricta para quorum determinista con firmantes duplicados. Reserve Protocol fue revalidado con un filtro global que mantiene en review leads deterministas de formula de rewards sin binding tipado. El resto de protocolos mantiene el ultimo resultado real disponible.

Definiciones usadas: `Vulnerabilidades` es el total scoreable del ground truth tras source coverage; `Findings reportados` es `supported_findings`; `Falsos positivos` son supported findings sin match exact/equivalent contra ground truth; `Duplicados` son supported findings adicionales que matchean una vulnerabilidad ya detectada; `Detectados` son vulnerabilidades unicas del ground truth detectadas con finding supported; `Recall = Detectados / Vulnerabilidades`.

## Resumen

| Grupo | Protocolos | Vulnerabilidades | Tiempo | Findings reportados | Falsos positivos | Duplicados | Detectados | Recall |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Benchmark v1 | 24 | 380 | 06:35:52 | 453 | 51 | 48 | 356 | 93.7% |
| Benchmark v2 | 20 | 20 | 04:32:07 | 181 | 115 | 46 | 20 | 100% |
| Benchmark v3 | 19 | 22 | 05:19:00 | 153 | 116 | 15 | 22 | 100% |
| Labs | 8 | 24 | 01:10:30 | 113 | 38 | 55 | 20 | 83.3% |
| **Benchmarks total** | **63** | **422** | **16:26:59** | **787** | **282** | **109** | **398** | **94.3%** |
| **Total con labs** | **71** | **446** | **17:37:29** | **900** | **320** | **164** | **418** | **93.7%** |

Nota: `Tapioca-DAO` se excluye de los benchmarks porque fallo en descarga: Snapshot download returned HTTP 404.

## Benchmark v1

| Nombre del protocolo | Vulnerabilidades | Tiempo | Findings reportados | Falsos positivos | Duplicados | Detectados | Recall |
|---|---:|---:|---:|---:|---:|---:|---:|
| Compound Finance | 1 | 00:14:44 | 6 | 5 | 0 | 1 | 100% |
| Ondo Finance | 6 | 00:11:34 | 12 | 5 | 1 | 6 | 100% |
| Astaria | 50 | 00:30:13 | 56 | 3 | 5 | 48 | 96% |
| KUMA Protocol | 5 | 00:18:10 | 17 | 14 | 0 | 3 | 60% |
| Asymmetry Finance | 20 | 00:07:01 | 22 | 3 | 0 | 19 | 95% |
| Rubicon | 45 | 00:36:43 | 58 | 11 | 2 | 45 | 100% |
| Maia DAO | 79 | 00:27:30 | 71 | 4 | 0 | 69 | 87.3% |
| Lybra Finance | 31 | 00:24:07 | 39 | 0 | 8 | 31 | 100% |
| Basin / Beanstalk | 14 | 00:05:00 | 9 | 1 | 0 | 8 | 57.1% |
| Shell Protocol | 1 | 00:05:56 | 3 | 1 | 1 | 1 | 100% |
| Centrifuge | 6 | 00:10:58 | 6 | 3 | 0 | 3 | 50% |
| Panoptic | 7 | 00:06:15 | 8 | 0 | 1 | 7 | 100% |
| Reserve Protocol | 27 | 00:20:09 | 50 | 0 | 23 | 27 | 100% |
| Nomad | 1 | 00:10:03 | 1 | 0 | 0 | 1 | 100% |
| Ethereum Name Service | 16 | 00:05:13 | 17 | 1 | 0 | 16 | 100% |
| Monad | 3 | 00:15:23 | 3 | 0 | 0 | 3 | 100% |
| Recall / IPC | 13 | 00:17:09 | 19 | 0 | 6 | 13 | 100% |
| Bitcoin Core | 1 | 00:11:46 | 1 | 0 | 0 | 1 | 100% |
| Optimism Superchain | 16 | 00:32:47 | 16 | 0 | 0 | 16 | 100% |
| Taiko | 19 | 00:24:05 | 20 | 0 | 1 | 19 | 100% |
| Biconomy Smart Account | 13 | 00:10:02 | 13 | 0 | 0 | 13 | 100% |
| EigenLayer | 4 | 00:19:42 | 4 | 0 | 0 | 4 | 100% |
| Cosmos SDK | 1 | 00:15:02 | 1 | 0 | 0 | 1 | 100% |
| Ethereum Geth | 1 | 00:16:07 | 1 | 0 | 0 | 1 | 100% |
| **Total v1** | **380** | **06:35:52** | **453** | **51** | **48** | **356** | **93.7%** |

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
