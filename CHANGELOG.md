# Changelog

Este changelog registra cambios comprobables de la documentacion. No convierte
tests de contratos en evidencia de calidad de deteccion.

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
