# Ciclo de vida portable de una ejecucion

Esta pagina describe como un tercero puede reproducir `resume`, cancelacion y
recovery sin convertir rutas locales en autoridad. La superficie esta preparada
en contribuciones draft y permanece pendiente de verificacion independiente:
no es una declaracion de aceptacion de RUN-208 ni de readiness de release.

El inventario mecanico de este documento vive en
[`runtime-portable-lifecycle.v1.json`](./runtime-portable-lifecycle.v1.json).

## Contratos e identidad

Una ejecucion se identifica por `run_id` y `run_spec_root`. Sus productos se
cierran con `solguard-run-artifact-manifest.v1` y
`solguard-product-artifact-manifest.v1`; cada entrada liga `artifact_id`, `role`,
digest SHA-256, tamano y marcador de completitud. El cierre terminal usa
`solguard-run-terminal-state.v1` con uno de cuatro resultados exactos:
`succeeded`, `failed`, `cancelled` o `completed_with_debt`.

Los nombres de archivo, paths absolutos, el directorio de trabajo y `mtime` son
observaciones de transporte, nunca claves de seleccion. Los manifests y el
estado terminal son create-only. Un segundo contenido para una identidad ya
publicada se rechaza en vez de sobrescribirse.

## Resume reproducible

1. Fijar los commits de la matriz de implementacion que aparece al final.
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

En checkouts limpios fijados a los commits de la matriz:

```powershell
# solguard-core
cargo test --workspace portable_artifact_manifest

# solguard-database
npm.cmd --prefix apps/db-connector test

# solguard-backend
cargo test --locked controllers::run_artifacts

# solguard-deploy
node scripts/contracts/portable-run-replay.mjs

# solguard-docs
node scripts/validate-runtime-lifecycle-docs.mjs
node scripts/validate-runtime-lifecycle-docs.mjs --negative-self-test
```

Estos comandos verifican contratos locales. No sustituyen la verificacion
independiente, no validan GitHub Actions y no aceptan las contribuciones.

## Matriz de implementacion pendiente

| ID | Repositorio | Commit preparado |
| --- | --- | --- |
| C2-020 | solguard-core | `14595a76dda8c7bfde0c8a962f0af879de99f09a` |
| C2-020A | solguard-database | `b37bfe66facf985bb2701778288df90d425c72c8` |
| C2-020B | solguard-backend | `c5c60894165df6fe9e5e4d3b019ba19662be25e4` |
| C2-020C | solguard-deploy | `0d94e3dcc3f8331c5bd59403f35b7eebb67a3bc4` |
| C2-020D | solguard-deploy | `56141d2d44a34a2b9c7f173e687a8ad5724b8dbc` |
| C2-021 | solguard-core | `eacc2c9603499fad165a3400be1a1917b4e278a8` |
| C2-022 | solguard-backend | `6b1a6f8f3868264c96b136c959100dcda5ff6db3` |
| C2-023 | solguard-deploy | `8384ce1120c8c2361264ffaf42556b6455005982` |

Cada referencia corresponde a una implementacion draft y pending. Su presencia
en esta matriz no implica merge, aceptacion del ledger ni cierre de RUN-208.
