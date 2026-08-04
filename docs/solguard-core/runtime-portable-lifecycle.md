# Ciclo de vida portable de una ejecucion

Esta pagina describe como un tercero puede reproducir `resume`, cancelacion y
recovery sin convertir rutas locales en autoridad. La matriz queda fijada al
ledger autoritativo revision 132: C2-020..C2-023 estan aceptadas bajo
`development` / `single-custodian`, con `independence_claim: forbidden`. Ese
nivel no satisface produccion, que sigue exigiendo custodios independientes.

El commit de esta pagina no se autoacepta. En su corte de validacion, C2-024 es
una candidata pendiente; cualquier aceptacion posterior debe derivarse del
ledger, no de este documento, una rama, una PR o un merge. Tampoco se declara
aceptado RUN-208 ni readiness de release.

El inventario mecanico de este documento vive en
[`runtime-portable-lifecycle.v1.json`](./runtime-portable-lifecycle.v1.json).

## Contratos e identidad

Una ejecucion se identifica por `run_id` y `run_spec_root`. Sus productos se
cierran con `solguard-run-artifact-manifest.v1` y
`solguard-product-artifact-manifest.v1`; cada entrada liga `artifact_id`, `role`,
digest SHA-256, tamano y un `solguard-artifact-complete-marker.v1` exacto. El cierre terminal usa
`solguard-run-terminal-state.v1` con uno de cuatro resultados exactos:
`succeeded`, `failed`, `cancelled` o `completed_with_debt`.

Los nombres de archivo, paths absolutos, el directorio de trabajo y `mtime` son
observaciones de transporte, nunca claves de seleccion. Los manifests y el
estado terminal son create-only. Un segundo contenido para una identidad ya
publicada se rechaza en vez de sobrescribirse.

## Resume reproducible

1. Fijar los commits de merge y verificar los arboles de la matriz de
   implementacion que aparece al final.
2. Resolver la ejecucion mediante `run_id`, `run_spec_root` y
   `artifact_manifest_root`.
3. Resolver cada input por `artifact_id` y `role` mediante
   `POST /runs/:run_id/artifacts/resolve`.
4. Verificar root del manifest, digest, tamano y marcador de completitud de
   todos los payloads antes de ejecutar el siguiente nodo abierto.
5. Reanudar solo una ejecucion no terminal. Un terminal existente es inmutable
   y no puede volver a `running`.

No se permite buscar un artefacto por un nombre conocido ni aceptar el primer
archivo que aparezca en una carpeta compartida. La ausencia de una identidad
produce un error explicito; no produce un exito vacio.

## Cancelacion y recibo terminal

`POST /runs/:run_id/attempts/:attempt_id/cancel` solicita la cancelacion, pero
la respuesta HTTP no decide por si sola el resultado terminal. La terminacion
normal y la cancelacion compiten por una unica escritura create-only. El
resultado autoritativo se obtiene con
`GET /runs/:run_id/attempts/:attempt_id/terminal-receipt` y debe ligar la misma
identidad de ejecucion e intento.

Si la salida del proceso gana la carrera, el recibo conserva su resultado
real; el adaptador no lo reescribe como `cancelled`. Si la cancelacion gana,
las escrituras tardias se rechazan y tampoco pueden reemplazar el recibo.

## Recovery y replay portable

El replay parte de un almacen de identidades vacio. Primero valida el manifest
completo y todos los payloads y solo entonces publica. Un digest corrupto, una
raiz extranjera, una entrada parcial o una identidad incompatible aborta el
replay sin escrituras parciales. La migracion 208 de `solguard-database`
mantiene las filas de manifest inmutables y preserva el indice por identidad y
role.

Una vez recuperados los bytes, Backend puede exponerlos mediante
`POST /runs/:run_id/artifacts/expose`. La respuesta transporta manifest,
artefactos y estado terminal; no revela paths internos como autoridad.

## Matriz de fallo cerrado

| Condicion | Resultado requerido |
| --- | --- |
| `run_spec_root` distinto | rechazo antes de leer un payload |
| manifest root distinto | rechazo sin fallback por ruta |
| digest o tamano corrupto | rechazo sin publicacion parcial |
| marcador incompleto | rechazo de la entrada |
| `artifact_id` o `role` ausente | error explicito, nunca exito vacio |
| estado terminal existente | resume prohibido e identidad inmutable |
| carrera cancel/process-exit | prevalece el primer recibo terminal valido |

## Reproduccion local

En checkouts limpios fijados a los commits de merge de la matriz, el validador
comprueba que cada commit de implementacion aceptado y cada head validado es
ancestro del merge, que sus arboles son exactos y que el replay usa los mismos
bytes de Core y Backend:

```bash
# desde solguard-docs; las cuatro rutas apuntan a checkouts limpios
node scripts/validate-runtime-lifecycle-docs.mjs --verify-repositories \
  --core-repo ../solguard-core \
  --database-repo ../solguard-database \
  --backend-repo ../solguard-backend \
  --deploy-repo ../solguard-deploy

# replay completo sobre un almacen de identidades vacio
node ../solguard-deploy/scripts/contracts/portable-run-replay.mjs \
  --core-repo ../solguard-core \
  --backend-repo ../solguard-backend \
  --json

# rechazo documental adversarial
node scripts/validate-runtime-lifecycle-docs.mjs --negative-self-test
```

El vector aceptado produce `terminal_root`
`sha256:e3228bf66d8ac761dedcb3c0d0817d58287cdb69286eba1f735a68d1ce6dcc0b`
y `replay_root`
`sha256:b54f74132e581fb5290500893737e29efcfac651cb4896d7bf9e8bda011b9336`.
Estos comandos verifican contratos y checkouts; no escriben el ledger ni aceptan
una contribucion o un gate.

## Matriz de implementacion aceptada en revision 132

| ID | Repositorio | Implementacion aceptada | Merge reproducible | Arbol publicado | Revision |
| --- | --- | --- | --- | --- | --- |
| C2-020 | solguard-core | `27f1ab9595b6c30fe285896b59b5a084c68a0c3b` | `fea9ae6fb733ce34070bff305d4dd3b3f8717292` | `ac38d4a0953bddbe7b5f64d2bea648ec65526fda` | 125 |
| C2-020A | solguard-database | `6b6529c6444705207e00db3dba4c1a3683b04bf5` | `437ef555ce07b204630688ef4a04d523d1977e24` | `5723feefd4a5335d9de377bad34c83289e6cd132` | 126 |
| C2-020B | solguard-backend | `79680a3d3679f1ef3cd5bac8bb6766a2b61178bb` | `982952427f9d9a6ec0b9564cb19d4a9382629151` | `555606e0a4192223ca104578b9add56ee27dc4af` | 127 |
| C2-020C | solguard-deploy | `bb2e47b905631a86e8112fde64892fe48d51eeef` | `92d4b21c3edd86e3b31ee1c168b0d3f98ef7eb5a` | `8ddf74af9edbbd0bbb107d02516b5ea40e2ea5d0` | 128 |
| C2-020D | solguard-deploy | `9ad66e0d2fcf1e3100c2d76d2fdb2bdf29ba36d5` | `4c6b781f392af67cd2aa7738855923789b156097` | `bd879e1210a172f59178d928b654c35d95661eae` | 129 |
| C2-021 | solguard-core | `fb7b3e683d87afec41a9df7b8c7ab0a408f7124f` | `8565000e01ec6516b35a6729ab7734902126be14` | `ce879826da22d58f6993c79b9668e3dcbd03cb4f` | 130 |
| C2-022 | solguard-backend | `a3bce94f1cc4fb69baede779d88beb7045328e25` | `eda9f7c989ad01f3ee6ab7674103003e20f0ddce` | `84b83c48cd80d7f016f43b18783d8a9aff6e44cc` | 131 |
| C2-023 | solguard-deploy | `0c16e5d53578e870ce301cc5f2f3ca2faa0dcd71` | `88403b89d08eede9eea775a6553bf7082a233f3c` | `6859a96f211bc2e1eee6dfac9f1c1852aea5b800` | 132 |

El commit de implementacion es la identidad aceptada por el ledger. El merge
publica el arbol corregido que lo contiene junto con la validacion formal. Esta
matriz no cierra por si sola RUN-208.
