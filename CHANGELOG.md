# Changelog

Este changelog registra cambios comprobables de la documentacion. No convierte
tests de contratos en evidencia de calidad de deteccion.

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
