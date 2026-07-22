# Changelog

Este changelog registra cambios comprobables de la documentacion. No convierte
tests de contratos en evidencia de calidad de deteccion.

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
