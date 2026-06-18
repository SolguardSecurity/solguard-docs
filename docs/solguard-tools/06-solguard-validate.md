# Solguard Validate

`solguard-validate` responde si la evidencia estática disponible sostiene o refuta la ruptura de una invariante. Consume candidatos canónicos del backend, `invariants.json`, `audit_map.json` y los reportes TRACE.

## Decisiones

`supported` exige una invariante aplicable, una condición de ruptura tipada, evidencia no heurística y una cadena root-trigger-impact cuyas aristas críticas estén completamente resueltas.

`refuted` exige evidencia positiva de una protección sobre el mismo flujo, estado, dimensión contextual y predicado antes del impacto. Un guard aproximado, una invalidación sin orden demostrado o la simple ausencia de reachability no permiten refutar.

Todo lo demás es `inconclusive`. La herramienta nunca devuelve `validated`: sin ejecución ni PoC no puede confirmar explotabilidad.

## Atomicidad y estado

La evaluación conserva la diferencia entre estado temporal, cache y persistencia, así como entre rollback EVM y efectos externos no revertibles. Una transacción EVM resuelta puede refutar un falso gap de rollback; una cola, llamada HTTP o efecto off-chain requiere una frontera o compensación propia.

## Salida

`validation_results.json`, bajo el contrato `validation.v0.7`, es la fuente autoritativa. `validation_results.md` mantiene juntos `supported`, `refuted` e `inconclusive`, incluyendo evidencia favorable, contradictoria, ausente y el siguiente paso manual.
