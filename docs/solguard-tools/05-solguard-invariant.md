# Solguard Invariant

`solguard-invariant` responde qué propiedad semántica debería mantenerse. Consume `audit_map.v0.9`, uno o varios reportes `trace.v0.9` y, opcionalmente, evidencia histórica previamente normalizada.

La herramienta no convierte frases históricas en reglas. Solo acepta conocimiento histórico normativo cuando ya contiene familia, predicado, scope y versión de regla tipados. Esto evita que taxonomía legacy o similitud textual creen propiedades que el código actual no justifica.

## Modelo

Cada invariante contiene una familia, sujetos, operador, parámetros, scope, condiciones de mantenimiento, posibles condiciones de ruptura, resolución, confianza y referencias de evidencia.

El catálogo experimental inicial se limita a:

- completitud de identidades operativas;
- frescura de contexto;
- consistencia entre cache y persistencia;
- atomicidad y rollback;
- ordering de efectos irreversibles;
- consistencia de recursos cross-component.

Los duplicados se fusionan por predicado y scope normalizados. Las relaciones `overlaps`, `strengthens` y `conflicts` permanecen explícitas. Un conflicto no invalida globalmente las demás propiedades.

## Determinismo

`invariant_id` se deriva de familia, `rule_version`, predicado y scope. El hash no incorpora timestamps, paths absolutos, confianza, versión de herramienta ni orden de evidencia.

El contrato autoritativo es `invariant.v0.7` y se escribe en `invariants.json`.
