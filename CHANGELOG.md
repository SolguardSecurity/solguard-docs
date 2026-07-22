# Changelog

Este changelog registra cambios comprobables de la documentacion. No convierte
tests de contratos en evidencia de calidad de deteccion.

## 2026-07-22 - Incidente r3 y autoridad local exacta de benchmarks

- Se registro que el prebuild `professional-r3` si se completo y sello 14
  repositorios y 24 binarios. El setup verifico su receipt, el Ollama dedicado,
  el modelo con contexto 32768 y residencia GPU reportada completa, y los 90
  commits fijados antes de iniciar el primer canario.
- Se documento que `v1:Compound-Finance` fallo antes de MAP porque los runners
  legacy v1-v8 no trasladaban su snapshot sellado a
  `SOLGUARD_LOCAL_SOURCE_ROOTS`. Backend aplico correctamente la frontera de
  Core y rechazo el ZIP sin autoridad local explicita.
- Los runners derivan ahora exactamente una raiz local de
  `<suite-root>/snapshots`, la crean antes de Backend, la sellan junto a
  `snapshot_dir`, y exigen igualdad exacta en la salud autenticada. La
  aceptacion rechaza ausencia, roots extra, paths hermanos o no canonicos y
  contratos rehasheados de forma coherente.
- La clausura legacy permanece en 35 componentes y no cambia el schema del
  contrato. La cadena `r3` queda preservada y retirada; no se reintenta ni se
  reutiliza.
- Setup falla temprano si esta ocupado un endpoint de benchmarks
  (`4401-4408`/`5401-5408`) o de los tres workers de labs
  (`4490-4492`/`5490-5492`), antes de iniciar la inferencia gestionada. Las bases
  de los canarios se fijan en `4400/5400` y no se heredan de un entorno residual;
  el plan debe sellar exactamente tres workers de labs.
- No se documenta como ejecutado ningun otro canario, la aceptacion 8/8,
  v1-v8, labs, `finalize`, `verify` o holdout. Tampoco se afirma ninguna mejora
  de recall, precision, ruido, tiempo o generalizacion.

## 2026-07-22 - Contrato operativo r3 para Ollama

- Se documento que Backend fija `OLLAMA_NUM_CTX` por request en
  `options.num_ctx`; el default es `32768` y solo se aceptan enteros decimales
  canonicos entre `1` y `1048576`.
- Se documento la politica de release
  `solguard-ollama-runtime-policy.v1`: contexto exacto `32768`, GPU requerida y
  `gpu_backend=vulkan`, junto al host exacto `http://127.0.0.1:11435`. El host
  queda ademas ligado mediante el entorno semantico, acceptance y lock. El
  entorno sellado fija `OLLAMA_NUM_CTX=32768`, `OLLAMA_VULKAN=true`,
  `OLLAMA_CONTEXT_LENGTH=32768`, `OLLAMA_NOPRUNE=true` y
  `OLLAMA_NUM_PARALLEL=1`.
- Se documento que el runbook r3 rechaza un listener previo y arranca siempre
  el ejecutable Ollama ligado al prebuild receipt en el endpoint dedicado
  `http://127.0.0.1:11435`. Un Job Object Windows kill-on-close contiene daemon
  y runners; el listener debe pertenecer al PID gestionado y el cleanup debe
  liberar el endpoint antes de informar exito.
- Se incorporo el preflight que carga el modelo con `/api/generate` y despues
  exige en `/api/ps` una unica entrada del modelo solicitado, contexto exacto,
  tamano positivo y offload completo `size_vram == size`; ambas respuestas se
  consumen por streaming bajo un limite estricto de 1 MiB.
- Se documento que el receipt del prebuild debe validarse antes de Git, de
  arrancar un daemon Ollama gestionado y de cualquier inferencia o scan.
  El receipt liga ademas `taskkill` junto a Node, Git, Git Bash y Ollama. El
  catalogo finalizado de los 90 labs y cada commit fijado se comprueban antes de
  iniciar la matriz mediante fetch exacto, `rev-parse` y `fsck`, con
  concurrencia maxima cuatro y cleanup obligatorio.
- Se anadieron los campos Ollama que telemetry v3 y pipeline measurement v2
  conservaran cuando exista una ejecucion: modelo, contexto, tamano total y
  tamano residente en VRAM.
- El writer de identidad canaria publica ahora el binding interno
  `solguard-canary-release-binding.v2`. Sobre la forma legacy, v2 anade
  `schema_version`, `ollama_context_length` y `ollama_vulkan`; `ollama_host` ya
  existia en el binding anterior. El reader conserva ese wire legacy v1 para
  evidencia historica, pero el entorno r3 atestado exige v2 y no permite usar
  legacy para autorizar su lock.
- La cadena `r2` se conserva como evidencia historica, pero queda retirada de
  la aceptacion porque fue sellada antes de este contrato y no puede autorizar
  binarios o worktrees modificados. `r3` exige prebuild, roots y receipts nuevos.
- No se registran como ejecutados ni aceptados el prebuild r3, los ocho
  canarios, v1-v8, los 90 labs, finalize, verify o el holdout. Recall,
  precision, rendimiento y generalizacion blind siguen sin medir para esta
  identidad.
- Los tests dirigidos del contrato terminaron en verde. La suite completa
  descubrio `1066` pruebas: `1058` superadas, `0` fallidas y `8` omitidas en
  `130,6 s`; tambien terminaron
  correctamente la comprobacion bajo PowerShell 5.1, `node --check` y
  `git diff --check`. Estos resultados validan tests y comprobaciones estaticas;
  no registran como ejecutados el prebuild r3, canarios, replays ni metricas de
  deteccion r3.
- Se documento el limite del modo overnight: `SetThreadExecutionState` solicita
  que Windows no suspenda el sistema mientras vive el proceso, pero no evita un
  corte electrico, reinicio forzado o Windows Update, fallo de driver/GPU ni una
  perdida de red posterior al preflight.
- Se corrigio el alcance de `-ValidateOnly`: puede crear logs diagnosticos no
  autoritativos en `$CanaryBase/_runtime-logs` y ejecutar daemon/modelo/red, pero
  no crea ni modifica roots de evidencia canario/release ni acceptance.

## 2026-07-22 - Incidente prebuild r1 y cierre de paridad TRACE

- Se registro que el primer prebuild posterior al commit Deploy `0d1f1df`, con
  14 repositorios limpios, aborto antes de compilar por deriva byte-exacta:
  Core tenia 191980 bytes, Validate/Discover 191984 por una asercion formateada
  de forma distinta por rustfmt 2024/2021 y FILTER 176486 sobre el contrato
  anterior sin `generic_blind`.
- Se dejo explicito que `r1` no publico prebuild receipt, no ejecuto canarios ni
  replay y no puede reutilizarse.
- Se documento la forma estable frente a ambas ediciones y la paridad de las
  siete copias: Core, Validate, Discover, FILTER y los vendors de VALUE,
  ECONOMIC e INVARIANT.
- Se documento que el prebuild compara fisicamente las siete antes de compilar.
  Este cierre prueba paridad contractual, no calidad ni velocidad de deteccion.

## 2026-07-22 - Alineacion con la macroauditoria de madurez

- Se documento la nueva autoridad operacional de Core: roots separados,
  nombres canonicos, publicacion create-only, journals de ingesta y perfil
  TRACE sellado.
- Se actualizo Backend como adaptador HTTP autenticado y bounded, con claves
  externa e interna separadas, health publico minimo y attestation autenticada.
- Se incorporaron los perfiles `compatibility` y `generic_blind`, signal
  origins y la clausura Solidity cross-file bounded de TRACE.
- Se corrigieron las clausuras de Deploy a 35 componentes legacy y 29
  componentes scan v2 (20 modulos JavaScript y 9 recursos sellados), y se
  documento la autoridad efimera de secretos, sealed Git y source roots.
- Se anadieron paginas propias para FILTER, EXPLOIT y Deploy, y se actualizaron
  las fronteras operacionales del resto de herramientas.
- Se corrigio CLI para reflejar el proxy nativo Tauri autenticado, loopback-only
  y bounded; Database documenta ahora lectura fisica, limites, SQLite atomico,
  recuperacion anti-contaminacion y OCR estructurado sin shell.
- Se alineo Deploy con la politica de release que solicita y verifica
  `generic_blind` tanto en v1-v8 como en labs.
- Se documentaron `solguard-measurement-pre-run-lock.v2` y
  `solguard-measurement-baseline.v2`: el primer run usa bootstrap honesto, no
  importa agregados historicos y deja comparison/mejora no disponibles.
- Se incorporaron a la documentacion `solguard-resource-telemetry.v3` y
  `solguard-pipeline-measurement.v2`, incluidos CPU/IO/RAM, host, GPU/Ollama,
  storage, distribuciones, throughput, eficiencia, outputs y limites de
  atribucion. La precision real sigue `null` sin adjudicacion independiente.
- Se documento `scripts/measurement/setup-release.ps1` como secuencia cerrada:
  ocho canarios secuenciales, aceptacion 8/8, v1-v8 con paralelismo 8, labs solo
  tras exito y cierre finalize/verify.
- Se dejo explicito que canarios 8/8, release, v1-v8, labs y holdout no se han
  ejecutado como parte de esta ronda documental.

No se modifico ningun contrato de producto ni se ejecuto un corpus real desde
este repositorio.
