# SolGuard Benchmarks

`solguard-deploy` contiene las suites versionadas v1-v8. Cada suite es un corpus
local de protocolos conocidos, snapshots definidos y un archivo de ground truth
asociado. Esta carpeta conserva documentacion detallada de los corpus historicos
v1-v3; la ausencia de una pagina dedicada para v4-v8 no elimina esas suites del
runner ni de los contratos de evaluacion actuales.

## Indice

1. [Benchmark 1: 24 protocolos v1](01-benchmark-1.md)
2. [Benchmark 2: 20 protocolos v2](02-benchmark-2.md)
3. [Benchmark 3: 20 protocolos v3](03-benchmark-3.md)

## Rutas actuales

El ground truth versionado vive en:

```text
solguard-deploy/benchmarks/v1/ground-truth-working.json
solguard-deploy/benchmarks/v2/ground-truth-working.json
solguard-deploy/benchmarks/v3/ground-truth-working.json
solguard-deploy/benchmarks/v4/ground-truth-working.json
solguard-deploy/benchmarks/v5/ground-truth-working.json
solguard-deploy/benchmarks/v6/ground-truth-working.json
solguard-deploy/benchmarks/v7/ground-truth-working.json
solguard-deploy/benchmarks/v8/ground-truth-working.json
```

Los resultados de ejecucion se escriben bajo el directorio de proyectos de
SolGuard, por ejemplo:

```text
<SOLGUARD_PROJECTS_DIR>/v1/results.json
<SOLGUARD_PROJECTS_DIR>/v2/results.json
<SOLGUARD_PROJECTS_DIR>/v3/results.json
```

## Resumen del corpus

| Benchmark | Ruta                            | Protocolos | Expected declarados | Enfoque                                        |
| --------- | ------------------------------- | ---------: | ------------------: | ---------------------------------------------- |
| 1         | `solguard-deploy/benchmarks/v1` |         24 |                 397 | Corpus amplio DeFi/DLT.                        |
| 2         | `solguard-deploy/benchmarks/v2` |         20 |                  20 | Corpus multi-lenguaje de un bug por protocolo. |
| 3         | `solguard-deploy/benchmarks/v3` |         20 |                  23 | Corpus DeFi/cross-chain mas reciente.          |

## Estado de la frontera de evaluacion E0+M1

### Tercera ola E0: scan-only diagnostico disponible

`solguard-deploy` ya contiene una cadena contractual separada para construir una
futura evaluacion pre-oracle:

- `solguard-scan-contract.v1` congela targets, inputs productivos, budgets,
  runtime policy y modulo de ranking, y rechaza recursivamente ground truth,
  matcher, evaluator, splits, expected bugs y rutas de oracle;
- `solguard-scan-receipt.v1` liga el contrato al estado terminal del proceso, al
  manifest completo de outputs, a su tree hash y al orden de candidatos;
- `solguard-scan-attestation.v1` separa la evidencia del proveedor de aislamiento
  de las afirmaciones del receipt;
- `solguard-evaluation-contract.v1` liga la cadena exacta de documentos, el batch
  barrier, el precommit, los inputs del oracle y la politica de output.

Cada suite v1-v8 tiene un `protocols-scan.json` oracle-free bajo
`solguard-scan-catalog.v1`: v1 contiene 24 targets y v2-v8 contienen 20 cada
una. Cada target contiene unicamente
`project`, `commit`, `source_locator` y `source_mirrors`; nombres, categorias,
aliases y cualquier narrativa libre quedan fuera del contrato. La suite debe
coincidir con la solicitada, las URLs se limitan a archives de
`codeload.github.com` sin credenciales/query/fragment y su ref final debe
coincidir con `commit`. El modo check exige los
bytes generados exactos ademas de paridad project+commit con el catalogo legacy.
Los refs `main`/`master` no fijan contenido: antes del scan los bytes descargados
deben quedar ligados por el `source_sha256` obligatorio del scan contract.

Los cuatro payloads tienen JSON Schemas Draft 2020-12 cerrados bajo
`solguard-deploy/schemas/`. Los documentos usan JSON canonico, SHA-256 y solo
admiten envelopes DSSE Ed25519. El verificador no acepta otro algoritmo, una firma
valida sobre un documento diferente, un hash recompuesto que contradiga el
manifest, una referencia a otro contrato o una elegibilidad relabelled.

Los project IDs no admiten traversal, los descriptores obligatorios deben
enlazar contenido presente y el digest de product-priority debe coincidir con
su descriptor de input. La clave publica Ed25519 indicada por el caller solo
permite probar integridad respecto al firmante que ese caller ha elegido; no
demuestra que sea un attestor autorizado para release. Por eso
`--require-scan-boundary` falla cerrado hasta que el repositorio fije una raiz
de confianza y una politica de firma con roles separados. Una cadena aportada
puede verificarse para diagnostico y resultar estructuralmente elegible, pero
debe conservar `recall_at_eligible=false`.

Los nombres de la cadena describen exactamente su alcance:
`structurally_eligible` y `scan_attestation_structurally_valid` prueban
completitud estructural, mientras `oracle_capability_separated_claimed` es una
afirmacion del proveedor. Ninguno significa aislamiento verificado ni confianza
de release.

Existe ademas `solguard-scan-execution-contract.v2`. Su fingerprint scan-only
cierra exactamente 14 componentes: su constructor, runner, launcher, catalogo
materializado, modulo de catalogo, product-priority, scan-contract,
scan-boundary y seis schemas. Ground truth, evaluator, matcher, splits y
adjudications no forman parte de esa huella y sus nombres/rutas se rechazan. El
contrato embebe tambien `solguard-toolchain-fingerprint.v2`: el worker rehashea
los 14 componentes y recomputa los 13 repositorios antes y despues. Detectar
drift no demuestra aislamiento de capacidades.

El ranking productivo vive ahora en el modulo independiente
`benchmarks/product-priority.mjs`. No importa el matcher ni el evaluador y
conserva byte a byte el wire object `solguard-product-priority-ranking.v2` que
consumen v1-v8. Este traslado reduce la superficie de dependencia; no convierte
el objeto v2 en una attestation ni cambia su semantica ineligible.

`scan-boundary.mjs` implementa una frontera host de prueba: inicia otro proceso
con un environment exacto, sin heredar variables del padre y rechazando
por allowlist positiva cualquier nombre que no sea una variable de aplicacion
`SOLGUARD_*` libre de oracle; esto incluye controles no enumerados como
`LD_AUDIT`. Limita argumentos y entrypoint, recoge
solo artefactos declarados y rechaza traversal/symlinks. Cada target exige
`source_sha256`; scanner, toolchain, product-priority, configuracion y todos los
sources se suministran como `inputPaths` exactos y se rehashean antes y despues
de ejecutar. Esos checkpoints no demuestran todavia que el child consumiera las
rutas declaradas ni impiden swap-and-restore durante la ejecucion. El receipt
registra separacion de proceso y cierre observado del
arbol, pero la attestation resultante es deliberadamente `host_process` y
mantiene `oracle_capability_separated=false`. Un proceso hijo en el mismo host no
prueba aislamiento de filesystem, red, database o capacidades.

`protocols-scan.mjs` implementa el runner scan-only comun y `scan-suite.mjs` su
launcher por suite. El launcher materializa cada source y fija
`source_sha256`, crea un backend y una base nuevos por target, y mantiene
separados el arbol sellable de outputs y el runtime mutable de logs y bases. El
reporte conserva en el denominador targets completados, parciales y fallidos;
tambien escribe ranking productivo y manifest completo de outputs.

Antes de ejecutar, `scan-release-batch.mjs` prepara exactamente v1-v8 y escribe
`solguard-scan-batch-plan.v1`, que fija hash documental, hash de bytes y tamano
de cada catalogo. Solo despues del cierre correcto de todas las suites crea
`solguard-scan-batch-barrier.v1`; la barrera exige los artefactos de cada target
y los agregados de suite. `solguard-scan-chain-bundle.v1` contiene el plan y la
barrera completos. Un proceso scanner fallido, receipt no completado, target
ausente o artefacto obligatorio vacio impide crear ambos. Un target terminal
`failed` con sus artefactos completos permanece sellado en el denominador. Es
un bundle crudo, diagnostico y no firmado: no contiene ni abre ground truth.

Cuando se suministra una cadena al evaluator, su preflight verifica primero las
cuatro firmas DSSE y todos los enlaces contract/receipt/attestation/evaluation.
Solo despues verifica y congela los bytes de ground truth, catalogo, splits,
matcher y run; la evaluacion consume esos mismos bytes en vez de reabrir sus
rutas. Tambien exige que `--projects-dir` sea exactamente el
`--scan-output-root` sellado, reconstituye el output manifest y el ranking, y
comprueba que `--run` sea el `scan_report` ligado por el receipt. La misma
verificacion de hashes se repite antes de escribir resultados y el directorio
de evaluacion debe quedar fuera del arbol de scan. El TCB firmado del evaluator
incluye `evaluate.mjs`, `scan-contract.mjs` y `scan-boundary.mjs`. La ruta de
output debe ser nueva y no existir; cada escritura de boundary se crea de forma
exclusiva para no sobrescribir ni seguir hardlinks preexistentes.
Este inventario no es aun bootstrap-trusted: Node importa los verificadores
locales antes de comprobar sus hashes. Strict necesita un launcher minimo fijado
por el repositorio que verifique el closure antes del import. Los JSON Schema
son estructurales; self-hash, cronologia, igualdades y cadena se validan con el
modulo JavaScript autoritativo.

Este endurecimiento reduce la exposicion a mutaciones entre verificacion y uso,
pero una frontera host sigue teniendo ventanas TOCTOU. No sustituye un almacen
content-addressed ni mounts inmutables de solo lectura, y por ello sigue siendo
una frontera diagnostica, no una prueba de aislamiento.

### Estado de integracion y claims permitidos

`full-run.sh` mantiene `legacy` como flow por defecto. El camino scan-only se
invoca de forma explicita:

```bash
./scripts/benchmarks/full-run.sh --flow boundary-scan --tier full
```

`boundary-scan` exige exactamente v1-v8 y no admite `--resume`, `--protocol` ni
el tier `release`. Tampoco ejecuta evaluadores. `--preflight-only` prepara el
plan sin iniciar scans. El batch espera todos los procesos, falla cerrado antes
de sellar si alguno no completa y siempre declara `release_eligible=false`.
Los runners y evaluadores legacy no han cambiado y siguen siendo el camino por
defecto.

Todavia faltan inputs CAS/read-only, un proveedor OCI o VM real que emita una
attestation de capacidades confiable, una raiz de attestors fijada por el
repositorio y roles de firma separados. Tambien falta que el evaluador consuma
el bundle multi-chain en una fase fisicamente separada y publique una cadena
blind, asi como integrar labs. Por tanto, el snapshot actual conserva
`oracle_capability_separated=false`, `scan_attestation=null` y una
`recall_at_eligibility` negativa. `recall_at` sigue siendo `null` y
`diagnostic_recall_at` sigue siendo una metrica exclusivamente diagnostica. E0
permanece abierto: no existe todavia un run blind certificado, una mejora medida
de deteccion ni evidencia nueva de generalizacion. Esta ola no cambia detectores
ni resultados de benchmark y no se han ejecutado scans reales para sostener un
claim de mejora o de recall.

Cada runner v1-v8 escribe
`tool-outputs/benchmark/product_priority_ranking.json` despues del analisis del
producto. `solguard-product-priority-ranking.v2` se calcula desde candidatos
canonicos, VALIDATE y diagnosticos de modelo, con
`ranking_basis=product_artifacts_only`. El evaluador recalcula el objeto
canonico completo desde esos artefactos, rechaza cualquier campo cambiado o
extra y devuelve su recomputacion verificada.

`solguard-audit-ranking.v3` conserva el orden product-derived y agrega finding
ID, match status y severidad como anotaciones de evaluacion. El agregado usa
`solguard-benchmark-audit-ranking.v3`. Los envelopes actuales son:

- `solguard-real-protocol-results.v3` para los runners v1-v8;
- `solguard-lab-results.v2` para ambos runners de labs;
- `solguard-benchmark-evaluation.v2` para la evaluacion agregada;
- `solguard-benchmark-matches.v2` para matches individuales.

En todos los runners actuales, `recall_at` es `null` y no elegible.
`diagnostic_recall_at` usa `ground_truth_status.product_priority_rank` para
diagnosticar el orden product-derived, pero es solo una metrica de desarrollo:
no demuestra Recall@K ciego, generalizacion ni calidad de release.

En el flow legacy y tier `release`, `full-run.sh` ejecuta obligatoriamente
`solguard-pre-release-check.v2` despues de cerrar las suites y escribir el
summary agregado. El release no usa `--soft-fail`: un error bloqueante impide
declarar exito. `--soft-fail` solo sirve para informes diagnosticos manuales.

Los manifests bajo `solguard-deploy/benchmarks/baselines/` usan
`solguard-offline-baseline-manifest.v1` para hashear resultados, receipts,
artefactos referenciados y commits declarados. El manifest actual
`legacy-offline-2026-07-15.json` de v1-v8 y 90 labs clasifica todas las
colecciones como `legacy_backend_bound`, declara
`claims.post_migration_parity=not_established` y no esta completo por referencias
missing/mismatch. Es evidencia historica congelada, no una demostracion de
paridad tras la migracion a core. Esa afirmacion exige una nueva ejecucion
core-bound y un manifest que pase el modo estricto.

## Resultado historico de cierre v0.8.0

El cierre benchmark de `v0.8.0` se calcula sobre 63 protocolos scoreables. El
protocolo `Tapioca-DAO` de v3 queda excluido por el fallo conocido de descarga
HTTP 404.

| Grupo                | Protocolos scoreables | Vulnerabilidades scoreables |       Tiempo | Findings reportados | Falsos positivos | Duplicados | Detectados | Match recall historico |
| -------------------- | --------------------: | --------------------------: | -----------: | ------------------: | ---------------: | ---------: | ---------: | ---------------------: |
| Benchmark v1         |                    24 |                         380 |     06:06:34 |                 432 |               15 |         49 |        380 |                   100% |
| Benchmark v2         |                    20 |                          20 |     03:23:31 |                  40 |               20 |          0 |         20 |                   100% |
| Benchmark v3         |                    19 |                          22 |     04:26:35 |                  31 |                7 |          2 |         22 |                   100% |
| **Total benchmarks** |                **63** |                     **422** | **13:56:40** |             **503** |           **42** |     **51** |    **422** |               **100%** |

La ultima columna es recall de matching sobre un corpus conocido; no es
`recall_at`, Recall@K ciego ni evidencia de generalizacion. La prueba de cierre
usa el full scan congelado del 04/07/2026 mas una
revalidacion targeted real del unico miss benchmark (`Lybra Finance` H-03). No
incluye labs en el criterio de cierre.

## Evaluacion offline historica

Para iterar sin repetir 15-19 horas de escaneo completo, `solguard-deploy`
incluye un evaluador offline:

```text
solguard-deploy/benchmarks/offline-gates.mjs
```

El evaluador historico lee outputs ya generados, `ground-truth-working.json` y
`validation_results.json`, y simula gates de publicacion o cambios de soporte.
Sirve para medir rapidamente:

- cuantos falsos positivos caen o suben;
- cuantos bugs reales se pierden o recuperan;
- que protocolos cambian;
- si el recall benchmark sigue cerrado.

El cierre `v0.8.0` uso el gate benchmark-only
`recall-rescue-role-check-projection`, despues confirmado con una revalidacion
real targeted de Lybra Finance. Este resultado historico no sustituye el futuro
scan receipt pre-oracle con attestation, el baseline manifest ni el pre-release
check actuales.
