# Changelog

`solguard-agents` es la capa de coordinacion. Este archivo no describe codigo de
producto ni atribuye mejoras de deteccion.

## 2026-07-24 - Coordinación de autoridad física y estado canario r6

Commit de coordinación: `c8b92dac9dbf5e9ba9cfd6cb13589e0e62c56169`.

- Se alinea el routing con el ledger MAP canónico, bindings callable exactos,
  TRACE exact-empty, proyecciones físicas/retained separadas y la propagación
  de autoridad hasta FILTER.
- Se documenta que linaje semántico y evidencia física son conceptos distintos:
  solo un item MAP/TRACE canónico puede autorizar, y un artefacto derived no
  puede autoinscribirse por copiar un ID.
- Core queda como owner del bundle candidate-directed vacío, la selección
  INVARIANT, el inventario FILTER y el paso del `value/attack_paths.json`
  físico. Deploy queda como owner de recomponer exactamente esas autoridades,
  no de redefinirlas.
- Se conserva la secuencia real r3-r6: r3 falló en FILTER, r4 después del
  candidate-derived, r5 por inventario FILTER y r6 solo en el gate Deploy
  desfasado. La reevaluación offline corregida pasa, pero no reescribe el root
  ni equivale a acceptance 8/8.
- El registry de identidades mantiene la paridad byte-exacta de las siete
  copias TRACE y el workflow añade smokes cruzados; una coincidencia de bytes no
  sustituye revisión semántica.
- La ampliación FILTER del verificador `source-integrity.v1` se promovió al
  contrato común: MAP, TRACE y FILTER contienen los mismos bytes y
  `registry/contract-identities.json` fija la nueva identidad. El validador
  bloquea cualquier deriva posterior.
- El mismo inventario actualiza las identidades de las siete copias
  `trace-consumer-contract.v2` y de las dos copias
  `map-target-route-consumer.v1`. En este último, VALIDATE y FILTER exigen
  endpoints de símbolo exactos para toda arista callable resuelta.

### Verificación factual disponible

- Compound `r6`: runner 1:02:25, todas las fases completed,
  `filter_results.json` presente, 559 candidatos, 5 soportados, 225 review y
  1/1 match conocido.
- Deploy: 1.114 tests descubiertos, 1.106 correctos, 0 fallos y 8 omitidos.
- Tres tests cruzados de contrato ejecutados por setup pasaron.

### Límites y riesgos residuales

- Falta prebuild definitivo, aceptación 8/8, v1-v8, labs, finalize/verify y
  holdout de esta identidad.
- Compound es regresión conocida; no demuestra precisión ni generalización.
- CI remoto continúa pendiente y los skips de entorno no se presentan como
  ejecutados.
- Los tamaños físicos y de proyección son límites de admisión, no mediciones de
  memoria o rendimiento.

## 2026-07-22 - Incidente r4 y atestacion runtime cerrada

- Se registra que `professional-r4` sello 14 repositorios y 24 binarios, pero
  su unico canario, `v1:Compound-Finance`, fallo en 6.823 ms dentro del arranque
  con `Managed backend runtime attestation mismatch`. Bun y Rust escucharon,
  pero no se alcanzo el preflight de modelo del runner, MAP ni deteccion. Los
  otros siete canarios y la cadena release no se ejecutaron; r4 queda consumido.
- El artefacto solo conserva el error generico. Una reproduccion aislada con el
  Backend real confirmo hashes correctos y una diferencia de representacion:
  Rust canonicalizo paths Windows existentes a `\\?\...`/nombre largo mientras
  el runner comparaba lexicalmente. No se atribuye al artefacto r4 una causa mas
  granular de la que realmente registro.
- Deploy centraliza ahora v1-v8 y labs en un evaluador de atestacion que comprueba
  estado, servicio, dos hashes, keys exactas, trece paths runtime y un source
  root. Live compara identidad fisica existente; la aceptacion offline conserva
  igualdad lexical. Los diagnosticos exponen campos, no valores o secretos.
- La clausura legacy pasa a 36 componentes: 25 modulos JavaScript alcanzables y
  11 recursos. El schema no cambia y el worker oracle-free conserva sus 29.
- Prebuild ejecuta un smoke Bun/Rust real antes de publicar el receipt y setup lo
  repite antes de Ollama. No analiza protocolos ni usa el modelo; exige
  non-disclosure, atestacion de 14 paths y cleanup bajo Job Object/process group.
- La validacion local final registrada por Deploy fue 1.082 tests descubiertos,
  1.074 superados, 0 fallidos y 8 omitidos en 131,5995386 s; un smoke real final
  termino en 815 ms. Esto no es evidencia de recall,
  precision, ruido, velocidad de scan ni generalizacion.

## 2026-07-22 - Autoridad de snapshots y retirada factual de r3

- El registro y el contexto global documentan que cada runner legacy v1-v8
  deriva una unica autoridad `SOLGUARD_LOCAL_SOURCE_ROOTS` de su snapshot
  sellado, crea el directorio antes de Backend y exige igualdad en la salud
  autenticada.
- `snapshot_dir` y el array exacto `local_source_roots` quedan ligados por el
  contrato de ejecucion y por la aceptacion 8/8. Ausencia, roots extra, paths
  hermanos o no canonicos y rehashes coherentes no son aceptables.
- Se conserva la clausura legacy de 35 componentes y el schema actual; la
  implementacion reutiliza un componente ya sellado.
- Se corrige el estado historico: el prebuild `r3` si termino, pero su primer
  canario Compound fallo antes de MAP porque el runner no concedio el snapshot
  local. Los otros siete canarios y toda la cadena posterior no se ejecutaron.
  `r3` queda preservado y retirado.
- El setup comprueba ahora los endpoints de benchmarks
  `4401-4408`/`5401-5408` y de labs `4490-4492`/`5490-5492` antes de arrancar la
  inferencia gestionada, fija las bases canarias en `4400/5400` y exige tres
  workers de labs sellados por el plan.

Nada de lo anterior constituye aceptacion 8/8, replay, mejora de deteccion o
evidencia de generalizacion.

## 2026-07-22 - Coordinacion del contrato runtime r3 de Ollama

El routing y los contratos compartidos registran una nueva precondicion de
reproducibilidad sin mover logica de deteccion entre repositorios:

- Backend posee la configuracion `OLLAMA_NUM_CTX` y envia
  `options.num_ctx=32768` por request a Ollama;
- Deploy posee `solguard-ollama-runtime-policy.v1`, que fija tambien
  `host=http://127.0.0.1:11435`, y sella
  `OLLAMA_NUM_CTX=32768`, `OLLAMA_CONTEXT_LENGTH=32768`,
  `OLLAMA_NUM_PARALLEL=1`, `OLLAMA_NOPRUNE=true` y `OLLAMA_VULKAN=true` en plan,
  lock, canarios y telemetria;
- el setup verifica el receipt de prebuild antes de iniciar su daemon gestionado
  y receipt-bound en `127.0.0.1:11435`, o procesos de scan, y ejecuta el probe
  `/api/generate` -> `/api/ps` antes de los canarios;
- el probe exige modelo y contexto exactos, tamano positivo y residencia GPU
  completa (`size_vram == size`);
- el preflight de los 90 labs se adelanta y verifica cada SHA mediante fetch
  exacto, `rev-parse` y `fsck` antes de una ejecucion de varias horas;
- la telemetria r3 conserva modelo, contexto y tamanos total/VRAM observados y
  exige su igualdad para salud release completa.

El receipt se verifica antes de Git, daemon, inferencia o scan. Liga Node, Git,
Git Bash, Ollama y `taskkill`; un Job Object Windows kill-on-close contiene el
daemon y sus runners y un fallo de cleanup impide devolver exito.
La identidad actual se escribe como `solguard-canary-release-binding.v2`; el
lector legacy se mantiene para evidencia historica, nunca para promoverla a r3.
La inhibicion de suspension de Windows reduce interrupciones mientras vive el
proceso, pero no garantiza el overnight frente a energia, reinicios, driver/GPU
o perdida de red posterior al preflight.

La suite local final de Deploy descubrio 1.066 tests: 1.058 pasaron, 0 fallaron
y 8 quedaron omitidos por condiciones declaradas, en 130,6 segundos. Tambien
pasaron PowerShell 5.1, `node --check` y `git diff --check`. Esto valida
contratos locales; no registra un prebuild, canario, replay o metrica r3.

`r2` se conserva como evidencia historica, pero no satisface esta identidad y
queda retirado para r3. No se registra ningun prebuild receipt r3, canario,
replay, `finalize` o `verify` como ejecutado. Precision, metricas finales y
generalizacion blind siguen abiertas.

## 2026-07-22 - Incidente del prebuild r1 y paridad TRACE

Tras el commit `0d1f1df` de Deploy y con los 14 repositorios requeridos limpios,
el primer prebuild `r1` se detuvo antes de compilar porque su gate byte-exacto
detecto tres estados incompatibles del contrato TRACE compartido:

- Core tenia 191980 bytes;
- Validate y Discover tenian 191984 bytes por una asercion que `rustfmt` 2024 y
  2021 representaban de forma distinta;
- FILTER tenia 176486 bytes y conservaba el contrato anterior, sin
  `generic_blind`.

No se publico ningun prebuild receipt, no se ejecuto ningun canario ni replay y
el root `r1` queda consumido: no debe reutilizarse.

La correccion sustituye la asercion sensible a la edicion por una forma estable
y sincroniza una unica identidad byte-exacta en siete ubicaciones: Core,
Validate, Discover, FILTER y los vendors de VALUE, ECONOMIC e INVARIANT.
`registry/contract-identities.json` las agrupa ahora bajo una sola identidad y
el prebuild de Deploy comprueba las siete antes de compilar. Esto cierra deriva
del contrato compartido; no demuestra recall, precision, velocidad ni
generalizacion.

## 2026-07-22 - Coordinacion de la nueva cadena de medicion

El contexto, las instrucciones de workers y el registry incorporan los
contratos implementados antes del siguiente replay:

- `generic_blind` obligatorio y verificado por los callers release de v1-v8 y
  labs mediante `solguard-runtime-policy.v2`;
- modos exclusivos bootstrap/comparativo en lock y baseline v2, sin reconstruir
  outputs historicos eliminados ni afirmar una mejora sin comparacion fisica;
- telemetria v3 de proceso, host, GPU, Ollama y storage con limites de
  atribucion explicitos;
- measurement v2 para tiempos, distribuciones, throughput, eficiencia y bytes de
  manifests firmados, manteniendo la precision real no disponible;
- un orquestador canonico: unico prebuild, ocho canarios secuenciales, 8/8,
  v1-v8 `--parallel 8`, labs solo tras exito y cierre mediante finalize/verify.

Esta coordinacion documenta contratos y routing. Los canarios, v1-v8 y labs no
se registran como ejecutados ni exitosos en este commit.

## 2026-07-22 - Coordinacion verificable de la macroauditoria

Commits previos incluidos en este cierre:

- `a6b5d14` - inventario e informes independientes de madurez;
- `8c691af` - ownership, grafo y grupos de contratos machine-checkable;
- `6fc1986` - identidades actuales de los contratos TRACE compartidos;
- `708bf0f` - identidad estricta entre el routing del registry y las guías de
  agentes instaladas.

### Inventario y separacion de ownership

La macroauditoria se registro bajo
`sprints/2026-07-22-infrastructure-maturity-audit/` antes de modificar producto.
Conserva:

- request y prohibiciones, incluido congelar canarios, v1-v8 y labs;
- baseline de 17 repositorios;
- plan por fases y criterio de aceptacion;
- tareas con ownership disjunto;
- cuatro informes estaticos: front-end, razonamiento, runtime y cross-cutting;
- matriz P0/P1 y estado de cierre.

Los informes iniciales se conservan como evidencia historica. No se reescriben
para aparentar que los defectos nunca existieron; `findings.md` registra por
separado el commit que cierra cada hallazgo y mantiene visible la ejecucion
remota pendiente de CI.

### Registry como autoridad de routing

`registry/repos.json` enumera los 16 repos no-agente y sus owners, upstream,
downstream, contratos, quick checks y release checks. La version actual tambien
registra:

- fronteras fisicas de MAP, TRACE, DISCOVER y Core;
- perfil TRACE `compatibility|generic_blind` y origen de señales;
- clausura Solidity cross-file y presupuestos exactos;
- API externa autenticada y bounded;
- EXPLOIT plan-only sin fallback al host;
- adquisicion Git sellada;
- autoridad efimera de secretos de Deploy;
- cierre scan de 29 componentes y legacy benchmark de 35 componentes.

El validador exige reciprocidad del grafo, owners validos, comandos presentes y
ausencia de claims ambiguos. También reabre físicamente las 16 guías
`agents/README.md` y exige que sus listas `Upstream` y `Downstream` sean
idénticas, incluido el orden, a la autoridad del registry. El resultado local
actual es:

- 16 repositorios registrados, mas `solguard-agents` como coordinador;
- 114 ownership claims;
- 16 guías de agentes vinculadas al routing autoritativo;
- 3 grupos de identidad contractual;
- 12 bindings de miembros dentro de esos grupos.

### Identidades compartidas

`registry/contract-identities.json` separa contratos que deben ser byte-identicos
de implementaciones independientes que solo comparten semantica. El gate actual
comprueba:

- contratos TRACE vendorizados por sus consumidores;
- contratos de source integrity compartidos;
- proyecciones de seleccion MAP/TRACE que requieren identidad exacta;
- rutas y hashes declarados sin seleccionar una copia arbitraria en runtime.

El consumidor `trace_contract_v2` de FILTER forma parte ahora de la identidad
byte-exacta compartida de siete copias. Su logica terminal de decision sigue
siendo independiente donde su responsabilidad difiere; esa equivalencia se
prueba por señales/fixtures y no se confunde con la paridad del consumidor
TRACE.

### Workflows

`scripts/validate-workflows.mjs` valida localmente los workflows registrados y
rechaza comandos no locked, gates ausentes o configuraciones incoherentes. La
ejecucion actual reconoce 16 archivos de workflow.

Esto demuestra que el YAML y los comandos declarados cumplen la politica local.
No demuestra que GitHub Actions remoto este verde: no se hizo push ni se
ejecutaron runners hospedados durante esta macroauditoria.

### Antes y despues

| Antes | Despues |
|---|---|
| informes aislados sin estado de cierre | matriz que conserva causa, owner, commit y residual |
| ownership descrito principalmente en prosa | registry validado y reciproco |
| copias criticas comparadas de forma ad hoc | grupos de identidad con hash y gate |
| guías capaces de conservar routing anterior Backend→Core | routing exacto contra el registry con prueba negativa de deriva |
| conteos Deploy 27/34 desfasados | contratos actuales 29 scan y 35 legacy |
| CI mencionado sin distinguir local/remoto | validador local explicito y ejecucion remota declarada pendiente |

### Verificacion

Comandos ejecutados:

- `node --test test/*.test.mjs`: 11/11 correctos;
- `node scripts/validate-coordination.mjs --json`: correcto;
- `node scripts/validate-workflows.mjs`: correcto, 16 workflows;
- parseo estricto de `registry/repos.json`: correcto;
- `git diff --check`: correcto.

### Limites

- No se ejecutaron canarios, benchmarks, labs ni holdout.
- Los estados de cierre prueban contratos y regresiones locales, no calidad de
  findings.
- Los hashes vendorizados deben actualizarse coordinadamente cuando cambia el
  contrato owner; el gate detecta deriva, pero no sustituye una revision
  semantica.
- GitHub Actions remoto y la futura aceptacion inmutable siguen pendientes.
