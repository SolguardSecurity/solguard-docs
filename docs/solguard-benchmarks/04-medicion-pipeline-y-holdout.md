# Medicion completa, loss ledger y futuro holdout

La fase 1 separa tres conceptos que antes podian confundirse:

1. evidencia historica incompleta;
2. una regresion canonica nueva sobre v1-v8 y los 90 labs;
3. una futura prueba blind sobre un holdout privado independiente.

Solo el segundo punto mide el pipeline actual. En esta fase se fijan la politica
y el mecanismo criptografico del tercero, pero no existe una cohorte privada
real en el workspace: solo un custodio externo puede seleccionarla y sellarla.
No se abre ni se ejecuta durante esta fase.

## Frontera de claims

v1-v8 y labs-90 son `known_regression` de forma permanente. El snapshot publico
de exclusion liga 254 targets y 630 findings declarados. Sirven para detectar
regresiones, localizar perdidas y comparar ruido; no prueban generalizacion,
recall ciego ni descubrimiento de bugs nuevos.

La precision real queda `null` mientras no exista adjudicacion independiente.
Un finding no enlazado a un bug conocido puede ser ruido o un hallazgo nuevo y
no se etiqueta automaticamente como falso positivo. El informe puede mostrar
un `known_bug_precision_proxy`, siempre separado y con esa limitacion explicita.
Del mismo modo, FILTER ausente o incompleto y recall no observable permanecen
`null` o con estado parcial/no disponible. Los subtotales observados y su
cobertura se publican aparte; missing nunca se convierte en cero.

## Precommit de identidades anterior al replay

`solguard-measurement-pre-run-lock.v1` se crea despues del prebuild y antes de
analizar protocolos. Es un precommit firmado Ed25519 que incluye su timestamp;
falla si algun repositorio runtime esta sucio, el root no esta vacio o falta un
input. Precompromete:

- commit, tree y estado limpio de los repos runtime;
- hashes explicitos de prompts, templates, policies, schemas, configs y locks
  versionados;
- bytes de los binarios Solguard y de Node, Git Bash, Git, Forge, Ollama,
  PowerShell, Cargo, Rustc y Bun;
- manifest byte a byte de snapshots y cache de labs, que deben permanecer sin
  cambios durante el replay;
- variables semanticas allowlisted, sin secretos;
- sistema operativo, CPU, RAM y versiones de Node, Git, Cargo, Rust, Bun y
  Ollama;
- manifest Ollama, Modelfile, parametros, template y todos los blobs CAS
  verificados contra su SHA-256;
- argv, cwd, entorno explicito allowlisted, paralelismo, outputs requeridos y
  autoridad de firma;
- medicion historica preservada antes de escribir el nuevo root, junto con un
  manifest que compromete tanto cada artefacto historico presente como cada
  slot ausente de results, pipeline, funnel, VALIDATE y FILTER.

El manifest de snapshots y cache compromete identidades de bytes, no crea mounts
read-only ni demuestra inmutabilidad fisica. El runner rehashea los inputs antes
y despues de cada comando y cualquier drift invalida la baseline; tampoco cubre
una mutacion-and-restore entre checkpoints.

El replay usa los binarios comprometidos con `--no-prebuild`. El runner deriva
cada comando del lock y pasa al child exactamente el entorno explicito del
runbook; no hereda variables arbitrarias del proceso llamador. Antes de ejecutar
adquiere un lease exclusivo y crea un journal de inicio. Cada comando exitoso
produce un recibo Ed25519 create-only que liga identidad de comando, telemetria
y un manifest canonico de evidencia con extensiones y directorios excluidos
declarados en el propio recibo, y que enlaza el recibo anterior mediante
`previous_receipt_sha256`. No afirma cubrir cada byte del arbol: los artefactos
semanticos/offline listados se rehashean aparte y cada descriptor de medicion en
scope debe coincidir con un recibo firmado. La firma prueba integridad bajo la
clave suministrada, no autorizacion de esa clave, un timestamp externo notarial
ni aislamiento fisico del host.

## Loss ledger

`solguard-pipeline-loss-ledger.v1` contiene exactamente una fila por bug
declarado y conserva los protocolos fallidos en una tabla separada. El orden de
observacion es:

```text
source_preflight
MAP
TRACE
DISCOVER
candidato
binding a invariante
ECONOMIC/VALUE
VALIDATE
FILTER
```

Cada etapa puede ser `survived`, `blocked`, `bypassed`, `not_applicable`,
`unverifiable` o `not_reached`. Cada decision enlaza artefacto, SHA-256 y JSON
pointer cuando esa evidencia existe.

El ledger distingue:

- `first_observed_loss_stage`: primera frontera donde se observa la perdida;
- `first_attributable_loss_stage`: primera perdida demostrada despues de cerrar
  con evidencia todos los predecesores requeridos.

Una fase MAP o TRACE completada para el protocolo no demuestra por si sola que
el bug concreto sobrevivio. En ausencia de lineage por finding, la atribucion
correcta es `unverifiable`. FILTER `duplicate` conserva el bug solo si su
representante tiene decision `pass`.

El ledger se genera despues del scan y pertenece al evaluador. Ground truth,
matcher y ledger nunca son inputs de CORE, herramientas o FILTER.

## Metricas y comparabilidad

`solguard-pipeline-measurement.v1` publica denominadores y disponibilidad para:

- volumen MAP, TRACE, DISCOVER, ECONOMIC, VALUE, candidatos, VALIDATE y FILTER;
- recall end-to-end sobre los 630 findings declarados, donde fallos de source y
  protocolos cuentan como misses, mas el denominator estatico scoreable;
- candidate recall, VALIDATE-supported recall y FILTER-pass recall;
- macro recall por protocolo, familia y lenguaje;
- review queue, overflow, ruido, densidad y candidatos por bug conocido;
- fallos, degradaciones, fallbacks y truncaciones observables;
- tiempos totales, por protocolo y por fase;
- peak RSS, memoria virtual y memoria privada del arbol de procesos, junto con
  calidad y cobertura del muestreo.

El macro recall por protocolo solo tiene valor numerico cuando estan observados
los 254 protocolos configurados. Si la cobertura es parcial queda `null` y se
publican por separado protocolos observados, total, ratio de cobertura y estado.

`solguard-measurement-comparison.v1` clasifica cada metrica como
`comparable`, `partially_comparable` o `not_comparable`. La ausencia historica
de memoria o adjudicacion no se convierte en cero. Tiempo y memoria solo pueden
ser plenamente comparables con corpus, hardware, concurrencia y metodo
equivalentes.

La baseline final `solguard-measurement-baseline.v1` exige evidencia
`core_bound`, un manifest offline completo, todos los outputs requeridos, cada
finding en el ledger y firma Ed25519. `core_bound` se recomputa contra el
commit/tree limpio de `solguard-core` del lock para exactamente las nueve
colecciones: v1-v8 lo incluyen en `reproducibility.toolchain.repos`; labs en
`analysis_toolchain.repos` y en un `core_source_tree` reconciliado. Los
self-hashes de los execution contracts, componentes, runner y comando tambien
se verifican; una etiqueta no sirve como evidencia. La baseline embebe el
inventario semantico completo y los hashes de measurement, ledger y comparison.
Finalizacion y verificacion vuelven a comprobar los bytes y las ausencias de la
baseline historica; una aparicion, desaparicion o mutacion invalida la
comparacion.

## Replay de fase 1

Los runners productivos no se duplican:

- `full-run.sh --flow legacy --tier release` para v1-v8;
- `labs-v2/run.sh` en `audit_only`, con FILTER obligatorio, para los 90 labs.

Se ejecutan secuencialmente sobre un root ausente o vacio mediante el subcomando
`current-pipeline.mjs run`. Cada invocacion `run` exige tanto
`--signing-private-key` como `--signing-public-key`, rechaza receipts, journals u
outputs previos, valida el lock antes y despues del comando y demuestra que los
intervalos no se solapan. No admite resume: si falla o se interrumpe hay que
preparar un root nuevo. La duracion historica real fue 8 h 36 min para v1-v8 y
5 h 08 min para labs. Por ello los ejecuta el operador, no un worker con limite
inferior a una hora. El runbook exacto y los comandos PowerShell estan en
`solguard-deploy/scripts/measurement/README.md`.

Ambas ejecuciones superan tambien cinco horas, pero son vitales para aceptar la
fase 1; por eso se mantienen como comandos exclusivos del operador y se
ejecutan secuencialmente. Deben preservarse el root completo, las lineas
`completed command=... receipt=...`, `finalized baseline=... comparison=...
path=...` y `verified baseline=...`, junto con `pipeline-measurement.json`,
`loss-ledger.json`, `comparison.json` y `measurement-baseline.json` bajo
`_measurement/current`.

## Holdout futuro: politica y mecanismo, no cohorte real

La politica publica `solguard-holdout-policy.v1` exige una cohorte one-shot,
disjunta por target, lineage, forks, familia de protocolo, familia de
vulnerabilidad y corte temporal, con controles limpios y custodia separada.
Cada booleano queda en el manifest privado y se liga a un hash de evidencia.
v1-v8 y labs-90 estan excluidos.

Un custodio externo, independiente del desarrollo, debe crear fuera del parent
que contiene todos los repos Solguard:

- manifest privado con targets, sources fijados, ground truth y plan de
  adjudicacion;
- nonce aleatorio privado de al menos 32 bytes;
- payload cifrado segun un perfil permitido; la identidad e independencia de
  sus recipients es gobernanza externa y no la demuestra este validador;
- clave privada Ed25519 y recibo privado de custodia.

El commitment publico contiene solo un ID opaco, hashes de policy y corpus
conocido, una raiz Merkle global, hash/tamano del ciphertext, agregados
autorizados, trigger de reveal, key ID, self-hash y firma. El contrato rechaza
nombres, locators, ground truth, salts, nonces y otros campos secretos en el
documento publico. Publicar hashes individuales tampoco seria seguro frente a
ataques de diccionario.

Un commitment prueba integridad y autenticidad bajo la clave suministrada, no
independencia ni un timestamp externo. Una publicacion externa puede aportar un
limite `not-after`, pero `sealed_at` por si solo procede del caller. Los fixtures
sinteticos solo validan el mecanismo y no constituyen el holdout del producto.
Hasta que un custodio externo entregue material privado real, publique el
commitment y la frontera aislada de fase 13 exista, el estado honesto es:

```text
policy contract: designed and versioned
policy freeze: pending external signed commitment
mechanism: implemented and tested with synthetic fixtures
canonical known-regression replay: pending operator execution
core-bound baseline: not produced yet
real private cohort: not supplied
real public commitment: not supplied
holdout: not opened and not executed
evaluation_eligible: false
```

No se debe inventar un cohort ni afirmar que quedo sellado material real si el
custodio todavia no lo ha proporcionado.
