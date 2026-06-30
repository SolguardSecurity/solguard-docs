# 10. Depuracion y Estados Degradados

Esta pagina describe como leer una ejecucion cuando algo no sale perfecto. El
objetivo es distinguir fallo real, degradacion controlada, fallback esperado y
ausencia legitima de findings.

## Primeros archivos a abrir

Orden recomendado:

1. `analysis_log.md`
2. `tool-outputs/pipeline.json`
3. `profile.json`
4. `analysis_funnel.json`
5. `tool-outputs/validate/validation_results.json`
6. `tool-outputs/candidates/rejected_candidates.json`
7. `tool-outputs/candidates/model_discovery_diagnostics.json`
8. `tool-outputs/candidates/candidate_lifecycle.json`

Si el problema es de rendimiento, empezar por `profile.json` y
`pipeline.json`. Si el problema es recall, empezar por `validation_results.json`,
`analysis_funnel.json` y `candidate_lifecycle.json`.

## Estados de pipeline

| Estado | Interpretacion |
| --- | --- |
| `completed` | La fase produjo salidas esperadas. |
| `degraded` | La fase produjo salida util, pero con degradacion detectada. |
| `completed_with_errors` | La herramienta termino con error registrable. |
| `fallback` | El backend genero una salida fallback para conservar trazabilidad. |
| `skipped` | La fase no se ejecuto o fue omitida. |

Un pipeline con `completed_with_errors` o `fallback` puede seguir siendo util si
VALIDATE explica los inconclusos. No debe considerarse "ok para bug bounty sin
humano" solo por terminar.

## Diagnostico de recall bajo

Preguntas concretas:

1. El expected finding aparece como candidato en `canonical_candidates.json`?
2. Si no aparece, quedo una senal rechazada en `rejected_candidates.json`?
3. Si aparece, fue emitido a `validation_candidates.json`?
4. Si fue emitido, que dice `validation_results.json`?
5. Si es inconcluso, el `reason_code` apunta a falta de binding, falta de path,
   runtime de validate o contradiccion?
6. Si el modelo propuso algo y se rechazo, cual es el `reason_code` en
   `model_discovery_diagnostics.json`?

La respuesta correcta depende de donde se perdio la cadena:

- Perdida antes de candidato: revisar seeds, discover/economic/invariant y
  admission.
- Perdida en canonicalizacion/binding: revisar `candidate_lifecycle.json` y
  `rejected_candidates.json`.
- Perdida en VALIDATE: revisar evidence refs, reachability, state delta,
  invariant break y protections.
- Perdida post-validacion: revisar que `findings.md` solo renderice
  `supported_finding`.

## Diagnostico de muchos inconclusos

Muchos inconclusos no son automaticamente malos. Pueden indicar que el sistema
prefiere no inventar findings. Pero hay que mirar la distribucion:

- Muchos `reviewable_lead`: candidates sin binding suficiente. Falta mejorar
  candidate generation o evidencia estructurada.
- Muchos `review_queue`: candidates validables pero sin soporte determinista
  suficiente. Falta mejorar VALIDATE, trace o invariant.
- Muchos `scope_not_resolved`: el objetivo o la ruta no se resolvio con
  precision suficiente.
- Muchos `validation_runtime_unavailable_*`: la fase de validate no pudo usar
  inputs o runtime completo.

## Diagnostico de `map` degradado

Casos esperados:

- Repos con mas de `150` archivos fuente soportados usan fast-map.
- Si `map --deep` excede su ventana acotada, se reintenta con `--fast`.

Donde mirar:

- `analysis_log.md`
- `tool-outputs/pipeline.json`
- `tool-outputs/map/phase.json`
- `profile.json`

Un fast-map no invalida todo el analisis, pero puede reducir cobertura de trace o
binding. Si el recall cae justo por falta de superficies, esa degradacion es
relevante.

## Diagnostico de model discovery

Archivos:

- `tool-outputs/candidates/model_discovery_packs.json`
- `tool-outputs/candidates/model_discovery_diagnostics.json`

Mirar:

- `packs_prepared`
- `batches_attempted`
- `batches_completed`
- `candidates_proposed`
- `candidates_accepted`
- `candidates_rejected`
- `invalid_candidate_schema`
- `rejections`

Si `SOLGUARD_MODEL_DISCOVERY_BATCHES=0`, no debe esperarse ningun aporte del
modelo en discovery.

## Diagnostico de VALIDATE

VALIDATE es la autoridad. Para cada candidato revisar:

- `candidate_id`
- `result`
- `finding_class`
- `reason_code`
- `reason`
- `reachability`
- `predicate_evaluation`
- `state_delta`
- `invariant_break`
- `supporting_evidence`
- `contradicting_evidence`
- `missing_evidence`
- `next_manual_step`

Un supported finding necesita soporte positivo, no solo ausencia de
contradicciones.

## Diagnostico de impacto, PoC o report

Estas fases son posteriores a verdictos.

- Si fallan, deben marcar `fallback` o error sin modificar
  `validation_results.json`.
- Si `validation_results.json` cambia despues de VALIDATE, el runtime debe
  abortar.
- Si no hay `supported_finding`, puede ser correcto que no haya informes finales
  utiles en `reports/`.

## Cuando usar `rebuild-candidates`

Usarlo cuando se cambia:

- logica de seeds;
- admission de candidatos;
- canonicalizacion;
- binding;
- diagnosticos de candidatos;
- lifecycle/funnel.

Comando:

```powershell
cargo run --bin solguard-backend -- rebuild-candidates "<project-dir>"
```

No lo uses para depurar map/trace/discover/economic/invariant si esos artefactos
de entrada estan mal o incompletos. En ese caso hay que repetir el analisis o la
fase correspondiente.

## Criterio operativo

Una ejecucion esta lista para revision humana cuando:

- `pipeline.json` existe y tiene las fases esperadas.
- `validation_results.json` existe y parsea.
- `analysis_funnel.json` explica la perdida de senales.
- `findings.md` no contiene candidatos que no sean `supported_finding`.
- `review_queue.md` conserva lo inconcluso.

Una ejecucion esta lista para bug bounty sin humano solo si, ademas, el finding
soportado tiene evidencia suficiente, impacto material, PoC o plan ejecutable y
exclusiones revisadas. El backend actual no debe prometer ese nivel sin una
validacion adicional.
