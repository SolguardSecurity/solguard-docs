# Integridad de fuentes y cadena MAP -> TRACE -> FILTER

Este contrato responde una pregunta anterior a cualquier deteccion: que bytes
formaban realmente el protocolo auditado y que arbol fisico consumio cada fase.
No mejora recall por si mismo, pero evita que un resultado aparentemente limpio
proceda de otro ZIP, otro mirror, un checkout mutable o un source cambiado entre
MAP, TRACE y FILTER.

## Tres identidades distintas

Para un target ZIP se conservan tres identidades y no se intercambian:

1. `transport_bytes` y `transport_sha256` describen el archive recibido. Son
   telemetria de transporte. Dos mirrors pueden producir ZIPs distintos por
   compresion o wrapper y seguir representando el mismo source.
2. `solguard-materialized-source-tree.v1` describe el arbol regular despues de
   validar el ZIP, resolver de forma segura links internos y retirar, cuando
   aplica, un unico wrapper de raiz. Ordena paths UTF-8 por bytes y liga tipo,
   path, longitud y SHA-256 del contenido de cada fichero. Este digest es la
   autoridad semantica comun entre mirrors, cache, Deploy y Core.
3. `solguard-source-integrity-stage-receipt.v1` demuestra que MAP, TRACE o
   FILTER rehashearon ese mismo arbol antes y despues de usarlo y liga el
   artefacto exacto producido por la fase.

El catalogo fija un commit Git inmutable de 40 caracteres y
`snapshot_tree_sha256` tanto para el source base como para cada componente.
`protocols-scan.json` proyecta la misma autoridad como `source_tree_sha256`.
Un hash raw del ZIP no sustituye el tree hash y el tree hash no oculta los bytes
raw observados. Todos los locators y mirrors declarados para una fuente deben
materializar el mismo tree hash; una divergencia falla cerrada.

## Handoff HTTP obligatorio para ZIP

Los ocho runners `protocols-v1.mjs` a `protocols-v8.mjs`, el runner scan-only y
los dos runners de labs forman los once callers HTTP de analisis. Todos usan el
mismo materializador y envian el objeto cerrado:

```json
{
    "schema_version": "solguard-source-authority-handoff.v1",
    "transport_bytes": 123,
    "transport_sha256": "<sha256-raw-del-zip>",
    "materialized_tree_sha256": "<sha256-del-arbol-materializado>"
}
```

Core exige este handoff para todo target `.zip` y lo rechaza para un directorio
local o un repositorio Git. Verifica bytes y hash sobre el mismo handle estable
que usa para inventariar y extraer, recompone el tree hash y publica de forma
create-only:

```text
tool-outputs/source/source_authority.json
```

Su schema `solguard-source-authority-receipt.v1` anade conteos de ficheros,
directorios y bytes materializados, ademas del wrapper retirado si existe. El
backend solo transporta request, receipt y
`AnalyzeOutputs.source_authority_json`; no decide su validez.

## ZIPs y nombres reservados de Windows

La admision conserva las defensas normales: UTF-8/NFC, paths relativos, cero
traversal, cero colisiones portables, limites de entradas/bytes, CRC valido,
tipos permitidos y links internos confinados. Un symlink interno seguro se
expande como contenido regular; nunca se crea un symlink del host.

Windows reserva nombres como `AUX`, `CON`, `PRN`, `NUL`, `CLOCK$`,
`COM1`-`COM9` y `LPT1`-`LPT9`, incluso con extension. Un repositorio real puede
contenerlos. Tras pasar todas las demas validaciones, Core conserva el nombre
logico exacto y materializa solo esos paths mediante el namespace verbatim
absoluto de Windows. No los renombra ni los omite. MAP y TRACE reciben la raiz
canonica/verbatim y pueden enumerar y abrir esos hijos. Nombres con caracteres
prohibidos, trailing dot/space, traversal o colision case-fold siguen siendo
invalidos.

## Exclusión por proyecto hasta terminar la respuesta

Core adquiere un lease exclusivo respaldado por el sistema operativo antes de
resetear o extraer el proyecto. La clave deriva de la raiz canonica de proyectos
y de la identidad del proyecto; el fichero de lock vive fuera del arbol mutable.
Dos analisis del mismo proyecto no se solapan, mientras proyectos distintos
siguen siendo concurrentes. El proceso libera automaticamente el byte-range
lock si muere.

`AnalysisResponseLease` viaja de Core al adaptador Axum como campo no
serializado. El backend lo conserva hasta que termina de serializar y descartar
la respuesta HTTP. Por tanto, otro request del mismo proyecto no puede resetear
source o outputs mientras la respuesta anterior aun se esta construyendo.

## Cadena fisica entre fases

Para una fuente ZIP autoritativa, Core recompone el arbol antes y despues de
MAP, TRACE y FILTER, y de nuevo antes de devolver el resultado. Antes de cada
fase publica un input cerrado:

```text
tool-outputs/source/map.source_integrity.json
tool-outputs/source/trace.source_integrity.json
tool-outputs/source/filter.source_integrity.json
```

Cada herramienta produce `<fase>/source_integrity.json` con schema
`solguard-source-integrity-stage-receipt.v1`. El receipt liga contrato de input,
raiz canonica/verbatim, tree hash, hashes pre/post y el artefacto fisico exacto:

| Fase   | Input adicional                                   | Artefacto ligado      |
| ------ | ------------------------------------------------- | --------------------- |
| MAP    | `--source-integrity`                              | `audit_map.json`      |
| TRACE  | `--source-integrity` y `--map-source-integrity`   | `index.json`          |
| FILTER | `--source-integrity` y `--trace-source-integrity` | `filter_results.json` |

TRACE reabre y valida el receipt MAP contra el `audit_map.json` fisico que
consume. FILTER hace lo mismo con el receipt TRACE y su `index.json`. Core no
confia en el eco de la herramienta: vuelve a validar cada receipt y publica
`tool-outputs/source/<fase>.source_integrity.core.json` con schema
`solguard-source-integrity-core-receipt.v1`. Un path movido, tree distinto,
artefacto sustituido, receipt stale, link/reparse point, drift pre/post o
upstream ausente detiene la autoridad terminal. Un fallo de herramienta puede
registrar solo `source_verified_tool_failed`; no fabrica una fase sana.
Una invocacion manual standalone puede omitir los flags por compatibilidad,
pero entonces no crea autoridad de integridad orquestada ni puede satisfacer un
gate de salud de producto.

## Dos cierres relacionados

El modo MAP `--fast` no ejecuta inferencia de rutas economicas. Aun asi publica
un `economic_route_graph.v1` canonico y content-addressed, con roots/fragments
vacios y cobertura `coverage_debt`. Declara
`economic_route_graph_not_produced:fast_mode` y contabiliza cada entrypoint no
representado. TRACE puede consumirlo para diagnostico, pero no convertir esa
ausencia deliberada en evidencia negativa.

Por otra parte, `evidence_items[]` de TRACE nunca publica `line=0`. Durante el
ensamblado, una observacion target-wide solo puede heredar la linea del target
si pertenece al mismo fichero canonico. Una observacion con linea cero para un
fichero extranjero falla cerrada, y la frontera de publicacion rechaza cualquier
descriptor que permanezca sin localizar. Esto impide atribuir evidencia de otro
fichero al target por un fallback de linea.

La frontera superior tambien es cerrada: cada `evidence_items[*]` declara
`source=solguard-trace` y exactamente un ID canonico `trace-evidence-v1-*`. El
slot top-level separado `solguard_map_context` esta presente pero puede ser
`null`; sus copias conservan autoridad MAP y nunca entran en el ledger nativo.
El `target.id` publicado coincide exactamente con el `map_function_id`
seleccionado, no con un ID local del parser. Compact publica un unico
`physical_source_binding`; deep Vyper/Python publica un unico binding de funcion
del lenguaje correspondiente.

## Ceremonia de catalogo

`source-authority-seal.mjs` separa cuatro acciones:

- `create` descarga locators/mirrors, registra bytes y hashes raw, exige arboles
  materializados iguales y crea `solguard-source-authority-seal.v1`;
- `verify` valida schema cerrado, denominadores, comparaciones y self-hash;
- `apply` adquiere un lease exclusivo y actualiza en una sola transaccion los
  catalogos legacy, catalogos scan, ground truth, known-corpus exclusion y
  `solguard-source-authority-application.v1`;
- `finalize` rehashea todos los ficheros derivados, revalida que el application
  receipt ya persistido liga seal y derived commitment, y publica create-only
  un `solguard-source-authority-finalization.v1` firmado. Una rotacion de un
  tree hash ya declarado exige `solguard-source-authority-rotation.v1` auditado.

La transaccion usa ficheros parciales create-only, compare-and-swap sobre el
original, backups, `fsync`, journal append-only y rollback/recovery. Un crash no
puede dejar una mezcla silenciosa entre `protocols.json`, `protocols-scan.json`,
ground truth y known corpus.

Estado documental actual: la implementacion esta presente, pero su verificacion
final de lifecycle y la ceremonia real siguen pendientes. Hasta que
`create`, `verify`, `apply` y `finalize` terminen sobre los catalogos reales y se
conserven el application receipt y el finalization marker, la autoridad de
catalogo y la regeneracion del known corpus no estan aplicadas. Tests parciales
o sintéticos no cambian ese estado.

La CLI firmada ya esta cerrada. `create`, `apply` y `finalize` requieren la
clave privada y la clave publica; `verify` solo necesita la publica. Todos usan
el `key-id` fijado por el repositorio, `solguard-phase1-20260717`, y la publica
fijada por `config/source-authority/trust-root.v1.json`. Las claves privadas no
se guardan en Git ni se escriben en logs. Este es el runbook exacto, usando
placeholders solo para paths externos y un output fresco fuera del repositorio:

```powershell
$deploy = 'ABSOLUTE_PATH_TO_SOLGUARD_DEPLOY'
$ceremonyRoot = 'FRESH_ABSOLUTE_PATH_TO_SOURCE_AUTHORITY_OUTPUT'
$privateKey = 'ABSOLUTE_PATH_TO_ED25519_PRIVATE_PEM'
$publicKey = Join-Path $deploy 'config\source-authority\solguard-phase1-20260717-ed25519-public.pem'
$keyId = 'solguard-phase1-20260717'
$seal = Join-Path $ceremonyRoot 'source-authority-seal.v1.json'
$suites = 'v1,v2,v3,v4,v5,v6,v7,v8'

Push-Location $deploy
try {
  npm run benchmark:source-authority -- create `
    --deploy-root $deploy `
    --output $seal `
    --suites $suites `
    --signing-private-key $privateKey `
    --signing-public-key $publicKey `
    --signing-key-id $keyId
  if ($LASTEXITCODE -ne 0) { throw "source authority create failed: $LASTEXITCODE" }

  npm run benchmark:source-authority -- verify `
    --input $seal `
    --signing-public-key $publicKey `
    --signing-key-id $keyId
  if ($LASTEXITCODE -ne 0) { throw "source authority verify failed: $LASTEXITCODE" }

  npm run benchmark:source-authority -- apply `
    --deploy-root $deploy `
    --input $seal `
    --suites $suites `
    --signing-private-key $privateKey `
    --signing-public-key $publicKey `
    --signing-key-id $keyId
  if ($LASTEXITCODE -ne 0) { throw "source authority apply failed: $LASTEXITCODE" }

  npm run benchmark:source-authority -- finalize `
    --deploy-root $deploy `
    --input $seal `
    --signing-private-key $privateKey `
    --signing-public-key $publicKey `
    --signing-key-id $keyId
  if ($LASTEXITCODE -ne 0) { throw "source authority finalize failed: $LASTEXITCODE" }
} finally {
  Pop-Location
}
```

El fichero `$seal` debe estar ausente antes de `create`. El seal queda firmado
con Ed25519 y liga el denominador exacto y ordenado `v1`-`v8`, cada source,
mirror y tree hash. `apply` crea un UUID de transaccion nuevo y publica dentro
de la misma transaccion el application receipt tambien firmado. Ese receipt
liga el seal, las transiciones de source, los ficheros derivados, su commitment
y el denominador de known corpus formado exactamente por `v1`-`v8` mas
`labs-90`.

Cada record del journal esta firmado, encadenado por hash y ligado al UUID, al
seal, al plan exacto, a las identidades fisicas y a los paths de la transaccion.
La recuperacion rechaza un journal stale o replayed que no reconcilie con el
application receipt firmado actual. Un journal se conserva para recuperacion
cuando la transaccion no puede cerrarse; despues de un commit verificado se
elimina. `finalize` toma un lease de lectura, reabre el seal y el application
receipt, rehashea los derivados y revalida denominadores y commitments. Despues
firma y publica de forma create-only el marcador determinista en
`benchmarks/source-authority-finalizations/<application-receipt-document-sha256>.v1.json`.
No reescribe catalogos.

Los consumidores normales no aceptan solo un seal o application receipt. Bajo
un lease compartido cargan la raiz Ed25519 fijada por el repositorio y exigen el
application receipt firmado, su marcador de finalizacion firmado, el
denominador exacto y ordenado `v1`-`v8` mas `labs-90`, y todos los hashes de los
ficheros derivados. Una ausencia, firma distinta, marker stale o byte derivado
modificado falla cerrado. La lectura de autoridad sin finalizar queda limitada
al interior de las transacciones `apply`/`finalize`, con lease y purpose
explicitos; no es un bypass para runners, preflight ni canarios.

Esa lectura se implementa con `withSourceAuthorityRead`, no con un `verify`
seguido de aperturas raw. El lease compartido fija el root fisico y la generacion
del application receipt; el callback recibe un capability opaco que expira al
terminar. Cada accessor acepta solo un path derivado exacto ya descrito por el
receipt y verifica desde un handle acotado identidad fisica, longitud, SHA-256 y
JSON estricto. Despues del callback, incluso ante error, se vuelven a comprobar
lease, root y la misma finalizacion.

Los procesos hijos no reciben ese objeto in-process. El runner crea un capability
de proceso separado, corto, ligado a la generacion y a su ascendencia. Un
watchdog single-flight verifica capability y estabilidad del lease; si se pierde
cualquiera o cambia el root fisico, termina y drena todo el Job Object en Windows
o process group en Unix. El cierre normal del lider tambien elimina descendientes
residuales.

La unica escritura de catalogos permitida es `apply`. El script
`materialize-scan-catalogs.mjs` acepta exclusivamente `--check`; tanto
`npm run benchmark:scan-catalogs` como
`npm run benchmark:scan-catalogs:check` son aliases read-only de esa misma
comprobacion byte-exacta y nunca regeneran `protocols-scan.json`.

Si un custodio externo hubiera ligado un holdout a un hash anterior del known
corpus, la actualizacion exige un commitment nuevo y versionado; nunca se edita
el compromiso anterior ni se abre la cohorte para adaptar la migracion. En el
estado actual no existe un commitment real publicado que rotar.

## Limite de la evidencia

`labs-v1` conserva 8 labs legacy solo para `regression` o `targeted`; nunca es
release/measurement eligible ni satisface el receipt de 90 labs. `labs-v2` es
la unica superficie canonica de 90 labs y exige el denominador completo en
`release` y `measurement`. El gate v3 separa `measurement_integrity` de
`product_health`: una medicion coherente con salud fallida siempre conserva
`product_release_eligible=false`, mientras release exige salud estricta.

La cadena de fuente, los contratos dirigidos y sus tests demuestran integridad
operacional, no deteccion superior. Los selectores exactos
`v1:Compound-Finance`, `v1:Monad`, `v2:Size`, `v2:LoopFi`, `v4:Morpheus`,
`v5:Timeswap`, `v6:Morpheus` y `v8:Vyper` deben ejecutarse en roots nuevos y
aprobar product health con `filter_results.json`. Esta es una condicion
pendiente, no el registro de que ya hayan sido ejecutados o aceptados. Solo
entonces se puede preparar otro root v1-v8. Incluso ocho canarios limpios y un
replay conocido limpio siguen siendo regresion conocida: no demuestran precision
independiente, recall ciego ni generalizacion a bugs nuevos.
