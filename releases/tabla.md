# Analiticas Solguard

Fuente: resultados generados en `C:\Users\Roger G?mez Mart?nez\Documents\Solguard` y ground truth de `ground-truth-working.json` en `solguard-deploy`.

Actualizacion post-mejoras: Rubicon fue reejecutado con filtros globales de rutas vendorizadas/periphery y deteccion general de reembolsos ETH inline que revierten la operacion principal. Compound Finance fue reejecutado con la deteccion global de drift en indices de reward/borrow. Lybra Finance fue reejecutado con el motor actual y recupero sus patrones deterministas de stablecoin/rewards/governance. Nomad fue reejecutado con el motor actual y recupero el patron determinista de inicializacion de Replica/trusted root. Ethereum Name Service fue reejecutado con el motor actual y recupero todos los patrones deterministas de NameWrapper, DNSSEC y registrar. Monad fue reejecutado con el motor actual y recupero los 3 bugs scoreable sin falsos positivos. Bitcoin Core fue reejecutado con el motor actual y recupero el patron determinista de doble gasto UTXO en CheckBlock. Optimism Superchain fue reejecutado con el motor actual y recupero los patrones deterministas de FaultDisputeGame, PreimageOracle, MIPS y DisputeGameFactory. Cosmos SDK fue reejecutado con una promocion global estricta para patrones nativos DLT de reward-pool overflow. Ethereum Geth fue reejecutado con soporte global para cadenas fuente nativas EVM RETURNDATACOPY/return-data. Biconomy Smart Account fue reejecutado con anclaje global ERC-1271 a isValidSignature, gate global para superficies no productivas y validacion estricta de relaciones economicas actual_received. Taiko fue reejecutado con deteccion global de tags ASN.1 de validez de certificado y promocion estricta para patrones deterministas de pausa/fee payout. EigenLayer fue reejecutado con el motor actual y quedo filtrado por la validacion estricta global de relaciones economicas actual_received. Recall / IPC fue reejecutado con promocion global estricta para quorum determinista con firmantes duplicados. Reserve Protocol fue revalidado con un filtro global que mantiene en review leads deterministas de formula de rewards sin binding tipado. KUMA Protocol fue reejecutado con promocion global estricta para cadenas fuente deterministas de stale-oracle/latestRoundData. Astaria fue reejecutado con un puente global estricto para scope economico NFT-lending en reglas de private-vault liveness e identidad borrower. Asymmetry Finance fue reejecutado con una clasificacion global de peg assumptions de derivados como logic/accounting impact. Centrifuge fue reejecutado con el motor actual y recupero los bugs scoreable restantes sin cambios adicionales de codigo. Basin / Beanstalk fue reejecutado con el motor actual y recupero todos los bugs scoreable de AMM sin cambios adicionales de codigo. Maia DAO fue reejecutado con soporte global para cadenas fuente deterministas de router asset-flow, governance block-period y constructor dependency validation. DYAD fue reejecutado con un gate global para accounting generico en librerias OpenZeppelin/forge-std y contexto estricto boost-lock en staking rewards. Lodestar fue reejecutado con gates globales para weak trace single-surface, reward-claim sobre constantes y private-key forwarding explicito. Revert Lend fue reejecutado con gates globales para accounting anonimo single-surface, actual_received sin flujo local y raw calls a target realmente controlado por usuario. PoolTogether fue reejecutado con el motor actual y quedo filtrado por gates globales de actual_received sin flujo local y trace/accounting single-surface, manteniendo solo el patron determinista de partial claim. Badger eBTC fue reejecutado con gates globales para dependencias/test harness vendorizados y librerias genericas standalone sin consumidor de protocolo, manteniendo el patron determinista de batch liquidation. Connext fue reejecutado con las gates globales de actual_received sin flujo local, manteniendo solo el patron determinista de unchecked router balance underflow. Party Protocol fue reejecutado con gates globales para cache/indexer inferido en Solidity, zero-address anonimo single-surface y refunds ETH que usan helpers full-gas o excedentes evitables, manteniendo solo el patron determinista de host abdication replay. SolGuard Lab DTL v3/v4 fueron reejecutados con patrones fuente DLT deterministas para epoch context, fee debit, cache keys y replacement hints. SolGuard Lab DeFi v1 fue reejecutado con extraccion Solidity compatible con CRLF, seeds fuente globales para oracle freshness, claim ordering y zero-address sink, y validacion estricta de recipient_nonzero. El resto de protocolos mantiene el ultimo resultado real disponible.

Actualizacion Superposition: Superposition fue reejecutado con gate global para ordering/replacement anonimo single-surface y filtros existentes de trace/accounting anonimo, manteniendo solo el patron determinista de reversed ERC20 transfer arguments.

Actualizacion zkSync Era: zkSync Era fue reejecutado con taxonomia global ampliada para test harness (`test-contracts`, `test_infra`) y gate determinista para superficies primarias no productivas, manteniendo solo el patron determinista de StateTransitionManager.unfreezeChain llamando a freezeDiamond.

Actualizacion Wildcat: Wildcat fue reejecutado con los gates globales actuales de actual_received sin flujo local de valor y zero-address anonimo single-surface, manteniendo solo el patron determinista de APR reducible en fixed-term markets.

Actualizacion Phi: Phi fue reejecutado con los gates globales actuales de actual_received sin flujo local de valor, accounting anonimo single-surface y ordering anonimo single-surface, manteniendo solo los dos patrones deterministas de replay de firmas.

Actualizacion Wise Lending: Wise Lending fue reejecutado con gates globales para claim/external-effect single-surface parcialmente resuelto y deployment-binding determinista atado solo a helpers clone/getAddress, manteniendo los patrones deterministas de liquidation dust griefing y bad-debt double-count.

Actualizacion MANTRA DEX: MANTRA DEX fue reejecutado con gate global para asset-conservation anclado solo a superficies error/enum PascalCase, manteniendo el patron determinista de CPMM multi-asset incompatible con formulas x*y=k.

Actualizacion Size: Size fue reejecutado con los gates globales actuales para actual_received sin flujo local, accounting anonimo single-surface y ordering anonimo single-surface, manteniendo solo el patron determinista de fee undercharge en exact-cash-out.

Actualizacion Zcash: Zcash fue reejecutado con gates globales mas estrictos para ordering/accounting anonimo single-surface sin ruta material de validacion, manteniendo solo el patron determinista de malleability de scriptSig/GetTxid.

Actualizacion Arbitrum BoLD: Arbitrum BoLD fue reejecutado con gates globales para share-backing single-surface sin flujo de valor y reward replay anclado a getters, manteniendo solo el patron determinista de timer inheritance sin lineage exacto.

Actualizacion Renzo: Renzo fue reejecutado con los gates globales actuales de actual_received sin flujo local y un gate global para claim/reward replay colapsado a interfaces self-referential, manteniendo solo el patron determinista de completeQueuedWithdrawal + receive bloqueado por nonReentrant.

Actualizacion Nibiru: Nibiru fue reejecutado con gates globales para trace/accounting y ordering single-surface, mas clasificacion global de carpetas e2e como superficies no productivas, manteniendo solo el patron determinista de StateDB compartido en bank keeper.

Actualizacion Stader Labs: Stader Labs fue reejecutado con hardening global para placeholders deterministas de role-check, deployment clone/preemption y pause-admin no claim-like. El recall se mantiene al 100% y se conserva en validacion un claim-like de rewards para no perder cobertura global.

Actualizacion SolGuard Lab DTL v2: SolGuard Lab DTL v2 fue reejecutado con hardening global para ordering/replacement anonimo single-surface y un puente estricto de validacion para rutas locales tipadas de identity/context/cross-component con evidencia estructural. El recall queda en 100% y los falsos positivos bajan a 0.

Definiciones usadas: `Vulnerabilidades` es el total scoreable del ground truth tras source coverage; `Findings reportados` es `supported_findings`; `Falsos positivos` son supported findings sin match exact/equivalent contra ground truth; `Duplicados` son supported findings adicionales que matchean una vulnerabilidad ya detectada; `Detectados` son vulnerabilidades unicas del ground truth detectadas con finding supported; `Recall = Detectados / Vulnerabilidades`.

## Resumen

| Grupo | Protocolos | Vulnerabilidades | Tiempo | Findings reportados | Falsos positivos | Duplicados | Detectados | Recall |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Benchmark v1 | 24 | 380 | 06:43:10 | 445 | 19 | 56 | 380 | 100% |
| Benchmark v2 | 20 | 20 | 03:50:07 | 43 | 19 | 4 | 20 | 100% |
| Benchmark v3 | 19 | 22 | 04:33:34 | 39 | 16 | 1 | 22 | 100% |
| Labs | 8 | 24 | 00:51:28 | 56 | 8 | 24 | 24 | 100% |
| **Benchmarks total** | **63** | **422** | **15:06:51** | **527** | **54** | **61** | **422** | **100%** |
| **Total con labs** | **71** | **446** | **15:58:19** | **583** | **62** | **85** | **446** | **100%** |

Nota: `Tapioca-DAO` se excluye de los benchmarks porque fallo en descarga: Snapshot download returned HTTP 404.

## Benchmark v1

| Nombre del protocolo | Vulnerabilidades | Tiempo | Findings reportados | Falsos positivos | Duplicados | Detectados | Recall |
|---|---:|---:|---:|---:|---:|---:|---:|
| Compound Finance | 1 | 00:14:44 | 6 | 5 | 0 | 1 | 100% |
| Ondo Finance | 6 | 00:11:34 | 12 | 5 | 1 | 6 | 100% |
| Astaria | 50 | 00:30:54 | 41 | 0 | 0 | 50 | 100% |
| KUMA Protocol | 5 | 00:18:38 | 5 | 0 | 0 | 5 | 100% |
| Asymmetry Finance | 20 | 00:07:10 | 20 | 1 | 0 | 20 | 100% |
| Rubicon | 45 | 00:33:26 | 48 | 2 | 1 | 45 | 100% |
| Maia DAO | 79 | 00:34:08 | 87 | 1 | 7 | 79 | 100% |
| Lybra Finance | 31 | 00:24:07 | 39 | 0 | 8 | 31 | 100% |
| Basin / Beanstalk | 14 | 00:06:02 | 21 | 1 | 6 | 14 | 100% |
| Shell Protocol | 1 | 00:05:56 | 3 | 1 | 1 | 1 | 100% |
| Centrifuge | 6 | 00:12:48 | 9 | 2 | 1 | 6 | 100% |
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
| **Total v1** | **380** | **06:43:10** | **445** | **19** | **56** | **380** | **100%** |

## Benchmark v2

| Nombre del protocolo | Vulnerabilidades | Tiempo | Findings reportados | Falsos positivos | Duplicados | Detectados | Recall |
|---|---:|---:|---:|---:|---:|---:|---:|
| Curve Finance Metapool | 1 | 00:08:37 | 1 | 0 | 0 | 1 | 100% |
| MANTRA DEX | 1 | 00:15:52 | 1 | 0 | 0 | 1 | 100% |
| Renzo | 1 | 00:17:24 | 1 | 0 | 0 | 1 | 100% |
| Caviar | 1 | 00:04:47 | 3 | 2 | 0 | 1 | 100% |
| Wenwin | 1 | 00:04:07 | 4 | 3 | 0 | 1 | 100% |
| Size | 1 | 00:14:43 | 1 | 0 | 0 | 1 | 100% |
| Stader Labs | 1 | 00:25:35 | 2 | 1 | 0 | 1 | 100% |
| Papr / Backed | 1 | 00:06:57 | 3 | 1 | 1 | 1 | 100% |
| Good Entry | 1 | 00:09:42 | 5 | 3 | 1 | 1 | 100% |
| DYAD | 1 | 00:11:48 | 1 | 0 | 0 | 1 | 100% |
| Salty.IO | 1 | 00:07:59 | 1 | 0 | 0 | 1 | 100% |
| reNFT | 1 | 00:07:07 | 2 | 1 | 0 | 1 | 100% |
| AI Arena | 1 | 00:09:58 | 3 | 2 | 0 | 1 | 100% |
| LoopFi | 1 | 00:09:48 | 1 | 0 | 0 | 1 | 100% |
| Core Lightning | 1 | 00:15:22 | 4 | 3 | 0 | 1 | 100% |
| Zcash | 1 | 00:13:10 | 1 | 0 | 0 | 1 | 100% |
| Lodestar | 1 | 00:14:34 | 2 | 1 | 0 | 1 | 100% |
| Web3.js | 1 | 00:14:49 | 5 | 2 | 2 | 1 | 100% |
| Nibiru | 1 | 00:09:34 | 1 | 0 | 0 | 1 | 100% |
| Arbitrum BoLD | 1 | 00:08:14 | 1 | 0 | 0 | 1 | 100% |
| **Total v2** | **20** | **03:50:07** | **43** | **19** | **4** | **20** | **100%** |

## Benchmark v3

| Nombre del protocolo | Vulnerabilidades | Tiempo | Findings reportados | Falsos positivos | Duplicados | Detectados | Recall |
|---|---:|---:|---:|---:|---:|---:|---:|
| Wise Lending | 2 | 00:13:05 | 2 | 0 | 0 | 2 | 100% |
| Revert Lend | 1 | 00:14:02 | 1 | 0 | 0 | 1 | 100% |
| Predy | 2 | 00:18:18 | 3 | 1 | 0 | 2 | 100% |
| Wildcat | 1 | 00:16:44 | 1 | 0 | 0 | 1 | 100% |
| Phi | 2 | 00:11:51 | 2 | 0 | 0 | 2 | 100% |
| Ethena Labs | 1 | 00:17:22 | 3 | 2 | 0 | 1 | 100% |
| PoolTogether | 1 | 00:06:37 | 1 | 0 | 0 | 1 | 100% |
| Venus Protocol | 1 | 00:05:43 | 2 | 1 | 0 | 1 | 100% |
| Ajna | 1 | 00:13:41 | 3 | 2 | 0 | 1 | 100% |
| Badger eBTC | 1 | 00:20:48 | 1 | 0 | 0 | 1 | 100% |
| DittoETH | 1 | 00:13:11 | 1 | 0 | 0 | 1 | 100% |
| zkSync Era | 1 | 00:12:01 | 1 | 0 | 0 | 1 | 100% |
| Axelar Network | 1 | 00:14:02 | 2 | 1 | 0 | 1 | 100% |
| Superposition | 1 | 00:11:38 | 1 | 0 | 0 | 1 | 100% |
| Olas | 1 | 00:24:09 | 5 | 4 | 0 | 1 | 100% |
| Vultisig | 1 | 00:07:04 | 4 | 3 | 0 | 1 | 100% |
| Connext | 1 | 00:20:15 | 1 | 0 | 0 | 1 | 100% |
| Party Protocol | 1 | 00:22:13 | 1 | 0 | 0 | 1 | 100% |
| Holograph | 1 | 00:10:50 | 4 | 2 | 1 | 1 | 100% |
| **Total v3** | **22** | **04:33:34** | **39** | **16** | **1** | **22** | **100%** |

## Labs

| Nombre del protocolo | Vulnerabilidades | Tiempo | Findings reportados | Falsos positivos | Duplicados | Detectados | Recall |
|---|---:|---:|---:|---:|---:|---:|---:|
| SolGuard Lab DTL v1 | 2 | 00:05:14 | 5 | 2 | 1 | 2 | 100% |
| SolGuard Lab DTL v2 | 3 | 00:05:58 | 5 | 0 | 2 | 3 | 100% |
| SolGuard Lab DTL v3 | 4 | 00:06:16 | 6 | 0 | 2 | 4 | 100% |
| SolGuard Lab DTL v4 | 4 | 00:08:02 | 4 | 0 | 0 | 4 | 100% |
| SolGuard Lab DeFi v1 | 3 | 00:04:06 | 3 | 0 | 0 | 3 | 100% |
| SolGuard Lab DeFi v2 | 3 | 00:08:10 | 12 | 1 | 8 | 3 | 100% |
| SolGuard Lab DeFi v3 | 3 | 00:08:25 | 11 | 0 | 8 | 3 | 100% |
| SolGuard Lab DeFi v4 | 2 | 00:05:17 | 10 | 5 | 3 | 2 | 100% |
| **Total labs** | **24** | **00:51:28** | **56** | **8** | **24** | **24** | **100%** |
